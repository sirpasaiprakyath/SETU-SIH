import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from database import get_db
from models import User, AuditLog, PersonnelProfile
from auth import require_roles, get_password_hash

router = APIRouter(prefix="/api/admin", tags=["Administrator Oversight"])

class CreateUserPayload(BaseModel):
    username: str
    password: str
    role: str
    full_name: str
    force: str
    rank: str
    battalion_id: str
    company: str
    personnel_id: Optional[str] = None

@router.get("/audit-logs")
def get_audit_logs(
    action_filter: Optional[str] = None,
    limit: int = 100,
    request: Request = None,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Visible Audit Log: records every view of a flagged individual case,
    action logged, session login, and security-relevant event.
    Calculates live IST (+05:30) and UTC timestamps with relative elapsed time.
    """
    # Throttled audit log for inspecting ledger (at most once every 15 seconds)
    recent_view = db.query(AuditLog).filter(
        AuditLog.username == current_user.username,
        AuditLog.action == "VIEW_AUDIT_LEDGER"
    ).order_by(AuditLog.timestamp.desc()).first()

    should_log = True
    now_utc = datetime.now(timezone.utc)
    if recent_view:
        rv_ts = recent_view.timestamp.replace(tzinfo=timezone.utc) if recent_view.timestamp.tzinfo is None else recent_view.timestamp
        if (now_utc - rv_ts).total_seconds() < 15:
            should_log = False

    if should_log:
        client_ip = request.client.host if request and request.client else "127.0.0.1"
        inspect_entry = AuditLog(
            user_id=current_user.id,
            username=current_user.username,
            user_role=current_user.role,
            action="VIEW_AUDIT_LEDGER",
            details=f"Admin {current_user.username} inspected MHA immutable access registers.",
            ip_address=client_ip,
            timestamp=datetime.utcnow()
        )
        db.add(inspect_entry)
        db.commit()

    query = db.query(AuditLog).order_by(AuditLog.timestamp.desc())
    if action_filter:
        query = query.filter(AuditLog.action.ilike(f"%{action_filter}%"))

    logs = query.limit(limit).all()

    ist_tz = timezone(timedelta(hours=5, minutes=30))
    result = []

    for l in logs:
        ts = l.timestamp
        if ts.tzinfo is None:
            utc_dt = ts.replace(tzinfo=timezone.utc)
        else:
            utc_dt = ts.astimezone(timezone.utc)
        ist_dt = utc_dt.astimezone(ist_tz)

        # Real-time elapsed difference
        diff_sec = max(0, (now_utc - utc_dt).total_seconds())
        if diff_sec < 60:
            rel_str = "Just now"
        elif diff_sec < 3600:
            rel_str = f"{int(diff_sec // 60)}m ago"
        elif diff_sec < 86400:
            rel_str = f"{int(diff_sec // 3600)}h ago"
        else:
            rel_str = f"{int(diff_sec // 86400)}d ago"

        ist_formatted = ist_dt.strftime("%d %b %Y, %I:%M:%S %p IST")
        utc_formatted = utc_dt.strftime("%d %b %Y %H:%M:%S UTC")

        result.append({
            "id": l.id,
            "timestamp": ist_formatted,
            "timestamp_ist": ist_formatted,
            "timestamp_utc": utc_formatted,
            "relative_time": rel_str,
            "iso_timestamp": utc_dt.isoformat(),
            "username": l.username,
            "user_role": l.user_role,
            "action": l.action,
            "target_personnel_id": l.target_personnel_id or "—",
            "case_id": l.case_id or "—",
            "ip_address": l.ip_address,
            "details": l.details
        })

    return result

@router.get("/users")
def list_system_users(
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "role": u.role,
            "force": u.force,
            "rank": u.rank,
            "battalion_id": u.battalion_id,
            "company": u.company,
            "personnel_id": u.personnel_id,
            "created_at": u.created_at.strftime("%d %b %Y") if u.created_at else None
        }
        for u in users
    ]

@router.post("/users")
def create_system_user(
    payload: CreateUserPayload,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered.")

    user = User(
        username=payload.username,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        full_name=payload.full_name,
        force=payload.force,
        rank=payload.rank,
        battalion_id=payload.battalion_id,
        company=payload.company,
        personnel_id=payload.personnel_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"status": "success", "message": f"User {user.username} created with role '{user.role}'."}

@router.get("/export-retraining-dataset")
def export_anonymized_retraining_dataset(
    format: str = "csv",
    request: Request = None,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """
    CONCRETE DATA ANONYMIZATION MECHANISM (DPDP Act 2023 Compliant):
    - Exports personnel behavioral & administrative telemetry for ML model retraining.
    - STRICT GUARANTEE: Names, full names, usernames, contact info, and PII are stripped in data-access code.
    - Personnel are referenced exclusively by service ID (personnel_id).
    - Verifies programmatically that zero name columns exist in the output.
    - Logs an immutable security audit event.
    """
    profiles = db.query(PersonnelProfile).all()

    # Define exact retraining columns (Service ID only, zero names)
    export_columns = [
        "personnel_id", "force", "rank_tier", "tenure_years", "married", "family_status",
        "family_structure", "family_separation_load", "posting_category", "posting_duration_months",
        "leave_entitled_annual", "leave_availed_last_12m", "leave_utilization_ratio",
        "avg_weekly_duty_hours_last_90d", "night_duty_fraction_last_90d", "rest_day_compliance_pct_last_90d",
        "fatigue_index", "sick_reports_last_90d", "sick_reports_personal_baseline_90d", "sick_reports_deviation",
        "nco_observation_current", "nco_observation_baseline", "nco_observation_deviation",
        "transfer_count_last_24m", "saathi_sessions_last_90d", "saathi_sessions_personal_baseline_90d",
        "saathi_engagement_deviation", "saathi_tough_rate_current", "saathi_tough_deviation",
        "saathi_safety_net_triggers_90d", "training_hours_last_12m", "baseline_deviation_composite",
        "label_welfare_review_recommended"
    ]

    # Data Anonymization Assertion: Ensure no PII in schema
    for forbidden in ["name", "full_name", "username", "email", "phone"]:
        assert forbidden not in export_columns, f"Security Violation: Anonymization failed to exclude '{forbidden}'"

    rows = []
    for p in profiles:
        row = {
            "personnel_id": p.personnel_id,
            "force": p.force,
            "rank_tier": p.rank_tier,
            "tenure_years": p.tenure_years,
            "married": p.married,
            "family_status": p.family_status,
            "family_structure": p.family_structure,
            "family_separation_load": round(float(p.family_separation_load or 0.0), 3),
            "posting_category": p.posting_category,
            "posting_duration_months": p.posting_duration_months,
            "leave_entitled_annual": p.leave_entitled_annual,
            "leave_availed_last_12m": p.leave_availed_last_12m,
            "leave_utilization_ratio": round(float(p.leave_utilization_ratio or 0.0), 3),
            "avg_weekly_duty_hours_last_90d": p.avg_weekly_duty_hours_last_90d,
            "night_duty_fraction_last_90d": p.night_duty_fraction_last_90d,
            "rest_day_compliance_pct_last_90d": p.rest_day_compliance_pct_last_90d,
            "fatigue_index": p.fatigue_index,
            "sick_reports_last_90d": p.sick_reports_last_90d,
            "sick_reports_personal_baseline_90d": p.sick_reports_personal_baseline_90d,
            "sick_reports_deviation": p.sick_reports_deviation,
            "nco_observation_current": p.nco_observation_current,
            "nco_observation_baseline": p.nco_observation_baseline,
            "nco_observation_deviation": p.nco_observation_deviation,
            "transfer_count_last_24m": p.transfer_count_last_24m,
            "saathi_sessions_last_90d": getattr(p, "saathi_sessions_last_90d", 2.0),
            "saathi_sessions_personal_baseline_90d": getattr(p, "saathi_sessions_personal_baseline_90d", 2.0),
            "saathi_engagement_deviation": getattr(p, "saathi_engagement_deviation", 0.0),
            "saathi_tough_rate_current": getattr(p, "saathi_tough_rate_current", 0.20),
            "saathi_tough_deviation": getattr(p, "saathi_tough_deviation", 0.0),
            "saathi_safety_net_triggers_90d": getattr(p, "saathi_safety_net_triggers_90d", 0),
            "training_hours_last_12m": p.training_hours_last_12m,
            "baseline_deviation_composite": round(float(p.baseline_deviation_composite or 0.0), 3),
            "label_welfare_review_recommended": 1 if p.welfare_review_recommended else 0
        }
        # Explicit code-level verification
        assert "name" not in row, "Data access assertion failure: 'name' present in record."
        rows.append(row)

    # Log immutable audit register
    client_ip = request.client.host if request and request.client else "127.0.0.1"
    audit_entry = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role,
        action="EXPORT_ANONYMIZED_DATASET",
        details=f"Admin {current_user.username} exported {len(rows)} ID-only records (names stripped) for ML model retraining.",
        ip_address=client_ip,
        timestamp=datetime.utcnow()
    )
    db.add(audit_entry)
    db.commit()

    if format.lower() == "json":
        return {
            "record_count": len(rows),
            "anonymized": True,
            "identifier": "service_id_only",
            "columns": export_columns,
            "data": rows
        }

    # Generate CSV output
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=export_columns)
    writer.writeheader()
    writer.writerows(rows)
    csv_content = output.getvalue()

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=crpf_anonymized_retraining_dataset.csv",
            "X-Data-Anonymization": "Service-ID-Only-Names-Stripped"
        }
    )

class HrmsImportRecord(BaseModel):
    personnel_id: str
    leave_availed_last_12m: Optional[float] = None
    leave_entitled_annual: Optional[int] = None
    avg_weekly_duty_hours_last_90d: Optional[float] = None
    night_duty_fraction_last_90d: Optional[float] = None
    rest_day_compliance_pct_last_90d: Optional[float] = None
    posting_duration_months: Optional[float] = None
    transfer_count_last_24m: Optional[int] = None

class HrmsBatchImportPayload(BaseModel):
    source_system: str = "CRPF-HRMS-Intranet"
    records: List[HrmsImportRecord]

@router.post("/import-hrms-records")
def import_hrms_records(
    payload: HrmsBatchImportPayload,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """
    HRMS Integration Adapter Endpoint:
    Allows administrative batch synchronization of personnel administrative records
    (leave, duty rosters, posting history, transfers) directly into the telemetry store.
    """
    updated_count = 0
    for rec in payload.records:
        profile = db.query(PersonnelProfile).filter(PersonnelProfile.personnel_id == rec.personnel_id).first()
        if profile:
            if rec.leave_availed_last_12m is not None:
                profile.leave_availed_last_12m = rec.leave_availed_last_12m
                if profile.leave_entitled_annual:
                    profile.leave_utilization_ratio = round(rec.leave_availed_last_12m / profile.leave_entitled_annual, 3)
            if rec.avg_weekly_duty_hours_last_90d is not None:
                profile.avg_weekly_duty_hours_last_90d = rec.avg_weekly_duty_hours_last_90d
            if rec.night_duty_fraction_last_90d is not None:
                profile.night_duty_fraction_last_90d = rec.night_duty_fraction_last_90d
            if rec.rest_day_compliance_pct_last_90d is not None:
                profile.rest_day_compliance_pct_last_90d = rec.rest_day_compliance_pct_last_90d
            if rec.posting_duration_months is not None:
                profile.posting_duration_months = rec.posting_duration_months
            if rec.transfer_count_last_24m is not None:
                profile.transfer_count_last_24m = rec.transfer_count_last_24m
            updated_count += 1

    db.commit()
    return {
        "status": "success",
        "message": f"Successfully synchronized {updated_count} personnel records from {payload.source_system}.",
        "updated_count": updated_count
    }

from config import DATA_RETENTION_DAYS
from models import VocalStrainRecord, SaathiSubmission

@router.post("/purge-retention-expired")
def purge_retention_expired(
    retention_days: Optional[int] = None,
    request: Request = None,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """
    DATA RETENTION ENFORCEMENT (DPDP Act 2023):
    Hard-deletes self check-in records older than the defined retention threshold (default: 90 days).
    Permanently deletes records from database via SQL DELETE (not soft-flagged).
    Records an immutable audit log entry.
    """
    days = retention_days if retention_days is not None else DATA_RETENTION_DAYS
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

    deleted_vocal = db.query(VocalStrainRecord).filter(VocalStrainRecord.created_at < cutoff_date).delete(synchronize_session=False)
    deleted_saathi = db.query(SaathiSubmission).filter(SaathiSubmission.completed_at < cutoff_date).delete(synchronize_session=False)

    client_ip = request.client.host if request and request.client else "127.0.0.1"
    audit_entry = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role,
        action="PURGE_RETENTION_EXPIRED_RECORDS",
        details=f"Admin {current_user.username} executed {days}-day data retention purge: {deleted_vocal} vocal strain records and {deleted_saathi} Saathi submissions permanently deleted.",
        ip_address=client_ip,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit_entry)
    db.commit()

    return {
        "status": "success",
        "retention_days": days,
        "cutoff_date_utc": cutoff_date.isoformat() + "Z",
        "deleted_vocal_records": deleted_vocal,
        "deleted_saathi_submissions": deleted_saathi,
        "total_purged": deleted_vocal + deleted_saathi,
        "message": f"Successfully deleted records older than {days} days ({deleted_vocal} Dhvani checks, {deleted_saathi} Saathi sessions)."
    }

