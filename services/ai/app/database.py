from collections.abc import Generator
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

try:
    from dotenv import load_dotenv

    # Load the repo-root .env (gitignored) so GOOGLE_API_KEY / DATABASE_URL are
    # available without exporting them manually. Existing env vars win.
    load_dotenv(Path(__file__).resolve().parents[3] / ".env", override=False)
    load_dotenv(override=False)
except Exception:
    pass


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./learnshift_ai.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
