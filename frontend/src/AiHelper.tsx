import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import "./AiHelper.css";
import {
  chatWithAssistant,
  deletePlan,
  errorText,
  fetchChatHistory,
  fetchInsights,
  fetchPlans,
  generatePlan,
  setStepCompleted,
} from "./api";
import type { FinancialPlan, Insight, PlanCategory } from "./api";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

type ResultsTab = "questions" | "plans";

const CATEGORY_LABEL: Record<PlanCategory, string> = {
  savings: "savings",
  repayment: "loan repayment",
  credit: "credit",
  other: "financial",
};

// What a Questions card sends to the chat when clicked.
const INSIGHT_QUESTION: Record<string, string> = {
  debt: "How can I improve my loan repayment?",
  savings: "How can I improve my savings?",
  advice: "How can my income help my credit score?",
};

export default function AiHelper({ userId }: { userId: number }) {
  // chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [offer, setOffer] = useState<PlanCategory | null>(null);

  // right-hand panel
  const [tab, setTab] = useState<ResultsTab>("questions");
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [plans, setPlans] = useState<FinancialPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? plans[0];

  async function loadInsights(refresh = false) {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      setInsights(await fetchInsights(userId, refresh));
    } catch (err) {
      setInsightsError(errorText(err));
    } finally {
      setInsightsLoading(false);
    }
  }

  // Everything lives in the backend, so the page reloads its state on mount.
  useEffect(() => {
    let cancelled = false;
    fetchChatHistory(userId)
      .then((history) => !cancelled && setMessages(history))
      .catch(() => {
        /* an empty chat is fine if history can't load */
      });
    fetchPlans(userId)
      .then((list) => {
        if (cancelled) return;
        setPlans(list);
        setSelectedPlanId(list[0]?.id ?? null);
      })
      .catch((err) => !cancelled && setPlanError(errorText(err)));
    fetchInsights(userId)
      .then((list) => !cancelled && setInsights(list))
      .catch((err) => !cancelled && setInsightsError(errorText(err)))
      .finally(() => !cancelled && setInsightsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy, offer, chatError]);

  // Close the Plans menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function savePlan(plan: FinancialPlan) {
    setPlans((prev) =>
      prev.some((p) => p.id === plan.id)
        ? prev.map((p) => (p.id === plan.id ? plan : p))
        : [...prev, plan],
    );
    setSelectedPlanId(plan.id);
    setPlanError(null);
    setTab("plans");
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setMessages((m) => [...m, { role: "user", text: content }]);
    setDraft("");
    setOffer(null);
    setChatError(null);
    setBusy(true);
    try {
      const res = await chatWithAssistant(userId, content);
      setMessages((m) => [...m, { role: "assistant", text: res.reply }]);
      if (res.action === "plan_offered" && res.offer_category)
        setOffer(res.offer_category);
      if (
        (res.action === "plan_created" || res.action === "plan_updated") &&
        res.plan
      )
        savePlan(res.plan);
    } catch (err) {
      setChatError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(draft);
  }

  async function createOfferedPlan() {
    if (!offer || busy) return;
    setBusy(true);
    setChatError(null);
    try {
      const plan = await generatePlan(userId, offer);
      setOffer(null);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: `${plan.name} is ready. Open the Plans tab to review it.`,
        },
      ]);
      savePlan(plan);
    } catch (err) {
      setChatError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleStep(
    plan: FinancialPlan,
    stepId: string,
    completed: boolean,
  ) {
    const before = plans;
    setPlans((prev) =>
      prev.map((p) =>
        p.id === plan.id
          ? {
              ...p,
              steps: p.steps.map((s) =>
                s.id === stepId ? { ...s, completed } : s,
              ),
            }
          : p,
      ),
    );
    try {
      const updated = await setStepCompleted(plan.id, stepId, completed);
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setPlans(before);
      setPlanError(errorText(err));
    }
  }

  async function removePlan(plan: FinancialPlan) {
    if (!window.confirm(`Delete "${plan.name}"?`)) return;
    try {
      await deletePlan(plan.id);
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
      setSelectedPlanId((current) => (current === plan.id ? null : current));
      setMenuOpen(false);
    } catch (err) {
      setPlanError(errorText(err));
    }
  }

  const showIntro = messages.length === 0 && !busy && !chatError;

  return (
    <main className="helper-canvas">
      {/* ---------- left: chat ---------- */}
      <section className="helper-chat-panel" aria-label="AI Helper chat">
        {showIntro ? (
          <div className="helper-intro">
            <h1>
              What Are We
              <br />
              Learning Today?
            </h1>
          </div>
        ) : (
          <div className="helper-chat-history" aria-live="polite">
            {messages.map((m, i) => (
              <p key={i} className={`helper-message helper-message-${m.role}`}>
                {m.text}
              </p>
            ))}
            {busy && (
              <p className="helper-message helper-message-assistant">
                Thinking…
              </p>
            )}
            {offer && !busy && (
              <button
                type="button"
                className="helper-offer"
                onClick={createOfferedPlan}
              >
                Create my {CATEGORY_LABEL[offer]} plan
              </button>
            )}
            {chatError && (
              <p className="helper-alert" role="alert">
                {chatError}
              </p>
            )}
            <div ref={endRef} />
          </div>
        )}
        <form className="helper-chat-form" onSubmit={onSubmit}>
          <input
            aria-label="Ask me anything"
            placeholder="Ask me anything..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={busy || !draft.trim()}
          >
            →
          </button>
        </form>
      </section>

      {/* ---------- right: questions and plans ---------- */}
      <section
        className="helper-insights-panel"
        aria-label="Financial questions and plans"
      >
        <div
          className="helper-tabs"
          role="tablist"
          aria-label="AI Helper results"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "questions"}
            className={tab === "questions" ? "helper-tab active" : "helper-tab"}
            onClick={() => {
              setTab("questions");
              setMenuOpen(false);
            }}
          >
            Questions
          </button>
          <div className="helper-plans-menu" ref={menuRef}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "plans"}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={tab === "plans" ? "helper-tab active" : "helper-tab"}
              onClick={() => {
                setTab("plans");
                setMenuOpen((open) => !open);
              }}
            >
              Plans ▾
            </button>
            {menuOpen && (
              <div
                className="helper-plan-dropdown"
                role="menu"
                aria-label="Choose a financial plan"
              >
                <div className="helper-plan-count">
                  Your plans ({plans.length}/3)
                </div>
                {plans.map((plan) => (
                  <div className="helper-plan-choice" key={plan.id}>
                    <button
                      type="button"
                      role="menuitem"
                      className={
                        selectedPlan?.id === plan.id
                          ? "helper-plan-select selected"
                          : "helper-plan-select"
                      }
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        setTab("plans");
                        setMenuOpen(false);
                      }}
                    >
                      {plan.name}
                    </button>
                    <button
                      type="button"
                      className="helper-plan-delete"
                      aria-label={`Delete ${plan.name}`}
                      title={`Delete ${plan.name}`}
                      onClick={() => void removePlan(plan)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {plans.length === 0 && (
                  <p>No plans yet. Ask the chat to create one.</p>
                )}
                {plans.length === 3 && <p>Maximum 3 plans reached.</p>}
              </div>
            )}
          </div>
        </div>
        {tab === "questions" && (
          <button
            type="button"
            className="helper-refresh"
            onClick={() => void loadInsights(true)}
            disabled={insightsLoading}
          >
            ↻ Refresh
          </button>
        )}

        <div
          className="helper-tab-content"
          key={`${tab}-${selectedPlan?.id ?? "none"}`}
        >
          {tab === "questions" ? (
            insightsLoading ? (
              <>
                <p className="helper-status" role="status">
                  Preparing your tips. The first time can take a minute.
                </p>
                <div className="helper-skeleton" />
                <div className="helper-skeleton" />
                <div className="helper-skeleton" />
              </>
            ) : insightsError ? (
              <div className="helper-empty-plans" role="alert">
                <p>{insightsError}</p>
                <button
                  type="button"
                  className="helper-retry"
                  onClick={() => void loadInsights()}
                >
                  Try again
                </button>
              </div>
            ) : (
              insights.map((item) => (
                <article className="helper-insight" key={item.id}>
                  <h2>{item.title}</h2>
                  <p>
                    {item.description}
                    <button
                      type="button"
                      className="helper-ask"
                      disabled={busy}
                      onClick={() =>
                        void send(
                          INSIGHT_QUESTION[item.id] ??
                            `Tell me more about ${item.title.toLowerCase()}.`,
                        )
                      }
                    >
                      Ask about this →
                    </button>
                  </p>
                </article>
              ))
            )
          ) : selectedPlan ? (
            <>
              {planError && (
                <p className="helper-alert" role="alert">
                  {planError}
                </p>
              )}
              <section
                className="helper-plan-actions"
                aria-label={`${selectedPlan.name} action plan`}
              >
                <h2>
                  {selectedPlan.name.toUpperCase()} —{" "}
                  {selectedPlan.durationMonths} MONTH ACTION PLAN
                </h2>
                {selectedPlan.steps.map((step, index) => (
                  <label
                    className={
                      step.completed
                        ? "helper-plan-step done"
                        : "helper-plan-step"
                    }
                    key={step.id}
                  >
                    <input
                      type="checkbox"
                      checked={step.completed}
                      onChange={(e) =>
                        void toggleStep(selectedPlan, step.id, e.target.checked)
                      }
                    />
                    <span>
                      {index + 1}. {step.title}
                      {step.description && (
                        <small className="helper-step-description">
                          {step.description}
                        </small>
                      )}
                    </span>
                    {step.completed && (
                      <span className="helper-plan-status">completed</span>
                    )}
                  </label>
                ))}
              </section>
              <section
                className="helper-plan-score"
                aria-label={selectedPlan.summary.label}
              >
                <h2>{selectedPlan.summary.label}</h2>
                <div className="helper-score-prediction">
                  <span className="helper-trend-arrows" aria-hidden="true">
                    ↗ ↗
                  </span>
                  <strong>{selectedPlan.summary.value}</strong>
                </div>
                {selectedPlan.summary.note && (
                  <p>{selectedPlan.summary.note}</p>
                )}
              </section>
            </>
          ) : (
            <div className="helper-empty-plans">
              {planError ??
                "No plans yet. Type “make me a savings plan” in the chat to try it."}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
