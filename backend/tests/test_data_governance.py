import os
import sys
import unittest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from database import SessionLocal
from models import User, PersonnelProfile, CaseRecord, AuditLog, VocalStrainRecord, SaathiSubmission
from auth import create_access_token

client = TestClient(app)

class TestDataGovernanceRBAC(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()
        
        # Ensure PID100042 is referred and PID100100 is sub-threshold baseline
        c_42 = cls.db.query(CaseRecord).filter(CaseRecord.personnel_id == "PID100042").first()
        if not c_42:
            c_42 = CaseRecord(
                personnel_id="PID100042",
                flagged_date=datetime.utcnow() - timedelta(days=2),
                likelihood=0.74,
                plain_reasons_json='["Vocal strain score 72", "High fatigue"]',
                status="Open",
                outcome="escalated_to_counselling",
                officer_action="Referred to Medical Officer for clinical fatigue evaluation"
            )
            cls.db.add(c_42)
        else:
            c_42.outcome = "escalated_to_counselling"
            c_42.officer_action = "Referred to Medical Officer for clinical fatigue evaluation"
            c_42.likelihood = 0.74
            
        c_100 = cls.db.query(CaseRecord).filter(CaseRecord.personnel_id == "PID100100").first()
        if not c_100:
            c_100 = CaseRecord(
                personnel_id="PID100100",
                flagged_date=datetime.utcnow() - timedelta(days=5),
                likelihood=0.18,
                plain_reasons_json='["Baseline nominal check-in"]',
                status="Baseline Monitored",
                outcome=None,
                officer_action=None
            )
            cls.db.add(c_100)
        else:
            c_100.likelihood = 0.18
            c_100.outcome = None
            c_100.officer_action = None
            
        cls.db.commit()
        cls.subthreshold_case_id = c_100.id
        cls.referred_case_id = c_42.id

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_commander_forbidden_from_individual_welfare_and_doctor_routes(self):
        """Task 2: Verify Command role is strictly aggregate-only and receives 403 on individual records."""
        command_token = create_access_token({"sub": "command_demo", "role": "command"})
        headers = {"Authorization": f"Bearer {command_token}"}

        # Welfare queue access forbidden
        resp_queue = client.get("/api/welfare/queue", headers=headers)
        self.assertEqual(resp_queue.status_code, 403, "Command role must NOT access Welfare Queue")

        # Specific individual case detail forbidden
        resp_case = client.get(f"/api/welfare/case/{self.referred_case_id}", headers=headers)
        self.assertEqual(resp_case.status_code, 403, "Command role must NOT access individual case records")

        # Doctor clinical worklist forbidden
        resp_doc = client.get("/api/doctor/worklist", headers=headers)
        self.assertEqual(resp_doc.status_code, 403, "Command role must NOT access Doctor Worklist")

        # Individual patient medical history forbidden
        resp_patient = client.get("/api/doctor/patient/PID100042", headers=headers)
        self.assertEqual(resp_patient.status_code, 403, "Command role must NOT access Patient Medical History")
        print("\n[RBAC Test 1 PASS] Command role strictly forbidden (HTTP 403) from all individual welfare/doctor routes.")

    def test_02_doctor_worklist_scoped_only_to_referred_cases(self):
        """Task 2: Verify Doctor worklist returns only referred patients, not the full roster."""
        doctor_token = create_access_token({"sub": "doctor_demo", "role": "doctor"})
        headers = {"Authorization": f"Bearer {doctor_token}"}

        resp = client.get("/api/doctor/worklist", headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        worklist = data.get("worklist", [])

        pids = [item["personnel_id"] for item in worklist]
        self.assertIn("PID100042", pids, "Referred patient PID100042 must be in doctor worklist")
        self.assertNotIn("PID100100", pids, "Unreferred patient PID100100 must NOT be in doctor worklist")
        print(f"[RBAC Test 2 PASS] Doctor worklist contains {len(worklist)} referred patient(s); unreferred personnel excluded.")

    def test_03_doctor_forbidden_from_unreferred_patient_medical_history(self):
        """Task 2: Verify Doctor gets HTTP 403 when requesting an unreferred personnel's medical history."""
        doctor_token = create_access_token({"sub": "doctor_demo", "role": "doctor"})
        headers = {"Authorization": f"Bearer {doctor_token}"}

        # Attempt to access unreferred patient PID100100
        resp_unreferred = client.get("/api/doctor/patient/PID100100", headers=headers)
        self.assertEqual(resp_unreferred.status_code, 403, "Doctor must receive 403 on unreferred patient")
        self.assertIn("has not been referred", resp_unreferred.json()["detail"])

        # Accessing referred patient PID100042 succeeds with 200
        resp_referred = client.get("/api/doctor/patient/PID100042", headers=headers)
        self.assertEqual(resp_referred.status_code, 200, "Doctor must receive 200 on referred patient")
        print("[RBAC Test 3 PASS] Doctor gets 403 on unreferred patient; 200 on referred patient.")

    def test_04_welfare_officer_queue_enforces_triage_threshold(self):
        """Task 2: Verify Welfare Officer only sees named cases crossing triage threshold (>= 0.48)."""
        welfare_token = create_access_token({"sub": "welfare_demo", "role": "welfare_officer"})
        headers = {"Authorization": f"Bearer {welfare_token}"}

        resp = client.get("/api/welfare/queue", headers=headers)
        self.assertEqual(resp.status_code, 200)
        queue = resp.json().get("queue", [])

        for case in queue:
            likelihood = case.get("welfare_checkin_likelihood", 0.0)
            self.assertGreaterEqual(
                likelihood, 0.48,
                f"Case {case.get('case_id')} has likelihood {likelihood} < 0.48 triage threshold!"
            )
            self.assertNotEqual(case.get("personnel_id"), "PID100100", "Baseline PID100100 must not be in triage queue")
        print(f"[RBAC Test 4 PASS] Welfare queue ({len(queue)} cases) strictly enforces triage threshold >= 0.48.")

    def test_05_welfare_officer_cannot_view_subthreshold_case_detail(self):
        """Task 2: Verify Welfare Officer receives 403 when requesting case detail below triage threshold."""
        welfare_token = create_access_token({"sub": "welfare_demo", "role": "welfare_officer"})
        headers = {"Authorization": f"Bearer {welfare_token}"}

        resp = client.get(f"/api/welfare/case/{self.subthreshold_case_id}", headers=headers)
        self.assertEqual(resp.status_code, 403, "Welfare Officer must receive 403 for sub-threshold case detail")
        self.assertIn("triage/escalation threshold", resp.json()["detail"])
        print("[RBAC Test 5 PASS] Welfare Officer receives 403 when requesting sub-threshold case detail.")

    def test_06_nco_submit_only_cannot_access_welfare_or_doctor_queues(self):
        """Task 2: Verify NCO role cannot view composite scores, doctor worklists, or welfare queues."""
        nco_token = create_access_token({"sub": "nco_demo", "role": "nco"})
        headers = {"Authorization": f"Bearer {nco_token}"}

        resp_welfare = client.get("/api/welfare/queue", headers=headers)
        self.assertEqual(resp_welfare.status_code, 403)

        resp_doc = client.get("/api/doctor/worklist", headers=headers)
        self.assertEqual(resp_doc.status_code, 403)

        resp_admin = client.get("/api/admin/audit-logs", headers=headers)
        self.assertEqual(resp_admin.status_code, 403)
        print("[RBAC Test 6 PASS] NCO submit-only role cannot access welfare, doctor, or audit endpoints.")

    def test_07_audit_log_access_strictly_restricted_to_admin(self):
        """Task 3: Verify AuditLog inspection is restricted strictly to admin."""
        users_to_test = [
            ("command_demo", "command"),
            ("welfare_demo", "welfare_officer"),
            ("doctor_demo", "doctor"),
            ("nco_demo", "nco"),
            ("personnel_demo", "personnel")
        ]
        for username, role in users_to_test:
            token = create_access_token({"sub": username, "role": role})
            headers = {"Authorization": f"Bearer {token}"}
            resp = client.get("/api/admin/audit-logs", headers=headers)
            self.assertEqual(resp.status_code, 403, f"Role {role} must NOT be allowed to view Audit Logs")

        admin_token = create_access_token({"sub": "admin_demo", "role": "admin"})
        headers = {"Authorization": f"Bearer {admin_token}"}
        resp_admin = client.get("/api/admin/audit-logs", headers=headers)
        self.assertEqual(resp_admin.status_code, 200, "Admin must be allowed to inspect Audit Logs")
        print("[RBAC Test 7 PASS] Audit log endpoint strictly restricted to admin role (403 for all other roles).")

    def test_08_sensitive_access_recorded_in_audit_ledger(self):
        """Task 3: Verify sensitive record view creates an immutable audit trail entry."""
        doctor_token = create_access_token({"sub": "doctor_demo", "role": "doctor"})
        doc_headers = {"Authorization": f"Bearer {doctor_token}"}
        client.get("/api/doctor/patient/PID100042", headers=doc_headers)

        admin_token = create_access_token({"sub": "admin_demo", "role": "admin"})
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        resp = client.get("/api/admin/audit-logs?limit=20", headers=admin_headers)
        self.assertEqual(resp.status_code, 200)
        logs = resp.json()
        self.assertIsInstance(logs, list)

        actions = [log.get("action") for log in logs]
        self.assertIn("VIEW_PATIENT_MEDICAL_HISTORY", actions, "Doctor access must be logged in audit trail")
        print("[RBAC Test 8 PASS] Sensitive patient record access successfully recorded in immutable AuditLog.")

    def test_09_automated_90_day_retention_purge_protocol(self):
        """Task 5: Verify automated retention purge deletes records older than 90 days."""
        # Insert expired mock records (> 95 days old)
        cutoff_date = datetime.utcnow() - timedelta(days=95)
        old_vocal = VocalStrainRecord(
            personnel_id="PID100042",
            jitter_pct=1.5,
            shimmer_pct=3.2,
            hnr_db=15.0,
            pitch_hz=140.0,
            strain_score=60.0,
            strain_tier="Elevated Fatigue",
            created_at=cutoff_date
        )
        old_saathi = SaathiSubmission(
            personnel_id="PID100042",
            posting_context="operational_lwe",
            duty_category="counter_insurgency",
            answers_json="{}",
            model_verification_score=0.75,
            strain_tier="Mild Strain",
            verification_summary="Automated test historical check-in",
            completed_at=cutoff_date
        )
        self.db.add(old_vocal)
        self.db.add(old_saathi)
        self.db.commit()

        # Non-admin cannot invoke purge
        welfare_token = create_access_token({"sub": "welfare_demo", "role": "welfare_officer"})
        resp_welfare = client.post("/api/admin/purge-retention-expired", headers={"Authorization": f"Bearer {welfare_token}"})
        self.assertEqual(resp_welfare.status_code, 403, "Non-admin cannot invoke retention purge")

        # Admin invokes purge
        admin_token = create_access_token({"sub": "admin_demo", "role": "admin"})
        resp_admin = client.post("/api/admin/purge-retention-expired", headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(resp_admin.status_code, 200)
        purge_res = resp_admin.json()
        self.assertEqual(purge_res.get("retention_days"), 90)
        self.assertGreaterEqual(purge_res.get("deleted_vocal_records", 0), 1)
        self.assertGreaterEqual(purge_res.get("deleted_saathi_submissions", 0), 1)
        print(f"[RBAC Test 9 PASS] 90-day retention purge executed: {purge_res['deleted_vocal_records']} vocal & {purge_res['deleted_saathi_submissions']} saathi records purged.")

if __name__ == "__main__":
    unittest.main()
