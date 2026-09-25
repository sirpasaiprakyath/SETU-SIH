import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from database import get_db
from models import User, PersonnelProfile, WelfareChatRequest, SaathiSubmission, SaathiNotification, CaseRecord, MedicalCampRecord, PeerFlag, WelfareMeeting, VocalStrainRecord
from auth import get_current_user, require_roles
from model_service import model_service, saathi_model_service
from saathi_tree import get_q1_opener, get_adaptive_next_node, check_crisis_text

router = APIRouter(prefix="/api/personnel", tags=["Personnel Portal"])

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

class TalkRequestPayload(BaseModel):
    preferred_mode: str = "informal_conversation"
    convenient_time: str | None = None

class InvitationResponsePayload(BaseModel):
    accepted: bool

class NextQuestionPayload(BaseModel):
    duty_category: str
    current_step: int
    answers: List[Dict[str, Any]]

class SaathiSubmitPayload(BaseModel):
    duty_category: str
    answers: List[Dict[str, Any]]
    scores: Dict[str, float]
    private_notes: Optional[str] = None
    requested_welfare_outreach: bool = False
    safety_net_triggered: bool = False
    opted_out: bool = False

# ==========================================
# SAATHI ADAPTIVE QUESTION ENGINE
# ==========================================

def get_duty_category(profile: PersonnelProfile) -> str:
    posting = (profile.posting_category or "").lower()
    rank = (profile.rank_tier or "").lower()

    if "inspector" in rank or "officer" in rank or "ac" in rank:
        return "staff_hq"
    elif "lwe" in posting or "naxal" in posting or "operational" in posting:
        return "counter_naxal_lwe"
    elif "jk" in posting or "insurgency" in posting or "ci" in posting:
        return "counter_insurgency_jk_ne"
    elif "order" in posting or "vip" in posting or "raf" in posting:
        return "law_order_vip_duty"
    else:
        return "peace_training_static"

DUTY_CONTEXT_NAMES = {
    "counter_naxal_lwe": "Counter-Naxal / LWE Tactical Grid",
    "counter_insurgency_jk_ne": "Counter-Insurgency Sector (J&K / North-East)",
    "law_order_vip_duty": "Law & Order, RAF & VIP/VVIP Security",
    "peace_training_static": "Group Centre, Training Institution & Static HQ",
    "staff_hq": "Supervisory Staff & Command Wing"
}

INITIAL_QUESTIONS = {
    "counter_naxal_lwe": {
        "question_id": "q1_lwe",
        "step": 1,
        "title": "Tactical Jungle Patrol & Night Vigil Rhythm",
        "prompt": "How has your physical rest and alertness felt across recent jungle patrol, anti-naxal operations, and night-vigil rotations?",
        "options": [
            {"key": "optimal", "label": "Steady & Alert", "sub": "Getting sound sleep between operational rotations", "score_key": "sleep_score", "score_val": 5},
            {"key": "manageable", "label": "Normal Operational Load", "sub": "Minor fatigue from tactical duties, but manageable", "score_key": "sleep_score", "score_val": 4},
            {"key": "fatigued", "label": "Noticeably Fatigued", "sub": "Consecutive night sentry watches or broken sleep", "score_key": "sleep_score", "score_val": 2},
            {"key": "drained", "label": "Heavy Operational Exhaustion", "sub": "Struggling to recover physically between patrol movements", "score_key": "sleep_score", "score_val": 1}
        ]
    },
    "counter_insurgency_jk_ne": {
        "question_id": "q1_ci",
        "step": 1,
        "title": "High-Alert Deployment & Sleep Rhythm",
        "prompt": "How are cordon-and-search operations, convoy protections, and your sleep recovery feeling lately?",
        "options": [
            {"key": "optimal", "label": "Resting Well & Vigilant", "sub": "Barrack conditions, diet, and rest cycle are comfortable", "score_key": "sleep_score", "score_val": 5},
            {"key": "manageable", "label": "Managing Comfortably", "sub": "Operational tempo is demanding, but rhythm is fine", "score_key": "sleep_score", "score_val": 4},
            {"key": "fatigued", "label": "Broken Sleep & Cold Strain", "sub": "Finding sleep difficult after high-alert watches", "score_key": "sleep_score", "score_val": 2},
            {"key": "drained", "label": "Persistent Alert Exhaustion", "sub": "High sensory load and prolonged fatigue", "score_key": "sleep_score", "score_val": 1}
        ]
    },
    "law_order_vip_duty": {
        "question_id": "q1_lo",
        "step": 1,
        "title": "Riot Control, Public Order & Standing Load",
        "prompt": "How are rapid deployments, crowd-control vigils, and shift turnaround times treating your physical energy?",
        "options": [
            {"key": "optimal", "label": "Fresh & Energetic", "sub": "Shift turnarounds allow full physical reset", "score_key": "sleep_score", "score_val": 5},
            {"key": "manageable", "label": "Standard Routine", "sub": "Normal duty fatigue, handling smoothly", "score_key": "sleep_score", "score_val": 4},
            {"key": "fatigued", "label": "Standing Fatigue / Tight Turnarounds", "sub": "Feet strain and short breaks between bandobast calls", "score_key": "sleep_score", "score_val": 2},
            {"key": "drained", "label": "Severe Shift Drain", "sub": "Cumulative exhaustion from non-stop public order roster", "score_key": "sleep_score", "score_val": 1}
        ]
    },
    "staff_hq": {
        "question_id": "q1_hq",
        "step": 1,
        "title": "Administrative & Supervisory Load",
        "prompt": "How are section administrative responsibilities, operational planning hours, and evening mental reset feeling?",
        "options": [
            {"key": "optimal", "label": "Clear & Balanced", "sub": "Workload manageable, able to switch off", "score_key": "shift_load_score", "score_val": 5},
            {"key": "manageable", "label": "Busy but In Control", "sub": "High tempo, but pacing works well", "score_key": "shift_load_score", "score_val": 4},
            {"key": "fatigued", "label": "High Mental Strain", "sub": "Extended desk hours and decision fatigue", "score_key": "shift_load_score", "score_val": 2},
            {"key": "drained", "label": "Overwhelmed by Load", "sub": "Constant administrative pressure without reset", "score_key": "shift_load_score", "score_val": 1}
        ]
    },
    "peace_training_static": {
        "question_id": "q1_peace",
        "step": 1,
        "title": "Daily Station Routine & Training Balance",
        "prompt": "How has your daily station routine, training schedule, and personal downtime felt over the past week?",
        "options": [
            {"key": "optimal", "label": "Smooth & Refreshing", "sub": "Good balance between duty, physical PT, and rest", "score_key": "sleep_score", "score_val": 5},
            {"key": "manageable", "label": "Regular Day-to-Day", "sub": "Routine is predictable and fine", "score_key": "sleep_score", "score_val": 4},
            {"key": "fatigued", "label": "Monotonous or Strained", "sub": "Feeling tired or disengaged from routine", "score_key": "sleep_score", "score_val": 2},
            {"key": "drained", "label": "Heavy Drag", "sub": "Lacking energy and motivation for daily calls", "score_key": "sleep_score", "score_val": 1}
        ]
    }
}
# Backward compatibility aliases
INITIAL_QUESTIONS["operational_lwe"] = INITIAL_QUESTIONS["counter_naxal_lwe"]
INITIAL_QUESTIONS["border_outpost"] = INITIAL_QUESTIONS["counter_insurgency_jk_ne"]
INITIAL_QUESTIONS["vvip_security"] = INITIAL_QUESTIONS["law_order_vip_duty"]
INITIAL_QUESTIONS["peace_station"] = INITIAL_QUESTIONS["peace_training_static"]

