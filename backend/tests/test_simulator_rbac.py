import sys
import os
import unittest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database import SessionLocal
from models import User, PersonnelProfile

class TestSimulatorRBACAndSandboxIsolation(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()

        # 1. Personnel login
        res_p = self.client.post("/api/auth/login", json={
            "username": "personnel_demo",
            "password": "Password@123"
        })
        self.assertEqual(res_p.status_code, 200)
        self.p_headers = {"Authorization": f"Bearer {res_p.json()['access_token']}"}

        # 2. Welfare Officer login
        res_w = self.client.post("/api/auth/login", json={
            "username": "welfare_demo",
            "password": "Password@123"
        })
        self.assertEqual(res_w.status_code, 200)
        self.w_headers = {"Authorization": f"Bearer {res_w.json()['access_token']}"}

        # 3. Commander login
        res_c = self.client.post("/api/auth/login", json={
            "username": "command_demo",
            "password": "Password@123"
        })
        self.assertEqual(res_c.status_code, 200)
        self.c_headers = {"Authorization": f"Bearer {res_c.json()['access_token']}"}

        # 4. Admin / Evaluator login
        res_a = self.client.post("/api/auth/login", json={
            "username": "admin_demo",
            "password": "Password@123"
        })
        self.assertEqual(res_a.status_code, 200)
        self.a_headers = {"Authorization": f"Bearer {res_a.json()['access_token']}"}

    def tearDown(self):
        self.db.close()

    def test_unauthorized_roles_rejected_from_presets(self):
        """Verify Personnel, Welfare, Command get 403 Forbidden on simulator presets."""
        for name, headers in [("Personnel", self.p_headers), ("Welfare", self.w_headers), ("Commander", self.c_headers)]:
            res = self.client.get("/api/simulator/presets", headers=headers)
            self.assertEqual(res.status_code, 403, f"{name} should be rejected with 403 Forbidden")

    def test_unauthorized_roles_rejected_from_shift_simulation(self):
        """Verify Personnel, Welfare, Command get 403 Forbidden on simulate-shift."""
        payload = {
            "workload_delta_pct": 20.0,
            "rest_day_compliance_pct": 70.0,
            "night_duty_fraction": 0.35,
            "leave_delay_days": 20,
            "cohort_size": 500
        }
        for name, headers in [("Personnel", self.p_headers), ("Welfare", self.w_headers), ("Commander", self.c_headers)]:
            res = self.client.post("/api/simulator/simulate-shift", json=payload, headers=headers)
            self.assertEqual(res.status_code, 403, f"{name} should be rejected with 403 Forbidden")

    def test_unauthorized_roles_rejected_from_cohort_generation(self):
        """Verify Personnel, Welfare, Command get 403 Forbidden on generate-cohort."""
        payload = {
            "scenario_preset": "extended_deployment_night_shift",
            "cohort_size": 250
        }
        for name, headers in [("Personnel", self.p_headers), ("Welfare", self.w_headers), ("Commander", self.c_headers)]:
            res = self.client.post("/api/simulator/generate-cohort", json=payload, headers=headers)
            self.assertEqual(res.status_code, 403, f"{name} should be rejected with 403 Forbidden")

    def test_admin_evaluator_can_generate_and_simulate(self):
        """Verify Admin/Evaluator can access presets, simulate shifts, and generate cohorts."""
        # 1. Presets
        res_presets = self.client.get("/api/simulator/presets", headers=self.a_headers)
        self.assertEqual(res_presets.status_code, 200)
        self.assertIn("presets", res_presets.json())

        # 2. Simulate Shift
        sim_payload = {
            "workload_delta_pct": 20.0,
            "rest_day_compliance_pct": 68.0,
            "night_duty_fraction": 0.35,
            "leave_delay_days": 24,
            "cohort_size": 500
        }
        res_sim = self.client.post("/api/simulator/simulate-shift", json=sim_payload, headers=self.a_headers)
        self.assertEqual(res_sim.status_code, 200)
        data_sim = res_sim.json()
        self.assertIn("baseline_summary", data_sim)
        self.assertIn("simulated_summary", data_sim)
        self.assertIn("risk_delta_pct", data_sim["simulated_summary"])

        # 3. Generate Cohort
        gen_payload = {
            "scenario_preset": "extended_deployment_night_shift",
            "cohort_size": 250,
            "workload_delta_pct": 28.0,
            "night_duty_fraction": 0.38,
            "rest_day_compliance_pct": 68.0,
            "leave_delay_days": 24,
            "saathi_tough_rate": 0.42
        }
        res_gen = self.client.post("/api/simulator/generate-cohort", json=gen_payload, headers=self.a_headers)
        self.assertEqual(res_gen.status_code, 200)
        data_gen = res_gen.json()
        self.assertEqual(data_gen["cohort_size"], 250)
        self.assertTrue(data_gen["csv_download_ready"])
        # Check simulation banner in CSV
        self.assertIn("# SIMULATION DATA — NOT REAL PERSONNEL DATA", data_gen["csv_payload"])

    def test_synthetic_cohort_does_not_contaminate_real_database(self):
        """Verify generating synthetic cohorts does not insert synthetic records into real personnel profiles."""
        count_before = self.db.query(PersonnelProfile).count()
        gen_payload = {
            "scenario_preset": "extended_deployment_night_shift",
            "cohort_size": 500
        }
        self.client.post("/api/simulator/generate-cohort", json=gen_payload, headers=self.a_headers)
        count_after = self.db.query(PersonnelProfile).count()
        self.assertEqual(count_before, count_after, "Operational personnel database must remain unchanged by simulation")

if __name__ == "__main__":
    unittest.main()
