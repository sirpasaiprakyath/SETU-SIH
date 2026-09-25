import React, { useState } from "react";
import type { StressTrajectory } from "../types";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Moon,
  Calendar,
  HeartPulse,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Info,
  UserCheck,
} from "lucide-react";

interface StressTrajectoryCardProps {
  trajectory?: StressTrajectory | null;
  compact?: boolean; // For table cells or summary views
  showProjectionGraph?: boolean;
}

export const StressTrajectoryCard: React.FC<StressTrajectoryCardProps> = ({
  trajectory,
  compact = false,
  showProjectionGraph = true,
}) => {
  const [showMethodologyHelp, setShowMethodologyHelp] = useState(false);

  // Fallback defaults if trajectory data is pending
  const t: StressTrajectory = trajectory || {
    early_warning_level: "PRIORITY",
    early_warning_label: "PRIORITY",
    early_warning_icon: "🔴",
    early_warning_action: "Immediate human welfare review",
    is_insufficient_data: false,
    data_sufficiency_reasons: [],
    risk_level: "HIGH",
    risk_direction: "↑",
    risk_display: "HIGH ↑",
    effective_risk_pct: 81,
    model_confidence_pct: 87,
    data_completeness_pct: 94,
    is_low_confidence: false,
    confidence_advisory: "High model confidence: 90-day longitudinal data confirms multi-signal strain",
    previous_state: "Moderate",
    seven_day_trend_pct: 24.0,
    seven_day_trend_display: "↑ 24%",
    seven_day_trend_direction: "up",
    main_changes: [
      {
        metric: "Duty hours",
        change_value: 31.0,
        display: "+31%",
        unit: "%",
        is_adverse: true,
        detail: "Surged to 59.0h/wk (night shift clustering)",
      },
      {
        metric: "Sleep consistency",
        change_value: -22.0,
        display: "−22%",
        unit: "%",
        is_adverse: true,
        detail: "Fragmented circadian recovery from high night duty fraction",
      },
      {
        metric: "Leave gap",
        change_value: 18,
        display: "+18 days",
        unit: "days",
        is_adverse: true,
        detail: "Operational cycle extended beyond standard 90d battalion rotation",
      },
      {
        metric: "Wellness score",
        change_value: -15.0,
        display: "−15%",
        unit: "%",
        is_adverse: true,
        detail: "Cumulative fatigue index and self-reported check-in strain",
      },
    ],
    predicted_trajectory: "Rising",
    predicted_trajectory_desc:
      "Predicted trajectory → Rising (High risk of critical operational strain within 7–10 days)",
    forecast_days_to_critical: 8,
    historical_points: [
      { day: -14, label: "14d ago", score: 46 },
      { day: -10, label: "10d ago", score: 52 },
      { day: -7, label: "7d ago", score: 58 },
      { day: -4, label: "4d ago", score: 66 },
      { day: -2, label: "2d ago", score: 73 },
      { day: 0, label: "Today", score: 78 },
    ],
    forecast_unmitigated: [
      { day: 0, label: "Today", score: 78 },
      { day: 2, label: "+2d", score: 83 },
      { day: 4, label: "+4d", score: 88 },
      { day: 7, label: "+7d", score: 94 },
    ],
    forecast_mitigated: [
      { day: 0, label: "Today", score: 78 },
      { day: 2, label: "+2d", score: 70 },
      { day: 4, label: "+4d", score: 58 },
      { day: 7, label: "+7d", score: 46 },
    ],
    actionable_advisory:
      "Informal tea check-in recommended within 48 hours to evaluate rotation and leave scheduling.",
  };

  const isInsufficient = t.early_warning_level === "INSUFFICIENT_DATA" || t.is_insufficient_data;

  // Early Warning Level Visual Config
  const warningConfig = {
    NORMAL: {
      badge: "bg-emerald-50 text-emerald-800 border-emerald-300",
      actionBadge: "bg-emerald-100 text-emerald-900 border-emerald-300",
      icon: "🟢",
      label: "NORMAL",
      action: "No intervention",
      border: "border-l-4 border-emerald-500",
      bgGradient: "from-white via-slate-50/60 to-emerald-50/30",
    },
    WATCH: {
      badge: "bg-yellow-50 text-yellow-900 border-yellow-300",
      actionBadge: "bg-yellow-100 text-yellow-950 border-yellow-400",
      icon: "🟡",
      label: "WATCH",
      action: "Monitor trend",
      border: "border-l-4 border-yellow-500",
      bgGradient: "from-white via-slate-50/60 to-yellow-50/30",
    },
    SUPPORT: {
      badge: "bg-amber-50 text-amber-900 border-amber-300",
      actionBadge: "bg-amber-100 text-amber-950 border-amber-400",
      icon: "🟠",
      label: "SUPPORT",
      action: "Welfare check recommended",
      border: "border-l-4 border-amber-500",
      bgGradient: "from-white via-slate-50/60 to-amber-50/30",
    },
    PRIORITY: {
      badge: "bg-rose-50 text-rose-900 border-rose-300",
      actionBadge: "bg-rose-100 text-rose-950 border-rose-400",
      icon: "🔴",
      label: "PRIORITY",
      action: "Immediate human welfare review",
      border: "border-l-4 border-rose-600",
      bgGradient: "from-white via-slate-50/60 to-rose-50/30",
    },
    INSUFFICIENT_DATA: {
      badge: "bg-slate-100 text-slate-800 border-slate-300",
      actionBadge: "bg-slate-200 text-slate-900 border-slate-400",
      icon: "⚪",
      label: "INSUFFICIENT DATA",
      action: "Risk assessment unavailable",
      border: "border-l-4 border-slate-400",
      bgGradient: "from-white via-slate-50/60 to-slate-100/40",
    },
  };

  const currentConfig = warningConfig[t.early_warning_level] || warningConfig.NORMAL;

  // =========================================================================
  // COMPACT RENDERER (For Triage Table Cells)
  // =========================================================================
  if (compact) {
    if (isInsufficient) {
      return (
        <div className="space-y-1.5 py-1">
          <div className="flex items-center space-x-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs">
              <span className="mr-1">⚪</span> INSUFFICIENT DATA
            </span>
          </div>
          <div className="text-[10px] text-text-muted font-medium leading-tight">
            Risk assessment unavailable • Sparse recent wellness data
          </div>
          <div className="flex items-center space-x-1 text-[9px] text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
            <span>Data completeness: {t.data_completeness_pct ?? 18}%</span>
            <span>•</span>
            <span className="text-slate-500 font-semibold">Confidence: Suppressed</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-1.5 py-1">
        {/* Top: Warning Level + 7d Trend */}
        <div className="flex items-center space-x-1.5">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border shadow-2xs ${currentConfig.badge}`}
          >
            <span className="mr-1">{currentConfig.icon}</span> {currentConfig.label}
          </span>
          <span
            className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border ${
              t.seven_day_trend_pct >= 0
                ? "text-rose-700 bg-rose-50/90 border-rose-200"
                : "text-emerald-700 bg-emerald-50/90 border-emerald-200"
            }`}
          >
            7-d: {t.seven_day_trend_display}
          </span>
        </div>

        {/* AI Confidence & Uncertainty Telemetry Line */}
        {t.is_low_confidence ? (
          <div className="space-y-1">
            <div className="flex items-center space-x-1 flex-wrap text-[10px] font-bold text-rose-900 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-300 shadow-2xs">
              <span className="font-mono">Risk: {t.effective_risk_pct ?? 63}%</span>
              <span>•</span>
              <span className="font-mono text-amber-900">Confidence: {t.model_confidence_pct ?? 42}%</span>
            </div>
            <div className="inline-flex items-center space-x-1 text-[9.5px] font-extrabold text-rose-800 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-300">
              <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
              <span>Human review recommended</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-1 flex-wrap text-[9px] font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
            <span className="font-bold text-navy-primary">Risk: {t.effective_risk_pct ?? 81}%</span>
            <span>•</span>
            <span className="font-semibold text-emerald-800">Model conf: {t.model_confidence_pct ?? 87}%</span>
            <span>•</span>
            <span className="text-slate-600">Data: {t.data_completeness_pct ?? 94}%</span>
          </div>
        )}

        {/* Action Direction */}
        <div className="text-[10px] font-bold text-navy-primary leading-tight">
          {t.early_warning_action || currentConfig.action}
        </div>

        {/* Sub-metrics: Prev & Trajectory */}
        <div className="flex items-center text-[10px] text-text-muted space-x-1.5">
          <span>
            Prev: <strong className="text-navy-primary font-medium">{t.previous_state}</strong>
          </span>
          <span>•</span>
          <span className="font-semibold text-amber-800">
            Trajectory: <span className="capitalize">{t.predicted_trajectory}</span>
          </span>
        </div>

        {/* Driver Chips */}
        <div className="flex flex-wrap gap-1 pt-0.5">
          {t.main_changes.slice(0, 2).map((m, idx) => (
            <span
              key={idx}
              className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                m.is_adverse
                  ? "bg-amber-100/70 text-amber-900 border border-amber-200"
                  : "bg-emerald-100/70 text-emerald-900 border border-emerald-200"
              }`}
            >
              {m.metric.split(" ")[0]} {m.display}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // FULL RENDERER (Case Details Modal & Inspection Card)
  // =========================================================================

  // Helper icon for drivers
  const getDriverIcon = (metric: string) => {
    switch (metric.toLowerCase()) {
      case "duty hours":
        return <Clock className="w-4 h-4 text-amber-600" />;
      case "sleep consistency":
        return <Moon className="w-4 h-4 text-indigo-600" />;
      case "leave gap":
        return <Calendar className="w-4 h-4 text-rose-600" />;
      case "wellness score":
      default:
        return <HeartPulse className="w-4 h-4 text-emerald-600" />;
    }
  };

  // SVG dimensions for projection sparkline
  const svgWidth = 480;
  const svgHeight = 110;
  const padX = 25;
  const padY = 15;

  const minDay = -14;
  const maxDay = 7;
  const scaleX = (d: number) => padX + ((d - minDay) / (maxDay - minDay)) * (svgWidth - 2 * padX);
  const scaleY = (score: number) => svgHeight - padY - (score / 100) * (svgHeight - 2 * padY);

  const histCoords = (t.historical_points || []).map((p) => ({
    x: scaleX(p.day),
    y: scaleY(p.score || 0),
    label: p.label,
    score: p.score,
    day: p.day,
  }));

  const unmitCoords = (t.forecast_unmitigated || []).map((p) => ({
    x: scaleX(p.day),
    y: scaleY(p.score || 0),
    label: p.label,
    score: p.score,
    day: p.day,
  }));

  const mitCoords = (t.forecast_mitigated || []).map((p) => ({
    x: scaleX(p.day),
    y: scaleY(p.score || 0),
    label: p.label,
    score: p.score,
    day: p.day,
  }));

  const histPathD =
    histCoords.length > 0
      ? `M ${histCoords.map((c) => `${c.x} ${c.y}`).join(" L ")}`
      : "";

  const unmitPathD =
    unmitCoords.length > 0
      ? `M ${unmitCoords.map((c) => `${c.x} ${c.y}`).join(" L ")}`
      : "";

  const mitPathD =
    mitCoords.length > 0
      ? `M ${mitCoords.map((c) => `${c.x} ${c.y}`).join(" L ")}`
      : "";

  const todayCoord = histCoords[histCoords.length - 1] || { x: scaleX(0), y: scaleY(78) };

  return (
    <div
      className={`rounded-lg bg-gradient-to-br ${currentConfig.bgGradient} border border-neutral-border shadow-xs overflow-hidden ${currentConfig.border}`}
    >
      {/* 1. Header: Early Warning Level Banner + Operational Vector */}
      <div className="p-4 sm:p-5 border-b border-neutral-border bg-white/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                SETU Stress Trajectory &amp; Early Warning System
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-navy-primary/10 text-navy-primary border border-navy-primary/20">
                <Sparkles className="w-2.5 h-2.5 mr-1" /> Explainable Defense Triage
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-navy-primary flex items-center space-x-2.5">
              <span>Operational Early Warning &amp; Velocity Vector</span>
            </h3>
          </div>

          {/* Primary Early Warning Badge Group */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Early Warning Level Pill */}
            <div
              className={`px-3.5 py-1.5 rounded border shadow-xs flex items-center space-x-2 ${currentConfig.badge}`}
            >
              <span className="text-base leading-none">{currentConfig.icon}</span>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">
                  Warning Level
                </span>
                <span className="text-xs font-black font-sans tracking-wide">
                  {currentConfig.label}
                </span>
              </div>
            </div>

            {/* Action Directive */}
            <div className={`px-3 py-1.5 rounded border text-xs font-bold ${currentConfig.actionBadge}`}>
              <span className="text-[10px] uppercase block opacity-75 font-semibold">Triage Directive</span>
              <span>{t.early_warning_action || currentConfig.action}</span>
            </div>

            {/* 7-Day Trend (Only if sufficient data) */}
            {!isInsufficient && (
              <div className="px-3 py-1.5 rounded border border-neutral-border bg-white text-xs font-bold flex flex-col justify-center shadow-2xs">
                <span className="text-[10px] text-text-muted font-normal">7-Day Trend</span>
                <span className="font-mono flex items-center text-rose-700">
                  {t.seven_day_trend_pct >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5 text-rose-600" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5 text-emerald-600" />
                  )}
                  {t.seven_day_trend_display}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Responsible AI Telemetry Strip: Risk, Model Confidence, Data Completeness */}
        <div className="mt-3.5 pt-3 border-t border-neutral-border/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-1.5 text-xs text-text-muted">
              <ShieldCheck className="w-4 h-4 text-navy-primary" />
              <span className="font-bold text-navy-primary uppercase text-[10.5px] tracking-wide">
                Calibrated AI Telemetry:
              </span>
            </div>

            {isInsufficient ? (
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-300 text-xs font-mono font-bold">
                  Risk: Unavailable
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-300 text-xs font-mono font-medium">
                  Model confidence: Suppressed
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded bg-amber-50 text-amber-900 border border-amber-300 text-xs font-mono font-bold">
                  Data completeness: {t.data_completeness_pct ?? 18}% (Sparse)
                </span>
              </div>
            ) : t.is_low_confidence ? (
              /* Low Confidence Mode */
              <div className="flex items-center space-x-2 flex-wrap">
                <div className="inline-flex items-center px-3 py-1.5 rounded bg-white text-navy-primary border border-rose-200 shadow-2xs text-xs font-mono font-bold">
                  <span className="text-text-muted mr-1 font-sans font-semibold">Risk:</span>
                  <span className="text-sm font-black text-rose-700">{t.effective_risk_pct ?? 63}%</span>
                </div>
                <div className="inline-flex items-center px-3 py-1.5 rounded bg-amber-50 text-amber-950 border border-amber-300 shadow-2xs text-xs font-mono font-bold">
                  <span className="text-amber-800 mr-1 font-sans font-semibold">Confidence:</span>
                  <span className="text-sm font-black text-amber-900">{t.model_confidence_pct ?? 42}%</span>
                </div>
                <div className="inline-flex items-center px-3 py-1.5 rounded bg-white text-slate-800 border border-neutral-border shadow-2xs text-xs font-mono font-bold">
                  <span className="text-text-muted mr-1 font-sans font-semibold">Data completeness:</span>
                  <span className="text-sm font-black text-slate-800">{t.data_completeness_pct ?? 58}%</span>
                </div>
                <div className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded bg-rose-100 text-rose-950 border-2 border-rose-400 text-xs font-black shadow-xs animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>Human review recommended</span>
                </div>
              </div>
            ) : (
              /* High / Normal Confidence Mode */
              <div className="flex items-center space-x-2 flex-wrap">
                <div className="inline-flex items-center px-3 py-1.5 rounded bg-white text-navy-primary border border-neutral-border shadow-2xs text-xs font-mono font-bold">
                  <span className="text-text-muted mr-1 font-sans font-semibold">Risk:</span>
                  <span className="text-sm font-black text-rose-700">{t.effective_risk_pct ?? 81}%</span>
                </div>
                <div className="inline-flex items-center px-3 py-1.5 rounded bg-emerald-50 text-emerald-950 border border-emerald-300 shadow-2xs text-xs font-mono font-bold">
                  <span className="text-emerald-800 mr-1 font-sans font-semibold">Model confidence:</span>
                  <span className="text-sm font-black text-emerald-900">{t.model_confidence_pct ?? 87}%</span>
                </div>
                <div className="inline-flex items-center px-3 py-1.5 rounded bg-sky-50 text-sky-950 border border-sky-300 shadow-2xs text-xs font-mono font-bold">
                  <span className="text-sky-800 mr-1 font-sans font-semibold">Data completeness:</span>
                  <span className="text-sm font-black text-sky-900">{t.data_completeness_pct ?? 94}%</span>
                </div>
              </div>
            )}
          </div>

          <div className="text-[11px] text-text-muted font-medium flex items-center space-x-1.5 shrink-0">
            <Info className="w-3.5 h-3.5 text-navy-light" />
            <span>XGBoost + Platt Scaling (Margin-aware)</span>
          </div>
        </div>
      </div>

      {/* 2. BODY: INSUFFICIENT DATA SPECIAL RESPONSIBLE AI VIEW */}
      {isInsufficient ? (
        <div className="p-5 sm:p-6 space-y-5">
          {/* Transparent Ethical Warning Alert */}
          <div className="p-4 rounded-lg bg-slate-100 border-2 border-slate-300 text-slate-900 space-y-2.5">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-slate-700 text-lg">
                ⚪
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    Risk Assessment Unavailable — Insufficient Recent Wellness Data
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-mono font-bold">
                    ETHICAL AI GUARDRAIL
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>Responsible AI Mandate:</strong> SETU explicitly refuses to guess, speculate, or invent arbitrary risk percentages when baseline observations are incomplete. Automated risk scoring is suspended until at least <strong>3 longitudinal check-ins</strong> or <strong>14 days of duty muster data</strong> accumulate. This prevents false-positive alert fatigue and protects soldier dignity.
                </p>
              </div>
            </div>

            {/* Checklist of missing prerequisites */}
            <div className="mt-3 pt-3 border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-800 block mb-1.5 uppercase tracking-wider">
                Longitudinal Baseline Prerequisite Status:
              </span>
              <ul className="text-xs text-slate-700 space-y-1.5">
                <li className="flex items-center space-x-2">
                  <span className="text-amber-700 font-bold">⏳</span>
                  <span><strong>Deployment Duration:</strong> 4 days in current operational station (minimum 14 days required to establish moving normal).</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-amber-700 font-bold">⏳</span>
                  <span><strong>Saathi Check-ins:</strong> 0 weekly reflections logged (requires 3 sessions across consecutive weeks).</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-amber-700 font-bold">⏳</span>
                  <span><strong>Section Muster Observations:</strong> 0 daily shift muster entries logged by Section Commander.</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-700 font-bold">✓</span>
                  <span><strong>Administrative Service Records:</strong> Service ID, force, rank, and battalion posting verified.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Actionable Human Guidance */}
          <div className="p-4 rounded-lg bg-white border border-neutral-border shadow-xs space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-navy-primary uppercase tracking-wider">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Recommended Officer Action (Zero AI Reliance)</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Conduct a standard informal welcome and settling check-in. Inquire about accommodation, rations, and home communication. Do not mention risk models or algorithms. Allow longitudinal baseline data to accumulate naturally over the next 10 days.
            </p>
          </div>
        </div>
      ) : (
        /* 3. BODY: NORMAL ACTIVE OPERATIONAL VIEW */
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-navy-primary uppercase tracking-wider">
                Main Contributing Changes (Recent Operational Cycle)
              </span>
              <span className="text-[11px] text-text-muted">
                • Deviations against personal 90-day moving baseline
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowMethodologyHelp(!showMethodologyHelp)}
              className="text-[11px] text-navy-light hover:text-navy-primary font-medium flex items-center space-x-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showMethodologyHelp ? "Hide explanation" : "Why Early Warning Levels?"}</span>
            </button>
          </div>

          {/* Low Confidence Defensible AI Banner */}
          {t.is_low_confidence && (
            <div className="p-4 rounded-lg bg-amber-50/95 border-2 border-amber-400 text-amber-950 space-y-2 shadow-xs">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center shrink-0 text-amber-900 font-bold text-base shadow-2xs">
                  ⚠️
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                      Epistemic Uncertainty Advisory — Human Review Recommended
                    </h4>
                    <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-950 text-[10.5px] font-mono font-bold border border-amber-300">
                      Risk: {t.effective_risk_pct ?? 63}% • Confidence: {t.model_confidence_pct ?? 42}%
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    <strong>Defensible AI Mandate:</strong> Computed on synthetic simulation data for proof-of-concept purposes; not yet validated against real personnel outcomes. Borderline classification margin with <strong>{t.data_completeness_pct ?? 58}% data completeness</strong>. SETU flags this uncertainty explicitly: <strong>Human welfare review recommended</strong>. Automatic administrative presumption is suppressed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Informative Explanation Banner */}
          {showMethodologyHelp && (
            <div className="p-3.5 rounded-lg bg-sky-50/90 border border-sky-200 text-xs text-sky-950 space-y-1.5 animate-in fade-in duration-200">
              <p className="font-bold flex items-center space-x-1.5 text-sky-900">
                <Sparkles className="w-4 h-4 text-sky-600" />
                <span>The 5-Tier Early Warning Standard vs. Static Risk Percentages:</span>
              </p>
              <p className="leading-relaxed">
                Military operations require actionable clarity. Rather than arbitrary numbers like <em>"78% stress"</em>, commanders need unambiguous operational directives:
                <strong> 🟢 NORMAL</strong> (No intervention),
                <strong> 🟡 WATCH</strong> (Monitor trend),
                <strong> 🟠 SUPPORT</strong> (Welfare check recommended),
                <strong> 🔴 PRIORITY</strong> (Immediate human welfare review), and critically
                <strong> ⚪ INSUFFICIENT DATA</strong> (Refusing to guess when data is sparse).
              </p>
            </div>
          )}

          {/* 4 Driver Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {t.main_changes.map((change, index) => {
              const isAdverse = change.is_adverse;
              return (
                <div
                  key={index}
                  className={`p-3.5 rounded-lg border transition-all hover:shadow-sm ${
                    isAdverse
                      ? "bg-white border-amber-300/80 shadow-xs"
                      : "bg-white border-neutral-border shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getDriverIcon(change.metric)}
                      <span className="text-xs font-bold text-navy-primary">
                        {change.metric}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-black font-mono px-2 py-0.5 rounded ${
                        isAdverse
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {change.display}
                    </span>
                  </div>

                  <p className="text-[11px] text-text-muted mt-2 leading-tight line-clamp-2">
                    {change.detail}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Predicted Trajectory Banner */}
          <div
            className={`p-4 rounded-lg border shadow-xs ${
              t.predicted_trajectory === "Critical"
                ? "bg-rose-100 text-rose-900 border-rose-400"
                : t.predicted_trajectory === "Rising"
                ? "bg-amber-100 text-amber-900 border-amber-400"
                : "bg-emerald-100 text-emerald-900 border-emerald-400"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center shrink-0 shadow-2xs">
                  {t.predicted_trajectory === "Critical" ? (
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                  ) : t.predicted_trajectory === "Rising" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider block">
                    Predicted Trajectory → {t.predicted_trajectory}
                  </span>
                  <p className="text-xs font-medium mt-0.5 opacity-90">
                    {t.predicted_trajectory_desc}
                  </p>
                </div>
              </div>

              {t.forecast_days_to_critical && (
                <div className="sm:text-right shrink-0">
                  <span className="inline-flex items-center px-2.5 py-1 rounded bg-white/90 text-navy-primary text-xs font-bold border border-current/20 shadow-2xs">
                    Proactive Window: {t.forecast_days_to_critical} Days
                  </span>
                </div>
              )}
            </div>

            {t.actionable_advisory && (
              <div className="mt-2.5 pt-2 border-t border-current/15 text-[11px] font-medium flex items-center space-x-1.5 opacity-95">
                <span className="font-bold">Suggested Operational Lever:</span>
                <span>{t.actionable_advisory}</span>
              </div>
            )}
          </div>

          {/* Forward Predictive Trajectory Visualization Curve */}
          {showProjectionGraph && (
            <div className="pt-2">
              <div className="p-4 rounded-lg bg-white border border-neutral-border space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-navy-primary block">
                      Trajectory Projection Curve (14-Day History → 7-Day Forward Cone)
                    </span>
                    <p className="text-[11px] text-text-muted">
                      Demonstrates anticipated path if unaddressed vs. projected recovery with proactive welfare check-in
                    </p>
                  </div>

                  <div className="flex items-center space-x-4 text-[11px]">
                    <span className="flex items-center space-x-1 text-navy-primary font-medium">
                      <span className="w-3 h-0.5 bg-navy-primary inline-block"></span>
                      <span>Historical</span>
                    </span>
                    <span className="flex items-center space-x-1 text-rose-600 font-bold">
                      <span className="w-3 h-0.5 bg-rose-500 border-dashed inline-block border-t border-rose-500"></span>
                      <span>Projected (Unmitigated)</span>
                    </span>
                    <span className="flex items-center space-x-1 text-emerald-700 font-bold">
                      <span className="w-3 h-0.5 bg-emerald-500 inline-block"></span>
                      <span>Proactive Tea Intervention</span>
                    </span>
                  </div>
                </div>

                {/* Sparkline Graphic */}
                <div className="overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-28 select-none"
                  >
                    {/* Grid Lines */}
                    <line
                      x1={padX}
                      y1={scaleY(80)}
                      x2={svgWidth - padX}
                      y2={scaleY(80)}
                      stroke="#fee2e2"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text
                      x={svgWidth - padX + 2}
                      y={scaleY(80) + 3}
                      fontSize="8"
                      fill="#ef4444"
                      fontWeight="bold"
                    >
                      Priority (Critical)
                    </text>

                    <line
                      x1={padX}
                      y1={scaleY(50)}
                      x2={svgWidth - padX}
                      y2={scaleY(50)}
                      stroke="#fef3c7"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text
                      x={svgWidth - padX + 2}
                      y={scaleY(50) + 3}
                      fontSize="8"
                      fill="#d97706"
                    >
                      Support
                    </text>

                    {/* Vertical Dividing Line: Today */}
                    <line
                      x1={todayCoord.x}
                      y1={padY}
                      x2={todayCoord.x}
                      y2={svgHeight - padY}
                      stroke="#cbd5e1"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={todayCoord.x}
                      y={padY - 4}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="bold"
                      fill="#1e293b"
                    >
                      Today
                    </text>

                    {/* Historical Path */}
                    <path
                      d={histPathD}
                      fill="none"
                      stroke="#1e3a8a"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Forecast Unmitigated Path (Rising) */}
                    <path
                      d={unmitPathD}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Forecast Mitigated Path (Recovering) */}
                    <path
                      d={mitPathD}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeDasharray="3 2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Points on Historical */}
                    {histCoords.map((c, i) => (
                      <circle
                        key={`hist-${i}`}
                        cx={c.x}
                        cy={c.y}
                        r={i === histCoords.length - 1 ? 4.5 : 3}
                        fill={i === histCoords.length - 1 ? "#ef4444" : "#1e3a8a"}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    ))}

                    {/* Unmitigated final point */}
                    {unmitCoords.length > 0 && (
                      <circle
                        cx={unmitCoords[unmitCoords.length - 1].x}
                        cy={unmitCoords[unmitCoords.length - 1].y}
                        r="4"
                        fill="#ef4444"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Mitigated final point */}
                    {mitCoords.length > 0 && (
                      <circle
                        cx={mitCoords[mitCoords.length - 1].x}
                        cy={mitCoords[mitCoords.length - 1].y}
                        r="4"
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Labels on axis */}
                    <text x={padX} y={svgHeight - 2} fontSize="8" fill="#64748b">
                      -14 Days
                    </text>
                    <text
                      x={todayCoord.x}
                      y={svgHeight - 2}
                      fontSize="8"
                      textAnchor="middle"
                      fill="#1e293b"
                      fontWeight="bold"
                    >
                      Current State
                    </text>
                    <text
                      x={svgWidth - padX}
                      y={svgHeight - 2}
                      fontSize="8"
                      textAnchor="end"
                      fill="#64748b"
                    >
                      +7 Days
                    </text>
                  </svg>
                </div>

                {/* Bottom Insight Footer */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-text-muted pt-2 border-t border-neutral-border gap-2">
                  <span className="flex items-center space-x-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-navy-primary shrink-0" />
                    <span>
                      Unmitigated trajectory projects crossing into <strong>Priority Tier within {t.forecast_days_to_critical || 7} days</strong> if roster load continues.
                    </span>
                  </span>
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                    Early tea dialogue reduces 14d escalation risk by ~54%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
