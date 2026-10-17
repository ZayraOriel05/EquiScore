import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import "./App.css";
import AiHelper from "./AiHelper";
import { errorText, fetchLoanDetails } from "./api";
import type { UserData } from "./api";

// Change this when you add login. The backend looks users up by numeric id.
const USER_ID = 1;

// Set to true to preview the dashboard with sample data and no backend.
const USE_MOCK = false;

const MOCK_USER: UserData = {
  user: "Amina K.",
  income: 10000,
  savings: 500,
  loan_balance: 1967,
  next_payment_date: "2026-10-17",
  credit_score: 640,
  loan_total: 5000,
  next_payment_amount: 100,
};

const SCORE_MIN = 300;
const SCORE_MAX = 850;

type Tab = "dashboard" | "assistant";

/* ---------- helpers ---------- */

// Smooth number animation using native browser timing (no extra package).
function CountUp({
  to,
  duration = 1450,
  decimals = 0,
}: {
  to: number;
  duration?: number;
  decimals?: number;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) {
      setValue(to);
      return;
    }
    let frame = 0;
    let start: number | null = null;
    const animate = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(to * eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [to, duration]);

  return (
    <>
      {value.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </>
  );
}

// 1967.5 -> { whole: 1967, cents: '50' }
function splitMoney(n: number) {
  const [whole, cents] = n.toFixed(2).split(".");
  return { whole: Number(whole), cents };
}

function usd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
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

/* ---------- dashboard ---------- */

function Dashboard({
  user,
  loading,
  error,
}: {
  user: UserData | null;
  loading: boolean;
  error: string | null;
}) {
  const [showLoanDetails, setShowLoanDetails] = useState(false);

  if (loading)
    return <main className="dashboard-status">Loading your account…</main>;
  if (error || !user) {
    return (
      <main className="dashboard-status dashboard-status-error">
        {error ?? "No account data found."}
      </main>
    );
  }

  const balance = splitMoney(user.loan_balance);
  const savings = splitMoney(user.savings);
  const income = splitMoney(user.income);

  const total = user.loan_total;
  const repaid =
    total !== undefined ? Math.max(0, total - user.loan_balance) : null;
  const percent =
    total && repaid !== null
      ? Math.min(100, Math.round((repaid / total) * 100))
      : null;

  const score = user.credit_score ?? null;
  const fraction =
    score === null
      ? 0
      : Math.min(1, Math.max(0, (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)));
  const gaugeStyle = {
    "--gauge-offset": 100 - fraction * 100,
  } as CSSProperties;

  const payment = formatPaymentDate(user.next_payment_date);

  return (
    <main className="dashboard-canvas" key="dashboard-animated">
      <header className="welcome-heading">
        <h1>Welcome Back!</h1>
        <p>Here’s your account overview</p>
      </header>
      <div className="vertical-divider" aria-hidden="true" />

      <section className="loan-card" aria-label="Current loan">
        <div className="loan-card-meta">
          <span>{user.user}</span>
          <span>Microfinancer</span>
        </div>
        <div className="loan-balance">
          <div className="balance-amount">
            <span className="currency">$</span>
            <CountUp to={balance.whole} />
            <span className="cents">.{balance.cents}</span>
          </div>
          <span className="balance-label">Outstanding Balance</span>
        </div>
        <button
          type="button"
          className="loan-details"
          onClick={() => setShowLoanDetails(true)}
        >
          See loan details <span aria-hidden="true">⟶</span>
        </button>
      </section>

      <section className="repaid-card" aria-label="Loan repayment progress">
        {percent !== null && total !== undefined && repaid !== null ? (
          <>
            <div className="repaid-title">
              You have paid{" "}
              <strong>
                <CountUp to={percent} />%
              </strong>{" "}
              of your loan
            </div>
            <div className="repaid-values">
              <span>{usd(repaid)} repaid</span>
              <span>{usd(total)} loan</span>
            </div>
            <div
              className="repaid-track"
              role="progressbar"
              aria-label="Loan repaid"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div
                className="repaid-fill"
                style={{ "--fill": `${percent}%` } as CSSProperties}
              />
            </div>
          </>
        ) : (
          <p className="repaid-empty">
            Repayment progress will show here once your original loan amount is
            available.
          </p>
        )}
      </section>

      <section className="score-card" aria-label="Credit score">
        <svg
          className="score-arc"
          viewBox="0 0 220 126"
          role="img"
          aria-label={
            score === null ? "No credit score yet" : `Credit score ${score}`
          }
          style={gaugeStyle}
        >
          <path
            d="M 12 113 A 98 98 0 0 1 208 113"
            fill="none"
            stroke="#E1E1E1"
            strokeWidth="16"
          />
          {score !== null && (
            <path
              d="M 12 113 A 98 98 0 0 1 208 113"
              fill="none"
              stroke="#789584"
              strokeWidth="16"
              strokeLinecap="round"
              pathLength={100}
            />
          )}
        </svg>
        <div className="score-text">
          <span className="score-value">
            {score === null ? "--" : <CountUp to={score} duration={1700} />}
          </span>
          <span className="score-label">Credit Score</span>
          <span className="score-arrow" aria-hidden="true">
            ⟶
          </span>
        </div>
      </section>

      <section className="repayment-due" aria-label="Upcoming loan payments">
        <h2 className="repayment-heading">UPCOMING LOAN PAYMENTS</h2>
        <div className="repayment-content">
          {payment ? (
            <>
              <div className="date-badge">
                <span>{payment.month}</span>
                <span>{payment.day}</span>
              </div>
              <div className="due-balance">
                {user.next_payment_amount !== undefined ? (
                  <span>
                    $ <CountUp to={user.next_payment_amount} decimals={2} />
                  </span>
                ) : (
                  <span className="due-empty">Amount not set</span>
                )}
              </div>
            </>
          ) : (
            <p className="payments-empty">No payments are due.</p>
          )}
        </div>
      </section>

      <section className="mini-stat savings" aria-label="Savings">
        <span className="stat-heading">SAVINGS</span>
        <strong className="stat-amount">
          <span className="stat-currency">$</span>
          <CountUp to={savings.whole} />
          <span className="stat-cents">.{savings.cents}</span>
        </strong>
      </section>
      <section className="mini-stat income" aria-label="Income">
        <span className="stat-heading">INCOME</span>
        <strong className="stat-amount">
          <span className="stat-currency">$</span>
          <CountUp to={income.whole} />
          <span className="stat-cents">.{income.cents}</span>
        </strong>
      </section>

      {showLoanDetails && (
        <div
          className="modal-backdrop"
          onClick={() => setShowLoanDetails(false)}
        >
          <section
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="loan-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="loan-dialog-title">Loan details</h2>
            <p>Outstanding balance: {usd(user.loan_balance)}</p>
            {total !== undefined && <p>Original loan: {usd(total)}</p>}
            {payment && (
              <p>
                Upcoming repayment:{" "}
                {user.next_payment_amount !== undefined
                  ? `${usd(user.next_payment_amount)} — `
                  : ""}
                {payment.month} {payment.day}
              </p>
            )}
            <button type="button" onClick={() => setShowLoanDetails(false)}>
              Close
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

/* ---------- app ---------- */

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (USE_MOCK) {
      setUser(MOCK_USER);
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
    <div className="dashboard-frame">
      {tab === "dashboard" ? (
        <Dashboard user={user} loading={loading} error={error} />
      ) : (
        <AiHelper userId={USER_ID} />
      )}
      <nav className="footer-nav" aria-label="Main navigation">
        <button
          type="button"
          className={tab === "dashboard" ? "selected" : ""}
          aria-current={tab === "dashboard" ? "page" : undefined}
          onClick={() => setTab("dashboard")}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={tab === "assistant" ? "selected" : ""}
          aria-current={tab === "assistant" ? "page" : undefined}
          onClick={() => setTab("assistant")}
        >
          Assistant
        </button>
      </nav>
    </div>
  );
}
