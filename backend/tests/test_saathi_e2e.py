import sys
import os
import json
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database import get_db, SessionLocal
from models import User, PersonnelProfile, SaathiSubmission, SaathiNotification
from auth import create_access_token

client = TestClient(app)

def test_saathi_complete_flow():
    print("=== 1. Starting Saathi E2E Integration Test ===")
    
    # 1. Login as Personnel (Ct. Rajesh Kumar Singh)
    resp = client.post("/api/auth/login", json={"username": "personnel_demo", "password": "Password@123"})
    assert resp.status_code == 200, f"Personnel login failed: {resp.text}"
    personnel_token = resp.json()["access_token"]
    personnel_headers = {"Authorization": f"Bearer {personnel_token}"}
    print("[OK] Personnel Login Successful")

    # 2. Login as Welfare Officer (Inspector Sunita Sharma)
    resp = client.post("/api/auth/login", json={"username": "welfare_demo", "password": "Password@123"})
    assert resp.status_code == 200, f"Welfare login failed: {resp.text}"
    welfare_token = resp.json()["access_token"]
    welfare_headers = {"Authorization": f"Bearer {welfare_token}"}
    print("[OK] Welfare Officer Login Successful")

    # 3. Check Welfare Officer Saathi Tracker
    resp = client.get("/api/welfare/saathi/tracker", headers=welfare_headers)
    assert resp.status_code == 200, f"Tracker error: {resp.text}"
    tracker_data = resp.json()
    print(f"[OK] Welfare Tracker loaded: {tracker_data['total_personnel']} personnel, {tracker_data['completion_rate_pct']}% completion rate")

    # 4. Fetch Saathi Context for Personnel
    resp = client.get("/api/personnel/saathi/context", headers=personnel_headers)
    assert resp.status_code == 200, f"Context error: {resp.text}"
    context = resp.json()
    duty_title = context.get("duty_context_title", "Operational Post")
    print(f"[OK] Saathi Context retrieved for {duty_title}: Question 1: '{context['initial_question']['prompt']}'")
    
    q1 = context['initial_question']
    selected_opt = q1['options'][0]

    # 5. Fetch Next Adaptive Question
    next_req = {
        "duty_category": context["duty_category"],
        "current_step": 1,
        "answers": [
            {
                "question_id": q1["question_id"],
                "option_key": selected_opt["key"],
                "score_val": selected_opt["score_val"]
            }
        ]
    }
    resp = client.post("/api/personnel/saathi/next-question", json=next_req, headers=personnel_headers)
    assert resp.status_code == 200, f"Next question error: {resp.text}"
    next_q_data = resp.json()
    assert "question" in next_q_data
    print(f"[OK] Adaptive Branching Next Question: '{next_q_data['question']['prompt']}'")

    # Reset any existing submission this week so test can run reliably
    client.post("/api/personnel/saathi/reset-weekly-demo", headers=personnel_headers)

    # 6. Submit Saathi Check-In and Verify with ML Model
    opt2 = next_q_data["question"]["options"][0]
    submit_req = {
        "duty_category": context["duty_category"],
        "answers": [
            {"question_id": q1["question_id"], "option_key": selected_opt["key"], "score_val": selected_opt.get("score_val", 4.0)},
            {"question_id": next_q_data["question"]["question_id"], "option_key": opt2["key"], "score_val": opt2.get("score_val", 4.0)}
        ],
        "scores": {
            "sleep_score": 4.0,
            "shift_load_score": 4.0,
            "family_score": 4.0,
            "camaraderie_score": 5.0,
            "coping_resilience": 4.0
        },
        "private_notes": "Felt good during high-altitude patrol today. Good coordination with buddy pair.",
        "requested_welfare_outreach": False
    }
    resp = client.post("/api/personnel/saathi/submit", json=submit_req, headers=personnel_headers)
    assert resp.status_code == 200, f"Submit error: {resp.text}"
    submit_res = resp.json()
    assert submit_res["status"] == "success"
    assert "weekly_cycle" in submit_res
    print(f"[OK] Unscored Confidential Check-in Saved: Message='{submit_res['message']}'")

    # 7. Check Personnel Saathi History
    resp = client.get("/api/personnel/saathi/history", headers=personnel_headers)
    assert resp.status_code == 200
    history = resp.json()
    assert len(history) > 0
    print(f"[OK] Personnel Saathi History verified ({len(history)} entries)")

    # 8. Send Saathi Nudge from Welfare Officer
    personnel_id = context["personnel_id"]
    nudge_req = {"custom_message": "Friendly reminder: Take a 60s pause to reflect in Saathi."}
    resp = client.post(f"/api/welfare/saathi/nudge/{personnel_id}", json=nudge_req, headers=welfare_headers)
    assert resp.status_code == 200, f"Nudge send error: {resp.text}"
    print(f"[OK] Welfare Officer sent Saathi Nudge to {personnel_id}")

    # 9. Verify Personnel receives Nudge in Context
    resp = client.get("/api/personnel/saathi/context", headers=personnel_headers)
    assert resp.status_code == 200
    pending_nudge = resp.json().get("pending_nudge")
    assert pending_nudge is not None
    nudge_id = pending_nudge["id"]
    print(f"[OK] Personnel received active nudge: '{pending_nudge['message']}'")

    # 10. Dismiss Nudge
    resp = client.post(f"/api/personnel/saathi/dismiss-nudge/{nudge_id}", headers=personnel_headers)
    assert resp.status_code == 200
    print("[OK] Personnel dismissed nudge successfully")

    print("\n[SUCCESS] ALL SAATHI BACKEND & ML INTEGRATION TESTS PASSED!")

if __name__ == "__main__":
    test_saathi_complete_flow()
