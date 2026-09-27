import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env if present
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

# Security & App Configuration - Defaults for local prototype, override via .env
SECRET_KEY = os.getenv("JWT_SECRET", "sih26186_mha_guardian_minds_proto_sec_key_2026_q8w9e0r1")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

BACKEND_DIR = Path(__file__).resolve().parent
BASE_DIR = BACKEND_DIR.parent

# Database URL Normalization:
# Render and Heroku managed PostgreSQL provide connection strings starting with 'postgres://'.
# SQLAlchemy 1.4+ and 2.0+ require 'postgresql://' dialect prefix.
raw_db_url = os.getenv("DATABASE_URL", "").strip()
if not raw_db_url or raw_db_url == "sqlite:///./guardian_minds.db":
    db_file = BACKEND_DIR / "guardian_minds.db"
    DATABASE_URL = f"sqlite:///{db_file.as_posix()}"
elif raw_db_url.startswith("postgres://"):
    DATABASE_URL = raw_db_url.replace("postgres://", "postgresql://", 1)
else:
    DATABASE_URL = raw_db_url

# Paths to models and dataset (safely resolving in both monorepo root and backend root directory)
default_model = BACKEND_DIR / "baseline_model.json"
if not default_model.exists():
    default_model = BASE_DIR / "baseline_model.json"

default_dataset = BACKEND_DIR / "sih26186_synthetic_dataset.csv"
if not default_dataset.exists():
    default_dataset = BASE_DIR / "sih26186_synthetic_dataset.csv"

MODEL_PATH = os.getenv("MODEL_PATH", str(default_model))
DATASET_PATH = os.getenv("DATASET_PATH", str(default_dataset))

# CORS Configuration from environment
CORS_ORIGINS_RAW = os.getenv("CORS_ORIGINS", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "")

# Audit Configuration
AUDIT_ENABLED = os.getenv("AUDIT_ENABLED", "True").lower() in ("true", "1", "yes")

# Force names recognised by MHA
FORCES = ["CRPF", "BSF", "CISF", "ITBP", "SSB", "Assam Rifles", "NSG"]

# Data Governance & DPDP Act 2023 Compliance
# Quarterly retention limit matching CAPF 90-day duty rotation & trailing baseline models
DATA_RETENTION_DAYS = int(os.getenv("DATA_RETENTION_DAYS", "90"))

# Supabase Integration
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", os.getenv("SUPABASE_URL", "https://qhkfgcbqnvqnfoisykvd.supabase.co"))
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", os.getenv("SUPABASE_KEY", "sb_publishable_Ia-lnVI9yG9HySLe_leTuQ_TvdTGe5q"))
