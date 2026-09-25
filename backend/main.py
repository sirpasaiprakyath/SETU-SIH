import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
from models import Base
from seed_data import seed_database

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

# CORS configuration for local React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.get("/api/health")
def health_check():
    return {
        "status": "operational",
        "system": "SETU (सेतु) — SIH26186 Personnel Welfare Monitoring System",
        "team": "Guardian Minds",
        "jurisdiction": "Ministry of Home Affairs (MHA), Government of India"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
