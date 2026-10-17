"""EquiScore AI coach: talks to Llama through Ollama and returns validated, structured data.
 
Requires Ollama 0.5 or newer (for JSON-schema output) and pydantic v2.
Setup:  ollama pull llama3
"""
from typing import Literal
 
import requests
from pydantic import BaseModel, Field, ValidationError
 
OLLAMA_CHAT_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "llama3"
TIMEOUT_SECONDS = 120
 
PlanCategory = Literal["savings", "repayment", "credit", "other"]
 
 
class AssistantError(Exception):
    """Ollama is unreachable, timed out, or returned something unusable."""
 
 
# ---------- what the LLM must return (each is sent to Ollama as a JSON schema) ----------
 
class ChatResult(BaseModel):
    reply: str
    intent: Literal["answer", "offer_plan", "create_plan"]
    plan_category: PlanCategory = "other"
 
 
class InsightsResult(BaseModel):
    debt_repayment: str
    savings_balance: str
    financial_advice: str
 
 
class PlanStepDraft(BaseModel):
    title: str
    description: str
 
 
class PlanDraft(BaseModel):
    name: str
    target: str
    steps: list[PlanStepDraft] = Field(min_length=3, max_length=3)
 
 
# ---------- prompts ----------
 
def _money(value):
    return None if value is None else f"${value:,.2f}"
 
 
def _facts(ctx: dict) -> str:
    rows = [
        ("Name", ctx.get("name")),
        ("Income", _money(ctx.get("income"))),
        ("Savings", _money(ctx.get("savings"))),
        ("Outstanding loan balance", _money(ctx.get("loan_balance"))),
        ("Original loan amount", _money(ctx.get("loan_total"))),
        ("Loan interest rate", None if ctx.get("interest_rate") is None else f"{ctx['interest_rate']}%"),
        ("Next payment due", ctx.get("due_date")),
        ("Next payment amount", _money(ctx.get("payment_amount"))),
        ("Credit score (300-850 scale)", ctx.get("credit_score")),
    ]
    return "\n".join(f"- {label}: {value}" for label, value in rows if value is not None)
 
 
def _system_prompt(ctx: dict) -> str:
    return (
        "You are the EquiScore AI Financial Coach for a micro-entrepreneur with a small loan. "
        "Be encouraging, professional and practical, and write in plain language.\n"
        "Rules:\n"
        "- Use only the facts listed below. If something is not listed, say you don't have that information.\n"
        "- You do NOT know their payment history, so never say they have missed or made payments.\n"
        "- Never promise a specific credit score increase or guarantee any outcome.\n\n"
        f"Facts about this user:\n{_facts(ctx)}"
    )
 
 
CHAT_RULES = (
    "\n\nRespond as JSON. Keep 'reply' under 120 words.\n"
    "- intent 'answer': a normal reply.\n"
    "- intent 'offer_plan': a written plan would help, so answer the question and end by asking "
    "whether they would like you to draft a plan.\n"
    "- intent 'create_plan': the user asked for a plan, or agreed to a plan you just offered. "
    "Make 'reply' one short sentence saying you are drafting it.\n"
    "- plan_category: savings, repayment, credit or other, matching the plan topic."
)
 
CATEGORY_FOCUS = {
    "savings": "building savings",
    "repayment": "repaying the loan on time",
    "credit": "building a reliable record that improves creditworthiness",
    "other": "general financial health",
}
 
 
# ---------- Ollama call ----------
 
def _ask(messages: list[dict], model_cls: type[BaseModel], temperature: float = 0.4):
    payload = {
        "model": MODEL_NAME,
        "messages": messages,
        "stream": False,
        "format": model_cls.model_json_schema(),
        "options": {"temperature": temperature},
    }
    for _attempt in range(2):  # one retry if the model returns invalid JSON
        try:
            response = requests.post(OLLAMA_CHAT_URL, json=payload, timeout=TIMEOUT_SECONDS)
            response.raise_for_status()
            content = response.json()["message"]["content"]
        except requests.RequestException as exc:
            raise AssistantError(
                "The AI assistant isn't responding. Make sure Ollama is running (ollama serve)."
            ) from exc
        except (KeyError, ValueError) as exc:
            raise AssistantError("The AI assistant sent an unexpected response.") from exc
        try:
            return model_cls.model_validate_json(content)
        except ValidationError:
            continue
    raise AssistantError("The AI assistant returned an unusable answer. Please try again.")
 
 
# ---------- public functions ----------
 
def chat(ctx: dict, history: list[dict], message: str) -> ChatResult:
    messages = [{"role": "system", "content": _system_prompt(ctx) + CHAT_RULES}]
    messages += history[-10:]
    messages.append({"role": "user", "content": message})
    return _ask(messages, ChatResult)
 
 
def generate_insights(ctx: dict) -> InsightsResult:
    instruction = (
        "Write three short tips for this user, each under 30 words, based only on the facts you have.\n"
        "- debt_repayment: about repaying their loan.\n"
        "- savings_balance: about their savings.\n"
        "- financial_advice: about their income or credit score.\n"
        "Respond as JSON."
    )
    messages = [
        {"role": "system", "content": _system_prompt(ctx)},
        {"role": "user", "content": instruction},
    ]
    return _ask(messages, InsightsResult)
 
 
def generate_plan(ctx: dict, category: str, history: list[dict]) -> PlanDraft:
    focus = CATEGORY_FOCUS.get(category, CATEGORY_FOCUS["other"])
    instruction = (
        f"Draft a 3 month action plan focused on {focus}.\n"
        "- name: a short plan name.\n"
        "- target: one short, measurable goal using the user's own figures "
        "(for example 'Save $300 in 3 months'). Never a credit score promise.\n"
        "- steps: exactly 3 concrete steps. Each has a title under 10 words and a one sentence description.\n"
        "Respond as JSON."
    )
    messages = [{"role": "system", "content": _system_prompt(ctx)}]
    messages += history[-6:]
    messages.append({"role": "user", "content": instruction})
    return _ask(messages, PlanDraft)
 