from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import DATABASE_URL

# Database Engine Configuration
# SQLite requires check_same_thread=False for FastAPI async/multithreaded access.
# PostgreSQL handles concurrency natively and benefits from pre-ping and recycling to survive cloud connection drops.
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine_kwargs = {
    "connect_args": connect_args,
    "echo": False,
}

if "sqlite" not in DATABASE_URL:
    engine_kwargs.update({
        "pool_pre_ping": True,     # Detect and reconnect if Render / managed DB severed idle socket
        "pool_recycle": 300,      # Recycle connection every 5 minutes to avoid stale timeouts
        "pool_size": 10,          # Standard pool size for FastAPI concurrent workers
        "max_overflow": 20,       # Allow burst capacity during high concurrent request volume
    })

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
