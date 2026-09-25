import React, { useEffect, useState } from "react";
import type { User, SectionRosterMember } from "../types";
import { apiGetSectionRoster, apiSubmitMusterBatch, apiSubmitPeerFlag, apiResetNcoMusterDemo } from "../api";
import { Users, CheckCircle, Clock, Send, EyeOff, Check, Lock, RotateCcw, ShieldCheck } from "lucide-react";

interface NcoViewProps {
  currentUser: User;
}

export const NcoView: React.FC<NcoViewProps> = () => {
  const [roster, setRoster] = useState<SectionRosterMember[]>([]);
  const [sectionTitle, setSectionTitle] = useState("");
  const [loading, setLoading] = useState(true);

  // Observations indexed by personnel_id
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // 48h-72h Cycle Cooldown & Lockout State
  const [isCycleLocked, setIsCycleLocked] = useState(false);
  const [lastSubmittedAt, setLastSubmittedAt] = useState<string | null>(null);
  const [nextMusterDue, setNextMusterDue] = useState<string | null>(null);
  const [resettingCycle, setResettingCycle] = useState(false);

  // Peer-flag state
  const [peerFlagTarget, setPeerFlagTarget] = useState("");
  const [peerFlagText, setPeerFlagText] = useState("");
  const [peerFlagSubmitted, setPeerFlagSubmitted] = useState(false);
  const [peerFlagSubmitting, setPeerFlagSubmitting] = useState(false);

  useEffect(() => {
    loadRoster();
  }, []);

  const loadRoster = async () => {
    setLoading(true);
    try {
      const data = await apiGetSectionRoster();
      setRoster(data.roster);
      setSectionTitle(data.section_name);
      setIsCycleLocked(Boolean(data.is_cycle_locked));
      setLastSubmittedAt(data.last_submitted_at || null);
      setNextMusterDue(data.next_muster_due || null);

      // Default all scores to their current or baseline score
      const initialScores: Record<string, number> = {};
      data.roster.forEach((m) => {
        initialScores[m.personnel_id] = Math.round(m.last_observation_score || 2);
      });
      setScores(initialScores);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreClick = (pid: string, val: number) => {
    if (isCycleLocked) return;
    setScores((prev) => ({ ...prev, [pid]: val }));
  };

  const handleNoteChange = (pid: string, text: string) => {
    if (isCycleLocked) return;
    setNotes((prev) => ({ ...prev, [pid]: text }));
  };

  const handleBatchSubmit = async () => {
    if (isCycleLocked || submitting) return;
    setSubmitting(true);
    try {
      const payload = roster.map((m) => ({
        personnel_id: m.personnel_id,
        concern_score: scores[m.personnel_id] || 2,
        note: notes[m.personnel_id] || undefined,
      }));
      const res = await apiSubmitMusterBatch(payload);
      setIsCycleLocked(true);
      const nowStr = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      setLastSubmittedAt(nowStr);
      setFeedback(`Section muster recorded in under 30s! ${res.message}`);
      setTimeout(() => setFeedback(null), 8000);
      await loadRoster();
    } catch (err: any) {
      alert(`Muster Submission Notice: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetCycleDemo = async () => {
    setResettingCycle(true);
    try {
      await apiResetNcoMusterDemo();
      setIsCycleLocked(false);
      setLastSubmittedAt(null);
      setNextMusterDue(null);
      setFeedback("Section muster cycle reset successfully. You can now perform a fresh observation check.");
      setTimeout(() => setFeedback(null), 6000);
      await loadRoster();
    } catch (err: any) {
      alert(`Error resetting demo cycle: ${err.message}`);
    } finally {
      setResettingCycle(false);
    }
  };

  const handlePeerFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!peerFlagText.trim()) return;

    setPeerFlagSubmitting(true);
    try {
      await apiSubmitPeerFlag(peerFlagTarget || "SECTION_MEMBER", peerFlagText);
      setPeerFlagSubmitted(true);
      setPeerFlagText("");
      setPeerFlagTarget("");
      setTimeout(() => setPeerFlagSubmitted(false), 5000);
    } catch (err: any) {
      alert(`Error submitting peer flag: ${err.message}`);
    } finally {
      setPeerFlagSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-primary mx-auto mb-3"></div>
        <p className="text-sm text-text-muted">Loading section muster roster...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Top Section Header */}
      <div className="gov-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="badge-navy mb-1.5">Section Commander Console • 48h–72h Routine (Bi-Daily)</span>
          <h1 className="text-2xl font-bold text-navy-primary">
            Bi-Daily Section Muster Observation (48–72h Cadence)
          </h1>
          <p className="text-xs text-text-muted mt-1 font-sans">
            Section: <span className="font-semibold text-navy-primary">{sectionTitle}</span> • Scheduled every 2–3 days to prevent roll-call fatigue
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-text-muted bg-neutral-card px-3.5 py-2 rounded-lg border border-neutral-border">
          <Clock className="w-4 h-4 text-navy-primary" />
          <div>
            <div className="font-bold text-navy-primary text-[11px]">48h–72h Cadence (2–3 Days)</div>
            <div className="text-[10px] text-text-muted">Prevents daily reporting fatigue</div>
          </div>
        </div>
      </div>

      {/* Cadence Policy Notice */}
      <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-900 flex items-start space-x-2.5">
        <Clock className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Operational Muster Cadence Policy: </span>
          Muster observations are formalised once every 48 to 72 hours (2–3 days) rather than daily, preventing routine survey fatigue while maintaining vigilant section oversight.
          Any personnel marked with score ≥ 3 or noticeable drift is automatically forwarded to the Welfare Officer's <strong>NCO Muster Reports</strong> console for timely support.
        </div>
      </div>

      {/* Cycle Lock Status Banner (Prevents immediate re-submission) */}
      {isCycleLocked && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="p-1.5 bg-amber-200 rounded-full text-amber-900 mt-0.5 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-amber-900 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Muster Observation Submitted & Locked (48h Cadence Active)</span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                Your muster observation report is already logged for this cycle. Duplicate submissions within seconds or the same 48h cycle are prevented to protect section baseline integrity.
                {lastSubmittedAt && <span className="font-medium"> (Logged: {lastSubmittedAt})</span>}
                {nextMusterDue && <span className="font-medium text-amber-900"> • Next due: {nextMusterDue}</span>}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetCycleDemo}
            disabled={resettingCycle}
            className="shrink-0 px-3.5 py-1.5 rounded bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            title="Allows evaluators/testers during SIH to clear the 48h lock and submit again"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resettingCycle ? "animate-spin" : ""}`} />
            <span>{resettingCycle ? "Resetting..." : "Unlock Cycle (SIH Demo Mode)"}</span>
          </button>
        </div>
      )}

      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Roster Muster Table - Fast 1-5 tap */}
      <div className="gov-card">
        <div className="gov-card-header">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-navy-primary" />
            <h2 className="text-sm font-bold text-navy-primary">
              Section Roster ({roster.length} Personnel)
            </h2>
          </div>
          <span className="text-[11px] text-text-muted">
            {isCycleLocked ? "Observation cycle locked • Reset demo mode to test re-scoring" : "Tap 1 (Normal) to 5 (High Concern) per personnel • 48h–72h Cycle"}
          </span>
        </div>

        <div className="divide-y divide-neutral-border overflow-x-auto">
          {roster.map((m) => {
            const currentScore = scores[m.personnel_id] || 2;
            return (
              <div
                key={m.personnel_id}
                className="p-4 hover:bg-neutral-hover/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Person Info */}
                <div className="min-w-[200px]">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-navy-primary">{m.name}</span>
                    <span className="text-[11px] font-mono text-text-muted">({m.personnel_id})</span>
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {m.rank} • Typical Baseline: <span className="font-semibold">{m.current_observation_baseline}/5</span>
                  </div>
                </div>

                {/* Fast 1-5 Concern Rating Scale */}
                <div className="flex items-center space-x-1 sm:space-x-1.5">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const isSelected = currentScore === val;
                    let colorClass = isCycleLocked
                      ? "border-neutral-200 text-neutral-400 bg-neutral-50 cursor-not-allowed opacity-60"
                      : "border-neutral-border text-text-muted hover:bg-neutral-hover";
                    if (isSelected) {
                      if (isCycleLocked) {
                        colorClass = "bg-navy-light/60 text-white border-navy-light font-bold cursor-not-allowed";
                      } else if (val === 1) colorClass = "bg-navy-primary text-white border-navy-primary font-bold";
                      else if (val === 2) colorClass = "bg-khaki text-white border-khaki font-bold";
                      else if (val === 3) colorClass = "bg-amber-600 text-white border-amber-600 font-bold";
                      else if (val === 4) colorClass = "bg-amber-700 text-white border-amber-700 font-bold";
                      else if (val === 5) colorClass = "bg-red-800 text-white border-red-800 font-bold";
                    }

                    return (
                      <button
                        key={val}
                        type="button"
                        disabled={isCycleLocked}
                        onClick={() => handleScoreClick(m.personnel_id, val)}
                        className={`w-8 h-8 rounded text-xs transition-all border ${colorClass}`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>

                {/* Optional One-Line Note */}
                <div className="sm:w-64">
                  <input
                    type="text"
                    disabled={isCycleLocked}
                    placeholder={isCycleLocked ? "Muster locked for active cycle" : "Optional 1-line note (e.g. fatigue, quiet)"}
                    value={notes[m.personnel_id] || ""}
                    onChange={(e) => handleNoteChange(m.personnel_id, e.target.value)}
                    className={`w-full text-xs px-2.5 py-1.5 rounded border border-neutral-border outline-none transition-colors ${
                      isCycleLocked ? "bg-neutral-100 text-neutral-500 cursor-not-allowed" : "bg-white focus:border-navy-primary focus:ring-1 focus:ring-navy-primary"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Bar */}
        <div className="p-4 bg-neutral-card border-t border-neutral-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-text-muted">
            Legend: 1 = Normal • 3 = Slight Change (Auto-routes to Welfare) • 5 = Urgent Welfare Look
          </div>
          <div className="flex items-center space-x-2">
            {isCycleLocked ? (
              <>
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 rounded-lg bg-neutral-300 text-neutral-600 text-xs font-semibold flex items-center space-x-1.5 cursor-not-allowed"
                >
                  <Lock className="w-4 h-4 text-neutral-500" />
                  <span>Muster Logged for this 48h Cycle</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetCycleDemo}
                  disabled={resettingCycle}
                  className="px-3.5 py-2 rounded-lg bg-khaki hover:bg-khaki-dark text-white text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                  title="Unlock cycle immediately for hackathon demonstration"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${resettingCycle ? "animate-spin" : ""}`} />
                  <span>Unlock for Demo</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleBatchSubmit}
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-navy-primary hover:bg-navy-light text-white text-xs font-semibold shadow-sm flex items-center space-x-2 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4 text-gold" />
                <span>{submitting ? "Recording..." : "Save Bi-Daily Muster (48h–72h Routine)"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Separate Anonymous Peer-Flag Intake */}
      <div className="gov-card p-6 border-l-4 border-khaki">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="icon-circle-khaki">
              <EyeOff className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-navy-primary">
                Anonymous Peer-Flag Intake
              </h2>
              <p className="text-xs text-text-muted">
                Notice something concerning with a squad member? Quick single-field prompt.
              </p>
            </div>
          </div>
          <span className="badge-khaki hidden sm:inline">100% Anonymous</span>
        </div>

        <form onSubmit={handlePeerFlagSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">
                Personnel ID / Name
              </label>
              <select
                value={peerFlagTarget}
                onChange={(e) => setPeerFlagTarget(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border border-neutral-border bg-white outline-none"
              >
                <option value="">Select individual (or leave blank)</option>
                {roster.map((r) => (
                  <option key={r.personnel_id} value={r.personnel_id}>
                    {r.name} ({r.personnel_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-text-primary mb-1">
                Observation Text
              </label>
              <input
                type="text"
                required
                placeholder="e.g., something seems off with Sharma lately, can someone check"
                value={peerFlagText}
                onChange={(e) => setPeerFlagText(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border border-neutral-border bg-white focus:border-navy-primary outline-none"
              >
              </input>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-text-muted italic">
              No justification required. Your identity is strictly withheld from what the welfare officer sees.
            </p>
            <button
              type="submit"
              disabled={peerFlagSubmitting || !peerFlagText.trim()}
              className="px-4 py-1.5 rounded bg-khaki hover:bg-khaki-dark text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Anonymous Concern</span>
            </button>
          </div>
        </form>

        {peerFlagSubmitted && (
          <div className="mt-3 p-2.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded text-xs flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Anonymous note routed directly to the Welfare Officer queue.</span>
          </div>
        )}
      </div>
    </div>
  );
};
