import sys
import os
import unittest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database import SessionLocal
from models import User, PersonnelProfile, CaseRecord

class TestSaathiRiskModelWiring(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()

        # Login as personnel demo user
        res = self.client.post("/api/auth/login", json={
            "username": "personnel_demo",
            "password": "Password@123"
        })
        self.assertEqual(res.status_code, 200)
        self.personnel_token = res.json()["access_token"]
        self.personnel_headers = {"Authorization": f"Bearer {self.personnel_token}"}

        # Login as welfare demo user
        res_welfare = self.client.post("/api/auth/login", json={
            "username": "welfare_demo",
            "password": "Password@123"
        })
        self.assertEqual(res_welfare.status_code, 200)
        self.welfare_token = res_welfare.json()["access_token"]
        self.welfare_headers = {"Authorization": f"Bearer {self.welfare_token}"}

        # Reset demo weekly state before each test
        self.client.post("/api/personnel/saathi/reset-weekly-demo", headers=self.personnel_headers)

    def tearDown(self):
        self.client.post("/api/personnel/saathi/reset-weekly-demo", headers=self.personnel_headers)
        self.db.close()

    def test_saathi_good_submission_wiring(self):
        """Test 'Good' check-in: verifies dynamic evaluation and stable risk probability."""
        payload = {
            "duty_category": "operational_lwe",
            "answers": [
                {"step": 1, "topic": "opener", "selected_text": "Good", "score_key": "sleep_score", "score_val": 4.5},
                {"step": 2, "topic": "domain", "selected_text": "Rest & Recovery"}
            ],
            "scores": {"sleep_score": 4.5},
            "requested_welfare_outreach": False
        }

        res = self.client.post("/api/personnel/saathi/submit", json=payload, headers=self.personnel_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("evaluation", data)
        eval_res = data["evaluation"]
        self.assertEqual(eval_res["selected_option"], "Good")
        self.assertEqual(eval_res["strain_tier"], "Optimal")
        self.assertIn("recommendations", eval_res)
        self.assertTrue(len(eval_res["recommendations"]) > 0)

        # Verify DB profile fields updated
        user = self.db.query(User).filter(User.username == "personnel_demo").first()
        profile = self.db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == user.personnel_id).first()
        self.assertIsNotNone(profile)
        self.assertGreaterEqual(profile.saathi_sessions_last_90d, 1.0)
        # For 'Good', tough deviation should remain <= 0.0
        self.assertLessEqual(profile.saathi_tough_deviation, 0.1)

    def test_saathi_tough_submission_wiring(self):
        """Test 'Tough' check-in: verifies elevated strain tier, deviation increment, and risk engine recalculation."""
        # Initial profile check
        user = self.db.query(User).filter(User.username == "personnel_demo").first()
        profile_before = self.db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == user.personnel_id).first()
        initial_tough_dev = profile_before.saathi_tough_deviation or 0.0

        payload = {
            "duty_category": "operational_lwe",
            "answers": [
                {"step": 1, "topic": "opener", "selected_text": "Tough", "score_key": "sleep_score", "score_val": 1.5},
                {"step": 2, "topic": "domain", "selected_text": "Sleep & Physical Fatigue"}
            ],
            "scores": {"sleep_score": 1.5},
            "requested_welfare_outreach": False
        }

        res = self.client.post("/api/personnel/saathi/submit", json=payload, headers=self.personnel_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        eval_res = data["evaluation"]
        self.assertEqual(eval_res["selected_option"], "Tough")
        self.assertEqual(eval_res["strain_tier"], "Elevated Strain")
        self.assertIn("Sleep & Physical Fatigue", eval_res["verification_summary"])

        # Check that DB baseline deviation and tough rate shifted upward
        self.db.expire_all()
        profile_after = self.db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == user.personnel_id).first()
        self.assertGreater(profile_after.saathi_tough_rate_current, 0.0)
        self.assertGreaterEqual(profile_after.saathi_tough_deviation, initial_tough_dev)

    def test_saathi_safety_net_escalation(self):
        """Test Safety Net activation: triggers safety net counter, sets high review likelihood, opens case record."""
        payload = {
            "duty_category": "operational_lwe",
            "answers": [
                {"step": 1, "topic": "opener", "selected_text": "Tough", "score_key": "sleep_score", "score_val": 1.0},
                {"step": 2, "topic": "crisis", "selected_text": "Feeling overwhelmed / crisis", "is_safety_net": True}
            ],
            "scores": {"sleep_score": 1.0},
            "requested_welfare_outreach": True
        }

        res = self.client.post("/api/personnel/saathi/submit", json=payload, headers=self.personnel_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        eval_res = data["evaluation"]
        self.assertEqual(eval_res["strain_tier"], "Safety Net Supported")

        # Verify DB reflects safety net trigger and case is open for Welfare Officer
        self.db.expire_all()
        user = self.db.query(User).filter(User.username == "personnel_demo").first()
        profile = self.db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == user.personnel_id).first()
        self.assertGreaterEqual(profile.saathi_safety_net_triggers_90d, 1)

        # Case record must exist and likelihood must be >= 0.80
        case = self.db.query(CaseRecord).filter(CaseRecord.personnel_id == user.personnel_id).first()
        self.assertIsNotNone(case, "CaseRecord should be opened on safety net escalation.")
        self.assertGreaterEqual(case.likelihood, 0.80)

        # Welfare officer queue must reflect this case
        queue_res = self.client.get("/api/welfare/queue", headers=self.welfare_headers)
        self.assertEqual(queue_res.status_code, 200)
        cases = queue_res.json()["queue"]
        pids = [c["personnel_id"] for c in cases]
        self.assertIn(user.personnel_id, pids)

if __name__ == "__main__":
    unittest.main()
