import os
import json
import random
import pandas as pd
from datetime import datetime, timedelta
from database import engine, SessionLocal
from models import Base, User, PersonnelProfile, CaseRecord, MusterObservation, PeerFlag, AuditLog
from auth import get_password_hash
from config import DATASET_PATH

FIRST_NAMES = [
    "Rajesh", "Vikram", "Amit", "Sandeep", "Manoj", "Dharmendra", "Suresh", "Ramesh",
    "Kuldeep", "Jitendra", "Satish", "Pradeep", "Ashok", "Sunil", "Vijay", "Mukesh",
    "Deepak", "Anil", "Praveen", "Rakesh", "Sanjay", "Mahesh", "Devendra", "Gopal",
    "Hemant", "Jagdish", "Kishore", "Lalit", "Mohan", "Naveen", "Omkar", "Pankaj"
]

LAST_NAMES = [
    "Kumar", "Singh", "Sharma", "Verma", "Yadav", "Patel", "Thakur", "Choudhary",
    "Mishra", "Gupta", "Rathore", "Pawar", "Shinde", "Nair", "Reddy", "Meena",
    "Rawat", "Negi", "Bora", "Bisht", "Tomar", "Chauhan", "Solanki", "Jat"
]

COMPANIES = ["Company-A (Bravo Platoon)", "Company-B (Alpha Platoon)", "Company-C (Delta Platoon)", "Company-D (Headquarters)"]
BATTALIONS = ["2nd Battalion (Srinagar, J&K)", "14th Battalion (Dantewada, LWE)", "101 RAF Battalion (Law & Order / RAF)", "CRPF Academy / Group Centre (Kadarpur)"]

def generate_full_name(seed_int: int) -> str:
    rng = random.Random(seed_int)
    return f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"

