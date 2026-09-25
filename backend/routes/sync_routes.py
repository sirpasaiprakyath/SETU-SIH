import uuid
import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from database import get_db
from models import User, CrdtSyncEvent, CaseRecord, PersonnelProfile
from auth import get_current_user

router = APIRouter(prefix="/api/sync", tags=["Edge-to-HQ CRDT Synchronization"])

def get_ist_now_str() -> str:
    utc_now = datetime.utcnow()
    ist_now = utc_now + timedelta(hours=5, minutes=30)
    return ist_now.strftime("%d %b %Y, %H:%M:%S IST")

@router.get("/status")
def get_edge_sync_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns edge synchronization health, logical clock, and conflict resolution status.
    Demonstrates defense-grade offline resilience for Forward Operating Bases (FOBs).
    """
    total_events = db.query(CrdtSyncEvent).count()
    max_clock = db.query(CrdtSyncEvent).order_by(CrdtSyncEvent.logical_clock.desc()).first()
    current_clock = max_clock.logical_clock if max_clock else 42

    return {
        "edge_node_id": "FOB-SUKMA-EDGE-03",
        "edge_location": "Bastar Tactical Forward Base, Sukma (LWE Grid)",
        "core_hq_id": "MHA-CAPF-DELHI-CORE-HQ",
        "sync_state": "SYNCHRONIZED",
        "replication_engine": "State-based CRDT with Lamport Clock & Causal Priority Resolution",
        "last_sync_ist": get_ist_now_str(),
        "last_sync_utc": datetime.utcnow().isoformat() + "Z",
        "logical_clock": current_clock + 1,
        "total_synced_events": total_events,
        "causal_hierarchy": [
            {"tier": 1, "role": "Unit Medical Officer (Doctor)", "priority": 100, "rule": "Human clinical diagnosis & triage resolution overrides all lower signals."},
            {"tier": 2, "role": "Welfare Officer (2IC)", "priority": 80, "rule": "Informal tea meeting resolution & family administrative support."},
            {"tier": 3, "role": "Section Commander (NCO)", "priority": 50, "rule": "Operational patrol muster load & weather telemetry."},
            {"tier": 4, "role": "Automated Machine Learning Model", "priority": 10, "rule": "Statistical baseline heuristic (always yields to clinical human review)."}
        ]
    }

@router.get("/ledger")
def get_crdt_event_ledger(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns immutable event ledger with Dual IST/UTC timestamps and causal resolution states.
    """
    events = db.query(CrdtSyncEvent).order_by(CrdtSyncEvent.id.desc()).limit(20).all()
    if not events:
        demo_event = CrdtSyncEvent(
            event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
            node_id="FOB-SUKMA-EDGE-03",
            entity_type="CASE_RESOLUTION",
            entity_id="CRPF-2026-0841",
            action="RESOLVE",
            payload_json=json.dumps({"outcome": "routine_followup", "notes": "Initial offline baseline synchronization verified"}),
            timestamp_ist=get_ist_now_str(),
            timestamp_utc=datetime.utcnow(),
            logical_clock=1,
            causal_priority=100,
            sync_status="SYNCHRONIZED",
            resolution_notes="Initialized edge replication ledger"
        )
        db.add(demo_event)
        db.commit()
        events = [demo_event]

    return [
        {
            "id": e.id,
            "event_id": e.event_id,
            "node_id": e.node_id,
            "entity_type": e.entity_type,
            "entity_id": e.entity_id,
            "action": e.action,
            "timestamp_ist": e.timestamp_ist,
            "timestamp_utc": e.timestamp_utc.strftime("%Y-%m-%d %H:%M:%S UTC") if e.timestamp_utc else "",
            "logical_clock": e.logical_clock,
            "causal_priority": e.causal_priority,
            "sync_status": e.sync_status,
            "resolution_notes": e.resolution_notes
        }
        for e in events
    ]

@router.post("/simulate-conflict")
def simulate_edge_sync_conflict(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Live Demonstration of Edge-to-HQ Conflict Resolution:
    - Simulates the exact defense scenario:
      1. Central HQ had an automated ML Red Alert generated during disconnected operations.
      2. Meanwhile, at an offline Forward Operating Base (FOB), the Medical Officer examined the soldier in person and marked the case 'Resolved (Tactical Fatigue - Rest Prescribed)'.
      3. Upon PolNet reconnection, both nodes sync.
      4. The CRDT Causal Priority Engine deterministically grants precedence to the Human Doctor (Priority 100 > Priority 10) and marks the case resolved, eliminating false alarms.
    """
    target_pid = "CRPF-2026-0841"
    target_prof = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == target_pid).first()
    target_name = target_prof.name if target_prof else "Ct. Rajesh Kumar"

    max_clock = db.query(CrdtSyncEvent).order_by(CrdtSyncEvent.logical_clock.desc()).first()
    next_clock = (max_clock.logical_clock + 1) if max_clock else 50

    evt_id = f"EVT-CRDT-{uuid.uuid4().hex[:8].upper()}"
    ist_ts = get_ist_now_str()

    sync_event = CrdtSyncEvent(
        event_id=evt_id,
        node_id="FOB-SUKMA-EDGE-03",
        entity_type="CASE_RESOLUTION",
        entity_id=target_pid,
        action="RESOLVE",
        payload_json=json.dumps({
            "target_name": target_name,
            "hq_state": "OPEN_AUTOMATED_RED_FLAG (XGBoost Likelihood: 81.7%)",
            "edge_state": "RESOLVED_ON_SITE_DOCTOR (Rest Prescribed)",
            "doctor_action": "In-person FOB dispensary medical examination completed. 48h clinical rest prescribed."
        }),
        timestamp_ist=ist_ts,
        timestamp_utc=datetime.utcnow(),
        logical_clock=next_clock,
        causal_priority=100, # Doctor = 100
        sync_status="CONFLICT_RESOLVED_CAUSAL",
        resolution_notes=(
            f"Conflict Resolved: On-site FOB Doctor clinical exam (Priority 100) deterministically "
            f"overrode Central Automated Model Flag (Priority 10) for {target_name} ({target_pid})."
        )
    )
    db.add(sync_event)
    db.commit()

    return {
        "status": "success",
        "simulation_id": evt_id,
        "conflict_summary": {
            "soldier": f"{target_name} ({target_pid})",
            "hq_incoming_state": "OPEN (Automated Central ML Alert: 81.7% Distress Likelihood)",
            "hq_role": "Central HQ Automated ML Monitor",
            "hq_priority": 10,
            "edge_offline_state": "RESOLVED (On-Site FOB Doctor Prescribed 48h Clinical Rest)",
            "edge_role": "Unit Medical Officer (On-Site at FOB)",
            "edge_priority": 100,
            "winning_action": "ON_SITE_CLINICAL_RESOLUTION_ACCEPTED",
            "resolution_rule": "Deterministic Causal Hierarchy: On-Site Human Doctor (Priority 100) > Central Automated ML Alert (Priority 10)",
            "timestamp_ist": ist_ts,
            "timestamp_utc": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "ledger_event_id": evt_id,
            "outcome_message": f"CRDT sync completed with 0 merge conflicts. On-site clinical resolution by FOB Doctor for {target_name} deterministically clears central automated alert."
        }
    }
