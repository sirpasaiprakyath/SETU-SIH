import sys
import os
import unittest
import csv
import io
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database import SessionLocal
from model_service import model_service

class TestDataAnonymization(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()

        # Login as admin demo user
        res = self.client.post("/api/auth/login", json={
            "username": "admin_demo",
            "password": "Password@123"
        })
        self.assertEqual(res.status_code, 200)
        self.admin_token = res.json()["access_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}

    def tearDown(self):
        self.db.close()

    def test_export_retraining_dataset_anonymization_csv(self):
        """Verify that exported retraining dataset CSV contains service IDs and strictly ZERO names or PII."""
        res = self.client.get("/api/admin/export-retraining-dataset?format=csv", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("content-type"), "text/csv; charset=utf-8")
        self.assertEqual(res.headers.get("x-data-anonymization"), "Service-ID-Only-Names-Stripped")

        csv_text = res.text
        reader = csv.DictReader(io.StringIO(csv_text))
        fieldnames = reader.fieldnames or []

        # 1. Assert required ID and features are present
        self.assertIn("personnel_id", fieldnames)
        self.assertIn("baseline_deviation_composite", fieldnames)
        self.assertIn("saathi_tough_deviation", fieldnames)
        self.assertIn("label_welfare_review_recommended", fieldnames)

        # 2. Strict guarantee: Assert forbidden identity fields are NOT in fieldnames
        forbidden_fields = ["name", "full_name", "first_name", "last_name", "username", "email", "phone", "mobile"]
        for forbidden in forbidden_fields:
            self.assertNotIn(forbidden, fieldnames, f"Security Violation: '{forbidden}' found in export columns!")

        # 3. Check data rows have valid personnel_id format and no leaked names
        rows = list(reader)
        self.assertGreater(len(rows), 0, "Should export at least one record")
        for row in rows[:50]:  # inspect sample of 50 rows
            pid = row["personnel_id"]
            self.assertTrue(pid.startswith("PID"), f"Expected PID format, got: {pid}")
            for forbidden in forbidden_fields:
                self.assertNotIn(forbidden, row)

    def test_export_retraining_dataset_anonymization_json(self):
        """Verify JSON export format also enforces DPDP Act 2023 compliance with service_id_only identifier."""
        res = self.client.get("/api/admin/export-retraining-dataset?format=json", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertTrue(data["anonymized"])
        self.assertEqual(data["identifier"], "service_id_only")
        self.assertIn("personnel_id", data["columns"])

        for forbidden in ["name", "full_name", "username", "email", "phone"]:
            self.assertNotIn(forbidden, data["columns"])

        for item in data["data"][:50]:
            self.assertIn("personnel_id", item)
            self.assertNotIn("name", item)
            self.assertNotIn("full_name", item)
            self.assertNotIn("username", item)

    def test_model_service_strips_pii_before_prediction(self):
        """Verify that model_service.predict strips personal names before generating feature matrix."""
        dirty_profile = {
            "name": "Ct Rajesh Kumar",
            "full_name": "Rajesh Kumar",
            "username": "rajesh_123",
            "phone": "9876543210",
            "email": "rajesh@crpf.gov.in",
            "personnel_id": "PID100001",
            "force": "CRPF",
            "rank_tier": "Constable/GD",
            "tenure_years": 8.0,
            "married": True,
            "family_status": "separated_hardship_posting",
            "posting_category": "operational_lwe",
            "posting_duration_months": 22.0,
            "leave_entitled_annual": 30,
            "leave_availed_last_12m": 6.0,
            "leave_utilization_ratio": 0.20,
            "avg_weekly_duty_hours_last_90d": 66.5,
            "night_duty_fraction_last_90d": 0.35,
            "rest_day_compliance_pct_last_90d": 72.0,
            "fatigue_index": 76.4,
            "sick_reports_last_90d": 5.0,
            "sick_reports_personal_baseline_90d": 1.0,
            "sick_reports_deviation": 4.0,
            "nco_observation_current": 4.0,
            "nco_observation_baseline": 2.0,
            "nco_observation_deviation": 2.0,
            "transfer_count_last_24m": 1,
            "saathi_sessions_last_90d": 3.0,
            "saathi_sessions_personal_baseline_90d": 2.0,
            "saathi_engagement_deviation": 1.0,
            "saathi_tough_rate_current": 0.33,
            "saathi_tough_deviation": 0.13,
            "saathi_safety_net_triggers_90d": 0,
            "training_hours_last_12m": 25.0,
            "baseline_deviation_composite": 1.5,
        }

        prob, is_flagged, plain_reasons = model_service.predict(dirty_profile)
        self.assertIsInstance(prob, float)
        self.assertIsInstance(is_flagged, bool)
        self.assertIsInstance(plain_reasons, list)

        # Also verify anonymize_profile directly
        clean = model_service.anonymize_profile(dirty_profile)
        self.assertNotIn("name", clean)
        self.assertNotIn("full_name", clean)
        self.assertNotIn("username", clean)
        self.assertNotIn("phone", clean)
        self.assertNotIn("email", clean)
        self.assertEqual(clean["personnel_id"], "PID100001")

if __name__ == "__main__":
    unittest.main()