def seed_database(force: bool = False):
    print("[Seed] Initialising database tables...")
    if force:
        print("[Seed] Force flag set: Dropping existing tables for clean schema re-creation...")
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if already seeded
    existing_users = db.query(User).count()
    if existing_users > 0 and not force:
        print(f"[Seed] Database already contains {existing_users} users. Skipping full re-seed.")
        db.close()
        return

    print("[Seed] Creating demo role accounts...")
    # Demo accounts for all 5 roles
    demo_users = [
        User(
            username="personnel_demo",
            password_hash=get_password_hash("Password@123"),
            role="personnel",
            full_name="Ct. Rajesh Kumar Singh",
            force="CRPF",
            rank="Constable/GD",
            battalion_id="14th Battalion (Dantewada)",
            company="Company-C (Delta Platoon)",
            personnel_id="PID100042",  # Will link to a flagged profile
        ),
        User(
            username="personnel_calm",
            password_hash=get_password_hash("Password@123"),
            role="personnel",
            full_name="Ct. Sandeep Verma",
            force="CRPF",
            rank="Constable/GD",
            battalion_id="2nd Battalion (Srinagar)",
            company="Company-A (Bravo Platoon)",
            personnel_id="PID100100",  # Unflagged profile
        ),
        User(
            username="nco_demo",
            password_hash=get_password_hash("Password@123"),
            role="nco",
            full_name="Havildar (NCO) Vikram Rathore",
            force="CRPF",
            rank="Head Constable / Section Commander",
            battalion_id="14th Battalion (Dantewada)",
            company="Company-C (Delta Platoon)",
            personnel_id=None,
        ),
        User(
            username="welfare_demo",
            password_hash=get_password_hash("Password@123"),
            role="welfare_officer",
            full_name="Assistant Commandant Dr. Ananya Sharma (Welfare Officer)",
            force="CRPF",
            rank="Assistant Commandant / Welfare Officer",
            battalion_id="Central Welfare Cell, Sector HQ",
            company="Medical & Welfare Wing",
            personnel_id=None,
        ),
        User(
            username="doctor_demo",
            password_hash=get_password_hash("Password@123"),
            role="doctor",
            full_name="Dr. Maninderjit Singh (Chief Medical Officer)",
            force="CRPF",
            rank="Chief Medical Officer (CMO)",
            battalion_id="CAPF Composite Hospital, Sector HQ",
            company="Medical & Diagnostics Wing",
            personnel_id=None,
        ),
        User(
            username="command_demo",
            password_hash=get_password_hash("Password@123"),
            role="command",
            full_name="Commandant Arvind Joshi",
            force="CRPF",
            rank="Commandant / Sector Leadership",
            battalion_id="14th Battalion Command",
            company="Battalion HQ",
            personnel_id=None,
        ),
        User(
            username="admin_demo",
            password_hash=get_password_hash("Password@123"),
            role="admin",
            full_name="Smt. Meenakshi Sundaram (MHA IT & Audit Administrator)",
            force="MHA",
            rank="Director (Personnel Systems)",
            battalion_id="MHA Directorate General",
            company="System Audit Cell",
            personnel_id=None,
        )
    ]
    for u in demo_users:
        db.add(u)
    db.commit()

    # Ingest synthetic dataset
    csv_path = DATASET_PATH
    if not os.path.exists(csv_path):
        alt = os.path.join(os.path.dirname(__file__), "..", "sih26186_synthetic_dataset.csv")
        if os.path.exists(alt):
            csv_path = alt

    if not os.path.exists(csv_path):
        print(f"[Seed] ERROR: Dataset not found at {csv_path}")
        db.close()
        return

    print(f"[Seed] Ingesting synthetic personnel records from {csv_path}...")
    df = pd.read_csv(csv_path)

    # Import model service for computing SHAP plain-reasons
    from model_service import model_service

    profiles_to_add = []
    cases_to_add = []
    flagged_count = 0

    for idx, row in df.iterrows():
        pid = str(row["personnel_id"])
        full_name = generate_full_name(idx)
        
        # Ensure our demo personnel PID100042 is explicitly flagged for demonstration
        if pid == "PID100042":
            full_name = "Ct. Rajesh Kumar Singh"
            row["baseline_deviation_composite"] = 2.45
            row["sick_reports_last_90d"] = 6
            row["sick_reports_personal_baseline_90d"] = 1
            row["sick_reports_deviation"] = 5
            row["nco_observation_current"] = 4
            row["nco_observation_baseline"] = 2
            row["nco_observation_deviation"] = 2
            row["fatigue_index"] = 78.5
            row["posting_category"] = "counter_naxal_lwe"
            row["posting_duration_months"] = 19.5
            row["leave_utilization_ratio"] = 0.22
            row["family_status"] = "separated_hardship_posting"
            row["saathi_sessions_last_90d"] = 6
            row["saathi_sessions_personal_baseline_90d"] = 2
            row["saathi_engagement_deviation"] = 4
            row["saathi_tough_rate_current"] = 0.833
            row["saathi_tough_deviation"] = 0.633
            row["saathi_safety_net_triggers_90d"] = 1

        if pid == "PID100100":
            full_name = "Ct. Sandeep Verma"
            row["saathi_sessions_last_90d"] = 2
            row["saathi_sessions_personal_baseline_90d"] = 2
            row["saathi_engagement_deviation"] = 0
            row["saathi_tough_rate_current"] = 0.0
            row["saathi_tough_deviation"] = -0.20
            row["saathi_safety_net_triggers_90d"] = 0

        # Predict probability and plain reasons
        prob, is_flagged, plain_reasons = model_service.predict(row.to_dict())

        if pid == "PID100042":
            is_flagged = True
            prob = 0.88

        # Subunit assignment
        rng = random.Random(idx)
        coy = rng.choice(COMPANIES)
        bat = rng.choice(BATTALIONS)

        # Force our demo user to Company-C so nco_demo sees them in section muster!
        if pid == "PID100042" or idx < 8:
            coy = "Company-C (Delta Platoon)"
            bat = "14th Battalion (Dantewada)"

        fam_struct = str(row.get("family_structure", "nuclear" if (idx % 2 == 0) else "joint"))
        if pid == "PID100042":
            fam_struct = "nuclear"
            row["family_structure"] = "nuclear"
            row["family_separation_load"] = 2.6
        elif pid == "PID100100":
            fam_struct = "joint"
            row["family_structure"] = "joint"
            row["family_separation_load"] = 0.0

        profile = PersonnelProfile(
            personnel_id=pid,
            name=full_name,
            force=str(row.get("force", "CRPF")),
            rank_tier=str(row.get("rank_tier", "Constable/GD")),
            company=coy,
            battalion=bat,
            tenure_years=float(row.get("tenure_years", 5.0)),
            married=bool(row.get("married", False)),
            family_structure=fam_struct,
            family_status=str(row.get("family_status", "with_family")),
            family_separation_load=float(row.get("family_separation_load", 0.0)),
            posting_category=str(row.get("posting_category", "peace_training_static")),
            posting_duration_months=float(row.get("posting_duration_months", 6.0)),
            leave_entitled_annual=int(row.get("leave_entitled_annual", 30)),
            leave_availed_last_12m=float(row.get("leave_availed_last_12m", 15.0)),
            leave_utilization_ratio=float(row.get("leave_utilization_ratio", 0.5)),
            avg_weekly_duty_hours_last_90d=float(row.get("avg_weekly_duty_hours_last_90d", 45.0)),
            night_duty_fraction_last_90d=float(row.get("night_duty_fraction_last_90d", 0.15)),
            rest_day_compliance_pct_last_90d=float(row.get("rest_day_compliance_pct_last_90d", 95.0)),
            fatigue_index=float(row.get("fatigue_index", 25.0)),
            sick_reports_last_90d=float(row.get("sick_reports_last_90d", 1.0)),
            sick_reports_personal_baseline_90d=float(row.get("sick_reports_personal_baseline_90d", 1.0)),
            sick_reports_deviation=float(row.get("sick_reports_deviation", 0.0)),
            nco_observation_current=float(row.get("nco_observation_current", 2.0)),
            nco_observation_baseline=float(row.get("nco_observation_baseline", 2.0)),
            nco_observation_deviation=float(row.get("nco_observation_deviation", 0.0)),
            transfer_count_last_24m=int(row.get("transfer_count_last_24m", 0)),
            saathi_sessions_last_90d=float(row.get("saathi_sessions_last_90d", 2.0)),
            saathi_sessions_personal_baseline_90d=float(row.get("saathi_sessions_personal_baseline_90d", 2.0)),
            saathi_engagement_deviation=float(row.get("saathi_engagement_deviation", 0.0)),
            saathi_tough_rate_current=float(row.get("saathi_tough_rate_current", 0.20)),
            saathi_tough_deviation=float(row.get("saathi_tough_deviation", 0.0)),
            saathi_safety_net_triggers_90d=int(row.get("saathi_safety_net_triggers_90d", 0)),
            training_hours_last_12m=float(row.get("training_hours_last_12m", 40.0)),
            baseline_deviation_composite=float(row.get("baseline_deviation_composite", 0.0)),
            welfare_review_recommended=is_flagged,
            review_likelihood=prob,
            plain_reasons_json=json.dumps(plain_reasons),
            last_evaluated_at=datetime.utcnow() - timedelta(days=random.randint(0, 14))
        )
        profiles_to_add.append(profile)

        if is_flagged or pid in ["PID100042", "PID100100"]:
            flagged_count += 1
            case = CaseRecord(
                personnel_id=pid,
                flagged_date=datetime.utcnow() - timedelta(days=random.randint(1, 20)),
                likelihood=prob if pid != "PID100100" else 0.12,
                plain_reasons_json=json.dumps(plain_reasons),
                status="Open" if pid != "PID100100" else "Baseline Monitored",
                officer_action=None,
                outcome=None,
                notes=None
            )
            cases_to_add.append(case)

    db.bulk_save_objects(profiles_to_add)
    db.commit()

    db.bulk_save_objects(cases_to_add)
    db.commit()

    print(f"[Seed] Added {len(profiles_to_add)} personnel profiles ({flagged_count} flagged cases).")

    # Add realistic initial audit logs
    audit_entries = [
        AuditLog(
            username="admin_demo",
            user_role="admin",
            action="SYSTEM_INIT",
            details="SETU CRPF personnel welfare monitoring system initialised (Police-II Division, MHA). Baseline models and CRPF synthetic dataset loaded.",
            timestamp=datetime.utcnow() - timedelta(days=5),
            ip_address="10.14.2.1"
        ),
        AuditLog(
            username="admin_demo",
            user_role="admin",
            action="ACCESS_AUDIT_VERIFIED",
            details="Periodic security log verification completed. Zero unauthorized command role escalations detected.",
            timestamp=datetime.utcnow() - timedelta(days=2),
            ip_address="10.14.2.1"
        ),
        AuditLog(
            username="welfare_demo",
            user_role="welfare_officer",
            action="VIEW_FLAGGED_CASE",
            target_personnel_id="PID100042",
            details="Welfare officer accessed case file following baseline deviation triage prompt.",
            timestamp=datetime.utcnow() - timedelta(hours=3),
            ip_address="10.14.2.8"
        )
    ]
    for a in audit_entries:
        db.add(a)

    # Add a sample anonymous peer flag
    peer_flag = PeerFlag(
        target_personnel_id="PID100042",
        observation_text="Seems uncharacteristically quiet during evening roll-call, skipping meals after long guard duties.",
        submitted_at=datetime.utcnow() - timedelta(days=2),
        status="New"
    )
    db.add(peer_flag)

    db.commit()
    db.close()
    print("[Seed] Seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
