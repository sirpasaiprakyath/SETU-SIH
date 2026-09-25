import os
import sys
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from auth import create_access_token
from database import SessionLocal
from models import AuditLog, WelfareChatRequest

client = TestClient(app)

class TestDeclineAndAudit(unittest.TestCase):
    def test_decline_invitation_creates_zero_records(self):
        """Verify Privacy by Design: Declining an invitation MUST NOT create any flag, note, or record anywhere."""
        db = SessionLocal()
        initial_audit_count = db.query(AuditLog).count()
        initial_req_count = db.query(WelfareChatRequest).count()
        db.close()

        personnel_token = create_access_token({"sub": "personnel_demo", "role": "personnel"})
        headers = {"Authorization": f"Bearer {personnel_token}"}

        # Decline invitation
        response = client.post("/api/personnel/respond-invitation", json={"accepted": False}, headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "dismissed_no_record")

        # Check database: audit logs count and chat request count must be unchanged
        db = SessionLocal()
        final_audit_count = db.query(AuditLog).count()
        final_req_count = db.query(WelfareChatRequest).count()
        db.close()

        self.assertEqual(
            final_audit_count, initial_audit_count,
            "Declining an invitation must NOT create any audit log entry."
        )
        self.assertEqual(
            final_req_count, initial_req_count,
            "Declining an invitation must NOT create any welfare request record."
        )
        print("\n[Test] Privacy Guarantee Verified: Declining creates zero records and zero audit logs.")

    def test_viewing_case_creates_mandatory_audit_log(self):
        """Verify Section 3E & 7 mandate: Every view of a flagged individual case must be recorded in AuditLog."""
        db = SessionLocal()
        initial_audit_count = db.query(AuditLog).count()
        db.close()

        welfare_token = create_access_token({"sub": "welfare_demo", "role": "welfare_officer"})
        headers = {"Authorization": f"Bearer {welfare_token}"}

        # Open case #1
        response = client.get("/api/welfare/case/1", headers=headers)
        self.assertEqual(response.status_code, 200)

        # Verify audit log was created
        db = SessionLocal()
        latest_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
        final_audit_count = db.query(AuditLog).count()
        db.close()

        self.assertGreater(final_audit_count, initial_audit_count)
        self.assertEqual(latest_log.action, "VIEW_FLAGGED_CASE")
        self.assertEqual(latest_log.username, "welfare_demo")
        print(f"[Test] Mandatory Audit Verified: Logged '{latest_log.action}' for officer '{latest_log.username}' on target '{latest_log.target_personnel_id}'.")

if __name__ == "__main__":
    unittest.main()
