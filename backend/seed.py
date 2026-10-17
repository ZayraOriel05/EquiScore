"""Adds a sample user (id 1), loan and credit profile to equiscore.db.
 
Run from the backend folder:  python seed.py
Safe to run more than once: it only adds what is missing.
"""
from datetime import date
 
from app import models, database
 
models.Base.metadata.create_all(bind=database.engine)
database.ensure_columns()
 
db = database.SessionLocal()
 
if not db.get(models.User, 1):
    db.add(models.User(id=1, name="Amina K.", email="amina@example.com", income=10000, savings=500))
    db.flush()
 
if not db.query(models.Loan).filter(models.Loan.user_id == 1).first():
    db.add(models.Loan(
        user_id=1, principal=5000, balance=4500, interest_rate=12.0,
        due_date=date(2026, 10, 31), payment_amount=100,
    ))
 
if not db.query(models.CreditProfile).filter(models.CreditProfile.user_id == 1).first():
    db.add(models.CreditProfile(
        user_id=1, mobile_money=40, utility_consistency=0.55, cash_flow=200, psych_score=50,
    ))
 
db.commit()
db.close()
print("Seed complete: user 1 now has a loan and a credit profile.")
 