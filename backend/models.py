from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False)  # 'personnel', 'nco', 'welfare_officer', 'command', 'admin', 'doctor'
    full_name = Column(String(100), nullable=False)
    force = Column(String(50), default="CRPF")
    rank = Column(String(50), default="Constable/GD")
    battalion_id = Column(String(50), default="Battalion-12")
    company = Column(String(50), default="Company-C")
    personnel_id = Column(String(50), nullable=True, index=True)  # Links to PersonnelProfile if role == 'personnel'
    created_at = Column(DateTime, default=datetime.utcnow)

class PersonnelProfile(Base):
    __tablename__ = "personnel_profiles"

    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    force = Column(String(50), nullable=False, index=True)
    rank_tier = Column(String(50), nullable=False)
    company = Column(String(50), default="Company-A")
    battalion = Column(String(50), default="2nd Battalion")
    tenure_years = Column(Float, default=5.0)
    married = Column(Boolean, default=False)
    family_structure = Column(String(50), default="nuclear") # nuclear / joint / n/a (onboarding field)
    family_status = Column(String(50), default="with_family")
    family_separation_load = Column(Float, default=0.0) # posting_duration_months * (1.6 if sep & nuclear else 1.0 if sep & joint else 0)/12
    posting_category = Column(String(50), default="peace_station")
    posting_duration_months = Column(Float, default=6.0)
    leave_entitled_annual = Column(Integer, default=30)
    leave_availed_last_12m = Column(Float, default=15.0)
    leave_utilization_ratio = Column(Float, default=0.5)
    avg_weekly_duty_hours_last_90d = Column(Float, default=45.0)
    night_duty_fraction_last_90d = Column(Float, default=0.15)
    rest_day_compliance_pct_last_90d = Column(Float, default=95.0)
    fatigue_index = Column(Float, default=25.0) # SAFTE-FAST inspired proxy
    sick_reports_last_90d = Column(Float, default=1.0)
    sick_reports_personal_baseline_90d = Column(Float, default=1.0)
    sick_reports_deviation = Column(Float, default=0.0)
    nco_observation_current = Column(Float, default=2.0)
    nco_observation_baseline = Column(Float, default=2.0)
    nco_observation_deviation = Column(Float, default=0.0)
    transfer_count_last_24m = Column(Integer, default=0)
    # Saathi structured-signal features (wire directly to outcome risk model)
    saathi_sessions_last_90d = Column(Float, default=2.0)
    saathi_sessions_personal_baseline_90d = Column(Float, default=2.0)
    saathi_engagement_deviation = Column(Float, default=0.0)
    saathi_tough_rate_current = Column(Float, default=0.20)
    saathi_tough_deviation = Column(Float, default=0.0)
    saathi_safety_net_triggers_90d = Column(Integer, default=0)
    training_hours_last_12m = Column(Float, default=40.0)
    baseline_deviation_composite = Column(Float, default=0.0)
    
    # Model output cached
    welfare_review_recommended = Column(Boolean, default=False)
    review_likelihood = Column(Float, default=0.0) # Likelihood person would benefit from welfare check-in
    plain_reasons_json = Column(Text, default="[]") # JSON list of top-3 plain reasons
    last_evaluated_at = Column(DateTime, default=datetime.utcnow)

    # Buddy Pair System (दोस्ती / साथी प्रणाली)
    assigned_buddy_id = Column(String(50), nullable=True)
    assigned_buddy_name = Column(String(100), nullable=True)
    star_buddy_updated_at = Column(DateTime, nullable=True) # Enforces 7-day cohesion lockout before edits

    # Relationship to cases and medical records
    cases = relationship("CaseRecord", back_populates="personnel")
    medical_camp_records = relationship("MedicalCampRecord", back_populates="personnel")

class CaseRecord(Base):
    __tablename__ = "case_records"

    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(String(50), ForeignKey("personnel_profiles.personnel_id"), nullable=False, index=True)
    flagged_date = Column(DateTime, default=datetime.utcnow)
    likelihood = Column(Float, nullable=False) # e.g. 0.78
    plain_reasons_json = Column(Text, nullable=False) # Top 3 contributing baseline shifts
    status = Column(String(30), default="Open") # 'Open', 'Under Review', 'Contacted', 'Resolved'
    officer_action = Column(String(100), nullable=True) # E.g. 'Informal tea meeting scheduled'
    outcome = Column(String(100), nullable=True) # 'contacted', 'not_needed', 'escalated_to_counselling', 'leave_recommended', 'routine_followup'
    notes = Column(Text, nullable=True)
    action_logged_at = Column(DateTime, nullable=True)
    officer_username = Column(String(50), nullable=True)

    personnel = relationship("PersonnelProfile", back_populates="cases")

