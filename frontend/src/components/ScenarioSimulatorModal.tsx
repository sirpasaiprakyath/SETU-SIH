import React, { useState, useEffect } from "react";
import {
  X,
  Sliders,
  Download,
  Activity,
  AlertTriangle,
  Layers,
  TrendingUp,
  Clock,
  Moon,
  Calendar,
  HeartHandshake,
  FileSpreadsheet,
  RefreshCw,
  Zap
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

interface ScenarioSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScenarioSimulatorModal: React.FC<ScenarioSimulatorModalProps> = ({ isOpen, onClose }) => {
  const [presets, setPresets] = useState<Record<string, PresetScenarioInfo>>({});
  const [selectedPreset, setSelectedPreset] = useState<string>("extended_deployment_night_shift");

  // What-If Sliders State
  const [workloadDelta, setWorkloadDelta] = useState<number>(28);
  const [restCompliance, setRestCompliance] = useState<number>(68);
  const [nightFraction, setNightFraction] = useState<number>(0.38);
  const [leaveDelay, setLeaveDelay] = useState<number>(24);
  const [cohortSize, setCohortSize] = useState<number>(500);

  // Simulation Feedback State
  const [quickSim, setQuickSim] = useState<SimulateShiftResponse | null>(null);
  const [cohortResult, setCohortResult] = useState<GenerateCohortResponse | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadPresets();
      runQuickSim(workloadDelta, restCompliance, nightFraction, leaveDelay, cohortSize);
      runFullCohortGeneration(selectedPreset, workloadDelta, restCompliance, nightFraction, leaveDelay, cohortSize);
    }
  }, [isOpen]);

  const loadPresets = async () => {
    try {
      const data = await apiGetScenarioPresets();
      setPresets(data.presets);
    } catch (err) {
      console.error("Failed to load scenario presets", err);
    }
  };

  const handleSelectPreset = (key: string) => {
    setSelectedPreset(key);
    const p = presets[key];
    if (p) {
      setWorkloadDelta(p.workload_delta_pct);
      setRestCompliance(p.rest_day_compliance_pct);
      setNightFraction(p.night_duty_fraction);
      setLeaveDelay(p.leave_delay_days);
      runQuickSim(p.workload_delta_pct, p.rest_day_compliance_pct, p.night_duty_fraction, p.leave_delay_days, cohortSize);
      runFullCohortGeneration(key, p.workload_delta_pct, p.rest_day_compliance_pct, p.night_duty_fraction, p.leave_delay_days, cohortSize);
    }
  };

  const runQuickSim = async (w: number, r: number, n: number, l: number, cSize: number) => {
    try {
      const res = await apiSimulateScenarioShift({
        workload_delta_pct: w,
        rest_day_compliance_pct: r,
        night_duty_fraction: n,
        leave_delay_days: l,
        cohort_size: cSize
      });
      setQuickSim(res);
    } catch (err) {
      console.error("Quick simulation failed", err);
    }
  };

  const handleSliderChange = (
    w: number = workloadDelta,
    r: number = restCompliance,
    n: number = nightFraction,
    l: number = leaveDelay
  ) => {
    setSelectedPreset("custom");
    runQuickSim(w, r, n, l, cohortSize);
  };

  const runFullCohortGeneration = async (
    presetKey: string,
    w: number,
    r: number,
    n: number,
    l: number,
    cSize: number
  ) => {
    setGenerating(true);
    try {
      const res = await apiGenerateScenarioCohort({
        scenario_preset: presetKey === "custom" ? undefined : presetKey,
        cohort_size: cSize,
        workload_delta_pct: w,
        rest_day_compliance_pct: r,
        night_duty_fraction: n,
        leave_delay_days: l,
        saathi_tough_rate: 0.40,
        random_seed: 42
      });
      setCohortResult(res);
    } catch (err) {
      console.error("Full cohort generation failed", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!cohortResult?.csv_payload) return;
    const blob = new Blob([cohortResult.csv_payload], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SETU_Synthetic_${cohortSize}_Personnel_Scenario_Records.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-primary/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-xl shadow-2xl border border-neutral-border max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-neutral-border bg-gradient-to-r from-navy-primary via-navy-dark to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                  Live Evaluator Sandbox • SIH PS 26186
                </span>
                <span className="text-xs text-slate-300">Calibrated XGBoost Model Execution</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white mt-0.5">
                Scenario Simulator &amp; Synthetic Cohort Generator
              </h2>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 text-text-primary text-xs">
          
          {/* 1. Preset Scenario Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-navy-primary uppercase tracking-wide flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-navy-primary" />
                <span>1. Select Pre-Configured Operational Scenario</span>
              </span>
              <span className="text-[11px] text-text-muted font-sans">
                Preset parameters mapped to official MHA hardship grids
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Preset 1: Extended Deployment + Night Duty */}
              <button
                type="button"
                onClick={() => handleSelectPreset("extended_deployment_night_shift")}
                className={`p-3 rounded-lg border text-left transition-all relative ${
                  selectedPreset === "extended_deployment_night_shift"
                    ? "bg-rose-50/80 border-rose-400 shadow-xs ring-2 ring-rose-300"
                    : "bg-white border-neutral-border hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-950 text-xs">🔴 Extended Night Surge</span>
                  <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-mono">LWE / CI</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  Workload +28%, Night shifts 38%, Rest compliance 68%, Leave gap +24d.
                </p>
              </button>

              {/* Preset 2: Pre-Election Overdrive */}
              <button
                type="button"
                onClick={() => handleSelectPreset("pre_election_overdrive")}
                className={`p-3 rounded-lg border text-left transition-all relative ${
                  selectedPreset === "pre_election_overdrive"
                    ? "bg-amber-50/80 border-amber-400 shadow-xs ring-2 ring-amber-300"
                    : "bg-white border-neutral-border hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 text-xs">🟠 Election Overdrive</span>
                  <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">RAF Duty</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  Workload +42%, 16h double shifts, 52% rest compliance, leaves frozen.
                </p>
              </button>

              {/* Preset 3: Monsoon Border Flashpoint */}
              <button
                type="button"
                onClick={() => handleSelectPreset("monsoon_border_flashpoint")}
                className={`p-3 rounded-lg border text-left transition-all relative ${
                  selectedPreset === "monsoon_border_flashpoint"
                    ? "bg-yellow-50/80 border-yellow-400 shadow-xs ring-2 ring-yellow-300"
                    : "bg-white border-neutral-border hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-yellow-950 text-xs">🟡 Border Flashpoint</span>
                  <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 font-mono">J&amp;K / NE</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  Workload +20%, Sub-zero weather, Night sentry 32%, Convoy delays.
                </p>
              </button>

              {/* Preset 4: Post-Op Rest & Recovery */}
              <button
                type="button"
                onClick={() => handleSelectPreset("post_op_recovery")}
                className={`p-3 rounded-lg border text-left transition-all relative ${
                  selectedPreset === "post_op_recovery"
                    ? "bg-emerald-50/80 border-emerald-400 shadow-xs ring-2 ring-emerald-300"
                    : "bg-white border-neutral-border hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 text-xs">🟢 Rest &amp; Recovery</span>
                  <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">Static Base</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  Workload −12%, 96% rest compliance, Cleared leave backlog.
                </p>
              </button>
            </div>
          </div>

          {/* 2. Interactive "What-If" Stress Modulator Sliders */}
          <div className="p-4 rounded-lg bg-white border border-neutral-border shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-border pb-2.5">
              <div>
                <span className="text-xs font-bold text-navy-primary uppercase tracking-wide flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-navy-primary" />
                  <span>2. Dynamic Stress Sliders: Adjust Workload &amp; Recovery in Real Time</span>
                </span>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Drag sliders to watch the XGBoost predicted risk shift immediately without re-rendering the whole page.
                </p>
              </div>

              {/* Cohort Size Selector */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-semibold text-slate-600">Cohort:</span>
                {[250, 500, 1000].map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setCohortSize(size);
                      runQuickSim(workloadDelta, restCompliance, nightFraction, leaveDelay, size);
                      runFullCohortGeneration(selectedPreset, workloadDelta, restCompliance, nightFraction, leaveDelay, size);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                      cohortSize === size
                        ? "bg-navy-primary text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {size} troops
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Slider 1: Workload Adjustment */}
              <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-navy-primary" />
                    <span>Workload Shift (Weekly Hours)</span>
                  </span>
                  <span className={`font-mono font-bold text-sm ${workloadDelta > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                    {workloadDelta >= 0 ? `+${workloadDelta}%` : `${workloadDelta}%`}
                    <span className="text-[10px] font-normal text-slate-500 ml-1">
                      ({(45.0 * (1 + workloadDelta / 100)).toFixed(1)} hrs/wk)
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="50"
                  step="2"
                  value={workloadDelta}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setWorkloadDelta(val);
                    handleSliderChange(val, restCompliance, nightFraction, leaveDelay);
                  }}
                  className="w-full accent-navy-primary h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9.5px] text-slate-500">
                  <span>−30% (Light)</span>
                  <span>Normal (45h/wk)</span>
                  <span>+20% (High)</span>
                  <span>+50% (Extreme)</span>
                </div>
              </div>

              {/* Slider 2: Recovery & Rest-Day Compliance */}
              <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span className="flex items-center space-x-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-navy-primary" />
                    <span>Recovery / Rest-Day Compliance</span>
                  </span>
                  <span className={`font-mono font-bold text-sm ${restCompliance < 75 ? "text-rose-700" : "text-emerald-700"}`}>
                    {restCompliance}%
                    <span className="text-[10px] font-normal text-slate-500 ml-1">
                      ({restCompliance < 70 ? "Acute Rest Deficit" : "Standard"})
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  step="2"
                  value={restCompliance}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setRestCompliance(val);
                    handleSliderChange(workloadDelta, val, nightFraction, leaveDelay);
                  }}
                  className="w-full accent-navy-primary h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9.5px] text-slate-500">
                  <span>40% (Severe Deficit)</span>
                  <span>70% (Strained)</span>
                  <span>95% (Healthy Target)</span>
                </div>
              </div>

              {/* Slider 3: Night Duty Fraction */}
              <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span className="flex items-center space-x-1.5">
                    <Moon className="w-3.5 h-3.5 text-navy-primary" />
                    <span>Night Sentry Rotation Fraction</span>
                  </span>
                  <span className={`font-mono font-bold text-sm ${nightFraction > 0.30 ? "text-rose-700" : "text-slate-800"}`}>
                    {(nightFraction * 100).toFixed(0)}%
                    <span className="text-[10px] font-normal text-slate-500 ml-1">
                      ({nightFraction > 0.30 ? "Circadian Strain" : "Normal"})
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.50"
                  step="0.02"
                  value={nightFraction}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setNightFraction(val);
                    handleSliderChange(workloadDelta, restCompliance, val, leaveDelay);
                  }}
                  className="w-full accent-navy-primary h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9.5px] text-slate-500">
                  <span>10% (Baseline)</span>
                  <span>25% (Moderate)</span>
                  <span>50% (Continuous Nights)</span>
                </div>
              </div>

              {/* Slider 4: Leave Delay Gap */}
              <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-navy-primary" />
                    <span>Leave Sanction Delay Gap</span>
                  </span>
                  <span className={`font-mono font-bold text-sm ${leaveDelay > 20 ? "text-amber-800" : "text-slate-800"}`}>
                    +{leaveDelay} days
                    <span className="text-[10px] font-normal text-slate-500 ml-1">
                      ({leaveDelay > 20 ? "Family Separation Load" : "On-Time"})
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="2"
                  value={leaveDelay}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLeaveDelay(val);
                    handleSliderChange(workloadDelta, restCompliance, nightFraction, val);
                  }}
                  className="w-full accent-navy-primary h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9.5px] text-slate-500">
                  <span>0 days (Cleared)</span>
                  <span>20 days</span>
                  <span>60 days (Frozen)</span>
                </div>
              </div>
            </div>

            {/* Run Full Cohort & Download Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                disabled={generating}
                onClick={() => runFullCohortGeneration(selectedPreset, workloadDelta, restCompliance, nightFraction, leaveDelay, cohortSize)}
                className="px-4 py-2 rounded-lg bg-navy-primary hover:bg-navy-dark text-white font-bold text-xs flex items-center space-x-2 transition-all shadow-xs disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
                <span>
                  {generating
                    ? `Synthesizing ${cohortSize} Records & Running XGBoost...`
                    : `Generate Scenario Cohort & Run Model (${cohortSize} Personnel)`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={!cohortResult}
                className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 font-semibold text-xs flex items-center space-x-1.5 transition-all shadow-2xs disabled:opacity-50"
                title="Download 30-day synthetic records for all personnel as CSV"
              >
                <Download className="w-3.5 h-3.5 text-navy-primary" />
                <span>Export {cohortSize} 30-Day Records (CSV)</span>
              </button>
            </div>
          </div>

          {/* 3. Comparative Visualizer: Baseline vs. Simulated Shift */}
          {quickSim && (
            <div className="p-4 rounded-lg bg-white border border-neutral-border shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy-primary uppercase tracking-wide flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5 text-navy-primary" />
                  <span>3. Model Output: Baseline vs. Simulated Workforce Risk Distribution</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Evaluated on {quickSim.cohort_size} Troops
                </span>
              </div>

              {/* 4 Early Warning Tier Shift Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* 🟢 Normal */}
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300">
                  <span className="text-[10px] uppercase font-bold text-emerald-900 tracking-wider block">🟢 Normal</span>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="text-lg font-mono font-black text-emerald-950">
                      {quickSim.simulated_summary.normal_pct}%
                    </span>
                    <span className="text-[10px] text-emerald-700">
                      (from {quickSim.baseline_summary.normal_pct}%)
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-800 block mt-0.5">
                    {quickSim.simulated_summary.normal_count} personnel
                  </span>
                </div>

                {/* 🟡 Watch */}
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-300">
                  <span className="text-[10px] uppercase font-bold text-yellow-900 tracking-wider block">🟡 Watch</span>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="text-lg font-mono font-black text-yellow-950">
                      {quickSim.simulated_summary.watch_pct}%
                    </span>
                    <span className="text-[10px] text-yellow-800">
                      (from {quickSim.baseline_summary.watch_pct}%)
                    </span>
                  </div>
                  <span className="text-[10px] text-yellow-900 block mt-0.5">
                    {quickSim.simulated_summary.watch_count} personnel
                  </span>
                </div>

                {/* 🟠 Support */}
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-300">
                  <span className="text-[10px] uppercase font-bold text-amber-900 tracking-wider block">🟠 Support</span>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="text-lg font-mono font-black text-amber-950">
                      {quickSim.simulated_summary.support_pct}%
                    </span>
                    <span className="text-[10px] text-amber-800">
                      (from {quickSim.baseline_summary.support_pct}%)
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-900 block mt-0.5">
                    {quickSim.simulated_summary.support_count} personnel
                  </span>
                </div>

                {/* 🔴 Priority */}
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-300">
                  <span className="text-[10px] uppercase font-bold text-rose-900 tracking-wider block">🔴 Priority</span>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="text-lg font-mono font-black text-rose-950">
                      {quickSim.simulated_summary.priority_pct}%
                    </span>
                    <span className="text-[10px] text-rose-800">
                      (from {quickSim.baseline_summary.priority_pct}%)
                    </span>
                  </div>
                  <span className="text-[10px] text-rose-900 font-bold block mt-0.5">
                    {quickSim.simulated_summary.priority_count} acute triage cases
                  </span>
                </div>
              </div>

              {/* Progress visualizer showing distribution bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                  <span>Simulated Workforce Distribution Bar</span>
                  <span className="font-mono text-navy-primary">
                    Average Risk: {quickSim.simulated_summary.average_risk_pct}% 
                    <span className="text-rose-700 ml-1">
                      ({quickSim.simulated_summary.risk_delta_pct >= 0 ? `+${quickSim.simulated_summary.risk_delta_pct}` : quickSim.simulated_summary.risk_delta_pct} pts)
                    </span>
                  </span>
                </div>

                <div className="h-3 w-full rounded-full bg-slate-200 flex overflow-hidden">
                  <div style={{ width: `${quickSim.simulated_summary.normal_pct}%` }} className="bg-emerald-500 h-full" title={`Normal: ${quickSim.simulated_summary.normal_pct}%`} />
                  <div style={{ width: `${quickSim.simulated_summary.watch_pct}%` }} className="bg-yellow-400 h-full" title={`Watch: ${quickSim.simulated_summary.watch_pct}%`} />
                  <div style={{ width: `${quickSim.simulated_summary.support_pct}%` }} className="bg-amber-500 h-full" title={`Support: ${quickSim.simulated_summary.support_pct}%`} />
                  <div style={{ width: `${quickSim.simulated_summary.priority_pct}%` }} className="bg-rose-500 h-full" title={`Priority: ${quickSim.simulated_summary.priority_pct}%`} />
                </div>
              </div>

              {/* Stress Drivers & Countermeasure Advice Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {/* Primary Stress Drivers */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-navy-primary uppercase tracking-wide block">
                    Top Contributing Stress Drivers (SHAP Weighting)
                  </span>
                  <div className="space-y-1.5">
                    {quickSim.primary_stress_drivers.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-slate-200">
                        <div>
                          <span className="font-bold text-slate-800">{d.driver}</span>
                          <span className="text-[10px] text-slate-500 block">{d.impact}</span>
                        </div>
                        <span className="font-mono font-bold text-navy-primary bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {d.weight_pct}% weight
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Countermeasure Impact */}
                <div className="p-3 rounded-lg bg-indigo-50/80 border border-indigo-200 space-y-2">
                  <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wide flex items-center space-x-1.5">
                    <HeartHandshake className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Prescribed Administrative Countermeasure</span>
                  </span>
                  <p className="text-xs text-indigo-900 leading-relaxed font-medium">
                    {quickSim.countermeasure_impact.recommended_action}
                  </p>
                  <div className="p-2 bg-white rounded border border-indigo-200 flex items-center justify-between text-xs">
                    <span className="text-slate-600">Simulated Risk Prevention:</span>
                    <span className="font-mono font-bold text-indigo-900">
                      −{quickSim.countermeasure_impact.projected_priority_reduction_pct}% priority cases (~{quickSim.countermeasure_impact.estimated_cases_prevented} troops protected)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Top Simulated Flagged Personnel Table */}
          {cohortResult && cohortResult.top_flagged_samples.length > 0 && (
            <div className="p-4 rounded-lg bg-white border border-neutral-border shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy-primary uppercase tracking-wide flex items-center space-x-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-navy-primary" />
                  <span>4. Inspect Simulated Troop Records (Top Flagged Cases)</span>
                </span>
                <span className="text-[10.5px] text-slate-500">
                  Showing top {cohortResult.top_flagged_samples.length} of {cohortResult.cohort_size} synthetic records
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-xs font-sans">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500 text-[10.5px] uppercase">
                      <th className="py-2 px-2.5">Personnel ID &amp; Name</th>
                      <th className="py-2 px-2.5">Unit &amp; Sector</th>
                      <th className="py-2 px-2 text-center">Duty Load</th>
                      <th className="py-2 px-2 text-center">Rest / Night</th>
                      <th className="py-2 px-2 text-center">Leave Gap</th>
                      <th className="py-2 px-2 text-center">Predicted Risk</th>
                      <th className="py-2 px-2 text-center">Early Warning Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cohortResult.top_flagged_samples.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 px-2.5 font-medium text-navy-primary">
                          <div>
                            <span className="font-bold">{r.name}</span>
                            <span className="text-[10px] text-slate-500 block font-mono">{r.personnel_id} • {r.rank}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2.5 text-slate-600">
                          <div>
                            <span>{r.company}</span>
                            <span className="text-[10px] text-slate-400 block">{r.battalion}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-800">
                          {r.simulated_duty_hours}h/wk
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600">
                          {r.simulated_rest_pct}% rest • {r.simulated_night_pct}% night
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-slate-700">
                          +{r.simulated_leave_gap_days}d
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="font-mono font-bold text-sm text-navy-primary">
                            {r.simulated_risk_pct}%
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-bold ${
                            r.early_warning_tier === "PRIORITY"
                              ? "bg-rose-100 text-rose-900 border border-rose-300"
                              : r.early_warning_tier === "SUPPORT"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : r.early_warning_tier === "WATCH"
                              ? "bg-yellow-100 text-yellow-900 border border-yellow-300"
                              : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          }`}>
                            <span>{r.early_warning_icon}</span>
                            <span>{r.early_warning_tier}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. Scientific Governance Disclaimer */}
          <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-300 text-amber-950 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-900 leading-relaxed">
              <strong>MHA Prototype Validation Protocol:</strong> This simulator programmatically generates synthetic longitudinal records using Gaussian distributions calibrated against statutory MHA Task Force and BPR&amp;D stress vectors. It is designed for operational workload planning and ethical AI verification; it does not process live classified personnel files.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-neutral-border bg-white flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-sans">
            SETU (सेतु) • Parametric Simulation Runtime &lt; 20ms
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs transition-colors"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
};
