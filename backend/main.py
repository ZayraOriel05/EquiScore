from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app import models, database, scoring, assistant
from pydantic import BaseModel
from typing import List

app = FastAPI(title="EquiScore Backend")

# --- CORS FIX: This allows Vercel to talk to your local server ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all origins (perfect for hackathons)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

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
    user = db.query(models.User).filter(models.User.id == user_id).first()
    loan = db.query(models.Loan).filter(models.Loan.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user": user.name,
        "income": user.income,
        "savings": user.savings,
        "loan_balance": loan.balance if loan else 0,
        "next_payment_date": loan.due_date if loan else None
    }

# --- Part 3: AI Financial Assistant ---
@app.post("/chat")
def chat_with_assistant(req: ChatRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == req.user_id).first()
    loan = db.query(models.Loan).filter(models.Loan.user_id == req.user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data = {
        "income": user.income,
        "savings": user.savings,
        "balance": loan.balance if loan else 0
    }
    
    response = assistant.assistant.get_advice(user_data, req.message)
    return {"response": response}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
