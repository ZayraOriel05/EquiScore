import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import { chatWithAssistant, fetchLoanDetails, getCreditScore } from "./api";
import type { UserData } from "./api";

// Change this when you add login. The backend looks users up by numeric id.
const USER_ID = 1;

// Set to false to use the real backend
const USE_MOCK = false;

const MOCK_USER: UserData = {
  user: "Amina K.",
  income: 10000,
  savings: 500,
  loan_balance: 1967,
  next_payment_date: "2026-10-17",
  loan_total: 5000,
  next_payment_amount: 100,
};

const SCORE_MIN = 300;
const SCORE_MAX = 850;

type Tab = "dashboard" | "helper" | "assistant";

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "helper", label: "AI Helper" },
  { id: "assistant", label: "Assistant" },
];

function errorText(err: unknown): string {
  if (err instanceof TypeError) {
    return "Can't reach the server. Check that the backend is running on port 8000.";
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}

/* ---------- small pieces ---------- */

function Money({ value }: { value: number }) {
  const [whole, cents] = value.toFixed(2).split(".");
  return (
    <span className="money">
      <span className="money-cur">$</span>
      {Number(whole).toLocaleString("en-US")}
      <span className="money-cents">.{cents}</span>
    </span>
  );
}

function ScoreGauge({ score }: { score: number | null }) {
  const fraction =
    score === null
      ? 0
      : Math.min(1, Math.max(0, (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)));
  return (
    <div className="gauge">
      <svg
        viewBox="0 0 220 120"
        role="img"
        aria-label={
          score === null ? "No credit score yet" : `Credit score ${score}`
        }
      >
        <path
          className="gauge-track"
          d="M 20 110 A 90 90 0 0 1 200 110"
          pathLength={100}
        />
        <path
          className="gauge-fill"
          d="M 20 110 A 90 90 0 0 1 200 110"
          pathLength={100}
          strokeDasharray={`${fraction * 100} 100`}
        />
      </svg>
      <div className="gauge-text">
        <strong>{score ?? "--"}</strong>
        <span>Credit Score</span>
      </div>
    </div>
  );
}

function formatPaymentDate(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return {
    month: new Date(y, m - 1, d).toLocaleString("en-US", { month: "short" }),
    day: d,
  };
}

/* ---------- views ---------- */

function Dashboard({
  user,
  score,
  loading,
  error,
  onNavigate,
}: {
  user: UserData | null;
  score: number | null;
  loading: boolean;
  error: string | null;
  onNavigate: (tab: Tab) => void;
}) {
  if (loading) return <p className="status">Loading your account…</p>;
  if (error || !user)
    return (
      <p className="status status-error">{error ?? "No account data found."}</p>
    );

  const payment = formatPaymentDate(user.next_payment_date);
  const total = user.loan_total;
  const repaid =
    total !== undefined ? Math.max(0, total - user.loan_balance) : null;
  const percent =
    total && repaid !== null
      ? Math.min(100, Math.round((repaid / total) * 100))
      : null;

  return (
    <div className="dash">
      <aside className="dash-left">
        <header className="greeting">
          <h1>Welcome Back!</h1>
          <p>Here’s your account overview</p>
        </header>

        <section className="balance-card">
          <div className="balance-meta">
            <span>{user.user}</span>
            <span>Microfinancer</span>
          </div>
          <div className="balance-main">
            <Money value={user.loan_balance} />
            <small>Outstanding Balance</small>
          </div>
          <button
            type="button"
            className="link-button"
            onClick={() => onNavigate("assistant")}
          >
            See loan details <span aria-hidden="true">⟶</span>
          </button>
        </section>

        <section className="progress-card">
          {percent !== null && total !== undefined && repaid !== null ? (
            <>
              <p>
                You have paid <strong>{percent}%</strong> of your loan
              </p>
              <div
                className="bar"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Loan repaid"
              >
                <div className="bar-fill" style={{ width: `${percent}%` }} />
              </div>
              <div className="bar-labels">
                <span>${repaid.toLocaleString("en-US")} repaid</span>
                <span>${total.toLocaleString("en-US")} loan</span>
              </div>
            </>
          ) : (
            <p>
              Repayment progress will show here once your original loan amount
              is available.
            </p>
          )}
        </section>
      </aside>

      <main className="dash-right">
        <section className="score-card">
          <ScoreGauge score={score} />
          <button
            type="button"
            className="arrow-button"
            onClick={() => onNavigate("helper")}
            aria-label="Calculate your credit score"
          >
            <svg viewBox="0 0 90 12" aria-hidden="true">
              <path d="M0 6 H86 M80 1 L86 6 L80 11" />
            </svg>
          </button>
        </section>

        <section className="payments-card">
          <h2>Upcoming loan payments</h2>
          {payment ? (
            <div className="payment-row">
              <div className="date-chip">
                <span>{payment.month}</span>
                <span>{payment.day}</span>
              </div>
              <div className="amount-pill">
                {user.next_payment_amount !== undefined ? (
                  <Money value={user.next_payment_amount} />
                ) : (
                  <span>Amount not set</span>
                )}
              </div>
            </div>
          ) : (
            <p className="muted">No payments are due.</p>
          )}
        </section>

        <div className="stat-row">
          <section className="stat-card">
            <h3>Savings</h3>
            <div className="stat-value">
              <Money value={user.savings} />
            </div>
          </section>
          <section className="stat-card">
            <h3>Income</h3>
            <div className="stat-value">
              <Money value={user.income} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

const SCORE_FIELDS = [
  {
    key: "mobile_money",
    label: "Mobile money activity",
    hint: "How often you send and receive mobile money",
  },
  {
    key: "utility_consistency",
    label: "Utility payment consistency",
    hint: "How reliably you pay bills on time",
  },
  {
    key: "cash_flow",
    label: "Cash flow",
    hint: "Money coming in compared with money going out",
  },
  {
    key: "psych_score",
    label: "Psychometric score",
    hint: "Your result from the assessment questions",
  },
] as const;

type ScoreKey = (typeof SCORE_FIELDS)[number]["key"];

function AiHelper({
  score,
  onScore,
}: {
  score: number | null;
  onScore: (n: number) => void;
}) {
  const [values, setValues] = useState<Record<ScoreKey, string>>({
    mobile_money: "",
    utility_consistency: "",
    cash_flow: "",
    psych_score: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const numbers = SCORE_FIELDS.map((f) => Number(values[f.key]));
    if (
      SCORE_FIELDS.some((f) => values[f.key].trim() === "") ||
      numbers.some(Number.isNaN)
    ) {
      setError("Enter a number in every field.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await getCreditScore({
        mobile_money: numbers[0],
        utility_consistency: numbers[1],
        cash_flow: numbers[2],
        psych_score: numbers[3],
      });
      onScore(result.credit_score);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h1>Calculate your credit score</h1>
      <p className="muted">
        Enter your latest figures. The score on your dashboard updates when you
        calculate.
      </p>
      <form onSubmit={submit} className="score-form">
        {SCORE_FIELDS.map((f) => (
          <label key={f.key}>
            <span>{f.label}</span>
            <small>{f.hint}</small>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={values[f.key]}
              onChange={(e) =>
                setValues({ ...values, [f.key]: e.target.value })
              }
            />
          </label>
        ))}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "Calculating…" : "Calculate score"}
        </button>
      </form>
      {error && (
        <p className="status-error" role="alert">
          {error}
        </p>
      )}
      {score !== null && !error && (
        <p className="result">
          Your credit score is <strong>{score}</strong>.
        </p>
      )}
    </div>
  );
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hi! Ask me about your loan, your payments, or how to improve your credit score.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setDraft("");
    setBusy(true);
    try {
      const { response } = await chatWithAssistant(USER_ID, text);
      setMessages((m) => [...m, { role: "assistant", text: response }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", text: errorText(err) }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel chat">
      <h1>Assistant</h1>
      <div className="chat-log" aria-live="polite">
        {messages.map((m, i) => (
          <p key={i} className={`bubble bubble-${m.role}`}>
            {m.text}
          </p>
        ))}
        {busy && <p className="bubble bubble-assistant">Thinking…</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="chat-form">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about your loan"
          aria-label="Message"
        />
        <button
          type="submit"
          className="primary"
          disabled={busy || !draft.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}

/* ---------- app ---------- */

function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    if (USE_MOCK) {
      setUser(MOCK_USER);
      setScore(640);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchLoanDetails(USER_ID)
      .then((data) => !cancelled && setUser(data))
      .catch((err) => !cancelled && setError(errorText(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app">
      <div className="screen">
        {tab === "dashboard" && (
          <Dashboard
            user={user}
            score={score}
            loading={loading}
            error={error}
            onNavigate={setTab}
          />
        )}
        {tab === "helper" && <AiHelper score={score} onScore={setScore} />}
        {tab === "assistant" && <Assistant />}
      </div>
      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="tab"
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
