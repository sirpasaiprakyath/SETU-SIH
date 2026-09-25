import React, { useEffect, useState } from "react";
import type {
  User,
  WelfareQueueItem,
  CaseDetail,
  SaathiTrackerItem,
  SaathiTrackerResponse,
  WelfareChatRequestItem,
  WelfarePeerFlagItem,
  NcoOfficerReport
} from "../types";
import {
  apiGetWelfareQueue,
  apiGetCaseDetail,
  apiLogCaseAction,
  apiGetSaathiTracker,
  apiSendSaathiNudge,
  apiNudgeFamilyWelfareCell,
  apiGetWelfareChatRequests,
  apiUpdateChatRequestAction,
  apiGetWelfarePeerFlags,
  apiSchedulePeerTeaProtocol,
  apiGetNcoMusterReports,
  apiGetDhvaniWelfareRecords,
  type DhvaniWelfareRecord
} from "../api";
import { formatRealDateTime } from "../utils/dateUtils";
import { StressTrajectoryCard } from "./StressTrajectoryCard";
import {
  ShieldAlert,
  FileCheck2,
  Lock,
  ChevronRight,
  CheckCircle,
  X,
  Activity,
  Coffee,
  Sparkles,
  BellRing,
  Send,
  Filter,
  Search,
  Check,
  Clock,
  HeartHandshake,
  RefreshCw,
  Home,
  Users,
  Utensils,
  PhoneCall,
  VolumeX,
  EyeOff,
  ClipboardCheck,
  UserCheck,
  Calculator,
  HelpCircle,
  Star,
  ShieldCheck,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Mic
} from "lucide-react";

interface WelfareViewProps {
  currentUser: User;
}

