import type {
  User,
  PersonnelProfile,
  WelfareQueueItem,
  CaseDetail,
  CommandMetrics,
  AuditLogEntry,
  SectionRosterMember,
  WelfareChatRequestItem,
  BuddyPairInfo,
  BuddyDropBoxPayload,
  WelfarePeerFlagItem,
  NcoMusterReportsResponse,
  CrdtSyncStatus,
  CrdtSyncEventItem,
  ConflictSimulationResult,
  GenerateCohortResponse,
  SimulateShiftResponse,
  PresetScenarioInfo
} from "./types";

function resolveApiBase(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
  if (!envUrl || typeof envUrl !== "string" || !envUrl.trim()) {
    return "http://localhost:8000/api";
  }
  const clean = envUrl.trim().replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
}

export const API_BASE = resolveApiBase();

export function getToken(): string | null {
  return localStorage.getItem("gm_auth_token");
}

export function setToken(token: string): void {
  localStorage.setItem("gm_auth_token", token);
}

export function removeToken(): void {
  localStorage.removeItem("gm_auth_token");
  localStorage.removeItem("gm_auth_user");
}

export function getCachedUser(): User | null {
  const u = localStorage.getItem("gm_auth_user");
  if (!u) return null;
  try {
    return JSON.parse(u);
  } catch {
    return null;
  }
}

