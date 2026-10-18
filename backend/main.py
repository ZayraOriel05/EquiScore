from datetime import date, datetime, timedelta
from typing import Literal

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy.orm import Session

from app import models, database, scoring, assistant

app = FastAPI(title="EquiScore Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables, then add any new columns to existing tables
models.Base.metadata.create_all(bind=database.engine)
database.ensure_columns()

MAX_PLANS = 3
HISTORY_LIMIT = 10
INSIGHT_TTL = timedelta(hours=24)


# Pydantic Schemas for API
class UserCreate(BaseModel):
    name: str
    email: str
    income: float
    savings: float

class ScoringRequest(BaseModel):
    mobile_money: float
    utility_consistency: float
    cash_flow: float
    psych_score: float

class ChatRequest(BaseModel):
    user_id: int
    message: str

class PlanRequest(BaseModel):
    user_id: int
    category: Literal["savings", "repayment", "credit", "other"]

class StepUpdate(BaseModel):
    completed: bool

class ProfileIn(BaseModel):
    """The eight answers from the profile page."""
    name: str = Field(min_length=1, max_length=80)
    income: float = Field(ge=0)
    savings: float = Field(ge=0)
    loan_balance: float = Field(ge=0)
    next_payment_date: date
    credit_score: int = Field(ge=300, le=850)
    loan_total: float = Field(gt=0)
    next_payment_amount: float = Field(ge=0)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name can't be blank")
        return value

    @model_validator(mode="after")
    def balance_within_total(self):
        if self.loan_balance > self.loan_total:
            raise ValueError("Outstanding loan balance can't be more than the total loan amount")
        return self


# ---------- helpers ----------

class PlanLimitError(Exception):
    pass


def load_user_context(db: Session, user_id: int):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    loan = db.query(models.Loan).filter(models.Loan.user_id == user_id).first()
    profile = db.query(models.CreditProfile).filter(models.CreditProfile.user_id == user_id).first()
    score = user.credit_score  # entered on the profile page
    if score is None and profile:
        score = scoring.scorer.predict_credit_score([
            profile.mobile_money, profile.utility_consistency, profile.cash_flow, profile.psych_score,
        ])
    return user, loan, score


def build_ctx(user, loan, score) -> dict:
    """The facts that get put into every LLM prompt."""
    return {
        "name": user.name,
        "income": user.income,
        "savings": user.savings,
        "loan_balance": loan.balance if loan else None,
        "loan_total": loan.principal if loan else None,
        "interest_rate": loan.interest_rate if loan else None,
        "due_date": loan.due_date.isoformat() if loan and loan.due_date else None,
        "payment_amount": loan.payment_amount if loan else None,
        "credit_score": score,
    }


def recent_history(db: Session, user_id: int) -> list[dict]:
    rows = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.user_id == user_id)
        .order_by(models.ChatMessage.id.desc())
        .limit(HISTORY_LIMIT)
        .all()
    )
    return [{"role": r.role, "content": r.content} for r in reversed(rows)]


def plan_out(plan: models.Plan) -> dict:
    return {
        "id": str(plan.id),
        "name": plan.name,
        "category": plan.category,
        "durationMonths": plan.duration_months,
        "steps": plan.steps,
        "summary": plan.summary,
    }


def upsert_plan(db: Session, user_id: int, ctx: dict, category: str, history: list[dict]):
    """Create a plan, or regenerate the existing one for that category. Returns (plan, created)."""
    existing = (
        db.query(models.Plan)
        .filter(models.Plan.user_id == user_id, models.Plan.category == category)
        .first()
    )
    count = db.query(models.Plan).filter(models.Plan.user_id == user_id).count()
    if not existing and count >= MAX_PLANS:
        raise PlanLimitError()

    draft = assistant.generate_plan(ctx, category, history)  # may raise AssistantError
    steps = [
        {"id": f"step-{i + 1}", "title": s.title, "description": s.description, "completed": False}
        for i, s in enumerate(draft.steps)
    ]
    summary = {
        "label": "TARGET",
        "value": draft.target,
        "note": "Estimate based on your current figures, not a guarantee.",
    }
    if existing:
        existing.name, existing.steps, existing.summary = draft.name, steps, summary
        plan, created = existing, False
    else:
        plan = models.Plan(
            user_id=user_id, name=draft.name, category=category,
            duration_months=3, steps=steps, summary=summary,
        )
        db.add(plan)
        created = True
    db.commit()
    db.refresh(plan)
    return plan, created


