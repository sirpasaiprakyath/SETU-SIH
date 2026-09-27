"""
SETU — SQLite to PostgreSQL Migration Utility
Migrates all existing records from local 'guardian_minds.db' directly to the deployed PostgreSQL database on Render / Supabase.

Usage:
    python migrate_sqlite_to_postgres.py "<POSTGRES_DATABASE_URL>"

Example:
    python migrate_sqlite_to_postgres.py "postgresql://setu_user:pass@dpg-xxx-a.oregon-postgres.render.com/setu_db"
"""

import sys
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import schema models
from models import (
    Base,
    User,
    PersonnelProfile,
    CaseRecord,
    MusterObservation,
    PeerFlag,
    WelfareChatRequest,
    AuditLog,
    SaathiSubmission,
    SaathiNotification,
    MedicalCampRecord,
    WelfareMeeting,
    CrdtSyncEvent,
    VocalStrainRecord,
)

def run_migration(target_db_url: str):
    # Normalize postgres:// to postgresql://
    if target_db_url.startswith("postgres://"):
        target_db_url = target_db_url.replace("postgres://", "postgresql://", 1)

    backend_dir = Path(__file__).resolve().parent
    sqlite_path = backend_dir / "guardian_minds.db"

    if not sqlite_path.exists():
        print(f"[Error] Local SQLite database not found at {sqlite_path}")
        return

    sqlite_url = f"sqlite:///{sqlite_path.as_posix()}"
    print(f"[1/4] Connecting to source SQLite database ({sqlite_path.name})...")
    src_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    SrcSession = sessionmaker(bind=src_engine)
    src_db = SrcSession()

    print(f"[2/4] Connecting to target PostgreSQL database...")
    target_engine = create_engine(target_db_url, pool_pre_ping=True)
    TargetSession = sessionmaker(bind=target_engine)

    print("[3/4] Creating all schema tables on PostgreSQL...")
    Base.metadata.create_all(bind=target_engine)
    target_db = TargetSession()

    # Tables to migrate in foreign key order
    models_to_migrate = [
        (User, "users"),
        (PersonnelProfile, "personnel_profiles"),
        (CaseRecord, "case_records"),
        (MusterObservation, "muster_observations"),
        (PeerFlag, "peer_flags"),
        (WelfareChatRequest, "welfare_chat_requests"),
        (AuditLog, "audit_logs"),
        (SaathiSubmission, "saathi_submissions"),
        (SaathiNotification, "saathi_notifications"),
        (MedicalCampRecord, "medical_camp_records"),
        (WelfareMeeting, "welfare_meetings"),
        (CrdtSyncEvent, "crdt_sync_events"),
        (VocalStrainRecord, "vocal_strain_records"),
    ]

    print("[4/4] Transferring records...")
    for model_cls, table_name in models_to_migrate:
        # Check if target already has records
        target_count = target_db.query(model_cls).count()
        if target_count > 0:
            print(f"  - {table_name}: already contains {target_count} rows. Skipping to avoid duplicates.")
            continue

        src_records = src_db.query(model_cls).all()
        if not src_records:
            print(f"  - {table_name}: 0 records in SQLite.")
            continue

        # Detach records from SQLite session to insert into Postgres
        print(f"  - Copying {len(src_records)} rows into '{table_name}'...", end=" ", flush=True)
        new_objects = []
        for obj in src_records:
            # Copy all column attributes
            data = {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
            new_objects.append(model_cls(**data))

        target_db.bulk_save_objects(new_objects)
        target_db.commit()
        print(f"Done ({len(new_objects)} rows committed).")

    src_db.close()
    target_db.close()
    print("\n[SUCCESS] All SQLite data successfully migrated to PostgreSQL!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        # Check if DATABASE_URL is set in environment
        env_url = os.getenv("DATABASE_URL", "")
        if env_url and not env_url.startswith("sqlite"):
            target_url = env_url
        else:
            print("Usage: python migrate_sqlite_to_postgres.py <POSTGRESQL_CONNECTION_STRING>")
            print("Example: python migrate_sqlite_to_postgres.py postgresql://user:pass@host:5432/dbname")
            sys.exit(1)
    else:
        target_url = sys.argv[1]

    run_migration(target_url)