export function setCachedUser(user: User): void {
  localStorage.setItem("gm_auth_user", JSON.stringify(user));
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorBody.detail || `Request failed with status ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// Auth API
export const apiLogin = async (username: string, password: string) => {
  const data = await request<{ access_token: string; user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.access_token);
  setCachedUser(data.user);
  return data;
};

export const apiGetMe = async (): Promise<User> => {
  return request<User>("/auth/me");
};

// Personnel API
export const apiGetPersonnelProfile = async (): Promise<PersonnelProfile> => {
  return request<PersonnelProfile>("/personnel/my-profile");
};

export interface ScheduledTeaInfo {
  source: string;
  request_id?: number;
  meeting_id?: number;
  status: string;
  scheduled_at: string;
  venue?: string;
  welfare_cell_contact?: string;
  message?: string;
  confidential_guarantee?: string;
}

export interface PendingChatInfo {
  request_id?: number;
  status: string;
  message: string;
}

export const apiCheckInvitation = async (): Promise<{
  has_invitation: boolean;
  invitation_text?: string;
  welfare_cell_contact?: string;
  standing_note?: string;
  scheduled_tea?: ScheduledTeaInfo | null;
  pending_chat?: PendingChatInfo | null;
}> => {
  return request("/personnel/invitation");
};

export const apiAcknowledgeScheduledTea = async () => {
  return request<{ status: string; message: string }>("/personnel/acknowledge-tea", {
    method: "POST",
  });
};

export const apiRespondInvitation = async (accepted: boolean) => {
  return request<{ status: string; message: string }>("/personnel/respond-invitation", {
    method: "POST",
    body: JSON.stringify({ accepted }),
  });
};

export const apiStandingTalkRequest = async (preferred_mode: string = "informal_conversation") => {
  return request<{ status: string; message: string }>("/personnel/talk-request", {
    method: "POST",
    body: JSON.stringify({ preferred_mode }),
  });
};

export const apiCompleteOnboarding = async (payload: { married: boolean; family_structure: string }) => {
  return request<{ status: string; message: string; married: boolean; family_structure: string; family_separation_load: number }>(
    "/personnel/onboarding",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
};

// ==========================================
// DHVANI (ध्वनि) 10-SECOND ACOUSTIC CHECK-IN API
// ==========================================

export interface VocalCheckinPayload {
  strain_score: number;
  strain_tier: string;
  jitter_pct: number;
  shimmer_pct: number;
  hnr_db: number;
  pitch_hz: number;
  duration_sec?: number;
  session_mode?: string;
  notes?: string;
  recorded_at?: string;
}

export interface VocalCheckinResponse {
  status: string;
  record_id: number;
  created_at?: string;
  strain_score: number;
  strain_tier: string;
  jitter_pct: number;
  shimmer_pct: number;
  hnr_db: number;
  pitch_hz: number;
  strain_drift_vs_baseline: number;
  prior_14d_checks_count: number;
  recommendation: string;
  privacy_guarantee: string;
}

export interface VocalHistoryResponse {
  personnel_id: string;
  average_strain_score: number;
  records_count: number;
  recent_records: Array<{
    id: number;
    created_at: string | null;
    strain_score: number;
    strain_tier: string;
    jitter_pct: number;
    shimmer_pct: number;
    hnr_db: number;
    pitch_hz: number;
    session_mode: string;
    notes: string;
  }>;
}

export const apiSubmitVocalCheckin = async (payload: VocalCheckinPayload): Promise<VocalCheckinResponse> => {
  return request<VocalCheckinResponse>("/personnel/vocal-checkin", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const apiGetVocalHistory = async (): Promise<VocalHistoryResponse> => {
  return request<VocalHistoryResponse>("/personnel/vocal-history");
};

// Welfare Officer: Dhvani Records
export interface DhvaniWelfareRecord {
  id: number;
  personnel_id: string;
  name: string;
  rank: string;
  company: string;
  battalion: string;
  strain_score: number;
  strain_tier: string;
  jitter_pct: number;
  shimmer_pct: number;
  hnr_db: number;
  pitch_hz: number;
  session_mode: string;
  notes: string;
  created_at: string | null;
}
export interface DhvaniWelfareResponse {
  records: DhvaniWelfareRecord[];
  total: number;
  elevated_count: number;
  mild_count: number;
  optimal_count: number;
  avg_strain_score: number;
}
export const apiGetDhvaniWelfareRecords = async (): Promise<DhvaniWelfareResponse> => {
  return request<DhvaniWelfareResponse>("/welfare/dhvani-records");
};

// NCO API
export const apiGetSectionRoster = async (): Promise<{
  section_name: string;
  roster: SectionRosterMember[];
  cadence?: string;
  is_cycle_locked?: boolean;
  last_submitted_at?: string | null;
  next_muster_due?: string | null;
}> => {
  return request("/nco/section-roster");
};

export const apiSubmitMusterBatch = async (
  observations: Array<{
    personnel_id: string;
    concern_score: number;
    note?: string;
  }>,
  forceResubmit: boolean = false
) => {
  return request<{ status: string; message: string }>("/nco/muster-batch", {
    method: "POST",
    body: JSON.stringify({ observations, force_resubmit: forceResubmit }),
  });
};

export const apiResetNcoMusterDemo = async () => {
  return request<{ status: string; message: string }>("/nco/reset-cycle-demo", {
    method: "POST",
  });
};

export const apiSubmitSectionObservation = async (
  personnelId: string,
  concernScore: number,
  notes?: string
) => {
  return apiSubmitMusterBatch([
    {
      personnel_id: personnelId,
      concern_score: concernScore,
      note: notes || "",
    },
  ]);
};

export const apiSubmitPeerFlag = async (payload: { target_personnel_id: string; observation_text: string } | string, observationText?: string) => {
  const body = typeof payload === "string"
    ? { target_personnel_id: payload, observation_text: observationText || "" }
    : payload;
  return request<{ status: string; message: string }>("/nco/peer-flag", {
    method: "POST",
    body: JSON.stringify(body),
  });
};

// Welfare Officer API
export const apiGetWelfareQueue = async (): Promise<{
  total_flagged_active: number;
  queue: WelfareQueueItem[];
}> => {
  return request("/welfare/queue");
};

export const apiGetCaseDetail = async (caseId: number): Promise<CaseDetail> => {
  return request(`/welfare/case/${caseId}`);
};

export const apiLogCaseAction = async (
  caseId: number,
  payload: { officer_action: string; outcome: string; notes?: string; status?: string }
) => {
  return request<{ status: string; message: string }>(`/welfare/case/${caseId}/action`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const apiNudgeFamilyWelfareCell = async (
  caseId: number,
  notes?: string
) => {
  return request<{ status: string; message: string; case_id: number; action_recorded: string }>(
    `/welfare/case/${caseId}/nudge-family-cell`,
    {
      method: "POST",
      body: JSON.stringify({ notes: notes || "" }),
    }
  );
};

export const apiGetWelfareChatRequests = async (): Promise<WelfareChatRequestItem[]> => {
  return request("/welfare/chat-requests");
};

export const apiUpdateChatRequestAction = async (
  reqId: number,
  payload: { status: string; scheduled_at?: string; notes?: string }
) => {
  return request<{ status: string; message: string }>(`/welfare/chat-requests/${reqId}/action`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

// Command API
export const apiGetCommandMetrics = async (): Promise<CommandMetrics> => {
  return request("/command/aggregate-metrics");
};

// Admin API
export const apiGetAuditLogs = async (actionFilter?: string): Promise<AuditLogEntry[]> => {
  const url = actionFilter ? `/admin/audit-logs?action_filter=${encodeURIComponent(actionFilter)}` : "/admin/audit-logs";
  return request(url);
};

export const apiGetUsers = async (): Promise<User[]> => {
  return request("/admin/users");
};

// Public API
export const apiGetResponsibleAi = async () => {
  return request<{
    system_name: string;
    sponsor: string;
    target_forces: string;
    core_thesis: string;
    ethical_charter: { title: string; statement: string }[];
    fatigue_methodology: string;
    institutional_readiness_statement: string;
  }>("/public/responsible-ai");
};

// ==========================================
// SAATHI (साथी) COMPANION API
// ==========================================

export const apiGetSaathiContext = async () => {
  return request<any>("/personnel/saathi/context");
};

export const apiGetSaathiNextQuestion = async (
  duty_category: string,
  current_step: number,
  answers: any[]
) => {
  return request<{
    step: number;
    is_final_step: boolean;
    question: any;
    domain?: string;
    is_safety_net?: boolean;
    safety_net_message?: string;
    is_opt_out?: boolean;
    exit_message?: string;
  }>("/personnel/saathi/next-question", {
    method: "POST",
    body: JSON.stringify({ duty_category, current_step, answers }),
  });
};

export const apiSubmitSaathiCheckin = async (payload: {
  duty_category: string;
  answers: any[];
  scores: Record<string, number>;
  private_notes?: string;
  requested_welfare_outreach?: boolean;
  safety_net_triggered?: boolean;
  opted_out?: boolean;
}) => {
  return request<{
    status: string;
    message: string;
    evaluation: any;
  }>("/personnel/saathi/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const apiGetSaathiHistory = async () => {
  return request<any[]>("/personnel/saathi/history");
};

export const apiDismissSaathiNudge = async (nudgeId: number) => {
  return request<{ status: string }>(`/personnel/saathi/dismiss-nudge/${nudgeId}`, {
    method: "POST",
  });
};

export const apiResetWeeklySaathiDemo = async () => {
  return request<{ status: string; message: string }>("/personnel/saathi/reset-weekly-demo", {
    method: "POST",
  });
};

export const apiGetSaathiTracker = async () => {
  return request<{
    total_personnel: number;
    completed_count: number;
    pending_count: number;
    completion_rate_pct: number;
    roster: any[];
  }>("/welfare/saathi/tracker");
};

export const apiSendSaathiNudge = async (personnelId: string, message?: string) => {
  return request<{ status: string; message: string }>(`/welfare/saathi/nudge/${personnelId}`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
};

// ==========================================
// DOCTOR / MEDICAL OFFICER & VITALS API
// ==========================================

export const apiGetDoctorWorklist = async () => {
  return request<any>("/doctor/worklist");
};

export const apiGetPatientMedicalRecord = async (personnelId: string) => {
  return request<any>(`/doctor/patient/${personnelId}`);
};

export const apiSubmitMedicalCampRecord = async (payload: {
  personnel_id: string;
  systolic_bp: number;
  diastolic_bp: number;
  weight_kg: number;
  blood_sugar_mg_dl: number;
  clinical_notes?: string;
}) => {
  return request<{
    status: string;
    message: string;
    record_id: number;
    clinical_flag: boolean;
    clinical_drift_summary: string;
    personal_baseline: any;
    drift: any;
  }>("/doctor/record", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const apiGetMyMedicalVitals = async () => {
  return request<any>("/personnel/my-vitals");
};

// ==========================================
// ANONYMOUS PEER GUARD (BUDDY SYSTEM) API
// ==========================================

export const apiGetMyBuddy = async (): Promise<BuddyPairInfo> => {
  return request<BuddyPairInfo>("/personnel/my-buddy");
};

export const apiSetStarBuddy = async (buddyPersonnelId: string): Promise<{
  status: string;
  message: string;
  assigned_buddy: any;
  star_buddy_updated_at: string;
  lock_until_ist: string;
  can_edit_buddy: boolean;
  days_remaining_to_edit: number;
}> => {
  return request<any>("/personnel/set-star-buddy", {
    method: "POST",
    body: JSON.stringify({ buddy_personnel_id: buddyPersonnelId }),
  });
};

export const apiSubmitBuddyDropBox = async (payload: BuddyDropBoxPayload): Promise<{ status: string; message: string }> => {
  return request<{ status: string; message: string }>("/personnel/buddy-drop-box", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const apiGetWelfarePeerFlags = async (): Promise<WelfarePeerFlagItem[]> => {
  return request<WelfarePeerFlagItem[]>("/welfare/peer-flags");
};

export const apiSchedulePeerTeaProtocol = async (
  flagId: number,
  payload: { status: string; scheduled_tea_at?: string; welfare_notes?: string }
): Promise<{ status: string; message: string }> => {
  return request<{ status: string; message: string }>(`/welfare/peer-flags/${flagId}/tea-protocol`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const apiExportRetrainingDataset = async (format: "csv" | "json" = "csv"): Promise<Blob | any> => {
  const token = getToken();
  const res = await fetch(`${API_BASE}/admin/export-retraining-dataset?format=${format}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) {
    throw new Error(`Export failed: ${res.statusText}`);
  }
  if (format === "csv") {
    return res.blob();
  }
  return res.json();
};