class MusterObservation(Base):
    """Daily section muster observation form submitted by NCO (<30s)."""
    __tablename__ = "muster_observations"

    id = Column(Integer, primary_key=True, index=True)
    nco_username = Column(String(50), nullable=False)
    personnel_id = Column(String(50), nullable=False, index=True)
    concern_score = Column(Integer, nullable=False) # 1 (Normal) to 5 (High Concern)
    note = Column(String(255), nullable=True)
    observed_date = Column(DateTime, default=datetime.utcnow)

class PeerFlag(Base):
    """Anonymous peer-flag intake. Completely disconnected from submitter's identity."""
    __tablename__ = "peer_flags"

    id = Column(Integer, primary_key=True, index=True)
    target_personnel_id = Column(String(50), nullable=False, index=True)
    care_category = Column(String(100), default="general_strain") # skipping_meals, night_distress_phone, sudden_isolation, family_crisis, general_strain
    observation_text = Column(Text, nullable=False) # E.g. 'something seems off with Constable Sharma lately'
    submitted_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(30), default="New") # 'New', 'Reviewed', 'Scheduled_Tea', 'Completed_Informal', 'Dismissed_NonWelfare'
    scheduled_tea_at = Column(String(100), nullable=True) # E.g. "Tomorrow 16:30 at Welfare Post"
    welfare_notes = Column(Text, nullable=True) # Confidential notes for the Welfare Officer (hidden from Command)
    # Anti-Abuse & Star Buddy Corroboration Engine
    is_star_buddy_report = Column(Boolean, default=False)
    verification_state = Column(String(50), default="Pending_Corroboration") # 'Verified_StarBuddy', 'Corroborated_MultiPeer', 'Pending_Corroboration'
    corroboration_count = Column(Integer, default=1)
    client_token_hash = Column(String(64), nullable=True) # For 72h blind rate-limiting

class WelfareChatRequest(Base):
    """Standing optional help door ('Talk to someone') or accepted invitation."""
    __tablename__ = "welfare_chat_requests"

    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(String(50), nullable=False, index=True)
    request_type = Column(String(50), default="self_initiated") # 'self_initiated', 'accepted_invitation'
    preferred_mode = Column(String(50), default="informal_conversation")
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(30), default="Pending")
    scheduled_at = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

