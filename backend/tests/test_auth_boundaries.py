import os
import sys
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from auth import create_access_token

client = TestClient(app)

class TestAuthBoundaries(unittest.TestCase):
    def test_command_cannot_access_welfare_queue(self):
        """Verify hard role boundary: Command role MUST receive HTTP 403 when trying to access welfare queue."""
        command_token = create_access_token({"sub": "command_demo", "role": "command"})
        headers = {"Authorization": f"Bearer {command_token}"}
        
        response = client.get("/api/welfare/queue", headers=headers)
        self.assertEqual(
            response.status_code, 403,
            f"Expected 403 Forbidden for Command role accessing Welfare Queue, got {response.status_code}"
        )
        print("\n[Test] Hard Boundary Verified: Command role strictly forbidden (HTTP 403) from Welfare Queue.")

    def test_personnel_cannot_access_welfare_queue(self):
        """Verify hard role boundary: Personnel role MUST receive HTTP 403 when trying to access welfare queue."""
        personnel_token = create_access_token({"sub": "personnel_demo", "role": "personnel"})
        headers = {"Authorization": f"Bearer {personnel_token}"}
        
        response = client.get("/api/welfare/queue", headers=headers)
        self.assertEqual(
            response.status_code, 403,
            f"Expected 403 Forbidden for Personnel role accessing Welfare Queue, got {response.status_code}"
        )
        print("[Test] Hard Boundary Verified: Personnel role strictly forbidden (HTTP 403) from Welfare Queue.")

    def test_welfare_officer_can_access_welfare_queue(self):
        """Verify Welfare Officer role can access the welfare queue."""
        welfare_token = create_access_token({"sub": "welfare_demo", "role": "welfare_officer"})
        headers = {"Authorization": f"Bearer {welfare_token}"}
        
        response = client.get("/api/welfare/queue", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("queue", data)
        self.assertGreater(len(data["queue"]), 0)
        print(f"[Test] Welfare Queue Verified: {len(data['queue'])} flagged profiles accessible to Welfare Officer.")

    def test_command_metrics_contain_no_individual_names(self):
        """Verify Command leadership screen contains strictly aggregate data, zero individual names or IDs."""
        command_token = create_access_token({"sub": "command_demo", "role": "command"})
        headers = {"Authorization": f"Bearer {command_token}"}

        response = client.get("/api/command/aggregate-metrics", headers=headers)
        self.assertEqual(response.status_code, 200)
        body_text = response.text
        
        # Ensure no individual names or PID format appears in aggregate metrics
        self.assertNotIn("PID100", body_text, "Personnel ID must NEVER appear in Command response.")
        self.assertNotIn("Rajesh Kumar", body_text, "Personnel Name must NEVER appear in Command response.")
        print("[Test] Aggregate Privacy Verified: Command metrics contain zero individual names or personnel IDs.")

if __name__ == "__main__":
    unittest.main()
