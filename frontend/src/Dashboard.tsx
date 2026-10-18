import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { UserData } from "./api";

const SCORE_MIN = 300;
const SCORE_MAX = 850;

// Score bands. Change the cut-offs, colours or wording here.
const BANDS = [
  {
    min: 670,
    name: "Good",
    color: "#2f9e63",
    note: "Yours is strong. Keep making on-time payments.",
  },
  {
    min: 580,
    name: "Fair",
    color: "#e3a812",
    note: "Yours is average. On-time payments will raise it.",
  },
  {
    min: 0,
    name: "Needs work",
    color: "#c8473b",
    note: "Yours is low. On-time payments are the fastest way to raise it.",
  },
];
const NEUTRAL_COLOR = "#8fa595";

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

export default function Dashboard({
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
  const band = score === null ? null : BANDS.find((b) => score >= b.min)!;
  const bandColor = band?.color ?? NEUTRAL_COLOR;
  const fraction =
    score === null
      ? 0
      : Math.min(1, Math.max(0, (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)));
  const gaugeStyle = {
    "--gauge-offset": 100 - fraction * 100,
    "--band": bandColor,
  } as CSSProperties;

  const payment = formatPaymentDate(user.next_payment_date);

  return (
    <main className="dashboard" key="dashboard-animated">
      {/* ---------- left column ---------- */}
      <section className="dash-left">
        <header className="welcome-heading">
          <h1>Welcome Back!</h1>
          <p>Here’s your account overview</p>
        </header>

        <section className="loan-card" aria-label="Current loan">
          <div className="loan-panel">
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
              Repayment progress will show here once your original loan amount
              is available.
            </p>
          )}
        </section>
      </section>

      {/* ---------- right column ---------- */}
      <section className="dash-right">
        <section className="score-card" aria-label="Credit score">
          <div className="gauge" style={gaugeStyle}>
            <svg
              viewBox="0 0 220 126"
              role="img"
              aria-label={
                score === null
                  ? "No credit score yet"
                  : `Credit score ${score}, ${band?.name}`
              }
            >
              <path
                className="gauge-track"
                d="M 12 113 A 98 98 0 0 1 208 113"
                pathLength={100}
              />
              {score !== null && (
                <path
                  className="gauge-fill"
                  d="M 12 113 A 98 98 0 0 1 208 113"
                  pathLength={100}
                />
              )}
            </svg>
            <div className="gauge-text">
              <span className="score-value">
                {score === null ? "--" : <CountUp to={score} duration={1700} />}
              </span>
              <span className="score-label">Credit Score</span>
            </div>
            <span className="score-arrow" aria-hidden="true">
              ⟶
            </span>
          </div>

          <div
            className="score-note"
            style={{ "--band": bandColor } as CSSProperties}
          >
            <span className="score-verdict">
              {band?.name ?? "No score yet"}
            </span>
            <p>
              {band
                ? `A credit score (300–850) shows lenders how reliably you repay. ${band.note}`
                : "Add your credit score in your profile to see how you are doing."}
            </p>
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

        <div className="stat-row">
          <section className="mini-stat" aria-label="Savings">
            <span className="stat-heading">SAVINGS</span>
            <strong className="stat-amount">
              <span className="stat-currency">$</span>
              <CountUp to={savings.whole} />
              <span className="stat-cents">.{savings.cents}</span>
            </strong>
          </section>
          <section className="mini-stat" aria-label="Income">
            <span className="stat-heading">INCOME</span>
            <strong className="stat-amount">
              <span className="stat-currency">$</span>
              <CountUp to={income.whole} />
              <span className="stat-cents">.{income.cents}</span>
            </strong>
          </section>
        </div>
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