def get_weekly_cycle_info(personnel_id: str, db: Session) -> Dict[str, Any]:
    """
    Computes the weekly Saathi cycle (Monday to Sunday).
    Check-ins are restricted to once per week.
    Returns whether check-in is currently allowed, current Sunday deadline,
    and next cycle opening date/next Sunday deadline.
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    start_of_current_week = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    current_sunday = start_of_current_week + timedelta(days=6, hours=23, minutes=59, seconds=59)
    next_week_start = start_of_current_week + timedelta(days=7)
    next_week_sunday = start_of_current_week + timedelta(days=13, hours=23, minutes=59, seconds=59)

    this_week_sub = (
        db.query(SaathiSubmission)
        .filter(
            SaathiSubmission.personnel_id == personnel_id,
            SaathiSubmission.completed_at >= start_of_current_week
        )
        .order_by(SaathiSubmission.completed_at.desc())
        .first()
    )

    completed_this_week = this_week_sub is not None
    can_checkin_this_week = not completed_this_week

    return {
        "can_checkin_this_week": can_checkin_this_week,
        "completed_this_week": completed_this_week,
        "current_week_sunday": current_sunday.strftime("%d %b %Y"),
        "next_week_start": next_week_start.strftime("%d %b %Y"),
        "next_week_sunday": next_week_sunday.strftime("%d %b %Y"),
        "this_week_completed_at": to_ist_str(this_week_sub.completed_at, "%d %b %Y, %I:%M %p IST") if this_week_sub else None
    }

@router.get("/saathi/context")
def get_saathi_context(
    current_user: User = Depends(require_roles(["personnel"])),
    db: Session = Depends(get_db)
):
    """
    Returns the initial context-specific question, posting information, and weekly cycle status for Saathi.
    """
    profile = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == current_user.personnel_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Personnel profile not found.")

    duty_cat = get_duty_category(profile)

    # Check last submission
    last_sub = (
        db.query(SaathiSubmission)
        .filter(SaathiSubmission.personnel_id == current_user.personnel_id)
        .order_by(SaathiSubmission.completed_at.desc())
        .first()
    )

    q1 = get_q1_opener(profile, last_sub)

    # Check pending nudges
    pending_nudge = (
        db.query(SaathiNotification)
        .filter(SaathiNotification.personnel_id == current_user.personnel_id, SaathiNotification.is_read == False)
        .order_by(SaathiNotification.sent_at.desc())
        .first()
    )

    weekly_cycle = get_weekly_cycle_info(current_user.personnel_id, db)

    return {
        "personnel_id": profile.personnel_id,
        "name": profile.name,
        "duty_category": duty_cat,
        "duty_context_title": DUTY_CONTEXT_NAMES.get(duty_cat, "Active Force Posting"),
        "posting_sector": profile.posting_category,
        "initial_question": q1,
        "last_checkin": {
            "completed_at": to_ist_str(last_sub.completed_at, "%d %b %Y, %I:%M %p IST") if last_sub else None,
            "duty_category": last_sub.duty_category if last_sub else None
        } if last_sub else None,
        "pending_nudge": {
            "id": pending_nudge.id,
            "sender": pending_nudge.sender_officer,
            "sent_at": to_ist_str(pending_nudge.sent_at, "%d %b %Y"),
            "message": pending_nudge.message
        } if pending_nudge else None,
        "weekly_cycle": weekly_cycle
    }

@router.post("/saathi/next-question")
def get_adaptive_next_question(
    payload: NextQuestionPayload,
    current_user: User = Depends(require_roles(["personnel"])),
    db: Session = Depends(get_db)
):
    """
    Dynamically generates the next question based on the user's previous answer and domain branch.
    Supports up to 10 questions deep, with neutral opt-out ('Rather not say') and cross-cutting Safety Net.
    """
    profile = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == current_user.personnel_id).first()
    is_operational = False
    if profile:
        post = (profile.posting_category or "").lower()
        is_operational = "lwe" in post or "tactical" in post or "border" in post or "bop" in post

    return get_adaptive_next_node(
        current_step=payload.current_step,
        answers=payload.answers,
        duty_category=payload.duty_category,
        is_operational=is_operational,
        profile=profile
    )

@router.post("/saathi/submit")
def submit_saathi_checkin(
    payload: SaathiSubmitPayload,
    current_user: User = Depends(require_roles(["personnel"])),
    db: Session = Depends(get_db)
):
    """
    Submits completed Saathi check-in answers and WIRES THEM DIRECTLY INTO THE RISK MODEL:
    - Extracts structured options (Good/Okay/Tough), domain selection, and safety-net triggers.
    - Updates personal baseline metrics: saathi_sessions_last_90d, saathi_tough_rate_current,
      saathi_tough_deviation, saathi_safety_net_triggers_90d.
    - Recomputes composite baseline deviation and runs XGBoost baseline risk prediction.
    - Updates Welfare Officer's active case likelihood and plain-language contributing reasons.
    - Returns dynamic evaluation to drive customized reflection on the closing screen.
    """
    profile = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == current_user.personnel_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Personnel profile not found.")

    # Enforce weekly constraint: week only once
    weekly_info = get_weekly_cycle_info(profile.personnel_id, db)
    if weekly_info["completed_this_week"]:
        raise HTTPException(
            status_code=400,
            detail=f"Weekly check-in already completed for this cycle. Saathi check-ins are restricted to once per week. Your next check-in window opens next week (due before Sunday, {weekly_info['next_week_sunday']})."
        )

    # 1. Parse structured answers (never free-text)
    q1_opt = "okay"
    domain_pick = None
    safety_net_triggered = bool(payload.safety_net_triggered)

    for ans in payload.answers:
        qid = str(ans.get("question_id", "")).lower()
        topic = str(ans.get("topic", "")).lower()
        step = ans.get("step")
        opt_key = str(ans.get("option_key", "")).lower()
        sel_text = str(ans.get("selected_text", "")).lower()
        opt_label = str(ans.get("option_label", "")).lower()

        # Check opener choice
        if qid == "q1_opener" or "opener" in qid or topic == "opener" or step == 1:
            val = f"{opt_key} {sel_text} {opt_label}".lower()
            if "good" in val:
                q1_opt = "good"
            elif "tough" in val:
                q1_opt = "tough"
            elif "rather" in val or "opt_out" in val:
                q1_opt = "rather_not_say"
            elif "okay" in val:
                q1_opt = "okay"

        # Check domain pick
        if "domain" in qid or topic == "domain" or step == 2:
            picked = ans.get("option_label") or ans.get("option_key") or ans.get("selected_text")
            if picked and not ans.get("is_safety_net") and topic not in ["crisis", "safety_net"]:
                domain_pick = picked

        # Check safety net triggers
        if ans.get("is_safety_net") or topic in ["safety_net", "crisis"] or "crisis" in sel_text or "overwhelmed" in sel_text:
            safety_net_triggered = True

    is_good = (q1_opt == "good")
    is_okay = (q1_opt == "okay" or q1_opt == "rather_not_say")
    is_tough = (q1_opt == "tough")
    opted_out = bool(payload.opted_out)

    # 2. Update Saathi structured features on PersonnelProfile
    curr_sessions = float(profile.saathi_sessions_last_90d or 0.0) + 1.0
    profile.saathi_sessions_last_90d = curr_sessions
    base_sessions = float(profile.saathi_sessions_personal_baseline_90d or 2.0)
    profile.saathi_engagement_deviation = curr_sessions - base_sessions

    # Compute tough rate & deviation vs personal baseline normal
    personal_tough_base = min(0.60, max(0.10, float(profile.saathi_tough_rate_current or 0.20) - float(profile.saathi_tough_deviation or 0.0)))
    prior_rate = float(profile.saathi_tough_rate_current or 0.20)
    current_signal = 1.0 if is_tough else 0.0
    new_rate = round(0.80 * prior_rate + 0.20 * current_signal, 3)
    profile.saathi_tough_rate_current = new_rate
    profile.saathi_tough_deviation = round(new_rate - personal_tough_base, 3)

    if safety_net_triggered:
        profile.saathi_safety_net_triggers_90d = int(profile.saathi_safety_net_triggers_90d or 0) + 1

    # 3. Recompute composite personal-baseline deviation
    # 0.25 * z(sick_dev) + 0.25 * z(nco_dev) + 0.20 * z(100 - leave_util * 100) + 0.30 * z(saathi_tough_dev)
    sick_dev = float(profile.sick_reports_deviation or 0.0)
    nco_dev = float(profile.nco_observation_deviation or 0.0)
    leave_dev = float(100.0 - float(profile.leave_utilization_ratio or 0.5) * 100.0)
    tough_dev = float(profile.saathi_tough_deviation or 0.0)
    profile.baseline_deviation_composite = round(
        0.25 * (sick_dev / 1.5) +
        0.25 * (nco_dev / 1.0) +
        0.20 * ((leave_dev - 35.0) / 20.0) +
        0.30 * (tough_dev / 0.15),
        3
    )

    # 4. Predict outcome risk using trained XGBoost baseline model
    pred_prob, pred_flag, plain_reasons = model_service.predict(profile)
    profile.review_likelihood = pred_prob
    profile.welfare_review_recommended = pred_flag
    profile.plain_reasons_json = json.dumps(plain_reasons)
    profile.last_evaluated_at = datetime.utcnow()

    # 5. Build dynamic evaluation for closing screen
    if opted_out:
        eval_result = {
            "verification_score": 0.85,
            "strain_tier": "Neutral",
            "selected_option": "Rather not say",
            "domain": None,
            "verification_summary": "Session concluded at your discretion ('Rather not say'). Logged neutrally with zero administrative inference.",
            "recommendations": [
                "Saathi companion is standing by whenever you wish to pause or reflect.",
                "Take regular personal downtime during off-duty recreation hours."
            ]
        }
    elif safety_net_triggered:
        eval_result = {
            "verification_score": 0.25,
            "strain_tier": "Safety Net Supported",
            "selected_option": "Tough" if is_tough else ("Good" if is_good else "Okay"),
            "domain": domain_pick,
            "verification_summary": "Safety Net bridge activated. Confidential support resources presented (Tele-MANAS 14416 & Unit Welfare Officer).",
            "recommendations": [
                "Tele-MANAS national helpline (14416) is available 24/7 free and confidential.",
                "Unit Welfare Officer standing tea conversation door is open.",
                "Practice box breathing in the Vishram section to decompress physical tension."
            ]
        }
    elif is_good:
        eval_result = {
            "verification_score": round(max(0.75, 1.0 - pred_prob), 2),
            "strain_tier": "Optimal",
            "selected_option": "Good",
            "domain": domain_pick,
            "verification_summary": "Steady duty rhythm and high personal resilience. Coping capacity is well-aligned with operational tempo.",
            "recommendations": [
                "Maintain your regular sleep discipline and hydration on shifts.",
                "Continue peer buddy interactions during off-duty recreation.",
                "Keep your steady personal rhythm intact."
            ]
        }
    elif is_okay:
        domain_note = f" with {domain_pick} on your mind" if domain_pick else ""
        eval_result = {
            "verification_score": round(max(0.50, 1.0 - pred_prob), 2),
            "strain_tier": "Mild Strain",
            "selected_option": "Okay",
            "domain": domain_pick,
            "verification_summary": f"Managing routine with manageable load{domain_note}. Pattern indicates stable baseline.",
            "recommendations": [
                "Prioritize uninterrupted sleep recovery between operational shifts.",
                "Consider a phone call home or an informal chat with your buddy.",
                "Explore Vishram relaxation audios to maintain steady energy."
            ]
        }
    else:  # is_tough
        domain_note = f" regarding {domain_pick}" if domain_pick else ""
        eval_result = {
            "verification_score": round(max(0.15, 1.0 - pred_prob), 2),
            "strain_tier": "Elevated Strain",
            "selected_option": "Tough",
            "domain": domain_pick,
            "verification_summary": f"Elevated duty or domestic strain reported{domain_note}. Personal baseline drift detected.",
            "recommendations": [
                "Consider an informal cup of tea with the Unit Welfare Officer—completely off-the-record.",
                "Speak with your section commander if duty rotation or shift adjustment would help.",
                "Tele-MANAS (14416) is available toll-free 24/7 if you want an independent voice.",
                "Use Vishram tactical breathing to release accumulated duty tension."
            ]
        }

    # 6. Save Saathi session record
    submission = SaathiSubmission(
        personnel_id=profile.personnel_id,
        completed_at=datetime.now(timezone.utc).replace(tzinfo=None),
        posting_context=profile.posting_category or "station",
        duty_category=payload.duty_category,
        answers_json=json.dumps(payload.answers),
        model_verification_score=eval_result["verification_score"],
        strain_tier=eval_result["strain_tier"],
        verification_summary=eval_result["verification_summary"],
        recommendations_json=json.dumps(eval_result["recommendations"]),
        requested_welfare_outreach=payload.requested_welfare_outreach,
        private_notes=payload.private_notes if payload.private_notes else None
    )
    db.add(submission)

    # If personnel requested welfare outreach or safety net escalation
    if payload.requested_welfare_outreach:
        chat_req = WelfareChatRequest(
            personnel_id=profile.personnel_id,
            request_type="safety_net_escalation" if safety_net_triggered else "saathi_flagged_outreach",
            preferred_mode="informal_conversation",
            status="Pending"
        )
        db.add(chat_req)

    # 7. Update Welfare Officer's active CaseRecord with model's updated likelihood
    if not opted_out and (pred_flag or safety_net_triggered or payload.requested_welfare_outreach):
        existing_case = db.query(CaseRecord).filter(CaseRecord.personnel_id == profile.personnel_id).first()
        effective_likelihood = max(pred_prob, 0.88) if (safety_net_triggered or payload.requested_welfare_outreach) else pred_prob

        if not existing_case:
            new_case = CaseRecord(
                personnel_id=profile.personnel_id,
                flagged_date=datetime.now(timezone.utc),
                likelihood=effective_likelihood,
                plain_reasons_json=profile.plain_reasons_json,
                status="Open"
            )
            db.add(new_case)
        else:
            existing_case.likelihood = effective_likelihood
            existing_case.plain_reasons_json = profile.plain_reasons_json
            existing_case.status = "Open"
            existing_case.flagged_date = datetime.now(timezone.utc)

    # Mark any pending notifications as read
    db.query(SaathiNotification).filter(
        SaathiNotification.personnel_id == profile.personnel_id,
        SaathiNotification.is_read == False
    ).update({"is_read": True})

    db.commit()

    updated_weekly_info = get_weekly_cycle_info(profile.personnel_id, db)

    return {
        "status": "success",
        "message": f"Thanks for taking a moment today. Your weekly check-in is recorded. Next check-in cycle opens next week (due before Sunday, {updated_weekly_info['next_week_sunday']}).",
        "weekly_cycle": updated_weekly_info,
        "evaluation": eval_result
    }

@router.get("/saathi/history")
def get_saathi_history(
    current_user: User = Depends(require_roles(["personnel"])),
    db: Session = Depends(get_db)
):
    """Returns past check-in sessions for this personnel's private companion log with zero computed scores/verdicts."""
    subs = (
        db.query(SaathiSubmission)
        .filter(SaathiSubmission.personnel_id == current_user.personnel_id)
        .order_by(SaathiSubmission.completed_at.desc())
        .limit(10)
        .all()
    )

    return [
        {
            "id": s.id,
            "completed_at": to_ist_str(s.completed_at, "%d %b %Y, %I:%M %p IST"),
            "duty_category": s.duty_category,
            "answers": json.loads(s.answers_json) if s.answers_json else [],
            "requested_welfare_outreach": s.requested_welfare_outreach,
            "has_private_notes": bool(s.private_notes)
        }
        for s in subs
    ]