def profile_out(user, loan, score) -> dict:
    return {
        "name": user.name,
        "income": user.income,
        "savings": user.savings,
        "loan_balance": loan.balance if loan else 0,
        "next_payment_date": loan.due_date.isoformat() if loan and loan.due_date else None,
        "credit_score": score,
        "loan_total": loan.principal if loan else None,
        "next_payment_amount": loan.payment_amount if loan else None,
    }


def apply_profile(db: Session, user: models.User, loan, data: ProfileIn):
    user.name, user.income, user.savings, user.credit_score = data.name, data.income, data.savings, data.credit_score
    if loan is None:
        loan = models.Loan(user_id=user.id)
        db.add(loan)
    loan.principal, loan.balance = data.loan_total, data.loan_balance
    loan.due_date, loan.payment_amount = data.next_payment_date, data.next_payment_amount


# ---------- routes ----------

@app.get("/")
def read_root():
    return {"message": "Welcome to EquiScore API"}

# --- Part 1: Credit Scoring ---
@app.post("/score")
def calculate_score(req: ScoringRequest):
    data = [req.mobile_money, req.utility_consistency, req.cash_flow, req.psych_score]
    score = scoring.scorer.predict_score(data)
    return {"credit_score": score, "status": "Success"}

# --- Part 2: Loan Management ---
@app.post("/users")
def create_user(user: UserCreate, db: Session = Depends(database.get_db)):
    db_user = models.User(name=user.name, email=user.email, income=user.income, savings=user.savings)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/loans/{user_id}")
def get_loan_details(user_id: int, db: Session = Depends(database.get_db)):
    user, loan, score = load_user_context(db, user_id)

    result = {
        "user": user.name,
        "income": user.income,
        "savings": user.savings,
        "loan_balance": loan.balance if loan else 0,
        "next_payment_date": loan.due_date.isoformat() if loan and loan.due_date else None,
    }
    if loan and loan.principal is not None:
        result["loan_total"] = loan.principal
    if loan and loan.payment_amount is not None:
        result["next_payment_amount"] = loan.payment_amount
    if score is not None:
        result["credit_score"] = score
    return result

# --- Profile: replaces seed.py. Created on the first-visit page, edited from the profile icon ---
@app.post("/profile")
def create_profile(data: ProfileIn, db: Session = Depends(database.get_db)):
    user = models.User(name=data.name, income=data.income, savings=data.savings)
    db.add(user)
    db.flush()  # assigns user.id
    apply_profile(db, user, None, data)
    db.commit()
    db.refresh(user)
    return {"user_id": user.id}

@app.get("/profile/{user_id}")
def get_profile(user_id: int, db: Session = Depends(database.get_db)):
    user, loan, score = load_user_context(db, user_id)
    return profile_out(user, loan, score)

@app.put("/profile/{user_id}")
def update_profile(user_id: int, data: ProfileIn, db: Session = Depends(database.get_db)):
    user, loan, _score = load_user_context(db, user_id)
    apply_profile(db, user, loan, data)
    cached = db.get(models.InsightCache, user_id)
    if cached:  # the Questions tab was written for the old numbers
        db.delete(cached)
    db.commit()
    return {"user_id": user_id}

