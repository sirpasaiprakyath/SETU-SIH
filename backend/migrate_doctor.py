import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal
from models import Base, User, PersonnelProfile, MedicalCampRecord
from auth import get_password_hash
from datetime import datetime, timezone, timedelta

print("[1/5] Creating database tables if missing...")
Base.metadata.create_all(bind=engine)

print("[2/5] Adding columns to personnel_profiles...")
conn = engine.raw_connection()
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(personnel_profiles)")
cols = [row[1] for row in cursor.fetchall()]

if "months_to_retirement" not in cols:
    cursor.execute("ALTER TABLE personnel_profiles ADD COLUMN months_to_retirement FLOAT DEFAULT 72.0")
if "resettlement_training_enrolled" not in cols:
    cursor.execute("ALTER TABLE personnel_profiles ADD COLUMN resettlement_training_enrolled BOOLEAN DEFAULT 0")
if "resettlement_course_name" not in cols:
    cursor.execute("ALTER TABLE personnel_profiles ADD COLUMN resettlement_course_name VARCHAR(150)")
if "resettlement_status" not in cols:
    cursor.execute("ALTER TABLE personnel_profiles ADD COLUMN resettlement_status VARCHAR(50) DEFAULT 'Not Enrolled'")
conn.commit()
conn.close()

db = SessionLocal()

print("[3/5] Seeding doctor_demo user account...")
doctor = db.query(User).filter(User.username == "doctor_demo").first()
if not doctor:
    doctor = User(
        username="doctor_demo",
        password_hash=get_password_hash("Password@123"),
        role="doctor",
        full_name="Dr. Maninderjit Singh (Chief Medical Officer)",
        force="CRPF",
        rank="Chief Medical Officer (CMO)",
        battalion_id="CAPF Composite Hospital, Sector HQ",
        company="Medical & Diagnostics Wing"
    )
    db.add(doctor)
    db.commit()
    print(" -> doctor_demo created.")
else:
    doctor.role = "doctor"
    doctor.full_name = "Dr. Maninderjit Singh (Chief Medical Officer)"
    db.commit()
    print(" -> doctor_demo updated.")

print("[4/5] Updating retirement fields for demo personnel...")
p1 = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == "PID100042").first()
if p1:
    p1.months_to_retirement = 18.0 # < 24 months -> Shows "Life After Service" panel
    p1.resettlement_training_enrolled = True
    p1.resettlement_course_name = "DG Resettlement - Advanced Logistics & Supply Chain Operations (Phase 2)"
    p1.resettlement_status = "Enrolled & In Training"

p2 = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == "PID100100").first()
if p2:
    p2.months_to_retirement = 96.0 # 8 years away -> Panel remains hidden
    p2.resettlement_training_enrolled = False
    p2.resettlement_status = "Not Applicable"

db.commit()

print("[5/5] Seeding historical medical camp vitals...")
db.query(MedicalCampRecord).filter(MedicalCampRecord.personnel_id == "PID100042").delete()
records_p1 = [
    MedicalCampRecord(
        personnel_id="PID100042",
        camp_date=datetime.now(timezone.utc) - timedelta(days=90),
        doctor_username="doctor_demo",
        doctor_name="Dr. Maninderjit Singh",
        systolic_bp=122.0,
        diastolic_bp=80.0,
        weight_kg=76.0,
        blood_sugar_mg_dl=98.0,
        clinical_notes="Routine quarterly camp check. Vitals steady within normal parameters.",
        baseline_systolic_bp=120.0,
        baseline_diastolic_bp=80.0,
        baseline_weight_kg=76.5,
        baseline_blood_sugar=95.0,
        systolic_drift=2.0,
        diastolic_drift=0.0,
        weight_drift=-0.5,
        blood_sugar_drift=3.0,
        clinical_flag=False,
        clinical_drift_summary="Normal baseline readings."
    ),
    MedicalCampRecord(
        personnel_id="PID100042",
        camp_date=datetime.now(timezone.utc) - timedelta(days=60),
        doctor_username="doctor_demo",
        doctor_name="Dr. Maninderjit Singh",
        systolic_bp=132.0,
        diastolic_bp=86.0,
        weight_kg=73.5,
        blood_sugar_mg_dl=108.0,
        clinical_notes="Noticeable elevation in systolic pressure post night patrol deployment. Advised hydration.",
        baseline_systolic_bp=121.0,
        baseline_diastolic_bp=80.0,
        baseline_weight_kg=76.2,
        baseline_blood_sugar=96.5,
        systolic_drift=11.0,
        diastolic_drift=6.0,
        weight_drift=-2.7,
        blood_sugar_drift=11.5,
        clinical_flag=True,
        clinical_drift_summary="Moderate upward drift in systolic BP (+11 mmHg) and minor weight loss."
    ),
    MedicalCampRecord(
        personnel_id="PID100042",
        camp_date=datetime.now(timezone.utc) - timedelta(days=28),
        doctor_username="doctor_demo",
        doctor_name="Dr. Maninderjit Singh",
        systolic_bp=138.0,
        diastolic_bp=88.0,
        weight_kg=71.8,
        blood_sugar_mg_dl=114.0,
        clinical_notes="Persistent upward systolic drift and 4.4kg total weight drop. Follow-up camp scheduled.",
        baseline_systolic_bp=121.0,
        baseline_diastolic_bp=80.0,
        baseline_weight_kg=76.2,
        baseline_blood_sugar=96.5,
        systolic_drift=17.0,
        diastolic_drift=8.0,
        weight_drift=-4.4,
        blood_sugar_drift=17.5,
        clinical_flag=True,
        clinical_drift_summary="Significant sustained upward systolic drift (+17 mmHg) and notable weight drop (-4.4 kg)."
    )
]
for r in records_p1:
    db.add(r)

