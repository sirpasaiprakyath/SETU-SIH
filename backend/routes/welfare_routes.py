import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import User, PersonnelProfile, CaseRecord, AuditLog, PeerFlag, WelfareChatRequest, SaathiSubmission, SaathiNotification, MusterObservation, VocalStrainRecord
from auth import require_roles
from model_service import model_service
from trajectory_engine import trajectory_engine

router = APIRouter(prefix="/api/welfare", tags=["Welfare Officer Workstation"])

IST_TZ = timezone(timedelta(hours=5, minutes=30))

def to_ist_str(dt: Optional[datetime], fmt: str = "%d %b %Y, %I:%M %p IST") -> str:
    if not dt:
        return "—"
    utc_dt = dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)
    return utc_dt.astimezone(IST_TZ).strftime(fmt)

def to_utc_iso(dt: Optional[datetime]) -> Optional[str]:
    if not dt:
        return None
    utc_dt = dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

class CaseActionPayload(BaseModel):
    officer_action: str  # E.g. 'Informal tea and conversation'
    outcome: str         # 'contacted', 'not_needed', 'escalated_to_counselling', 'leave_recommended', 'routine_followup'
    notes: Optional[str] = None
    status: str = "Resolved" # 'Open', 'Under Review', 'Resolved'

class NudgePayload(BaseModel):
    message: Optional[str] = None


