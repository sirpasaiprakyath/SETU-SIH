import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal
from models import Base, PersonnelProfile, CaseRecord
from model_service import model_service

print("[1/3] Adding family_structure and family_separation_load columns if missing...")
conn = engine.raw_connection()
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(personnel_profiles)")
cols = [row[1] for row in cursor.fetchall()]

if "family_structure" not in cols:
    cursor.execute("ALTER TABLE personnel_profiles ADD COLUMN family_structure VARCHAR(50) DEFAULT 'nuclear'")
    print(" -> Added family_structure column.")
if "family_separation_load" not in cols:
    cursor.execute("ALTER TABLE personnel_profiles ADD COLUMN family_separation_load FLOAT DEFAULT 0.0")
    print(" -> Added family_separation_load column.")

conn.commit()
conn.close()

db = SessionLocal()

print("[2/3] Updating demo personnel and calculating separation loads...")
# Update PID100042 (demo flagged personnel: married, nuclear family, separated in hardship sector)
p1 = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == "PID100042").first()
if p1:
    p1.married = True
    p1.family_structure = "nuclear"
    p1.family_status = "separated_hardship_posting"
    p1.posting_duration_months = 19.5
    # Formula: 19.5 * 1.6 / 12 = 2.6
    p1.family_separation_load = 2.6
    p1.welfare_review_recommended = True
    p1.review_likelihood = 0.88
    
    # Predict with new model service
    prob, flagged, reasons = model_service.predict(p1)
    
    # Ensure plain language family separation reason is present
    fam_reason = "Extended separation from family, nuclear household with no local support"
    if fam_reason not in reasons:
        reasons = [fam_reason] + [r for r in reasons if "separation" not in r.lower()][:2]
    
    p1.plain_reasons_json = json.dumps(reasons)
    print(f" -> PID100042 updated with load {p1.family_separation_load} and reasons: {reasons}")

    # Ensure CaseRecord exists and has the flag and reasons
    c1 = db.query(CaseRecord).filter(CaseRecord.personnel_id == "PID100042").first()
    if c1:
        c1.likelihood = 0.88
        c1.status = "Open"
        c1.trigger_reason = fam_reason

# Update PID100100 (demo unflagged personnel: joint family, with family)
p2 = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == "PID100100").first()
if p2:
    p2.married = True
    p2.family_structure = "joint"
    p2.family_status = "with_family"
    p2.family_separation_load = 0.0
    p2.welfare_review_recommended = False
    p2.review_likelihood = 0.12
    p2.plain_reasons_json = json.dumps(["Normal baseline metrics across 90-day window."])
    print(f" -> PID100100 updated (joint family, load 0.0)")

print("[3/3] Backfilling family separation load for remaining profiles...")
profiles = db.query(PersonnelProfile).all()
for p in profiles:
    if p.personnel_id in ["PID100042", "PID100100"]:
        continue
    
    if not p.family_structure or p.family_structure not in ["nuclear", "joint"]:
        # Assign alternating based on id hash for variety
        p.family_structure = "nuclear" if (hash(p.personnel_id) % 2 == 0) else "joint"
    
    is_sep = (p.family_status == "separated_hardship_posting") or (p.married and p.family_status != "with_family")
    if is_sep and p.married:
        mult = 1.6 if p.family_structure == "nuclear" else 1.0
        p.family_separation_load = round((p.posting_duration_months * mult) / 12.0, 3)
    else:
        p.family_separation_load = 0.0

    # If flagged and high family separation load, verify reason
    if p.welfare_review_recommended and p.family_separation_load >= 1.0:
        try:
            curr_reasons = json.loads(p.plain_reasons_json or "[]")
        except Exception:
            curr_reasons = []
        if p.family_structure == "nuclear":
            r_str = "Extended separation from family, nuclear household with no local support"
        else:
            r_str = f"Extended separation from family ({p.posting_duration_months:.0f} months), joint family domestic support strain"
        if not any("separation" in r.lower() for r in curr_reasons):
            curr_reasons.insert(0, r_str)
            p.plain_reasons_json = json.dumps(curr_reasons[:3])

db.commit()
db.close()
print("Migration completed successfully!")
