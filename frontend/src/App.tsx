import React, { useEffect, useRef, useState } from "react";
import { fetchLoanDetails, chatWithAssistant, UserData } from './api';
import './App.css';

// --- HELPER: CountUp Animation ---
function CountUp({ to, duration = 1450, decimals = 0 }: { to: number; duration?: number; decimals?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const animate = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(to * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    const frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [to, duration]);
  return <>{value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}

type Insight = { id: string; title: string; description: string };
type PlanStep = { id: string; title: string; description: string; completed: boolean };
type FinancialPlan = {
  id: string;
  name: string;
  category: 'savings' | 'repayment' | 'credit' | 'other';
  durationMonths: number;
  steps: PlanStep[];
  summary: { label: string; value: string; note?: string };
};
type AIResponse = {
  reply: string;
  action: 'chat_reply' | 'insights_updated' | 'plan_created' | 'plan_updated' | 'plan_deleted';
  insights?: Insight[];
  plan?: FinancialPlan;
  deletedPlanId?: string;
};

const initialInsights: Insight[] = [
  { id: 'debt', title: 'DEBT REPAYMENT', description: 'You have been consistently meeting deadlines. See how you can adjust your habits to meet your goals.' },
  { id: 'savings', title: 'SAVINGS BALANCE', description: 'You are on track to meet your saving goals. Keep it up!' },
  { id: 'advice', title: 'FINANCIAL ADVICE', description: 'You seem to be generating more income. See how this could help your credit score.' },
];

export default function App() {
  // --- BACKEND STATE ---
  const [userData, setUserData] = useState<UserData | null>(null);
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'assistant'; text: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- UI STATE ---
  const [showLoanDetails, setShowLoanDetails] = useState(false);
  const [page, setPage] = useState<'dashboard' | 'helper'>('dashboard');
  const [chatText, setChatText] = useState('');
  const [helperTab, setHelperTab] = useState<'questions' | 'plans'>('questions');
  const [insights, setInsights] = useState<Insight[]>(initialInsights);
  const [plans, setPlans] = useState<FinancialPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [plansMenuOpen, setPlansMenuOpen] = useState(false);

  // 1. FETCH REAL DATA ON LOAD
  useEffect(() => {
    fetchLoanDetails(1).then(setUserData).catch(console.error);
  }, []);

  // 2. REAL AI CHAT HANDLER (Replaced mockBackendResponse)
  async function sendChat(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = chatText.trim();
    if (!question || isGenerating) return;

    setChatMessages(old => [...old, { sender: 'user', text: question }]);
    setChatText('');
    setIsGenerating(true);

    try {
      const response = await chatWithAssistant(1, question);
      setChatMessages(prev => [...prev, { sender: 'assistant', text: response.response }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { sender: 'assistant', text: "Sorry, I'm having trouble connecting to my brain. Please check the server!" }]);
    } finally {
      setIsGenerating(false);
    }
  }

  function deletePlan(id: string) {
    setPlans(prev => prev.filter(p => p.id !== id));
    if (selectedPlanId === id) setSelectedPlanId(null);
  }

  return (
    <div className="dashboard-frame">
      {page === 'dashboard' ? (
      <main className="dashboard-canvas" key="dashboard-animated">
        <header className="welcome-heading">
          <h1>Welcome Back, {userData?.user || 'Borrower'}!</h1>
          <p>Here’s your account overview</p>
        </header>
        <div className="vertical-divider" aria-hidden="true" />

        <section className="loan-card" aria-label="Current loan">
          <div className="loan-card-meta"><span>{userData?.user || 'User Name'}</span><span>Microfinancer</span></div>
          <div className="loan-balance">
            <div className="balance-amount"><span className="currency">$</span><CountUp to={userData?.loan_balance || 1967} /><span className="cents">.00</span></div>
            <span className="balance-label">Outstanding Balance</span>
          </div>
          <button className="loan-details" onClick={() => setShowLoanDetails(true)}>See loan details <span aria-hidden="true">⟶</span></button>
        </section>

        <section className="repaid-card" aria-label="Loan repayment progress">
          <div className="repaid-title">You have paid <strong><CountUp to={10} />%</strong> of your loan</div>
          <div className="repaid-values"><span>${(userData?.loan_balance || 5000) * 0.1} repaid</span><span>${userData?.loan_balance || 5000} loan</span></div>
          <div className="repaid-track" role="progressbar" aria-label="Loan repaid" aria-valuemin={0} aria-valuemax={100} aria-valuenow={10}><div className="repaid-fill" /></div>
        </section>

        <section className="score-card" aria-label="Credit score">
          <svg className="score-arc" viewBox="0 0 220 126" role="img" aria-label="Credit score gauge">
            <path d="M 12 113 A 98 98 0 0 1 208 113" fill="none" stroke="#E1E1E1" strokeWidth="16" />
            <path d="M 12 113 A 98 98 0 0 1 100 15" fill="none" stroke="#789584" strokeWidth="16" strokeLinecap="round" pathLength={100} />
          </svg>
          <div className="score-text">
            <span className="score-value"><CountUp to={640} duration={1700} /></span>
            <span className="score-label">Credit Score</span>
            <span className="score-arrow" aria-hidden="true">⟶</span>
          </div>
        </section>

        <section className="repayment-due" aria-label="Upcoming loan payments">
          <h2 className="repayment-heading">UPCOMING LOAN PAYMENTS</h2>
          <div className="repayment-content">
            <div className="date-badge"><span>Oct</span><span>17</span></div>
            <div className="due-balance"><span>$ <CountUp to={100} decimals={2} /></span></div>
          </div>
        </section>

        <section className="mini-stat savings" aria-label="Savings">
          <span className="stat-heading">SAVINGS</span>
          <strong className="stat-amount"><span className="stat-currency">$</strong><CountUp to={userData?.savings || 500} /><span className="stat-cents">.00</span></strong>
        </section>
        <section className="mini-stat income" aria-label="Income">
          <span className="stat-heading">INCOME</span>
          <strong className="stat-amount"><span className="stat-currency">$</strong><CountUp to={userData?.income || 10000} /><span className="stat-cents">.00</span></strong>
        </section>
      </main>
      ) : (
      <main className="helper-canvas">
        <section className="helper-chat-panel" aria-label="AI Helper chat">
          <h1>What Are We<br />Learning Today?</h1>
          <div className="helper-chat-history" aria-live="polite">
            {chatMessages.map((message, index) => (
              <p key={index} className={`helper-message helper-message-${message.sender}`}>{message.text}</p>
            ))}
            {isGenerating && <p className="helper-message helper-message-assistant">AI is thinking...</p>}
          </div>
          <form className="helper-chat-form" onSubmit={sendChat}>
            <input
              aria-label="Ask me anything"
              placeholder="Ask me anything..."
              value={chatText}
              onChange={event => setChatText(event.target.value)}
            />
            <button aria-label="Send message" type="submit" />
          </form>
        </section>
        <section className="helper-insights-panel" aria-label="Financial insights and plans">
          <div className="helper-tabs" role="tablist" aria-label="AI Helper results">
            <button id="helper-questions-tab" type="button" role="tab" aria-selected={helperTab === 'questions'} aria-controls="helper-results" className={helperTab === 'questions' ? 'helper-tab active' : 'helper-tab'} onClick={() => { setHelperTab('questions'); setPlansMenuOpen(false); }}>Questions</button>
            <div className="helper-plans-menu" onMouseEnter={() => setPlansMenuOpen(true)} onMouseLeave={() => setPlansMenuOpen(false)}>
              <button id="helper-plans-tab" type="button" role="tab" aria-selected={helperTab === 'plans'} aria-controls="helper-results" aria-expanded={plansMenuOpen} className={helperTab === 'plans' ? 'helper-tab active' : 'helper-tab'} onClick={() => { setHelperTab('plans'); setPlansMenuOpen(v => !v); }}>Plans ▾</button>
              {plansMenuOpen && <div className="helper-plan-dropdown" aria-label="Choose a financial plan">
                <div className="helper-plan-count">Your plans ({plans.length}/3)</div>
                {plans.map(plan => <div className="helper-plan-choice" key={plan.id}>
                  <button type="button" className={selectedPlanId === plan.id ? 'helper-plan-select selected' : 'helper-plan-select'} onClick={() => { setSelectedPlanId(plan.id); setHelperTab('plans'); setPlansMenuOpen(false); }}>{plan.name}</button>
                  <button type="button" className="helper-plan-delete" aria-label={`Delete ${plan.name}`} title={`Delete ${plan.name}`} onClick={() => deletePlan(plan.id)}>×</button>
                </div>)}
                {plans.length === 0 && <p>No plans yet. Ask the chat to create one.</p>}
                {plans.length === 3 && <p>Maximum 3 plans reached.</p>}
              </div>}
            </div>
          </div>
          <div id="helper-results" role="tabpanel" aria-labelledby={helperTab === 'questions' ? 'helper-questions-tab' : 'helper-plans-tab'} className="helper-tab-content" key={`${helperTab}-${selectedPlanId ?? 'none'}`}>
            {helperTab === 'questions' ? (
              <>{insights.map(item => (
                <article className="helper-insight" key={item.id}><h2>{item.title}</h2><p>{item.description}</p></article>
              ))}</>
            ) : plans.find(p => p.id === selectedPlanId) ? (
              <>
                <section className="helper-plan-actions" aria-label="Action plan">
                  <h2 className="uppercase">{plans.find(p => p.id === selectedPlanId)?.name} — {plans.find(p => p.id === selectedPlanId)?.durationMonths} MONTH ACTION PLAN</h2>
                  {plans.find(p => p.id === selectedPlanId)?.steps.map((step, index) => <div className="helper-plan-step" key={step.id}>
                    <span>{index + 1}. {step.title}{step.description && <small className="helper-step-description">{step.description}</small>}</span>
                    {step.completed && <span className="helper-plan-status">completed</span>}
                  </div>)}
                </section>
                <section className="helper-plan-score" aria-label="Plan Score">
                  <h2>{plans.find(p => p.id === selectedPlanId)?.summary.label}</h2>
                  <div className="helper-score-prediction"><span className="helper-trend-arrows" aria-hidden="true">↗ ↗</span><strong>{plans.find(p => p.id === selectedPlanId)?.summary.value}</strong></div>
                  {plans.find(p => p.id === selectedPlanId)?.summary.note && <p>{plans.find(p => p.id === selectedPlanId)?.summary.note}</p>}
                </section>
              </>
            ) : <div className="helper-empty-plans">No plans yet. Type “create a savings plan” in the chat to try it.</div>}
          </div>
        </section>
      </main>
      ) : (
      <main className="helper-canvas">
        <div className="p-10 text-center">Coming Soon...</div>
      </main>
      )}
      <nav className="footer-nav" aria-label="Main navigation">
        <button className={page === 'dashboard' ? 'selected' : ''} onClick={() => setPage('dashboard')}>Dashboard</button>
        <button type="button" className={page === 'helper' ? 'selected' : ''} onClick={() => setPage('helper')}>AI Helper</button>
        <button type="button" onClick={() => window.alert('Assistant page coming soon')}>Assistant</button>
      </nav>
      {showLoanDetails && (
        <div className="modal-backdrop" onClick={() => setShowLoanDetails(false)}>
          <section className="modal-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h2>Loan details</h2>
            <p>Outstanding balance: ${userData?.loan_balance || '1,967.00'}</p>
            <p>Upcoming repayment: $100.00 — Oct 17</p>
            <button onClick={() => setShowLoanDetails(false)}>Close</button>
          </section>
        </div>
      )}
    </div>
  );
}