export const apiGetNcoMusterReports = async (): Promise<NcoMusterReportsResponse> => {
  return request<NcoMusterReportsResponse>("/welfare/nco-muster-reports");
};

// ==========================================
// CRDT EDGE-TO-HQ SYNCHRONIZATION API
// ==========================================

export const apiGetSyncStatus = async (): Promise<CrdtSyncStatus> => {
  return request<CrdtSyncStatus>("/sync/status");
};

export const apiGetSyncLedger = async (): Promise<CrdtSyncEventItem[]> => {
  return request<CrdtSyncEventItem[]>("/sync/ledger");
};

export const apiSimulateSyncConflict = async (): Promise<ConflictSimulationResult> => {
  return request<ConflictSimulationResult>("/sync/simulate-conflict", {
    method: "POST",
  });
};

// ==========================================
// SCENARIO SIMULATOR & SYNTHETIC DATA API
// ==========================================

export const apiGetScenarioPresets = async (): Promise<{ presets: Record<string, PresetScenarioInfo> }> => {
  return request<{ presets: Record<string, PresetScenarioInfo> }>("/simulator/presets");
};

export const apiSimulateScenarioShift = async (payload: {
  workload_delta_pct: number;
  rest_day_compliance_pct: number;
  night_duty_fraction: number;
  leave_delay_days: number;
  cohort_size?: number;
}): Promise<SimulateShiftResponse> => {
  return request<SimulateShiftResponse>("/simulator/simulate-shift", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const apiGenerateScenarioCohort = async (payload: {
  scenario_preset?: string;
  cohort_size?: number;
  workload_delta_pct?: number;
  night_duty_fraction?: number;
  rest_day_compliance_pct?: number;
  leave_delay_days?: number;
  saathi_tough_rate?: number;
  random_seed?: number;
}): Promise<GenerateCohortResponse> => {
  return request<GenerateCohortResponse>("/simulator/generate-cohort", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

