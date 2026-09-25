import React, { useEffect, useState } from "react";
import type { User, CommandMetrics } from "../types";
import { apiGetCommandMetrics } from "../api";
import {
  BarChart3,
  TrendingUp,
  Layers,
  Calendar,
  Clock,
  AlertCircle,
  EyeOff,
  CheckCircle2,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
} from "lucide-react";

interface CommandViewProps {
  currentUser: User;
}

export const CommandView: React.FC<CommandViewProps> = ({ currentUser }) => {
  const [metrics, setMetrics] = useState<CommandMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubunit, setSelectedSubunit] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await apiGetCommandMetrics();
      setMetrics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-primary mx-auto mb-3"></div>
        <p className="text-sm text-text-muted">Aggregating battalion and sector operational metrics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Top Banner with Strict MHA Privacy Guarantee */}
      <div className="gov-card p-6 border-l-4 border-navy-primary bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="badge-navy font-bold">Command Leadership Console</span>
              <span className="text-[11px] text-text-muted">| Workload &amp; Rotation Planning</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-navy-primary mt-1">
              Unit-Level Operational Strain &amp; Rotation Overview
            </h1>
            <p className="text-xs text-text-muted mt-1 font-sans">
              Unit Scope: <span className="font-semibold text-navy-primary">{metrics?.unit_scope}</span> • Commander: <span className="font-semibold text-navy-primary">{currentUser.full_name}</span> • Total Active Strength: <span className="font-semibold text-navy-primary">{metrics?.total_active_strength} personnel</span>
            </p>
          </div>

          {/* Privacy Protocol Badge */}
          <div className="p-3 bg-neutral-card border border-neutral-border rounded-[2px] text-xs flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-[2px] bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <EyeOff className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-bold text-navy-primary">Strict Privacy Boundary Active</p>
              <p className="text-[11px] text-text-muted">Zero individual names or flags displayed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Unit-Level Stress Trajectory & Forward Velocity Overview */}
      {metrics?.trajectory_distribution && (
        <div className="gov-card p-5 border-l-4 border-navy-primary bg-gradient-to-r from-white via-slate-50 to-blue-50/30">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-navy-primary bg-navy-primary/10 px-2 py-0.5 rounded border border-navy-primary/20">
                  Early Warning Tiers &amp; Trajectory Distribution
                </span>
                <span className="text-xs text-text-muted">7-Day Forward Horizon</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-navy-primary mt-1">
                Battalion Early Warning Levels &amp; Trajectory
              </h2>
              <p className="text-xs text-text-muted mt-0.5 max-w-xl">
                Replaces speculative risk percentages with unambiguous, actionable military tiers. Suspends scoring on sparse data to eliminate false-positive alert fatigue.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* 🟢 Normal */}
              <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-center min-w-[85px]">
                <span className="text-[9px] uppercase font-bold text-emerald-900 tracking-wider block">🟢 Normal</span>
                <span className="text-base font-bold text-emerald-900 font-mono leading-tight">
                  {metrics.trajectory_distribution.normal_pct ?? metrics.trajectory_distribution.stable_pct}%
                </span>
                <span className="text-[9px] text-emerald-700 block">
                  {metrics.trajectory_distribution.normal_count ?? metrics.trajectory_distribution.stable_count} personnel
                </span>
              </div>

              {/* 🟡 Watch */}
              <div className="px-2.5 py-1.5 rounded-lg bg-yellow-50 border border-yellow-300 text-center min-w-[85px]">
                <span className="text-[9px] uppercase font-bold text-yellow-900 tracking-wider block">🟡 Watch</span>
                <span className="text-base font-bold text-yellow-900 font-mono leading-tight">
                  {metrics.trajectory_distribution.watch_pct ?? 18}%
                </span>
                <span className="text-[9px] text-yellow-800 block">
                  {metrics.trajectory_distribution.watch_count ?? 18} personnel
                </span>
              </div>

              {/* 🟠 Support */}
              <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-center min-w-[85px]">
                <span className="text-[9px] uppercase font-bold text-amber-900 tracking-wider block">🟠 Support</span>
                <span className="text-base font-bold text-amber-900 font-mono leading-tight">
                  {metrics.trajectory_distribution.support_pct ?? metrics.trajectory_distribution.rising_pct}%
                </span>
                <span className="text-[9px] text-amber-800 block">
                  {metrics.trajectory_distribution.support_count ?? metrics.trajectory_distribution.rising_count} personnel
                </span>
              </div>

              {/* 🔴 Priority */}
              <div className="px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-300 text-center min-w-[85px]">
                <span className="text-[9px] uppercase font-bold text-rose-900 tracking-wider block">🔴 Priority</span>
                <span className="text-base font-bold text-rose-900 font-mono leading-tight">
                  {metrics.trajectory_distribution.priority_pct ?? metrics.trajectory_distribution.critical_pct}%
                </span>
                <span className="text-[9px] text-rose-800 block">
                  {metrics.trajectory_distribution.priority_count ?? metrics.trajectory_distribution.critical_count} personnel
                </span>
              </div>

              {/* ⚪ Insufficient Data */}
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-center min-w-[85px]" title="Responsible AI: Scoring suppressed for newly posted personnel (<14d)">
                <span className="text-[9px] uppercase font-bold text-slate-800 tracking-wider block">⚪ Sparse</span>
                <span className="text-base font-bold text-slate-900 font-mono leading-tight">
                  {metrics.trajectory_distribution.insufficient_pct ?? 2}%
                </span>
                <span className="text-[9px] text-slate-600 block">
                  {metrics.trajectory_distribution.insufficient_count ?? 2} new joiners
                </span>
              </div>
            </div>
          </div>

          {/* Progress bar visualizer */}
          <div className="mt-3 pt-3 border-t border-neutral-border">
            <div className="h-2.5 w-full rounded-full bg-slate-200 flex overflow-hidden">
              <div
                style={{ width: `${metrics.trajectory_distribution.normal_pct ?? metrics.trajectory_distribution.stable_pct}%` }}
                className="bg-emerald-500 h-full"
                title={`Normal: ${metrics.trajectory_distribution.normal_pct ?? metrics.trajectory_distribution.stable_pct}%`}
              />
              <div
                style={{ width: `${metrics.trajectory_distribution.watch_pct ?? 18}%` }}
                className="bg-yellow-400 h-full"
                title={`Watch: ${metrics.trajectory_distribution.watch_pct ?? 18}%`}
              />
              <div
                style={{ width: `${metrics.trajectory_distribution.support_pct ?? metrics.trajectory_distribution.rising_pct}%` }}
                className="bg-amber-500 h-full"
                title={`Support: ${metrics.trajectory_distribution.support_pct ?? metrics.trajectory_distribution.rising_pct}%`}
              />
              <div
                style={{ width: `${metrics.trajectory_distribution.priority_pct ?? metrics.trajectory_distribution.critical_pct}%` }}
                className="bg-rose-500 h-full"
                title={`Priority: ${metrics.trajectory_distribution.priority_pct ?? metrics.trajectory_distribution.critical_pct}%`}
              />
              <div
                style={{ width: `${metrics.trajectory_distribution.insufficient_pct ?? 2}%` }}
                className="bg-slate-400 h-full"
                title={`Insufficient Data: ${metrics.trajectory_distribution.insufficient_pct ?? 2}%`}
              />
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-text-muted mt-1.5 font-sans gap-1">
              <span>{metrics.trajectory_distribution.headline_summary}</span>
              <span className="text-navy-primary font-medium">⚪ Insufficient Data indicates ethical suppression (new arrivals awaiting 14d baseline)</span>
            </div>
          </div>
        </div>
      )}

      {/* Primary Aggregate Indicators Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="gov-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">Avg Weekly Duty Load</span>
            <Clock className="w-4 h-4 text-navy-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-navy-primary mt-2">
            {metrics?.operational_indicators.average_weekly_duty_hours} hrs
          </div>
          <p className="text-[11px] text-text-muted mt-1">Target benchmark: 48.0 hrs/week</p>
        </div>

        <div className="gov-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">Rest-Day Compliance</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-navy-primary mt-2">
            {metrics?.operational_indicators.force_rest_compliance_pct}%
          </div>
          <p className="text-[11px] text-text-muted mt-1">Target benchmark: &gt;85% compliance</p>
        </div>

        <div className="gov-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">Annual Leave Utilisation</span>
            <Calendar className="w-4 h-4 text-gold" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-navy-primary mt-2">
            {metrics?.operational_indicators.force_leave_utilisation_pct}%
          </div>
          <p className="text-[11px] text-text-muted mt-1">Baseline quota: 30 days/yr</p>
        </div>

        <div className="gov-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">Fatigue Proxy Index</span>
            <TrendingUp className="w-4 h-4 text-khaki" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-navy-primary mt-2">
            {metrics?.operational_indicators.average_fatigue_proxy_index} / 100
          </div>
          <p className="text-[11px] text-text-muted mt-1">SAFTE-FAST inspired composite</p>
        </div>
      </div>

      {/* UNIT WELFARE RADAR (Heatmap Grid &amp; Interactive Telemetry Drawer) */}
      <div className="gov-card p-5 border-t-4 border-gold">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-neutral-border">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-gold/20 text-navy-primary border border-gold/40">
                Operational Subunit Telemetry
              </span>
              <span className="text-xs text-text-muted">Live Command Grid</span>
            </div>
            <h2 className="text-lg font-serif font-bold text-navy-primary mt-1 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-gold-dark" />
              <span>UNIT WELFARE RADAR</span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Click any company or formation box to inspect operational strain drivers (fatigue, workload imbalance, recovery compliance). Individual identities are strictly sealed.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center space-x-1 font-medium text-emerald-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Normal</span>
            </span>
            <span className="flex items-center space-x-1 font-medium text-yellow-800">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"></span>
              <span>Watch</span>
            </span>
            <span className="flex items-center space-x-1 font-medium text-amber-800">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              <span>Support</span>
            </span>
            <span className="flex items-center space-x-1 font-medium text-rose-800">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span>Priority</span>
            </span>
          </div>
        </div>

        {/* 2x3 or 2x2 Interactive Radar Heatmap Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {metrics?.company_level_metrics.map((c, idx) => {
            const isSelected = selectedSubunit === c.subunit_name;
            const level = c.radar_level || "normal";

            // Visual theme mapping
            const colorClasses = {
              normal: {
                bg: "bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-300",
                selectedBg: "bg-emerald-100 border-emerald-500 ring-2 ring-emerald-400",
                badgeBg: "bg-emerald-200 text-emerald-900",
                icon: "🟢",
                label: "NORMAL",
                borderGlow: "border-l-4 border-l-emerald-500",
              },
              watch: {
                bg: "bg-yellow-50/70 hover:bg-yellow-100/80 border-yellow-300",
                selectedBg: "bg-yellow-100 border-yellow-500 ring-2 ring-yellow-400",
                badgeBg: "bg-yellow-200 text-yellow-900",
                icon: "🟡",
                label: "WATCH",
                borderGlow: "border-l-4 border-l-yellow-500",
              },
              support: {
                bg: "bg-amber-50/70 hover:bg-amber-100/80 border-amber-300",
                selectedBg: "bg-amber-100 border-amber-500 ring-2 ring-amber-400",
                badgeBg: "bg-amber-200 text-amber-900",
                icon: "🟠",
                label: "SUPPORT",
                borderGlow: "border-l-4 border-l-amber-500",
              },
              priority: {
                bg: "bg-rose-50/70 hover:bg-rose-100/80 border-rose-300",
                selectedBg: "bg-rose-100 border-rose-500 ring-2 ring-rose-400",
                badgeBg: "bg-rose-200 text-rose-900",
                icon: "🔴",
                label: "PRIORITY",
                borderGlow: "border-l-4 border-l-rose-500",
              },
            }[level];

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedSubunit(isSelected ? null : c.subunit_name)}
                className={`p-3.5 rounded-lg border text-left transition-all duration-200 relative group cursor-pointer ${
                  isSelected ? colorClasses.selectedBg : colorClasses.bg
                } ${colorClasses.borderGlow} shadow-sm hover:shadow-md`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-navy-primary truncate pr-1">
                    {c.subunit_name.split(" ")[0]}
                  </span>
                  <span className="text-base leading-none">{colorClasses.icon}</span>
                </div>

                <div className="text-[11px] text-text-muted truncate mb-2">
                  {c.subunit_name}
                </div>

                <div className="flex items-center justify-between text-[10px] pt-2 border-t border-black/5 font-mono">
                  <span className="text-text-muted">{c.headcount} troops</span>
                  <span className={`px-1.5 py-0.2 rounded font-bold ${colorClasses.badgeBg}`}>
                    {colorClasses.label}
                  </span>
                </div>

                {isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-navy-primary rounded-full ring-2 ring-white" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Company Deep-Dive Telemetry Drawer */}
        {selectedSubunit && (() => {
          const coy = metrics?.company_level_metrics.find(c => c.subunit_name === selectedSubunit);
          if (!coy) return null;

          return (
            <div className="mt-5 p-4 sm:p-5 rounded-lg bg-gradient-to-r from-slate-900 via-navy-primary to-slate-900 text-white shadow-lg animate-fadeIn border border-gold/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-gold tracking-wide uppercase font-mono">
                      Subunit Telemetry Drilldown
                    </span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs text-slate-300 font-mono">
                      Active Strength: {coy.headcount} Personnel
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mt-0.5 flex items-center space-x-2">
                    <span>{coy.subunit_name}</span>
                    <span className="text-sm px-2 py-0.5 rounded bg-white/10 border border-white/20 font-sans">
                      Status: {coy.radar_status || "🟢 NORMAL"}
                    </span>
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="px-3 py-1 rounded bg-white/10 border border-white/10 text-right">
                    <span className="text-[10px] text-slate-300 block uppercase font-mono">
                      Strict Privacy Shield
                    </span>
                    <span className="text-xs font-semibold text-emerald-400">
                      Zero Individual IDs Exposed
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedSubunit(null)}
                    className="p-1 rounded hover:bg-white/20 text-slate-400 hover:text-white transition-colors text-xs px-2"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              {/* The 3 Core Telemetry Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                {/* 1. Fatigue Trend */}
                <div className="p-3.5 rounded bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Fatigue Trend</span>
                    {coy.fatigue_trend_dir === "up" ? (
                      <ArrowUpRight className="w-4 h-4 text-rose-400" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-mono mt-1 text-white flex items-baseline space-x-1.5">
                    <span>{coy.fatigue_trend || "+14%"}</span>
                    <span className="text-xs text-slate-300 font-normal">
                      {coy.fatigue_trend_dir === "up" ? "↑ Rising" : "↓ Easing"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Current Fatigue Proxy: <span className="text-gold font-mono">{coy.fatigue_proxy_index} / 100</span> (vs 28.0 sector benchmark)
                  </p>
                </div>

                {/* 2. Workload Imbalance */}
                <div className="p-3.5 rounded bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Workload Imbalance</span>
                    {coy.workload_imbalance_dir === "up" ? (
                      <ArrowUpRight className="w-4 h-4 text-rose-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-mono mt-1 text-white flex items-baseline space-x-1.5">
                    <span>{coy.workload_imbalance || "+18%"}</span>
                    <span className="text-xs text-slate-300 font-normal">
                      {coy.average_weekly_duty_hours}h / wk
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Standard CAPF target: 48h/wk (variance: <span className="text-gold font-mono">{coy.workload_imbalance}</span>)
                  </p>
                </div>

                {/* 3. Average Recovery Time / Days */}
                <div className="p-3.5 rounded bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Average Recovery Time</span>
                    {coy.rest_day_compliance_pct < 80 ? (
                      <ArrowDownRight className="w-4 h-4 text-rose-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-mono mt-1 text-white flex items-baseline space-x-1.5">
                    <span>{coy.avg_recovery_days_monthly || 3.2} days</span>
                    <span className="text-xs text-slate-300 font-normal">
                      / month
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Rest-Day Compliance: <span className={`font-mono font-bold ${coy.rest_day_compliance_pct < 80 ? "text-rose-400" : "text-emerald-400"}`}>{coy.rest_day_compliance_pct}%</span>
                  </p>
                </div>
              </div>

              {/* Actionable Command Advisory Banner */}
              <div className="mt-4 p-3 rounded bg-white/5 border border-gold/30 flex items-start sm:items-center space-x-2 text-xs">
                <ShieldAlert className="w-4 h-4 text-gold shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <span className="font-bold text-gold">Commander Resourcing Advisory: </span>
                  <span className="text-slate-200">{coy.rotation_advisory}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Subunit (Company) Trend Comparison Table */}
      <div className="gov-card">
        <div className="gov-card-header">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-navy-primary" />
            <h2 className="text-sm font-bold text-navy-primary">
              Company-Level Workload, Sick-Report Trends &amp; Rotation Advisories
            </h2>
          </div>
          <span className="text-xs text-text-muted">For resourcing, rotation, and leave quota scheduling</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full gov-table">
            <thead>
              <tr>
                <th>Subunit / Company</th>
                <th>Strength</th>
                <th>Avg Duty Hours</th>
                <th>Rest Compliance</th>
                <th>Leave Utilisation</th>
                <th>Sick-Report Shift</th>
                <th>Operational Rotation Advisory</th>
              </tr>
            </thead>
            <tbody>
              {metrics?.company_level_metrics.map((c, idx) => (
                <tr key={idx}>
                  <td className="font-semibold text-navy-primary text-xs">
                    {c.subunit_name}
                  </td>
                  <td className="text-xs">{c.headcount} men</td>
                  <td className="text-xs font-medium">
                    <span className={c.average_weekly_duty_hours > 58 ? "text-red-700 font-bold" : "text-navy-primary"}>
                      {c.average_weekly_duty_hours}h / wk
                    </span>
                  </td>
                  <td className="text-xs">
                    <span className={c.rest_day_compliance_pct < 80 ? "text-amber-800 font-bold" : "text-emerald-700"}>
                      {c.rest_day_compliance_pct}%
                    </span>
                  </td>
                  <td className="text-xs">{c.average_leave_utilisation_pct}%</td>
                  <td className="text-xs">
                    <span className="badge-khaki">{c.sick_report_trend}</span>
                  </td>
                  <td className="text-xs">
                    {c.average_weekly_duty_hours > 58 ? (
                      <span className="inline-flex items-center space-x-1 text-red-800 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-red-700 shrink-0" />
                        <span>High Tempo — Prioritise Rotation</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-emerald-800 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Balanced Operational Load</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Battalion Deployment Tenures &amp; Postings Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Battalion Deployment Overview */}
        <div className="gov-card p-5">
          <h3 className="text-sm font-serif font-bold text-navy-primary mb-3 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-navy-primary" />
            <span>Battalion Rotation Readiness</span>
          </h3>
          <div className="space-y-3">
            {metrics?.battalion_level_metrics.map((b, i) => (
              <div key={i} className="p-3 bg-neutral-card rounded border border-neutral-border text-xs">
                <div className="flex items-center justify-between font-semibold text-navy-primary">
                  <span>{b.battalion_name}</span>
                  <span>{b.headcount} personnel</span>
                </div>
                <div className="flex items-center justify-between text-text-muted mt-1.5">
                  <span>Avg Deployment Tenure:</span>
                  <span className="font-semibold text-navy-primary">{b.average_deployment_duration_months} months</span>
                </div>
                <div className="flex items-center justify-between text-text-muted mt-0.5">
                  <span>Leave Utilisation:</span>
                  <span>{b.average_leave_utilisation_pct}% availed</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sector Deployment Context */}
        <div className="gov-card p-5">
          <h3 className="text-sm font-serif font-bold text-navy-primary mb-3 flex items-center space-x-2">
            <PieChart className="w-4 h-4 text-navy-primary" />
            <span>Deployment Sector Distribution</span>
          </h3>
          <div className="space-y-3">
            {metrics?.posting_distribution.map((p, i) => (
              <div key={i} className="text-xs">
                <div className="flex items-center justify-between text-text-primary mb-1">
                  <span className="font-medium">{p.category}</span>
                  <span className="text-text-muted font-mono">{p.count} personnel ({p.percentage}%)</span>
                </div>
                <div className="w-full h-2 bg-neutral-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-navy-primary rounded-full transition-all"
                    style={{ width: `${p.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 p-3 bg-neutral-card rounded border border-neutral-border text-[11px] text-text-muted italic">
            {metrics?.operational_indicators.fatigue_methodology_note}
          </div>
        </div>
      </div>
    </div>
  );
};