class AuditLog(Base):
    """Immutable audit trail for monitoring who viewed individual flagged cases."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String(50), nullable=False, index=True)
    user_role = Column(String(30), nullable=False)
    action = Column(String(100), nullable=False) # E.g. 'VIEW_FLAGGED_CASE', 'LOG_CASE_ACTION', 'USER_LOGIN'
    target_personnel_id = Column(String(50), nullable=True, index=True)
    case_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), default="127.0.0.1")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

class SaathiSubmission(Base):
    """Completed Saathi adaptive check-in sessions with model verification results."""
    __tablename__ = "saathi_submissions"

    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(String(50), ForeignKey("personnel_profiles.personnel_id"), nullable=False, index=True)
    completed_at = Column(DateTime, default=datetime.utcnow, index=True)
    posting_context = Column(String(100), nullable=False)
    duty_category = Column(String(100), nullable=False)
    answers_json = Column(Text, nullable=False) # JSON dict of questions and selected answer keys
    model_verification_score = Column(Float, default=0.85) # 0.0 to 1.0 well-being resilience index
    strain_tier = Column(String(50), default="Optimal") # 'Optimal', 'Mild Strain', 'Elevated Strain'
    verification_summary = Column(Text, nullable=False)
    recommendations_json = Column(Text, default="[]")
    requested_welfare_outreach = Column(Boolean, default=False)
    private_notes = Column(Text, nullable=True) # Kept strictly private on user record unless requested outreach

class SaathiNotification(Base):
    """Gentle nudges sent by Welfare Officers to encourage personnel to check in."""
    __tablename__ = "saathi_notifications"

    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(String(50), nullable=False, index=True)
    sender_officer = Column(String(100), nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow, index=True)
    message = Column(String(255), default="A gentle reminder from your Unit Welfare Cell: Take a 60-second Saathi check-in to reflect on your duty rhythm.")
    is_read = Column(Boolean, default=False)

class MedicalCampRecord(Base):
    """Monthly medical camp records logged by the Doctor / Medical Officer.
    Tracks raw vitals (BP, weight, blood sugar) and computes longitudinal personal baseline drift.
    """
    __tablename__ = "medical_camp_records"

    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(String(50), ForeignKey("personnel_profiles.personnel_id"), nullable=False, index=True)
    camp_date = Column(DateTime, default=datetime.utcnow, index=True)
    doctor_username = Column(String(50), nullable=False)
    doctor_name = Column(String(100), nullable=False)

    # Raw Vitals Measured at Camp
    systolic_bp = Column(Float, nullable=False)      # mmHg (e.g. 122.0)
    diastolic_bp = Column(Float, nullable=False)     # mmHg (e.g. 82.0)
    weight_kg = Column(Float, nullable=False)        # kg (e.g. 74.0)
    blood_sugar_mg_dl = Column(Float, nullable=False)# mg/dL (e.g. 110.0)
    clinical_notes = Column(Text, nullable=True)

    # Longitudinal Personal Baseline (trailing average across officer's own prior camps)
    baseline_systolic_bp = Column(Float, nullable=True)
    baseline_diastolic_bp = Column(Float, nullable=True)
    baseline_weight_kg = Column(Float, nullable=True)
    baseline_blood_sugar = Column(Float, nullable=True)

    # Computed Personal Baseline Drift (MedTech Clinical Signal)
    systolic_drift = Column(Float, nullable=True)
    diastolic_drift = Column(Float, nullable=True)
    weight_drift = Column(Float, nullable=True)
    blood_sugar_drift = Column(Float, nullable=True)
    clinical_flag = Column(Boolean, default=False)
    clinical_drift_summary = Column(Text, nullable=True)

    personnel = relationship("PersonnelProfile", back_populates="medical_camp_records")

class WelfareMeeting(Base):
    """Informal tea touchpoint ('Chai Pe Charcha') or confidential welfare meeting scheduled by Welfare Officer."""
    __tablename__ = "welfare_meetings"

    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(String(50), nullable=False, index=True)
    officer_username = Column(String(50), nullable=False)
    officer_name = Column(String(100), nullable=False)
    meeting_type = Column(String(50), default="tea_meeting")  # 'tea_meeting', 'welfare_chat', 'peer_followup'
    scheduled_at = Column(String(100), nullable=False)        # E.g. "Tomorrow 10:30 AM" or "12 Sep 2026, 16:30"
    venue = Column(String(100), default="Unit Welfare Cell / Canteen")
    message = Column(Text, nullable=True)                     # Friendly message shown to personnel
    status = Column(String(30), default="Scheduled")          # 'Scheduled', 'Acknowledged', 'Completed', 'Declined', 'Cancelled'
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    acknowledged_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    officer_notes = Column(Text, nullable=True)               # Confidential notes for welfare officer only
    source = Column(String(50), default="triage_case")        # 'triage_case', 'peer_flag', 'chat_request', 'manual'
    case_id = Column(Integer, nullable=True)
    peer_flag_id = Column(Integer, nullable=True)

class CrdtSyncEvent(Base):
    """CRDT Append-Only Event Log for Edge Outposts (FOBs) & Core HQ synchronization."""
    __tablename__ = "crdt_sync_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(64), unique=True, index=True, nullable=False)
    node_id = Column(String(50), nullable=False, default="FOB-SUKMA-EDGE-03")
    entity_type = Column(String(50), nullable=False) # 'CASE_RESOLUTION', 'DOCTOR_NOTE', 'SAATHI_CHECKIN', 'STAR_BUDDY_UPDATE', 'PEER_FLAG'
    entity_id = Column(String(50), nullable=False, index=True)
    action = Column(String(50), nullable=False) # 'RESOLVE', 'CREATE', 'UPDATE', 'ACKNOWLEDGE'
    payload_json = Column(Text, nullable=False)
    timestamp_ist = Column(String(50), nullable=False)
    timestamp_utc = Column(DateTime, default=datetime.utcnow, index=True)
    logical_clock = Column(Integer, default=1)
    causal_priority = Column(Integer, default=10) # Clinical Doctor = 100, Welfare Officer = 80, NCO = 50, Automated ML = 10
    sync_status = Column(String(30), default="SYNCHRONIZED") # 'SYNCHRONIZED', 'CONFLICT_RESOLVED_CAUSAL', 'PENDING'
    resolution_notes = Column(Text, nullable=True)

class VocalStrainRecord(Base):
    """
    10-Second Acoustic Vocal Biomarker Check (Dhvani / ध्वनि).
    Zero-audio stored by system architecture: only non-invertible acoustic physics metrics are recorded.
    """
    __tablename__ = "vocal_strain_records"

    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(String(50), ForeignKey("personnel_profiles.personnel_id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    strain_score = Column(Float, nullable=False) # 0.0 to 100.0
    strain_tier = Column(String(50), default="Optimal") # 'Optimal', 'Mild Strain', 'Elevated Fatigue'
    jitter_pct = Column(Float, nullable=False) # e.g. 0.82%
    shimmer_pct = Column(Float, nullable=False) # e.g. 3.15%
    hnr_db = Column(Float, nullable=False) # e.g. 21.8 dB
    pitch_hz = Column(Float, nullable=False) # e.g. 138.5 Hz
    duration_sec = Column(Float, default=10.0)
    session_mode = Column(String(30), default="live_mic") # 'live_mic' or 'simulated_check'
    notes = Column(String(200), nullable=True)
