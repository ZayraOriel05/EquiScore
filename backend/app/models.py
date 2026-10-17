from .database import Base
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey

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
