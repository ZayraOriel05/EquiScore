import { useState } from "react";
import type { FormEvent } from "react";
import "./Profile.css";
import { errorText } from "./api";
import type { ProfileData, ProfileRecord } from "./api";

type FieldKey = keyof ProfileData;

interface Question {
  key: FieldKey;
  label: string;
  type: "text" | "number" | "date";
  hint?: string;
  min?: number;
  max?: number;
}

const QUESTIONS: Question[] = [
  { key: "name", label: "What is your username (name)?", type: "text" },
  { key: "income", label: "What is your income?", type: "number", min: 0 },
  {
    key: "savings",
    label: "How much do you have in savings?",
    type: "number",
    min: 0,
  },
  {
    key: "loan_balance",
    label: "What is your outstanding loan balance?",
    type: "number",
    min: 0,
  },
  {
    key: "next_payment_date",
    label: "When is your next payment date?",
    type: "date",
  },
  {
    key: "credit_score",
    label: "What is your credit score?",
    type: "number",
    min: 300,
    max: 850,
    hint: "Between 300 and 850",
  },
  {
    key: "loan_total",
    label: "What is your total loan amount?",
    type: "number",
    min: 0,
  },
  {
    key: "next_payment_amount",
    label: "How much is your next payment?",
    type: "number",
    min: 0,
  },
];

function toFormValues(record?: ProfileRecord | null): Record<FieldKey, string> {
  const text = (v: string | number | null | undefined) =>
    v === null || v === undefined ? "" : String(v);
  return {
    name: text(record?.name),
    income: text(record?.income),
    savings: text(record?.savings),
    loan_balance: text(record?.loan_balance),
    next_payment_date: text(record?.next_payment_date),
    credit_score: text(record?.credit_score),
    loan_total: text(record?.loan_total),
    next_payment_amount: text(record?.next_payment_amount),
  };
}

interface Props {
  mode: "create" | "edit";
  initial?: ProfileRecord | null;
  onSubmit: (data: ProfileData) => Promise<void>;
}

export default function ProfileForm({ mode, initial, onSubmit }: Props) {
  const [values, setValues] = useState<Record<FieldKey, string>>(() =>
    toFormValues(initial),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function change(key: FieldKey, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const num = (key: FieldKey) => Number(values[key]);
    const data: ProfileData = {
      name: values.name.trim(),
      income: num("income"),
      savings: num("savings"),
      loan_balance: num("loan_balance"),
      next_payment_date: values.next_payment_date,
      credit_score: Math.round(num("credit_score")),
      loan_total: num("loan_total"),
      next_payment_amount: num("next_payment_amount"),
    };
    if (!data.name) {
      setError("Please enter your name.");
      return;
    }
    if (data.loan_balance > data.loan_total) {
      setError(
        "Your outstanding balance can’t be more than your total loan amount.",
      );
      return;
    }

    setBusy(true);
    try {
      await onSubmit(data);
      if (mode === "edit") setSaved(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const creating = mode === "create";

  return (
    <main className="survey-canvas">
      <section className="survey-outer" aria-labelledby="survey-title">
        <h1 id="survey-title">
          {creating ? "Tell Us About Your Financial Situation" : "Your Profile"}
        </h1>
        <form className="survey-form" onSubmit={handleSubmit}>
          <div className="survey-scroll" aria-label="Profile questions">
            {QUESTIONS.map((q, index) => (
              <label className="survey-question" key={q.key}>
                <span className="survey-number">{index + 1}</span>
                <span className="survey-question-body">
                  <span className="survey-question-label">{q.label}</span>
                  <input
                    type={q.type}
                    value={values[q.key]}
                    onChange={(e) => change(q.key, e.target.value)}
                    placeholder={
                      q.type === "date" ? undefined : "Type your answer here..."
                    }
                    required
                    min={q.min}
                    max={q.max}
                    step={
                      q.type === "number"
                        ? q.key === "credit_score"
                          ? 1
                          : "any"
                        : undefined
                    }
                    inputMode={q.type === "number" ? "decimal" : undefined}
                    maxLength={q.type === "text" ? 80 : undefined}
                    autoComplete="off"
                  />
                  {q.hint && <span className="survey-hint">{q.hint}</span>}
                </span>
              </label>
            ))}
          </div>
          <div className="survey-actions">
            {error ? (
              <span className="survey-error" role="alert">
                {error}
              </span>
            ) : saved ? (
              <span className="survey-saved" role="status">
                Profile saved. Your dashboard now shows these details.
              </span>
            ) : (
              <span>
                {creating
                  ? "Complete all eight questions to continue."
                  : "Changes update your dashboard and AI Helper."}
              </span>
            )}
            <button type="submit" disabled={busy}>
              {busy ? "Saving…" : creating ? "Submit →" : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
