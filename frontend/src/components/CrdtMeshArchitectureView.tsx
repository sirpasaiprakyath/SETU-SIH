import React, { useState, useEffect } from "react";
import {
  Radio,
  Database,
  Cpu,
  Layers,
  GitMerge,
  RefreshCw,
  Zap,
  CheckCircle2
} from "lucide-react";
import type {
  CrdtSyncStatus,
  CrdtSyncEventItem,
  ConflictSimulationResult
} from "../types";
import {
  apiGetSyncStatus,
  apiGetSyncLedger,
  apiSimulateSyncConflict
} from "../api";

export const CrdtMeshArchitectureView: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<CrdtSyncStatus | null>(null);
  const [syncLedger, setSyncLedger] = useState<CrdtSyncEventItem[]>([]);
  const [loadingSync, setLoadingSync] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<ConflictSimulationResult | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingSync(true);
    try {
      const [status, ledger] = await Promise.all([
        apiGetSyncStatus(),
        apiGetSyncLedger()
      ]);
      setSyncStatus(status);
      setSyncLedger(ledger);
    } catch (err) {
      console.error("Failed to load CRDT state:", err);
    } finally {
      setLoadingSync(false);
    }
  };

  const handleSimulateConflict = async () => {
    setIsSimulating(true);
    try {
      const result = await apiSimulateSyncConflict();
      setSimResult(result);
      await loadData();
    } catch (err) {
      console.error("Failed to simulate conflict:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-lg bg-gradient-to-r from-slate-900 via-navy-primary to-slate-900 text-white border-l-4 border-emerald-400 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                Frontier Resilience Architecture
              </span>
              <span className="text-xs text-slate-300">Edge Outpost &bull; Disconnected Synchronization</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-1 flex items-center space-x-2">
              <Radio className="w-5 h-5 text-emerald-400" />
              <span>Edge-to-HQ Conflict-Free Replicated Data Type (CRDT Mesh)</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Solves the disconnected frontier problem at remote border and LWE posts with zero connectivity. When troops return to base, records converge deterministically using Lamport clocks and military operational rank priority without wall-clock drift or data loss.
            </p>
          </div>

          <div className="px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-center sm:text-right shrink-0">
            <span className="text-[10px] font-mono uppercase block text-emerald-400">Node Status</span>
            <span className="text-xs font-bold font-sans">FOB-SUKMA-03 Active</span>
          </div>
        </div>
      </div>

      {/* Outpost Node & Clock Info Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-lg border border-neutral-border shadow-xs text-xs">
        <div>
          <span className="text-[10px] font-mono uppercase text-text-muted">Edge Node</span>
          <div className="font-bold text-navy-primary mt-0.5 flex items-center space-x-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
            <span>{syncStatus?.edge_node_id || "FOB-SUKMA-03"}</span>
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">{syncStatus?.edge_location || "Bastar Sector Outpost, CG"}</div>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase text-text-muted">Core Master HQ</span>
          <div className="font-bold text-navy-primary mt-0.5 flex items-center space-x-1.5">
            <Database className="w-3.5 h-3.5 text-navy-light" />
            <span>{syncStatus?.core_hq_id || "MHA-CORE-HQ-DELHI"}</span>
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">HF-Mesh / Sat-Burst Ready</div>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase text-text-muted">Lamport Clock (Monotonic)</span>
          <div className="font-bold font-mono text-emerald-700 text-sm mt-0.5 flex items-center space-x-1.5">
            <Cpu className="w-3.5 h-3.5 text-emerald-600" />
            <span>L = {syncStatus?.logical_clock ?? 142}</span>
          </div>
          <div className="text-[10px] text-emerald-800 font-semibold mt-0.5">Causally Ordered</div>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase text-text-muted">Dual Timestamps (Audit)</span>
          <div className="text-[11px] font-mono text-navy-primary font-bold mt-0.5">
            IST: {syncStatus?.last_sync_ist || "Connecting to Edge Node..."}
          </div>
          <div className="text-[10px] font-mono text-text-muted">
            UTC: {syncStatus?.last_sync_utc || "Synchronizing..."}
          </div>
        </div>
      </div>

      {/* Institutional Causal Priority Hierarchy */}
      <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/40 text-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-700" />
            <h3 className="font-bold text-blue-950 text-xs">
              Institutional Causal Priority Hierarchy (Deterministic Arbitration)
            </h3>
          </div>
          <span className="text-[10px] font-mono bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">
            Zero Wall-Clock Clock Drift Dependency
          </span>
        </div>
        <p className="text-[11px] text-blue-900/90 leading-relaxed mb-3">
          In disconnected operations, network latency or unsynchronized RTCs can corrupt data if standard Last-Write-Wins (LWW) is used. SETU enforces CAPF military operational hierarchy: higher institutional authority deterministically supersedes lower rank entries.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded bg-white border border-rose-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-900 text-xs">1. Medical Officer</span>
              <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded">
                Pri: 100
              </span>
            </div>
            <p className="text-[10px] text-rose-700 mt-1">
              Direct clinical prescriptions &amp; medical duty excuses unconditionally supersede all logs.
            </p>
          </div>

          <div className="p-2.5 rounded bg-white border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 text-xs">2. Welfare Officer</span>
              <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                Pri: 80
              </span>
            </div>
            <p className="text-[10px] text-amber-700 mt-1">
              Confidential psychological triage, tea protocol bookings &amp; emergency family leave flags.
            </p>
          </div>

          <div className="p-2.5 rounded bg-white border border-indigo-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-900 text-xs">3. Section NCO</span>
              <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded">
                Pri: 50
              </span>
            </div>
            <p className="text-[10px] text-indigo-700 mt-1">
              Daily morning roll call muster, operational patrol fatigue &amp; company barracks records.
            </p>
          </div>

          <div className="p-2.5 rounded bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs">4. Automated ML</span>
              <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded">
                Pri: 10
              </span>
            </div>
            <p className="text-[10px] text-slate-600 mt-1">
              Algorithmic strain predictions yield immediately to any human officer evaluation.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Outpost Conflict Simulator */}
      <div className="p-4 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <div className="flex items-center space-x-2">
            <GitMerge className="w-4 h-4 text-amber-800" />
            <h3 className="font-bold text-amber-950 text-xs">
              Live Disconnected Outpost Sync Simulation
            </h3>
          </div>
          <button
            onClick={handleSimulateConflict}
            disabled={isSimulating}
            className="gov-btn-primary text-xs py-1.5 px-3 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Simulating CRDT Convergence...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-gold" />
                <span>Simulate Disconnected FOB Conflict</span>
              </>
            )}
          </button>
        </div>
        <p className="text-[11px] text-amber-900 leading-relaxed mb-3">
          <strong>Realistic Frontier Scenario:</strong> Remote outpost FOB-SUKMA-03 loses satellite link during heavy monsoon operations. The <strong>Unit Medical Officer physically stationed at the FOB</strong> examines Ct. Rajesh Kumar Singh in person and prescribes &ldquo;48h Clinical Rest (Priority 100)&rdquo; on the offline edge node. Meanwhile, Delhi Central HQ generates an automated &ldquo;High Distress Alert (Priority 10)&rdquo; based on un-synced duty history. When PolNet reconnects, the on-site doctor&apos;s clinical resolution deterministically clears the central AI alarm without data loss or wall-clock corruption.
        </p>

        {/* Simulation Result */}
        {simResult && (
          <div className="mt-3 p-3.5 rounded bg-white border border-emerald-300 shadow-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center space-x-2 text-emerald-800 font-bold mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>CRDT Convergence Succeeded: Deterministic Resolution Applied</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-3">
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200">
                <span className="text-[10px] uppercase font-mono text-rose-700 font-bold">
                  Edge Offline Event (FOB-SUKMA)
                </span>
                <div className="font-bold text-rose-950 mt-1">{simResult.conflict_summary.edge_offline_state}</div>
                <div className="text-[10px] text-rose-700 mt-1">
                  Role: {simResult.conflict_summary.edge_role || "Unit Medical Officer (On-Site)"} • Priority: <span className="font-bold font-mono">{simResult.conflict_summary.edge_priority}</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-mono text-slate-700 font-bold">
                  HQ Incoming Event (Delhi Central Core)
                </span>
                <div className="font-bold text-slate-900 mt-1">{simResult.conflict_summary.hq_incoming_state}</div>
                <div className="text-[10px] text-slate-600 mt-1">
                  Role: {simResult.conflict_summary.hq_role || "Central Automated ML Monitor"} • Priority: <span className="font-bold font-mono">{simResult.conflict_summary.hq_priority}</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-300">
                <span className="text-[10px] uppercase font-mono text-emerald-700 font-bold">
                  Deterministic CRDT Winner
                </span>
                <div className="font-bold text-emerald-950 mt-1">{simResult.conflict_summary.winning_action}</div>
                <div className="text-[10px] text-emerald-800 font-semibold mt-1">
                  Rule: {simResult.conflict_summary.resolution_rule}
                </div>
              </div>
            </div>

            <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[10px] font-mono text-slate-700 flex flex-wrap items-center justify-between gap-2">
              <div>
                <strong>Ledger Event:</strong> <span className="text-navy-primary font-bold">{simResult.conflict_summary.ledger_event_id}</span>
              </div>
              <div>
                <strong>Dual Audit:</strong> {simResult.conflict_summary.timestamp_ist} | {simResult.conflict_summary.timestamp_utc}
              </div>
              <div className="text-emerald-700 font-bold">
                ✓ Both entries appended to audit ledger (Zero silent overwrites)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Append-Only Event Sourcing Ledger Table */}
      <div className="gov-card p-4 text-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-navy-primary" />
            <h3 className="font-bold text-navy-primary text-xs">
              Append-Only CRDT Event Sourcing Ledger (Tamper-Resistant Log)
            </h3>
          </div>
          <button
            onClick={loadData}
            className="text-navy-light hover:text-navy-primary flex items-center space-x-1 font-semibold text-[11px] cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh Ledger</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-neutral-border rounded">
          <table className="gov-table w-full text-[11px]">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Dual Timestamp (IST / UTC)</th>
                <th>Origin Node</th>
                <th>Entity &amp; Action</th>
                <th>Lamport Clock</th>
                <th>Priority</th>
                <th>Status &amp; Audit</th>
              </tr>
            </thead>
            <tbody>
              {loadingSync ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-text-muted">
                    Loading CRDT event ledger...
                  </td>
                </tr>
              ) : syncLedger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-text-muted">
                    No sync events recorded yet. Run simulation to generate a conflict event!
                  </td>
                </tr>
              ) : (
                syncLedger.map((evt) => (
                  <tr key={evt.id} className="hover:bg-neutral-card/60">
                    <td className="font-mono font-bold text-navy-light">{evt.event_id}</td>
                    <td>
                      <div className="font-mono text-[10px] text-navy-primary">{evt.timestamp_ist}</div>
                      <div className="font-mono text-[9px] text-text-muted">{evt.timestamp_utc}</div>
                    </td>
                    <td>
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 font-mono text-[10px] font-semibold">
                        {evt.node_id}
                      </span>
                    </td>
                    <td>
                      <div className="font-semibold text-navy-primary">{evt.action}</div>
                      <div className="text-[10px] text-text-muted font-mono">{evt.entity_type} #{evt.entity_id}</div>
                    </td>
                    <td className="font-mono font-bold text-emerald-700">L={evt.logical_clock}</td>
                    <td>
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                          evt.causal_priority >= 100
                            ? "bg-rose-100 text-rose-800"
                            : evt.causal_priority >= 80
                            ? "bg-amber-100 text-amber-800"
                            : evt.causal_priority >= 50
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {evt.causal_priority}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center space-x-1">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          {evt.sync_status}
                        </span>
                      </div>
                      {evt.resolution_notes && (
                        <div className="text-[9px] text-text-muted mt-0.5 max-w-xs truncate" title={evt.resolution_notes}>
                          {evt.resolution_notes}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
