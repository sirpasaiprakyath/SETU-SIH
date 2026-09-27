import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
from models import Base
from seed_data import seed_database
from config import CORS_ORIGINS_RAW, FRONTEND_URL

# Import routers
from routes.auth_routes import router as auth_router
from routes.personnel_routes import router as personnel_router
from routes.nco_routes import router as nco_router
from routes.welfare_routes import router as welfare_router
from routes.command_routes import router as command_router
from routes.admin_routes import router as admin_router
from routes.public_routes import router as public_router
from routes.doctor_routes import router as doctor_router
from routes.sync_routes import router as sync_router
from routes.simulator_routes import router as simulator_router

app = FastAPI(
    title="SETU (सेतु) — SIH26186 API",
    description="MHA Predictive Personnel Welfare Monitoring System for CAPF (Team Guardian Minds)",
    version="1.0.0"
)

# ── CORS Configuration ────────────────────────────────────────────────────────
# Build allowed origins list from environment variables and local development defaults
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

for raw in [CORS_ORIGINS_RAW, FRONTEND_URL]:
    if raw:
        for entry in raw.split(","):
            cleaned = entry.strip().rstrip("/")
            if cleaned and cleaned not in allowed_origins:
                allowed_origins.append(cleaned)

# Regex matches localhost, Vercel preview/production domains, Netlify domains, and Render
cors_regex = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://.*\.vercel\.app$|^https://.*\.netlify\.app$|^https://.*\.onrender\.com$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=cors_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Register route modules
app.include_router(auth_router)
app.include_router(personnel_router)
app.include_router(nco_router)
app.include_router(welfare_router)
app.include_router(command_router)
app.include_router(admin_router)
app.include_router(public_router)
app.include_router(doctor_router)
app.include_router(sync_router)
app.include_router(simulator_router)

def migrate_sqlite_columns():
    """Ensures newly added columns in PersonnelProfile and PeerFlag are safely present in SQLite."""
    # Only applies to SQLite where DDL migrations aren't managed by PostgreSQL
    if engine.dialect.name != "sqlite":
        return

    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            # Check personnel_profiles
            res = conn.execute(text("PRAGMA table_info(personnel_profiles)")).fetchall()
            col_names = [r[1] for r in res]
            if "star_buddy_updated_at" not in col_names:
                try:
                    conn.execute(text("ALTER TABLE personnel_profiles ADD COLUMN star_buddy_updated_at DATETIME"))
                    conn.commit()
                except Exception as e:
                    print(f"[Migration Info] star_buddy_updated_at: {e}")
            
            # Check peer_flags
            res = conn.execute(text("PRAGMA table_info(peer_flags)")).fetchall()
            pf_col_names = [r[1] for r in res]
            if "is_star_buddy_report" not in pf_col_names:
                try:
                    conn.execute(text("ALTER TABLE peer_flags ADD COLUMN is_star_buddy_report BOOLEAN DEFAULT 0"))
                    conn.commit()
                except Exception as e:
                    print(f"[Migration Info] is_star_buddy_report: {e}")
            if "verification_state" not in pf_col_names:
                try:
                    conn.execute(text("ALTER TABLE peer_flags ADD COLUMN verification_state VARCHAR(50) DEFAULT 'Single_Peer'"))
                    conn.commit()
                except Exception as e:
                    print(f"[Migration Info] verification_state: {e}")
            if "corroboration_count" not in pf_col_names:
                try:
                    conn.execute(text("ALTER TABLE peer_flags ADD COLUMN corroboration_count INTEGER DEFAULT 1"))
                    conn.commit()
                except Exception as e:
                    print(f"[Migration Info] corroboration_count: {e}")
            if "client_token_hash" not in pf_col_names:
                try:
                    conn.execute(text("ALTER TABLE peer_flags ADD COLUMN client_token_hash VARCHAR(128)"))
                    conn.commit()
                except Exception as e:
                    print(f"[Migration Info] client_token_hash: {e}")
    except Exception as e:
        print(f"[Migration Warning] SQLite column migration skipped: {e}")

@app.on_event("startup")
def on_startup():
    """Initialises DB schema and seeds initial data if required."""
    Base.metadata.create_all(bind=engine)
    migrate_sqlite_columns()
    try:
        seed_database()
    except Exception as e:
        print(f"[Startup Warning] Seeding deferred or error: {e}")

@app.get("/")
def root_endpoint():
    return {
        "status": "operational",
        "system": "SETU (सेतु) — SIH26186 API",
        "description": "MHA Predictive Personnel Welfare Monitoring System for CAPF",
        "team": "Guardian Minds",
        "endpoints": {
            "health": "/health",
            "api_health": "/api/health",
            "documentation": "/docs"
        }
    }

@app.get("/health")
@app.get("/api/health")
def health_check():
    """
    Lightweight health endpoint for Render health checks and external keep-alive pings (cron-job.org / UptimeRobot).
    Pings the database with SELECT 1 to verify database responsiveness.
    """
    db_status = "operational"
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"degraded: {str(e)}"

    return {
        "status": "operational" if "degraded" not in db_status else "degraded",
        "database": db_status,
        "dialect": engine.dialect.name,
        "system": "SETU (सेतु) — SIH26186 Personnel Welfare Monitoring System",
        "team": "Guardian Minds",
        "jurisdiction": "Ministry of Home Affairs (MHA), Government of India"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
