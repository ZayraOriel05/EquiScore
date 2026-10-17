from datetime import datetime
 
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, JSON, Text
 
from .database import Base
 
 
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True)
    income = Column(Float)
    savings = Column(Float)
 
 
class Loan(Base):
    __tablename__ = "loans"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    principal = Column(Float)
    balance = Column(Float)
    interest_rate = Column(Float)
    due_date = Column(Date)
    payment_amount = Column(Float, nullable=True)  # amount of the next payment
 
 
class CreditProfile(Base):
    """The four inputs the scoring model needs, stored per user."""
    __tablename__ = "credit_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    mobile_money = Column(Float)
    utility_consistency = Column(Float)
    cash_flow = Column(Float)
    psych_score = Column(Float)
 
 
class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    role = Column(String)  # "user" or "assistant"
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
 
 
class Plan(Base):
    __tablename__ = "plans"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    name = Column(String)
    category = Column(String)  # savings | repayment | credit | other
    duration_months = Column(Integer, default=3)
    steps = Column(JSON)    # [{"id", "title", "description", "completed"}]
    summary = Column(JSON)  # {"label", "value", "note"}
    created_at = Column(DateTime, default=datetime.utcnow)
 
 
class InsightCache(Base):
    """Generated Questions-tab cards, so the LLM isn't called on every page load."""
    __tablename__ = "insight_cache"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
 