# --- Part 3: AI Financial Assistant ---
@app.post("/chat")
def chat_with_assistant(req: ChatRequest, db: Session = Depends(database.get_db)):
    user, loan, score = load_user_context(db, req.user_id)
    ctx = build_ctx(user, loan, score)
    history = recent_history(db, req.user_id)

    try:
        result = assistant.chat(ctx, history, req.message)
    except assistant.AssistantError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    reply = result.reply.strip()
    action, plan, offer_category = "chat_reply", None, None

    if result.intent == "create_plan":
        try:
            plan, created = upsert_plan(
                db, req.user_id, ctx, result.plan_category,
                history + [{"role": "user", "content": req.message}],
            )
            action = "plan_created" if created else "plan_updated"
            reply = f"{plan.name} is ready. Open the Plans tab to review it."
        except PlanLimitError:
            reply = "You already have three plans. Delete one from the Plans menu before creating another."
        except assistant.AssistantError as exc:
            raise HTTPException(status_code=503, detail=str(exc))
    elif result.intent == "offer_plan":
        action, offer_category = "plan_offered", result.plan_category

    db.add(models.ChatMessage(user_id=req.user_id, role="user", content=req.message))
    db.add(models.ChatMessage(user_id=req.user_id, role="assistant", content=reply))
    db.commit()

    return {
        "response": reply,  # kept so the original frontend contract still works
        "reply": reply,
        "action": action,
        "plan": plan_out(plan) if plan else None,
        "offer_category": offer_category,
    }

@app.get("/chat/{user_id}/history")
def get_chat_history(user_id: int, db: Session = Depends(database.get_db)):
    rows = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.user_id == user_id)
        .order_by(models.ChatMessage.id.desc())
        .limit(50)
        .all()
    )
    return {"messages": [{"role": r.role, "text": r.content} for r in reversed(rows)]}

@app.get("/insights/{user_id}")
def get_insights(user_id: int, refresh: bool = False, db: Session = Depends(database.get_db)):
    user, loan, score = load_user_context(db, user_id)
    cached = db.get(models.InsightCache, user_id)
    is_fresh = bool(cached and cached.created_at and datetime.utcnow() - cached.created_at < INSIGHT_TTL)
    if cached and is_fresh and not refresh:
        return {"insights": cached.data}

    try:
        result = assistant.generate_insights(build_ctx(user, loan, score))
    except assistant.AssistantError as exc:
        if cached:  # better stale than empty
            return {"insights": cached.data, "stale": True}
        raise HTTPException(status_code=503, detail=str(exc))

    data = [
        {"id": "debt", "title": "DEBT REPAYMENT", "description": result.debt_repayment},
        {"id": "savings", "title": "SAVINGS BALANCE", "description": result.savings_balance},
        {"id": "advice", "title": "FINANCIAL ADVICE", "description": result.financial_advice},
    ]
    if cached:
        cached.data, cached.created_at = data, datetime.utcnow()
    else:
        db.add(models.InsightCache(user_id=user_id, data=data, created_at=datetime.utcnow()))
    db.commit()
    return {"insights": data}

# --- Part 4: Plans ---
@app.get("/plans/{user_id}")
def list_plans(user_id: int, db: Session = Depends(database.get_db)):
    plans = db.query(models.Plan).filter(models.Plan.user_id == user_id).order_by(models.Plan.id).all()
    return {"plans": [plan_out(p) for p in plans]}

@app.post("/plans/generate")
def generate_plan(req: PlanRequest, db: Session = Depends(database.get_db)):
    """Used by the 'Create plan' button after the assistant offers one."""
    user, loan, score = load_user_context(db, req.user_id)
    ctx = build_ctx(user, loan, score)
    try:
        plan, created = upsert_plan(db, req.user_id, ctx, req.category, recent_history(db, req.user_id))
    except PlanLimitError:
        raise HTTPException(status_code=409, detail="You already have three plans. Delete one first.")
    except assistant.AssistantError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return {"action": "plan_created" if created else "plan_updated", "plan": plan_out(plan)}

@app.patch("/plans/{plan_id}/steps/{step_id}")
def update_step(plan_id: int, step_id: str, body: StepUpdate, db: Session = Depends(database.get_db)):
    plan = db.get(models.Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    steps = [dict(s) for s in plan.steps]
    step = next((s for s in steps if s["id"] == step_id), None)
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    step["completed"] = body.completed
    plan.steps = steps  # assign a new list so SQLAlchemy sees the change
    db.commit()
    db.refresh(plan)
    return {"plan": plan_out(plan)}

@app.delete("/plans/{plan_id}")
def delete_plan(plan_id: int, db: Session = Depends(database.get_db)):
    plan = db.get(models.Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(plan)
    db.commit()
    return {"deletedPlanId": str(plan_id)}


if __name__ == "__main__":
    import uvicorn
    # reload=True needs the app as an import string, not the app object
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)