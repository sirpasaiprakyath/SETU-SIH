import React, { useEffect, useState } from "react";
import type {
  User,
  PersonnelProfile,
  SaathiContext,
  SaathiQuestion,
  SaathiHistoryItem,
  PersonnelVitalsData,
  BuddyPairInfo
} from "../types";
import {
  apiGetPersonnelProfile,
  apiCheckInvitation,
  apiRespondInvitation,
  apiStandingTalkRequest,
  apiGetSaathiContext,
  apiGetSaathiNextQuestion,
  apiSubmitSaathiCheckin,
  apiGetSaathiHistory,
  apiDismissSaathiNudge,
  apiResetWeeklySaathiDemo,
  apiGetMyMedicalVitals,
  apiCompleteOnboarding,
  apiGetMyBuddy,
  apiSetStarBuddy,
  apiSubmitBuddyDropBox,
  apiGetVocalHistory,
  type ScheduledTeaInfo,
  type PendingChatInfo
} from "../api";
import { useLanguage } from "../LanguageContext";
import { tSaathi } from "../locales/translations";
import { VishramSection } from "./VishramSection";
import { VoiceStrainModal } from "./VoiceStrainModal";
import { formatRelativeRealTime } from "../utils/dateUtils";
import {
  MessageSquare,
  Calendar,
  MapPin,
  Award,
  CheckCircle,
  HeartHandshake,
  Shield,
  Sparkles,
  ChevronRight,
  RotateCcw,
  Lock,
  Compass,
  BellRing,
  Check,
  Activity,
  History,
  ShieldCheck,
  Heart,
  Scale,
  TrendingUp,
  Home,
  Coffee,
  Utensils,
  PhoneCall,
  VolumeX,
  EyeOff,
  Users,
  Mic,
  Phone,
  Wind,
  Star
} from "lucide-react";

interface PersonnelViewProps {
  currentUser: User;
}

