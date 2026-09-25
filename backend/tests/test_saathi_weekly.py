import sys
import os
import unittest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database import SessionLocal
from models import User, PersonnelProfile, SaathiSubmission
from routes.personnel_routes import get_weekly_cycle_info

class TestSaathiWeeklyCycle(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()

        # Login as personnel demo user
        res = self.client.post("/api/auth/login", json={
            "username": "personnel_demo",
            "password": "Password@123"
        })
        self.assertEqual(res.status_code, 200)
        self.token = res.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self):
        self.db.close()

    def test_weekly_cycle_boundaries(self):
        context_res = self.client.get("/api/personnel/saathi/context", headers=self.headers)
        self.assertEqual(context_res.status_code, 200)
        data = context_res.json()
        self.assertIn("weekly_cycle", data)
        wc = data["weekly_cycle"]
        self.assertIn("current_week_sunday", wc)
        self.assertIn("next_week_sunday", wc)
        self.assertIn("next_week_start", wc)
        self.assertIn("can_checkin_this_week", wc)

    def test_weekly_checkin_once_per_week_enforcement(self):
        # 1. Reset current week check-in
        reset_res = self.client.post("/api/personnel/saathi/reset-weekly-demo", headers=self.headers)
        self.assertEqual(reset_res.status_code, 200)

        # 2. Check context shows open
        c_res = self.client.get("/api/personnel/saathi/context", headers=self.headers)
        self.assertTrue(c_res.json()["weekly_cycle"]["can_checkin_this_week"])

        # 3. Submit a check-in
        payload = {
            "duty_category": "border_outpost",
            "answers": [
                {"step": 1, "topic": "opener", "selected_text": "Good", "score_key": "sleep_score", "score_val": 4.5}
            ],
            "scores": {"sleep_score": 4.5},
            "requested_welfare_outreach": False
        }
        submit_res = self.client.post("/api/personnel/saathi/submit", json=payload, headers=self.headers)
        self.assertEqual(submit_res.status_code, 200)
        res_json = submit_res.json()
        self.assertEqual(res_json["status"], "success")
        self.assertIn("weekly_cycle", res_json)
        self.assertFalse(res_json["weekly_cycle"]["can_checkin_this_week"])
        self.assertTrue(res_json["weekly_cycle"]["completed_this_week"])

        # 4. Duplicate submission within the same week MUST fail with 400
        duplicate_res = self.client.post("/api/personnel/saathi/submit", json=payload, headers=self.headers)
        self.assertEqual(duplicate_res.status_code, 400)
        self.assertIn("Weekly check-in already completed", duplicate_res.json()["detail"])

        # 5. Clean up for subsequent runs
        self.client.post("/api/personnel/saathi/reset-weekly-demo", headers=self.headers)

if __name__ == "__main__":
    unittest.main()