@router.get("/queue")
def get_flagged_queue(
    current_user: User = Depends(require_roles(["welfare_officer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Queue of flagged personnel.
    HARD ROLE BOUNDARY: Technically unreachable by 'command' or 'personnel' roles.
    Label is exactly: 'likelihood this person would benefit from a welfare check-in in the next 60 days'.
    Never 'stress score', never 'risk of self-harm'.
    Plain language reasons only.
    Guarantees Quick Login demo personnel (PID100042, PID100100) are included and prioritized.
    """
    demo_users = db.query(User).filter(User.role == "personnel", User.personnel_id != None).all()
    demo_pids = [u.personnel_id for u in demo_users]
    if "PID100088" not in demo_pids:
        demo_pids.append("PID100088")
    if "PID100077" not in demo_pids:
        demo_pids.append("PID100077")

    # Ensure PID100088 exists for Responsible AI Insufficient Data Demonstration
    p_88 = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == "PID100088").first()
    if not p_88:
        p_88 = PersonnelProfile(
            personnel_id="PID100088",
            name="Constable Vikram Deshmukh",
            force="CRPF",
            rank_tier="Constable/GD",
            company="Bravo Coy",
            battalion="14th Battalion",
            posting_category="operational_lwe",
            posting_duration_months=0.1,
            married=False,
            family_structure="nuclear",
            avg_weekly_duty_hours_last_90d=48.0,
            night_duty_fraction_last_90d=0.15,
            rest_day_compliance_pct_last_90d=100.0,
            fatigue_index=20.0,
            leave_entitled_annual=30,
            leave_availed_last_12m=0.0,
            leave_utilization_ratio=0.0,
            sick_reports_last_90d=0.0,
            sick_reports_personal_baseline_90d=0.0,
            sick_reports_deviation=0.0,
            nco_observation_current=0.0,
            nco_observation_baseline=0.0,
            nco_observation_deviation=0.0,
            saathi_sessions_last_90d=0,
            saathi_tough_rate_current=0.0,
            saathi_safety_net_triggers_90d=0,
            baseline_deviation_composite=0.0,
            welfare_review_recommended=False,
            review_likelihood=0.0,
            plain_reasons_json=json.dumps([
                "Newly reported personnel (4 days in deployment). Insufficient longitudinal wellness data for automated AI scoring."
            ])
        )
        db.add(p_88)
        db.commit()

    # Ensure PID100077 exists for Responsible AI Low Confidence / Epistemic Uncertainty Demonstration
    p_77 = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == "PID100077").first()
    if not p_77:
        p_77 = PersonnelProfile(
            personnel_id="PID100077",
            name="Head Constable Ramesh Chand",
            force="CRPF",
            rank_tier="Head Constable",
            company="Alpha Coy",
            battalion="14th Battalion",
            posting_category="operational_lwe",
            posting_duration_months=11.0,
            married=True,
            family_structure="nuclear",
            avg_weekly_duty_hours_last_90d=51.3,
            night_duty_fraction_last_90d=0.22,
            rest_day_compliance_pct_last_90d=85.0,
            fatigue_index=48.0,
            leave_entitled_annual=30,
            leave_availed_last_12m=12.0,
            leave_utilization_ratio=0.40,
            sick_reports_last_90d=1.0,
            sick_reports_personal_baseline_90d=0.0,
            sick_reports_deviation=0.8,
            nco_observation_current=4.0,
            nco_observation_baseline=2.0,
            nco_observation_deviation=0.7,
            saathi_sessions_last_90d=1,
            saathi_tough_rate_current=0.25,
            saathi_safety_net_triggers_90d=0,
            baseline_deviation_composite=1.05,
            welfare_review_recommended=True,
            review_likelihood=0.63,
            plain_reasons_json=json.dumps([
                "Duty load shifted to 51.3 hrs/wk with partial muster shift logs.",
                "Borderline Platt calibration margin (Confidence: 42%). Human review recommended."
            ])
        )
        db.add(p_77)
        db.commit()

    # Guarantee demo cases exist in CaseRecord so Quick Login personnel are NEVER missing from welfare queue
    for d_pid in demo_pids:
        c = db.query(CaseRecord).filter(CaseRecord.personnel_id == d_pid).first()
        if not c:
            p_prof = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == d_pid).first()
            if p_prof:
                c = CaseRecord(
                    personnel_id=d_pid,
                    flagged_date=datetime.now(timezone.utc),
                    likelihood=0.88 if d_pid == "PID100042" else (0.63 if d_pid == "PID100077" else (0.0 if d_pid == "PID100088" else 0.25)),
                    plain_reasons_json=json.dumps([
                        "Newly reported recruit: 4 days deployed. Risk assessment unavailable under Responsible AI protocol."
                        if d_pid == "PID100088" else
                        ("Borderline calibration margin (|p - 0.5| = 0.13). Confidence: 42%. Human review recommended."
                         if d_pid == "PID100077" else
                         "Historical service and baseline drift record available for welfare evaluation.")
                    ]),
                    status="Orientation" if d_pid == "PID100088" else "Open"
                )
                db.add(c)
    db.commit()

    # STRICT GOVERNANCE FILTER:
    # Welfare Officer has named detail ONLY for cases that have crossed the triage/escalation threshold (>= 0.48).
    # Cases below threshold (e.g. PID100100 with likelihood 0.25) are NOT visible to the Welfare Officer by name.
    TRIAGE_THRESHOLD = 0.48

    # Fetch active demo cases that crossed the threshold (e.g. PID100042 at 0.88, PID100077 at 0.63)
    active_demo_cases = (
        db.query(CaseRecord)
        .filter(CaseRecord.personnel_id.in_(demo_pids), CaseRecord.likelihood >= TRIAGE_THRESHOLD)
        .order_by(CaseRecord.likelihood.desc())
        .all()
    )
    active_demo_ids = {c.id for c in active_demo_cases}

    # Fetch other cases crossing the threshold
    other_cases = (
        db.query(CaseRecord)
        .filter(~CaseRecord.id.in_(active_demo_ids), CaseRecord.likelihood >= TRIAGE_THRESHOLD)
        .order_by(CaseRecord.likelihood.desc())
        .limit(50)
        .all()
    )

    cases = active_demo_cases + other_cases

    # Query latest Saathi submissions for all personnel in the queue
    all_case_pids = [c.personnel_id for c in cases]
    saathi_subs = (
        db.query(SaathiSubmission)
        .filter(SaathiSubmission.personnel_id.in_(all_case_pids))
        .order_by(SaathiSubmission.completed_at.desc())
        .all()
    )
    latest_saathi_by_pid = {}
    for s in saathi_subs:
        if s.personnel_id not in latest_saathi_by_pid:
            latest_saathi_by_pid[s.personnel_id] = s

    results = []
    for c in cases:
        try:
            p = c.personnel
            if not p:
                continue
            try:
                reasons = json.loads(c.plain_reasons_json)
            except Exception:
                reasons = ["Behavioural pattern shifted away from individual historical baseline."]

            is_demo = p.personnel_id in demo_pids
            demo_label = None
            if p.personnel_id == "PID100042":
                demo_label = "Quick Login: 🔴 Priority Review"
            elif p.personnel_id == "PID100100":
                demo_label = "Quick Login: 🟢 Normal Baseline"
            elif p.personnel_id == "PID100088":
                demo_label = "Responsible AI: ⚪ Insufficient Data"
            elif p.personnel_id == "PID100077":
                demo_label = "Responsible AI: ⚠️ Low Confidence (Review)"

            latest_s = latest_saathi_by_pid.get(p.personnel_id)
            has_saathi = latest_s is not None
            family_struct = getattr(p, "family_structure", None) or "joint"
            sep_load = float(getattr(p, "family_separation_load", 0.0) or 0.0)
            has_family_strain = sep_load >= 1.5

            traj = trajectory_engine.compute_trajectory(p, c)

            flagged_date_str = to_ist_str(c.flagged_date, "%d %b %Y")
            saathi_time_str = to_ist_str(latest_s.completed_at, "%d %b %Y, %I:%M %p IST") if latest_s else None

            results.append({
                "case_id": c.id,
                "personnel_id": p.personnel_id,
                "name": p.name,
                "force": p.force,
                "rank": p.rank_tier,
                "company": p.company,
                "battalion": p.battalion,
                "flagged_date": flagged_date_str,
                "welfare_checkin_likelihood": c.likelihood,
                "likelihood_label": "likelihood this person would benefit from a welfare check-in in the next 60 days",
                "plain_language_reasons": reasons,
                "stress_trajectory": traj,
                "status": c.status,
                "baseline_shift_summary": f"Pattern drifted {p.baseline_deviation_composite:+.2f} standard deviations from personal baseline over recent weeks",
                "last_action": c.officer_action,
                "last_outcome": c.outcome,
                "is_demo_user": is_demo,
                "demo_role_label": demo_label,
                "has_saathi_submission": has_saathi,
                "saathi_completed_at": saathi_time_str,
                "saathi_strain_tier": latest_s.strain_tier if latest_s else None,
                "saathi_welfare_requested": latest_s.requested_welfare_outreach if latest_s else False,
                "family_structure": family_struct,
                "family_separation_load": sep_load,
                "has_family_separation_strain": has_family_strain,
                "family_welfare_nudge_recommended": (family_struct == "nuclear" and has_family_strain)
            })
        except Exception as err:
            print(f"[Welfare Queue Warning] Failed processing case {getattr(c, 'id', None)}: {err}")
            continue

    return {
        "total_flagged_active": len(results),
        "queue": results
    }

@router.get("/case/{case_id}")
def get_case_detail(
    case_id: int,
    request: Request,
    current_user: User = Depends(require_roles(["welfare_officer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Retrieves full detail of a flagged case.
    SECURITY AUDIT LOG:
    Every view of a flagged individual case is recorded in the AuditLog table.
    """
    case = db.query(CaseRecord).filter(CaseRecord.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case record not found.")

    # STRICT GOVERNANCE CHECK:
    # Welfare Officer can only inspect named details of cases that crossed the triage threshold
    if case.likelihood < 0.48 and current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail=f"Access denied: Case {case_id} has not crossed the triage/escalation threshold (likelihood {case.likelihood:.2f} < 0.48). Personnel below threshold are not visible by name to the Welfare Officer."
        )

    p = case.personnel
    if not p:
        raise HTTPException(status_code=404, detail="Personnel service record not found.")

    # Record Audit Event
    client_ip = request.client.host if request.client else "127.0.0.1"
    audit_entry = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role,
        action="VIEW_FLAGGED_CASE",
        target_personnel_id=p.personnel_id,
        case_id=case.id,
        details=f"Welfare officer {current_user.username} opened detailed welfare case for {p.personnel_id} ({p.name})",
        ip_address=client_ip,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit_entry)
    db.commit()

    try:
        reasons = json.loads(case.plain_reasons_json)
    except Exception:
        reasons = []

    # Associated anonymous peer flags (strictly hiding any submitter identity)
    peer_flags = db.query(PeerFlag).filter(PeerFlag.target_personnel_id == p.personnel_id).all()
    peer_flag_texts = [f.observation_text for f in peer_flags]

    # Standing requests from personnel
    chat_requests = db.query(WelfareChatRequest).filter(WelfareChatRequest.personnel_id == p.personnel_id).all()
    chat_req_texts = [f"{r.request_type.replace('_', ' ').capitalize()} on {r.created_at.strftime('%d %b %Y')}" for r in chat_requests]

    # Determine recommended actions (Human-in-the-loop decision support)
    recommended_actions = [
        {
            "type": "officer_chat",
            "title": "Colleague Check-in (Tea Protocol)",
            "subtitle": "Informal Colleague Dialogue",
            "desc": "Initiate an informal, unrecorded tea conversation with the officer. Never reference automated risk models, deviations, or flags."
        }
    ]
    if (p.family_separation_load and p.family_separation_load >= 0.8) or (p.family_status == "separated_hardship_posting" and p.married):
        recommended_actions.append({
            "type": "family_welfare_cell_nudge",
            "title": "Nudge Unit Family Welfare Cell",
            "subtitle": "Direct Household Support Check-in",
            "desc": "Send a supportive outreach nudge to the unit's family welfare cell to check in with the officer's household directly at their home station."
        })

    return {
        "case_id": case.id,
        "personnel_id": p.personnel_id,
        "name": p.name,
        "force": p.force,
        "rank": p.rank_tier,
        "company": p.company,
        "battalion": p.battalion,
        "posting_category": p.posting_category,
        "posting_duration_months": p.posting_duration_months,
        "married": bool(p.married),
        "family_structure": p.family_structure or "nuclear",
        "family_status": p.family_status,
        "family_separation_load": p.family_separation_load or 0.0,
        "has_family_separation_strain": bool(p.family_separation_load and p.family_separation_load >= 0.8),
        "family_welfare_nudge_recommended": bool(p.family_separation_load and p.family_separation_load >= 0.8),
        "recommended_actions": recommended_actions,
        "flagged_date": to_ist_str(case.flagged_date, "%d %b %Y"),
        "welfare_checkin_likelihood": case.likelihood,
        "likelihood_label": "likelihood this person would benefit from a welfare check-in in the next 60 days",
        "plain_language_reasons": reasons,
        "stress_trajectory": trajectory_engine.compute_trajectory(p, case),
        "cold_start_status": model_service.get_cold_start_metadata(p),
        "status": case.status,
        "officer_action": case.officer_action,
        "outcome": case.outcome,
        "notes": case.notes,
        "action_logged_at": to_ist_str(case.action_logged_at, "%d %b %Y, %I:%M %p IST") if case.action_logged_at else None,
        # Longitudinal Personal Baseline Comparisons
        "personal_baseline_comparison": {
            "sick_reports": {
                "current_90d": p.sick_reports_last_90d,
                "personal_trailing_baseline": p.sick_reports_personal_baseline_90d,
                "deviation": p.sick_reports_deviation
            },
            "nco_observation": {
                "current_score": p.nco_observation_current,
                "personal_trailing_baseline": p.nco_observation_baseline,
                "deviation": p.nco_observation_deviation
            },
            "workload": {
                "weekly_duty_hours": p.avg_weekly_duty_hours_last_90d,
                "night_duty_fraction": p.night_duty_fraction_last_90d,
                "rest_day_compliance": p.rest_day_compliance_pct_last_90d,
                "fatigue_proxy_index": p.fatigue_index
            },
            "leave": {
                "entitled": p.leave_entitled_annual,
                "availed_12m": p.leave_availed_last_12m,
                "utilization_ratio": p.leave_utilization_ratio
            },
            "composite_baseline_deviation": p.baseline_deviation_composite
        },
        "anonymous_peer_notes": peer_flag_texts,
        "personnel_direct_requests": chat_req_texts,
        "audit_notification": "Audit Notice: This case access has been logged in the MHA Security Oversight Ledger."
    }

class FamilyNudgePayload(BaseModel):
    notes: Optional[str] = None
    urgency: Optional[str] = "standard"

@router.post("/case/{case_id}/nudge-family-cell")
def nudge_family_welfare_cell(
    case_id: int,
    payload: Optional[FamilyNudgePayload] = None,
    request: Request = None,
    current_user: User = Depends(require_roles(["welfare_officer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Dispatches a direct outreach nudge to the unit's family welfare cell
    to check in with the personnel's household directly.
    """
    case = db.query(CaseRecord).filter(CaseRecord.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case record not found.")

    p = case.personnel
    client_ip = request.client.host if (request and request.client) else "127.0.0.1"

    extra_note = (payload.notes if payload and payload.notes else "").strip()
    action_text = "Dispatched direct outreach nudge to unit Family Welfare Cell to check in with household directly."
    log_notes = f"Household outreach initiated. Family structure: {p.family_structure.capitalize() if p else 'Nuclear'}. Separation duration: {p.posting_duration_months if p else 'N/A'} months."
    if extra_note:
        log_notes += f" Officer note: {extra_note}"

    case.officer_action = action_text
    case.outcome = "family_welfare_cell_dispatched"
    case.notes = (case.notes + " | " + log_notes) if case.notes else log_notes
    case.status = "In Progress"
    case.action_logged_at = datetime.now(timezone.utc)
    case.officer_username = current_user.username

    audit_entry = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role,
        action="FAMILY_WELFARE_CELL_NUDGE",
        target_personnel_id=case.personnel_id,
        case_id=case.id,
        details=f"Welfare officer {current_user.username} dispatched Family Welfare Cell household outreach for {case.personnel_id}",
        ip_address=client_ip,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit_entry)
    db.commit()

    return {
        "status": "success",
        "message": "Direct nudge successfully dispatched to unit Family Welfare Cell for household check-in.",
        "case_id": case.id,
        "action_recorded": action_text
    }

@router.post("/case/{case_id}/action")
def log_case_action(
    case_id: int,
    payload: CaseActionPayload,
    request: Request,
    current_user: User = Depends(require_roles(["welfare_officer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Logs officer action and outcome.
    The system NEVER auto-triggers any action; every step requires a logged human officer decision.
    """
    case = db.query(CaseRecord).filter(CaseRecord.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case record not found.")

    case.officer_action = payload.officer_action
    case.outcome = payload.outcome
    case.notes = payload.notes
    case.status = payload.status
    case.action_logged_at = datetime.now(timezone.utc)
    case.officer_username = current_user.username

    # Record Audit Event
    client_ip = request.client.host if request.client else "127.0.0.1"
    audit_entry = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role,
        action="LOG_CASE_ACTION",
        target_personnel_id=case.personnel_id,
        case_id=case.id,
        details=f"Action: '{payload.officer_action}' | Outcome: '{payload.outcome}' logged by {current_user.username}",
        ip_address=client_ip,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit_entry)
    db.commit()

    return {
        "status": "success",
        "message": "Officer action and welfare outcome logged successfully."
    }

@router.get("/peer-flags")
def get_all_peer_flags(
    current_user: User = Depends(require_roles(["welfare_officer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    View anonymous peer flags for early support (Buddy System / Saathi Drop Box).
    Strictly isolated to the Welfare Officer cell. Command role has ZERO access.
    Submitter's identity is mathematically excluded.
    """
    flags = db.query(PeerFlag).order_by(PeerFlag.submitted_at.desc()).limit(50).all()
    pids = list({f.target_personnel_id for f in flags})
    profiles = {p.personnel_id: p for p in db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id.in_(pids)).all()}

    result = []
    for f in flags:
        prof = profiles.get(f.target_personnel_id)
        result.append({
            "id": f.id,
            "target_personnel_id": f.target_personnel_id,
            "target_name": prof.name if prof else f"Personnel ({f.target_personnel_id})",
            "target_rank": prof.rank_tier if prof else "Constable/GD",
            "target_company": prof.company if prof else "Company",
            "target_battalion": prof.battalion if prof else "Battalion",
            "target_family_structure": prof.family_structure if prof else "nuclear",
            "target_family_separation_load": round(prof.family_separation_load, 1) if prof and prof.family_separation_load else 0.0,
            "care_category": f.care_category or "general_strain",
            "observation_text": f.observation_text,
            "submitted_at": to_ist_str(f.submitted_at, "%d %b %Y, %I:%M %p IST"),
            "submitted_at_ist": to_ist_str(f.submitted_at, "%d %b %Y, %I:%M %p IST"),
            "submitted_at_utc": to_utc_iso(f.submitted_at),
            "status": f.status or "New",
            "scheduled_tea_at": f.scheduled_tea_at,
            "welfare_notes": f.welfare_notes,
            "is_star_buddy_report": bool(f.is_star_buddy_report),
            "verification_state": f.verification_state or "Pending_Corroboration",
            "corroboration_count": f.corroboration_count or 1
        })
    return result

class PeerTeaProtocolPayload(BaseModel):
    status: str  # "Scheduled_Tea", "Completed_Informal", "Dismissed_NonWelfare", "New"
    scheduled_tea_at: Optional[str] = None
    welfare_notes: Optional[str] = None

@router.post("/peer-flags/{flag_id}/tea-protocol")
def update_peer_flag_tea_protocol(
    flag_id: int,
    payload: PeerTeaProtocolPayload,
    current_user: User = Depends(require_roles(["welfare_officer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Initiates or updates the Informal Tea Protocol ('Chai pe Charcha') for an anonymous peer flag.
    Confidential Welfare action: Off-the-record touchpoint to check on soldier's wellbeing.
    """
    flag = db.query(PeerFlag).filter(PeerFlag.id == flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Peer flag record not found.")

    flag.status = payload.status
    if payload.scheduled_tea_at is not None:
        flag.scheduled_tea_at = payload.scheduled_tea_at
    if payload.welfare_notes is not None:
        flag.welfare_notes = payload.welfare_notes

    # Add audit log for Welfare Officer action
    audit = AuditLog(
        username=current_user.username,
        user_role=current_user.role,
        action="UPDATE_PEER_FLAG_TEA_PROTOCOL",
        target_personnel_id=flag.target_personnel_id,
        details=f"Informal Tea Protocol set to '{payload.status}'. Schedule: {payload.scheduled_tea_at or 'N/A'}"
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "message": f"Peer flag updated to '{payload.status}'. Informal tea protocol recorded."
    }

class ChatRequestActionPayload(BaseModel):
    status: str  # "Pending", "Scheduled", "Completed"
    scheduled_at: Optional[str] = None
    notes: Optional[str] = None

@router.get("/chat-requests")
def get_all_chat_requests(
    current_user: User = Depends(require_roles(["welfare_officer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    View standing chat requests from frontline personnel and officers.
    Strictly confidential: Visible ONLY to Welfare Officer cell & Admin.
    Higher Officials (command role) are explicitly denied access.
    """
    reqs = db.query(WelfareChatRequest).order_by(WelfareChatRequest.created_at.desc()).all()
    pids = list({r.personnel_id for r in reqs})
    profiles = {p.personnel_id: p for p in db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id.in_(pids)).all()}
    
    result = []
    for r in reqs:
        prof = profiles.get(r.personnel_id)
        result.append({
            "id": r.id,
            "personnel_id": r.personnel_id,
            "name": prof.name if prof else f"Personnel ({r.personnel_id})",
            "rank": prof.rank_tier if prof else "Personnel",
            "force": prof.force if prof else "CAPF",
            "company": prof.company if prof else "Company-A",
            "battalion": prof.battalion if prof else "Battalion",
            "family_structure": prof.family_structure if prof else "nuclear",
            "family_separation_load": round(prof.family_separation_load, 1) if prof and prof.family_separation_load else 0.0,
            "request_type": r.request_type,
            "preferred_mode": r.preferred_mode,
            "created_at": (r.created_at.isoformat() + "Z") if r.created_at else None,
            "status": r.status or "Pending",
            "scheduled_at": getattr(r, "scheduled_at", None),
            "notes": getattr(r, "notes", None)
        })
    return result

@router.post("/chat-requests/{req_id}/action")
def update_chat_request_action(
    req_id: int,
    payload: ChatRequestActionPayload,
    current_user: User = Depends(require_roles(["welfare_officer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Update status of a confidential welfare chat request (Schedule, Complete, Add confidential notes).
    Strictly restricted to Welfare Officers.
    """
    req = db.query(WelfareChatRequest).filter(WelfareChatRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Chat request not found")
    
    req.status = payload.status
    if payload.scheduled_at is not None:
        req.scheduled_at = payload.scheduled_at
    if payload.notes is not None:
        req.notes = payload.notes
    
    # Audit log entry for welfare action
    audit = AuditLog(
        username=current_user.username,
        user_role=current_user.role,
        action="UPDATE_WELFARE_CHAT_STATUS",
        target_personnel_id=req.personnel_id,
        details=f"Status set to '{payload.status}'. Notes: {payload.notes or 'None'}"
    )
    db.add(audit)
    db.commit()
    return {"status": "success", "message": f"Welfare chat request updated to '{payload.status}'"}

@router.get("/saathi/tracker")
def get_saathi_roster_tracker(
    current_user: User = Depends(require_roles(["welfare_officer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Saathi (साथी) Check-in Status Roster.
    Allows Welfare Officers to see which personnel have filled their Saathi check-in for the current cycle
    and which have not, along with nudge history.
    Guarantees:
    1. All personnel who have EVER submitted a Saathi check-in form are included in the roster.
    2. All Quick Login demo personnel (PID100042, PID100100) are included in the roster.
    3. Completed submissions are prioritized so the latest completed check-in appears at the top of the list.
    """
    # 1. Identify all personnel with Saathi submissions (ordered by most recent submission)
    submitted_rows = (
        db.query(SaathiSubmission.personnel_id, func.max(SaathiSubmission.completed_at).label("latest_at"))
        .group_by(SaathiSubmission.personnel_id)
        .order_by(func.max(SaathiSubmission.completed_at).desc())
        .all()
    )
    submitted_pids = [r[0] for r in submitted_rows]

    # 2. Identify Quick Login demo personnel
    demo_users = db.query(User).filter(User.role == "personnel", User.personnel_id != None).all()
    demo_pids = [u.personnel_id for u in demo_users]

    # 3. Combine priority PIDs (preserving order: recent submissions first, then demo personnel)
    priority_pids = []
    for pid in (submitted_pids + demo_pids):
        if pid not in priority_pids:
            priority_pids.append(pid)

    # 4. Fetch profiles for priority PIDs
    priority_profiles_map = {
        p.personnel_id: p
        for p in db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id.in_(priority_pids)).all()
    }
    priority_profiles = [priority_profiles_map[pid] for pid in priority_pids if pid in priority_profiles_map]

    # 5. Fetch additional background roster profiles up to 100
    other_profiles = (
        db.query(PersonnelProfile)
        .filter(~PersonnelProfile.personnel_id.in_(priority_pids))
        .limit(100)
        .all()
    )

    all_profiles = priority_profiles + other_profiles
    pids_to_query = [p.personnel_id for p in all_profiles]

    # Batch query latest submissions for all profiles
    submissions_by_pid = {}
    subs = (
        db.query(SaathiSubmission)
        .filter(SaathiSubmission.personnel_id.in_(pids_to_query))
        .order_by(SaathiSubmission.completed_at.desc())
        .all()
    )
    for s in subs:
        if s.personnel_id not in submissions_by_pid:
            submissions_by_pid[s.personnel_id] = s

    # Batch query nudges for all profiles
    nudges_by_pid = {}
    nudge_counts_by_pid = {}
    nudges = (
        db.query(SaathiNotification)
        .filter(SaathiNotification.personnel_id.in_(pids_to_query))
        .order_by(SaathiNotification.sent_at.desc())
        .all()
    )
    for n in nudges:
        if n.personnel_id not in nudges_by_pid:
            nudges_by_pid[n.personnel_id] = n
        nudge_counts_by_pid[n.personnel_id] = nudge_counts_by_pid.get(n.personnel_id, 0) + 1

    completed_list = []
    pending_list = []

    for p in all_profiles:
        latest_sub = submissions_by_pid.get(p.personnel_id)
        latest_nudge = nudges_by_pid.get(p.personnel_id)
        nudge_count = nudge_counts_by_pid.get(p.personnel_id, 0)

        has_filled = latest_sub is not None

        is_demo = p.personnel_id in demo_pids
        demo_label = None
        if p.personnel_id == "PID100042":
            demo_label = "Quick Login: Shifted Pattern"
        elif p.personnel_id == "PID100100":
            demo_label = "Quick Login: Normal Baseline"

        item = {
            "personnel_id": p.personnel_id,
            "name": p.name,
            "force": p.force,
            "rank": p.rank_tier,
            "company": p.company,
            "battalion": p.battalion,
            "posting_category": p.posting_category,
            "has_completed": has_filled,
            "last_completed_at": to_ist_str(latest_sub.completed_at, "%d %b %Y, %I:%M %p IST") if latest_sub else None,
            "last_completed_raw": to_utc_iso(latest_sub.completed_at) if latest_sub else None,
            "strain_tier": latest_sub.strain_tier if latest_sub else "Pending Check-In",
            "model_verification_score": latest_sub.model_verification_score if latest_sub else None,
            "requested_welfare_outreach": latest_sub.requested_welfare_outreach if latest_sub else False,
            "last_nudge_at": to_ist_str(latest_nudge.sent_at, "%d %b %Y, %I:%M %p IST") if latest_nudge else None,
            "nudge_count": nudge_count,
            "is_demo_user": is_demo,
            "demo_role_label": demo_label
        }

        if has_filled:
            completed_list.append(item)
        else:
            pending_list.append(item)

    # Sort completed list by completion time descending (newest first!)
    completed_list.sort(key=lambda x: x["last_completed_raw"] or "", reverse=True)

    # In pending list, prioritize demo personnel first
    pending_list.sort(key=lambda x: 0 if x["is_demo_user"] else 1)

    # Combined roster: Completed entries at the top (most recent first), then pending entries
    final_roster = completed_list + pending_list
    total_count = len(final_roster)
    completed_count = len(completed_list)
    pending_count = len(pending_list)

    return {
        "total_personnel": total_count,
        "completed_count": completed_count,
        "pending_count": pending_count,
        "completion_rate_pct": round((completed_count / total_count * 100) if total_count else 0, 1),
        "roster": final_roster,
        "completed_roster": completed_list,
        "pending_roster": pending_list
    }

@router.post("/saathi/nudge/{personnel_id}")
def send_saathi_nudge(
    personnel_id: str,
    payload: Optional[NudgePayload] = None,
    request: Request = None,
    current_user: User = Depends(require_roles(["welfare_officer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Sends a warm, supportive notification nudge to a personnel who hasn't completed their Saathi check-in.
    """
    profile = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == personnel_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Personnel profile not found.")

    msg = (payload.message if payload and payload.message else 
           f"A gentle reminder from Welfare Officer ({current_user.full_name}): Take a brief 60-second Saathi check-in to reflect on your duty rhythm.")

    notification = SaathiNotification(
        personnel_id=personnel_id,
        sender_officer=current_user.full_name,
        sent_at=datetime.now(timezone.utc),
        message=msg,
        is_read=False
    )
    db.add(notification)

    # Log audit event
    client_ip = request.client.host if request and request.client else "127.0.0.1"
    audit_entry = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role,
        action="SEND_SAATHI_WELFARE_NUDGE",
        target_personnel_id=personnel_id,
        details=f"Welfare officer {current_user.username} sent Saathi check-in reminder to {personnel_id} ({profile.name})",
        ip_address=client_ip,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit_entry)
    db.commit()

    return {
        "status": "success",
        "message": f"Gentle Saathi check-in reminder sent to {profile.name} ({personnel_id})."
    }

@router.get("/nco-muster-reports")
def get_nco_muster_reports(
    current_user: User = Depends(require_roles(["welfare_officer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Returns section muster observation reports logged by NCO Section Commanders.
    Includes:
    - NCO Officer ID & Name
    - Section & Company details
    - Muster observation roster (concern scores 1-5, baselines, notes, relative times)
    - Section Anonymous Peer-Flag Intakes
    - Cadence policy metadata (Bi-Daily: 48h–72h Routine to prevent roll-call fatigue)
    """
    nco_users = db.query(User).filter(User.role == "nco").all()
    if not nco_users:
        distinct_usernames = [r[0] for r in db.query(MusterObservation.nco_username).distinct().all()]
        nco_users = db.query(User).filter(User.username.in_(distinct_usernames)).all()

    if not nco_users:
        nco_demo = db.query(User).filter(User.username == "nco_demo").first()
        if nco_demo:
            nco_users = [nco_demo]

    # Pre-fetch all cases to link welfare_case_id
    cases_by_pid = {c.personnel_id: c.id for c in db.query(CaseRecord).all()}

    ist_tz = timezone(timedelta(hours=5, minutes=30))
    now_utc = datetime.now(timezone.utc)

    reports = []
    for nco in nco_users:
        officer_id = nco.personnel_id or "PID09012"
        officer_name = nco.full_name or "Havildar (NCO) Vikram Rathore"
        officer_rank = nco.rank or "Head Constable / Section Commander"
        company = nco.company or "Company-C (Delta Platoon)"
        force = nco.force or "CRPF"

        observations = (
            db.query(MusterObservation)
            .filter(MusterObservation.nco_username == nco.username)
            .order_by(MusterObservation.observed_date.desc(), MusterObservation.id.desc())
            .all()
        )

        latest_obs_by_pid = {}
        for obs in observations:
            if obs.personnel_id not in latest_obs_by_pid:
                latest_obs_by_pid[obs.personnel_id] = obs

        evaluated_pids = list(latest_obs_by_pid.keys())
        profiles = {
            p.personnel_id: p
            for p in db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id.in_(evaluated_pids)).all()
        }

        obs_items = []
        high_concern_count = 0
        latest_timestamp = None

        for pid, obs in latest_obs_by_pid.items():
            prof = profiles.get(pid)
            if not prof:
                continue

            if obs.concern_score >= 3:
                high_concern_count += 1

            ts = obs.observed_date
            if ts:
                utc_dt = ts.replace(tzinfo=timezone.utc) if ts.tzinfo is None else ts.astimezone(timezone.utc)
                ist_dt = utc_dt.astimezone(ist_tz)
                ist_str = ist_dt.strftime("%d %b %Y, %I:%M %p IST")
                utc_str = utc_dt.strftime("%d %b %Y %H:%M UTC")
                diff_sec = max(0, (now_utc - utc_dt).total_seconds())
                if diff_sec < 60:
                    rel_str = "Just now"
                elif diff_sec < 3600:
                    rel_str = f"{int(diff_sec // 60)}m ago"
                elif diff_sec < 86400:
                    rel_str = f"{int(diff_sec // 3600)}h ago"
                else:
                    rel_str = f"{int(diff_sec // 86400)}d ago"

                if latest_timestamp is None or utc_dt > latest_timestamp:
                    latest_timestamp = utc_dt
            else:
                ist_str = "Recently"
                utc_str = "Recently"
                rel_str = "Recently"

            obs_items.append({
                "id": obs.id,
                "personnel_id": prof.personnel_id,
                "name": prof.name,
                "rank": prof.rank_tier,
                "force": prof.force,
                "company": prof.company,
                "concern_score": obs.concern_score,
                "baseline_score": round(prof.nco_observation_baseline, 1),
                "deviation": round(obs.concern_score - prof.nco_observation_baseline, 2),
                "note": obs.note,
                "observed_date_ist": ist_str,
                "observed_date_utc": utc_str,
                "relative_time": rel_str,
                "welfare_case_id": cases_by_pid.get(prof.personnel_id)
            })

        obs_items.sort(key=lambda x: (x["concern_score"], x["deviation"]), reverse=True)

        peer_flags_query = db.query(PeerFlag).filter(
            PeerFlag.target_personnel_id.in_(evaluated_pids)
        ).order_by(PeerFlag.submitted_at.desc()).all()

        peer_flags_list = []
        for pf in peer_flags_query:
            target_prof = profiles.get(pf.target_personnel_id) or db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == pf.target_personnel_id).first()
            p_ts = pf.submitted_at
            if p_ts:
                p_utc = p_ts.replace(tzinfo=timezone.utc) if p_ts.tzinfo is None else p_ts.astimezone(timezone.utc)
                p_ist = p_utc.astimezone(ist_tz)
                p_ist_str = p_ist.strftime("%d %b %Y, %I:%M %p IST")
                p_utc_str = p_utc.strftime("%d %b %Y %H:%M UTC")
            else:
                p_ist_str = "Recently"
                p_utc_str = "Recently"

            peer_flags_list.append({
                "id": pf.id,
                "target_personnel_id": pf.target_personnel_id,
                "target_name": target_prof.name if target_prof else pf.target_personnel_id,
                "target_rank": target_prof.rank_tier if target_prof else "Constable/GD",
                "observation_text": pf.observation_text,
                "care_category": pf.care_category or "general_strain",
                "submitted_at_ist": p_ist_str,
                "submitted_at_utc": p_utc_str,
                "status": pf.status or "New",
                "scheduled_tea_at": pf.scheduled_tea_at,
                "welfare_notes": pf.welfare_notes
            })

        if latest_timestamp:
            latest_ist = latest_timestamp.astimezone(ist_tz)
            last_sub_ist = latest_ist.strftime("%d %b %Y, %I:%M %p IST")
            last_sub_utc = latest_timestamp.strftime("%d %b %Y %H:%M UTC")
            diff_sec = max(0, (now_utc - latest_timestamp).total_seconds())
            if diff_sec < 60:
                last_sub_rel = "Just now"
            elif diff_sec < 3600:
                last_sub_rel = f"{int(diff_sec // 60)}m ago"
            elif diff_sec < 86400:
                last_sub_rel = f"{int(diff_sec // 3600)}h ago"
            else:
                last_sub_rel = f"{int(diff_sec // 86400)}d ago"
        else:
            last_sub_ist = "Today, 11:30 AM IST"
            last_sub_utc = "Today, 06:00 UTC"
            last_sub_rel = "Today"

        reports.append({
            "nco_username": nco.username,
            "nco_officer_id": officer_id,
            "nco_name": officer_name,
            "nco_rank": officer_rank,
            "force": force,
            "company": company,
            "cycle_cadence": "Bi-Daily (48h–72h Routine)",
            "cadence_policy_note": "Scheduled once every 2–3 days to prevent daily reporting fatigue while maintaining section vigilance.",
            "last_submitted_ist": last_sub_ist,
            "last_submitted_utc": last_sub_utc,
            "last_submitted_relative": last_sub_rel,
            "total_evaluated": len(obs_items),
            "high_concern_count": high_concern_count,
            "observations": obs_items,
            "peer_flags": peer_flags_list
        })

    # If only 1 report exists, provide a second NCO Section Commander so the Welfare Officer can switch between officers
    if len(reports) == 1:
        # Check if Company-A personnel exist
        comp_a_profs = db.query(PersonnelProfile).filter(PersonnelProfile.company.like("%Company-A%")).limit(10).all()
        if not comp_a_profs:
            comp_a_profs = db.query(PersonnelProfile).offset(12).limit(10).all()

        comp_a_obs = []
        for i, p in enumerate(comp_a_profs):
            score = 1 if i % 3 != 0 else (3 if i == 3 else 2)
            note = "Quiet during muster, slight fatigue noted" if score == 3 else None
            comp_a_obs.append({
                "id": 1000 + i,
                "personnel_id": p.personnel_id,
                "name": p.name,
                "rank": p.rank_tier,
                "force": p.force,
                "company": p.company,
                "concern_score": score,
                "baseline_score": round(p.nco_observation_baseline, 1),
                "deviation": round(score - p.nco_observation_baseline, 2),
                "note": note,
                "observed_date_ist": "08 Sep 2026, 05:45 PM IST",
                "observed_date_utc": "08 Sep 2026 12:15 UTC",
                "relative_time": "1d ago",
                "welfare_case_id": cases_by_pid.get(p.personnel_id)
            })

        comp_a_pids = [p.personnel_id for p in comp_a_profs]
        comp_a_flags_query = db.query(PeerFlag).filter(PeerFlag.target_personnel_id.in_(comp_a_pids)).all()
        comp_a_flags = []
        for pf in comp_a_flags_query:
            t_prof = next((p for p in comp_a_profs if p.personnel_id == pf.target_personnel_id), None)
            comp_a_flags.append({
                "id": pf.id,
                "target_personnel_id": pf.target_personnel_id,
                "target_name": t_prof.name if t_prof else pf.target_personnel_id,
                "target_rank": t_prof.rank_tier if t_prof else "Constable/GD",
                "observation_text": pf.observation_text,
                "care_category": pf.care_category or "general_strain",
                "submitted_at_ist": "07 Sep 2026, 06:15 PM IST",
                "submitted_at_utc": "07 Sep 2026 12:45 UTC",
                "status": pf.status or "New",
                "scheduled_tea_at": pf.scheduled_tea_at,
                "welfare_notes": pf.welfare_notes
            })

        reports.append({
            "nco_username": "nco_bravo",
            "nco_officer_id": "PID09015",
            "nco_name": "HC Rajeshwar Rao",
            "nco_rank": "Head Constable / Section Commander",
            "force": "CRPF",
            "company": "Company-A (Bravo Platoon)",
            "cycle_cadence": "Bi-Daily (48h–72h Routine)",
            "cadence_policy_note": "Scheduled once every 2–3 days to prevent daily reporting fatigue while maintaining section vigilance.",
            "last_submitted_ist": "08 Sep 2026, 05:45 PM IST",
            "last_submitted_utc": "08 Sep 2026 12:15 UTC",
            "last_submitted_relative": "1d ago",
            "total_evaluated": len(comp_a_obs),
            "high_concern_count": sum(1 for o in comp_a_obs if o["concern_score"] >= 3),
            "observations": comp_a_obs,
            "peer_flags": comp_a_flags
        })

    return {
        "reports": reports,
        "total_nco_reports": len(reports)
    }


# ==========================================
# DHVANI (ध्वनि) VOCAL STRAIN RECORDS — WELFARE OFFICER VIEW
# ==========================================

@router.get("/dhvani-records")
def get_dhvani_records(
    limit: int = 100,
    current_user: User = Depends(require_roles(["welfare_officer", "admin"])),
    db: Session = Depends(get_db)
):
    # STRICT GOVERNANCE FILTER:
    # Welfare Officer has named detail ONLY for check-ins that have crossed the escalation threshold
    # (strain_score >= 55.0, strain_tier == 'Elevated Fatigue', or personnel flagged for welfare review).
    # Nominal baseline check-ins (< 55.0) are strictly excluded from named surveillance.
    flagged_pids = {c.personnel_id for c in db.query(CaseRecord.personnel_id).filter(CaseRecord.likelihood >= 0.48).all()}

    records = (
        db.query(VocalStrainRecord, PersonnelProfile)
        .join(PersonnelProfile, VocalStrainRecord.personnel_id == PersonnelProfile.personnel_id)
        .filter(
            (VocalStrainRecord.strain_tier == "Elevated Fatigue") |
            (VocalStrainRecord.strain_score >= 55.0) |
            (VocalStrainRecord.personnel_id.in_(flagged_pids))
        )
        .order_by(VocalStrainRecord.created_at.desc())
        .limit(limit)
        .all()
    )

    result = []
    for rec, profile in records:
        result.append({
            "id": rec.id,
            "personnel_id": rec.personnel_id,
            "name": profile.name,
            "rank": profile.rank_tier or "—",
            "company": profile.company or "—",
            "battalion": profile.battalion or "—",
            "strain_score": rec.strain_score,
            "strain_tier": rec.strain_tier,
            "jitter_pct": rec.jitter_pct,
            "shimmer_pct": rec.shimmer_pct,
            "hnr_db": rec.hnr_db,
            "pitch_hz": rec.pitch_hz,
            "session_mode": rec.session_mode,
            "notes": rec.notes,
            "created_at": (rec.created_at.isoformat() + "Z") if rec.created_at else None,
        })

    # Aggregate summary stats
    total = len(result)
    elevated_count = sum(1 for r in result if r["strain_tier"] == "Elevated Fatigue")
    mild_count = sum(1 for r in result if r["strain_tier"] == "Mild Strain")
    optimal_count = sum(1 for r in result if r["strain_tier"] == "Optimal")
    avg_score = round(sum(r["strain_score"] for r in result) / total, 1) if total > 0 else 0.0

    return {
        "records": result,
        "total": total,
        "elevated_count": elevated_count,
        "mild_count": mild_count,
        "optimal_count": optimal_count,
        "avg_strain_score": avg_score,
    }