export const PersonnelView: React.FC<PersonnelViewProps> = ({ currentUser }) => {
  const { language, setLanguage, t, tr } = useLanguage();
  const [profile, setProfile] = useState<PersonnelProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<{
    has_invitation: boolean;
    invitation_text?: string;
    welfare_cell_contact?: string;
    standing_note?: string;
    scheduled_tea?: ScheduledTeaInfo | null;
    pending_chat?: PendingChatInfo | null;
  } | null>(null);
  const [talkModalOpen, setTalkModalOpen] = useState(false);
  const [talkSuccessMsg, setTalkSuccessMsg] = useState<string | null>(null);
  const [invitationDismissed, setInvitationDismissed] = useState(false);

  // Saathi Companion state
  const [saathiContext, setSaathiContext] = useState<SaathiContext | null>(null);
  const [saathiActive, setSaathiActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<SaathiQuestion | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [privateNotes, setPrivateNotes] = useState("");
  const [freeTextAnswer, setFreeTextAnswer] = useState("");
  const [requestedWelfareOutreach, setRequestedWelfareOutreach] = useState(false);
  const [submittingSaathi, setSubmittingSaathi] = useState(false);
  const [saathiCompleted, setSaathiCompleted] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saathiHistory, setSaathiHistory] = useState<SaathiHistoryItem[]>([]);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [safetyNetActive, setSafetyNetActive] = useState(false);
  const [safetyNetMessage, setSafetyNetMessage] = useState<string>("");
  const [optOutExitMessage, setOptOutExitMessage] = useState<string | null>(null);
  const [activeDomain, setActiveDomain] = useState<string | null>(null);

  // Medical camp vitals (raw readings only)
  const [vitalsData, setVitalsData] = useState<PersonnelVitalsData | null>(null);

  // Personnel Portal Tab: "home" | "dashboard" | "peer-guard"
  const [personnelTab, setPersonnelTab] = useState<"home" | "dashboard" | "peer-guard">("home");
  const [lastEvaluation, setLastEvaluation] = useState<any>(null);

  // Dhvani (ध्वनि) 10-Second Acoustic Check-in State
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [recentVocalCheck, setRecentVocalCheck] = useState<any>(null);

  // One-time onboarding state
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingMarried, setOnboardingMarried] = useState(true);
  const [onboardingFamilyStructure, setOnboardingFamilyStructure] = useState("nuclear");
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [onboardingSuccessMsg, setOnboardingSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const p = await apiGetPersonnelProfile();
      setProfile(p);
      setOnboardingMarried(p.married ?? true);
      setOnboardingFamilyStructure(p.family_structure || "nuclear");

      try {
        const inv = await apiCheckInvitation();
        setInvitation(inv);
      } catch (e) {
        console.warn("Could not fetch invitation info", e);
      }

      try {
        const sContext = await apiGetSaathiContext();
        setSaathiContext(sContext);
        if (sContext?.initial_question) {
          setCurrentQuestion(sContext.initial_question);
        }
      } catch (e) {
        console.warn("Could not fetch Saathi context", e);
      }

      try {
        const sHist = await apiGetSaathiHistory();
        setSaathiHistory(sHist || []);
      } catch (e) {
        console.warn("Could not fetch Saathi history", e);
      }

      try {
        const vData = await apiGetMyMedicalVitals();
        setVitalsData(vData);
      } catch (e) {
        console.warn("Could not fetch vitals data", e);
      }

      try {
        const b = await apiGetMyBuddy();
        setBuddyInfo(b);
        if (b?.assigned_buddy?.personnel_id) {
          setSelectedBuddyId(b.assigned_buddy.personnel_id);
        } else if (b?.section_peers?.[0]?.personnel_id) {
          setSelectedBuddyId(b.section_peers[0].personnel_id);
        }
      } catch (e) {
        console.warn("Could not fetch buddy info", e);
      }

      try {
        const vHist = await apiGetVocalHistory();
        if (vHist?.recent_records && vHist.recent_records.length > 0) {
          const latest = vHist.recent_records[0];
          setRecentVocalCheck({
            strain_score: latest.strain_score,
            strain_tier: latest.strain_tier,
            status: "synced",
            created_at: latest.created_at
          });
        } else {
          const rawLocal = localStorage.getItem("dhvani_personal_baseline");
          if (rawLocal) {
            const parsed = JSON.parse(rawLocal);
            setRecentVocalCheck({
              strain_score: parsed.lastStrain,
              strain_tier: parsed.lastTier,
              status: parsed.synced ? "synced" : "offline_cached",
              created_at: parsed.lastRecordedAt || parsed.updatedAt
            });
          }
        }
      } catch (e) {
        const rawLocal = localStorage.getItem("dhvani_personal_baseline");
        if (rawLocal) {
          try {
            const parsed = JSON.parse(rawLocal);
            setRecentVocalCheck({
              strain_score: parsed.lastStrain,
              strain_tier: parsed.lastTier,
              status: "offline_cached",
              created_at: parsed.lastRecordedAt || parsed.updatedAt
            });
          } catch (_) {}
        }
      }
    } catch (err) {
      console.error("Failed to load personnel details", err);
    } finally {
      setLoading(false);
    }
  };



  // Peer Guard / Buddy System State
  const [buddyInfo, setBuddyInfo] = useState<BuddyPairInfo | null>(null);
  const [selectedBuddyId, setSelectedBuddyId] = useState<string>("");
  const [selectedCareCategory, setSelectedCareCategory] = useState<string>("night_distress_phone");
  const [peerNoteText, setPeerNoteText] = useState("");
  const [submittingPeerNote, setSubmittingPeerNote] = useState(false);
  const [peerNoteSuccessMsg, setPeerNoteSuccessMsg] = useState<string | null>(null);

  // Sahyogi Dual-Key Mutual Welfare Shield State
  const [myKeyActive, setMyKeyActive] = useState(false);
  const [buddyKeyActive, setBuddyKeyActive] = useState(false);
  const [dualKeySubmitted, setDualKeySubmitted] = useState(false);

  // Star Buddy 7-Day Cohesion Protocol State
  const [starBuddyModalOpen, setStarBuddyModalOpen] = useState(false);
  const [newStarBuddyId, setNewStarBuddyId] = useState<string>("");
  const [savingStarBuddy, setSavingStarBuddy] = useState(false);
  const [starBuddySuccessMsg, setStarBuddySuccessMsg] = useState<string | null>(null);

  const handleSaveStarBuddy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStarBuddyId) return;
    setSavingStarBuddy(true);
    try {
      const res = await apiSetStarBuddy(newStarBuddyId);
      setStarBuddySuccessMsg(res.message);
      const b = await apiGetMyBuddy();
      setBuddyInfo(b);
      setStarBuddyModalOpen(false);
      setTimeout(() => setStarBuddySuccessMsg(null), 9000);
    } catch (err: any) {
      alert(`Star Buddy Error: ${err.message}`);
    } finally {
      setSavingStarBuddy(false);
    }
  };

  const handlePeerNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!peerNoteText.trim() || !selectedBuddyId) return;

    setSubmittingPeerNote(true);
    try {
      const res = await apiSubmitBuddyDropBox({
        target_personnel_id: selectedBuddyId,
        care_category: selectedCareCategory,
        observation_text: peerNoteText.trim(),
      });
      setPeerNoteSuccessMsg(res.message || "Note submitted anonymously into the Welfare Drop Box.");
      setPeerNoteText("");
      setTimeout(() => setPeerNoteSuccessMsg(null), 8000);
    } catch (err: any) {
      alert(`Error submitting peer note: ${err.message}`);
    } finally {
      setSubmittingPeerNote(false);
    }
  };

  const handleSaveOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOnboarding(true);
    try {
      await apiCompleteOnboarding({
        married: onboardingMarried,
        family_structure: onboardingMarried ? onboardingFamilyStructure : "n/a"
      });
      setOnboardingSuccessMsg("Service support & family structure recorded successfully.");
      setOnboardingOpen(false);
      const updated = await apiGetPersonnelProfile();
      setProfile(updated);
    } catch (err: any) {
      alert(`Failed to save onboarding response: ${err.message}`);
    } finally {
      setSavingOnboarding(false);
    }
  };

  const handleDeclineInvitation = async () => {
    try {
      await apiRespondInvitation(false);
      setInvitationDismissed(true);
    } catch (e) {
      setInvitationDismissed(true);
    }
  };

  const handleAcceptInvitation = async () => {
    try {
      const res = await apiRespondInvitation(true);
      setTalkSuccessMsg(res.message);
      setInvitationDismissed(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStandingTalkSubmit = async () => {
    try {
      const res = await apiStandingTalkRequest("informal_conversation");
      setTalkSuccessMsg(res.message);
      setTalkModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Saathi interactive actions
  const handleSelectOption = async (option: any) => {
    const updatedAnswers = [
      ...answers,
      {
        question_id: currentQuestion?.question_id,
        step: currentStep,
        option_key: option.key,
        option_label: option.label,
        score_key: option.score_key,
        score_val: option.score_val,
        free_text: freeTextAnswer.trim() || undefined
      }
    ];
    setAnswers(updatedAnswers);
    setFreeTextAnswer("");

    if (option.score_key && option.score_val) {
      setScores((prev) => ({ ...prev, [option.score_key]: option.score_val }));
    }

    // Fetch next dynamic adaptive question
    if (saathiContext) {
      try {
        const nextRes = await apiGetSaathiNextQuestion(
          saathiContext.duty_category,
          currentStep,
          updatedAnswers
        );

        if (nextRes.domain) {
          setActiveDomain(nextRes.domain);
        }

        // 1. Safety Net check (Triggers on traumatic incident, crisis language, etc.)
        if (nextRes.is_safety_net) {
          setSafetyNetActive(true);
          setSafetyNetMessage(nextRes.safety_net_message || "It sounds like things are genuinely hard right now. You don't have to carry this alone.");
          try {
            await apiSubmitSaathiCheckin({
              duty_category: saathiContext.duty_category,
              answers: updatedAnswers,
              scores,
              safety_net_triggered: true,
              requested_welfare_outreach: false
            });
            const sContext = await apiGetSaathiContext();
            setSaathiContext(sContext);
          } catch (e) {
            console.error(e);
          }
          return;
        }

        // 2. Question update (advances to next question, including when skipping via "Rather not say")
        if (nextRes.question) {
          setCurrentQuestion(nextRes.question);
          setCurrentStep(nextRes.step);
        } else if (nextRes.is_opt_out && option.key !== "rather_not_say") {
          // Explicit opt-out neutral exit
          setOptOutExitMessage(nextRes.exit_message || "Understood — no pressure. I'm here whenever you want to talk.");
          try {
            await apiSubmitSaathiCheckin({
              duty_category: saathiContext.duty_category,
              answers: updatedAnswers,
              scores,
              opted_out: true
            });
            const sHist = await apiGetSaathiHistory();
            setSaathiHistory(sHist);
            const sContext = await apiGetSaathiContext();
            setSaathiContext(sContext);
          } catch (e) {
            console.error(e);
          }
          return;
        } else {
          // Reached end of adaptive questioning -> Proceed to closing reflection & notes
          setCurrentStep(10);
        }
      } catch (err) {
        console.error("Failed to get adaptive question", err);
      }
    }
  };

  const handleCompleteSaathi = async () => {
    if (!saathiContext) return;
    setSubmittingSaathi(true);
    try {
      const submitRes = await apiSubmitSaathiCheckin({
        duty_category: saathiContext.duty_category,
        answers,
        scores,
        private_notes: privateNotes.trim() ? privateNotes : undefined,
        requested_welfare_outreach: requestedWelfareOutreach
      });
      if (submitRes?.evaluation) {
        setLastEvaluation(submitRes.evaluation);
      }
      setSaathiCompleted(true);
      // Reload history and context
      const sHist = await apiGetSaathiHistory();
      setSaathiHistory(sHist);
      const sContext = await apiGetSaathiContext();
      setSaathiContext(sContext);
    } catch (err: any) {
      alert(`Error saving check-in: ${err.message}`);
    } finally {
      setSubmittingSaathi(false);
    }
  };

  const resetSaathi = () => {
    setSaathiActive(false);
    setSaathiCompleted(false);
    setLastEvaluation(null);
    setAnswers([]);
    setScores({});
    setPrivateNotes("");
    setFreeTextAnswer("");
    setRequestedWelfareOutreach(false);
    setSafetyNetActive(false);
    setSafetyNetMessage("");
    setOptOutExitMessage(null);
    setActiveDomain(null);
    setCurrentStep(1);
    if (saathiContext) {
      setCurrentQuestion(saathiContext.initial_question);
    }
  };

  const handleDismissNudge = async () => {
    if (saathiContext?.pending_nudge) {
      try {
        await apiDismissSaathiNudge(saathiContext.pending_nudge.id);
        setNudgeDismissed(true);
      } catch (e) {
        setNudgeDismissed(true);
      }
    }
  };

  // Saathi Voluntary Informed Consent Protocol (DPDP & 90-day retention)
  const [showSaathiConsent, setShowSaathiConsent] = useState(false);

  const handleStartSaathi = () => {
    const hasConsented = localStorage.getItem("saathi_consent_accepted") === "true";
    if (!hasConsented) {
      setShowSaathiConsent(true);
      return;
    }
    setPersonnelTab("dashboard");
    setSaathiActive(true);
    setCurrentStep(1);
    if (saathiContext) setCurrentQuestion(saathiContext.initial_question);
  };

  const handleAcceptSaathiConsent = () => {
    localStorage.setItem("saathi_consent_accepted", "true");
    setShowSaathiConsent(false);
    setPersonnelTab("dashboard");
    setSaathiActive(true);
    setCurrentStep(1);
    if (saathiContext) setCurrentQuestion(saathiContext.initial_question);
  };

  const handleResetWeeklyDemo = async () => {
    try {
      await apiResetWeeklySaathiDemo();
      const sContext = await apiGetSaathiContext();
      setSaathiContext(sContext);
      resetSaathi();
    } catch (e: any) {
      alert(`Could not reset weekly check-in: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-primary mx-auto mb-3"></div>
        <p className="text-sm text-text-muted">Loading your service record...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Welcome Banner */}
      <div className="gov-card p-6 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="badge-khaki mb-1.5">
              {t("personnel.service_record_badge", "CAPF Personnel Service Record")}
            </span>
            <h1 className="text-2xl font-bold text-navy-primary">
              {t("personnel.welcome", "Welcome")}, {currentUser.full_name}
            </h1>
            <p className="text-xs text-text-muted mt-1 font-sans">
              {language === "hi" ? "सेवा क्रमांक (आईडी):" : "Service ID:"}{" "}
              <span className="font-mono text-navy-primary font-semibold">{profile?.personnel_id}</span> • {profile?.rank_tier} • {profile?.force}
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Saathi quick launch button if not active */}
            {!saathiActive && (
              saathiContext?.weekly_cycle?.completed_this_week ? (
                <button
                  onClick={() => setPersonnelTab("dashboard")}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold shadow-2xs transition-all shrink-0 cursor-pointer"
                  title={`Weekly check-in completed. Next check-in opens next week (due Sun, ${saathiContext.weekly_cycle.next_week_sunday}).`}
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{language === "hi" ? "साप्ताहिक संवाद पूर्ण" : "Weekly Saathi Done"}</span>
                </button>
              ) : (
                <button
                  onClick={handleStartSaathi}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-gold/15 hover:bg-gold/25 text-navy-primary border border-gold/40 text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-gold" />
                  <span>{t("personnel.open_saathi", "Open Saathi")}</span>
                </button>
              )
            )}

            {/* Quick jump to Vishram (Downtime & Breathing) */}
            <button
              type="button"
              onClick={() => {
                setPersonnelTab("home");
                setTimeout(() => {
                  document.getElementById("vishram-section")?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold shadow-2xs transition-all shrink-0 cursor-pointer"
              title={tr("Take a quiet 2-minute break", "2 मिनट का शांत विश्राम लें")}
            >
              <Wind className="w-3.5 h-3.5 text-emerald-700" />
              <span>{tr("Vishram", "विश्राम")}</span>
            </button>

            {/* Always-visible, low-key "Talk to someone" button */}
            <button
              onClick={() => setTalkModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-navy-primary hover:bg-navy-light text-white text-xs font-semibold shadow-sm transition-all border border-navy-primary/30 shrink-0"
            >
              <div className="w-5 h-5 rounded-full bg-gold text-navy-darker flex items-center justify-center shrink-0">
                <HeartHandshake className="w-3.5 h-3.5" />
              </div>
              <span>{t("personnel.talk_someone", "Talk to someone")}</span>
            </button>
          </div>
        </div>
      </div>
      {/* Confirmation feedback if user initiated a chat request */}
      {talkSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{talkSuccessMsg}</span>
          </div>
          <button
            onClick={() => setTalkSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4"
          >
            {language === "hi" ? "बंद करें" : "Dismiss"}
          </button>
        </div>
      )}

      {/* Confirmation feedback for onboarding record update */}
      {onboardingSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{onboardingSuccessMsg}</span>
          </div>
          <button
            onClick={() => setOnboardingSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4"
          >
            {language === "hi" ? "बंद करें" : "Dismiss"}
          </button>
        </div>
      )}


      {/* ========================================================================= */}
      {/* PRIMARY PERSONNEL PORTAL NAVIGATION BAR (4 CLEAN MODULAR VIEWS)          */}
      {/* ========================================================================= */}
      <div className="flex border-b-2 border-neutral-border space-x-1 sm:space-x-2 overflow-x-auto pb-0">
        <button
          type="button"
          onClick={() => setPersonnelTab("home")}
          className={`pb-3 px-3.5 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-2 shrink-0 ${
            personnelTab === "home"
              ? "border-navy-primary text-navy-primary bg-navy-primary/5 rounded-t"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <Home className="w-4 h-4 text-navy-primary" />
          <span>{t("nav.dossier", "Duty Roster & Service Dossier")}</span>
        </button>

        <button
          type="button"
          onClick={() => setPersonnelTab("dashboard")}
          className={`pb-3 px-3.5 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-2 shrink-0 ${
            personnelTab === "dashboard"
              ? "border-emerald-600 text-emerald-950 bg-emerald-50/70 rounded-t"
              : "border-transparent text-emerald-800 hover:text-emerald-950"
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-600" />
          <span>{t("nav.dashboard", "Welfare & Health Dashboard")}</span>
          {invitation?.scheduled_tea ? (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
              <Coffee className="w-2.5 h-2.5" />
              <span>{language === "hi" ? "चाय निर्धारित" : "Tea Scheduled"}</span>
            </span>
          ) : invitation?.has_invitation && !invitationDismissed ? (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setPersonnelTab("peer-guard")}
          className={`pb-3 px-3.5 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-2 shrink-0 ${
            personnelTab === "peer-guard"
              ? "border-amber-600 text-amber-950 bg-amber-50/70 rounded-t"
              : "border-transparent text-amber-800 hover:text-amber-950"
          }`}
        >
          <Users className="w-4 h-4 text-amber-700" />
          <span>{t("nav.peer_guard", "Saathi Peer Guard (Buddy Drop Box)")}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsVoiceModalOpen(true)}
          className="pb-3 px-3.5 sm:px-4 text-xs font-bold transition-all border-b-2 border-transparent text-emerald-800 hover:text-emerald-950 flex items-center space-x-1.5 shrink-0 bg-emerald-50/60 hover:bg-emerald-100/70 rounded-t cursor-pointer"
        >
          <Mic className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span>{language === "hi" ? "ध्वनि • 10s स्वर जांच" : "Dhvani: 10s Voice Check"}</span>
          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-600 text-white uppercase">
            {language === "hi" ? "त्वरित" : "New"}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HOME — DUTY ROSTER, STATION PROFILE & STATUTORY HOUSEHOLD RECORD   */}
      {/* ========================================================================= */}
      {personnelTab === "home" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Quick-Action: Dhvani 10-Second Acoustic Vocal Biomarker Check Banner */}
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-sm text-white">
                    {language === "hi" ? "ध्वनि (Dhvani) — 10-सेकंड स्वर तनाव जांच" : "Dhvani (ध्वनि) — 10-Second Acoustic Voice Check"}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {language === "hi" ? "शून्य प्रश्नावली • 0 बाइट्स संचय" : "Zero Questionnaire • Zero Audio Saved"}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {language === "hi"
                    ? "बिना किसी फॉर्म के केवल 10 सेकंड बोलकर शारीरिक थकान व वोकल कॉर्ड सूक्ष्म-कंपन का सटीक मापन। ऑडियो कभी भी सेव नहीं होता।"
                    : "10-second non-invasive acoustic biomarker check. Measures vocal fold micro-tremors (Jitter & Shimmer). 100% Zero audio retained."}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              {recentVocalCheck && (
                <div className="text-right text-[11px] bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 hidden sm:block">
                  <span className="text-slate-400 block text-[10px]">{language === "hi" ? "दैनिक रोल-कॉल जांच:" : "Daily Roll-Call Check:"}</span>
                  <div className="flex items-center justify-end space-x-1.5">
                    <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span>{language === "hi" ? "जांच दर्ज" : "Check-in Recorded"}</span>
                    </span>
                    {recentVocalCheck.status === "offline_cached" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        FOB Mode
                      </span>
                    )}
                  </div>
                  {recentVocalCheck.created_at && (
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                      {formatRelativeRealTime(recentVocalCheck.created_at)}
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{language === "hi" ? "स्वर जांच प्रारंभ करें" : "Start Voice Check"}</span>
              </button>
            </div>
          </div>

          {/* Prominent Informal Welfare Tea Scheduled Banner */}
          {invitation?.scheduled_tea && (
            <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-amber-50 via-amber-100/50 to-orange-50 border-2 border-amber-400 shadow-sm animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">
                        ☕ {language === "hi" ? "अनौपचारिक चाय संवाद निर्धारित" : "Informal Welfare Tea Scheduled"}
                      </span>
                      <span className="text-[11px] text-emerald-800 font-semibold flex items-center space-x-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Lock className="w-3 h-3 text-emerald-600" />
                        <span>{language === "hi" ? "100% गोपनीय • सेवा रिकॉर्ड में शून्य दर्ज" : "100% Confidential • Zero Service Record"}</span>
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-navy-primary mt-1.5 flex items-center space-x-2">
                      <span>{language === "hi" ? "कल्याण प्रकोष्ठ के साथ चाय पर चर्चा" : "Informal Check-In with Unit Welfare Cell"}</span>
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-semibold text-amber-950">
                      <div className="inline-flex items-center space-x-1.5 bg-white/90 px-2.5 py-1 rounded border border-amber-300/80">
                        <Calendar className="w-3.5 h-3.5 text-amber-700" />
                        <span>{language === "hi" ? "समय एवं स्थान:" : "Time & Venue:"}</span>
                        <strong className="text-navy-primary font-mono">{invitation.scheduled_tea.scheduled_at}</strong>
                      </div>
                      <div className="inline-flex items-center space-x-1.5 bg-white/90 px-2.5 py-1 rounded border border-amber-300/80">
                        <Phone className="w-3.5 h-3.5 text-amber-700" />
                        <span>{invitation.scheduled_tea.welfare_cell_contact || "Welfare Officer • Ext: 4102"}</span>
                      </div>
                    </div>
                    <p className="text-xs text-navy-darker/90 mt-2 leading-relaxed max-w-3xl">
                      {language === "hi"
                        ? "कल्याण प्रकोष्ठ द्वारा एक शांतिपूर्ण, गैर-अभिलेखीय चाय संवाद तय किया गया है। यह बातचीत आपके विश्राम व परिवार के सहयोग हेतु है। यह कमांड या वार्षिक गोपनीय रिपोर्ट (ACR) से पूरी तरह अदृश्य है।"
                        : "A quiet, off-the-record informal tea chat has been arranged by the Unit Welfare Officer. It is a supportive, friendly touchpoint to discuss family rhythm and well-being. Completely invisible to Battalion Command and ACR."}
                    </p>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPersonnelTab("dashboard")}
                    className="px-3.5 py-2 rounded-lg bg-navy-primary hover:bg-navy-light text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>{language === "hi" ? "कल्याण डेस्क देखें" : "View Welfare Desk"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tactical Duty Roster & Deployment Profile */}
          <div className="gov-card p-5 bg-white border border-neutral-border shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-border gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-navy-primary/10 text-navy-primary flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-navy-primary" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-navy-primary">
                      {tr("Current Deployment & Active Duty Roster", "वर्तमान तैनाती एवं सक्रिय ड्यूटी रोस्टर")}
                    </h3>
                    <span className="badge-khaki text-[10px] font-bold">{tr("Active Roster", "सक्रिय रोस्टर")}</span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 font-sans">
                    {tr("Battalion Deployment", "बटालियन तैनाती")} &bull; {tr("Subunit:", "उप-इकाई:")} <strong className="text-navy-primary">{profile?.company}</strong> &bull; {profile?.battalion}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] text-text-muted block uppercase tracking-wider font-semibold">{tr("Station Tenure", "तैनाती अवधि")}</span>
                <span className="text-xs font-bold text-navy-primary">
                  {profile?.posting_duration_months} {tr("Months at Current Post", "माह वर्तमान पोस्ट पर")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
              <div className="p-3 bg-neutral-card/60 rounded-lg border border-neutral-border space-y-1">
                <span className="text-[11px] text-text-muted block font-medium">{tr("Operational Duty Sector", "सक्रिय ड्यूटी सेक्टर")}</span>
                <strong className="text-navy-primary text-xs capitalize block">
                  {profile?.posting_category?.replace(/_/g, " ") || "Operational LWE"}
                </strong>
                <span className="text-[10px] text-text-muted block">
                  {tr("High-strain tactical counter-insurgency rotation", "उच्च तनाव सामरिक आतंकवाद रोधी रोटेशन")}
                </span>
              </div>

              <div className="p-3 bg-neutral-card/60 rounded-lg border border-neutral-border space-y-1">
                <span className="text-[11px] text-text-muted block font-medium">{tr("Weekly Duty Rhythm", "साप्ताहिक ड्यूटी समय")}</span>
                <strong className="text-navy-primary text-xs block">
                  {profile?.avg_weekly_duty_hours_last_90d || 45.0} {tr("hrs / week", "घंटे / सप्ताह")}
                </strong>
                <span className="text-[10px] text-text-muted block">
                  {tr("Night duty turnaround: normal rotation", "रात्रि ड्यूटी चक्र: सामान्य रोटेशन")}
                </span>
              </div>

              <div className="p-3 bg-neutral-card/60 rounded-lg border border-neutral-border space-y-1">
                <span className="text-[11px] text-text-muted block font-medium">{tr("Rest Day Compliance", "विश्राम दिवस अनुपालन")}</span>
                <strong className="text-emerald-700 text-xs block">
                  {profile?.rest_day_compliance_pct_last_90d || 95.0}% {tr("Compliance", "अनुपालन")}
                </strong>
                <span className="text-[10px] text-text-muted block">
                  {tr("Scheduled weekly rest days honored", "निर्धारित साप्ताहिक विश्राम दिवस प्रदत्त")}
                </span>
              </div>
            </div>
          </div>

          {/* Three Key Service Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Leave Balance Card (Cleaned float formatting) */}
            <div className="gov-card p-4 space-y-2">
              <div className="flex items-center space-x-2.5 text-navy-primary font-bold text-xs pb-2 border-b border-neutral-border">
                <Calendar className="w-4 h-4 text-navy-primary" />
                <span>{tr("Annual Leave Balance (12M)", "वार्षिक अवकाश शेष (12 माह)")}</span>
              </div>
              <div className="pt-1 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">{tr("Total Entitlement:", "कुल पात्रता:")}</span>
                  <strong className="text-text-primary">{profile?.leave_entitled_annual || 30} {tr("days", "दिन")}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">{tr("Availed in Past 12M:", "विगत 12 माह में उपभोग:")}</span>
                  <span>{profile?.leave_availed_last_12m || 0} {tr("days", "दिन")}</span>
                </div>
                <div className="pt-2 border-t border-neutral-border flex justify-between items-baseline">
                  <span className="text-text-muted font-medium">{tr("Remaining Balance:", "अवशेष अवकाश:")}</span>
                  <span className="text-base font-bold text-navy-primary">
                    {Number(profile?.leave_balance_remaining ?? 0).toFixed(1)} {tr("days", "दिन")}
                  </span>
                </div>
              </div>
            </div>

            {/* Training & Service Card */}
            <div className="gov-card p-4 space-y-2">
              <div className="flex items-center space-x-2.5 text-navy-primary font-bold text-xs pb-2 border-b border-neutral-border">
                <Award className="w-4 h-4 text-gold-dark" />
                <span>{tr("Training & Service Record", "प्रशिक्षण एवं सेवा रिकॉर्ड")}</span>
              </div>
              <div className="pt-1 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">{tr("Training Completed:", "पूर्ण प्रशिक्षण:")}</span>
                  <strong className="text-text-primary">{profile?.training_hours_last_12m || 40} {tr("hrs (Past 12M)", "घंटे (विगत 12 माह)")}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">{tr("Total Force Tenure:", "कुल बल सेवा काल:")}</span>
                  <span>{profile?.tenure_years || 5} {tr("years", "वर्ष")}</span>
                </div>
                <div className="pt-2 border-t border-neutral-border flex justify-between items-center">
                  <span className="text-text-muted font-medium">{tr("Annual Refresher:", "वार्षिक रिफ्रेशर:")}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {tr("Completed (Current Cycle)", "पूर्ण (वर्तमान चक्र)")}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Health & Camp Summary */}
            <div className="gov-card p-4 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-border">
                <div className="flex items-center space-x-2 text-navy-primary font-bold text-xs">
                  <Heart className="w-4 h-4 text-rose-600" />
                  <span>{tr("Medical Camp Status", "मेडिकल कैंप स्थिति")}</span>
                </div>
                <span className="text-[10px] text-text-muted font-mono">
                  {vitalsData?.latest_camp_date || (language === "hi" ? "11 अगस्त 2026" : "11 Aug 2026")}
                </span>
              </div>
              <div className="pt-1 space-y-1 text-xs">
                {vitalsData?.latest_vitals ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-text-muted">{tr("Blood Pressure:", "रक्तचाप:")}</span>
                      <strong className="text-navy-primary font-mono">
                        {Math.round(vitalsData.latest_vitals.systolic_bp || 138)} / {Math.round(vitalsData.latest_vitals.diastolic_bp || 88)} mmHg
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">{tr("Body Weight:", "शारीरिक वजन:")}</span>
                      <span className="font-mono">{Number(vitalsData.latest_vitals.weight_kg || 71.8).toFixed(1)} {tr("kg", "किग्रा")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">{tr("Blood Sugar:", "ब्लड शुगर:")}</span>
                      <span className="font-mono">{Math.round(vitalsData.latest_vitals.blood_sugar_mg_dl || 114)} mg/dL</span>
                    </div>
                  </>
                ) : (
                  <p className="text-text-muted text-[11px]">{tr("No camp vitals recorded yet.", "कोई कैंप माप दर्ज नहीं।")}</p>
                )}
                <div className="pt-2 border-t border-neutral-border">
                  <button
                    onClick={() => setPersonnelTab("dashboard")}
                    className="w-full text-center text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                  >
                    {tr("View Full Medical History & Trends →", "सम्पूर्ण मेडिकल इतिहास एवं रुझान देखें →")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* FAMILY & DOMESTIC SUPPORT PROFILE                                     */}
          {/* ===================================================================== */}
          <div className="gov-card p-5 bg-white border border-neutral-border shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-border gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-navy-primary/10 text-navy-primary flex items-center justify-center shrink-0">
                  <Home className="w-4 h-4 text-navy-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-navy-primary">
                    {tr("Family & Domestic Support Profile", "पारिवारिक एवं घरेलू सहायता प्रोफ़ाइल")}
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    {tr("Official service records for battalion family welfare assistance & emergency liaison", "बटालियन परिवार कल्याण सहायता एवं आपातकालीन संपर्क हेतु आधिकारिक रिकॉर्ड")}
                  </p>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setOnboardingOpen(true)}
                  className="px-3 py-1.5 rounded bg-white hover:bg-neutral-hover border border-neutral-border text-xs font-semibold text-navy-primary transition-colors flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                >
                  <span>{tr("Update Family Profile", "पारिवारिक विवरण अपडेट करें")}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
              <div className="p-3 rounded-lg bg-neutral-card/60 border border-neutral-border space-y-1">
                <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold block">
                  {tr("Marital Status", "वैवाहिक स्थिति")}
                </span>
                <strong className="text-navy-primary text-sm font-semibold block">
                  {profile?.married ? tr("Married", "विवाहित") : tr("Single / Unmarried", "अविवाहित")}
                </strong>
                <span className="text-[10px] text-text-muted block">
                  {tr("Recorded in unit service roll", "इकाई सेवा रिकॉर्ड में दर्ज")}
                </span>
              </div>

              {profile?.married ? (
                <div className="p-3 rounded-lg bg-neutral-card/60 border border-neutral-border space-y-1">
                  <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold block">
                    {tr("Household Setup Back Home", "गृह निवास व्यवस्था")}
                  </span>
                  <strong className="text-navy-primary text-sm font-semibold capitalize block">
                    {profile?.family_structure === "joint" ? tr("Joint Family", "संयुक्त परिवार") : tr("Nuclear Family", "एकल परिवार")}
                  </strong>
                  <span className="text-[10px] text-text-muted block">
                    {profile?.family_structure === "joint"
                      ? tr("Parents & family present at home", "माता-पिता एवं परिजन घर पर उपस्थित")
                      : tr("Spouse & children living independently", "पति/पत्नी एवं बच्चे स्वतंत्र रूप से निवासरत")}
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-neutral-card/60 border border-neutral-border space-y-1">
                  <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold block">
                    {tr("Next of Kin Support", "निकटतम परिजन सहायता")}
                  </span>
                  <strong className="text-navy-primary text-sm font-semibold block">
                    {tr("Parents / Family at Home", "माता-पिता / गृहस्थ परिवार")}
                  </strong>
                  <span className="text-[10px] text-text-muted block">
                    {tr("Registered service dependents", "पंजीकृत आश्रित")}
                  </span>
                </div>
              )}

              <div className="p-3 rounded-lg bg-neutral-card/60 border border-neutral-border space-y-1">
                <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold block">
                  {tr("Assigned Welfare Cell", "संबद्ध कल्याण प्रकोष्ठ")}
                </span>
                <strong className="text-navy-primary text-sm font-semibold block">
                  {tr("14th Bn Family Support Cell", "14वीं बटालियन परिवार सहायता प्रकोष्ठ")}
                </strong>
                <span className="text-[10px] text-text-muted block">
                  {tr("Direct welfare outreach unit", "प्रत्यक्ष कल्याण संपर्क इकाई")}
                </span>
              </div>
            </div>

            {!profile?.married && (
              <div className="mt-3.5 pt-3 border-t border-neutral-border/70 flex items-center justify-between text-[11px] text-text-muted">
                <span>{tr("Got married recently or need to register family changes? Click Update Family Profile anytime to keep your battalion records current.", "विवाह हुआ है या परिवार विवरण बदलना चाहते हैं? बटालियन रिकॉर्ड अद्यतन रखने हेतु कभी भी 'पारिवारिक विवरण अपडेट करें' पर क्लिक करें।")}</span>
              </div>
            )}
          </div>

          {/* Section 5: Vishram — Unmonitored Self-Care Downtime Resource */}
          <VishramSection />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DASHBOARD — MEDICAL CAMP VITALS, SAATHI & WELFARE NOTIFICATIONS    */}
      {/* ========================================================================= */}
      {personnelTab === "dashboard" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Section 1: Active Welfare Outreach & Invitations */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-navy-primary text-sm">
                {t("welfare_notice.title", "Welfare Cell Outreach & Active Notices")}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-navy-primary/10 text-navy-primary font-semibold">
                {t("welfare_notice.confidential", "Confidential Desk")}
              </span>
            </div>

            {/* Active Scheduled Informal Welfare Tea Card */}
            {invitation?.scheduled_tea ? (
              <div className="gov-card p-5 sm:p-6 border-l-4 border-amber-500 bg-gradient-to-r from-amber-50/90 via-white to-amber-50/30 shadow-sm animate-in fade-in duration-200">
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">
                          ☕ {language === "hi" ? "अनौपचारिक चाय संवाद निर्धारित" : "Informal Welfare Tea Scheduled"}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {language === "hi" ? "स्थिति: पुष्ट (Scheduled)" : "Status: Confirmed"}
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-800 font-medium italic flex items-center space-x-1">
                        <Lock className="w-3 h-3 text-emerald-600" />
                        <span>{language === "hi" ? "कमांड से अदृश्य • गोपनीय" : "Invisible to Command • 100% Confidential"}</span>
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-navy-primary mt-2">
                      {language === "hi" ? "कल्याण अधिकारी के साथ चाय पर चर्चा" : "Informal Welfare Check-In ('Chai Pe Charcha')"}
                    </h2>

                    <div className="my-3 p-3 rounded-lg bg-amber-100/70 border border-amber-300 text-xs flex flex-wrap items-center gap-4 text-amber-950 font-medium">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-amber-700" />
                        <span>{language === "hi" ? "निर्धारित समय:" : "Scheduled Time:"}</span>
                        <strong className="text-navy-primary font-mono text-sm">{invitation.scheduled_tea.scheduled_at}</strong>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-amber-700" />
                        <span>{language === "hi" ? "स्थान:" : "Venue:"}</span>
                        <strong className="text-navy-primary">{invitation.scheduled_tea.venue || "Unit Welfare Cell"}</strong>
                      </div>
                    </div>

                    <p className="text-xs text-navy-darker leading-relaxed">
                      {language === "hi"
                        ? "कल्याण प्रकोष्ठ ने आपके साथ एक अनौपचारिक, मैत्रीपूर्ण बातचीत तय की है। यह पूरी तरह गोपनीय है और इसका आपकी सेवा या पदोन्नति पर कोई असर नहीं पड़ता।"
                        : (invitation.scheduled_tea.message || "Your informal tea discussion with the Unit Welfare Officer has been scheduled. This is an off-the-record, friendly conversation regarding personal well-being and rest.")}
                    </p>

                    <p className="text-[11px] text-text-muted mt-2 italic flex items-center space-x-1">
                      <Phone className="w-3 h-3 text-amber-600" />
                      <span>{language === "hi" ? "कल्याण प्रकोष्ठ संपर्क:" : "Welfare Cell Desk:"} {invitation.scheduled_tea.welfare_cell_contact}</span>
                    </p>

                    <div className="mt-4 flex items-center space-x-3">
                      <div className="px-3.5 py-1.5 rounded bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-xs">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{language === "hi" ? "बैठक स्वीकार्य एवं पुष्ट" : "Appointment Confirmed"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : invitation?.pending_chat ? (
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-950 flex items-start space-x-3 shadow-xs">
                <div className="p-1.5 bg-blue-100 text-blue-800 rounded-full mt-0.5 shrink-0">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-navy-primary">
                    {language === "hi" ? "अनौपचारिक संवाद अनुरोध प्रक्रियाधीन" : "Informal Chat Request Under Scheduling"}
                  </div>
                  <p className="text-xs text-blue-900 mt-0.5">
                    {invitation.pending_chat.message}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Soft, Optional, Non-Alarming Invitation — ONLY shown if flagged AND not dismissed AND no tea scheduled */}
            {invitation?.has_invitation && !invitationDismissed && !invitation?.scheduled_tea ? (
              <div className="gov-card p-5 sm:p-6 border-l-4 border-gold bg-neutral-card/60 shadow-sm animate-in fade-in duration-200">
                <div className="flex items-start space-x-3.5">
                  <div className="icon-circle-sm mt-0.5 bg-navy-primary text-gold">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-sm font-bold text-navy-primary">
                      {t("welfare_notice.invitation_title", "Informal Welfare Check-In Invitation")}
                    </h2>
                    <p className="text-xs text-navy-darker mt-1 leading-relaxed">
                      {language === "hi"
                        ? "क्या आप कल्याण अधिकारी के साथ अनौपचारिक बातचीत करना चाहते हैं? यह पूरी तरह आपका निर्णय है — यदि आप नहीं चाहते तो कुछ भी दर्ज नहीं किया जाएगा।"
                        : (invitation.invitation_text || t("welfare_notice.invitation_desc"))}
                    </p>
                    <p className="text-[11px] text-text-muted mt-2 italic">
                      {language === "hi" ? "कल्याण अधिकारी (सहा. कमांडेंट डॉ. शर्मा) • विस्तार: 4102" : invitation.welfare_cell_contact}
                    </p>

                    <div className="mt-4 flex items-center space-x-3">
                      <button
                        onClick={handleAcceptInvitation}
                        className="px-3.5 py-1.5 rounded bg-navy-primary hover:bg-navy-light text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {t("welfare_notice.accept", "Yes, set up an informal chat")}
                      </button>
                      <button
                        onClick={handleDeclineInvitation}
                        className="px-3.5 py-1.5 rounded bg-white hover:bg-neutral-hover text-text-muted hover:text-text-primary text-xs font-medium border border-neutral-border transition-colors cursor-pointer"
                      >
                        {t("welfare_notice.decline", "No thanks (Zero record created)")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Welfare Officer Nudge / Reminder Banner */}
            {saathiContext?.pending_nudge && !nudgeDismissed ? (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200 shadow-xs">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-full mt-0.5 shrink-0">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold  text-amber-950">
                        {language === "hi" ? "कल्याण प्रकोष्ठ सूचना" : "Welfare Cell Notice"}
                      </span>
                      <span className="text-[10px] text-amber-800 bg-amber-200/60 px-1.5 py-0.5 rounded font-mono">
                        {saathiContext.pending_nudge.sent_at}
                      </span>
                    </div>
                    <p className="text-amber-900 mt-1 leading-relaxed">
                      {saathiContext.pending_nudge.message}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => {
                      handleDismissNudge();
                      handleStartSaathi();
                    }}
                    className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs shadow-xs cursor-pointer"
                  >
                    {language === "hi" ? "साथी संवाद खोलें" : "Open Saathi Check-in"}
                  </button>
                  <button
                    onClick={handleDismissNudge}
                    className="px-2.5 py-1.5 rounded bg-white/80 hover:bg-white text-amber-900 font-medium text-xs border border-amber-300 cursor-pointer"
                  >
                    {language === "hi" ? "बंद करें" : "Dismiss"}
                  </button>
                </div>
              </div>
            ) : null}

            {(!invitation?.has_invitation || invitationDismissed) && (!saathiContext?.pending_nudge || nudgeDismissed) && (
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {language === "hi"
                      ? "कोई लंबित कल्याण सूचना नहीं। आपका व्यक्तिगत कल्याण रिकॉर्ड सामान्य एवं स्थिर है।"
                      : "No pending welfare notices. Your personal well-being record is normal and steady."}
                  </span>
                </div>
                <button
                  onClick={() => setTalkModalOpen(true)}
                  className="text-emerald-800 font-semibold underline text-[11px] hover:text-emerald-950 cursor-pointer"
                >
                  {language === "hi" ? "कल्याण प्रकोष्ठ से कभी भी संपर्क करें →" : "Reach Welfare Cell Anytime →"}
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Monthly Medical Camp Vitals (Raw Readings Only) */}
          <div className="gov-card p-6 border-t-4 border-emerald-600 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-navy-primary">
                      {t("vitals.title", "Monthly Medical Camp Vitals")}
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                      {t("vitals.badge", "Raw Health Record")}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {t("vitals.desc", "Logged during mandatory monthly battalion medical camps • Raw diagnostic readings only")}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] text-text-muted block">
                  {t("vitals.latest", "Latest Camp Recorded")}
                </span>
                <span className="text-xs font-bold text-navy-primary">
                  {vitalsData?.latest_camp_date || (language === "hi" ? "11 अगस्त 2026" : "11 Aug 2026")}
                </span>
              </div>
            </div>

            {/* Latest Raw Readings Summary Cards */}
            {vitalsData?.latest_vitals ? (
              <div className="mt-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Blood Pressure */}
                  <div className="p-4 bg-white rounded-lg border border-neutral-border shadow-xs">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span className="font-semibold text-text-primary">
                        {t("vitals.bp", "Blood Pressure")}
                      </span>
                      <Activity className="w-3.5 h-3.5 text-text-muted" />
                    </div>
                    <div className="text-2xl font-bold text-navy-primary font-mono mt-1">
                      {Math.round(vitalsData.latest_vitals.systolic_bp || 138)} / {Math.round(vitalsData.latest_vitals.diastolic_bp || 88)}
                      <span className="text-xs font-sans font-normal text-text-muted ml-1.5">mmHg</span>
                    </div>
                    <span className="text-[11px] text-text-muted mt-1 block">
                      {t("vitals.bp_sub", "Systolic / Diastolic examination")}
                    </span>
                  </div>

                  {/* Body Weight */}
                  <div className="p-4 bg-white rounded-lg border border-neutral-border shadow-xs">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span className="font-semibold text-text-primary">
                        {t("vitals.weight", "Body Weight")}
                      </span>
                      <Scale className="w-3.5 h-3.5 text-text-muted" />
                    </div>
                    <div className="text-2xl font-bold text-navy-primary font-mono mt-1">
                      {Number(vitalsData.latest_vitals.weight_kg || 71.8).toFixed(1)}
                      <span className="text-xs font-sans font-normal text-text-muted ml-1.5">{language === "hi" ? "किग्रा" : "kg"}</span>
                    </div>
                    <span className="text-[11px] text-text-muted mt-1 block">
                      {t("vitals.weight_sub", "Camp scale measurement")}
                    </span>
                  </div>

                  {/* Blood Sugar */}
                  <div className="p-4 bg-white rounded-lg border border-neutral-border shadow-xs">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span className="font-semibold text-text-primary">
                        {t("vitals.sugar", "Blood Sugar")}
                      </span>
                      <Heart className="w-3.5 h-3.5 text-text-muted" />
                    </div>
                    <div className="text-2xl font-bold text-navy-primary font-mono mt-1">
                      {Math.round(vitalsData.latest_vitals.blood_sugar_mg_dl || 114)}
                      <span className="text-xs font-sans font-normal text-text-muted ml-1.5">mg/dL</span>
                    </div>
                    <span className="text-[11px] text-text-muted mt-1 block">
                      {t("vitals.sugar_sub", "Blood glucose reading")}
                    </span>
                  </div>
                </div>

                {/* Historical Vitals Trend Line / Points */}
                <div className="p-4 bg-neutral-card/50 rounded-lg border border-neutral-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-navy-primary flex items-center space-x-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                      <span>
                        {language === "hi"
                          ? `विगत कैंप स्वास्थ्य माप रुझान (${vitalsData.vitals_trend.length} विगत कैंप)`
                          : `Historical Camp Readings Trend (${vitalsData.vitals_trend.length} Past Camps)`}
                      </span>
                    </span>
                    <span className="text-[10px] text-text-muted font-sans">
                      {t("vitals.history_sub", "Raw numerical trajectory over trailing camps")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {vitalsData.vitals_trend.map((reading, idx) => (
                      <div key={reading.id} className="p-3 bg-white rounded border border-neutral-border/80 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-navy-primary">
                            {language === "hi" ? "कैंप" : "Camp"} #{idx + 1}
                          </span>
                          <span className="text-[10px] text-text-muted font-mono">{reading.camp_date}</span>
                        </div>
                        <div className="text-[11px] text-text-primary pt-1 border-t border-neutral-border/40 font-mono space-y-0.5">
                          <div className="flex justify-between">
                            <span className="text-text-muted font-sans">{language === "hi" ? "बीपी:" : "BP:"}</span>
                            <strong className="text-navy-primary">{Math.round(reading.systolic_bp)}/{Math.round(reading.diastolic_bp)} mmHg</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted font-sans">{language === "hi" ? "वजन:" : "Weight:"}</span>
                            <span>{reading.weight_kg.toFixed(1)} {language === "hi" ? "किग्रा" : "kg"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted font-sans">{language === "hi" ? "शुगर:" : "Sugar:"}</span>
                            <span>{Math.round(reading.blood_sugar_mg_dl)} mg/dL</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {vitalsData.latest_vitals.notes && (
                    <div className="pt-2 text-[11px] text-text-muted italic border-t border-neutral-border/60">
                      {tr("Doctor Note:", "चिकित्सक टिप्पणी:")} &quot;{vitalsData.latest_vitals.notes}&quot;
                    </div>
                  )}
                </div>

                <div className="p-2.5 bg-neutral-card/60 rounded border border-neutral-border text-[11px] text-text-muted flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    <strong>{tr("Medical Privacy Compliance:", "चिकित्सा गोपनीयता अनुपालन:")}</strong> {tr("In accordance with CAPF Medical Directives, raw numbers are provided directly to the personnel. Clinical interpretations remain exclusively with the Medical Officer.", "सीएपीएफ चिकित्सा दिशानिर्देशों के अनुसार, मूल आंकड़े सीधे कार्मिक को उपलब्ध कराए जाते हैं। नैदानिक व्याख्या केवल चिकित्सा अधिकारी के अधिकार क्षेत्र में रहती है।")}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-6 text-center text-xs text-text-muted">
                {tr("No medical camp records logged yet for this service ID.", "इस सेवा आईडी हेतु अभी तक कोई मेडिकल कैंप रिकॉर्ड दर्ज नहीं है।")}
              </div>
            )}
          </div>

          {/* Section 3: Saathi Personal Companion Flow */}
          <div className="gov-card p-6 border-l-4 border-navy-primary shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gold/15 text-navy-primary flex items-center justify-center shrink-0">
                  <Compass className="w-5 h-5 text-gold-dark" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-navy-primary">
                      {language === "hi" ? "साथी व्यक्तिगत कल्याण संबल" : "Saathi Personal Well-Being Companion"}
                    </h3>
                    <span className="badge-khaki text-[10px]">
                      {tr("Private App Space", "गोपनीय स्पेस")}
                    </span>
                    {saathiContext?.weekly_cycle?.completed_this_week ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center">
                        <CheckCircle className="w-3 h-3 text-emerald-600 mr-1" />
                        {tr("Completed for this week", "इस सप्ताह हेतु पूर्ण")}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center">
                        <Calendar className="w-3 h-3 text-amber-600 mr-1" />
                        {tr("Weekly Check-in Open (Due Sun, ", "साप्ताहिक चेक-इन उपलब्ध (अंतिम तिथि: रवि, ")}
                        {saathiContext?.weekly_cycle?.current_week_sunday})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {tr("Tailored for:", "विशेष रूप से अनुकूलित:")} <strong className="text-navy-primary">{tSaathi(saathiContext?.duty_context_title || "Operational LWE Patrol Roster", language)}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                {/* Dedicated Saathi Bilingual Switcher for form filling */}
                <div className="inline-flex items-center rounded border border-navy-primary/30 bg-white p-0.5 text-xs font-semibold shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                      language === "en"
                        ? "bg-navy-primary text-white shadow-2xs"
                        : "text-text-muted hover:text-navy-primary"
                    }`}
                    title="Switch Saathi form to English"
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("hi")}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                      language === "hi"
                        ? "bg-navy-primary text-white shadow-2xs"
                        : "text-text-muted hover:text-navy-primary"
                    }`}
                    title="साथी फॉर्म को हिन्दी में बदलें"
                  >
                    हिन्दी
                  </button>
                </div>

                <button
                  onClick={() => setHistoryOpen(true)}
                  className="px-3 py-1.5 rounded bg-white hover:bg-neutral-hover border border-neutral-border text-xs font-semibold text-text-muted flex items-center space-x-1.5 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>{tr("Past Check-ins", "पूर्व चेक-इन")}</span>
                </button>
                {!saathiActive && (
                  saathiContext?.weekly_cycle?.completed_this_week ? (
                    <div
                      title={tr("Saathi check-ins are restricted to once per week. Personnel cannot submit next week's check-in in this current week.", "साथी चेक-इन सप्ताह में केवल एक बार निर्धारित है।")}
                      className="px-3 py-1.5 rounded bg-slate-100 border border-slate-300 text-slate-600 text-xs font-semibold flex items-center space-x-1.5 shadow-2xs cursor-not-allowed select-none"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{tr("Next Check-in: Sun, ", "अगला चेक-इन: रवि, ")}{saathiContext.weekly_cycle.next_week_sunday}</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleStartSaathi}
                      className="px-4 py-1.5 rounded bg-navy-primary hover:bg-navy-light text-white text-xs font-semibold flex items-center space-x-1.5 shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-gold" />
                      <span>{tr("Start Weekly Check-In →", "साप्ताहिक चेक-इन शुरू करें →")}</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Weekly Status Banner */}
            {!saathiActive && (
              saathiContext?.weekly_cycle?.completed_this_week ? (
                <div className="p-4 bg-emerald-50/70 rounded-lg border border-emerald-200 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-950">
                          {tr("Weekly Check-in Recorded for Current Cycle (1/1 completed)", "वर्तमान चक्र हेतु साप्ताहिक चेक-इन दर्ज (1/1 पूर्ण)")}
                        </div>
                        <div className="text-[11px] text-emerald-800">
                          {tr("Completed on", "पूर्ण किया गया:")} <strong>{saathiContext.weekly_cycle.this_week_completed_at || saathiContext.last_checkin?.completed_at || tr("Earlier this week", "इस सप्ताह पूर्व")}</strong>. {tr("Current cycle cutoff: Sunday,", "वर्तमान चक्र की अंतिम तिथि: रविवार,")} {saathiContext.weekly_cycle.current_week_sunday}.
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="inline-block px-2.5 py-1 rounded bg-white border border-emerald-200 text-emerald-900 text-[11px] font-semibold shadow-2xs">
                        {tr("Next Check-in opens:", "अगला चेक-इन खुलेगा:")} <strong>{saathiContext.weekly_cycle.next_week_start}</strong> ({tr("Due Sun, ", "अंतिम तिथि रवि, ")}{saathiContext.weekly_cycle.next_week_sunday})
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-emerald-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-emerald-900">
                    <p>
                      <strong>{tr("Policy Rule:", "नीति नियम:")}</strong> {tr("Saathi check-ins are scheduled strictly once per week. Personnel cannot submit next week's check-in ahead of time.", "साथी चेक-इन सप्ताह में केवल एक बार निर्धारित है। कार्मिक अगले सप्ताह का चेक-इन पहले से जमा नहीं कर सकते हैं।")}
                    </p>
                    <button
                      onClick={handleResetWeeklyDemo}
                      className="text-[10px] text-emerald-700 hover:text-emerald-900 underline whitespace-nowrap cursor-pointer shrink-0"
                      title="Testing shortcut: clear current week submission to test active check-in flow"
                    >
                      {tr("[Reset check-in (demo mode)]", "[चेक-इन रीसेट करें (डेमो मोड)]")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50/70 rounded-lg border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-amber-950">
                      <strong>{tr("Weekly Check-in Due:", "साप्ताहिक चेक-इन देय:")}</strong> {tr("Please complete your reflection before Sunday,", "कृपया रविवार से पहले अपने विचार साझा करें,")} <strong>{saathiContext?.weekly_cycle?.current_week_sunday}</strong> {tr("(Takes 2–3 minutes • Strictly private).", "(2–3 मिनट का समय • पूर्णतः गोपनीय)।")}
                    </div>
                  </div>
                  <button
                    onClick={handleStartSaathi}
                    className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs whitespace-nowrap cursor-pointer transition-colors"
                  >
                    {tr("Start Check-in →", "चेक-इन शुरू करें →")}
                  </button>
                </div>
              )
            )}

            {/* Interactive Saathi Step Flow */}
            {saathiActive && (
              <div className="p-4 sm:p-5 rounded-lg bg-neutral-card/30 border border-neutral-border space-y-4">
                {/* 1. SAFETY NET VIEW (CROSS-CUTTING EMERGENCY / TRAUMA OVERRIDE) */}
                {safetyNetActive && (
                  <div className="p-6 rounded-lg bg-rose-50/95 border-2 border-rose-300 space-y-5 animate-in zoom-in-95 duration-200">
                    <div className="flex items-start space-x-3.5">
                      <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <HeartHandshake className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="px-2.5 py-0.5 rounded bg-rose-100 text-rose-900 font-bold text-[10px] uppercase tracking-wider border border-rose-200 inline-block">
                          {tr("Confidential Welfare Safety Net", "गोपनीय कल्याण सुरक्षा संबल")}
                        </span>
                        <h3 className="text-base font-bold text-rose-950 mt-1">
                          {tSaathi(safetyNetMessage, language) || tr("It sounds like things are genuinely hard right now. You don't have to carry this alone.", "लगता है कि इस समय परिस्थितियां वाकई कठिन हैं। आपको इसका बोझ अकेले उठाने की आवश्यकता नहीं है।")}
                        </h3>
                        <p className="text-xs text-rose-900 mt-1 leading-relaxed">
                          {tr(
                            "You have reached a high-strain touchpoint. The resources below are immediately available, 100% confidential, and completely separate from duty evaluations.",
                            "आप अत्यधिक तनाव के बिंदु पर हैं। नीचे दिए गए संसाधन तुरंत उपलब्ध हैं, 100% गोपनीय हैं और ड्यूटी मूल्यांकन से पूर्णतः अलग हैं।"
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* Option A: Tele-MANAS 24/7 National Mental Health Helpline */}
                      <div className="p-4 bg-white rounded-lg border border-rose-200 shadow-xs space-y-3 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center space-x-2 text-rose-900 font-bold text-xs">
                            <Phone className="w-4 h-4 text-rose-600" />
                            <span>{tr("Tele-MANAS National Helpline", "टेली-मानस राष्ट्रीय हेल्पलाइन")}</span>
                          </div>
                          <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                            {tr(
                              "Government of India’s 24/7 toll-free mental health support helpline. Experienced counselors, multi-lingual, and completely confidential.",
                              "भारत सरकार की 24/7 टोल-फ्री मानसिक स्वास्थ्य सहायता हेल्पलाइन। अनुभवी परामर्शदाता, बहुभाषी और पूर्णतः गोपनीय।"
                            )}
                          </p>
                        </div>
                        <div className="pt-2">
                          <a
                            href="tel:14416"
                            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>{tr("Call 14416 (Toll-Free 24/7)", "14416 पर कॉल करें (टोल-फ्री 24/7)")}</span>
                          </a>
                        </div>
                      </div>

                      {/* Option B: Connect with Welfare Officer Now */}
                      <div className="p-4 bg-white rounded-lg border border-rose-200 shadow-xs space-y-3 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center space-x-2 text-navy-primary font-bold text-xs">
                            <Coffee className="w-4 h-4 text-amber-700" />
                            <span>{tr("Connect with Welfare Officer Now", "कल्याण अधिकारी से अभी संपर्क करें")}</span>
                          </div>
                          <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                            {tr(
                              "Same confidential \"Talk to someone\" door. Arranges an informal cup of tea without any paperwork, forms, or command visibility.",
                              "वही गोपनीय \"बातचीत करें\" सुविधा। बिना किसी कागजी कार्रवाई, फॉर्म या उच्चाधिकारियों को सूचित किए अनौपचारिक संवाद।"
                            )}
                          </p>
                        </div>
                        <div className="pt-2">
                          <button
                            onClick={async () => {
                              await handleStandingTalkSubmit();
                              resetSaathi();
                            }}
                            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded bg-navy-primary hover:bg-navy-light text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            <HeartHandshake className="w-3.5 h-3.5 text-gold" />
                            <span>{tr("Request Informal Tea Chat", "अनौपचारिक संवाद का अनुरोध करें")}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={resetSaathi}
                        className="text-xs text-rose-900 hover:text-rose-950 underline font-medium cursor-pointer"
                      >
                        {tr("Close Safety Net & Return", "सुरक्षा संबल बंद करें एवं वापस लौटें")}
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. OPT-OUT EXIT VIEW (NEUTRAL "RATHER NOT SAY") */}
                {!safetyNetActive && optOutExitMessage && (
                  <div className="p-6 rounded-lg bg-white border border-neutral-border text-center space-y-3 animate-in fade-in duration-200">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mx-auto shadow-2xs">
                      <ShieldCheck className="w-5 h-5 text-slate-700" />
                    </div>
                    <h3 className="text-sm font-bold text-navy-primary">
                      {tSaathi(optOutExitMessage, language)}
                    </h3>
                    <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
                      {tr(
                        "Your check-in has concluded respectfully. In accordance with CAPF welfare ethics, opting out carries zero disciplinary inference and is logged neutrally. Next check-in cycle opens on ",
                        "आपका चेक-इन सम्मानपूर्वक समाप्त हो गया है। सीएपीएफ कल्याण नियमों के अनुसार, चेक-इन छोड़ने पर कोई अनुशासनात्मक प्रभाव नहीं पड़ता और इसे तटस्थ माना जाता है। अगला चक्र खुलेगा: "
                      )}
                      {saathiContext?.weekly_cycle?.next_week_start || tr("next week", "अगले सप्ताह")} ({tr("due before Sunday, ", "रविवार से पहले देय, ")}<strong>{saathiContext?.weekly_cycle?.next_week_sunday || tr("next Sunday", "अगले रविवार")}</strong>).
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={resetSaathi}
                        className="px-4 py-1.5 rounded bg-navy-primary text-white text-xs font-semibold shadow-xs cursor-pointer"
                      >
                        {tr("Close", "बंद करें")}
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. ACTIVE QUESTION VIEW (ADAPTIVE QUESTION TREE) */}
                {!safetyNetActive && !optOutExitMessage && currentQuestion && !saathiCompleted && !currentQuestion.is_closing && currentStep < 10 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs text-text-muted pb-2 border-b border-neutral-border gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-navy-primary">
                          {tr("Question", "प्रश्न")} {currentStep}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          &bull; {tSaathi(currentQuestion.title, language)}
                        </span>
                        <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-navy-primary/5 text-navy-primary border border-navy-primary/10">
                          {tr("Ceiling of 10 • Not a quiz", "अधिकतम 10 • कोई परीक्षा नहीं")}
                        </span>
                        {activeDomain && (
                          <span className="capitalize text-[10px] px-2 py-0.5 rounded-full bg-gold/15 text-navy-primary font-semibold border border-gold/30">
                            {tSaathi(activeDomain, language)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {/* Quick Language Toggle while answering form */}
                        <div className="inline-flex items-center rounded border border-navy-light/40 bg-white p-0.5 text-xs font-semibold shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setLanguage("en")}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              language === "en" ? "bg-navy-primary text-white shadow-2xs" : "text-text-muted hover:text-navy-primary"
                            }`}
                          >
                            English
                          </button>
                          <button
                            type="button"
                            onClick={() => setLanguage("hi")}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              language === "hi" ? "bg-navy-primary text-white shadow-2xs" : "text-text-muted hover:text-navy-primary"
                            }`}
                          >
                            हिन्दी
                          </button>
                        </div>

                        <button onClick={resetSaathi} className="text-text-muted hover:text-text-primary text-[11px] underline cursor-pointer">
                          {tr("Exit Session", "सत्र से बाहर निकलें")}
                        </button>
                      </div>
                    </div>

                    <p className="text-sm font-bold text-navy-primary leading-snug">
                      {tSaathi(currentQuestion.prompt, language)}
                    </p>

                    {/* If question is free-text only (e.g. "Something else" sandbox) */}
                    {currentQuestion.is_free_text_only ? (
                      <div className="space-y-3 pt-1">
                        <p className="text-xs text-text-muted italic">
                          {tr(
                            "This stays private. Only you can choose to share it — nobody else sees this by default.",
                            "यह पूर्णतः गोपनीय रहता है। केवल आप इसे साझा करने का निर्णय ले सकते हैं — स्वतः कोई भी इसे नहीं देख सकता।"
                          )}
                        </p>
                        <textarea
                          rows={4}
                          value={freeTextAnswer}
                          onChange={(e) => setFreeTextAnswer(e.target.value)}
                          placeholder={tr("Write whatever is on your mind...", "मन में जो भी विचार हों, यहाँ लिखें...")}
                          className="w-full text-xs p-3 rounded-lg border border-neutral-border bg-white focus:border-navy-primary focus:ring-1 focus:ring-navy-primary outline-none"
                        />
                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={resetSaathi}
                            className="text-xs text-text-muted hover:text-text-primary cursor-pointer"
                          >
                            {tr("Cancel", "रद्द करें")}
                          </button>
                          <button
                            onClick={() => handleSelectOption({ key: "saved_note", label: "Private Note Saved" })}
                            className="px-4 py-2 rounded bg-navy-primary hover:bg-navy-light text-white font-semibold text-xs shadow-xs cursor-pointer"
                          >
                            {tr("Save Private Reflection & Complete", "निजी विचार सहेजें एवं पूर्ण करें")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Standard Multi-Option List */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {currentQuestion.options.map((option) => {
                          const isOptOut = option.is_opt_out;
                          return (
                            <button
                              key={option.key}
                              onClick={() => handleSelectOption(option)}
                              className={`p-3.5 rounded-lg text-left transition-all group flex flex-col justify-between shadow-2xs hover:shadow-xs cursor-pointer ${
                                isOptOut
                                  ? "bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700"
                                  : "bg-white hover:bg-neutral-hover border border-neutral-border hover:border-gold"
                              }`}
                            >
                              <div>
                                <div className={`font-semibold text-xs ${
                                  isOptOut
                                    ? "text-slate-800"
                                    : "text-navy-primary group-hover:text-gold transition-colors"
                                }`}>
                                  {tSaathi(option.label, language)}
                                </div>
                                {option.sub && (
                                  <div className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                                    {tSaathi(option.sub, language)}
                                  </div>
                                )}
                              </div>
                              <div className="mt-2.5 flex items-center justify-end text-[10px] font-semibold text-text-muted group-hover:text-navy-primary">
                                <span>{isOptOut ? tr("Skip question", "प्रश्न छोड़ें") : tr("Select", "चुनें")}</span>
                                <ChevronRight className="w-3 h-3 ml-1" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. CLOSING STEP (Q10 OR FINAL REFLECTION & NOTES) */}
                {!safetyNetActive && !optOutExitMessage && !saathiCompleted && (currentStep >= 10 || currentQuestion?.is_closing) && (
                  <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                    <div className="p-4 rounded-lg bg-white border border-neutral-border space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-navy-primary">
                        <Lock className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{tr("Closing Reflection & Private Notes (Optional)", "समापन विचार एवं निजी नोट्स (वैकल्पिक)")}</span>
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed">
                        {tr(
                          "Anything else you'd want to note, or shall we leave it here for now? By default, your personal notes stay strictly in your device sandbox and are never transmitted to command.",
                          "क्या कुछ और नोट करना चाहते हैं, या अभी के लिए यहीं समाप्त करें? आपके व्यक्तिगत नोट केवल आपके डिवाइस में सुरक्षित रहते हैं और कभी भी उच्चाधिकारियों को नहीं भेजे जाते।"
                        )}
                      </p>
                      <textarea
                        rows={3}
                        placeholder={tr(
                          "Additional reflections on your duty stretch, sleep thoughts, or personal reminders...",
                          "ड्यूटी के तनाव, नींद के विचारों या व्यक्तिगत स्मरण हेतु अतिरिक्त विचार..."
                        )}
                        value={privateNotes}
                        onChange={(e) => setPrivateNotes(e.target.value)}
                        className="w-full text-xs p-3 rounded-lg border border-neutral-border bg-neutral-card/30 focus:border-navy-primary outline-none"
                      />

                      <div className="pt-2 border-t border-neutral-border flex items-center justify-between">
                        <label className="flex items-center space-x-2.5 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={requestedWelfareOutreach}
                            onChange={(e) => setRequestedWelfareOutreach(e.target.checked)}
                            className="rounded border-neutral-border text-navy-primary focus:ring-0 w-4 h-4"
                          />
                          <span className="text-navy-darker font-medium">
                            {tr(
                              "Share a quiet flag with Unit Welfare Cell to arrange an informal chat",
                              "अनौपचारिक बातचीत हेतु यूनिट कल्याण प्रकोष्ठ को गोपनीय सूचना साझा करें"
                            )}
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={resetSaathi}
                        className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary flex items-center space-x-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{tr("Cancel & Reset", "रद्द करें एवं रीसेट करें")}</span>
                      </button>

                      <button
                        onClick={handleCompleteSaathi}
                        disabled={submittingSaathi}
                        className="px-5 py-2.5 rounded bg-navy-primary hover:bg-navy-light text-white text-xs font-semibold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                      >
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>{submittingSaathi ? tr("Saving Check-in...", "चेक-इन सहेजा जा रहा है...") : tr("Complete Check-in", "चेक-इन पूर्ण करें")}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. DYNAMIC SUPPORTIVE ACKNOWLEDGMENT VIEW */}
                {!safetyNetActive && !optOutExitMessage && saathiCompleted && (
                  <div className="p-6 rounded-lg bg-white border border-neutral-border shadow-xs space-y-5 animate-in zoom-in-95 duration-200">
                    <div className="flex items-start space-x-3.5">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        lastEvaluation?.strain_tier === "Optimal"
                          ? "bg-emerald-100 text-emerald-700"
                          : lastEvaluation?.strain_tier === "Mild Strain"
                          ? "bg-sky-100 text-sky-700"
                          : lastEvaluation?.strain_tier === "Elevated Strain"
                          ? "bg-amber-100 text-amber-800"
                          : lastEvaluation?.strain_tier === "Safety Net Supported"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {lastEvaluation?.strain_tier === "Elevated Strain" || lastEvaluation?.selected_option === "Tough" ? (
                          <HeartHandshake className="w-5 h-5" />
                        ) : (
                          <CheckCircle className="w-5 h-5" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-navy-primary">
                            {lastEvaluation?.selected_option === "Good"
                              ? tr("Steady rhythm recorded. Coping capacity well supported.", "संतुलित दिनचर्या दर्ज। कर्तव्य संतुलन उत्तम।")
                              : lastEvaluation?.selected_option === "Okay"
                              ? tr("Weekly reflection noted. Managing operational routine.", "साप्ताहिक विचार दर्ज। परिचालन दिनचर्या व्यवस्थित।")
                              : lastEvaluation?.selected_option === "Tough"
                              ? tr("Duty strain acknowledged. You are not carrying this alone.", "कर्तव्य तनाव संज्ञान में। आप अकेले इसका सामना नहीं कर रहे।")
                              : tr("Thanks for taking a moment today.", "आज थोड़ा समय निकालने के लिए धन्यवाद।")}
                          </h3>
                          {lastEvaluation?.strain_tier && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              lastEvaluation.strain_tier === "Optimal"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : lastEvaluation.strain_tier === "Mild Strain"
                                ? "bg-sky-50 text-sky-700 border border-sky-200"
                                : lastEvaluation.strain_tier === "Elevated Strain"
                                ? "bg-amber-50 text-amber-800 border border-amber-300"
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              {lastEvaluation.strain_tier}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-text-muted leading-relaxed">
                          {lastEvaluation?.verification_summary ||
                            tr(
                              "Your weekly check-in has been saved confidentially (1/1 completed for this cycle). Saathi is always here whenever you want to pause, reflect, or share what is on your mind.",
                              "आपका साप्ताहिक चेक-इन गोपनीय रूप से सहेज लिया गया है (इस चक्र हेतु 1/1 पूर्ण)।"
                            )}
                        </p>

                        {/* Recommendations from Saathi Engine */}
                        {lastEvaluation?.recommendations && lastEvaluation.recommendations.length > 0 && (
                          <div className="mt-3 p-3 rounded-lg bg-neutral-card/50 border border-neutral-border space-y-1.5">
                            <span className="text-[11px] font-bold text-navy-primary block">
                              {tr("Supportive Reflections & Suggestions:", "सुझाव एवं विचार:")}
                            </span>
                            <ul className="text-xs text-text-muted space-y-1">
                              {lastEvaluation.recommendations.map((rec: string, idx: number) => (
                                <li key={idx} className="flex items-start space-x-2">
                                  <span className="text-navy-primary font-bold">•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="mt-2.5 p-2.5 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>
                            {tr("Next check-in cycle opens on ", "अगला चेक-इन चक्र खुलेगा: ")}
                            <strong>{saathiContext?.weekly_cycle?.next_week_start || tr("next week", "अगले सप्ताह")}</strong>
                            {" "}({tr("Due before Sunday, ", "रविवार से पहले देय: ")}<strong>{saathiContext?.weekly_cycle?.next_week_sunday || tr("next Sunday", "अगले रविवार")}</strong>).
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Standing "Talk to someone" option (Same as elsewhere in the app) */}
                    <div className="p-4 rounded-lg bg-neutral-card/60 border border-neutral-border space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-bold text-navy-primary">
                          <HeartHandshake className="w-4 h-4 text-amber-700" />
                          <span>{tr("Need to talk with someone?", "किसी से बात करने की आवश्यकता है?")}</span>
                        </div>
                        <span className="text-[10px] text-text-muted font-medium">
                          {tr("Standing • 100% Confidential", "स्थायी सुविधा • 100% गोपनीय")}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed">
                        {tr(
                          "You can reach out anytime — completely independent of duty records, performance evaluations, or administrative scrutiny.",
                          "आप कभी भी संपर्क कर सकते हैं — ड्यूटी रिकॉर्ड, प्रदर्शन मूल्यांकन या प्रशासनिक निगरानी से पूरी तरह स्वतंत्र।"
                        )}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setTalkModalOpen(true);
                          }}
                          className="p-3 bg-white rounded-lg border border-neutral-border hover:border-navy-primary text-left transition-all group flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-navy-primary/10 text-navy-primary flex items-center justify-center shrink-0">
                              <Coffee className="w-4 h-4 text-amber-700" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-navy-primary group-hover:text-navy-light">
                                {tr("Connect with Welfare Officer", "कल्याण अधिकारी से संपर्क करें")}
                              </div>
                              <div className="text-[10px] text-text-muted">
                                {tr("Informal cup of tea • Zero paperwork", "अनौपचारिक चाय • शून्य कागजी कार्रवाई")}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-navy-primary" />
                        </button>

                        <div className="p-3 bg-white rounded-lg border border-neutral-border flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                              <Phone className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800">
                                {tr("Tele-MANAS Helpline", "टेली-मानस हेल्पलाइन")}
                              </div>
                              <div className="text-[10px] text-text-muted">
                                {tr("Toll-free 24/7 mental health support", "टोल-फ्री 24/7 मानसिक स्वास्थ्य सहायता")}
                              </div>
                            </div>
                          </div>
                          <a
                            href="tel:14416"
                            className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 transition-colors"
                          >
                            14416
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-1">
                      <button
                        onClick={resetSaathi}
                        className="px-5 py-2 rounded bg-navy-primary hover:bg-navy-light text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        {tr("Done", "पूर्ण")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SAATHI PEER GUARD (BUDDY WATCH / साथी सुरक्षा प्रणाली)             */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* TAB 3: SAATHI PEER GUARD & BUDDY DROP BOX                                */}
      {/* ========================================================================= */}
      {personnelTab === "peer-guard" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="gov-card p-5 sm:p-6 bg-gradient-to-br from-white via-slate-50/60 to-amber-50/40 border-l-4 border-l-amber-600 border border-neutral-border shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-border gap-3">
              <div className="flex items-start sm:items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 shadow-xs">
                  <Users className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-navy-primary">
                      {tr("Saathi Peer Guard (Buddy Drop Box)", "साथी पियर गार्ड (बडी ड्रॉप बॉक्स)")}
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 flex items-center space-x-1">
                      <EyeOff className="w-3 h-3" />
                      <span>{tr("100% Anonymous", "100% गोपनीय")}</span>
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {tr(
                      "CAPF 2-Person Buddy Pair Drop Box • Quietly alert the Welfare Cell if your brother-in-arms is silently suffering.",
                      "सीएपीएफ 2-सदस्यीय बडी ड्रॉप बॉक्स • यदि आपका साथी मानसिक तनाव में है, तो कल्याण प्रकोष्ठ को गोपनीय रूप से सूचित करें।"
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-start sm:self-auto">
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-navy-primary/10 text-navy-primary font-semibold flex items-center space-x-1">
                  <Coffee className="w-3 h-3 text-amber-700" />
                  <span>{tr("Triggers Off-Record Tea Protocol", "अनौपचारिक संवाद प्रोटोकॉल सक्रिय करता है")}</span>
                </span>
              </div>
            </div>

            {/* Star Buddy Success Banner */}
            {starBuddySuccessMsg && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 flex items-start justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-start space-x-2.5">
                  <Star className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 fill-amber-500" />
                  <div>
                    <strong className="font-bold block">{tr("Star Buddy Updated (7-Day Lock Active)", "स्टार बडी अद्यतन (7-दिवसीय लॉक सक्रिय)")}</strong>
                    <p className="mt-0.5 leading-relaxed text-amber-900">{starBuddySuccessMsg}</p>
                  </div>
                </div>
                <button
                  onClick={() => setStarBuddySuccessMsg(null)}
                  className="text-amber-800 hover:text-amber-950 font-bold ml-2 text-xs"
                >
                  {tr("Dismiss", "बंद करें")}
                </button>
              </div>
            )}

            {/* Peer Note Success Banner */}
            {peerNoteSuccessMsg && (
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950 flex items-start justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-start space-x-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">{tr("Observation Received Confidentially", "गोपनीय अवलोकन प्राप्त हुआ")}</strong>
                    <p className="mt-0.5 leading-relaxed text-emerald-900">{peerNoteSuccessMsg}</p>
                    <p className="text-[11px] text-emerald-800 mt-1 italic">
                      {tr("The Welfare Officer will arrange an informal cup of tea without disclosing that you left a note.", "कल्याण अधिकारी बिना यह बताए कि आपने नोट छोड़ा है, अनौपचारिक बातचीत का प्रबंध करेंगे।")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPeerNoteSuccessMsg(null)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 text-xs"
                >
                  {tr("Dismiss", "बंद करें")}
                </button>
              </div>
            )}

            {/* CAPF Star Buddy Pair System Card (7-Day Operational Cohesion) */}
            <div className="mt-5 p-4 rounded-xl bg-gradient-to-br from-amber-50 via-white to-amber-100/40 border-2 border-amber-300 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Star className="w-4 h-4 fill-white" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-navy-primary text-sm">
                        {tr("Your Designated Star Buddy (साथी जोड़ी)", "आपकी निर्धारित स्टार बडी जोड़ी")}
                      </span>
                      {buddyInfo?.can_edit_buddy === false ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center space-x-1">
                          <Lock className="w-3 h-3" />
                          <span>{tr(`Locked (${buddyInfo?.days_remaining_to_edit}d remaining)`, `लॉक (${buddyInfo?.days_remaining_to_edit} दिन शेष)`)}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                          <Check className="w-3 h-3" />
                          <span>{tr("Editable Now", "परिवर्तन हेतु उपलब्ध")}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {tr(
                        "CAPF Cohesion Protocol: Mutual welfare accountability. Edits locked for 7 days post-assignment to ensure tactical trust.",
                        "सीएपीएफ सामंजस्य प्रोटोकॉल: पारस्परिक कल्याण उत्तरदायित्व। आपसी विश्वास स्थापित करने हेतु चयन के पश्चात 7 दिनों तक परिवर्तन लॉक रहता है।"
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={buddyInfo?.can_edit_buddy === false}
                    onClick={() => {
                      if (buddyInfo?.can_edit_buddy !== false) {
                        setNewStarBuddyId(buddyInfo?.assigned_buddy?.personnel_id || "");
                        setStarBuddyModalOpen(true);
                      }
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      buddyInfo?.can_edit_buddy === false
                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        : "bg-navy-primary hover:bg-navy-light text-white shadow-xs"
                    }`}
                    title={
                      buddyInfo?.can_edit_buddy === false
                        ? `Locked until ${buddyInfo?.lock_until_ist} per 7-Day Cohesion Protocol`
                        : "Change your designated Star Buddy"
                    }
                  >
                    {buddyInfo?.can_edit_buddy === false ? (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>{tr("Locked (7-Day Rule)", "लॉक (7-दिवसीय नियम)")}</span>
                      </>
                    ) : (
                      <>
                        <Star className="w-3 h-3" />
                        <span>{tr("Change Star Buddy", "स्टार बडी बदलें")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Star Buddy Details */}
              <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-lg border border-amber-200/80 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-navy-primary/10 text-navy-primary font-bold flex items-center justify-center text-xs">
                      ⭐
                    </div>
                    <div>
                      <h4 className="font-bold text-navy-primary text-xs">
                        {buddyInfo?.assigned_buddy?.name || "Ct. Amit Kumar"}
                      </h4>
                      <p className="text-[11px] text-text-muted">
                        {buddyInfo?.assigned_buddy?.rank || "Constable/GD"} &bull; {buddyInfo?.company} &bull; {buddyInfo?.assigned_buddy?.personnel_id}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (buddyInfo?.assigned_buddy?.personnel_id) {
                        setSelectedBuddyId(buddyInfo.assigned_buddy.personnel_id);
                      }
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                      selectedBuddyId === buddyInfo?.assigned_buddy?.personnel_id
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    {selectedBuddyId === buddyInfo?.assigned_buddy?.personnel_id
                      ? tr("✓ Active Target", "✓ सक्रिय लक्ष्य")
                      : tr("Check on Buddy", "बडी की जांच करें")}
                  </button>
                </div>

                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/60 text-[11px] text-amber-950 space-y-1">
                  <div className="font-semibold flex items-center space-x-1 text-amber-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span>{tr("Operational Buddy Pair Benefits:", "ऑपरेशनल बडी जोड़ी के लाभ:")}</span>
                  </div>
                  <p className="leading-relaxed text-slate-700">
                    {tr(
                      "Alerts submitted for your Star Buddy receive elevated priority verification and bypass single-peer corroboration delays.",
                      "आपके स्टार बडी के लिए दर्ज की गई टिप्पणियों को उच्च प्राथमिकता सत्यापन प्राप्त होता है तथा वे त्वरित संवाद हेतु प्रेषित होती हैं।"
                    )}
                  </p>
                  {buddyInfo?.star_buddy_updated_at && (
                    <p className="text-[10px] text-slate-500 pt-0.5">
                      {tr("Last Assigned / Locked On:", "अंतिम चयन / लॉक तिथि:")}{" "}
                      <strong className="text-slate-700">{buddyInfo.lock_until_ist ? `Locked until ${buddyInfo.lock_until_ist}` : "Established"}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* JOINT PEER WELFARE & ROTATIONAL REST RECOMMENDATION       */}
            {/* (सहकर्मी संयुक्त कल्याण एवं रोटेशनल विश्राम अनुशंसा)      */}
            {/* ========================================================= */}
            <div className="mt-5 p-5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-navy-primary/10 border border-navy-primary/20 text-navy-primary flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-navy-primary" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm text-navy-primary">
                        {tr("Joint Peer Rest & Duty Rotation Recommendation", "सहकर्मी संयुक्त रोटेशनल विश्राम अनुशंसा")}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-navy-primary text-white">
                        {tr("CRPF Welfare Protocol", "CRPF कल्याण प्रोटोकॉल")}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                      {tr(
                        "Confidential 48-hour preventative duty rotation initiated via mutual corroboration between designated buddy partners.",
                        "लगातार रात्रि गश्त व ऑपरेशनल तनाव के उपरांत बडी-पेयर की आपसी संस्तुति से 48 घंटे के निवारक विश्राम हेतु गोपनीय परामर्श।"
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-300 shrink-0">
                  <Shield className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{tr("100% Non-Punitive • Zero ACR Impact", "ACR एवं अनुशासनिक रिकॉर्ड से पूर्णतः मुक्त")}</span>
                </div>
              </div>

              {/* Two Official Attestation Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Attestation 1: Personnel Self-Attestation */}
                <div className={`p-4 rounded-lg border transition-all ${
                  myKeyActive
                    ? "bg-emerald-50/90 border-emerald-500 shadow-xs"
                    : "bg-white border-slate-300"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {tr("Part 1 • Personal Operational Status", "भाग 1 • व्यक्तिगत परिचालन स्थिति")}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${myKeyActive ? "bg-emerald-600" : "bg-slate-300"}`} />
                  </div>
                  <div className="font-bold text-xs text-navy-primary mb-1">
                    {tr("Operational Fatigue & Sleep Debt Attestation", "ऑपरेशनल थकान / अनिद्रा अभिपुष्टि")}
                  </div>
                  <p className="text-[11px] text-slate-600 mb-3 leading-relaxed">
                    {tr(
                      "Attest severe patrol exhaustion or sleep debt. Strictly confidential to the medical and welfare cell.",
                      "कठिन गश्त उपरांत शारीरिक शिथिलता अथवा मानसिक थकावट की गोपनीय स्वीकृति। यह जानकारी केवल चिकित्सा प्रकोष्ठ के संज्ञान में रहती है।"
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setMyKeyActive(!myKeyActive)}
                    className={`w-full py-2 px-3 rounded text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                      myKeyActive
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>
                      {myKeyActive
                        ? tr("✓ Fatigue Attested", "✓ व्यक्तिगत थकान अभिपुष्ट (Attested)")
                        : tr("Attest Operational Strain", "थकान स्थिति अभिपुष्ट करें (Attest Fatigue)")}
                    </span>
                  </button>
                </div>

                {/* Attestation 2: Star Buddy Corroboration */}
                <div className={`p-4 rounded-lg border transition-all ${
                  buddyKeyActive
                    ? "bg-emerald-50/90 border-emerald-500 shadow-xs"
                    : "bg-white border-slate-300"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {tr("Part 2 • Buddy Peer Corroboration", "भाग 2 • बडी द्वारा सह-संस्तुति")}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${buddyKeyActive ? "bg-emerald-600" : "bg-slate-300"}`} />
                  </div>
                  <div className="font-bold text-xs text-navy-primary mb-1">
                    {buddyInfo?.assigned_buddy?.name || "Ct. Amit Kumar"} ({tr("Designated Star Buddy", "नामित स्टार बडी")})
                  </div>
                  <p className="text-[11px] text-slate-600 mb-3 leading-relaxed">
                    {tr(
                      "Designated buddy validates observable duty exhaustion and supports a 48h preventative duty rotation.",
                      "बडी द्वारा ड्यूटी के दौरान साथी में सतर्कता ह्रास अथवा अत्यधिक तनाव का अवलोकन एवं 48 घंटे के निवारक रोटेशन का समर्थन।"
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setBuddyKeyActive(!buddyKeyActive)}
                    className={`w-full py-2 px-3 rounded text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                      buddyKeyActive
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>
                      {buddyKeyActive
                        ? tr("✓ Buddy Corroborated", "✓ बडी संस्तुति प्राप्त (Corroborated)")
                        : tr("Corroborate Buddy Rest", "बडी की सह-संस्तुति दर्ज करें (Corroborate Rest)")}
                    </span>
                  </button>
                </div>
              </div>

              {/* Status and Submission */}
              {myKeyActive && buddyKeyActive ? (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-300 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-emerald-950">
                        {tr("Mutual Corroboration Verified • Ready for RMO Dispatch", "पारस्परिक संस्तुति पूर्ण • चिकित्सा अधिकारी को अग्रेषण योग्य")}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {tr(
                          "Both partners have corroborated acute duty strain. Ready to submit confidential recommendation to the Regimental Medical Officer.",
                          "दोनों सहकर्मियों की संस्तुति संरेखित हो चुकी है। यूनिट चिकित्सा अधिकारी (RMO) को 48-घंटे के निवारक विश्राम रोटेशन का परामर्श भेजा जा सकता है।"
                        )}
                      </div>
                    </div>
                  </div>

                  {dualKeySubmitted ? (
                    <div className="p-3 bg-white rounded border border-emerald-400 text-xs text-emerald-900 font-mono">
                      ✓ {tr("Dispatched to Unit Medical Officer • Ref: CRPF/WEL-ROT/2026/0491 • Status: Under Review (Zero ACR Record)", "परामर्श प्रेषित • संदर्भ संख्या: CRPF/WEL-ROT/2026/0491 • स्थिति: चिकित्सा समीक्षाधीन (ACR में शून्य प्रविष्टि)")}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDualKeySubmitted(true)}
                      className="w-full py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <Shield className="w-4 h-4 text-emerald-200" />
                      <span>{tr("Submit Joint 48h Preventative Rest Request to RMO", "चिकित्सा अधिकारी (RMO) को विश्राम परामर्श प्रेषित करें")}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-white rounded border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>
                    {tr(
                      "Protocol Status: Requires mutual attestation from both buddy partners to dispatch preventative stand-down recommendation.",
                      "प्रोटोकॉल स्थिति: 48-घंटे के निवारक रोटेशनल विश्राम हेतु दोनों सहकर्मियों की परस्पर संस्तुति आवश्यक है।"
                    )}
                  </span>
                  <span className="text-slate-700 font-medium text-[10px] hidden sm:inline">
                    {tr("Confidential Welfare", "कल्याणकारी संरक्षण")}
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handlePeerNoteSubmit} className="mt-4 space-y-4 text-xs">
              {/* Squad Member Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-lg border border-neutral-border">
                <div>
                  <label className="block text-[11px] font-bold text-navy-primary mb-1">
                    {tr("Target Comrade for Observation:", "अवलोकन हेतु लक्षित साथी:")}
                  </label>
                  <select
                    value={selectedBuddyId}
                    onChange={(e) => setSelectedBuddyId(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded border border-neutral-border bg-white focus:border-navy-primary outline-none"
                  >
                    {buddyInfo?.assigned_buddy && (
                      <option value={buddyInfo.assigned_buddy.personnel_id}>
                        ⭐ [Star Buddy] {buddyInfo.assigned_buddy.name} ({buddyInfo.assigned_buddy.rank})
                      </option>
                    )}
                    {buddyInfo?.section_peers
                      ?.filter((p) => p.personnel_id !== buddyInfo.assigned_buddy?.personnel_id)
                      .map((p) => (
                        <option key={p.personnel_id} value={p.personnel_id}>
                          {p.name} ({p.rank}) - {p.personnel_id}
                        </option>
                      ))}
                  </select>
                  <span className="text-[10px] text-text-muted mt-1 block">
                    {tr(`Scoped to ${buddyInfo?.company || "your unit company"} barracks`, `${buddyInfo?.company || "आपकी कंपनी"} बैरक तक सीमित`)}
                  </span>
                </div>

                <div className="flex flex-col justify-center p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[11px] font-bold text-navy-primary block mb-1">
                    {tr("Anti-Abuse Verification Status:", "दुरुपयोग रोकथाम सत्यापन स्थिति:")}
                  </span>
                  {selectedBuddyId === buddyInfo?.assigned_buddy?.personnel_id ? (
                    <div className="flex items-center space-x-1.5 text-amber-800 font-bold text-[11px]">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                      <span>{tr("⭐ Star Buddy Verified (Fast-Track Welfare Priority)", "⭐ स्टार बडी सत्यापित (त्वरित कल्याण प्राथमिकता)")}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 text-slate-600 font-medium text-[11px]">
                      <Shield className="w-3.5 h-3.5 text-slate-500" />
                      <span>{tr("👥 Anonymous Peer Guard (Dual-Corroboration Required)", "👥 अनाम पियर गार्ड (दोहरा सत्यापन आवश्यक)")}</span>
                    </div>
                  )}
                  <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                    {tr("Single-peer personal attacks are defused by requiring multi-peer consensus or NCO muster confirmation.", "व्यक्तिगत शिकायतों को रोकने हेतु बहु-साथी सहमति या एनसीओ मस्टर पुष्टि आवश्यक है।")}
                  </p>
                </div>
              </div>

              {/* Care Categories */}
              <div>
                <label className="block text-[11px] font-bold text-navy-primary mb-1.5">
                  {tr("Primary Concern Category (What have you noticed?):", "चिंता की प्राथमिक श्रेणी (आपने क्या देखा?):")}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {[
                    {
                      id: "night_distress_phone",
                      label: tr("Distress / Crying on Phone at Night", "रात में फोन पर अत्यधिक परेशानी या रोना"),
                      sub: tr("Awake at odd hours, whispering or weeping outside barracks", "देर रात तक जागना, बैरक के बाहर फुसफुसाना या रोना"),
                      icon: <PhoneCall className="w-3.5 h-3.5 text-rose-600" />,
                      bg: "hover:bg-rose-50/70 border-rose-200",
                    },
                    {
                      id: "skipping_meals",
                      label: tr("Skipping Mess Meals / Not Eating", "मेस में खाना छोड़ना / भोजन न करना"),
                      sub: tr("Not showing up for dinner, refusing food over 2+ days", "दो या अधिक दिनों से भोजन से इनकार करना"),
                      icon: <Utensils className="w-3.5 h-3.5 text-amber-600" />,
                      bg: "hover:bg-amber-50/70 border-amber-200",
                    },
                    {
                      id: "sudden_isolation",
                      label: tr("Sudden Silence / Extreme Isolation", "अचानक मौन / अत्यधिक अकेलापन"),
                      sub: tr("Withdrawn from camaraderie, blank stare, giving away gear", "साथियों से पूरी तरह अलग-थलग, शून्य में देखना"),
                      icon: <VolumeX className="w-3.5 h-3.5 text-indigo-600" />,
                      bg: "hover:bg-indigo-50/70 border-indigo-200",
                    },
                    {
                      id: "family_crisis",
                      label: tr("Acute Domestic / Family Crisis", "गंभीर घरेलू / पारिवारिक संकट"),
                      sub: tr("Severe distress regarding family health, property, or leave denial", "पारिवारिक स्वास्थ्य, संपत्ति या छुट्टी न मिलने से अत्यधिक तनाव"),
                      icon: <Home className="w-3.5 h-3.5 text-sky-600" />,
                      bg: "hover:bg-sky-50/70 border-sky-200",
                    },
                    {
                      id: "general_strain",
                      label: tr("Noticeable Operational Exhaustion", "अत्यधिक शारीरिक व मानसिक थकान"),
                      sub: tr("Heavily burned out, irritability or sudden mood swings", "अत्यधिक बर्नआउट, चिड़चिड़ापन या अचानक मूड बदलना"),
                      icon: <Activity className="w-3.5 h-3.5 text-amber-700" />,
                      bg: "hover:bg-amber-50/70 border-amber-200",
                    },
                  ].map((cat) => {
                    const active = selectedCareCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCareCategory(cat.id)}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          active
                            ? "bg-navy-primary text-white border-navy-primary shadow-xs"
                            : `bg-white text-text-primary ${cat.bg}`
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 font-bold text-xs">
                          <span className={active ? "text-gold" : ""}>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </div>
                        <span
                          className={`text-[10px] mt-0.5 block leading-tight ${
                            active ? "text-slate-300" : "text-text-muted"
                          }`}
                        >
                          {cat.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1-line Observation Note */}
              <div>
                <label className="block text-[11px] font-bold text-navy-primary mb-1">
                  {tr("Confidential Observation (1-Line Summary for Welfare Cell):", "गोपनीय अवलोकन (कल्याण प्रकोष्ठ हेतु 1-पंक्ति का विवरण):")}
                </label>
                <input
                  type="text"
                  required
                  value={peerNoteText}
                  onChange={(e) => setPeerNoteText(e.target.value)}
                  placeholder={tr(
                    "e.g., Sitting behind the barracks at 2 AM crying quietly on phone with home; seemed deeply shaken.",
                    "उदा. देर रात बैरक के पीछे बैठकर फोन पर बहुत परेशान थे; अत्यधिक व्याकुल प्रतीत हुए।"
                  )}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-neutral-border bg-white focus:border-navy-primary focus:ring-1 focus:ring-navy-primary outline-none"
                />
                <div className="flex items-center justify-between text-[10px] text-text-muted mt-1">
                  <span>{tr("Short, factual observations help the welfare officer reach out with compassion.", "तथ्यात्मक अवलोकन कल्याण अधिकारी को संवेदनशीलता से संपर्क करने में सहायता करता है।")}</span>
                  <span>{tr("Off-the-record touchpoint only", "केवल अनौपचारिक संपर्क")}</span>
                </div>
              </div>

              {/* Safeguards Notice */}
              <div className="p-3 bg-neutral-card/90 rounded-lg border border-neutral-border text-[11px] text-text-muted space-y-1.5">
                <div className="flex items-center space-x-2 text-navy-primary font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{tr("CAPF Ethical Safeguards & Informal Tea Protocol:", "सीएपीएफ नैतिक सुरक्षा एवं अनौपचारिक संवाद प्रोटोकॉल:")}</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] text-text-primary pl-1">
                  <li><strong>{tr("Zero Disciplinary Action:", "कोई अनुशासनात्मक कार्रवाई नहीं:")}</strong> {tr("This drop box is purely for brotherhood welfare. It is never used for conduct complaints or punishments.", "यह ड्रॉप बॉक्स केवल भ्रातृ कल्याण हेतु है। इसका उपयोग कभी भी आचरण संबंधी शिकायत या दंड के लिए नहीं किया जाता।")}</li>
                  <li><strong>{tr("Identity Strictly Excluded:", "पहचान पूर्णतः गुप्त:")}</strong> {tr("Your user identity and IP are mathematically excluded by the server. Even the Welfare Officer only sees the care observation.", "आपकी पहचान सर्वर द्वारा पूर्णतः अलग रखी जाती है। कल्याण अधिकारी केवल अवलोकन देखते हैं।")}</li>
                  <li><strong>{tr("Informal Tea Touchpoint:", "अनौपचारिक संवाद:")}</strong> {tr("The Welfare Officer invites the soldier casually for tea without ever mentioning that a buddy dropped a note.", "कल्याण अधिकारी जवान को सामान्य रूप से चाय पर आमंत्रित करते हैं बिना यह बताए कि किसी साथी ने नोट छोड़ा है।")}</li>
                  <li><strong>{tr("Zero Command Visibility:", "कमांड स्तर पर शून्य पहुंच:")}</strong> {tr("Senior commanders and line officers have zero access to this drop box.", "वरिष्ठ कमांडरों और लाइन अधिकारियों की इस ड्रॉप बॉक्स तक कोई पहुंच नहीं होती।")}</li>
                </ul>
              </div>

              {/* Submit Action */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-text-muted">
                  {tr("Submitted as an unsigned welfare concern note", "हस्ताक्षर-रहित कल्याण नोट के रूप में प्रेषित")}
                </span>
                <button
                  type="submit"
                  disabled={submittingPeerNote || !peerNoteText.trim()}
                  className="px-4 py-2 rounded bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs shadow-sm flex items-center space-x-1.5 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>{submittingPeerNote ? tr("Dropping Confidential Note...", "गोपनीय नोट भेजा जा रहा है...") : tr("Drop Anonymous Note in Welfare Box", "कल्याण बॉक्स में गोपनीय नोट डालें")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Low-key welfare cell information box */}
      <div className="gov-card p-4 bg-neutral-card/40 border border-neutral-border text-xs text-text-muted flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Shield className="w-4 h-4 text-navy-primary shrink-0" />
          <span>
            {t("footer.welfare_line", "Welfare Assistance Line: Sector HQ Welfare Officer • Direct Intercom: 4102 (Confidential & Standing)")}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          {t("footer.directive", "MHA Welfare Directive 2026")}
        </span>
      </div>

      {/* Talk to Someone Modal */}
      {talkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40  flex items-center justify-center p-4">
          <div className="bg-white rounded-[3px] border border-neutral-border max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 mb-3">
              <div className="icon-circle-gold">
                <HeartHandshake className="w-4 h-4 text-navy-primary" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-primary">
                  {tr("Connect with Welfare Cell", "कल्याण प्रकोष्ठ से संपर्क")}
                </h3>
                <p className="text-xs text-text-muted">{tr("Standing, confidential support for all ranks", "सभी पदों हेतु स्थायी, गोपनीय सहयोग")}</p>
              </div>
            </div>

            <p className="text-xs text-text-primary mt-3 leading-relaxed">
              {tr(
                "This button is always available to you on any day, for any reason, completely independent of duty records or administrative evaluations.",
                "यह सुविधा आपके लिए किसी भी दिन, किसी भी कारण से, ड्यूटी रिकॉर्ड या प्रशासनिक मूल्यांकन से पूर्णतः स्वतंत्र रूप से सदैव उपलब्ध है।"
              )}
            </p>

            <div className="mt-4 p-3 bg-neutral-card rounded border border-neutral-border text-xs text-text-muted">
              <p className="font-semibold text-navy-primary mb-1">{tr("Confidentiality Guarantee:", "गोपनीयता की गारंटी:")}</p>
              <p>{tr("Reaching out is an informal personal decision. It is never added to conduct rolls or disciplinary files.", "संपर्क करना एक अनौपचारिक व्यक्तिगत निर्णय है। इसे कभी भी आचरण रिकॉर्ड या अनुशासनात्मक फाइलों में नहीं जोड़ा जाता।")}</p>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                onClick={() => setTalkModalOpen(false)}
                className="px-3.5 py-1.5 rounded bg-white hover:bg-neutral-hover text-text-muted text-xs font-medium border border-neutral-border cursor-pointer"
              >
                {tr("Cancel", "रद्द करें")}
              </button>
              <button
                onClick={handleStandingTalkSubmit}
                className="px-4 py-1.5 rounded bg-navy-primary hover:bg-navy-light text-white text-xs font-semibold shadow-sm cursor-pointer"
              >
                {tr("Request an informal chat", "अनौपचारिक बातचीत का अनुरोध करें")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Family Profile Modal */}
      {onboardingOpen && (
        <div className="fixed inset-0 z-50 bg-black/40  flex items-center justify-center p-4">
          <div className="bg-white rounded-[3px] border border-neutral-border max-w-lg w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-navy-primary/10 text-navy-primary flex items-center justify-center shrink-0">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-primary">
                  {tr("Update Family Profile", "पारिवारिक प्रोफ़ाइल अपडेट करें")}
                </h3>
                <p className="text-xs text-text-muted">{tr("Unit welfare records & emergency liaison details", "इकाई कल्याण रिकॉर्ड एवं आपातकालीन संपर्क विवरण")}</p>
              </div>
            </div>

            <p className="text-xs text-text-primary mt-2 leading-relaxed">
              {tr(
                "Keep your domestic setup updated so your unit welfare cell can provide timely family outreach and support during operational deployments.",
                "अपनी घरेलू व्यवस्था को अद्यतन रखें ताकि ऑपरेशनल तैनाती के दौरान आपकी इकाई कल्याण प्रकोष्ठ समय पर परिवार सहायता प्रदान कर सके।"
              )}
            </p>

            <form onSubmit={handleSaveOnboarding} className="mt-5 space-y-4 text-xs">
              {/* Field 1: Marital Status */}
              <div className="p-3.5 bg-neutral-card/60 rounded-lg border border-neutral-border space-y-2">
                <label className="font-bold text-navy-primary block">
                  {tr("Marital Status", "वैवाहिक स्थिति")}
                </label>
                <div className="flex items-center space-x-6">
                  <label className="inline-flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="marital_status"
                      checked={onboardingMarried}
                      onChange={() => setOnboardingMarried(true)}
                      className="text-navy-primary focus:ring-navy-primary"
                    />
                    <span className="font-medium text-text-primary">{tr("Married", "विवाहित")}</span>
                  </label>
                  <label className="inline-flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="marital_status"
                      checked={!onboardingMarried}
                      onChange={() => setOnboardingMarried(false)}
                      className="text-navy-primary focus:ring-navy-primary"
                    />
                    <span className="font-medium text-text-primary">{tr("Unmarried / Single", "अविवाहित")}</span>
                  </label>
                </div>
              </div>

              {/* Field 2: Family Structure (only relevant if married) */}
              {onboardingMarried ? (
                <div className="p-3.5 bg-neutral-card/60 rounded-lg border border-neutral-border space-y-2.5 animate-in fade-in duration-150">
                  <label className="font-bold text-navy-primary block">
                    {tr("Household Setup Back Home", "गृह निवास व्यवस्था")}
                  </label>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    {tr("Helps the welfare cell know if your spouse has family standing in at home while you are deployed:", "कल्याण प्रकोष्ठ को यह समझने में सहायता करता है कि तैनाती के समय क्या आपके परिवार में अन्य सदस्य उपस्थित हैं:")}
                  </p>

                  <div className="space-y-2 pt-1">
                    <label className={`flex items-start space-x-3 p-3 rounded-md border cursor-pointer transition-colors ${
                      onboardingFamilyStructure === "nuclear"
                        ? "bg-navy-primary/5 border-navy-primary ring-1 ring-navy-primary"
                        : "bg-white border-neutral-border hover:bg-neutral-hover"
                    }`}>
                      <input
                        type="radio"
                        name="family_structure"
                        value="nuclear"
                        checked={onboardingFamilyStructure === "nuclear"}
                        onChange={() => setOnboardingFamilyStructure("nuclear")}
                        className="mt-0.5 text-navy-primary focus:ring-navy-primary"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-navy-primary block">{tr("Nuclear Family", "एकल परिवार")}</span>
                        <span className="text-[11px] text-text-muted leading-relaxed block mt-0.5">
                          {tr("Spouse and children living independently back home.", "पति/पत्नी और बच्चे घर पर स्वतंत्र रूप से निवासरत हैं।")}
                        </span>
                      </div>
                    </label>

                    <label className={`flex items-start space-x-3 p-3 rounded-md border cursor-pointer transition-colors ${
                      onboardingFamilyStructure === "joint"
                        ? "bg-navy-primary/5 border-navy-primary ring-1 ring-navy-primary"
                        : "bg-white border-neutral-border hover:bg-neutral-hover"
                    }`}>
                      <input
                        type="radio"
                        name="family_structure"
                        value="joint"
                        checked={onboardingFamilyStructure === "joint"}
                        onChange={() => setOnboardingFamilyStructure("joint")}
                        className="mt-0.5 text-navy-primary focus:ring-navy-primary"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-navy-primary block">{tr("Joint Family", "संयुक्त परिवार")}</span>
                        <span className="text-[11px] text-text-muted leading-relaxed block mt-0.5">
                          {tr("Parents, siblings, or extended family live together in the household.", "माता-पिता, भाई-बहन या संयुक्त परिवार साथ रहते हैं।")}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded text-[11px] text-text-muted border border-slate-200">
                  {tr("Single personnel are registered under primary parental / next-of-kin welfare support.", "अविवाहित कार्मिकों को प्राथमिक माता-पिता/परिजन कल्याण सहायता के अंतर्गत पंजीकृत किया जाता है।")}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setOnboardingOpen(false)}
                  className="px-3.5 py-2 rounded bg-white hover:bg-neutral-hover text-text-muted font-medium border border-neutral-border text-xs cursor-pointer"
                >
                  {tr("Cancel", "रद्द करें")}
                </button>
                <button
                  type="submit"
                  disabled={savingOnboarding}
                  className="px-4 py-2 rounded bg-navy-primary hover:bg-navy-light text-white font-semibold text-xs shadow-sm flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savingOnboarding ? tr("Saving...", "सहेजा जा रहा है...") : tr("Save Family Profile", "पारिवारिक प्रोफ़ाइल सहेजें")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Saathi Past Check-Ins History Modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 bg-black/40  flex items-center justify-center p-4">
          <div className="bg-white rounded-[3px] border border-neutral-border max-w-lg w-full p-6 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-border">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-navy-primary/10 text-navy-primary flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-navy-primary">
                    {tr("Your Saathi Check-In History", "आपका साथी चेक-इन इतिहास")}
                  </h3>
                  <p className="text-xs text-text-muted">{tr("Recorded confidentially on this device", "इस डिवाइस पर गोपनीय रूप से दर्ज")}</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="text-text-muted hover:text-text-primary text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {saathiHistory.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-6">
                  {tr("No previous Saathi check-ins recorded yet.", "अभी तक कोई पूर्व साथी चेक-इन दर्ज नहीं है।")}
                </p>
              ) : (
                saathiHistory.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg border border-neutral-border bg-neutral-card/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-semibold text-navy-primary">{item.completed_at}</span>
                      </div>
                      <span className="text-[10px] text-text-muted font-medium">
                        {tr("Private Check-in", "गोपनीय चेक-इन")}
                      </span>
                    </div>

                    {/* Raw responses given by the user */}
                    {item.answers && item.answers.length > 0 && (
                      <div className="pt-1.5 border-t border-neutral-border/60 space-y-1">
                        <span className="text-[10px] font-bold text-navy-primary uppercase tracking-wider block">
                          {tr("Your Recorded Responses:", "आपके दर्ज उत्तर:")}
                        </span>
                        <div className="space-y-1 pl-1">
                          {item.answers.map((ans: any, aIdx: number) => (
                            <div key={aIdx} className="text-[11px] text-slate-700 flex items-start space-x-1.5">
                              <span className="text-navy-primary font-mono text-[10px]">&bull;</span>
                              <span>
                                {ans.question ? <span className="text-text-muted">{tSaathi(ans.question, language)}: </span> : null}
                                <strong>{tSaathi(ans.selected_label || ans.free_text || "Answered", language)}</strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.has_private_notes && (
                      <div className="pt-1 text-[11px] text-slate-500 italic">
                        &bull; {tr("Personal reflection note saved locally on this device", "इस डिवाइस पर स्थानीय रूप से सहेजा गया निजी विचार नोट")}
                      </div>
                    )}

                    {item.requested_welfare_outreach && (
                      <div className="pt-1 text-[11px] text-amber-800 font-semibold flex items-center space-x-1">
                        <Coffee className="w-3 h-3 text-amber-700" />
                        <span>{tr("Informal welfare cell tea chat requested", "अनौपचारिक कल्याण संवाद का अनुरोध किया गया")}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-neutral-border flex justify-end">
              <button
                onClick={() => setHistoryOpen(false)}
                className="px-4 py-1.5 rounded bg-navy-primary text-white text-xs font-semibold cursor-pointer"
              >
                {tr("Close", "बंद करें")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Star Buddy Selection / Re-assignment Modal (7-Day Cohesion Protocol) */}
      {starBuddyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-border max-w-md w-full p-6 animate-in zoom-in-95 duration-150 shadow-xl">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 shadow-xs">
                <Star className="w-5 h-5 fill-amber-500 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-primary">
                  {tr("Designate Star Buddy (साथी जोड़ी)", "स्टार बडी का चयन (साथी जोड़ी)")}
                </h3>
                <p className="text-xs text-text-muted">{tr("CAPF 2-Person Operational Buddy System", "सीएपीएफ 2-सदस्यीय ऑपरेशनल बडी प्रणाली")}</p>
              </div>
            </div>

            {/* 7-Day Protocol Warning Banner */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-lg text-xs text-amber-950 space-y-1.5 my-3">
              <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>{tr("7-Day Operational Cohesion Protocol", "7-दिवसीय सामंजस्य प्रोटोकॉल")}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900/90">
                {tr(
                  "Once you confirm your Star Buddy today, the assignment will be locked for 7 calendar days before any re-assignment is permitted. This builds mutual accountability and battlefield camaraderie.",
                  "आज स्टार बडी की पुष्टि करने के बाद, यह चयन 7 दिनों के लिए लॉक हो जाएगा। यह आपसी विश्वास और मोर्चे पर एकजुटता को मजबूत करता है।"
                )}
              </p>
            </div>

            <form onSubmit={handleSaveStarBuddy} className="space-y-4 text-xs mt-4">
              <div>
                <label className="block text-[11px] font-bold text-navy-primary mb-1.5">
                  {tr("Select Comrade from Your Section / Company:", "अपने सेक्शन/कंपनी से साथी चुनें:")}
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {buddyInfo?.section_peers?.map((peer) => (
                    <label
                      key={peer.personnel_id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        newStarBuddyId === peer.personnel_id
                          ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/40"
                          : "bg-white border-neutral-border hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="star_buddy_peer"
                          value={peer.personnel_id}
                          checked={newStarBuddyId === peer.personnel_id}
                          onChange={() => setNewStarBuddyId(peer.personnel_id)}
                          className="text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <span className="font-bold text-navy-primary block text-xs">
                            {peer.name}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {peer.rank} &bull; {peer.personnel_id}
                          </span>
                        </div>
                      </div>
                      {peer.is_assigned_buddy && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          {tr("Current", "वर्तमान")}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-neutral-border">
                <button
                  type="button"
                  onClick={() => setStarBuddyModalOpen(false)}
                  className="px-3.5 py-2 rounded bg-white hover:bg-neutral-hover text-text-muted font-medium border border-neutral-border text-xs cursor-pointer"
                >
                  {tr("Cancel", "रद्द करें")}
                </button>
                <button
                  type="submit"
                  disabled={savingStarBuddy || !newStarBuddyId}
                  className="px-4 py-2 rounded bg-navy-primary hover:bg-navy-light text-white font-bold text-xs shadow-sm flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{savingStarBuddy ? tr("Locking...", "लॉक किया जा रहा है...") : tr("Confirm & Lock for 7 Days", "पुष्टि करें एवं 7 दिनों हेतु लॉक करें")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Saathi (साथी) Voluntary Informed Consent Modal (DPDP Aligned & 90-Day Retention) */}
      {showSaathiConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-navy-primary text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {tr("Voluntary Welfare Consent — Saathi Check-In", "स्वैच्छिक कल्याण सहमति — साथी चेक-इन")}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {tr("CAPF Personnel Data Governance & Privacy Standard (DPDP Aligned)", "सीएपीएफ कार्मिक डेटा प्रशासन एवं गोपनीयता मानक")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSaathiConsent(false)}
                className="text-slate-300 hover:text-white text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  1. {tr("What is collected (Confidential Reflections):", "1. क्या एकत्र किया जाता है (गोपनीय संवाद विचार):")}
                </span>
                <span className="text-[11px] text-slate-600 leading-relaxed block">
                  {tr(
                    "Your voluntary self-reported reflections on sleep, operational stress, family communication, and welfare needs. All questions are designed for personal wellness and support.",
                    "नींद, परिचालन तनाव, पारिवारिक संपर्क और कल्याण आवश्यकताओं पर आपके स्वैच्छिक विचार। सभी प्रश्न व्यक्तिगत स्वास्थ्य एवं सहायता हेतु बनाए गए हैं।"
                  )}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  2. {tr("Why it is collected (Proactive Welfare & Counseling):", "2. यह क्यों एकत्र किया जाता है (सक्रिय कल्याण एवं परामर्श सहायता):")}
                </span>
                <span className="text-[11px] text-slate-600 leading-relaxed block">
                  {tr(
                    "To identify cumulative burnout or distress early and connect you with timely support (such as Vishram downtime, peer support, or professional counseling) before physical or mental exhaustion occurs.",
                    "मानसिक या शारीरिक थकावट से पहले संचयी तनाव की पहचान करना तथा समय पर सहायता (जैसे विश्राम, साथी सहायता या परामर्श) उपलब्ध कराना।"
                  )}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  3. {tr("Data Retention & 90-Day Purge Protocol:", "3. डेटा प्रतिधारण एवं 90-दिवसीय निष्कासन:")}
                </span>
                <span className="text-[11px] text-slate-600 leading-relaxed block">
                  {tr(
                    "Check-in responses are retained for a maximum of 90 days. An automated server retention protocol permanently deletes all records older than 90 days.",
                    "चेक-इन उत्तर अधिकतम 90 दिनों तक रखे जाते हैं। 90 दिनों से पुराने सभी रिकॉर्ड्स को स्वचालित सर्वर प्रोटोकॉल द्वारा स्थायी रूप से हटा दिया जाता है।"
                  )}
                </span>
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="font-bold text-emerald-950 block mb-1">
                  4. {tr("100% Voluntary — Zero Disciplinary or Career Impact:", "4. पूर्णतः स्वैच्छिक — करियर या अनुशासन पर शून्य प्रभाव:")}
                </span>
                <span className="text-[11px] text-emerald-800 leading-relaxed block">
                  {tr(
                    "Participation is completely voluntary. Declining to participate has zero effect on your service records, leave approvals, duty rosters, or annual appraisal (APAR). You may exit at any time.",
                    "भागीदारी पूर्णतः स्वैच्छिक है। भाग न लेने से आपकी सेवा, अवकाश, ड्यूटी रोस्टर या वार्षिक गोपनीय रिपोर्ट (APAR) पर कोई प्रतिकूल प्रभाव नहीं पड़ेगा।"
                  )}
                </span>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <span className="font-bold text-amber-950 block mb-1">
                  5. {tr("Strict Role Boundaries (No Command Access):", "5. कड़े भूमिका प्रतिबंध (कमांड को कोई व्यक्तिगत पहुंच नहीं):")}
                </span>
                <span className="text-[11px] text-amber-900 leading-relaxed block">
                  {tr(
                    "Unit Commanders and NCOs CANNOT see your individual answers or identity. Only the Unit Welfare Officer can access flagged cases requiring supportive care.",
                    "यूनिट कमांडरों और एनसीओ को आपके व्यक्तिगत उत्तर या पहचान देखने की अनुमति नहीं है। केवल यूनिट वेलफेयर ऑफिसर ही सहायता की आवश्यकता वाले मामलों तक पहुंच सकते हैं।"
                  )}
                </span>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSaathiConsent(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  {tr("Decline & Cancel", "अस्वीकार करें व रद्द करें")}
                </button>
                <button
                  type="button"
                  onClick={handleAcceptSaathiConsent}
                  className="w-full sm:w-auto px-5 py-2 rounded-lg bg-navy-primary hover:bg-navy-light text-white text-xs font-bold shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-gold" />
                  <span>{tr("I Understand & Give Voluntary Consent", "मैं समझता हूँ और स्वैच्छिक सहमति देता हूँ")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dhvani (ध्वनि) 10-Second Acoustic Check Modal */}
      <VoiceStrainModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        currentUser={currentUser}
        onSuccessCheckin={(res) => {
          setRecentVocalCheck(res);
        }}
        onOpenVishram={() => {
          setIsVoiceModalOpen(false);
          const el = document.getElementById("vishram-section");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
      />
    </div>
  );
};