db.query(MedicalCampRecord).filter(MedicalCampRecord.personnel_id == "PID100100").delete()
records_p2 = [
    MedicalCampRecord(
        personnel_id="PID100100",
        camp_date=datetime.now(timezone.utc) - timedelta(days=62),
        doctor_username="doctor_demo",
        doctor_name="Dr. Maninderjit Singh",
        systolic_bp=118.0,
        diastolic_bp=78.0,
        weight_kg=70.0,
        blood_sugar_mg_dl=92.0,
        clinical_notes="Monthly camp vitals optimal. Normal physical conditioning.",
        baseline_systolic_bp=118.0,
        baseline_diastolic_bp=78.0,
        baseline_weight_kg=70.0,
        baseline_blood_sugar=92.0,
        systolic_drift=0.0,
        diastolic_drift=0.0,
        weight_drift=0.0,
        blood_sugar_drift=0.0,
        clinical_flag=False,
        clinical_drift_summary="Readings match longitudinal personal baseline."
    ),
    MedicalCampRecord(
        personnel_id="PID100100",
        camp_date=datetime.now(timezone.utc) - timedelta(days=32),
        doctor_username="doctor_demo",
        doctor_name="Dr. Maninderjit Singh",
        systolic_bp=120.0,
        diastolic_bp=79.0,
        weight_kg=70.2,
        blood_sugar_mg_dl=94.0,
        clinical_notes="Routine camp check. All parameters stable.",
        baseline_systolic_bp=118.0,
        baseline_diastolic_bp=78.0,
        baseline_weight_kg=70.0,
        baseline_blood_sugar=92.0,
        systolic_drift=2.0,
        diastolic_drift=1.0,
        weight_drift=0.2,
        blood_sugar_drift=2.0,
        clinical_flag=False,
        clinical_drift_summary="Stable trailing baseline."
    )
]
for r in records_p2:
    db.add(r)

# Overdue personnel records (> 35 days ago)
overdue_pids = ["PID100010", "PID100015", "PID100020"]
for opid in overdue_pids:
    p = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == opid).first()
    if p:
        db.query(MedicalCampRecord).filter(MedicalCampRecord.personnel_id == opid).delete()
        r = MedicalCampRecord(
            personnel_id=opid,
            camp_date=datetime.now(timezone.utc) - timedelta(days=48),
            doctor_username="doctor_demo",
            doctor_name="Dr. Maninderjit Singh",
            systolic_bp=122.0,
            diastolic_bp=82.0,
            weight_kg=73.0,
            blood_sugar_mg_dl=104.0,
            clinical_notes="Last tested 48 days ago. Overdue for monthly camp cycle.",
            baseline_systolic_bp=120.0,
            baseline_diastolic_bp=80.0,
            baseline_weight_kg=73.0,
            baseline_blood_sugar=102.0,
            systolic_drift=2.0,
            diastolic_drift=2.0,
            weight_drift=0.0,
            blood_sugar_drift=2.0,
            clinical_flag=False,
            clinical_drift_summary="Stable baseline readings."
        )
        db.add(r)

db.commit()
print("Migration completed successfully!")
db.close()