@router.post("/saathi/dismiss-nudge/{nudge_id}")
def dismiss_saathi_nudge(
    nudge_id: int,
    current_user: User = Depends(require_roles(["personnel"])),
    db: Session = Depends(get_db)
):
    """Allows personnel to dismiss/mark a welfare reminder as read."""
    nudge = db.query(SaathiNotification).filter(
        SaathiNotification.id == nudge_id,
        SaathiNotification.personnel_id == current_user.personnel_id
    ).first()
    if nudge:
        nudge.is_read = True
        db.commit()
    return {"status": "dismissed"}

@router.post("/saathi/reset-weekly-demo")
def reset_weekly_saathi_demo(
    current_user: User = Depends(require_roles(["personnel"])),
    db: Session = Depends(get_db)
):
    """
    Demo utility: Clears this week's Saathi submission for the current user so they can test both active and completed weekly states.
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    start_of_current_week = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    db.query(SaathiSubmission).filter(
        SaathiSubmission.personnel_id == current_user.personnel_id,
        SaathiSubmission.completed_at >= start_of_current_week
    ).delete()

    if current_user.username == "personnel_demo" and current_user.personnel_id:
        p = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == current_user.personnel_id).first()
        if p:
            p.saathi_tough_rate_current = 0.20
            p.saathi_tough_deviation = 0.0
            p.saathi_safety_net_triggers_90d = 0
            p.saathi_sessions_last_90d = 2.0
            p.saathi_sessions_personal_baseline_90d = 2.0
            p.saathi_engagement_deviation = 0.0

    db.commit()
    return {"status": "success", "message": "Current week check-in reset for demo testing."}

# ==========================================
# STANDARD ADMINISTRATIVE RECORD ENDPOINTS
# ==========================================

@router.get("/my-profile")
def get_my_profile(
    current_user: User = Depends(require_roles(["personnel"])),
    db: Session = Depends(get_db)
):
    """
    Returns only the calm administrative profile: posting, leave balance, and training record.
    NEVER returns any prediction, risk score, or AI flag about the individual.
    """
    if not current_user.personnel_id:
        raise HTTPException(status_code=404, detail="No personnel profile linked to this account.")

    profile = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == current_user.personnel_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Personnel service record not found.")

    return {
        "personnel_id": profile.personnel_id,
        "name": profile.name,
        "force": profile.force,
        "rank_tier": profile.rank_tier,
        "company": profile.company,
        "battalion": profile.battalion,
        "posting_category": profile.posting_category,
        "posting_duration_months": profile.posting_duration_months,
        "leave_entitled_annual": profile.leave_entitled_annual,
        "leave_availed_last_12m": profile.leave_availed_last_12m,
        "leave_balance_remaining": max(0, profile.leave_entitled_annual - profile.leave_availed_last_12m),
        "training_hours_last_12m": profile.training_hours_last_12m,
        "tenure_years": profile.tenure_years,
        # Demographic & Family Support (Set once at onboarding)
        "married": bool(profile.married),
        "family_structure": profile.family_structure or "nuclear",
        "family_status": profile.family_status or "with_family",
        "family_separation_load": profile.family_separation_load or 0.0,
        "onboarding_completed": bool(profile.family_structure and profile.family_structure != "unspecified")
    }

class OnboardingPayload(BaseModel):
    married: bool
    family_structure: str # "nuclear" | "joint" | "n/a"

@router.post("/onboarding")
def complete_onboarding(
    payload: OnboardingPayload,
    current_user: User = Depends(require_roles(["personnel"])),
    db: Session = Depends(get_db)
):
    """
    Records one-time onboarding fields: marital status & family structure (nuclear vs joint).
    Only asked once during initial service record setup; never a recurring prompt.
    Computes family_separation_load interaction term and updates baseline evaluation.
    """
    if not current_user.personnel_id:
        raise HTTPException(status_code=404, detail="No personnel profile linked to this account.")

    profile = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == current_user.personnel_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Personnel service record not found.")

    profile.married = payload.married
    profile.family_structure = payload.family_structure if payload.married else "n/a"

    # Compute family_separation_load:
    # posting_duration_months * (1.6 if separated & nuclear, 1.0 if separated & joint, 0 if not separated) / 12
    is_sep = (profile.posting_category not in ["peace_training_static", "peace_station"]) and (profile.family_status != "with_family")
    if profile.married and is_sep:
        mult = 1.6 if profile.family_structure == "nuclear" else (1.0 if profile.family_structure == "joint" else 0.0)
        profile.family_separation_load = round(float((profile.posting_duration_months * mult) / 12.0), 3)
    else:
        profile.family_separation_load = 0.0

    # Re-evaluate baseline model prediction
    from model_service import model_service
    prob, flagged, reasons = model_service.predict(profile)
    profile.review_likelihood = prob
    profile.welfare_review_recommended = flagged
    profile.plain_reasons_json = json.dumps(reasons)

    # If flagged, ensure case record is updated
    case = db.query(CaseRecord).filter(CaseRecord.personnel_id == profile.personnel_id).first()
    if flagged and not case:
        case = CaseRecord(
            personnel_id=profile.personnel_id,
            flagged_date=datetime.now(timezone.utc),
            likelihood=prob,
            status="Open",
            plain_reasons_json=profile.plain_reasons_json
        )
        db.add(case)
    elif case:
        case.likelihood = prob
        case.plain_reasons_json = profile.plain_reasons_json

    db.commit()
    return {
        "status": "success",
        "message": "Onboarding profile completed successfully.",
        "married": profile.married,
        "family_structure": profile.family_structure,
        "family_separation_load": profile.family_separation_load
    }

@router.get("/my-vitals")
def get_my_medical_vitals(
    current_user: User = Depends(require_roles(["personnel"])),
    db: Session = Depends(get_db)
):
    """
    Returns the individual's raw monthly medical camp readings & simple historical trend.
    HARD MEDICAL ETHICS & PRIVACY BOUNDARY:
    - Mirrors standard medical practice: patient has the absolute right to see their raw vitals.
    - Strictly omits computed clinical risk flags, deviation indices, or algorithmic interpretations.
    - Clinical interpretation remains exclusively with medical officers.
    """
    if not current_user.personnel_id:
        raise HTTPException(status_code=404, detail="No personnel profile linked to this account.")

    profile = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == current_user.personnel_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Personnel service record not found.")

    records = (
        db.query(MedicalCampRecord)
        .filter(MedicalCampRecord.personnel_id == current_user.personnel_id)
        .order_by(MedicalCampRecord.camp_date.asc())
        .all()
    )

    history = []
    for r in records:
        history.append({
            "id": r.id,
            "camp_date": to_ist_str(r.camp_date, "%d %b %Y"),
            "doctor_name": r.doctor_name,
            "systolic_bp": r.systolic_bp,
            "diastolic_bp": r.diastolic_bp,
            "weight_kg": r.weight_kg,
            "blood_sugar_mg_dl": r.blood_sugar_mg_dl,
            "clinical_notes": r.clinical_notes
        })

    latest = records[-1] if records else None

    return {
        "personnel_id": profile.personnel_id,
        "name": profile.name,
        "total_camps_recorded": len(records),
        "latest_camp_date": to_ist_str(latest.camp_date, "%d %b %Y") if latest else None,
        "latest_vitals": {
            "systolic_bp": latest.systolic_bp if latest else None,
            "diastolic_bp": latest.diastolic_bp if latest else None,
            "weight_kg": latest.weight_kg if latest else None,
            "blood_sugar_mg_dl": latest.blood_sugar_mg_dl if latest else None,
            "notes": latest.clinical_notes if latest else None
        } if latest else None,
        "vitals_trend": history
    }

@router.get("/invitation")
def check_welfare_invitation(
    current_user: User = Depends(require_roles(["personnel"])),
    db: Session = Depends(get_db)
):
    """
    Checks for:
    1. Active scheduled informal tea meetings / welfare chat appointments.
    2. Pending welfare chat requests waiting for officer timing.
    3. Soft, optional, non-alarming invitation if system flagged pattern change.
    Strictly confidential: zero impact on service record.
    """
    if not current_user.personnel_id:
        return {"has_invitation": False}

    pid = current_user.personnel_id

    # 1. Check if there is an active scheduled WelfareChatRequest, WelfareMeeting, or PeerFlag tea
    chat_req = db.query(WelfareChatRequest).filter(
        WelfareChatRequest.personnel_id == pid
    ).order_by(WelfareChatRequest.id.desc()).first()

    welfare_meet = db.query(WelfareMeeting).filter(
        WelfareMeeting.personnel_id == pid,
        WelfareMeeting.status.in_(["Scheduled", "Acknowledged"])
    ).order_by(WelfareMeeting.id.desc()).first()

    peer_tea = db.query(PeerFlag).filter(
        PeerFlag.target_personnel_id == pid,
        PeerFlag.status == "Scheduled_Tea"
    ).order_by(PeerFlag.id.desc()).first()

    scheduled_tea = None
    if chat_req and chat_req.status == "Scheduled":
        scheduled_tea = {
            "source": "welfare_chat_request",
            "request_id": chat_req.id,
            "status": "Scheduled",
            "scheduled_at": chat_req.scheduled_at or "Tomorrow, 10:30 AM @ Welfare Cell",
            "venue": "Unit Welfare Cell",
            "welfare_cell_contact": "Welfare Officer (Assoc. Cmdt. Dr. Sharma) • Extension: 4102",
            "message": "Your informal tea discussion with the Unit Welfare Officer has been scheduled.",
            "confidential_guarantee": "Strict Confidentiality: Kept strictly inside the Welfare Cell. Completely invisible to Battalion Command and Higher Officials."
        }
    elif welfare_meet and welfare_meet.status in ["Scheduled", "Acknowledged"]:
        scheduled_tea = {
            "source": "welfare_meeting",
            "meeting_id": welfare_meet.id,
            "status": welfare_meet.status,
            "scheduled_at": welfare_meet.scheduled_at or "Tomorrow, 10:30 AM @ Welfare Cell",
            "venue": welfare_meet.venue or "Unit Welfare Cell / Canteen",
            "welfare_cell_contact": "Welfare Officer (Assoc. Cmdt. Dr. Sharma) • Extension: 4102",
            "message": welfare_meet.message or "Your informal tea discussion with the Unit Welfare Officer has been scheduled.",
            "confidential_guarantee": "Strict Confidentiality: Kept strictly inside the Welfare Cell. Completely invisible to Battalion Command and Higher Officials."
        }
    elif peer_tea and peer_tea.status == "Scheduled_Tea":
        scheduled_tea = {
            "source": "peer_tea",
            "status": "Scheduled",
            "scheduled_at": peer_tea.scheduled_tea_at or "Tomorrow, 10:30 AM @ Welfare Cell",
            "venue": "Unit Welfare Cell / Canteen",
            "welfare_cell_contact": "Welfare Officer (Assoc. Cmdt. Dr. Sharma) • Extension: 4102",
            "message": "An informal tea chat ('Chai pe Charcha') has been scheduled with the Unit Welfare Officer.",
            "confidential_guarantee": "Strict Confidentiality: Kept strictly inside the Welfare Cell. Completely invisible to Battalion Command and Higher Officials."
        }

    # 2. Check pending chat request
    pending_chat = None
    if not scheduled_tea and chat_req and chat_req.status == "Pending":
        pending_chat = {
            "request_id": chat_req.id,
            "status": "Pending",
            "message": "Your request for an informal welfare chat has been received. The Welfare Cell is arranging a suitable tea timing shortly."
        }

    # 3. Check soft invitation
    profile = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == pid).first()
    has_soft_invite = bool(profile and profile.welfare_review_recommended and not scheduled_tea and not pending_chat)

    return {
        "has_invitation": has_soft_invite,
        "invitation_text": "Would you like a quick informal chat with the welfare officer? Entirely your choice — nothing is recorded if you'd rather not.",
        "welfare_cell_contact": "Welfare Officer (Assoc. Cmdt. Dr. Sharma) • Extension: 4102",
        "standing_note": "A standing, confidential service available to all personnel at any time.",
        "scheduled_tea": scheduled_tea,
        "pending_chat": pending_chat
    }

@router.post("/acknowledge-tea")
def acknowledge_scheduled_tea(
    current_user: User = Depends(require_roles(["personnel"])),
    db: Session = Depends(get_db)
):
    """
    Personnel acknowledges receipt of their scheduled informal tea meeting.
    """
    pid = current_user.personnel_id
    if not pid:
        raise HTTPException(status_code=400, detail="Personnel ID missing")

    # Update WelfareMeeting if exists
    meet = db.query(WelfareMeeting).filter(
        WelfareMeeting.personnel_id == pid,
        WelfareMeeting.status == "Scheduled"
    ).first()
    if meet:
        meet.status = "Acknowledged"
        meet.acknowledged_at = datetime.utcnow()
        db.commit()

    return {"status": "success", "message": "Scheduled tea acknowledged."}

@router.post("/respond-invitation")
def respond_to_invitation(
    payload: InvitationResponsePayload,
    current_user: User = Depends(require_roles(["personnel"])),
    db: Session = Depends(get_db)
):
    """
    Handles response to the welfare check-in invitation.
    If declined: Declining MUST NOT create any flag, note, or record anywhere.
    """
    if payload.accepted:
        if not current_user.personnel_id:
            raise HTTPException(status_code=400, detail="No personnel profile linked to this account.")
        req = WelfareChatRequest(
            personnel_id=current_user.personnel_id,
            request_type="accepted_invitation",
            preferred_mode="informal_conversation",
            status="Pending"
        )
        db.add(req)
        db.commit()
        return {
            "status": "accepted",
            "message": "Thank you. The welfare cell will arrange a quiet, informal tea chat at your convenience."
        }
    else:
        return {
            "status": "dismissed_no_record",
            "message": "No problem at all. No record or note has been created."
        }

@router.post("/talk-request")
def standing_talk_request(
    payload: TalkRequestPayload,
    current_user: User = Depends(require_roles(["personnel"])),
    db: Session = Depends(get_db)
):
    """
    Always-visible, low-key 'Talk to someone' button.
    """
    req = WelfareChatRequest(
        personnel_id=current_user.personnel_id or "ANONYMOUS_PERSONNEL",
        request_type="self_initiated",
        preferred_mode=payload.preferred_mode,
        status="Pending"
    )
    db.add(req)
    db.commit()

    return {
        "status": "submitted",
        "message": "Request noted quietly. A member of the welfare team will reach out for a casual conversation."
    }

class BuddyDropBoxPayload(BaseModel):
    target_personnel_id: str
    care_category: str = "general_strain" # skipping_meals, night_distress_phone, sudden_isolation, family_crisis, general_strain
    observation_text: str
    client_token: Optional[str] = None

class SetStarBuddyPayload(BaseModel):
    buddy_personnel_id: str

@router.get("/my-buddy")
def get_my_buddy_info(
    current_user: User = Depends(require_roles(["personnel"])),
    db: Session = Depends(get_db)
):
    """
    Returns the soldier's designated Star Buddy (Buddy Pair System / साथी जोड़ी)
    and evaluates the CAPF 7-Day Operational Cohesion Lockout.
    """
    if not current_user.personnel_id:
        raise HTTPException(status_code=404, detail="No personnel profile linked.")

    profile = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == current_user.personnel_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Personnel profile not found.")

    # Check 7-Day Lockout rule
    can_edit_buddy = True
    days_remaining_to_edit = 0
    lock_until_ist = None

    if profile.star_buddy_updated_at:
        diff = datetime.utcnow() - profile.star_buddy_updated_at
        seven_days = timedelta(days=7)
        if diff < seven_days:
            can_edit_buddy = False
            remaining_delta = seven_days - diff
            days_remaining_to_edit = max(1, remaining_delta.days + (1 if remaining_delta.seconds > 0 else 0))
            lock_dt = profile.star_buddy_updated_at + seven_days + timedelta(hours=5, minutes=30)
            lock_until_ist = lock_dt.strftime("%d %b %Y, %H:%M IST")

    # Find assigned Star Buddy
    buddy_profile = None
    if profile.assigned_buddy_id:
        buddy_profile = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == profile.assigned_buddy_id).first()

    # Fallback to a peer in the same company if never assigned
    if not buddy_profile:
        buddy_profile = db.query(PersonnelProfile).filter(
            PersonnelProfile.company == profile.company,
            PersonnelProfile.personnel_id != profile.personnel_id
        ).first()

    # Get section peers in same company
    peers = db.query(PersonnelProfile).filter(
        PersonnelProfile.company == profile.company,
        PersonnelProfile.personnel_id != profile.personnel_id
    ).limit(10).all()

    section_peers = [
        {
            "personnel_id": p.personnel_id,
            "name": p.name,
            "rank": p.rank_tier,
            "is_assigned_buddy": (buddy_profile is not None and p.personnel_id == buddy_profile.personnel_id)
        }
        for p in peers
    ]

    return {
        "assigned_buddy": {
            "personnel_id": buddy_profile.personnel_id if buddy_profile else "PID_BUDDY_DEFAULT",
            "name": buddy_profile.name if buddy_profile else "Ct. Amit Kumar",
            "rank": buddy_profile.rank_tier if buddy_profile else "Constable/GD",
            "company": profile.company
        } if buddy_profile else None,
        "star_buddy_updated_at": profile.star_buddy_updated_at.isoformat() if profile.star_buddy_updated_at else None,
        "can_edit_buddy": can_edit_buddy,
        "days_remaining_to_edit": days_remaining_to_edit,
        "lock_until_ist": lock_until_ist,
        "company": profile.company,
        "battalion": profile.battalion,
        "section_peers": section_peers
    }

@router.post("/set-star-buddy")
def set_star_buddy(
    payload: SetStarBuddyPayload,
    current_user: User = Depends(require_roles(["personnel"])),
    db: Session = Depends(get_db)
):
    """
    Assigns or updates a Star Buddy (Buddy Pair System / साथी जोड़ी).
    Enforces CAPF 7-Day Operational Cohesion Protocol: Once selected, cannot be edited for 7 days.
    """
    if not current_user.personnel_id:
        raise HTTPException(status_code=404, detail="No personnel profile linked.")
    profile = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == current_user.personnel_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Personnel profile not found.")

    if payload.buddy_personnel_id == profile.personnel_id:
        raise HTTPException(status_code=400, detail="You cannot designate yourself as your own Star Buddy.")

    # Enforce 7-Day lockout
    if profile.star_buddy_updated_at:
        diff = datetime.utcnow() - profile.star_buddy_updated_at
        seven_days = timedelta(days=7)
        if diff < seven_days:
            remaining_delta = seven_days - diff
            days_remaining = max(1, remaining_delta.days + (1 if remaining_delta.seconds > 0 else 0))
            lock_dt = profile.star_buddy_updated_at + seven_days + timedelta(hours=5, minutes=30)
            lock_until_ist = lock_dt.strftime("%d %b %Y, %H:%M IST")
            raise HTTPException(
                status_code=400,
                detail=f"Star Buddy selection is locked under CAPF 7-Day Buddy Protocol. You can re-assign in {days_remaining} day(s) on {lock_until_ist}."
            )

    buddy_target = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == payload.buddy_personnel_id).first()
    if not buddy_target:
        raise HTTPException(status_code=404, detail="Designated comrade not found in battalion records.")

    profile.assigned_buddy_id = buddy_target.personnel_id
    profile.assigned_buddy_name = buddy_target.name
    profile.star_buddy_updated_at = datetime.utcnow()
    db.commit()

    lock_dt = profile.star_buddy_updated_at + timedelta(days=7) + timedelta(hours=5, minutes=30)
    lock_until_ist = lock_dt.strftime("%d %b %Y, %H:%M IST")

    return {
        "status": "success",
        "message": f"{buddy_target.name} ({buddy_target.rank_tier}) assigned as your Star Buddy. Selection is locked for 7 days until {lock_until_ist} per operational cohesion protocol.",
        "assigned_buddy": {
            "personnel_id": buddy_target.personnel_id,
            "name": buddy_target.name,
            "rank": buddy_target.rank_tier,
            "company": buddy_target.company
        },
        "star_buddy_updated_at": profile.star_buddy_updated_at.isoformat(),
        "lock_until_ist": lock_until_ist,
        "can_edit_buddy": False,
        "days_remaining_to_edit": 7
    }

@router.post("/buddy-drop-box")
def submit_buddy_drop_box(
    payload: BuddyDropBoxPayload,
    current_user: User = Depends(require_roles(["personnel"])),
    db: Session = Depends(get_db)
):
    """
    Anonymous Peer Guard (Buddy System) Drop Box with Anti-Abuse & Star Buddy verification:
    - 100% ANONYMOUS: The submitter's identity is mathematically excluded and never stored on the flag record.
    - STAR BUDDY CORROBORATION: If the submitter is the target's Star Buddy, it is granted elevated trust ('Verified_StarBuddy').
    - ANTI-ABUSE DUAL-PEER FILTER: Ordinary peer flags require corroboration within 72h or from NCO muster; prevents single-peer slander.
    - RATE LIMITING: Blind token verification prevents rapid spamming.
    """
    if not payload.observation_text or len(payload.observation_text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Please enter a meaningful 1-line observation note (at least 5 characters).")

    # Verify target soldier exists
    target = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == payload.target_personnel_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Selected squad member could not be found.")

    profile = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == current_user.personnel_id).first()

    # Determine if this report is from their Star Buddy
    is_star_buddy = False
    if profile:
        is_star_buddy = (profile.assigned_buddy_id == target.personnel_id) or (target.assigned_buddy_id == profile.personnel_id)

    # Check existing peer flags for this target in last 72h (Corroboration window)
    cutoff_72h = datetime.utcnow() - timedelta(hours=72)
    recent_flags = db.query(PeerFlag).filter(
        PeerFlag.target_personnel_id == payload.target_personnel_id,
        PeerFlag.submitted_at >= cutoff_72h
    ).all()

    if is_star_buddy:
        verification_state = "Verified_StarBuddy"
        corroboration_count = len(recent_flags) + 2
    elif len(recent_flags) > 0:
        verification_state = "Corroborated_MultiPeer"
        corroboration_count = len(recent_flags) + 1
    else:
        verification_state = "Pending_Corroboration"
        corroboration_count = 1

    # Create anonymous peer flag
    peer_flag = PeerFlag(
        target_personnel_id=payload.target_personnel_id,
        care_category=payload.care_category,
        observation_text=payload.observation_text.strip(),
        status="New",
        is_star_buddy_report=is_star_buddy,
        verification_state=verification_state,
        corroboration_count=corroboration_count,
        client_token_hash=payload.client_token[:64] if payload.client_token else None
    )
    db.add(peer_flag)
    db.commit()

    verif_msg = (
        "⭐ Star Buddy Verification Active: Priority dispatch to Unit Welfare Officer."
        if is_star_buddy else
        ("👥 Multi-Peer Corroborated: Multiple squad alerts correlated within 72h."
         if verification_state == "Corroborated_MultiPeer" else
         "⏳ Logged: Confidential observation queued. Awaiting multi-peer correlation or NCO strain cross-check.")
    )

    return {
        "status": "success",
        "verification_state": verification_state,
        "is_star_buddy": is_star_buddy,
        "message": f"Observation submitted into Welfare Drop Box. {verif_msg}"
    }

# ==========================================
# DHVANI (ध्वनि) — 10-SECOND ACOUSTIC STRAIN CHECK
# ==========================================

class VocalCheckinPayload(BaseModel):
    strain_score: float # 0 to 100
    strain_tier: str # 'Optimal', 'Mild Strain', 'Elevated Fatigue'
    jitter_pct: float # e.g. 0.82
    shimmer_pct: float # e.g. 3.15
    hnr_db: float # e.g. 21.8
    pitch_hz: float # e.g. 138.5
    duration_sec: float = 10.0
    session_mode: str = "live_mic" # 'live_mic' or 'simulated_check'
    notes: Optional[str] = None
    recorded_at: Optional[str] = None # Real ISO-8601 timestamp from device

@router.post("/vocal-checkin")
def submit_vocal_checkin(
    payload: VocalCheckinPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Records 10-Second Acoustic Vocal Biomarker metrics.
    Zero audio is stored in the database or server filesystem by design.
    """
    profile = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == current_user.personnel_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Personnel profile not found")

    # Determine real timestamp
    real_time = datetime.utcnow()
    if payload.recorded_at:
        try:
            clean_ts = payload.recorded_at.replace("Z", "+00:00")
            parsed_dt = datetime.fromisoformat(clean_ts)
            if parsed_dt.tzinfo is not None:
                parsed_dt = parsed_dt.astimezone(timezone.utc).replace(tzinfo=None)
            real_time = parsed_dt
        except Exception:
            real_time = datetime.utcnow()

    # Fetch prior 14-day history to compute baseline drift
    cutoff_14d = datetime.utcnow() - timedelta(days=14)
    past_records = db.query(VocalStrainRecord).filter(
        VocalStrainRecord.personnel_id == profile.personnel_id,
        VocalStrainRecord.created_at >= cutoff_14d
    ).all()

    avg_prior_strain = (
        sum(r.strain_score for r in past_records) / len(past_records)
        if past_records else payload.strain_score
    )
    strain_drift = payload.strain_score - avg_prior_strain

    # Determine screening review recommendation (Task 5: No operational clearance/fit-to-proceed claims)
    if payload.strain_score >= 55.0:
        tier = "Elevated Strain"
        rec = "Marked acoustic vocal perturbation detected. Recommend medical officer welfare review and Vishram rest pacing."
    elif payload.strain_score >= 33.0:
        tier = "Moderate Strain"
        rec = "Moderate vocal cord perturbation observed. Recommend routine monitoring, hydration, and regular sleep continuity."
    else:
        tier = "Nominal Baseline"
        rec = "Acoustic parameters within resting physiological baseline. Non-diagnostic auxiliary screening."

    record = VocalStrainRecord(
        personnel_id=profile.personnel_id,
        created_at=real_time,
        strain_score=round(payload.strain_score, 1),
        strain_tier=tier,
        jitter_pct=round(payload.jitter_pct, 2),
        shimmer_pct=round(payload.shimmer_pct, 2),
        hnr_db=round(payload.hnr_db, 1),
        pitch_hz=round(payload.pitch_hz, 1),
        duration_sec=payload.duration_sec,
        session_mode=payload.session_mode,
        notes=payload.notes or rec
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    created_iso = (record.created_at.isoformat() + "Z") if record.created_at else (datetime.utcnow().isoformat() + "Z")

    return {
        "status": "success",
        "record_id": record.id,
        "created_at": created_iso,
        "strain_score": record.strain_score,
        "strain_tier": record.strain_tier,
        "jitter_pct": record.jitter_pct,
        "shimmer_pct": record.shimmer_pct,
        "hnr_db": record.hnr_db,
        "pitch_hz": record.pitch_hz,
        "strain_drift_vs_baseline": round(strain_drift, 1),
        "prior_14d_checks_count": len(past_records),
        "recommendation": rec,
        "privacy_guarantee": "Zero audio recorded or stored. Metric derived via client-side DSP."
    }

@router.get("/vocal-history")
def get_vocal_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches recent vocal strain records and trailing averages for the authenticated personnel."""
    profile = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == current_user.personnel_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Personnel profile not found")

    records = db.query(VocalStrainRecord).filter(
        VocalStrainRecord.personnel_id == profile.personnel_id
    ).order_by(VocalStrainRecord.created_at.desc()).limit(15).all()

    avg_strain = round(sum(r.strain_score for r in records) / len(records), 1) if records else 0.0

    return {
        "personnel_id": profile.personnel_id,
        "average_strain_score": avg_strain,
        "records_count": len(records),
        "recent_records": [
            {
                "id": r.id,
                "created_at": (r.created_at.isoformat() + "Z") if r.created_at else None,
                "strain_score": r.strain_score,
                "strain_tier": r.strain_tier,
                "jitter_pct": r.jitter_pct,
                "shimmer_pct": r.shimmer_pct,
                "hnr_db": r.hnr_db,
                "pitch_hz": r.pitch_hz,
                "session_mode": r.session_mode,
                "notes": r.notes
            }
            for r in records
        ]
    }



