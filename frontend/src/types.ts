export type UserRole = "personnel" | "nco" | "welfare_officer" | "command" | "admin" | "doctor";

export interface User {
  username: string;
  role: UserRole;
  full_name: string;
  force: string;
  rank: string;
  battalion_id: string;
  company: string;
  personnel_id: string | null;
}

export interface PersonnelProfile {
  personnel_id: string;
  name: string;
  force: string;
  rank_tier: string;
  company: string;
  battalion: string;
  posting_category: string;
  posting_duration_months: number;
  leave_entitled_annual: number;
  leave_availed_last_12m: number;
  leave_balance_remaining: number;
  training_hours_last_12m: number;
  tenure_years: number;
  married?: boolean;
  family_structure?: string;
  family_status?: string;
  family_separation_load?: number;
  avg_weekly_duty_hours_last_90d?: number;
  rest_day_compliance_pct_last_90d?: number;
  onboarding_completed?: boolean;
}

export interface MainChangeMetric {
  metric: string;
  change_value: number;
  display: string;
  unit: string;
  is_adverse: boolean;
  detail: string;
}

export interface TrajectoryPoint {
  day: number;
  label: string;
  score: number;
  confidence_low?: number;
  confidence_high?: number;
}

export interface StressTrajectory {
  early_warning_level: "NORMAL" | "WATCH" | "SUPPORT" | "PRIORITY" | "INSUFFICIENT_DATA";
  early_warning_label: string;
  early_warning_icon: string;
  early_warning_action: string;
  is_insufficient_data?: boolean;
  data_sufficiency_reasons?: string[];
  risk_level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "UNAVAILABLE";
  risk_direction: "↑" | "→" | "↓" | "—";
  risk_display: string;
  effective_risk_pct?: number | null;
  model_confidence_pct?: number | null;
  data_completeness_pct?: number;
  is_low_confidence?: boolean;
  confidence_advisory?: string | null;
  previous_state: string;
  seven_day_trend_pct: number;
  seven_day_trend_display: string;
  seven_day_trend_direction: "up" | "down" | "stable" | "insufficient";
  main_changes: MainChangeMetric[];
  predicted_trajectory: "Stable" | "Rising" | "Critical" | "Insufficient Data";
  predicted_trajectory_desc: string;
  forecast_days_to_critical: number | null;
  historical_points: TrajectoryPoint[];
  forecast_unmitigated: TrajectoryPoint[];
  forecast_mitigated: TrajectoryPoint[];
  actionable_advisory: string;
}

export interface WelfareQueueItem {
  case_id: number;
  personnel_id: string;
  name: string;
  force: string;
  rank: string;
  company: string;
  battalion: string;
  flagged_date: string;
  welfare_checkin_likelihood: number;
  likelihood_label: string;
  plain_language_reasons: string[];
  stress_trajectory?: StressTrajectory;
  status: string;
  baseline_shift_summary: string;
  last_action?: string | null;
  last_outcome?: string | null;
  is_demo_user?: boolean;
  demo_role_label?: string | null;
  has_saathi_submission?: boolean;
  saathi_completed_at?: string | null;
  saathi_strain_tier?: string | null;
  saathi_welfare_requested?: boolean;
  family_structure?: string;
  family_separation_load?: number;
  has_family_separation_strain?: boolean;
  family_welfare_nudge_recommended?: boolean;
}

export interface BaselineComparison {
  sick_reports: {
    current_90d: number;
    personal_trailing_baseline: number;
    deviation: number;
  };
  nco_observation: {
    current_score: number;
    personal_trailing_baseline: number;
    deviation: number;
  };
  workload: {
    weekly_duty_hours: number;
    night_duty_fraction: number;
    rest_day_compliance: number;
    fatigue_proxy_index: number;
  };
  leave: {
    entitled: number;
    availed_12m: number;
    utilization_ratio: number;
  };
  composite_baseline_deviation: number;
}

