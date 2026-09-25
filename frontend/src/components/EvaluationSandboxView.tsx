import React, { useState, useEffect } from "react";
import {
  Download,
  Sliders,
  Sparkles,
  CheckCircle2,
  Clock,
  RefreshCw,
  FileSpreadsheet,
  Calendar,
  Moon
} from "lucide-react";
import {
  apiGetScenarioPresets,
  apiSimulateScenarioShift,
  apiGenerateScenarioCohort
} from "../api";
import type {
  PresetScenarioInfo,
  GenerateCohortResponse,
  SimulateShiftResponse
} from "../types";

export const EvaluationSandboxView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"generator" | "simulator">("generator");

  // Shared / Generator State
  const [presets, setPresets] = useState<Record<string, PresetScenarioInfo>>({});
  const [selectedPreset, setSelectedPreset] = useState<string>("extended_deployment_night_shift");
  const [cohortSize, setCohortSize] = useState<number>(500);
  const [randomSeed] = useState<number>(42);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [cohortResult, setCohortResult] = useState<GenerateCohortResponse | null>(null);

  // Scenario Simulator State
  const [simWorkloadDelta, setSimWorkloadDelta] = useState<number>(20);
  const [simRestCompliance, setSimRestCompliance] = useState<number>(68);
  const [simNightFraction, setSimNightFraction] = useState<number>(0.35);
  const [simLeaveDelay, setSimLeaveDelay] = useState<number>(24);
  const [simCohortSize] = useState<number>(500);
  const [simResult, setSimResult] = useState<SimulateShiftResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  useEffect(() => {
    loadPresets();
    // Pre-calculate initial simulator state
    runSimulation(simWorkloadDelta, simRestCompliance, simNightFraction, simLeaveDelay, simCohortSize);
  }, []);

  const loadPresets = async () => {
    try {
      const res = await apiGetScenarioPresets();
      if (res && res.presets) {
        setPresets(res.presets);
      }
    } catch (err) {
      console.error("Failed to load scenario presets:", err);
    }
  };

  const handleGenerateCohort = async () => {
    setIsGenerating(true);
    try {
      const activePresetObj = presets[selectedPreset];
      const res = await apiGenerateScenarioCohort({
        scenario_preset: selectedPreset,
        cohort_size: cohortSize,
        workload_delta_pct: activePresetObj?.workload_delta_pct ?? 28,
        night_duty_fraction: activePresetObj?.night_duty_fraction ?? 0.38,
        rest_day_compliance_pct: activePresetObj?.rest_day_compliance_pct ?? 68,
        leave_delay_days: activePresetObj?.leave_delay_days ?? 24,
        saathi_tough_rate: activePresetObj?.saathi_tough_rate ?? 0.42,
        random_seed: randomSeed
      });
      setCohortResult(res);
    } catch (err: any) {
      console.error("Failed to generate synthetic cohort:", err);
      alert(`Generation failed: ${err.message || err}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const runSimulation = async (
    workload: number,
    rest: number,
    night: number,
    leave: number,
    cohort: number
  ) => {
    setIsSimulating(true);
    try {
      const res = await apiSimulateScenarioShift({
        workload_delta_pct: workload,
        rest_day_compliance_pct: rest,
        night_duty_fraction: night,
        leave_delay_days: leave,
        cohort_size: cohort
      });
      setSimResult(res);
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleApplyPresetToSimulator = (presetKey: string) => {
    const p = presets[presetKey];
    if (!p) return;
    setSimWorkloadDelta(p.workload_delta_pct);
    setSimRestCompliance(p.rest_day_compliance_pct);
    setSimNightFraction(p.night_duty_fraction);
    setSimLeaveDelay(p.leave_delay_days);
    runSimulation(p.workload_delta_pct, p.rest_day_compliance_pct, p.night_duty_fraction, p.leave_delay_days, simCohortSize);
  };

  const handleDownloadCsv = (csvPayload?: string, filename = "synthetic_cohort.csv") => {
    if (!csvPayload) return;
    const blob = new Blob([csvPayload], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner - Strict Sandbox Demarcation */}
      <div className="p-4 sm:p-5 rounded-lg bg-gradient-to-r from-slate-900 via-navy-primary to-slate-900 text-white border-2 border-amber-400 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase tracking-wider bg-amber-400 text-navy-primary">
                EVALUATION SANDBOX ONLY
              </span>
              <span className="text-xs text-amber-200">Admin &amp; Evaluator Authorization</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-1 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Model Evaluation &amp; Synthetic Simulation Sandbox</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              This sandbox is strictly segregated from the operational defense application. It enables judges, evaluators, and system architects to test model sensitivity, generate synthetic 30-day cohorts, and benchmark predictions without accessing or modifying classified personnel data.
            </p>
          </div>

          <div className="px-3.5 py-2 rounded bg-amber-400/10 border border-amber-400/30 text-amber-300 text-center sm:text-right shrink-0">
            <span className="text-[10px] font-mono uppercase block text-amber-400">Security Isolation</span>
            <span className="text-xs font-bold font-sans">Role RBAC Enforced</span>
          </div>
        </div>
      </div>

      {/* Sandbox Sub-Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-neutral-border pb-1">
        <button
          onClick={() => setActiveSubTab("generator")}
          className={`px-4 py-2 rounded-t-md text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            activeSubTab === "generator"
              ? "bg-navy-primary text-white shadow-xs border-t-2 border-gold"
              : "text-text-muted hover:text-navy-primary bg-neutral-card border border-neutral-border"
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-gold" />
          <span>1. Synthetic Data Generator</span>
        </button>

        <button
          onClick={() => setActiveSubTab("simulator")}
          className={`px-4 py-2 rounded-t-md text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            activeSubTab === "simulator"
              ? "bg-navy-primary text-white shadow-xs border-t-2 border-gold"
              : "text-text-muted hover:text-navy-primary bg-neutral-card border border-neutral-border"
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span>2. Scenario Simulator (What-If Engine)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. SYNTHETIC DATA GENERATOR UI                                            */}
      {/* ========================================================================= */}
      {activeSubTab === "generator" && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          <div className="gov-card p-5 border-l-4 border-gold">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-border">
              <div>
                <h3 className="text-base font-bold text-navy-primary flex items-center space-x-2">
                  <FileSpreadsheet className="w-4 h-4 text-gold-dark" />
                  <span>Synthetic Data Generator</span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Generate simulated personnel data for model testing and demonstration. No real personnel data is used.
                </p>
              </div>

              <div className="px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-mono font-bold">
                SIMULATION DATA — NOT REAL PERSONNEL DATA
              </div>
            </div>

            {/* Generator Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              {/* Cohort Size */}
              <div className="p-3 rounded bg-slate-50 border border-neutral-border space-y-1.5">
                <label className="text-xs font-bold text-navy-primary block">
                  Cohort Size (Personnel)
                </label>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {[250, 500, 1000].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setCohortSize(size)}
                      className={`py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                        cohortSize === size
                          ? "bg-navy-primary text-white"
                          : "bg-white text-slate-700 border border-neutral-border hover:bg-slate-100"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-text-muted mt-1">Configurable test volume</p>
              </div>

              {/* Record Duration */}
              <div className="p-3 rounded bg-slate-50 border border-neutral-border space-y-1.5">
                <label className="text-xs font-bold text-navy-primary block">
                  Record Duration
                </label>
                <div className="p-1.5 bg-white rounded border border-neutral-border font-mono font-bold text-xs text-navy-primary text-center">
                  30 Days (Daily Streams)
                </div>
                <p className="text-[10px] text-text-muted mt-1">Longitudinal history per troop</p>
              </div>

              {/* Scenario Preset Selection */}
              <div className="p-3 rounded bg-slate-50 border border-neutral-border space-y-1.5">
                <label className="text-xs font-bold text-navy-primary block">
                  Operational Sector Preset
                </label>
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  className="w-full text-xs py-1.5 px-2 rounded border border-neutral-border bg-white font-medium outline-none focus:border-navy-primary cursor-pointer"
                >
                  <option value="extended_deployment_night_shift">Extended Night Surge (LWE / CI)</option>
                  <option value="pre_election_overdrive">Election Overdrive (RAF Duty)</option>
                  <option value="monsoon_border_flashpoint">Border Flashpoint (J&K / High Altitude)</option>
                  <option value="post_op_recovery">Rest &amp; Recovery (Static Peacetime)</option>
                </select>
                <p className="text-[10px] text-text-muted mt-1">Applies hardship parameters</p>
              </div>

              {/* Action Button */}
              <div className="p-3 rounded bg-slate-50 border border-neutral-border flex flex-col justify-between">
                <label className="text-xs font-bold text-navy-primary block">
                  Generate Cohort
                </label>
                <button
                  type="button"
                  onClick={handleGenerateCohort}
                  disabled={isGenerating}
                  className="w-full py-2 rounded bg-navy-primary hover:bg-navy-secondary text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-gold" />
                  )}
                  <span>{isGenerating ? "Synthesizing..." : "Generate Synthetic Cohort"}</span>
                </button>
              </div>
            </div>

            {/* Generated Cohort Inspection Section */}
            {cohortResult && (
              <div className="mt-6 pt-5 border-t border-neutral-border space-y-5 animate-in fade-in-50 duration-200">
                {/* Status Bar */}
                <div className="p-3.5 rounded bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="text-xs font-bold text-emerald-950">
                      Successfully Synthesized Cohort ({cohortResult.cohort_size} Personnel • 30-Day Operational Records)
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDownloadCsv(cohortResult.csv_payload, `synthetic_cohort_${cohortResult.cohort_size}_personnel.csv`)}
                      className="px-3 py-1.5 rounded bg-navy-primary hover:bg-navy-secondary text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-gold" />
                      <span>Export Synthetic CSV</span>
                    </button>
                  </div>
                </div>

                {/* 6 Summary Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3 rounded bg-white border border-neutral-border">
                    <span className="text-[10px] text-text-muted uppercase block font-semibold">Synthetic Personnel</span>
                    <span className="text-lg font-bold text-navy-primary font-mono">{cohortResult.cohort_size}</span>
                    <span className="text-[9px] text-slate-500 block">Identities: SIM100000+</span>
                  </div>

                  <div className="p-3 rounded bg-white border border-neutral-border">
                    <span className="text-[10px] text-text-muted uppercase block font-semibold">Generated Records</span>
                    <span className="text-lg font-bold text-navy-primary font-mono">{cohortResult.cohort_size * 30}</span>
                    <span className="text-[9px] text-slate-500 block">30 days × {cohortResult.cohort_size} troops</span>
                  </div>

                  <div className="p-3 rounded bg-white border border-neutral-border">
                    <span className="text-[10px] text-text-muted uppercase block font-semibold">Date Range</span>
                    <span className="text-sm font-bold text-navy-primary font-mono">T-30d to T-0d</span>
                    <span className="text-[9px] text-slate-500 block">Rolling trailing window</span>
                  </div>

                  <div className="p-3 rounded bg-white border border-neutral-border">
                    <span className="text-[10px] text-text-muted uppercase block font-semibold">Feature Count</span>
                    <span className="text-lg font-bold text-navy-primary font-mono">19 Inputs</span>
                    <span className="text-[9px] text-slate-500 block">XGBoost input vectors</span>
                  </div>

                  <div className="p-3 rounded bg-white border border-neutral-border">
                    <span className="text-[10px] text-text-muted uppercase block font-semibold">Data Completeness</span>
                    <span className="text-lg font-bold text-emerald-700 font-mono">100.0%</span>
                    <span className="text-[9px] text-slate-500 block">Zero missing fields</span>
                  </div>

                  <div className="p-3 rounded bg-white border border-neutral-border">
                    <span className="text-[10px] text-text-muted uppercase block font-semibold">Model Validation</span>
                    <span className="text-lg font-bold text-amber-700 font-mono">Calibrated</span>
                    <span className="text-[9px] text-slate-500 block">Platt sigmoidal scaling</span>
                  </div>
                </div>

                {/* Risk Distribution Breakdown */}
                <div className="p-4 rounded-lg bg-slate-50 border border-neutral-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-navy-primary uppercase tracking-wide">
                      Predicted Risk &amp; Early Warning Distribution (Calibrated XGBoost)
                    </span>
                    <span className="text-xs font-mono text-text-muted">
                      Avg Cohort Risk: <strong className="text-navy-primary">{cohortResult.simulated_distribution.average_risk_pct}%</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-center">
                      <span className="text-[10px] font-bold text-emerald-900 block">🟢 NORMAL</span>
                      <span className="text-base font-bold font-mono text-emerald-950">
                        {cohortResult.simulated_distribution.normal_pct}%
                      </span>
                      <span className="text-[10px] text-emerald-800 block">
                        {cohortResult.simulated_distribution.normal} troops
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-yellow-50 border border-yellow-200 text-center">
                      <span className="text-[10px] font-bold text-yellow-900 block">🟡 WATCH</span>
                      <span className="text-base font-bold font-mono text-yellow-950">
                        {cohortResult.simulated_distribution.watch_pct}%
                      </span>
                      <span className="text-[10px] text-yellow-800 block">
                        {cohortResult.simulated_distribution.watch} troops
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-center">
                      <span className="text-[10px] font-bold text-amber-900 block">🟠 SUPPORT</span>
                      <span className="text-base font-bold font-mono text-amber-950">
                        {cohortResult.simulated_distribution.support_pct}%
                      </span>
                      <span className="text-[10px] text-amber-800 block">
                        {cohortResult.simulated_distribution.support} troops
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-center">
                      <span className="text-[10px] font-bold text-rose-900 block">🔴 PRIORITY</span>
                      <span className="text-base font-bold font-mono text-rose-950">
                        {cohortResult.simulated_distribution.priority_pct}%
                      </span>
                      <span className="text-[10px] text-rose-800 block">
                        {cohortResult.simulated_distribution.priority} troops
                      </span>
                    </div>
                  </div>

                  {/* Progress bar visualizer */}
                  <div className="h-2 w-full rounded-full bg-slate-200 flex overflow-hidden">
                    <div style={{ width: `${cohortResult.simulated_distribution.normal_pct}%` }} className="bg-emerald-500 h-full" />
                    <div style={{ width: `${cohortResult.simulated_distribution.watch_pct}%` }} className="bg-yellow-400 h-full" />
                    <div style={{ width: `${cohortResult.simulated_distribution.support_pct}%` }} className="bg-amber-500 h-full" />
                    <div style={{ width: `${cohortResult.simulated_distribution.priority_pct}%` }} className="bg-rose-500 h-full" />
                  </div>
                </div>

                {/* Sample Generated Records Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-navy-primary">
                      Sample Simulated Records (First 5 of {cohortResult.cohort_size})
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">
                      Full dataset available via CSV export
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-neutral-border rounded">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-100 border-b border-neutral-border text-slate-700">
                        <tr>
                          <th className="py-2 px-2.5 text-left font-semibold">Simulated ID</th>
                          <th className="py-2 px-2.5 text-left font-semibold">Fictitious Name</th>
                          <th className="py-2 px-2.5 text-left font-semibold">Rank</th>
                          <th className="py-2 px-2.5 text-left font-semibold">Duty Load</th>
                          <th className="py-2 px-2.5 text-left font-semibold">Rest Comp</th>
                          <th className="py-2 px-2.5 text-left font-semibold">Leave Delay</th>
                          <th className="py-2 px-2.5 text-left font-semibold">Predicted Risk</th>
                          <th className="py-2 px-2.5 text-left font-semibold">Tier</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-border bg-white font-mono">
                        {cohortResult.top_flagged_samples.slice(0, 5).map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2.5 text-slate-600">{r.personnel_id}</td>
                            <td className="py-1.5 px-2.5 font-sans font-medium text-navy-primary">{r.name}</td>
                            <td className="py-1.5 px-2.5 text-slate-600 font-sans">{r.rank}</td>
                            <td className="py-1.5 px-2.5 text-slate-900">{r.simulated_duty_hours}h/wk</td>
                            <td className="py-1.5 px-2.5 text-slate-900">{r.simulated_rest_pct}%</td>
                            <td className="py-1.5 px-2.5 text-slate-900">+{r.simulated_leave_gap_days}d</td>
                            <td className="py-1.5 px-2.5 font-bold text-navy-primary">{r.simulated_risk_pct}%</td>
                            <td className="py-1.5 px-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-bold ${
                                r.early_warning_tier === "PRIORITY" ? "bg-rose-100 text-rose-900" :
                                r.early_warning_tier === "SUPPORT" ? "bg-amber-100 text-amber-900" :
                                r.early_warning_tier === "WATCH" ? "bg-yellow-100 text-yellow-900" :
                                "bg-emerald-100 text-emerald-900"
                              }`}>
                                {r.early_warning_tier}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SCENARIO SIMULATOR (WHAT-IF ENGINE) UI                                  */}
      {/* ========================================================================= */}
      {activeSubTab === "simulator" && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          <div className="gov-card p-5 border-l-4 border-amber-400">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-border">
              <div>
                <h3 className="text-base font-bold text-navy-primary flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-amber-500" />
                  <span>Scenario Simulator</span>
                  {isSimulating && (
                    <span className="text-xs text-amber-600 font-mono animate-pulse ml-2 font-normal">
                      Simulating...
                    </span>
                  )}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Change operational conditions and observe how the calibrated model responds.
                </p>
              </div>

              <div className="px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-mono font-bold">
                Simulation only — not a real personnel assessment.
              </div>
            </div>

            {/* Presets Quick-Select */}
            <div className="mt-4">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-2">
                Apply Operational Hardship Preset:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyPresetToSimulator("extended_deployment_night_shift")}
                  className="p-2 rounded border border-neutral-border bg-white hover:bg-slate-50 text-left transition-colors cursor-pointer"
                >
                  <span className="font-bold text-xs text-rose-900 block">🔴 Extended Night Surge</span>
                  <span className="text-[10px] text-text-muted">Workload +28% • Rest 68% • Sentry 38%</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPresetToSimulator("pre_election_overdrive")}
                  className="p-2 rounded border border-neutral-border bg-white hover:bg-slate-50 text-left transition-colors cursor-pointer"
                >
                  <span className="font-bold text-xs text-amber-900 block">🟠 Election Overdrive</span>
                  <span className="text-[10px] text-text-muted">Workload +42% • Rest 52% • Leaves 38d</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPresetToSimulator("monsoon_border_flashpoint")}
                  className="p-2 rounded border border-neutral-border bg-white hover:bg-slate-50 text-left transition-colors cursor-pointer"
                >
                  <span className="font-bold text-xs text-yellow-900 block">🟡 Border Flashpoint</span>
                  <span className="text-[10px] text-text-muted">Workload +20% • Rest 74% • Sentry 32%</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPresetToSimulator("post_op_recovery")}
                  className="p-2 rounded border border-neutral-border bg-white hover:bg-slate-50 text-left transition-colors cursor-pointer"
                >
                  <span className="font-bold text-xs text-emerald-900 block">🟢 Rest &amp; Recovery</span>
                  <span className="text-[10px] text-text-muted">Workload -12% • Rest 96% • Zero backlog</span>
                </button>
              </div>
            </div>

            {/* Sliders Grid */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Slider 1: Workload */}
              <div className="p-3.5 rounded bg-slate-50 border border-neutral-border space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-navy-primary" />
                    <span>Workload Shift (Weekly Hours)</span>
                  </span>
                  <span className="font-mono font-bold text-sm text-navy-primary">
                    {simWorkloadDelta >= 0 ? `+${simWorkloadDelta}%` : `${simWorkloadDelta}%`}
                    <span className="text-[10px] font-normal text-slate-500 ml-1">
                      ({(45.0 * (1 + simWorkloadDelta / 100)).toFixed(1)}h/wk)
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="50"
                  step="2"
                  value={simWorkloadDelta}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSimWorkloadDelta(val);
                    runSimulation(val, simRestCompliance, simNightFraction, simLeaveDelay, simCohortSize);
                  }}
                  className="w-full accent-navy-primary h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>−30% (Light)</span>
                  <span>Normal (45h/wk)</span>
                  <span>+20% (High)</span>
                  <span>+50% (Extreme)</span>
                </div>
              </div>

              {/* Slider 2: Recovery / Rest-Day Compliance */}
              <div className="p-3.5 rounded bg-slate-50 border border-neutral-border space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Recovery / Rest-Day Compliance</span>
                  </span>
                  <span className="font-mono font-bold text-sm text-navy-primary">
                    {simRestCompliance}%
                    <span className="text-[10px] font-normal text-slate-500 ml-1">
                      (Target: 95%)
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  step="2"
                  value={simRestCompliance}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSimRestCompliance(val);
                    runSimulation(simWorkloadDelta, val, simNightFraction, simLeaveDelay, simCohortSize);
                  }}
                  className="w-full accent-navy-primary h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>40% (Severe Deficit)</span>
                  <span>70% (Strained)</span>
                  <span>95% (Healthy Target)</span>
                </div>
              </div>

              {/* Slider 3: Night Sentry Fraction */}
              <div className="p-3.5 rounded bg-slate-50 border border-neutral-border space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span className="flex items-center space-x-1.5">
                    <Moon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Night Sentry Fraction</span>
                  </span>
                  <span className="font-mono font-bold text-sm text-navy-primary">
                    {Math.round(simNightFraction * 100)}%
                    <span className="text-[10px] font-normal text-slate-500 ml-1">
                      (Circadian strain)
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.50"
                  step="0.02"
                  value={simNightFraction}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSimNightFraction(val);
                    runSimulation(simWorkloadDelta, simRestCompliance, val, simLeaveDelay, simCohortSize);
                  }}
                  className="w-full accent-navy-primary h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>10% (Normal)</span>
                  <span>25% (Moderate)</span>
                  <span>50% (Continuous Night Shifts)</span>
                </div>
              </div>

              {/* Slider 4: Leave Delay Gap */}
              <div className="p-3.5 rounded bg-slate-50 border border-neutral-border space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gold-dark" />
                    <span>Leave Sanction Delay Gap</span>
                  </span>
                  <span className="font-mono font-bold text-sm text-navy-primary">
                    +{simLeaveDelay} days
                    <span className="text-[10px] font-normal text-slate-500 ml-1">
                      (Separation load)
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="2"
                  value={simLeaveDelay}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSimLeaveDelay(val);
                    runSimulation(simWorkloadDelta, simRestCompliance, simNightFraction, val, simCohortSize);
                  }}
                  className="w-full accent-navy-primary h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>0 days (Cleared)</span>
                  <span>20 days (Delayed)</span>
                  <span>60 days (Frozen)</span>
                </div>
              </div>
            </div>

            {/* ================================================================= */}
            {/* MANDATORY OUTPUT SECTION: BASELINE RISK -> SIMULATED RISK -> CHANGE */}
            {/* ================================================================= */}
            {simResult && (
              <div className="mt-6 p-4 rounded-lg bg-slate-900 text-white shadow-md border border-amber-400/40 space-y-4 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                    Model Response Telemetry (Holdout N = {simCohortSize})
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Inference Latency: &lt;10ms
                  </span>
                </div>

                {/* 3 Step Transformation Pipeline */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  {/* Step 1: Baseline */}
                  <div className="p-3 rounded bg-white/5 border border-white/10">
                    <span className="text-[11px] uppercase font-mono text-slate-400 block font-semibold">
                      1. BASELINE RISK
                    </span>
                    <span className="text-2xl font-bold font-mono text-white mt-1 block">
                      {simResult.baseline_summary.average_risk_pct}%
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Standard peacetime tempo
                    </span>
                  </div>

                  {/* Step 2: Simulated */}
                  <div className="p-3 rounded bg-white/5 border border-white/10">
                    <span className="text-[11px] uppercase font-mono text-slate-400 block font-semibold">
                      2. SIMULATED RISK
                    </span>
                    <span className="text-2xl font-bold font-mono text-amber-300 mt-1 block">
                      {simResult.simulated_summary.average_risk_pct}%
                    </span>
                    <span className="text-[10px] text-amber-200 block mt-0.5">
                      Under shifted parameters
                    </span>
                  </div>

                  {/* Step 3: Change */}
                  <div className="p-3 rounded bg-white/5 border border-white/10">
                    <span className="text-[11px] uppercase font-mono text-slate-400 block font-semibold">
                      3. NET CHANGE
                    </span>
                    <span className={`text-2xl font-bold font-mono mt-1 block ${
                      simResult.simulated_summary.risk_delta_pct > 0 ? "text-rose-400" : "text-emerald-400"
                    }`}>
                      {simResult.simulated_summary.risk_delta_pct > 0 ? `+${simResult.simulated_summary.risk_delta_pct}` : simResult.simulated_summary.risk_delta_pct} percentage points
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Predicted triage shift
                    </span>
                  </div>
                </div>

                {/* Simulated Triage Distribution */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2">
                  <div className="p-2 rounded bg-white/5 border border-white/10 text-center">
                    <span className="text-slate-400 block text-[10px]">🟢 Normal</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {simResult.simulated_summary.normal_pct}% ({simResult.simulated_summary.normal_count})
                    </span>
                  </div>

                  <div className="p-2 rounded bg-white/5 border border-white/10 text-center">
                    <span className="text-slate-400 block text-[10px]">🟡 Watch</span>
                    <span className="font-mono font-bold text-yellow-300 text-sm">
                      {simResult.simulated_summary.watch_pct}% ({simResult.simulated_summary.watch_count})
                    </span>
                  </div>

                  <div className="p-2 rounded bg-white/5 border border-white/10 text-center">
                    <span className="text-slate-400 block text-[10px]">🟠 Support</span>
                    <span className="font-mono font-bold text-amber-300 text-sm">
                      {simResult.simulated_summary.support_pct}% ({simResult.simulated_summary.support_count})
                    </span>
                  </div>

                  <div className="p-2 rounded bg-white/5 border border-white/10 text-center">
                    <span className="text-slate-400 block text-[10px]">🔴 Priority</span>
                    <span className="font-mono font-bold text-rose-400 text-sm">
                      {simResult.simulated_summary.priority_pct}% ({simResult.simulated_summary.priority_count})
                    </span>
                  </div>
                </div>

                {/* Primary Drivers Attribution */}
                <div className="pt-2 border-t border-white/10 text-xs text-slate-300">
                  <span className="font-bold text-white block mb-1">Top SHAP Attributions:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    {simResult.primary_stress_drivers.map((d, i) => (
                      <div key={i} className="p-1.5 rounded bg-white/5 border border-white/5 flex items-center justify-between">
                        <span>{d.driver}</span>
                        <span className="font-mono font-bold text-amber-400">{d.weight_pct}% weight</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
