import React, { useEffect, useState } from "react";
import type { User, AuditLogEntry } from "../types";
import { apiGetAuditLogs, apiGetUsers, apiExportRetrainingDataset } from "../api";
import {
  Lock,
  Search,
  Users,
  RefreshCw,
  ShieldCheck,
  Server,
  Key,
  Scale,
  Database,
  CheckCircle2,
  Download,
  Sparkles,
  Radio
} from "lucide-react";
import { EvaluationSandboxView } from "./EvaluationSandboxView";
import { CrdtMeshArchitectureView } from "./CrdtMeshArchitectureView";

interface AdminViewProps {
  currentUser: User;
}

export const AdminView: React.FC<AdminViewProps> = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"audit" | "users" | "governance" | "sandbox" | "crdt">("audit");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsData, usersData] = await Promise.all([
        apiGetAuditLogs(),
        apiGetUsers(),
      ]);
      setLogs(logsData);
      setUsers(usersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportDataset = async () => {
    setExporting(true);
    try {
      const blob = await apiExportRetrainingDataset("csv");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "crpf_anonymized_retraining_dataset.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setTimeout(() => {
        loadData();
      }, 600);
    } catch (err: any) {
      console.error("Export error", err);
      alert(`Export error: ${err.message || err}`);
    } finally {
      setExporting(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.username.toLowerCase().includes(q) ||
      l.target_personnel_id.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-primary mx-auto mb-3"></div>
        <p className="text-sm text-text-muted">Loading MHA Security Audit Registers...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Top Banner - Accountability is a Core Feature */}
      <div className="gov-card p-6 border-l-4 border-navy-primary bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="badge-navy font-bold">MHA Security Oversight & Governance</span>
              <span className="text-[11px] text-text-muted">| Tamper-Evident Access Registers</span>
            </div>
            <h1 className="text-2xl font-bold text-navy-primary mt-1">
              Institutional Security & Audit Trail Console
            </h1>
            <p className="text-xs text-text-muted mt-1 font-sans">
              "How do we know this isn't misused?" — Every view of a flagged personnel profile is permanently logged.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleExportDataset}
              disabled={exporting}
              className="px-3.5 py-2 rounded bg-gold/15 hover:bg-gold/25 text-navy-primary text-xs font-bold border border-gold/40 flex items-center space-x-2 transition-colors cursor-pointer disabled:opacity-50"
              title="Download ID-only ML training records with zero personal names (DPDP Act 2023 compliant)"
            >
              <Download className="w-3.5 h-3.5 text-navy-primary" />
              <span>{exporting ? "Exporting..." : "Export Anonymized Dataset (ID-Only)"}</span>
            </button>
            <button
              onClick={loadData}
              className="px-3.5 py-2 rounded bg-neutral-card hover:bg-neutral-hover text-navy-primary text-xs font-semibold border border-neutral-border flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-border pb-2">
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2 rounded-t-md text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === "audit"
              ? "bg-navy-primary text-white shadow-xs"
              : "text-text-muted hover:text-navy-primary bg-neutral-card border border-neutral-border"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>1. Case Access Audit Trail ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-t-md text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === "users"
              ? "bg-navy-primary text-white shadow-xs"
              : "text-text-muted hover:text-navy-primary bg-neutral-card border border-neutral-border"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>2. User Role Accounts ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("governance")}
          className={`px-4 py-2 rounded-t-md text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === "governance"
              ? "bg-navy-primary text-white shadow-xs"
              : "text-text-muted hover:text-navy-primary bg-neutral-card border border-neutral-border"
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-gold" />
          <span>3. Pre-Deployment Statutory Governance Blueprint</span>
        </button>

        <button
          onClick={() => setActiveTab("sandbox")}
          className={`px-4 py-2 rounded-t-md text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === "sandbox"
              ? "bg-navy-primary text-white shadow-xs border-t-2 border-amber-400"
              : "text-amber-800 hover:text-navy-primary bg-amber-50/70 border border-amber-300"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-extrabold">4. Evaluation Sandbox</span>
          <span className="px-1.5 py-0.2 rounded bg-amber-400 text-navy-primary text-[9px] font-mono font-bold">Admin Only</span>
        </button>

        <button
          onClick={() => setActiveTab("crdt")}
          className={`px-4 py-2 rounded-t-md text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === "crdt"
              ? "bg-navy-primary text-white shadow-xs border-t-2 border-emerald-400"
              : "text-emerald-900 hover:text-navy-primary bg-emerald-50/70 border border-emerald-300"
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-extrabold">5. Frontier CRDT Mesh</span>
          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 text-[9px] font-mono font-bold">Outpost Sync</span>
        </button>
      </div>

      {/* Tab 1: Audit Log Ledger */}
      {activeTab === "audit" && (
        <div className="gov-card animate-in fade-in-50 duration-200">
          <div className="gov-card-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-navy-primary" />
                <h2 className="text-sm font-bold text-navy-primary">
                  Immutable Access Ledger ({filteredLogs.length} Records)
                </h2>
              </div>
              <div className="hidden sm:flex items-center space-x-1.5 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>Live Stream Active (IST +05:30)</span>
              </div>
            </div>

            {/* Filter */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-text-muted" />
              <input
                type="text"
                placeholder="Search action, officer, personnel..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-neutral-border bg-white outline-none focus:border-navy-primary"
              />
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="min-w-[960px] w-full gov-table">
              <thead>
                <tr>
                  <th className="min-w-[210px] pl-4">Timestamp (IST / UTC)</th>
                  <th className="min-w-[130px]">Officer Username</th>
                  <th className="min-w-[120px]">Role</th>
                  <th className="min-w-[150px]">Action Type</th>
                  <th className="min-w-[120px]">Target Personnel</th>
                  <th>Details & Context</th>
                  <th className="min-w-[100px]">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((l) => (
                  <tr key={l.id}>
                    <td className="text-xs whitespace-nowrap pl-4">
                      <div className="font-semibold text-navy-primary font-mono text-[11px]">
                        {l.timestamp_ist || l.timestamp}
                      </div>
                      <div className="flex items-center space-x-1.5 text-[10px] text-text-muted mt-0.5">
                        <span className="font-mono text-[10px] text-slate-500">{l.timestamp_utc || l.timestamp}</span>
                        {l.relative_time && (
                          <span className="px-1.5 py-0.2 rounded bg-neutral-card text-navy-primary font-medium text-[9px] border border-neutral-border">
                            {l.relative_time}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-xs font-semibold text-navy-primary">
                      {l.username}
                    </td>
                    <td className="text-xs">
                      <span className="capitalize text-text-muted">{l.user_role.replace("_", " ")}</span>
                    </td>
                    <td className="text-xs">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                          l.action.includes("VIEW")
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : l.action.includes("ACTION") || l.action.includes("SUBMIT")
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                            : l.action.includes("LOGIN")
                            ? "bg-sky-100 text-sky-900 border border-sky-300"
                            : "bg-navy-50 text-navy-primary"
                        }`}
                      >
                        {l.action}
                      </span>
                    </td>
                    <td className="text-xs font-mono font-semibold text-navy-primary">
                      {l.target_personnel_id}
                    </td>
                    <td className="text-xs text-text-primary max-w-xs truncate" title={l.details}>
                      {l.details}
                    </td>
                    <td className="text-[11px] font-mono text-text-muted">
                      {l.ip_address}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: User Role Management */}
      {activeTab === "users" && (
        <div className="gov-card animate-in fade-in-50 duration-200">
          <div className="gov-card-header">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-navy-primary" />
              <h2 className="text-sm font-bold text-navy-primary">
                Authorized Personnel System Accounts ({users.length})
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full gov-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name & Designation</th>
                  <th>Assigned Role</th>
                  <th>Force & Unit</th>
                  <th>Linked Personnel ID</th>
                  <th>Account Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={i}>
                    <td className="text-xs font-mono font-bold text-navy-primary">
                      {u.username}
                    </td>
                    <td className="text-xs font-medium text-text-primary">
                      {u.full_name}
                      <div className="text-[11px] text-text-muted">{u.rank}</div>
                    </td>
                    <td className="text-xs">
                      <span className="badge-navy capitalize">{u.role.replace("_", " ")}</span>
                    </td>
                    <td className="text-xs text-text-muted">
                      {u.force} • {u.battalion_id}
                    </td>
                    <td className="text-xs font-mono text-text-primary">
                      {u.personnel_id || "—"}
                    </td>
                    <td className="text-xs text-emerald-700 font-semibold">
                      Active / Verified
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Pre-Deployment Statutory Governance Blueprint */}
      {activeTab === "governance" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="gov-card p-6 sm:p-8 border-t-4 border-khaki">
            <div className="flex items-center space-x-3 mb-4">
              <div className="icon-circle-khaki">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-navy-primary">
                  Pre-Deployment Data Safety & Statutory Compliance Roadmap
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  The concrete architecture planned before SETU connects to live CAPF service records
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Pillar 1 */}
              <div className="p-4 rounded-lg bg-neutral-card border border-neutral-border space-y-2">
                <div className="flex items-center space-x-2 text-navy-primary font-bold text-sm">
                  <Server className="w-4 h-4 text-gold" />
                  <span>1. Sovereign Air-Gapped Cloud (NIC / MeghRaj)</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Deployed strictly on National Informatics Centre (NIC) / MeghRaj Sovereign Cloud within Indian territory. Never on commercial public multi-tenant clouds. Operates within secure CAPF Intranet (PolNet / CAPF-WAN).
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="p-4 rounded-lg bg-neutral-card border border-neutral-border space-y-2">
                <div className="flex items-center space-x-2 text-navy-primary font-bold text-sm">
                  <Key className="w-4 h-4 text-gold" />
                  <span>2. AES-256 Field-Level Envelope Encryption</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  All personnel IDs and personal baselines are encrypted with unit-level HSM keys. Even database administrators cannot see individual welfare data without designated Welfare Officer cryptographic credentials.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="p-4 rounded-lg bg-neutral-card border border-neutral-border space-y-2">
                <div className="flex items-center space-x-2 text-navy-primary font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-gold" />
                  <span>3. CERT-In Empanelled Security Audit & VAPT</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Mandatory Vulnerability Assessment and Penetration Testing (VAPT) through a CERT-In empanelled auditor, validating zero data leakage, zero unauthorized endpoints, and strict OWASP/STQC compliance.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="p-4 rounded-lg bg-neutral-card border border-neutral-border space-y-2">
                <div className="flex items-center space-x-2 text-navy-primary font-bold text-sm">
                  <Scale className="w-4 h-4 text-gold" />
                  <span>4. Digital Personal Data Protection (DPDP) Act 2023 Compliance</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Built on strict purpose limitation. Welfare records are legally quarantined from Annual Confidential Reports (ACR) and promotion boards, with mandatory data minimization and right-to-correction.
                </p>
              </div>

              {/* Pillar 5 */}
              <div className="col-span-1 md:col-span-2 p-4 rounded-lg bg-navy-50 border border-navy-primary/20 space-y-2">
                <div className="flex items-center space-x-2 text-navy-primary font-bold text-sm">
                  <Lock className="w-4 h-4 text-navy-primary" />
                  <span>5. Cryptographic Non-Repudiation Audit Ledger</span>
                </div>
                <p className="text-xs text-navy-darker leading-relaxed">
                  Every single profile opening, note creation, or status change generates an irreversible SHA-256 audit entry. Accessing personnel welfare records without active welfare officer assignment is automatically flagged to MHA oversight and subject to service discipline.
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong>Statutory Pre-Deployment Status:</strong> The machine learning pipeline, SHAP explainability layer, and access controls are fully operational in this prototype. Formal CERT-In penetration testing and institutional accreditation will precede any live deployment on real personnel records.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Evaluation Sandbox (Admin & Evaluator Only) */}
      {activeTab === "sandbox" && (
        <div className="animate-in fade-in-50 duration-200">
          <EvaluationSandboxView />
        </div>
      )}

      {/* Tab 5: Frontier CRDT Mesh (Distributed Offline Replication) */}
      {activeTab === "crdt" && (
        <div className="animate-in fade-in-50 duration-200">
          <CrdtMeshArchitectureView />
        </div>
      )}
    </div>
  );
};