export interface CaseDetail {
  case_id: number;
  personnel_id: string;
  name: string;
  force: string;
  rank: string;
  company: string;
  battalion: string;
  posting_category: string;
  posting_duration_months: number;
  married?: boolean;
  family_structure?: string;
  family_status: string;
  family_separation_load?: number;
  has_family_separation_strain?: boolean;
  family_welfare_nudge_recommended?: boolean;
  recommended_actions?: Array<{
    type: string;
    title: string;
    subtitle: string;
    desc: string;
  }>;
  flagged_date: string;
  welfare_checkin_likelihood: number;
  likelihood_label: string;
  plain_language_reasons: string[];
  stress_trajectory?: StressTrajectory;
  status: string;
  officer_action?: string | null;
  outcome?: string | null;
  notes?: string | null;
  action_logged_at?: string | null;
  personal_baseline_comparison: BaselineComparison;
  cold_start_status?: {
    is_cold_start: boolean;
    posting_duration_months: number;
    days_in_posting: number;
    adaptation_weight_individual_pct: number;
    cohort_prior_weight_pct: number;
    cohort_category: string;
    cohort_name: string;
    methodology: string;
    guidance_note: string;
  };
  anonymous_peer_notes: string[];
  personnel_direct_requests: string[];
  audit_notification: string;
}

export interface SubunitMetric {
  subunit_name: string;
  headcount: number;
  average_weekly_duty_hours: number;
  rest_day_compliance_pct: number;
  average_leave_utilisation_pct: number;
  fatigue_proxy_index: number;
  sick_report_trend: string;
  rotation_advisory: string;
  // Unit Welfare Radar Heatmap additions
  radar_level?: "normal" | "watch" | "support" | "priority";
  radar_status?: string;
  radar_color?: "emerald" | "yellow" | "amber" | "rose";
  fatigue_trend?: string;
  fatigue_trend_dir?: "up" | "down" | "stable";
  workload_imbalance?: string;
  workload_imbalance_dir?: "up" | "down" | "stable";
  avg_recovery_days_monthly?: number;
  recovery_trend_dir?: "up" | "down" | "stable";
  priority_count?: number;
  support_count?: number;
  watch_count?: number;
  normal_count?: number;
}

export interface BattalionMetric {
  battalion_name: string;
  headcount: number;
  average_leave_utilisation_pct: number;
  average_duty_hours: number;
  average_deployment_duration_months: number;
}

export interface CommandMetrics {
  unit_scope: string;
  total_active_strength: number;
  trajectory_distribution?: {
    normal_count?: number;
    watch_count?: number;
    support_count?: number;
    priority_count?: number;
    insufficient_count?: number;
    normal_pct?: number;
    watch_pct?: number;
    support_pct?: number;
    priority_pct?: number;
    insufficient_pct?: number;
    stable_count: number;
    rising_count: number;
    critical_count: number;
    stable_pct: number;
    rising_pct: number;
    critical_pct: number;
    headline_summary: string;
  };
  operational_indicators: {
    average_weekly_duty_hours: number;
    force_rest_compliance_pct: number;
    force_leave_utilisation_pct: number;
    average_fatigue_proxy_index: number;
    fatigue_methodology_note: string;
  };
  posting_distribution: {
    category: string;
    count: number;
    percentage: number;
  }[];
  company_level_metrics: SubunitMetric[];
  battalion_level_metrics: BattalionMetric[];
  privacy_compliance_statement: string;
}

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  timestamp_ist?: string;
  timestamp_utc?: string;
  relative_time?: string;
  iso_timestamp?: string;
  username: string;
  user_role: string;
  action: string;
  target_personnel_id: string;
  case_id: string | number;
  ip_address: string;
  details: string;
}

export interface NcoMusterObservationItem {
  id: number;
  personnel_id: string;
  name: string;
  rank: string;
  force: string;
  company: string;
  concern_score: number;
  baseline_score: number;
  deviation: number;
  note?: string | null;
  observed_date_ist: string;
  observed_date_utc: string;
  relative_time: string;
  welfare_case_id?: number | null;
}

export interface NcoSectionPeerFlagItem {
  id: number;
  target_personnel_id: string;
  target_name: string;
  target_rank: string;
  observation_text: string;
  care_category: string;
  submitted_at_ist: string;
  submitted_at_utc: string;
  status: string;
  scheduled_tea_at?: string | null;
  welfare_notes?: string | null;
}

