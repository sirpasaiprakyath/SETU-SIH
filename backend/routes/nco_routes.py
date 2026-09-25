from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
import json
from database import get_db
from models import User, PersonnelProfile, MusterObservation, PeerFlag, CaseRecord, AuditLog
from auth import require_roles

router = APIRouter(prefix="/api/nco", tags=["NCO Section Commander"])

IST_TZ = timezone(timedelta(hours=5, minutes=30))

class MusterItem(BaseModel):
    personnel_id: str
    concern_score: int  # 1 to 5
    note: Optional[str] = None

class MusterBatchRequest(BaseModel):
    observations: List[MusterItem]
    force_resubmit: Optional[bool] = False

class PeerFlagRequest(BaseModel):
    target_personnel_id: str
    observation_text: str

@router.get("/section-roster")
def get_section_roster(
    current_user: User = Depends(require_roles(["nco", "welfare_officer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Returns section roster for bi-daily muster observation (48h-72h routine).
    Scheduled once every 2-3 days to prevent daily reporting fatigue.
    Scoped to the NCO's company or primary section.
    """
    company = current_user.company or "Company-C (Delta Platoon)"
    personnel_list = db.query(PersonnelProfile).filter(PersonnelProfile.company == company).limit(12).all()

    # If few match, grab the first 10 for demo completeness
    if len(personnel_list) < 4:
        personnel_list = db.query(PersonnelProfile).limit(10).all()

    roster = []
    for p in personnel_list:
        roster.append({
            "personnel_id": p.personnel_id,
            "name": p.name,
            "rank": p.rank_tier,
            "force": p.force,
            "company": p.company,
            "current_observation_baseline": p.nco_observation_baseline,
            "last_observation_score": p.nco_observation_current
        })

    # Check if this NCO has already recorded a muster within the active cycle window
    now = datetime.now(timezone.utc)
    latest_obs = (
        db.query(MusterObservation)
        .filter(MusterObservation.nco_username == current_user.username)
        .order_by(MusterObservation.observed_date.desc())
        .first()
    )
    is_cycle_locked = False
    last_submitted_str = None
    next_due_str = None
    if latest_obs and latest_obs.observed_date:
        obs_dt = latest_obs.observed_date
        if obs_dt.tzinfo is None:
            obs_dt = obs_dt.replace(tzinfo=timezone.utc)
        elapsed_hours = (now - obs_dt).total_seconds() / 3600.0
        # Active cycle lockout window (24h cooldown within 48h-72h operational cadence)
        if elapsed_hours < 24.0:
            is_cycle_locked = True
            last_submitted_str = obs_dt.astimezone(IST_TZ).strftime("%d %b %Y, %I:%M %p IST")
            next_due_str = (obs_dt + timedelta(hours=48)).astimezone(IST_TZ).strftime("%d %b %Y, %I:%M %p IST")

    return {
        "section_name": f"{current_user.rank} • {company}",
        "cadence": "Bi-Daily (48h–72h Routine)",
        "roster": roster,
        "is_cycle_locked": is_cycle_locked,
        "last_submitted_at": last_submitted_str,
        "next_muster_due": next_due_str
    }

@router.post("/reset-cycle-demo")
def reset_nco_muster_demo(
    current_user: User = Depends(require_roles(["nco", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Clears recent muster observations for this NCO to allow testing a fresh 48h–72h cycle.
    """
    db.query(MusterObservation).filter(MusterObservation.nco_username == current_user.username).delete()
    db.commit()
    return {
        "status": "success",
        "message": "Section muster cycle reset successfully. You can now perform a fresh 48h–72h observation check."
    }

@router.post("/muster-batch")
def submit_muster_batch(
    payload: MusterBatchRequest,
    current_user: User = Depends(require_roles(["nco", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Fast batch submission of 1-5 concern scores for the full section.
    Enforces bi-daily cycle protection: prevents double-submitting in the next second.
    """
    now = datetime.now(timezone.utc)
    latest_obs = (
        db.query(MusterObservation)
        .filter(MusterObservation.nco_username == current_user.username)
        .order_by(MusterObservation.observed_date.desc())
        .first()
    )
    if latest_obs and latest_obs.observed_date and not payload.force_resubmit:
        obs_dt = latest_obs.observed_date
        if obs_dt.tzinfo is None:
            obs_dt = obs_dt.replace(tzinfo=timezone.utc)
        elapsed_sec = (now - obs_dt).total_seconds()
        if elapsed_sec < 30:
            raise HTTPException(
                status_code=429,
                detail="Muster observation was just recorded seconds ago. Please allow the 48h–72h cycle to complete before submitting again."
            )
        elif elapsed_sec < 3600 * 24:
            raise HTTPException(
                status_code=400,
                detail=f"Section muster already recorded for this 48h cycle on {obs_dt.astimezone(IST_TZ).strftime('%d %b %Y, %I:%M %p IST')}. Next cycle scheduled in 48 hours."
            )

    saved_count = 0
    from model_service import model_service

    for item in payload.observations:
        obs = MusterObservation(
            nco_username=current_user.username,
            personnel_id=item.personnel_id,
            concern_score=item.concern_score,
            note=item.note,
            observed_date=datetime.utcnow()
        )
        db.add(obs)

        # Update profile observation and deviation
        profile = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == item.personnel_id).first()
        if profile:
            profile.nco_observation_current = float(item.concern_score)
            profile.nco_observation_deviation = profile.nco_observation_current - profile.nco_observation_baseline
            
            # Recalculate composite personal baseline deviation safely
            sick_dev = profile.sick_reports_deviation or 0.0
            nco_dev = profile.nco_observation_deviation or 0.0
            leave_util = profile.leave_utilization_ratio if profile.leave_utilization_ratio is not None else 0.5
            profile.baseline_deviation_composite = round(
                0.35 * (sick_dev / 1.5) +
                0.35 * (nco_dev / 0.8) +
                0.30 * ((1.0 - leave_util) * 2.0),
                3
            )
            
            # Re-evaluate model prediction dynamically
            prob, is_flagged, plain_reasons = model_service.predict(profile)
            profile.review_likelihood = prob
            profile.welfare_review_recommended = is_flagged
            profile.plain_reasons_json = json.dumps(plain_reasons)

            # Auto-escalate to Welfare Officer Queue if concern is elevated (score >= 3 or deviation >= 0.5)
            if item.concern_score >= 3 or profile.nco_observation_deviation >= 0.5:
                muster_reason = (
                    f"Section Commander ({current_user.full_name}) Bi-Daily Muster: Elevated concern ({item.concern_score}/5). "
                    f"Note: {item.note if item.note else 'Observed behavioral drift during muster roll-call check.'}"
                )
                existing_case = db.query(CaseRecord).filter(CaseRecord.personnel_id == item.personnel_id).first()
                if existing_case:
                    try:
                        existing_reasons = json.loads(existing_case.plain_reasons_json)
                    except Exception:
                        existing_reasons = []
                    if muster_reason not in existing_reasons:
                        existing_reasons.insert(0, muster_reason)
                    existing_case.plain_reasons_json = json.dumps(existing_reasons[:5])
                    existing_case.likelihood = max(existing_case.likelihood, round(min(0.95, 0.48 + (item.concern_score * 0.10)), 2))
                    existing_case.status = "Open"
                else:
                    new_case = CaseRecord(
                        personnel_id=item.personnel_id,
                        flagged_date=datetime.now(timezone.utc),
                        likelihood=round(min(0.95, 0.55 + (item.concern_score * 0.08)), 2),
                        plain_reasons_json=json.dumps([
                            muster_reason,
                            "Bi-daily section roll-call observation escalated for proactive Welfare Officer evaluation."
                        ]),
                        status="Open"
                    )
                    db.add(new_case)

        saved_count += 1

    # Record Audit Event
    audit_entry = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role,
        action="SUBMIT_SECTION_MUSTER",
        details=f"NCO Section Commander {current_user.full_name} ({current_user.username}) submitted 48–72h bi-daily section muster for {saved_count} personnel in {current_user.company or 'Company-C'}.",
        ip_address="127.0.0.1",
        timestamp=datetime.utcnow()
    )
    db.add(audit_entry)

    db.commit()
    return {
        "status": "success",
        "saved_count": saved_count,
        "cadence": "Bi-Daily (48h–72h Routine)",
        "message": f"Bi-daily section muster submitted successfully for {saved_count} personnel. Observations forwarded to Welfare Officer report ledger."
    }

@router.post("/peer-flag")
def submit_anonymous_peer_flag(
    payload: PeerFlagRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Separate, lightweight peer-flag intake:
    Anonymous, one field ('something seems off with [name] lately, can someone check'),
    no form, no justification required, NOT tied to observer's identity in what welfare officer sees.
    """
    target_pid = payload.target_personnel_id.strip()
    profile = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == target_pid).first()
    if not profile:
        raise HTTPException(status_code=404, detail=f"Personnel service record with ID '{target_pid}' not found.")

    flag = PeerFlag(
        target_personnel_id=target_pid,
        observation_text=payload.observation_text.strip(),
        submitted_at=datetime.now(timezone.utc),
        status="New"
    )
    db.add(flag)

    client_ip = request.client.host if (request and request.client) else "127.0.0.1"
    audit_entry = AuditLog(
        user_id=None,
        username="anonymous_peer",
        user_role="personnel",
        action="SUBMIT_ANONYMOUS_PEER_FLAG",
        target_personnel_id=target_pid,
        details=f"Anonymous peer-flag intake submitted for personnel {target_pid}.",
        ip_address=client_ip,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit_entry)

    db.commit()

    return {
        "status": "recorded_anonymously",
        "message": "Observation noted anonymously. Thank you for looking out for your team."
    }
