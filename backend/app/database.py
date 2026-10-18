from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./equiscore.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_columns():
    """create_all() never alters existing tables, so add new columns by hand."""
    with engine.begin() as conn:
        loan_columns = [row[1] for row in conn.execute(text("PRAGMA table_info(loans)"))]
        if loan_columns and "payment_amount" not in loan_columns:
            conn.execute(text("ALTER TABLE loans ADD COLUMN payment_amount FLOAT"))
        user_columns = [row[1] for row in conn.execute(text("PRAGMA table_info(users)"))]
        if user_columns and "credit_score" not in user_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN credit_score INTEGER"))