export interface NcoOfficerReport {
  nco_username: string;
  nco_officer_id: string;
  nco_name: string;
  nco_rank: string;
  force: string;
  company: string;
  cycle_cadence: string;
  cadence_policy_note: string;
  last_submitted_ist: string;
  last_submitted_utc: string;
  last_submitted_relative: string;
  total_evaluated: number;
  high_concern_count: number;
  observations: NcoMusterObservationItem[];
  peer_flags: NcoSectionPeerFlagItem[];
}

export interface NcoMusterReportsResponse {
  reports: NcoOfficerReport[];
  total_nco_reports: number;
}

export interface SectionRosterMember {
  personnel_id: string;
  name: string;
  rank: string;
  force: string;
  company: string;
  current_observation_baseline: number;
  last_observation_score: number;
}

export interface SaathiOption {
  key: string;
  label: string;
  sub?: string;
  score_key?: string;
  score_val?: number;
  is_opt_out?: boolean;
  is_safety_net?: boolean;
  is_closing?: boolean;
  is_skip_to_q9?: boolean;
}

export interface SaathiQuestion {
  question_id: string;
  step: number;
  title: string;
  prompt: string;
  options: SaathiOption[];
  context_tag?: string;
  is_closing?: boolean;
  is_short_branch?: boolean;
  is_free_text_only?: boolean;
}

export interface SaathiEvaluation {
  verification_score: number;
  strain_tier: "Optimal" | "Mild Strain" | "Elevated Strain" | string;
  verification_summary: string;
  recommendations: string[];
  model_metadata: {
    model_version: string;
    verified: boolean;
    verified_at: string;
  };
}

export interface SaathiWeeklyCycle {
  can_checkin_this_week: boolean;
  completed_this_week: boolean;
  current_week_sunday: string;
  next_week_start: string;
  next_week_sunday: string;
  this_week_completed_at?: string | null;
}

export interface SaathiContext {
  personnel_id: string;
  name: string;
  duty_category: string;
  duty_context_title: string;
  posting_sector: string;
  initial_question: SaathiQuestion;
  last_checkin?: {
    completed_at: string | null;
    duty_category?: string | null;
  } | null;
  pending_nudge?: {
    id: number;
    sender: string;
    sent_at: string;
    message: string;
  } | null;
  weekly_cycle?: SaathiWeeklyCycle;
}

export interface SaathiHistoryItem {
  id: number;
  completed_at: string;
  duty_category?: string;
  answers?: Array<{
    step: number;
    question?: string;
    selected_key?: string;
    selected_label?: string;
    free_text?: string;
  }>;
  requested_welfare_outreach: boolean;
  has_private_notes: boolean;
  model_verification_score?: number;
  strain_tier?: string;
  verification_summary?: string;
  recommendations?: string[];
}

export interface SaathiTrackerItem {
  personnel_id: string;
  name: string;
  force: string;
  rank: string;
  company: string;
  battalion: string;
  posting_category: string;
  has_completed: boolean;
  last_completed_at?: string | null;
  strain_tier: string;
  model_verification_score?: number | null;
  requested_welfare_outreach: boolean;
  last_nudge_at?: string | null;
  nudge_count: number;
  is_demo_user?: boolean;
  demo_role_label?: string | null;
}

export interface SaathiTrackerResponse {
  total_personnel: number;
  completed_count: number;
  pending_count: number;
  completion_rate_pct: number;
  roster: SaathiTrackerItem[];
  completed_roster?: SaathiTrackerItem[];
  pending_roster?: SaathiTrackerItem[];
}

// Medical Camp & Doctor Workstation Types
export interface MedicalCampHistoryItem {
  id: number;
  camp_date: string;
  doctor_name: string;
  systolic_bp: number;
  diastolic_bp: number;
  weight_kg: number;
  blood_sugar_mg_dl: number;
  clinical_notes?: string | null;
  baseline_systolic_bp?: number | null;
  baseline_diastolic_bp?: number | null;
  baseline_weight_kg?: number | null;
  baseline_blood_sugar?: number | null;
  systolic_drift?: number | null;
  diastolic_drift?: number | null;
  weight_drift?: number | null;
  blood_sugar_drift?: number | null;
  clinical_flag?: boolean;
  clinical_drift_summary?: string | null;
}

