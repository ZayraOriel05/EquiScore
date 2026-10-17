const API_BASE_URL = "http://localhost:8080";

/* ---------- types ---------- */

export interface UserData {
  user: string;
  income: number;
  savings: number;
  loan_balance: number;
  next_payment_date: string | null;
  // Optional: shown on the dashboard when the backend returns them.
  credit_score?: number;
  loan_total?: number;
  next_payment_amount?: number;
}

export type PlanCategory = "savings" | "repayment" | "credit" | "other";

export interface Insight {
  id: string;
  title: string;
  description: string;
}

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface FinancialPlan {
  id: string;
  name: string;
  category: PlanCategory;
  durationMonths: number;
  steps: PlanStep[];
  summary: { label: string; value: string; note?: string };
}

export interface AIResponse {
  reply: string;
  action: "chat_reply" | "plan_offered" | "plan_created" | "plan_updated";
  plan?: FinancialPlan | null;
  offer_category?: PlanCategory | null;
}

export interface HistoryMessage {
  role: "user" | "assistant";
  text: string;
}

/* ---------- helpers ---------- */

// Turns any error into a message that is safe to show the user.
export function errorText(err: unknown): string {
  if (err instanceof TypeError) {
    return "Can't reach the server. Check that the backend is running on port 8080.";
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}

// The backend sends { detail: "..." } for errors such as "Ollama isn't running".
async function failure(response: Response, fallback: string): Promise<Error> {
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") return new Error(body.detail);
  } catch {
    /* response wasn't JSON */
  }
  return new Error(fallback);
}

/* ---------- dashboard ---------- */

export async function fetchLoanDetails(userId: number): Promise<UserData> {
  const response = await fetch(`${API_BASE_URL}/loans/${userId}`);
  if (!response.ok)
    throw await failure(response, "Failed to fetch loan details");
  return response.json();
}

export async function getCreditScore(data: {
  mobile_money: number;
  utility_consistency: number;
  cash_flow: number;
  psych_score: number;
}): Promise<{ credit_score: number }> {
  const response = await fetch(`${API_BASE_URL}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to calculate score");
  return response.json();
}

/* ---------- assistant ---------- */

export async function chatWithAssistant(
  userId: number,
  message: string,
): Promise<AIResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, message: message }),
  });
  if (!response.ok) throw await failure(response, "Assistant error");
  return response.json();
}

export async function fetchChatHistory(
  userId: number,
): Promise<HistoryMessage[]> {
  const response = await fetch(`${API_BASE_URL}/chat/${userId}/history`);
  if (!response.ok)
    throw await failure(response, "Could not load chat history");
  const data = await response.json();
  return data.messages;
}

export async function fetchInsights(
  userId: number,
  refresh = false,
): Promise<Insight[]> {
  const response = await fetch(
    `${API_BASE_URL}/insights/${userId}${refresh ? "?refresh=true" : ""}`,
  );
  if (!response.ok)
    throw await failure(response, "Could not load your questions");
  const data = await response.json();
  return data.insights;
}

/* ---------- plans ---------- */

export async function fetchPlans(userId: number): Promise<FinancialPlan[]> {
  const response = await fetch(`${API_BASE_URL}/plans/${userId}`);
  if (!response.ok) throw await failure(response, "Could not load your plans");
  const data = await response.json();
  return data.plans;
}

export async function generatePlan(
  userId: number,
  category: PlanCategory,
): Promise<FinancialPlan> {
  const response = await fetch(`${API_BASE_URL}/plans/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, category }),
  });
  if (!response.ok) throw await failure(response, "Could not create the plan");
  const data = await response.json();
  return data.plan;
}

export async function setStepCompleted(
  planId: string,
  stepId: string,
  completed: boolean,
): Promise<FinancialPlan> {
  const response = await fetch(
    `${API_BASE_URL}/plans/${planId}/steps/${stepId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    },
  );
  if (!response.ok) throw await failure(response, "Could not update the step");
  const data = await response.json();
  return data.plan;
}

export async function deletePlan(planId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/plans/${planId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw await failure(response, "Could not delete the plan");
}