export const WelfareView: React.FC<WelfareViewProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<"triage" | "saathi" | "welfare-chat" | "peer-guard" | "nco-reports" | "dhvani-records">("triage");
  const [queue, setQueue] = useState<WelfareQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [triageFilter, setTriageFilter] = useState<
    "all" | "priority" | "support" | "watch" | "normal" | "insufficient" | "low-confidence" | "quick-login" | "saathi-submitted" | "family-strain"
  >("all");

  // NCO Muster Reports State
  const [ncoReports, setNcoReports] = useState<NcoOfficerReport[]>([]);
  const [selectedNcoUsername, setSelectedNcoUsername] = useState<string>("");
  const [ncoLoading, setNcoLoading] = useState(false);
  const [modalOfficer, setModalOfficer] = useState<NcoOfficerReport | null>(null);
  const [expandedNcoUsername, setExpandedNcoUsername] = useState<string | null>(null);
  const [ncoSearch, setNcoSearch] = useState("");
  const [ncoConcernFilter, setNcoConcernFilter] = useState<"all" | "high" | "normal">("all");

  // Dhvani Records State
  const [dhvaniRecords, setDhvaniRecords] = useState<DhvaniWelfareRecord[]>([]);
  const [dhvaniStats, setDhvaniStats] = useState<{ total: number; elevated_count: number; mild_count: number; optimal_count: number; avg_strain_score: number } | null>(null);
  const [dhvaniLoading, setDhvaniLoading] = useState(false);
  const [dhvaniSearch, setDhvaniSearch] = useState("");
  const [dhvaniTierFilter, setDhvaniTierFilter] = useState<"all" | "Optimal" | "Mild Strain" | "Elevated Fatigue">("all");

  // Saathi Tracker State
  const [saathiData, setSaathiData] = useState<SaathiTrackerResponse | null>(null);
  const [saathiFilter, setSaathiFilter] = useState<"all" | "pending" | "completed">("all");
  const [saathiSearch, setSaathiSearch] = useState("");
  const [nudgeModalTarget, setNudgeModalTarget] = useState<SaathiTrackerItem | null>(null);
  const [nudgeMessage, setNudgeMessage] = useState("");
  const [sendingNudge, setSendingNudge] = useState(false);
  const [nudgeSuccess, setNudgeSuccess] = useState<string | null>(null);
  const [saathiLoading, setSaathiLoading] = useState(false);

  // Requested for Welfare Chat State
  const [chatRequests, setChatRequests] = useState<WelfareChatRequestItem[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [chatStatusFilter, setChatStatusFilter] = useState<"all" | "Pending" | "Scheduled" | "Completed">("all");
  const [chatModalTarget, setChatModalTarget] = useState<WelfareChatRequestItem | null>(null);
  const [modalScheduledAt, setModalScheduledAt] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [modalStatus, setModalStatus] = useState<"Pending" | "Scheduled" | "Completed">("Scheduled");
  const [updatingChat, setUpdatingChat] = useState(false);
  const [chatSuccessMessage, setChatSuccessMessage] = useState<string | null>(null);

  // Anonymous Peer Guard State (Buddy System)
  const [peerFlags, setPeerFlags] = useState<WelfarePeerFlagItem[]>([]);
  const [peerFlagsLoading, setPeerFlagsLoading] = useState(false);
  const [peerFlagsSearch, setPeerFlagsSearch] = useState("");
  const [peerFlagsStatusFilter, setPeerFlagsStatusFilter] = useState<"all" | "New" | "Scheduled_Tea" | "Completed_Informal">("all");
  const [peerFlagsCategoryFilter, setPeerFlagsCategoryFilter] = useState<string>("all");
  const [teaModalTarget, setTeaModalTarget] = useState<WelfarePeerFlagItem | null>(null);
  const [teaModalScheduledAt, setTeaModalScheduledAt] = useState("");
  const [teaModalNotes, setTeaModalNotes] = useState("");
  const [teaModalStatus, setTeaModalStatus] = useState<"New" | "Scheduled_Tea" | "Completed_Informal" | "Dismissed_NonWelfare">("Scheduled_Tea");
  const [savingTeaModal, setSavingTeaModal] = useState(false);
  const [teaSuccessMsg, setTeaSuccessMsg] = useState<string | null>(null);

  // Decision logging form state
  const [officerAction, setOfficerAction] = useState("");
  const [outcome, setOutcome] = useState("contacted");
  const [notes, setNotes] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showProtocolGuide, setShowProtocolGuide] = useState(true);
  const [showMethodology, setShowMethodology] = useState(false);

  useEffect(() => {
    loadQueue();
    loadSaathiTracker();
    loadChatRequests();
    loadPeerFlags();
    loadNcoReports();
    loadDhvaniRecords();
  }, []);

  useEffect(() => {
    if (activeTab === "saathi") {
      loadSaathiTracker();
    } else if (activeTab === "triage") {
      loadQueue();
    } else if (activeTab === "welfare-chat") {
      loadChatRequests();
    } else if (activeTab === "peer-guard") {
      loadPeerFlags();
    } else if (activeTab === "nco-reports") {
      loadNcoReports();
    } else if (activeTab === "dhvani-records") {
      loadDhvaniRecords();
    }
  }, [activeTab]);

  const loadNcoReports = async () => {
    setNcoLoading(true);
    try {
      const data = await apiGetNcoMusterReports();
      setNcoReports(data.reports);
      if (data.reports.length > 0 && !selectedNcoUsername) {
        setSelectedNcoUsername(data.reports[0].nco_username);
      }
    } catch (err) {
      console.error("Failed to load NCO muster reports", err);
    } finally {
      setNcoLoading(false);
    }
  };

  const loadDhvaniRecords = async () => {
    setDhvaniLoading(true);
    try {
      const data = await apiGetDhvaniWelfareRecords();
      setDhvaniRecords(data.records);
      setDhvaniStats({
        total: data.total,
        elevated_count: data.elevated_count,
        mild_count: data.mild_count,
        optimal_count: data.optimal_count,
        avg_strain_score: data.avg_strain_score,
      });
    } catch (err) {
      console.error("Failed to load Dhvani records", err);
    } finally {
      setDhvaniLoading(false);
    }
  };

  const loadPeerFlags = async () => {
    setPeerFlagsLoading(true);
    try {
      const data = await apiGetWelfarePeerFlags();
      setPeerFlags(data);
    } catch (err) {
      console.error("Failed to load peer flags", err);
    } finally {
      setPeerFlagsLoading(false);
    }
  };

  const handleOpenTeaModal = (flag: WelfarePeerFlagItem) => {
    setTeaModalTarget(flag);
    setTeaModalScheduledAt(flag.scheduled_tea_at || "Tomorrow, 16:30 @ Welfare Room / Tea Post");
    setTeaModalNotes(flag.welfare_notes || "");
    setTeaModalStatus(flag.status === "New" ? "Scheduled_Tea" : (flag.status as any));
    setTeaSuccessMsg(null);
  };

  const handleSaveTeaAction = async () => {
    if (!teaModalTarget) return;
    setSavingTeaModal(true);
    try {
      const res = await apiSchedulePeerTeaProtocol(teaModalTarget.id, {
        status: teaModalStatus,
        scheduled_tea_at: teaModalScheduledAt,
        welfare_notes: teaModalNotes
      });
      setTeaSuccessMsg(res.message);
      await loadPeerFlags();
      setTimeout(() => {
        setTeaModalTarget(null);
        setTeaSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      alert(`Error updating tea protocol: ${err.message}`);
    } finally {
      setSavingTeaModal(false);
    }
  };

  const handleQuickCompleteTea = async (flag: WelfarePeerFlagItem) => {
    try {
      await apiSchedulePeerTeaProtocol(flag.id, {
        status: "Completed_Informal",
        scheduled_tea_at: flag.scheduled_tea_at || undefined,
        welfare_notes: flag.welfare_notes ? `${flag.welfare_notes} (Completed informal tea)` : "Completed informal tea catch-up."
      });
      await loadPeerFlags();
    } catch (err: any) {
      alert(`Failed to complete: ${err.message}`);
    }
  };

  const loadChatRequests = async () => {
    setChatLoading(true);
    try {
      const data = await apiGetWelfareChatRequests();
      setChatRequests(data);
    } catch (err) {
      console.error("Failed to load welfare chat requests", err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleOpenChatModal = (item: WelfareChatRequestItem) => {
    setChatModalTarget(item);
    setModalScheduledAt(item.scheduled_at || "Tomorrow, 10:30 AM @ Welfare Cell");
    setModalNotes(item.notes || "");
    setModalStatus((item.status as any) || "Scheduled");
    setChatSuccessMessage(null);
  };

  const handleSaveChatAction = async () => {
    if (!chatModalTarget) return;
    setUpdatingChat(true);
    try {
      const res = await apiUpdateChatRequestAction(chatModalTarget.id, {
        status: modalStatus,
        scheduled_at: modalScheduledAt,
        notes: modalNotes
      });
      setChatSuccessMessage(res.message);
      await loadChatRequests();
      setTimeout(() => {
        setChatModalTarget(null);
        setChatSuccessMessage(null);
      }, 1200);
    } catch (err: any) {
      alert(`Error updating chat request: ${err.message}`);
    } finally {
      setUpdatingChat(false);
    }
  };

  const handleQuickCompleteChat = async (item: WelfareChatRequestItem) => {
    try {
      await apiUpdateChatRequestAction(item.id, {
        status: "Completed",
        notes: "Informal tea meeting conducted quietly at unit canteen. Officer/Personnel supported."
      });
      await loadChatRequests();
    } catch (err: any) {
      alert(`Error completing request: ${err.message}`);
    }
  };

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await apiGetWelfareQueue();
      setQueue(data.queue);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSaathiTracker = async () => {
    setSaathiLoading(true);
    try {
      const data = await apiGetSaathiTracker();
      setSaathiData(data);
    } catch (err) {
      console.error("Failed to load Saathi tracker", err);
    } finally {
      setSaathiLoading(false);
    }
  };

  const handleOpenNudgeModal = (item: SaathiTrackerItem) => {
    setNudgeModalTarget(item);
    setNudgeMessage(`A gentle reminder from Welfare Officer (${currentUser.full_name}): Take a brief 60-second Saathi check-in to reflect on your duty rhythm.`);
    setNudgeSuccess(null);
  };

  const handleSendNudge = async () => {
    if (!nudgeModalTarget) return;
    setSendingNudge(true);
    try {
      const res = await apiSendSaathiNudge(nudgeModalTarget.personnel_id, nudgeMessage);
      setNudgeSuccess(res.message);
      // Reload Saathi Tracker
      await loadSaathiTracker();
      setTimeout(() => {
        setNudgeModalTarget(null);
        setNudgeSuccess(null);
      }, 1500);
    } catch (err: any) {
      alert(`Error sending reminder: ${err.message}`);
    } finally {
      setSendingNudge(false);
    }
  };


  const handleOpenCase = async (caseId: number) => {
    setSelectedCaseId(caseId);
    setDetailLoading(true);
    setActionSuccess(null);
    try {
      // NOTE: This call automatically records an entry in the audit_logs table on the backend
      const detail = await apiGetCaseDetail(caseId);
      setCaseDetail(detail);
      setOfficerAction(detail.officer_action || "");
      setOutcome(detail.outcome || "contacted");
      setNotes(detail.notes || "");
    } catch (err: any) {
      alert(`Error loading case: ${err.message}`);
      setSelectedCaseId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const applyPresetAction = (actionText: string, outcomeKey: string, noteSuggestion: string) => {
    setOfficerAction(actionText);
    setOutcome(outcomeKey);
    setNotes((prev) => (prev ? `${prev}\n${noteSuggestion}` : noteSuggestion));
  };

  const handleLogDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !officerAction.trim()) return;

    setSubmittingAction(true);
    try {
      const res = await apiLogCaseAction(selectedCaseId, {
        officer_action: officerAction,
        outcome,
        notes,
        status: "Resolved",
      });
      setActionSuccess(res.message);
      // Refresh case detail and queue
      const updated = await apiGetCaseDetail(selectedCaseId);
      setCaseDetail(updated);
      loadQueue();
    } catch (err: any) {
      alert(`Error recording decision: ${err.message}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  const [nudgingFamilyCell, setNudgingFamilyCell] = useState(false);

  const handleNudgeFamilyCell = async () => {
    if (!caseDetail) return;
    setNudgingFamilyCell(true);
    try {
      const res = await apiNudgeFamilyWelfareCell(
        caseDetail.case_id,
        `Extended separation (${caseDetail.posting_duration_months} mo) with ${caseDetail.family_structure || "nuclear"} family household.`
      );
      setActionSuccess(res.message);
      // Refresh case detail and queue
      const updated = await apiGetCaseDetail(caseDetail.case_id);
      setCaseDetail(updated);
      setOfficerAction(updated.officer_action || "");
      setOutcome(updated.outcome || "contacted");
      setNotes(updated.notes || "");
      loadQueue();
    } catch (err: any) {
      alert(`Error dispatching Family Welfare Cell nudge: ${err.message}`);
    } finally {
      setNudgingFamilyCell(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-primary mx-auto mb-3"></div>
        <p className="text-sm text-text-muted">Loading Welfare Workstation...</p>
      </div>
    );
  }

  // Filtered Saathi roster
  const filteredSaathiRoster = (saathiData?.roster || []).filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(saathiSearch.toLowerCase()) ||
      item.personnel_id.toLowerCase().includes(saathiSearch.toLowerCase()) ||
      item.company.toLowerCase().includes(saathiSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (saathiFilter === "pending") return !item.has_completed;
    if (saathiFilter === "completed") return item.has_completed;
    return true;
  });

  // Filtered Welfare Chat Requests
  const filteredChatRequests = chatRequests.filter((item) => {
    const query = chatSearch.toLowerCase();
    const matchesSearch =
      query === "" ||
      item.name.toLowerCase().includes(query) ||
      item.personnel_id.toLowerCase().includes(query) ||
      item.rank.toLowerCase().includes(query) ||
      item.company.toLowerCase().includes(query);

    if (!matchesSearch) return false;
    if (chatStatusFilter !== "all" && item.status !== chatStatusFilter) return false;
    return true;
  });

  // Filtered Anonymous Peer Flags (Buddy System)
  const filteredPeerFlags = peerFlags.filter((item) => {
    const q = peerFlagsSearch.toLowerCase();
    const matchesSearch =
      q === "" ||
      item.target_name.toLowerCase().includes(q) ||
      item.target_personnel_id.toLowerCase().includes(q) ||
      item.target_company.toLowerCase().includes(q) ||
      item.observation_text.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (peerFlagsStatusFilter !== "all" && item.status !== peerFlagsStatusFilter) return false;
    if (peerFlagsCategoryFilter !== "all" && item.care_category !== peerFlagsCategoryFilter) return false;
    return true;
  });

  // NCO Muster Reports Computed Helpers (Resolved only when modal or inline accordion is opened)
  const activeOfficer = modalOfficer || (expandedNcoUsername ? ncoReports.find((r) => r.nco_username === expandedNcoUsername) : null);

  const filteredObservations = activeOfficer
    ? activeOfficer.observations.filter((obs) => {
        const q = ncoSearch.toLowerCase();
        const matchesSearch =
          q === "" ||
          obs.name.toLowerCase().includes(q) ||
          obs.personnel_id.toLowerCase().includes(q) ||
          (obs.note && obs.note.toLowerCase().includes(q));
        if (!matchesSearch) return false;
        if (ncoConcernFilter === "high") return obs.concern_score >= 3;
        if (ncoConcernFilter === "normal") return obs.concern_score < 3;
        return true;
      })
    : [];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Top Banner - Explaining Welfare Role Boundaries */}
      <div className="gov-card p-6 border-l-4 border-gold bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="badge-gold font-bold">Welfare Officer Workstation</span>
              <span className="text-[11px] text-text-muted">| Sole Access Point for Flagged Records & Saathi Tracker</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-navy-primary mt-1">
              Personnel Baseline Drift &amp; Saathi Console
            </h1>
            <p className="text-xs text-text-muted mt-1 font-sans">
              Active Triage Cases: <span className="font-semibold text-navy-primary">{queue.length}</span> • Saathi Completion: <span className="font-semibold text-navy-primary">{saathiData?.completion_rate_pct || 0}%</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShowMethodology(!showMethodology)}
              className="px-3.5 py-2 rounded bg-gold/20 hover:bg-gold/30 text-navy-primary border border-gold/50 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
              title="View mathematical formulas and ML model calculation details for review likelihood percentage"
            >
              <Calculator className="w-3.5 h-3.5 text-navy-primary" />
              <span>{showMethodology ? "Hide Calculation Methodology ▲" : "How Likelihood is Calculated (Math & Model) ▼"}</span>
            </button>
            <div className="p-2.5 bg-navy-primary text-white rounded-[2px] text-xs font-mono flex items-center space-x-2">
              <Lock className="w-3.5 h-3.5 text-gold" />
              <span>Audit Trail Active</span>
            </div>
          </div>
        </div>

        {/* Collapsible Methodology & Mathematical Formulation Panel */}
        {showMethodology && (
          <div className="mt-5 p-5 sm:p-6 rounded-lg bg-slate-50 border border-slate-200 text-text-primary space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-navy-primary text-gold flex items-center justify-center shrink-0">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-navy-primary">
                    Assessment Methodology: How Operational Stress &amp; Review Likelihood (%) Are Calculated
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Scientific separation: (1) Behavioral Analytics Engine (Feature Derivation) vs. (2) XGBoost ML Prediction Model (Inference)
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-navy-primary/10 text-navy-primary text-xs font-bold border border-navy-primary/20 self-start sm:self-auto">
                Calibrated XGBoost + TreeSHAP (AUC 0.858)
              </span>
            </div>

            {/* Core Distinction Grid: Layer 1 vs Layer 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Layer 1 */}
              <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center space-x-2 text-navy-primary font-bold text-xs pb-2 border-b border-slate-100">
                  <Activity className="w-4 h-4 text-sky-700" />
                  <span className="uppercase tracking-wider">Predictive Behavioral Analytics Engine</span>
                </div>
                <div className="text-xs space-y-2 text-slate-700">
                  <p className="font-semibold text-navy-primary">
                    Core Mandate: Longitudinal telemetry tracking against each individual's own historical baseline (not an arbitrary population norm).
                  </p>
                  <p className="text-text-muted leading-relaxed">
                    An introverted personnel who rarely visits the dispensary suddenly reporting sick 4 times in 90 days has a large personal shift (+2.67 z-score), whereas an active individual at that exact same level might have zero drift.
                  </p>
                  <div className="p-3 bg-sky-50/60 rounded border border-sky-100 font-mono text-[11px] text-sky-950 space-y-1">
                    <div className="font-bold text-sky-900 font-sans text-xs">Standardized Personal Shift (Scaled Deviation):</div>
                    <div>• Scaled(Sick Drift) = (sick_reports_90d - baseline_90d) / 1.5</div>
                    <div>• Scaled(NCO Drift) = (nco_obs_current - baseline) / 1.0</div>
                    <div>• Scaled(Leave Deficit) = ((100 - leave_utilization_ratio*100) - 35) / 20</div>
                    <div>• Scaled(Saathi Tough Drift) = (saathi_tough_rate - baseline_rate) / 0.15</div>
                  </div>
                  <div className="p-2.5 bg-slate-100 rounded text-slate-800 text-[11px]">
                    <strong>Composite Shift Formula (Multi-signal Scaled Drift):</strong><br />
                    <code className="text-navy-primary font-bold">
                      Composite Shift = 0.25·Scaled(Sick) + 0.25·Scaled(NCO) + 0.20·Scaled(Leave) + 0.30·Scaled(Saathi Tough)
                    </code>
                  </div>
                </div>
              </div>

              {/* Layer 2 */}
              <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center space-x-2 text-navy-primary font-bold text-xs pb-2 border-b border-slate-100">
                  <Sparkles className="w-4 h-4 text-gold" />
                  <span className="uppercase tracking-wider">Operational Duty Strain &amp; Fatigue Risk Model</span>
                </div>
                <div className="text-xs space-y-2 text-slate-700">
                  <p className="font-semibold text-navy-primary">
                    Core Mandate: Calibrated machine learning ensemble predicting the exact likelihood that an individual would benefit from welfare triage.
                  </p>
                  <p className="text-text-muted leading-relaxed">
                    Ingests 34 standardized features (composite shift + operational load + family separation hardship + fatigue index) through trained <code>baseline_model.json</code>.
                  </p>
                  <div className="p-3 bg-amber-50/60 rounded border border-amber-200 font-mono text-[11px] text-amber-950 space-y-1">
                    <div className="font-bold text-amber-900 font-sans text-xs">Logistic Probability Output (%):</div>
                    <div>P(Welfare Review) = 1 / (1 + e^-(Tree_Ensemble_Margin)) * 100%</div>
                    <div>• Triage Threshold: P ≥ 50.0% enters Welfare Queue</div>
                    <div>• Crisis Override: Safety Net trigger escalates to ≥ 88.0%</div>
                  </div>
                  <div className="p-2.5 bg-slate-100 rounded text-slate-800 text-[11px]">
                    <strong>TreeSHAP Explainability:</strong><br />
                    Decomposes log-odds: <code className="text-navy-primary font-bold">Margin = Base + Σ φ_i</code>.
                    Ranks top 3 features by absolute SHAP attribution <code className="text-navy-primary font-bold">|φ_i|</code> into plain Hindi &amp; English reasons.
                  </div>
                </div>
              </div>
            </div>

            {/* Step-by-Step Walkthrough Strip */}
            <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-3">
              <div className="font-bold text-xs text-navy-primary flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-gold-dark" />
                <span>Executive Summary for Jury / Reviewers: "How Do You Calculate This?"</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                  <span className="font-bold text-navy-primary block">Step 1: Telemetry Ingestion</span>
                  <p className="text-[11px] text-text-muted">
                    Telemetry ingested from HRMS (leave, duty hours, night shifts), NCO muster observations, and Saathi weekly check-ins.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                  <span className="font-bold text-navy-primary block">Step 2: Baseline Deviation</span>
                  <p className="text-[11px] text-text-muted">
                    Engine subtracts the personnel's 90-day personal baseline normal to produce normalized z-scores (avoiding population bias).
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                  <span className="font-bold text-navy-primary block">Step 3: XGBoost Inference</span>
                  <p className="text-[11px] text-text-muted">
                    34 features pass into XGBoost to compute calibrated Review Likelihood % (ROC-AUC 0.858, PR-AUC 0.414).
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                  <span className="font-bold text-navy-primary block">Step 4: SHAP Translation</span>
                  <p className="text-[11px] text-text-muted">
                    TreeSHAP isolates the top-3 contributing drivers into plain language reasons without opaque medical jargon.
                  </p>
                </div>
              </div>
            </div>

            {/* Ethical Safety Guarantee */}
            <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center space-x-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Operational Duty Strain vs. Medical Determination:</strong> This system measures service workload, rest compliance, and fatigue trends. It is an administrative welfare support tool to schedule an informal cup of tea with the Welfare Officer before stress compounds, with zero impact on ACRs or service records.
              </span>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="mt-6 flex border-b border-neutral-border space-x-2">
          <button
            onClick={() => setActiveTab("triage")}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-2 ${
              activeTab === "triage"
                ? "border-navy-primary text-navy-primary"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Baseline Drift Triage Queue ({queue.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("saathi");
            }}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-2 ${
              activeTab === "saathi"
                ? "border-emerald-600 text-emerald-800 bg-emerald-50/60"
                : "border-transparent text-emerald-700 hover:text-emerald-900"
            }`}
          >
            <Sparkles className="w-4 h-4 text-gold" />
            <span>Saathi Forms & Unit Roster ({saathiData?.completed_count || 0} completed)</span>
          </button>

          <button
            onClick={() => setActiveTab("welfare-chat")}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-2 ${
              activeTab === "welfare-chat"
                ? "border-amber-600 text-amber-900 bg-amber-50/60"
                : "border-transparent text-amber-700 hover:text-amber-900"
            }`}
          >
            <Coffee className="w-4 h-4 text-amber-600" />
            <span>Requested for Welfare Chat ({chatRequests.length})</span>
            {chatRequests.filter(r => r.status === "Pending").length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {chatRequests.filter(r => r.status === "Pending").length} pending
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("peer-guard")}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-2 ${
              activeTab === "peer-guard"
                ? "border-rose-600 text-rose-900 bg-rose-50/60"
                : "border-transparent text-rose-700 hover:text-rose-900"
            }`}
          >
            <Users className="w-4 h-4 text-rose-600" />
            <span>Buddy Drop Box & Peer Guard ({peerFlags.length})</span>
            {peerFlags.filter(f => f.status === "New").length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                {peerFlags.filter(f => f.status === "New").length} new
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("nco-reports")}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-2 ${
              activeTab === "nco-reports"
                ? "border-blue-600 text-blue-900 bg-blue-50/60"
                : "border-transparent text-blue-700 hover:text-blue-900"
            }`}
          >
            <ClipboardCheck className="w-4 h-4 text-blue-600" />
            <span>NCO Officer Reports ({ncoReports.reduce((acc, r) => acc + r.total_evaluated, 0)})</span>
            {ncoReports.reduce((acc, r) => acc + r.high_concern_count, 0) > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-bold">
                {ncoReports.reduce((acc, r) => acc + r.high_concern_count, 0)} elevated
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("dhvani-records")}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-2 ${
              activeTab === "dhvani-records"
                ? "border-purple-600 text-purple-900 bg-purple-50/60"
                : "border-transparent text-purple-700 hover:text-purple-900"
            }`}
          >
            <Mic className="w-4 h-4 text-purple-600" />
            <span>Dhvani Voice Records ({dhvaniStats?.total ?? 0})</span>
            {(dhvaniStats?.elevated_count ?? 0) > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                {dhvaniStats!.elevated_count} elevated
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ==========================================
          TAB 1: BASELINE DRIFT TRIAGE QUEUE
      ========================================== */}
      {activeTab === "triage" && (
        <div className="gov-card">
          <div className="gov-card-header flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-navy-primary" />
                <h2 className="text-sm font-serif font-bold text-navy-primary">
                  Flagged Personnel Queue ({queue.length} Individuals)
                </h2>
              </div>
              <span className="text-xs text-text-muted">
                Prioritised by degree of drift from personal baseline and family vulnerability
              </span>
            </div>

            {/* Quick Filter Toolbar with Early Warning Levels */}
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              <button
                onClick={() => setTriageFilter("all")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  triageFilter === "all"
                    ? "bg-navy-primary text-white shadow-xs"
                    : "bg-white text-navy-darker border border-neutral-border hover:bg-neutral-hover"
                }`}
              >
                All ({queue.length})
              </button>

              {/* 🔴 PRIORITY */}
              <button
                onClick={() => setTriageFilter("priority")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center space-x-1 ${
                  triageFilter === "priority"
                    ? "bg-rose-700 text-white shadow-xs"
                    : "bg-rose-50 text-rose-900 border border-rose-300 hover:bg-rose-100"
                }`}
              >
                <span>🔴 Priority ({queue.filter((q) => q.stress_trajectory?.early_warning_level === "PRIORITY").length})</span>
              </button>

              {/* 🟠 SUPPORT */}
              <button
                onClick={() => setTriageFilter("support")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center space-x-1 ${
                  triageFilter === "support"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
                }`}
              >
                <span>🟠 Support ({queue.filter((q) => q.stress_trajectory?.early_warning_level === "SUPPORT").length})</span>
              </button>

              {/* 🟡 WATCH */}
              <button
                onClick={() => setTriageFilter("watch")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center space-x-1 ${
                  triageFilter === "watch"
                    ? "bg-yellow-600 text-white shadow-xs"
                    : "bg-yellow-50 text-yellow-900 border border-yellow-300 hover:bg-yellow-100"
                }`}
              >
                <span>🟡 Watch ({queue.filter((q) => q.stress_trajectory?.early_warning_level === "WATCH").length})</span>
              </button>

              {/* 🟢 NORMAL */}
              <button
                onClick={() => setTriageFilter("normal")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center space-x-1 ${
                  triageFilter === "normal"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100"
                }`}
              >
                <span>🟢 Normal ({queue.filter((q) => q.stress_trajectory?.early_warning_level === "NORMAL").length})</span>
              </button>

              {/* ⚪ INSUFFICIENT DATA (Responsible AI) */}
              <button
                onClick={() => setTriageFilter("insufficient")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center space-x-1 ${
                  triageFilter === "insufficient"
                    ? "bg-slate-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200"
                }`}
                title="Responsible AI: Scoring suppressed due to sparse recent wellness data"
              >
                <span>⚪ Insufficient Data ({queue.filter((q) => q.stress_trajectory?.early_warning_level === "INSUFFICIENT_DATA" || q.stress_trajectory?.is_insufficient_data).length})</span>
              </button>

              {/* ⚠️ LOW CONFIDENCE (Human Review Recommended) */}
              <button
                onClick={() => setTriageFilter("low-confidence")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center space-x-1 ${
                  triageFilter === "low-confidence"
                    ? "bg-rose-700 text-white shadow-xs"
                    : "bg-rose-50 text-rose-900 border border-rose-300 hover:bg-rose-100"
                }`}
                title="Cases with borderline model confidence where human review is recommended"
              >
                <span>⚠️ Human Review Needed ({queue.filter((q) => q.stress_trajectory?.is_low_confidence).length})</span>
              </button>

              <button
                onClick={() => setTriageFilter("quick-login")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center space-x-1 ${
                  triageFilter === "quick-login"
                    ? "bg-indigo-700 text-white shadow-xs"
                    : "bg-indigo-50 text-indigo-900 border border-indigo-300 hover:bg-indigo-100"
                }`}
              >
                <span>⚡ Demos ({queue.filter((q) => q.is_demo_user).length})</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full gov-table">
              <thead>
                <tr>
                  <th>Personnel Details</th>
                  <th>Unit & Force</th>
                  <th>Saathi Status</th>
                  <th>Family Support Load</th>
                  <th>Plain-Language Contributing Shifts</th>
                  <th>Stress Trajectory &amp; Trend</th>
                  <th>Case Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {queue
                  .filter((item) => {
                    if (triageFilter === "priority") return item.stress_trajectory?.early_warning_level === "PRIORITY";
                    if (triageFilter === "support") return item.stress_trajectory?.early_warning_level === "SUPPORT";
                    if (triageFilter === "watch") return item.stress_trajectory?.early_warning_level === "WATCH";
                    if (triageFilter === "normal") return item.stress_trajectory?.early_warning_level === "NORMAL";
                    if (triageFilter === "insufficient") return item.stress_trajectory?.early_warning_level === "INSUFFICIENT_DATA" || item.stress_trajectory?.is_insufficient_data;
                    if (triageFilter === "low-confidence") return item.stress_trajectory?.is_low_confidence;
                    if (triageFilter === "quick-login") return item.is_demo_user;
                    if (triageFilter === "saathi-submitted") return item.has_saathi_submission;
                    if (triageFilter === "family-strain") return item.has_family_separation_strain;
                    return true;
                  })
                  .map((item) => (
                    <tr key={item.case_id} className="cursor-pointer hover:bg-neutral-hover/50">
                      {/* Personnel Info */}
                      <td onClick={() => handleOpenCase(item.case_id)}>
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="font-semibold text-navy-primary text-sm">{item.name}</span>
                          {item.is_demo_user && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center space-x-0.5">
                              <span>⚡</span>
                              <span>{item.demo_role_label || "Quick Login Demo"}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono text-text-muted">{item.personnel_id} • {item.rank}</div>
                      </td>

                      {/* Force / Company */}
                      <td onClick={() => handleOpenCase(item.case_id)}>
                        <div className="text-xs font-medium text-navy-primary">{item.force}</div>
                        <div className="text-[11px] text-text-muted">{item.company}</div>
                      </td>

                      {/* Saathi Status */}
                      <td onClick={() => handleOpenCase(item.case_id)}>
                        {item.has_saathi_submission ? (
                          <div>
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <Check className="w-3 h-3 text-emerald-700" />
                              <span>Form Completed</span>
                            </span>
                            <div className="text-[10px] text-text-muted mt-0.5">
                              {item.saathi_completed_at}
                            </div>
                            {item.saathi_strain_tier && (
                              <div className="text-[10px] font-semibold text-emerald-800">
                                {item.saathi_strain_tier}
                              </div>
                            )}
                            {item.saathi_welfare_requested && (
                              <span className="inline-block mt-0.5 text-[9px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                                ☕ Tea Outreach Requested
                              </span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-neutral-card text-text-muted border border-neutral-border">
                              <Clock className="w-3 h-3 text-text-muted" />
                              <span>Pending Check-In</span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Family Support Load */}
                      <td onClick={() => handleOpenCase(item.case_id)}>
                        <div className="text-xs font-semibold text-navy-primary capitalize">
                          {item.family_structure ? `${item.family_structure} Family` : "Joint Family"}
                        </div>
                        {item.has_family_separation_strain ? (
                          <div className="mt-0.5 inline-flex items-center space-x-1 text-[10px] font-bold text-purple-900 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-300">
                            <span>Separation Load: {item.family_separation_load?.toFixed(1)}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-text-muted">
                            Separation Load: {item.family_separation_load?.toFixed(1) || "0.0"}
                          </div>
                        )}
                      </td>

                      {/* Plain Language Reasons */}
                      <td onClick={() => handleOpenCase(item.case_id)} className="max-w-md">
                        <div className="space-y-1">
                          {item.plain_language_reasons.slice(0, 2).map((reason, idx) => (
                            <div key={idx} className="text-xs text-navy-darker flex items-start space-x-1.5">
                              <span className="text-gold font-bold shrink-0">•</span>
                              <span className="line-clamp-2">{reason}</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Stress Trajectory & Trend Engine */}
                      <td onClick={() => handleOpenCase(item.case_id)} className="whitespace-nowrap cursor-pointer">
                        <StressTrajectoryCard trajectory={item.stress_trajectory} compact={true} />
                      </td>

                      {/* Status */}
                      <td onClick={() => handleOpenCase(item.case_id)}>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            item.status === "Resolved"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-900 border border-amber-300"
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.last_outcome && (
                          <div className="text-[10px] text-text-muted capitalize mt-1">
                            Outcome: {item.last_outcome.replace(/_/g, " ")}
                          </div>
                        )}
                      </td>

                      {/* Open Button */}
                      <td className="text-right">
                        <button
                          onClick={() => handleOpenCase(item.case_id)}
                          className="px-3 py-1.5 rounded bg-navy-primary hover:bg-navy-light text-white text-xs font-semibold inline-flex items-center space-x-1 transition-colors"
                        >
                          <span>Review Case</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: SAATHI CHECK-IN TRACKER & NUDGES
      ========================================== */}
      {activeTab === "saathi" && (
        <div className="space-y-6">
          {/* Saathi Metrics Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="gov-card p-4">
              <span className="text-xs text-text-muted">Total Unit Strength</span>
              <div className="text-2xl font-serif font-bold text-navy-primary mt-1">
                {saathiData?.total_personnel || 0}
              </div>
              <p className="text-[11px] text-text-muted mt-1">Assigned Personnel</p>
            </div>

            <div className="gov-card p-4 border-l-4 border-emerald-500">
              <span className="text-xs text-text-muted">Saathi Completed</span>
              <div className="text-2xl font-serif font-bold text-emerald-700 mt-1">
                {saathiData?.completed_count || 0} <span className="text-sm font-sans font-normal text-text-muted">({saathiData?.completion_rate_pct || 0}%)</span>
              </div>
              <div className="w-full bg-neutral-border h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all"
                  style={{ width: `${saathiData?.completion_rate_pct || 0}%` }}
                />
              </div>
            </div>

            <div className="gov-card p-4 border-l-4 border-amber-500">
              <span className="text-xs text-text-muted">Pending Check-In</span>
              <div className="text-2xl font-serif font-bold text-amber-900 mt-1">
                {saathiData?.pending_count || 0}
              </div>
              <p className="text-[11px] text-text-muted mt-1">Awaiting 60s Check-in</p>
            </div>

            <div className="gov-card p-4 border-l-4 border-navy-primary">
              <span className="text-xs text-text-muted">Welfare Chat Requests</span>
              <div className="text-2xl font-serif font-bold text-navy-primary mt-1">
                {(saathiData?.roster || []).filter((r) => r.requested_welfare_outreach).length}
              </div>
              <p className="text-[11px] text-text-muted mt-1">Voluntary flags from Troops</p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="gov-card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by Name, Service ID, or Company..."
                  value={saathiSearch}
                  onChange={(e) => setSaathiSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded border border-neutral-border text-xs outline-none focus:border-navy-primary"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-xs text-text-muted font-medium">Filter:</span>
                <div className="inline-flex rounded-lg border border-neutral-border p-0.5 bg-neutral-card">
                  <button
                    onClick={() => setSaathiFilter("all")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      saathiFilter === "all"
                        ? "bg-white text-navy-primary shadow-xs"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    All ({saathiData?.total_personnel || 0})
                  </button>
                  <button
                    onClick={() => setSaathiFilter("pending")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      saathiFilter === "pending"
                        ? "bg-white text-amber-900 shadow-xs"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Pending Form ({saathiData?.pending_count || 0})
                  </button>
                  <button
                    onClick={() => setSaathiFilter("completed")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      saathiFilter === "completed"
                        ? "bg-white text-emerald-800 shadow-xs"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Completed ({saathiData?.completed_count || 0})
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Saathi Completion Status Table */}
          <div className="gov-card">
            <div className="gov-card-header">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-gold" />
                <h2 className="text-sm font-serif font-bold text-navy-primary">
                  Saathi Check-in Status Roster ({filteredSaathiRoster.length} Records)
                </h2>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-text-muted hidden sm:inline">
                  Monitor check-in engagement without viewing private text entries
                </span>
                <button
                  onClick={loadSaathiTracker}
                  disabled={saathiLoading}
                  className="p-1.5 rounded hover:bg-neutral-hover border border-neutral-border text-text-muted hover:text-text-primary transition-colors inline-flex items-center space-x-1 text-xs"
                  title="Refresh Tracker"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${saathiLoading ? "animate-spin text-navy-primary" : ""}`} />
                  <span className="text-[11px] font-medium">Refresh</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full gov-table">
                <thead>
                  <tr>
                    <th>Personnel</th>
                    <th>Subunit & Station</th>
                    <th>Saathi Form Status</th>
                    <th>AI Model Verification</th>
                    <th>Welfare Nudges Sent</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSaathiRoster.map((item) => (
                    <tr key={item.personnel_id} className="hover:bg-neutral-hover/40">
                      <td>
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="font-semibold text-navy-primary text-sm">{item.name}</span>
                          {item.is_demo_user && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center space-x-0.5">
                              <span>⚡</span>
                              <span>{item.demo_role_label || "Quick Login Demo"}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono text-text-muted">{item.personnel_id} • {item.rank}</div>
                      </td>

                      <td>
                        <div className="text-xs font-medium text-navy-primary">{item.company}</div>
                        <div className="text-[11px] text-text-muted capitalize">
                          {item.posting_category.replace(/_/g, " ")}
                        </div>
                      </td>

                      <td>
                        {item.has_completed ? (
                          <div>
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                              <Check className="w-3 h-3 text-emerald-700" />
                              <span>Completed</span>
                            </span>
                            <div className="text-[10px] text-text-muted mt-0.5">
                              {item.last_completed_at}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-700" />
                              <span>Pending Form</span>
                            </span>
                            <div className="text-[10px] text-text-muted mt-0.5 italic">
                              Not filled in current cycle
                            </div>
                          </div>
                        )}
                      </td>

                      <td>
                        {item.has_completed ? (
                          <div>
                            <span className="text-xs font-bold text-navy-primary">
                              {item.strain_tier}
                            </span>
                            {item.model_verification_score && (
                              <span className="text-[11px] font-mono text-text-muted ml-1.5">
                                ({(item.model_verification_score * 100).toFixed(0)}%)
                              </span>
                            )}
                            {item.requested_welfare_outreach && (
                              <div className="mt-1 flex items-center space-x-1 text-[10px] text-amber-900 font-bold">
                                <HeartHandshake className="w-3 h-3 text-amber-700" />
                                <span>Requested Welfare Chat</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted italic">Awaiting Response</span>
                        )}
                      </td>

                      <td>
                        {item.nudge_count > 0 ? (
                          <div>
                            <span className="text-xs font-semibold text-navy-primary">
                              {item.nudge_count} reminder{item.nudge_count > 1 ? "s" : ""} sent
                            </span>
                            <div className="text-[10px] text-text-muted">
                              Last: {item.last_nudge_at}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted">No nudges sent</span>
                        )}
                      </td>

                      <td className="text-right">
                        {!item.has_completed ? (
                          <button
                            onClick={() => handleOpenNudgeModal(item)}
                            className="px-3 py-1.5 rounded bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors shadow-xs"
                          >
                            <BellRing className="w-3.5 h-3.5 text-amber-700" />
                            <span>Send Nudge</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenNudgeModal(item)}
                            className="px-3 py-1.5 rounded bg-white hover:bg-neutral-hover border border-neutral-border text-text-muted text-xs font-medium inline-flex items-center space-x-1.5 transition-colors"
                          >
                            <Send className="w-3 h-3 text-text-muted" />
                            <span>Send Note</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: REQUESTED FOR WELFARE CHAT
      ========================================== */}
      {activeTab === "welfare-chat" && (
        <div className="space-y-6">
          {/* Strict Privacy Protection Banner */}
          <div className="p-4 bg-navy-primary text-white rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm border-l-4 border-amber-500">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-white/10 text-gold flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center space-x-2">
                  <span>Confidential Welfare Outreach Registry</span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">MHA Privacy Directive</span>
                </h3>
                <p className="text-xs text-neutral-light/80 mt-0.5">
                  Visible exclusively to the Unit Welfare Officer. <strong>Higher Officials and Battalion Command have ZERO access</strong> to this registry. Reaching out or requesting a chat creates NO punitive record, note, or flag in service dossiers.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] font-mono text-gold px-2.5 py-1 bg-white/10 rounded border border-white/10">
                🔒 Higher Officials Blocked
              </span>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="gov-card p-4">
              <span className="text-xs text-text-muted">Total Chat Requests</span>
              <div className="text-2xl font-serif font-bold text-navy-primary mt-1">
                {chatRequests.length}
              </div>
              <p className="text-[11px] text-text-muted mt-1">Officers & Troops</p>
            </div>

            <div className="gov-card p-4 border-l-4 border-amber-500">
              <span className="text-xs text-text-muted">Pending Outreach</span>
              <div className="text-2xl font-serif font-bold text-amber-700 mt-1">
                {chatRequests.filter((r) => r.status === "Pending").length}
              </div>
              <p className="text-[11px] text-text-muted mt-1">Awaiting Welfare Officer</p>
            </div>

            <div className="gov-card p-4 border-l-4 border-blue-500">
              <span className="text-xs text-text-muted">Scheduled Chats</span>
              <div className="text-2xl font-serif font-bold text-blue-700 mt-1">
                {chatRequests.filter((r) => r.status === "Scheduled").length}
              </div>
              <p className="text-[11px] text-text-muted mt-1">Informal Tea Arranged</p>
            </div>

            <div className="gov-card p-4 border-l-4 border-emerald-500">
              <span className="text-xs text-text-muted">Completed & Supported</span>
              <div className="text-2xl font-serif font-bold text-emerald-700 mt-1">
                {chatRequests.filter((r) => r.status === "Completed").length}
              </div>
              <p className="text-[11px] text-text-muted mt-1">Informal check-in held</p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="gov-card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by Name, Service ID, Rank, Company..."
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 rounded border border-neutral-border bg-neutral-card/30 focus:border-navy-primary outline-none"
                />
              </div>

              <div className="flex items-center space-x-1.5 flex-wrap">
                <button
                  onClick={() => setChatStatusFilter("all")}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    chatStatusFilter === "all"
                      ? "bg-navy-primary text-white shadow-xs"
                      : "bg-white text-navy-darker border border-neutral-border hover:bg-neutral-hover"
                  }`}
                >
                  All ({chatRequests.length})
                </button>
                <button
                  onClick={() => setChatStatusFilter("Pending")}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    chatStatusFilter === "Pending"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-white text-amber-800 border border-neutral-border hover:bg-amber-50"
                  }`}
                >
                  Pending ({chatRequests.filter((r) => r.status === "Pending").length})
                </button>
                <button
                  onClick={() => setChatStatusFilter("Scheduled")}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    chatStatusFilter === "Scheduled"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white text-blue-800 border border-neutral-border hover:bg-blue-50"
                  }`}
                >
                  Scheduled ({chatRequests.filter((r) => r.status === "Scheduled").length})
                </button>
                <button
                  onClick={() => setChatStatusFilter("Completed")}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    chatStatusFilter === "Completed"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white text-emerald-800 border border-neutral-border hover:bg-emerald-50"
                  }`}
                >
                  Completed ({chatRequests.filter((r) => r.status === "Completed").length})
                </button>

                <button
                  onClick={loadChatRequests}
                  className="p-1.5 text-text-muted hover:text-navy-primary border border-neutral-border rounded bg-white hover:bg-neutral-hover"
                  title="Refresh chat requests"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${chatLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Confidential Chat Requests Table */}
          <div className="gov-card overflow-hidden">
            <div className="gov-card-header flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Coffee className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-serif font-bold text-navy-primary">
                  Officers & Personnel Requesting Welfare Chat
                </h2>
              </div>
              <span className="text-xs text-text-muted font-mono">
                {filteredChatRequests.length} record{filteredChatRequests.length === 1 ? "" : "s"} listed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-card border-b border-neutral-border text-navy-primary font-serif font-bold">
                    <th className="py-3 px-4">Officer / Personnel</th>
                    <th className="py-3 px-4">Subunit & Force</th>
                    <th className="py-3 px-4">Family Context</th>
                    <th className="py-3 px-4">Request Channel</th>
                    <th className="py-3 px-4">Date Requested</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Confidential Welfare Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-border">
                  {filteredChatRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-text-muted">
                        <Coffee className="w-8 h-8 text-neutral-border mx-auto mb-2" />
                        <p className="font-medium">No welfare chat requests found matching the filter.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredChatRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-neutral-hover/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-navy-primary flex items-center space-x-1.5">
                            <span>{r.name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-navy-light/10 text-navy-primary border border-navy-light/20">
                              {r.rank}
                            </span>
                          </div>
                          <div className="text-[11px] text-text-muted font-mono mt-0.5">
                            {r.personnel_id}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-text-primary font-medium">{r.company}</div>
                          <div className="text-[11px] text-text-muted">{r.battalion} • {r.force}</div>
                        </td>

                        <td className="py-3 px-4">
                          {r.family_structure === "nuclear" && (r.family_separation_load || 0) > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              Nuclear (Sep Load: {r.family_separation_load})
                            </span>
                          ) : r.family_structure === "joint" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              Joint Family
                            </span>
                          ) : (
                            <span className="text-[11px] text-text-muted">Standard</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {r.request_type === "self_initiated" ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200">
                              <Coffee className="w-3 h-3 text-amber-600" />
                              <span>"Talk to someone" Button</span>
                            </span>
                          ) : r.request_type === "saathi_flagged_outreach" ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-900 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Saathi 60s Check-In</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-900 border border-purple-200">
                              <HeartHandshake className="w-3 h-3 text-purple-600" />
                              <span>Soft Invitation Accepted</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-[11px] text-text-muted font-mono">{formatRealDateTime(r.created_at)}</span>
                        </td>

                        <td className="py-3 px-4">
                          {r.status === "Pending" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Pending Initial Contact
                            </span>
                          ) : r.status === "Scheduled" ? (
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                Tea Scheduled
                              </span>
                              {r.scheduled_at && (
                                <div className="text-[10px] text-blue-700 font-medium mt-0.5">
                                  {r.scheduled_at}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Completed / Supported
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleOpenChatModal(r)}
                              className="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 text-xs font-semibold inline-flex items-center space-x-1 transition-colors"
                            >
                              <Coffee className="w-3 h-3 text-amber-700" />
                              <span>{r.status === "Scheduled" ? "Edit Schedule" : "Schedule Tea"}</span>
                            </button>
                            {r.status !== "Completed" && (
                              <button
                                onClick={() => handleQuickCompleteChat(r)}
                                className="px-2.5 py-1 rounded bg-white hover:bg-emerald-50 border border-neutral-border text-emerald-800 text-xs font-medium inline-flex items-center space-x-1 transition-colors"
                                title="Mark chat as completed"
                              >
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Mark Done</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ANONYMOUS PEER GUARD & BUDDY DROP BOX (गुमनाम साथी सुरक्षा बॉक्स)   */}
      {/* ========================================================================= */}
      {activeTab === "peer-guard" && (
        <div className="space-y-6">
          {/* Strict Privacy & Protocol Directive Banner */}
          <div className="p-4 bg-navy-primary text-white rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm border-l-4 border-rose-500">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center space-x-2">
                  <span>Anonymous Peer Guard (Buddy Drop Box Registry)</span>
                  <span className="text-[10px] px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded border border-rose-500/30">CAPF Saathi Protocol</span>
                </h3>
                <p className="text-xs text-neutral-light/80 mt-0.5">
                  Unprompted, anonymous care observations dropped by troops for their 2-person buddy pairs or barrack mates. <strong>Higher Officials and Command have ZERO access</strong>.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] font-mono text-rose-200 px-2.5 py-1 bg-white/10 rounded border border-white/10">
                🔒 100% Isolated from Command
              </span>
            </div>
          </div>

          {/* Operational Protocol Callout: Informal Tea Protocol ("चाय पे चर्चा") */}
          <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-lg text-xs text-amber-950 flex items-start space-x-3 shadow-xs">
            <div className="p-2 bg-amber-100 rounded-full text-amber-800 shrink-0 mt-0.5">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <strong className="font-bold block text-amber-950 font-serif text-sm">
                Mandatory Welfare Directive: Informal Tea Protocol (&quot;चाय पे चर्चा&quot;)
              </strong>
              <p className="text-amber-900 mt-1 leading-relaxed">
                When reaching out to the soldier, <strong>NEVER disclose that a peer or buddy submitted an observation note</strong>. Disclosing this breaks the sacred bond of trust between soldiers in the barracks. Instead, use natural, caring conversational openers: ask about village harvest, family health, sports, or mess food.
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="gov-card p-4">
              <span className="text-xs text-text-muted">Total Peer Notes</span>
              <div className="text-2xl font-serif font-bold text-navy-primary mt-1">
                {peerFlags.length}
              </div>
              <p className="text-[11px] text-text-muted mt-1">From Barracks &amp; Buddy Pairs</p>
            </div>

            <div className="gov-card p-4 border-l-4 border-rose-500">
              <span className="text-xs text-text-muted">New / Action Required</span>
              <div className="text-2xl font-serif font-bold text-rose-700 mt-1">
                {peerFlags.filter((f) => f.status === "New").length}
              </div>
              <p className="text-[11px] text-text-muted mt-1">Awaiting Tea Outreach</p>
            </div>

            <div className="gov-card p-4 border-l-4 border-amber-500">
              <span className="text-xs text-text-muted">Scheduled Tea Protocol</span>
              <div className="text-2xl font-serif font-bold text-amber-700 mt-1">
                {peerFlags.filter((f) => f.status === "Scheduled_Tea").length}
              </div>
              <p className="text-[11px] text-text-muted mt-1">Informal Chat Arranged</p>
            </div>

            <div className="gov-card p-4 border-l-4 border-emerald-500">
              <span className="text-xs text-text-muted">Completed Informal Touchpoints</span>
              <div className="text-2xl font-serif font-bold text-emerald-700 mt-1">
                {peerFlags.filter((f) => f.status === "Completed_Informal").length}
              </div>
              <p className="text-[11px] text-text-muted mt-1">Off-the-Record Support Given</p>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="gov-card p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by personnel name, ID, company, or note keywords..."
                  value={peerFlagsSearch}
                  onChange={(e) => setPeerFlagsSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 rounded border border-neutral-border bg-white focus:border-navy-primary outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Category Pills */}
                <select
                  value={peerFlagsCategoryFilter}
                  onChange={(e) => setPeerFlagsCategoryFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded border border-neutral-border bg-white outline-none"
                >
                  <option value="all">All Care Categories</option>
                  <option value="night_distress_phone">📞 Night Distress / Crying on Phone</option>
                  <option value="skipping_meals">🍲 Skipping Mess Meals</option>
                  <option value="sudden_isolation">🤐 Sudden Silence / Isolation</option>
                  <option value="family_crisis">🏠 Family / Domestic Crisis</option>
                  <option value="general_strain">⚠️ General Operational Strain</option>
                </select>

                {/* Status Pills */}
                {(["all", "New", "Scheduled_Tea", "Completed_Informal"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setPeerFlagsStatusFilter(st)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                      peerFlagsStatusFilter === st
                        ? "bg-navy-primary text-white shadow-xs"
                        : "bg-neutral-card text-text-primary hover:bg-neutral-hover border border-neutral-border"
                    }`}
                  >
                    {st === "all" ? "All Statuses" : st === "New" ? "New (Pending)" : st === "Scheduled_Tea" ? "Tea Scheduled" : "Completed"}
                  </button>
                ))}

                <button
                  onClick={loadPeerFlags}
                  disabled={peerFlagsLoading}
                  className="p-1.5 rounded border border-neutral-border hover:bg-neutral-hover text-text-muted"
                  title="Refresh peer notes"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${peerFlagsLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Peer Flags Table */}
          <div className="gov-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="gov-table w-full">
                <thead>
                  <tr>
                    <th>Target Soldier &amp; Unit</th>
                    <th>Care Category</th>
                    <th>Anonymous Observation (Buddy Note)</th>
                    <th>Tea Protocol &amp; Schedule</th>
                    <th className="text-right">Welfare Action</th>
                  </tr>
                </thead>
                <tbody>
                  {peerFlagsLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-text-muted text-xs">
                        Loading peer guard notes...
                      </td>
                    </tr>
                  ) : filteredPeerFlags.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-text-muted text-xs">
                        No anonymous peer notes matching the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredPeerFlags.map((flag) => {
                      const isNew = flag.status === "New";
                      const isScheduled = flag.status === "Scheduled_Tea";
                      const isCompleted = flag.status === "Completed_Informal";

                      return (
                        <tr
                          key={flag.id}
                          className={`hover:bg-neutral-card/60 transition-colors ${
                            isNew ? "bg-rose-50/20" : ""
                          }`}
                        >
                          {/* Soldier Info */}
                          <td>
                            <div className="font-bold text-navy-primary text-xs">
                              {flag.target_name}
                            </div>
                            <div className="text-[11px] text-text-muted">
                              {flag.target_rank} • <span className="font-mono text-navy-light">{flag.target_personnel_id}</span>
                            </div>
                            <div className="text-[10px] text-text-muted mt-0.5">
                              {flag.target_company} • {flag.target_battalion}
                            </div>
                            {flag.target_family_structure && (
                              <div className="mt-1 flex items-center space-x-1">
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 capitalize font-medium">
                                  {flag.target_family_structure} Family
                                </span>
                                {flag.target_family_separation_load ? (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-mono">
                                    Load: {flag.target_family_separation_load}
                                  </span>
                                ) : null}
                              </div>
                            )}

                            {/* Verification Tier Chip */}
                            <div className="mt-1.5 flex items-center flex-wrap gap-1">
                              {flag.is_star_buddy_report ? (
                                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 shadow-xs">
                                  <Star className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                                  <span>Star Buddy Verified</span>
                                </span>
                              ) : flag.verification_state === "Corroborated_MultiPeer" ? (
                                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs">
                                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>Multi-Peer Corroborated ({flag.corroboration_count || 2}+)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                                  <span>Single-Peer (Pending Corroboration)</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td>
                            {flag.care_category === "night_distress_phone" && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 text-xs font-semibold border border-rose-200">
                                <PhoneCall className="w-3 h-3 text-rose-700" />
                                <span>Distress on Phone</span>
                              </span>
                            )}
                            {flag.care_category === "skipping_meals" && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-200">
                                <Utensils className="w-3 h-3 text-amber-700" />
                                <span>Skipping Meals</span>
                              </span>
                            )}
                            {flag.care_category === "sudden_isolation" && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-900 text-xs font-semibold border border-indigo-200">
                                <VolumeX className="w-3 h-3 text-indigo-700" />
                                <span>Sudden Isolation</span>
                              </span>
                            )}
                            {flag.care_category === "family_crisis" && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-sky-100 text-sky-900 text-xs font-semibold border border-sky-200">
                                <Home className="w-3 h-3 text-sky-700" />
                                <span>Family Crisis</span>
                              </span>
                            )}
                            {(!flag.care_category || flag.care_category === "general_strain") && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
                                <Activity className="w-3 h-3 text-slate-600" />
                                <span>General Strain</span>
                              </span>
                            )}
                          </td>

                          {/* Observation Note */}
                          <td className="max-w-xs">
                            <div className="p-2.5 rounded bg-white border border-neutral-border text-xs text-text-primary shadow-2xs italic font-serif">
                              &ldquo;{flag.observation_text}&rdquo;
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] text-text-muted mt-1">
                              <Clock className="w-3 h-3 text-text-muted" />
                              <span>Received: {flag.submitted_at}</span>
                              <span className="text-emerald-700 font-semibold">• Submitter Anonymous</span>
                            </div>
                          </td>

                          {/* Status & Tea Schedule */}
                          <td>
                            <div>
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                                  isNew
                                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                                    : isScheduled
                                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                                    : isCompleted
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-neutral-card text-text-muted"
                                }`}
                              >
                                {isNew
                                  ? "⏳ Needs Outreach"
                                  : isScheduled
                                  ? "☕ Tea Scheduled"
                                  : isCompleted
                                  ? "✓ Informal Chat Done"
                                  : flag.status}
                              </span>
                            </div>
                            {flag.scheduled_tea_at && (
                              <div className="text-xs font-semibold text-navy-primary mt-1 flex items-center space-x-1">
                                <Coffee className="w-3 h-3 text-amber-700 shrink-0" />
                                <span>{flag.scheduled_tea_at}</span>
                              </div>
                            )}
                            {flag.welfare_notes && (
                              <div className="text-[10px] text-text-muted italic mt-0.5 line-clamp-1">
                                Note: {flag.welfare_notes}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => handleOpenTeaModal(flag)}
                                className={`px-2.5 py-1 rounded text-xs font-semibold inline-flex items-center space-x-1 transition-colors shadow-xs ${
                                  isNew
                                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                                    : "bg-white hover:bg-amber-50 border border-neutral-border text-navy-primary"
                                }`}
                                title="Arrange Tea Protocol"
                              >
                                <Coffee className="w-3 h-3 text-gold" />
                                <span>{isScheduled ? "Edit Tea" : "Initiate Tea"}</span>
                              </button>
                              {!isCompleted && (
                                <button
                                  onClick={() => handleQuickCompleteTea(flag)}
                                  className="px-2 py-1 rounded bg-white hover:bg-emerald-50 border border-neutral-border text-emerald-800 text-xs font-medium inline-flex items-center space-x-1 transition-colors"
                                  title="Mark informal check-in as complete"
                                >
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Done</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 5: NCO OFFICER MUSTER REPORTS & ROLL-CALL INTAKE
      ========================================== */}
      {activeTab === "nco-reports" && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          {/* Top Banner with Cadence Statement */}
          <div className="gov-card p-6 border-l-4 border-blue-600 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                    Section Commander Observation Routine
                  </span>
                  <span className="text-[11px] text-text-muted">| Bi-Daily 48h–72h Muster Cycle</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-navy-primary mt-1">
                  NCO Section Commander Muster Reports &amp; Anonymous Intakes
                </h1>
                <p className="text-xs text-text-muted mt-1 font-sans leading-relaxed">
                  Observation logs formalised once every 2–3 days (48h–72h) to avoid roll-call reporting fatigue.
                  Select any NCO Section Commander below to inspect their full section roster evaluations, baseline deviations, and anonymous peer intakes.
                </p>
              </div>

              <button
                onClick={loadNcoReports}
                className="px-3.5 py-2 rounded bg-neutral-card hover:bg-neutral-hover text-navy-primary text-xs font-semibold border border-neutral-border flex items-center space-x-2 transition-colors self-start sm:self-auto shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${ncoLoading ? "animate-spin" : ""}`} />
                <span>Refresh Reports</span>
              </button>
            </div>
          </div>

          {/* Saathi Form Style Roster for NCO Section Commanders */}
          <div className="gov-card">
            <div className="gov-card-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <ClipboardCheck className="w-4 h-4 text-navy-primary" />
                <h2 className="text-sm font-serif font-bold text-navy-primary">
                  Section Commanders &amp; Muster Roster ({ncoReports.length} Section Commanders)
                </h2>
              </div>
              <span className="text-xs text-text-muted">
                Bi-Daily 48h–72h Cadence • Click <strong>Open</strong> to inspect personnel roster under each commander
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full gov-table">
                <thead>
                  <tr>
                    <th>Section Commander (Havildar / NCO)</th>
                    <th>Subunit &amp; Force</th>
                    <th>Muster Cadence &amp; Last Submitted</th>
                    <th>Evaluated Personnel</th>
                    <th>Elevated Concern (≥3)</th>
                    <th>Anonymous Peer Intakes</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-border">
                  {ncoReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-text-muted text-xs">
                        No NCO Section Commander muster reports loaded. Click &quot;Refresh Reports&quot; above.
                      </td>
                    </tr>
                  ) : (
                    ncoReports.map((officer) => {
                      const isExpanded = expandedNcoUsername === officer.nco_username;
                      return (
                        <React.Fragment key={officer.nco_username}>
                          <tr className={`hover:bg-neutral-hover/50 transition-colors ${isExpanded ? "bg-blue-50/40" : ""}`}>
                            {/* Commander Name & ID */}
                            <td>
                              <div className="flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-[3px] bg-navy-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
                                  <UserCheck className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-navy-primary text-sm">
                                    {officer.nco_name}
                                  </div>
                                  <div className="text-xs text-text-muted font-mono mt-0.5">
                                    ID: {officer.nco_officer_id} • <span className="font-sans font-medium text-navy-light">{officer.nco_rank}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Subunit & Force */}
                            <td>
                              <div className="text-xs font-semibold text-navy-primary">{officer.company}</div>
                              <div className="text-[11px] text-text-muted font-mono">{officer.force || "CRPF"}</div>
                            </td>

                            {/* Cadence & Submitted */}
                            <td>
                              <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-900 border border-blue-200">
                                <Clock className="w-3 h-3 text-blue-700" />
                                <span>{officer.cycle_cadence || "Bi-Daily (48h–72h)"}</span>
                              </div>
                              <div className="text-[10px] text-text-muted mt-1 font-mono">
                                {officer.last_submitted_ist} ({officer.last_submitted_relative})
                              </div>
                            </td>

                            {/* Personnel Count */}
                            <td>
                              <span className="text-xs font-bold text-navy-primary">
                                {officer.total_evaluated} Personnel
                              </span>
                            </td>

                            {/* Elevated Concerns */}
                            <td>
                              {officer.high_concern_count > 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  {officer.high_concern_count} elevated
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <Check className="w-3 h-3 mr-1 text-emerald-600" /> All Normal
                                </span>
                              )}
                            </td>

                            {/* Peer Flags */}
                            <td>
                              {officer.peer_flags.length > 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                                  <EyeOff className="w-3 h-3 mr-1 text-rose-600" />
                                  {officer.peer_flags.length} Intake{officer.peer_flags.length === 1 ? "" : "s"}
                                </span>
                              ) : (
                                <span className="text-xs text-text-muted italic">0 Flags</span>
                              )}
                            </td>

                            {/* Action Buttons */}
                            <td className="text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalOfficer(officer);
                                    setNcoSearch("");
                                    setNcoConcernFilter("all");
                                  }}
                                  className="px-3 py-1.5 rounded bg-navy-primary hover:bg-navy-light text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors shadow-xs"
                                  title={`Open full muster report for ${officer.nco_name}`}
                                >
                                  <FolderOpen className="w-3.5 h-3.5 text-gold" />
                                  <span>Open Muster ({officer.total_evaluated})</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedNcoUsername(isExpanded ? null : officer.nco_username);
                                    setNcoSearch("");
                                    setNcoConcernFilter("all");
                                  }}
                                  className="p-1.5 rounded border border-neutral-border hover:bg-neutral-hover text-navy-primary transition-colors"
                                  title={isExpanded ? "Collapse inline view" : "Expand inline view"}
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Inline Expandable Accordion (Shows on expand) */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-0 bg-neutral-card/40 border-b-2 border-navy-primary/30">
                                <div className="p-4 sm:p-5 space-y-4">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded border border-neutral-border shadow-xs">
                                    <div>
                                      <h4 className="text-xs font-bold text-navy-primary flex items-center space-x-2">
                                        <ClipboardCheck className="w-4 h-4 text-navy-primary" />
                                        <span>Section Muster Observations for {officer.nco_name} ({officer.company})</span>
                                      </h4>
                                      <p className="text-[11px] text-text-muted mt-0.5">
                                        Cadence: {officer.cycle_cadence} • {officer.total_evaluated} Personnel evaluated under this commander
                                      </p>
                                    </div>

                                    <div className="flex items-center space-x-2 flex-wrap">
                                      <div className="relative w-48">
                                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-text-muted" />
                                        <input
                                          type="text"
                                          placeholder="Search personnel..."
                                          value={ncoSearch}
                                          onChange={(e) => setNcoSearch(e.target.value)}
                                          className="w-full text-xs pl-8 pr-2.5 py-1 rounded border border-neutral-border bg-white outline-none"
                                        />
                                      </div>
                                      <select
                                        value={ncoConcernFilter}
                                        onChange={(e) => setNcoConcernFilter(e.target.value as any)}
                                        className="text-xs px-2 py-1 rounded border border-neutral-border bg-white outline-none"
                                      >
                                        <option value="all">All ({officer.observations.length})</option>
                                        <option value="high">Elevated (≥3)</option>
                                        <option value="normal">Normal</option>
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => setModalOfficer(officer)}
                                        className="px-2.5 py-1 rounded bg-white hover:bg-neutral-hover border border-neutral-border text-navy-primary text-xs font-medium inline-flex items-center space-x-1"
                                        title="Open in full modal window"
                                      >
                                        <FolderOpen className="w-3 h-3 text-navy-primary" />
                                        <span>Full Modal</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Observations Table */}
                                  <div className="border border-neutral-border rounded overflow-x-auto bg-white">
                                    <table className="min-w-full gov-table">
                                      <thead>
                                        <tr>
                                          <th>Personnel Name &amp; ID</th>
                                          <th>Rank &amp; Force</th>
                                          <th className="text-center">Baseline vs Today</th>
                                          <th className="text-center">Concern Score</th>
                                          <th>NCO Observation Note</th>
                                          <th>Logged Time</th>
                                          <th className="text-center">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {filteredObservations.map((obs) => {
                                          const isElevated = obs.concern_score >= 3;
                                          return (
                                            <tr key={obs.id} className={isElevated ? "bg-amber-50/40" : ""}>
                                              <td className="text-xs">
                                                <div className="font-semibold text-navy-primary">{obs.name}</div>
                                                <div className="font-mono text-[11px] text-text-muted">{obs.personnel_id}</div>
                                              </td>
                                              <td className="text-xs">
                                                <div className="text-text-primary">{obs.rank}</div>
                                                <div className="text-[11px] text-text-muted">{obs.force}</div>
                                              </td>
                                              <td className="text-xs text-center font-mono">
                                                <span className="text-text-muted">{obs.baseline_score}/5</span>
                                                <span className="mx-1 text-slate-400">→</span>
                                                <strong className={isElevated ? "text-amber-800 font-bold" : "text-navy-primary"}>
                                                  {obs.concern_score}/5
                                                </strong>
                                                {obs.deviation !== 0 && (
                                                  <span className={`ml-1.5 text-[10px] font-bold ${obs.deviation > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                                                    ({obs.deviation > 0 ? `+${obs.deviation}` : obs.deviation})
                                                  </span>
                                                )}
                                              </td>
                                              <td className="text-xs text-center">
                                                <span
                                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                                    obs.concern_score === 1
                                                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                                      : obs.concern_score === 2
                                                      ? "bg-slate-100 text-slate-800 border border-slate-300"
                                                      : obs.concern_score === 3
                                                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                                                      : obs.concern_score === 4
                                                      ? "bg-orange-100 text-orange-900 border border-orange-300"
                                                      : "bg-red-100 text-red-900 border border-red-300"
                                                  }`}
                                                >
                                                  {obs.concern_score === 1 && "1 - Normal"}
                                                  {obs.concern_score === 2 && "2 - Mild"}
                                                  {obs.concern_score === 3 && "3 - Elevated"}
                                                  {obs.concern_score === 4 && "4 - High"}
                                                  {obs.concern_score === 5 && "5 - Urgent"}
                                                </span>
                                              </td>
                                              <td className="text-xs text-text-primary">
                                                {obs.note ? (
                                                  <span className="italic text-slate-800 font-sans">&ldquo;{obs.note}&rdquo;</span>
                                                ) : (
                                                  <span className="text-text-muted text-[11px]">— Routine visual check —</span>
                                                )}
                                              </td>
                                              <td className="text-xs text-text-muted whitespace-nowrap">
                                                <div className="font-mono text-[11px]">{obs.observed_date_ist}</div>
                                                <div className="text-[10px] text-slate-500">{obs.relative_time}</div>
                                              </td>
                                              <td className="text-xs text-center">
                                                {obs.welfare_case_id ? (
                                                  <button
                                                    onClick={() => {
                                                      setActiveTab("triage");
                                                      handleOpenCase(obs.welfare_case_id!);
                                                    }}
                                                    className="px-2.5 py-1 rounded bg-navy-primary hover:bg-navy-light text-white text-[11px] font-semibold transition-colors whitespace-nowrap"
                                                  >
                                                    Open Case
                                                  </button>
                                                ) : isElevated ? (
                                                  <button
                                                    onClick={() => {
                                                      setActiveTab("triage");
                                                    }}
                                                    className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold transition-colors whitespace-nowrap"
                                                  >
                                                    View Triage
                                                  </button>
                                                ) : (
                                                  <span className="text-[11px] text-text-muted font-mono">Normal</span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section Muster Inspection Modal (Triggered on 'Open' click) */}
          {modalOfficer && (
            <div className="fixed inset-0 bg-navy-darker/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
              <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-neutral-border animate-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="p-4 sm:p-5 bg-navy-primary text-white flex items-start justify-between gap-4 rounded-t-lg">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded bg-white/10 text-gold flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                      <ClipboardCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-bold text-white">
                          Section Muster Roster: {modalOfficer.nco_name}
                        </h2>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/20 text-neutral-light">
                          ID: {modalOfficer.nco_officer_id}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          {modalOfficer.cycle_cadence || "48h–72h Cadence"}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-light/80 mt-1">
                        {modalOfficer.nco_rank} • {modalOfficer.company} • Submitted: {modalOfficer.last_submitted_ist} ({modalOfficer.last_submitted_relative})
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setModalOfficer(null)}
                    className="p-1.5 rounded hover:bg-white/20 text-neutral-light hover:text-white transition-colors"
                    title="Close Window"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Subheader: KPIs & Search/Filter */}
                <div className="p-4 border-b border-neutral-border bg-neutral-card/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2 text-xs flex-wrap gap-y-1">
                    <span className="px-2.5 py-1 rounded bg-white border border-neutral-border text-navy-primary font-medium">
                      Evaluated: <strong>{modalOfficer.total_evaluated} Personnel</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-900 font-medium">
                      Elevated: <strong>{modalOfficer.high_concern_count} Personnel</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium">
                      Normal: <strong>{modalOfficer.observations.length - modalOfficer.high_concern_count} Personnel</strong>
                    </span>
                    {modalOfficer.peer_flags.length > 0 && (
                      <span className="px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-900 font-medium">
                        Peer Flags: <strong>{modalOfficer.peer_flags.length} Intakes</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-56">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-text-muted" />
                      <input
                        type="text"
                        placeholder="Search personnel by name, ID..."
                        value={ncoSearch}
                        onChange={(e) => setNcoSearch(e.target.value)}
                        className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-neutral-border bg-white outline-none focus:border-navy-primary"
                      />
                    </div>

                    <select
                      value={ncoConcernFilter}
                      onChange={(e) => setNcoConcernFilter(e.target.value as any)}
                      className="text-xs px-2.5 py-1.5 rounded border border-neutral-border bg-white outline-none"
                    >
                      <option value="all">All ({modalOfficer.observations.length})</option>
                      <option value="high">Elevated (≥3)</option>
                      <option value="normal">Normal Baseline (1-2)</option>
                    </select>
                  </div>
                </div>

                {/* Modal Content Scrollable Area */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
                  <div className="border border-neutral-border rounded overflow-hidden">
                    <table className="min-w-full gov-table">
                      <thead>
                        <tr>
                          <th>Personnel Name &amp; ID</th>
                          <th>Rank &amp; Force</th>
                          <th className="text-center">Baseline vs Today</th>
                          <th className="text-center">Concern Score</th>
                          <th>NCO Observation Note</th>
                          <th>Logged Time</th>
                          <th className="text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalOfficer.observations
                          .filter((obs) => {
                            const q = ncoSearch.toLowerCase();
                            const matchesSearch =
                              q === "" ||
                              obs.name.toLowerCase().includes(q) ||
                              obs.personnel_id.toLowerCase().includes(q) ||
                              (obs.note && obs.note.toLowerCase().includes(q));
                            if (!matchesSearch) return false;
                            if (ncoConcernFilter === "high") return obs.concern_score >= 3;
                            if (ncoConcernFilter === "normal") return obs.concern_score < 3;
                            return true;
                          })
                          .map((obs) => {
                            const isElevated = obs.concern_score >= 3;
                            return (
                              <tr key={obs.id} className={isElevated ? "bg-amber-50/40" : ""}>
                                <td className="text-xs">
                                  <div className="font-semibold text-navy-primary">{obs.name}</div>
                                  <div className="font-mono text-[11px] text-text-muted">{obs.personnel_id}</div>
                                </td>
                                <td className="text-xs">
                                  <div className="text-text-primary">{obs.rank}</div>
                                  <div className="text-[11px] text-text-muted">{obs.force}</div>
                                </td>
                                <td className="text-xs text-center font-mono">
                                  <span className="text-text-muted">{obs.baseline_score}/5</span>
                                  <span className="mx-1 text-slate-400">→</span>
                                  <strong className={isElevated ? "text-amber-800 font-bold" : "text-navy-primary"}>
                                    {obs.concern_score}/5
                                  </strong>
                                  {obs.deviation !== 0 && (
                                    <span className={`ml-1.5 text-[10px] font-bold ${obs.deviation > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                                      ({obs.deviation > 0 ? `+${obs.deviation}` : obs.deviation})
                                    </span>
                                  )}
                                </td>
                                <td className="text-xs text-center">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                      obs.concern_score === 1
                                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                        : obs.concern_score === 2
                                        ? "bg-slate-100 text-slate-800 border border-slate-300"
                                        : obs.concern_score === 3
                                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                                        : obs.concern_score === 4
                                        ? "bg-orange-100 text-orange-900 border border-orange-300"
                                        : "bg-red-100 text-red-900 border border-red-300"
                                    }`}
                                  >
                                    {obs.concern_score === 1 && "1 - Normal"}
                                    {obs.concern_score === 2 && "2 - Mild"}
                                    {obs.concern_score === 3 && "3 - Elevated"}
                                    {obs.concern_score === 4 && "4 - High"}
                                    {obs.concern_score === 5 && "5 - Urgent"}
                                  </span>
                                </td>
                                <td className="text-xs text-text-primary">
                                  {obs.note ? (
                                    <span className="italic text-slate-800 font-sans">&ldquo;{obs.note}&rdquo;</span>
                                  ) : (
                                    <span className="text-text-muted text-[11px]">— Routine visual check —</span>
                                  )}
                                </td>
                                <td className="text-xs text-text-muted whitespace-nowrap">
                                  <div className="font-mono text-[11px]">{obs.observed_date_ist}</div>
                                  <div className="text-[10px] text-slate-500">{obs.relative_time}</div>
                                </td>
                                <td className="text-xs text-center">
                                  {obs.welfare_case_id ? (
                                    <button
                                      onClick={() => {
                                        setModalOfficer(null);
                                        setActiveTab("triage");
                                        handleOpenCase(obs.welfare_case_id!);
                                      }}
                                      className="px-2.5 py-1 rounded bg-navy-primary hover:bg-navy-light text-white text-[11px] font-semibold transition-colors whitespace-nowrap"
                                    >
                                      Open Case
                                    </button>
                                  ) : isElevated ? (
                                    <button
                                      onClick={() => {
                                        setModalOfficer(null);
                                        setActiveTab("triage");
                                      }}
                                      className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold transition-colors whitespace-nowrap"
                                    >
                                      View Triage
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-text-muted font-mono">Normal</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* Section Peer Flags */}
                  {modalOfficer.peer_flags.length > 0 && (
                    <div className="gov-card border-l-4 border-rose-600">
                      <div className="gov-card-header flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <EyeOff className="w-4 h-4 text-rose-600" />
                          <h3 className="text-xs font-bold text-navy-primary">
                            Section Anonymous Peer-Flag Intakes ({modalOfficer.peer_flags.length} Records)
                          </h3>
                        </div>
                        <span className="badge-khaki text-[10px]">100% Submitter Privacy</span>
                      </div>
                      <div className="divide-y divide-neutral-border">
                        {modalOfficer.peer_flags.map((flag) => (
                          <div key={flag.id} className="p-3.5 hover:bg-neutral-hover/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-navy-primary">{flag.target_name}</span>
                                <span className="font-mono text-[11px] text-text-muted">({flag.target_personnel_id})</span>
                                <span className="text-[11px] text-text-muted">• {flag.target_rank}</span>
                              </div>
                              <p className="text-xs text-text-primary italic font-serif bg-neutral-card/60 p-2 rounded border border-neutral-border">
                                &ldquo;{flag.observation_text}&rdquo;
                              </p>
                              <div className="text-[10px] text-text-muted flex items-center space-x-3">
                                <span>Reported: <strong className="text-navy-primary font-mono">{flag.submitted_at_ist}</strong></span>
                                {flag.scheduled_tea_at && (
                                  <span>Tea: <strong className="text-emerald-700">{flag.scheduled_tea_at}</strong></span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setModalOfficer(null);
                                handleOpenTeaModal(flag as any);
                              }}
                              className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center space-x-1 transition-colors self-start sm:self-auto shrink-0 shadow-xs"
                            >
                              <Coffee className="w-3.5 h-3.5" />
                              <span>Schedule Tea</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-3 sm:p-4 bg-neutral-card border-t border-neutral-border flex items-center justify-between rounded-b-lg">
                  <span className="text-xs text-text-muted">
                    Bi-Daily muster cadence protects against survey fatigue while maintaining section vigilance.
                  </span>
                  <button
                    onClick={() => setModalOfficer(null)}
                    className="px-4 py-2 rounded bg-navy-primary hover:bg-navy-light text-white text-xs font-semibold transition-colors"
                  >
                    Close Roster
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule Confidential Welfare Chat Modal */}
      {chatModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3px] border border-neutral-border max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-border">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-[2px] bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-navy-primary">
                    Arrange Informal Welfare Chat
                  </h3>
                  <p className="text-xs text-text-muted">
                    {chatModalTarget.name} ({chatModalTarget.personnel_id}) • {chatModalTarget.rank}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setChatModalTarget(null)}
                className="text-text-muted hover:text-text-primary p-1 rounded-[2px] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              {/* Privacy Reminder */}
              <div className="p-3 bg-neutral-card rounded border border-neutral-border text-[11px] text-text-muted flex items-start space-x-2">
                <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Confidentiality:</strong> Kept strictly inside the Welfare Cell. Invisible to Battalion Command and Higher Officials.
                </span>
              </div>

              {/* Status Selection */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Interaction Status:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Pending", "Scheduled", "Completed"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setModalStatus(st)}
                      className={`py-1.5 px-2 rounded text-xs font-semibold border transition-all ${
                        modalStatus === st
                          ? "bg-navy-primary text-white border-navy-primary shadow-xs"
                          : "bg-white text-navy-darker border-neutral-border hover:bg-neutral-hover"
                      }`}
                    >
                      {st === "Scheduled" ? "☕ Scheduled" : st === "Completed" ? "✓ Completed" : "⏳ Pending"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule Timing & Location */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Proposed Timing & Venue:
                </label>
                <input
                  type="text"
                  value={modalScheduledAt}
                  onChange={(e) => setModalScheduledAt(e.target.value)}
                  placeholder="e.g. Tomorrow, 10:30 AM @ Welfare Cell or Canteen"
                  className="w-full text-xs p-2.5 rounded border border-neutral-border bg-neutral-card/30 focus:border-navy-primary outline-none"
                />
                <div className="flex items-center space-x-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-text-muted">Quick Presets:</span>
                  {[
                    "Tomorrow 10:30 AM @ Welfare Cell",
                    "Today 17:00 @ Unit Canteen",
                    "Tomorrow Morning Tea Point",
                    "Informal Walk & Talk"
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setModalScheduledAt(preset)}
                      className="text-[10px] px-2 py-0.5 rounded bg-neutral-hover hover:bg-neutral-border text-navy-primary font-medium"
                    >
                      {preset.split("@")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confidential Notes */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Confidential Welfare Notes (Private to Welfare Cell):
                </label>
                <textarea
                  rows={3}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Private observations, conversation pointers, family support points..."
                  className="w-full text-xs p-2.5 rounded border border-neutral-border bg-neutral-card/30 focus:border-navy-primary outline-none"
                />
              </div>

              {chatSuccessMessage && (
                <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded text-xs flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{chatSuccessMessage}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                onClick={() => setChatModalTarget(null)}
                className="px-3.5 py-1.5 rounded bg-white hover:bg-neutral-hover text-text-muted text-xs font-medium border border-neutral-border"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChatAction}
                disabled={updatingChat}
                className="px-4 py-1.5 rounded bg-navy-primary hover:bg-navy-light text-white text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{updatingChat ? "Saving..." : "Save Interaction Status"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INITIATE / UPDATE INFORMAL TEA PROTOCOL MODAL (चाय पे चर्चा)               */}
      {/* ========================================================================= */}
      {teaModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3px] border border-neutral-border max-w-lg w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-border">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-[2px] bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Coffee className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-navy-primary">
                    Informal Tea Protocol (चाय पे चर्चा)
                  </h3>
                  <p className="text-xs text-text-muted">
                    {teaModalTarget.target_name} ({teaModalTarget.target_rank}) • {teaModalTarget.target_personnel_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTeaModalTarget(null)}
                className="text-text-muted hover:text-text-primary p-1 rounded-[2px] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              {/* Mandatory Operational Safeguard Directive */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-950 text-[11px] leading-relaxed">
                <strong className="block font-bold text-rose-900 mb-1 flex items-center space-x-1">
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>DO NOT DISCLOSE BUDDY SOURCE:</span>
                </strong>
                Never mention that a buddy dropped a note. Doing so will destroy barrack trust. Frame this encounter as a routine, casual touchpoint over tea.
              </div>

              {/* Anonymous Observation Preview */}
              <div className="p-3 bg-neutral-card rounded border border-neutral-border">
                <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold block mb-1">
                  Anonymous Observation from Barrack:
                </span>
                <p className="text-xs text-text-primary italic font-serif">
                  &ldquo;{teaModalTarget.observation_text}&rdquo;
                </p>
              </div>

              {/* Natural Conversation Starters Guidance */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1.5 text-[11px] text-amber-950">
                <strong className="font-bold block text-amber-900 font-serif">
                  Recommended Conversation Openers:
                </strong>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[10px] text-amber-900">
                  <li>&quot;How are things back home in the village? How did the harvest go this season?&quot;</li>
                  <li>&quot;Haven&apos;t seen you around the evening volleyball game lately. How are the knees and body holding up?&quot;</li>
                  <li>&quot;Just doing my routine monthly rounds with Delta Platoon. How is the mess food and sleep rhythm?&quot;</li>
                </ul>
              </div>

              {/* Status Selection */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Outreach Status:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "Scheduled_Tea", label: "☕ Schedule Tea" },
                    { id: "Completed_Informal", label: "✓ Chat Completed" },
                    { id: "Dismissed_NonWelfare", label: "✕ Dismiss (Non-Welfare)" }
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setTeaModalStatus(st.id as any)}
                      className={`py-1.5 px-2 rounded text-xs font-semibold border transition-all ${
                        teaModalStatus === st.id
                          ? "bg-navy-primary text-white border-navy-primary shadow-xs"
                          : "bg-white text-navy-darker border-neutral-border hover:bg-neutral-hover"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule Timing / Location */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Proposed Date, Time &amp; Informal Location:
                </label>
                <input
                  type="text"
                  value={teaModalScheduledAt}
                  onChange={(e) => setTeaModalScheduledAt(e.target.value)}
                  placeholder="e.g., Today 16:30 @ Welfare Tent / Mess Tea Stall"
                  className="w-full text-xs px-3 py-2 rounded border border-neutral-border bg-neutral-card/30 focus:border-navy-primary outline-none"
                />
              </div>

              {/* Confidential Welfare Notes */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Confidential Welfare Notes (Hidden from Command):
                </label>
                <textarea
                  rows={2}
                  value={teaModalNotes}
                  onChange={(e) => setTeaModalNotes(e.target.value)}
                  placeholder="Confidential thoughts, gentle conversational hooks, family support follow-up..."
                  className="w-full text-xs p-2.5 rounded border border-neutral-border bg-neutral-card/30 focus:border-navy-primary outline-none"
                />
              </div>

              {teaSuccessMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded text-xs flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{teaSuccessMsg}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                onClick={() => setTeaModalTarget(null)}
                className="px-3.5 py-1.5 rounded bg-white hover:bg-neutral-hover text-text-muted text-xs font-medium border border-neutral-border"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTeaAction}
                disabled={savingTeaModal}
                className="px-4 py-1.5 rounded bg-navy-primary hover:bg-navy-light text-white text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{savingTeaModal ? "Saving..." : "Record Tea Protocol Action"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Nudge / Reminder Modal */}
      {nudgeModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3px] border border-neutral-border max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-border">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-[2px] bg-amber-100 text-amber-800 flex items-center justify-center">
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-navy-primary">
                    Send Saathi Welfare Nudge
                  </h3>
                  <p className="text-xs text-text-muted">
                    {nudgeModalTarget.name} ({nudgeModalTarget.personnel_id}) • {nudgeModalTarget.rank}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNudgeModalTarget(null)}
                className="text-text-muted hover:text-text-primary p-1 rounded-[2px] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-text-primary">
                Gentle Notification Reminder Message:
              </label>
              <textarea
                rows={3}
                value={nudgeMessage}
                onChange={(e) => setNudgeMessage(e.target.value)}
                className="w-full text-xs p-3 rounded border border-neutral-border bg-neutral-card/30 focus:border-navy-primary outline-none"
              ></textarea>

              <div className="p-3 bg-neutral-card rounded border border-neutral-border text-[11px] text-text-muted flex items-start space-x-2">
                <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Supportive Framing:</strong> Nudges are presented warmly as a low-pressure invitation to check-in on sleep and duty rhythm.
                </span>
              </div>

              {nudgeSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded text-xs flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{nudgeSuccess}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                onClick={() => setNudgeModalTarget(null)}
                className="px-3.5 py-1.5 rounded bg-white hover:bg-neutral-hover text-text-muted text-xs font-medium border border-neutral-border"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNudge}
                disabled={sendingNudge || !nudgeMessage.trim()}
                className="px-4 py-1.5 rounded bg-navy-primary hover:bg-navy-light text-white text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingNudge ? "Sending Nudge..." : "Send Gentle Reminder"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Case Detail Modal */}
      {selectedCaseId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[3px] border border-neutral-border max-w-3xl w-full max-h-[92vh] overflow-y-auto my-6 animate-in zoom-in-95 duration-150">
            {detailLoading || !caseDetail ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-primary mx-auto mb-3"></div>
                <p className="text-sm text-text-muted">Loading confidential case detail &amp; recording audit trail...</p>
              </div>
            ) : (
              <div>
                {/* Modal Header with Prominent Audit Log Notice */}
                <div className="bg-navy-primary text-white p-5 rounded-t-[3px] flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="badge-gold font-bold">Confidential Welfare File</span>
                      <span className="text-xs text-slate-300">Case ID: #{caseDetail.case_id}</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold mt-1 text-white">
                      {caseDetail.name} ({caseDetail.personnel_id})
                    </h2>
                    <p className="text-xs text-slate-300">
                      {caseDetail.rank} • {caseDetail.force} • {caseDetail.company}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCaseId(null)}
                    className="text-slate-300 hover:text-white p-1 rounded-[2px] cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Audit Notification Banner */}
                <div className="bg-neutral-card px-5 py-2.5 border-b border-neutral-border flex items-center justify-between text-xs text-navy-darker">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="font-semibold">{caseDetail.audit_notification}</span>
                  </div>
                  <span className="text-[11px] text-text-muted">Officer: {currentUser.username}</span>
                </div>

                <div className="p-6 space-y-6">
                  {/* Primary Stress Trajectory Engine Output */}
                  <StressTrajectoryCard
                    trajectory={caseDetail.stress_trajectory}
                    showProjectionGraph={true}
                  />

                  {/* Plain Language Reasons derived from SHAP */}
                  <div className="p-4 rounded-lg bg-neutral-card/70 border border-neutral-border">
                    <p className="text-xs font-bold text-navy-primary mb-2">
                      Full Historical SHAP Feature Shifts (Compared to this person's own baseline):
                    </p>
                      <div className="space-y-2">
                        {caseDetail.plain_language_reasons.map((r, i) => {
                          const isFamilyFactor =
                            r.toLowerCase().includes("separation") ||
                            r.toLowerCase().includes("nuclear") ||
                            r.toLowerCase().includes("joint family");
                          return (
                            <div
                              key={i}
                              className={`text-xs flex items-start space-x-2 p-2 rounded transition-colors ${
                                isFamilyFactor
                                  ? "bg-amber-100/70 border border-amber-300 text-amber-950 font-medium shadow-xs"
                                  : "text-navy-darker bg-white/60 border border-transparent"
                              }`}
                            >
                              <span className={isFamilyFactor ? "text-amber-700 font-bold" : "text-gold font-bold"}>
                                {isFamilyFactor ? "★" : "✓"}
                              </span>
                              <div className="flex-1 flex flex-wrap items-center gap-2">
                                <span>{r}</span>
                                {isFamilyFactor && (
                                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                                    Material Factor • Load: {caseDetail.family_separation_load ? caseDetail.family_separation_load.toFixed(2) : "High"}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Empirical Bayes Cold-Start Protection Banner */}
                  {caseDetail.cold_start_status?.is_cold_start && (
                    <div className="p-4 rounded-lg bg-blue-50/90 border-2 border-blue-300 text-blue-950 space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 font-bold text-xs text-blue-900">
                          <ShieldCheck className="w-4 h-4 text-blue-700" />
                          <span>🛡️ Empirical Bayes Cold-Start Adaptation Active ({caseDetail.cold_start_status.cohort_prior_weight_pct}% Cohort Prior)</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-blue-200/80 text-blue-900 text-[10px] font-bold border border-blue-300">
                          Deployment: {caseDetail.cold_start_status.days_in_posting} Days (&lt;90d)
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-blue-900">
                        {caseDetail.cold_start_status.guidance_note}
                      </p>
                      <div className="flex flex-wrap gap-2 text-[10px] text-blue-800 font-semibold pt-1">
                        <span className="bg-white px-2 py-1 rounded border border-blue-200">
                          Baseline Blending: {caseDetail.cold_start_status.cohort_prior_weight_pct}% Demographic Prior + {caseDetail.cold_start_status.adaptation_weight_individual_pct}% Individual Trailing
                        </span>
                        <span className="bg-white px-2 py-1 rounded border border-blue-200">
                          Cohort Norm: {caseDetail.cold_start_status.cohort_name}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Longitudinal Personal Baseline Comparisons */}
                  <div>
                    <h3 className="text-sm font-serif font-bold text-navy-primary mb-3 flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-navy-primary" />
                      <span>Longitudinal Baseline Comparison (Own Normal vs Current)</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      {/* Sick Reports */}
                      <div className="p-3.5 rounded border border-neutral-border bg-white">
                        <span className="font-semibold text-navy-primary block mb-1">
                          Sick-Report Count (90-Day Window)
                        </span>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-text-muted">Current Trailing 90d:</span>
                          <span className="font-bold text-text-primary text-sm">
                            {caseDetail.personal_baseline_comparison.sick_reports.current_90d} reports
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-text-muted">Personal Historical Baseline:</span>
                          <span className="font-medium text-text-muted">
                            {caseDetail.personal_baseline_comparison.sick_reports.personal_trailing_baseline} reports
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-neutral-border/50 text-[11px] text-amber-800">
                          Net Deviation: {caseDetail.personal_baseline_comparison.sick_reports.deviation > 0 ? "+" : ""}
                          {caseDetail.personal_baseline_comparison.sick_reports.deviation} reports from personal norm
                        </div>
                      </div>

                      {/* Section Commander Muster Score */}
                      <div className="p-3.5 rounded border border-neutral-border bg-white">
                        <span className="font-semibold text-navy-primary block mb-1">
                          NCO Daily Muster Concern Score
                        </span>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-text-muted">Recent Average Rating:</span>
                          <span className="font-bold text-text-primary text-sm">
                            {caseDetail.personal_baseline_comparison.nco_observation.current_score} / 5
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-text-muted">Typical Section Baseline:</span>
                          <span className="font-medium text-text-muted">
                            {caseDetail.personal_baseline_comparison.nco_observation.personal_trailing_baseline} / 5
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-neutral-border/50 text-[11px] text-amber-800">
                          Net Shift: {caseDetail.personal_baseline_comparison.nco_observation.deviation > 0 ? "+" : ""}
                          {caseDetail.personal_baseline_comparison.nco_observation.deviation} points on concern scale
                        </div>
                      </div>

                      {/* Workload & Rest Compliance */}
                      <div className="p-3.5 rounded border border-neutral-border bg-white">
                        <span className="font-semibold text-navy-primary block mb-1">
                          Operational Load & Rest Compliance
                        </span>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-text-muted">Weekly Duty Load:</span>
                          <span className="font-bold text-text-primary">
                            {caseDetail.personal_baseline_comparison.workload.weekly_duty_hours} hrs/week
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-text-muted">Rest-Day Compliance:</span>
                          <span className="font-medium text-text-muted">
                            {caseDetail.personal_baseline_comparison.workload.rest_day_compliance}%
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-neutral-border/50 text-[11px] text-text-muted">
                          Fatigue Proxy Index: {caseDetail.personal_baseline_comparison.workload.fatigue_proxy_index}/100
                        </div>
                      </div>

                      {/* Leave Utilisation */}
                      <div className="p-3.5 rounded border border-neutral-border bg-white">
                        <span className="font-semibold text-navy-primary block mb-1">
                          Annual Leave Utilisation
                        </span>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-text-muted">Availed in Past 12M:</span>
                          <span className="font-bold text-text-primary">
                            {caseDetail.personal_baseline_comparison.leave.availed_12m} / {caseDetail.personal_baseline_comparison.leave.entitled} days
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-text-muted">Utilisation Ratio:</span>
                          <span className="font-medium text-text-muted">
                            {(caseDetail.personal_baseline_comparison.leave.utilization_ratio * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-neutral-border/50 text-[11px] text-text-muted">
                          Posting: {caseDetail.posting_duration_months} months in {caseDetail.posting_category.replace("_", " ")}
                        </div>
                      </div>

                      {/* Family Structure & Support Interaction Load */}
                      <div className={`p-3.5 rounded border sm:col-span-2 ${
                        caseDetail.has_family_separation_strain || (caseDetail.family_separation_load && caseDetail.family_separation_load >= 0.8)
                          ? "border-amber-300 bg-amber-50/50"
                          : "border-neutral-border bg-white"
                      }`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-navy-primary flex items-center space-x-1.5">
                            <Home className="w-4 h-4 text-amber-800" />
                            <span>Family Structure & Domestic Support System</span>
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 border border-amber-300">
                            Interaction Feature (3rd in Model Importance)
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          <div>
                            <span className="text-text-muted text-[11px] block">Home Household:</span>
                            <span className="font-bold text-text-primary capitalize text-xs">
                              {caseDetail.family_structure ? `${caseDetail.family_structure} Family` : "Nuclear Family"}
                              {caseDetail.family_structure === "nuclear" ? " (No local support)" : " (Support system present)"}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted text-[11px] block">Posting Separation:</span>
                            <span className="font-bold text-text-primary text-xs capitalize">
                              {caseDetail.family_status ? caseDetail.family_status.replace(/_/g, " ") : "Separated"} ({caseDetail.posting_duration_months} mos)
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted text-[11px] block">Separation Load Metric:</span>
                            <span className={`font-bold text-xs ${
                              caseDetail.family_separation_load && caseDetail.family_separation_load >= 1.0 ? "text-amber-800" : "text-emerald-700"
                            }`}>
                              {caseDetail.family_separation_load ? caseDetail.family_separation_load.toFixed(2) : "0.00"}
                              <span className="font-normal text-[11px] text-text-muted ml-1">
                                ({caseDetail.family_structure === "nuclear" ? "×1.6 multiplier" : "×1.0 multiplier"})
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Anonymous Peer Notes if available */}
                  {caseDetail.anonymous_peer_notes.length > 0 && (
                    <div className="p-3.5 bg-khaki/10 border border-khaki/30 rounded-lg text-xs">
                      <span className="font-semibold text-navy-primary block mb-1">
                        Anonymous Peer Notes (Observer identity strictly excluded):
                      </span>
                      {caseDetail.anonymous_peer_notes.map((note, i) => (
                        <p key={i} className="italic text-navy-darker mt-1">"{note}"</p>
                      ))}
                    </div>
                  )}

                  {/* Recommended Human Actions (Human-in-the-Loop Decision Support) */}
                  <div className="p-4 rounded-lg bg-white border border-neutral-border shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h3 className="text-sm font-serif font-bold text-navy-primary flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-gold" />
                        <span>Recommended Actions (Human-in-the-Loop Decision Support)</span>
                      </h3>
                      <span className="text-[11px] text-text-muted">
                        AI provides contextual recommendations; human welfare officer retains sole authority
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {/* Action 1: Colleague Dialogue Check-in */}
                      <div className="p-3.5 rounded-lg border border-amber-300 bg-amber-50/60 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center space-x-2 text-amber-950 font-bold text-xs">
                            <Coffee className="w-4 h-4 text-amber-800" />
                            <span>Action 1: Informal Colleague Check-in</span>
                          </div>
                          <p className="text-xs text-amber-900 mt-1.5 leading-relaxed">
                            Conduct an informal, unrecorded tea conversation with the officer. Never reference automated risk models, deviations, or flags.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            applyPresetAction(
                              "Held informal tea discussion; discussed family wellbeing & rest",
                              "contacted",
                              "Personnel shared minor family strain at village; reassured and scheduled relaxed 14-day check-in."
                            );
                            setShowProtocolGuide(true);
                          }}
                          className="w-full py-2 px-3 rounded bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
                        >
                          <Coffee className="w-3.5 h-3.5" />
                          <span>Talk to Officer (Tea Protocol)</span>
                        </button>
                      </div>

                      {/* Action 2: Unit Family Welfare Cell Nudge */}
                      <div className={`p-3.5 rounded-lg border flex flex-col justify-between space-y-3 ${
                        caseDetail.has_family_separation_strain || caseDetail.plain_language_reasons.some(r => r.toLowerCase().includes("separation") || r.toLowerCase().includes("nuclear"))
                          ? "border-indigo-300 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-200"
                          : "border-neutral-border bg-slate-50/50"
                      }`}>
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-indigo-950 font-bold text-xs">
                              <HeartHandshake className="w-4 h-4 text-indigo-700" />
                              <span>Action 2: Nudge Unit Family Welfare Cell</span>
                            </div>
                            {(caseDetail.has_family_separation_strain || caseDetail.plain_language_reasons.some(r => r.toLowerCase().includes("separation") || r.toLowerCase().includes("nuclear"))) && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-200 text-indigo-950 uppercase tracking-wider border border-indigo-300">
                                Recommended Match
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-indigo-900 mt-1.5 leading-relaxed">
                            {caseDetail.family_structure === "nuclear"
                              ? "Extended separation from family, nuclear household with no local support. Send a direct nudge to the unit's family welfare cell to check in with the household directly."
                              : "Dispatch a supportive outreach nudge to the unit's family welfare cell to check in with the officer's household directly at their home station."}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={nudgingFamilyCell}
                          onClick={handleNudgeFamilyCell}
                          className="w-full py-2 px-3 rounded bg-indigo-800 hover:bg-indigo-900 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-sm disabled:opacity-50"
                        >
                          <Home className="w-3.5 h-3.5" />
                          <span>{nudgingFamilyCell ? "Dispatching Nudge..." : "Nudge Unit Family Welfare Cell"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Human-First Check-in Conversation Protocol Guide */}
                  <div className="p-4 rounded-lg bg-amber-50/80 border border-amber-300/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-amber-950 font-serif font-bold text-xs sm:text-sm">
                        <Coffee className="w-4 h-4 text-amber-800" />
                        <span>Informal Check-in Protocol: A Colleague's Cup of Tea (Not an Inquiry)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowProtocolGuide(!showProtocolGuide)}
                        className="text-[11px] text-amber-900 underline font-medium hover:text-amber-950"
                      >
                        {showProtocolGuide ? "Hide Dialogue Guide" : "Show Dialogue Guide"}
                      </button>
                    </div>

                    {showProtocolGuide && (
                      <div className="space-y-2.5 text-xs text-amber-900 pt-2 border-t border-amber-200">
                        <div className="p-2.5 bg-white/80 rounded border border-amber-200 space-y-1">
                          <p className="font-bold text-amber-950 flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                            <span>Setting the Environment:</span>
                          </p>
                          <p className="text-[11px] text-amber-900 leading-relaxed">
                            Conduct this check-in over a relaxed cup of tea in an informal recreation or dining area. Never summon the personnel across an official command desk or format it as an interrogation.
                          </p>
                        </div>

                        <div className="p-2.5 bg-white/80 rounded border border-amber-200 space-y-1">
                          <p className="font-bold text-amber-950 flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                            <span>Natural Conversational Openers:</span>
                          </p>
                          <ul className="text-[11px] text-amber-900 space-y-1 list-disc list-inside">
                            <li><em>"Ct. {caseDetail.name.split(" ")[0]}, haven't had a proper chat in a while. How are things at home in your village?"</em></li>
                            <li><em>"I saw the roster has had heavy night rotations lately. How has your sleep and rest been holding up?"</em></li>
                            <li><em>"Any family, domestic, or financial matters where the unit welfare cell can assist you?"</em></li>
                          </ul>
                        </div>

                        <div className="p-2.5 bg-red-50 rounded border border-red-200 text-[11px] text-red-950 flex items-start space-x-2">
                          <Lock className="w-3.5 h-3.5 text-red-700 shrink-0 mt-0.5" />
                          <span>
                            <strong>Cardinal Rule:</strong> Never mention AI scores, algorithms, or risk percentages to the individual. The system's entire job was simply to ensure this human conversation takes place.
                          </span>
                        </div>

                        {/* 1-Click Action Presets for Welfare Officers */}
                        <div className="pt-2">
                          <p className="text-[11px] font-bold text-amber-950 mb-1.5">
                            1-Click Supportive Action Presets:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                applyPresetAction(
                                  "Held informal tea discussion; discussed family wellbeing & rest",
                                  "contacted",
                                  "Personnel shared minor family strain at village; reassured and scheduled relaxed 14-day check-in."
                                )
                              }
                              className="px-2.5 py-1 rounded bg-white hover:bg-amber-100/70 border border-amber-300 text-[11px] font-medium text-amber-900 transition-colors"
                            >
                              ☕ Informal Tea Chat (Monitoring)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                applyPresetAction(
                                  "Expedited 10-day domestic leave application for home harvest/family need",
                                  "leave_recommended",
                                  "Identified leave backlog under high operational load; expedited leave processing."
                                )
                              }
                              className="px-2.5 py-1 rounded bg-white hover:bg-amber-100/70 border border-amber-300 text-[11px] font-medium text-amber-900 transition-colors"
                            >
                              🌴 Expedite Leave Application
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                applyPresetAction(
                                  "Swapped heavy night-duty rotation to day shift for sleep recovery",
                                  "contacted",
                                  "Adjusted section roster temporarily to allow 7 consecutive days of normal sleep."
                                )
                              }
                              className="px-2.5 py-1 rounded bg-white hover:bg-amber-100/70 border border-amber-300 text-[11px] font-medium text-amber-900 transition-colors"
                            >
                              🌙 Realign Roster for Rest
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                applyPresetAction(
                                  "Connected with unit peer buddy for daily camaraderie",
                                  "contacted",
                                  "Assigned trusted senior colleague for daily buddy-pair companionship."
                                )
                              }
                              className="px-2.5 py-1 rounded bg-white hover:bg-amber-100/70 border border-amber-300 text-[11px] font-medium text-amber-900 transition-colors"
                            >
                              🤝 Assign Peer Buddy Pair
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                applyPresetAction(
                                  "Dispatched direct outreach nudge to unit Family Welfare Cell to check in with household directly",
                                  "contacted",
                                  `Extended separation (${caseDetail.posting_duration_months} mo) with ${caseDetail.family_structure || "nuclear"} family household. Unit family welfare cell tasked to visit/contact family directly.`
                                )
                              }
                              className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-[11px] font-medium text-indigo-900 transition-colors"
                            >
                              🏡 Nudge Family Welfare Cell
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mandatory Action & Outcome Logging Form */}
                  <form onSubmit={handleLogDecision} className="pt-4 border-t border-neutral-border space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-serif font-bold text-navy-primary flex items-center space-x-2">
                        <FileCheck2 className="w-4 h-4 text-navy-primary" />
                        <span>Log Officer Action & Welfare Outcome</span>
                      </h3>
                      <span className="text-[11px] text-text-muted">
                        Mandatory: The system never auto-closes a case
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-text-primary mb-1">
                          Action Initiated *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Scheduled informal tea discussion with personnel"
                          value={officerAction}
                          onChange={(e) => setOfficerAction(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded border border-neutral-border bg-white focus:border-navy-primary outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-text-primary mb-1">
                          Welfare Outcome *
                        </label>
                        <select
                          value={outcome}
                          onChange={(e) => setOutcome(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded border border-neutral-border bg-white focus:border-navy-primary outline-none"
                        >
                          <option value="contacted">Contacted — Informal chat held; monitoring</option>
                          <option value="leave_recommended">Leave recommended & expedited</option>
                          <option value="routine_followup">Routine follow-up in 30 days</option>
                          <option value="escalated_to_counselling">Referred to Force Medical Officer / Counselling</option>
                          <option value="not_needed">Reviewed — No further action needed at this time</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">
                        Case Officer Confidential Notes
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Confidential observations, domestic context, follow-up date..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded border border-neutral-border bg-white focus:border-navy-primary outline-none"
                      ></textarea>
                    </div>

                    {actionSuccess && (
                      <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded text-xs flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{actionSuccess}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCaseId(null)}
                        className="px-4 py-2 rounded bg-white hover:bg-neutral-hover text-text-muted text-xs font-medium border border-neutral-border"
                      >
                        Close Window
                      </button>
                      <button
                        type="submit"
                        disabled={submittingAction || !officerAction.trim()}
                        className="px-5 py-2 rounded bg-navy-primary hover:bg-navy-light text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                      >
                        {submittingAction ? "Recording Decision..." : "Record Official Welfare Decision"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ==========================================
          TAB: DHVANI (ध्वनि) VOCAL STRAIN RECORDS
      ========================================== */}
      {activeTab === "dhvani-records" && (
        <div className="gov-card">
          <div className="gov-card-header flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <Mic className="w-4 h-4 text-purple-700" />
                <h2 className="text-sm font-serif font-bold text-navy-primary">
                  Dhvani (ध्वनि) — Vocal Acoustic Strain Records
                </h2>
              </div>
              <span className="text-xs text-text-muted">
                10-second acoustic check-in results submitted by personnel. Zero audio stored — metrics only.
              </span>
            </div>
            <button
              onClick={loadDhvaniRecords}
              disabled={dhvaniLoading}
              className="px-3 py-1.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${dhvaniLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Summary Stats */}
          {dhvaniStats && (
            <div className="p-4 border-b border-neutral-border grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Records</span>
                <span className="text-xl font-extrabold text-navy-primary">{dhvaniStats.total}</span>
              </div>
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-center">
                <span className="text-[10px] font-bold text-rose-600 uppercase block">Elevated Fatigue</span>
                <span className="text-xl font-extrabold text-rose-700">{dhvaniStats.elevated_count}</span>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
                <span className="text-[10px] font-bold text-amber-600 uppercase block">Mild Strain</span>
                <span className="text-xl font-extrabold text-amber-700">{dhvaniStats.mild_count}</span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-emerald-600 uppercase block">Optimal</span>
                <span className="text-xl font-extrabold text-emerald-700">{dhvaniStats.optimal_count}</span>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 text-center">
                <span className="text-[10px] font-bold text-purple-600 uppercase block">Avg Fatigue Index</span>
                <span className="text-xl font-extrabold text-purple-800">{dhvaniStats.avg_strain_score}%</span>
              </div>
            </div>
          )}

          {/* Technical Explainer for Welfare Officers (TASK 4) */}
          <div className="p-4 bg-slate-50 border-b border-neutral-border text-xs text-slate-700 space-y-3">
            <div className="flex items-center space-x-2 text-navy-primary font-bold">
              <Activity className="w-4 h-4 text-purple-700 shrink-0" />
              <span>Welfare &amp; Operational Interpretation Protocol (Welfare Officer Guidance)</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed">
              <div className="p-3 bg-white rounded border border-slate-200 space-y-1">
                <span className="font-bold text-navy-primary block text-xs">What Dhvani Measures</span>
                <p className="text-slate-600">
                  Measures biomechanical vocal-fold perturbation: frequency micro-tremors (<strong>Jitter RAP</strong>, normal &lt;0.85%), respiratory amplitude flutter (<strong>Shimmer APQ</strong>, normal &lt;2.8%), and glottal air turbulence (<strong>HNR</strong>, normal &gt;21 dB). Analyzes vocal cord biomechanics only — <em>zero speech-to-text semantic analysis</em>.
                </p>
              </div>

              <div className="p-3 bg-white rounded border border-slate-200 space-y-1">
                <span className="font-bold text-navy-primary block text-xs">What Dhvani Does NOT Do</span>
                <p className="text-slate-600">
                  <strong>Not a clinical psychiatric diagnosis.</strong> It does not detect clinical depression or PTSD, does not record conversations, and <em>never issues operational fitness clearances</em>. It serves solely as an auxiliary early-warning indicator to prompt human welfare review.
                </p>
              </div>

              <div className="p-3 bg-white rounded border border-slate-200 space-y-1">
                <span className="font-bold text-navy-primary block text-xs">Scoring & Personal Baseline Calibration</span>
                <p className="text-slate-600">
                  Personnel are evaluated against their <strong>own rolling personal baseline</strong> (drift $\Delta$) rather than a rigid universal threshold. Single check-ins without prior history ($N=1$) are marked as <em>provisional (lower weight)</em> and require persistent multi-check deviation to confirm true operational strain.
                </p>
              </div>

              <div className="p-3 bg-white rounded border border-slate-200 space-y-1">
                <span className="font-bold text-navy-primary block text-xs">Known Confounders & Limitations</span>
                <p className="text-slate-600">
                  Readings can be temporarily elevated by physical exertion, environmental heat, throat infections, shouting commands, or nearby diesel engines. Deliberately controlled speech may suppress tremor. <strong>Always evaluate alongside roster hours, night duty density, and NCO observations.</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-neutral-border flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, ID, company..."
                value={dhvaniSearch}
                onChange={(e) => setDhvaniSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-neutral-border bg-white focus:border-navy-primary outline-none"
              />
            </div>
            {(["all", "Elevated Fatigue", "Mild Strain", "Optimal"] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setDhvaniTierFilter(tier)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  dhvaniTierFilter === tier
                    ? tier === "Elevated Fatigue" ? "bg-rose-700 text-white" :
                      tier === "Mild Strain" ? "bg-amber-500 text-white" :
                      tier === "Optimal" ? "bg-emerald-600 text-white" :
                      "bg-navy-primary text-white"
                    : "bg-white text-slate-600 border border-neutral-border hover:bg-neutral-hover"
                }`}
              >
                {tier === "all" ? `All (${dhvaniStats?.total ?? 0})` : tier}
              </button>
            ))}
          </div>

          {/* Records Table */}
          <div className="overflow-x-auto">
            {dhvaniLoading ? (
              <div className="py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3" />
                <p className="text-xs text-text-muted">Loading Dhvani records...</p>
              </div>
            ) : (() => {
              const filtered = dhvaniRecords.filter((r) => {
                const q = dhvaniSearch.toLowerCase();
                const matchesSearch = q === "" ||
                  r.name.toLowerCase().includes(q) ||
                  r.personnel_id.toLowerCase().includes(q) ||
                  r.company.toLowerCase().includes(q) ||
                  r.battalion.toLowerCase().includes(q);
                if (!matchesSearch) return false;
                if (dhvaniTierFilter !== "all" && r.strain_tier !== dhvaniTierFilter) return false;
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div className="py-12 text-center">
                    <Mic className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-text-muted font-semibold">No Dhvani records found</p>
                    <p className="text-xs text-text-muted mt-1">
                      Records appear here after personnel submit a 10-second vocal check-in.
                    </p>
                  </div>
                );
              }

              return (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-border bg-slate-50">
                      <th className="text-left px-4 py-2.5 font-bold text-slate-600 whitespace-nowrap">Personnel</th>
                      <th className="text-left px-3 py-2.5 font-bold text-slate-600">Company</th>
                      <th className="text-center px-3 py-2.5 font-bold text-slate-600">Status</th>
                      <th className="text-center px-3 py-2.5 font-bold text-slate-600">Fatigue %</th>
                      <th className="text-center px-3 py-2.5 font-bold text-slate-600">Jitter</th>
                      <th className="text-center px-3 py-2.5 font-bold text-slate-600">Shimmer</th>
                      <th className="text-center px-3 py-2.5 font-bold text-slate-600">HNR (dB)</th>
                      <th className="text-center px-3 py-2.5 font-bold text-slate-600">Pitch (Hz)</th>
                      <th className="text-left px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((rec) => {
                      const tierColor =
                        rec.strain_tier === "Elevated Fatigue"
                          ? "bg-rose-100 text-rose-800 border-rose-300"
                          : rec.strain_tier === "Mild Strain"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-emerald-100 text-emerald-800 border-emerald-300";

                      const scoreColor =
                        rec.strain_score > 65 ? "text-rose-700 font-extrabold" :
                        rec.strain_score > 40 ? "text-amber-700 font-bold" :
                        "text-emerald-700 font-bold";

                      const submittedAt = formatRealDateTime(rec.created_at);

                      return (
                        <tr key={rec.id} className="border-b border-neutral-border hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-navy-primary">{rec.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{rec.personnel_id}</div>
                            <div className="text-[10px] text-slate-500">{rec.rank}</div>
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            <div>{rec.company}</div>
                            <div className="text-[10px] text-slate-400">{rec.battalion}</div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tierColor}`}>
                              {rec.strain_tier}
                            </span>
                          </td>
                          <td className={`px-3 py-3 text-center font-mono ${scoreColor}`}>
                            {rec.strain_score}%
                          </td>
                          <td className="px-3 py-3 text-center text-slate-600 font-mono">{rec.jitter_pct}%</td>
                          <td className="px-3 py-3 text-center text-slate-600 font-mono">{rec.shimmer_pct}%</td>
                          <td className="px-3 py-3 text-center text-slate-600 font-mono">{rec.hnr_db}</td>
                          <td className="px-3 py-3 text-center text-slate-600 font-mono">{rec.pitch_hz}</td>
                          <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{submittedAt}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })()}
          </div>

          {/* Privacy Footer */}
          <div className="p-3 border-t border-neutral-border bg-slate-50 flex items-center space-x-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              <strong>Privacy Guarantee:</strong> Zero audio is stored anywhere. Only client-side DSP metrics are logged. Records have zero impact on ACR or service conduct.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