export interface DoctorWorklistItem {
  personnel_id: string;
  name: string;
  force: string;
  rank: string;
  company: string;
  battalion: string;
  posting_category: string;
  last_camp_date: string;
  days_since_last_camp?: number | null;
  is_overdue: boolean;
  latest_vitals?: {
    bp: string;
    weight: string;
    blood_sugar: string;
    clinical_flag: boolean;
    clinical_drift_summary?: string | null;
  } | null;
  is_demo_user?: boolean;
  demo_role_label?: string | null;
}

export interface DoctorWorklistResponse {
  total_assigned: number;
  overdue_count: number;
  tested_this_cycle: number;
  camp_cycle_days: number;
  worklist: DoctorWorklistItem[];
}

export interface PatientMedicalData {
  personnel_id: string;
  name: string;
  force: string;
  rank: string;
  company: string;
  battalion: string;
  posting_category: string;
  total_camps_recorded: number;
  trailing_personal_baseline?: {
    systolic_bp: number;
    diastolic_bp: number;
    weight_kg: number;
    blood_sugar_mg_dl: number;
  } | null;
  medical_history: MedicalCampHistoryItem[];
}

export interface PersonnelVitalsData {
  personnel_id: string;
  name: string;
  total_camps_recorded: number;
  latest_camp_date?: string | null;
  latest_vitals?: {
    systolic_bp?: number | null;
    diastolic_bp?: number | null;
    weight_kg?: number | null;
    blood_sugar_mg_dl?: number | null;
    notes?: string | null;
  } | null;
  vitals_trend: {
    id: number;
    camp_date: string;
    doctor_name: string;
    systolic_bp: number;
    diastolic_bp: number;
    weight_kg: number;
    blood_sugar_mg_dl: number;
    clinical_notes?: string | null;
  }[];
}

export interface WelfareChatRequestItem {
  id: number;
  personnel_id: string;
  name: string;
  rank: string;
  force: string;
  company: string;
  battalion: string;
  family_structure?: string;
  family_separation_load?: number;
  request_type: string;
  preferred_mode: string;
  created_at: string;
  status: string; // 'Pending' | 'Scheduled' | 'Completed'
  scheduled_at?: string | null;
  notes?: string | null;
}

export interface BuddyPeer {
  personnel_id: string;
  name: string;
  rank: string;
  is_assigned_buddy: boolean;
}

export interface BuddyPairInfo {
  assigned_buddy?: {
    personnel_id: string;
    name: string;
    rank: string;
    company: string;
  } | null;
  star_buddy_updated_at?: string | null;
  can_edit_buddy?: boolean;
  days_remaining_to_edit?: number;
  lock_until_ist?: string | null;
  company: string;
  battalion: string;
  section_peers: BuddyPeer[];
}

export interface BuddyDropBoxPayload {
  target_personnel_id: string;
  care_category: string; // 'skipping_meals' | 'night_distress_phone' | 'sudden_isolation' | 'family_crisis' | 'general_strain'
  observation_text: string;
  client_token?: string;
}

export interface WelfarePeerFlagItem {
  id: number;
  target_personnel_id: string;
  target_name: string;
  target_rank: string;
  target_company: string;
  target_battalion: string;
  target_family_structure?: string;
  target_family_separation_load?: number;
  care_category: string;
  observation_text: string;
  submitted_at: string;
  status: string; // 'New' | 'Scheduled_Tea' | 'Completed_Informal' | 'Dismissed_NonWelfare'
  scheduled_tea_at?: string | null;
  welfare_notes?: string | null;
  is_star_buddy_report?: boolean;
  verification_state?: string; // 'Verified_StarBuddy' | 'Corroborated_MultiPeer' | 'Pending_Corroboration'
  corroboration_count?: number;
}

// ==========================================
// CRDT EDGE SYNCHRONIZATION & CONFLICT TYPES
// ==========================================

export interface CausalHierarchyRule {
  tier: number;
  role: string;
  priority: number;
  rule: string;
}

export interface CrdtSyncStatus {
  edge_node_id: string;
  edge_location: string;
  core_hq_id: string;
  sync_state: string;
  replication_engine: string;
  last_sync_ist: string;
  last_sync_utc: string;
  logical_clock: number;
  total_synced_events: number;
  causal_hierarchy: CausalHierarchyRule[];
}

export interface CrdtSyncEventItem {
  id: number;
  event_id: string;
  node_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  timestamp_ist: string;
  timestamp_utc: string;
  logical_clock: number;
  causal_priority: number;
  sync_status: string;
  resolution_notes?: string | null;
}

export interface ConflictSimulationResult {
  status: string;
  simulation_id: string;
  conflict_summary: {
    soldier: string;
    hq_incoming_state: string;
    hq_role?: string;
    hq_priority: number;
    edge_offline_state: string;
    edge_role?: string;
    edge_priority: number;
    winning_action: string;
    resolution_rule: string;
    timestamp_ist: string;
    timestamp_utc: string;
    ledger_event_id: string;
    outcome_message: string;
  };
}

// ==========================================
// SCENARIO SIMULATOR & SYNTHETIC DATA TYPES
// ==========================================

export interface PresetScenarioInfo {
  title: string;
  description: string;
  workload_delta_pct: number;
  night_duty_fraction: number;
  rest_day_compliance_pct: number;
  leave_delay_days: number;
  saathi_tough_rate: number;
  sector: string;
}

export interface ScenarioDistributionTier {
  normal: number;
  normal_pct: number;
  watch: number;
  watch_pct: number;
  support: number;
  support_pct: number;
  priority: number;
  priority_pct: number;
  average_risk_pct: number;
}

export interface SimulatedPersonnelRecord {
  personnel_id: string;
  name: string;
  rank: string;
  company: string;
  battalion: string;
  family_structure: string;
  married: boolean;
  baseline_duty_hours: number;
  baseline_night_pct: number;
  baseline_rest_pct: number;
  baseline_risk_prob: number;
  simulated_duty_hours: number;
  simulated_night_pct: number;
  simulated_rest_pct: number;
  simulated_leave_gap_days: number;
  simulated_saathi_tough_pct: number;
  simulated_fatigue_index: number;
  simulated_baseline_deviation: number;
  simulated_risk_prob: number;
  simulated_risk_pct: number;
  early_warning_tier: "NORMAL" | "WATCH" | "SUPPORT" | "PRIORITY";
  early_warning_icon: string;
}

export interface GenerateCohortResponse {
  status: string;
  scenario_title: string;
  scenario_description: string;
  cohort_size: number;
  records_duration_days: number;
  parameters: {
    workload_delta_pct: number;
    night_duty_fraction: number;
    rest_day_compliance_pct: number;
    leave_delay_days: number;
    saathi_tough_rate: number;
  };
  baseline_distribution: ScenarioDistributionTier;
  simulated_distribution: ScenarioDistributionTier;
  delta_impact: {
    priority_change_pct: number;
    average_risk_increase_points: number;
    additional_triage_cases: number;
  };
  top_flagged_samples: SimulatedPersonnelRecord[];
  csv_download_ready: boolean;
  csv_row_count: number;
  csv_payload: string;
}

export interface SimulateShiftResponse {
  status: string;
  cohort_size: number;
  input_adjustments: {
    workload_delta_pct: number;
    rest_day_compliance_pct: number;
    night_duty_fraction: number;
    leave_delay_days: number;
  };
  baseline_summary: {
    average_risk_pct: number;
    normal_pct: number;
    watch_pct: number;
    support_pct: number;
    priority_pct: number;
  };
  simulated_summary: {
    average_risk_pct: number;
    risk_delta_pct: number;
    normal_pct: number;
    watch_pct: number;
    support_pct: number;
    priority_pct: number;
    normal_count: number;
    watch_count: number;
    support_count: number;
    priority_count: number;
  };
  primary_stress_drivers: {
    driver: string;
    weight_pct: number;
    impact: string;
  }[];
  countermeasure_impact: {
    recommended_action: string;
    projected_priority_reduction_pct: number;
    estimated_cases_prevented: number;
  };
}



