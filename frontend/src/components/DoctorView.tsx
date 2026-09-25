import React, { useState, useEffect } from "react";
import type { User, DoctorWorklistResponse, PatientMedicalData } from "../types";
import { apiGetDoctorWorklist, apiGetPatientMedicalRecord, apiSubmitMedicalCampRecord } from "../api";
import {
  Stethoscope,
  Activity,
  Heart,
  Scale,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Lock,
  TrendingUp,
  FilePlus,
  RefreshCw,
  Info
} from "lucide-react";

interface DoctorViewProps {
  currentUser: User;
}

export const DoctorView: React.FC<DoctorViewProps> = ({ currentUser }) => {
  const [worklistData, setWorklistData] = useState<DoctorWorklistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "overdue" | "tested">("all");

  // Selected patient & entry form state
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string>("PID100042");
  const [patientData, setPatientData] = useState<PatientMedicalData | null>(null);
  const [patientLoading, setPatientLoading] = useState(false);

  // Form inputs
  const [systolicBp, setSystolicBp] = useState<number | "">(135);
  const [diastolicBp, setDiastolicBp] = useState<number | "">(86);
  const [weightKg, setWeightKg] = useState<number | "">(72.5);
  const [bloodSugar, setBloodSugar] = useState<number | "">(112);
  const [clinicalNotes, setClinicalNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any | null>(null);

  useEffect(() => {
    loadWorklist();
  }, []);

  useEffect(() => {
    if (selectedPersonnelId) {
      loadPatientRecord(selectedPersonnelId);
    }
  }, [selectedPersonnelId]);

  const loadWorklist = async () => {
    setLoading(true);
    try {
      const data = await apiGetDoctorWorklist();
      setWorklistData(data);
    } catch (err) {
      console.error("Failed to load doctor worklist", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientRecord = async (pid: string) => {
    setPatientLoading(true);
    setSubmitResult(null);
    try {
      const data = await apiGetPatientMedicalRecord(pid);
      setPatientData(data);
    } catch (err) {
      console.error("Failed to load patient medical record", err);
    } finally {
      setPatientLoading(false);
    }
  };

  const handleSubmitCampRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonnelId || systolicBp === "" || diastolicBp === "" || weightKg === "" || bloodSugar === "") {
      alert("Please fill in all medical camp vital signs.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiSubmitMedicalCampRecord({
        personnel_id: selectedPersonnelId,
        systolic_bp: Number(systolicBp),
        diastolic_bp: Number(diastolicBp),
        weight_kg: Number(weightKg),
        blood_sugar_mg_dl: Number(bloodSugar),
        clinical_notes: clinicalNotes.trim() ? clinicalNotes : undefined,
      });

      setSubmitResult(res);
      // Reload patient medical history and worklist
      await loadPatientRecord(selectedPersonnelId);
      await loadWorklist();
      setClinicalNotes("");
    } catch (err: any) {
      alert(`Error logging medical camp record: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredWorklist = (worklistData?.worklist || []).filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.personnel_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.company.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterTab === "overdue") return item.is_overdue;
    if (filterTab === "tested") return !item.is_overdue;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Top Banner - Medical Officer Role Boundaries */}
      <div className="gov-card p-6 border-l-4 border-emerald-600 bg-white from-white via-white to-emerald-50/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="badge-navy font-bold flex items-center space-x-1">
                <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                <span>Medical Officer Workstation</span>
              </span>
              <span className="text-[11px] text-text-muted">
                | Monthly Medical Camp & Longitudinal Vitals Signal Console
              </span>
            </div>
            <h1 className="text-2xl font-bold text-navy-primary mt-1">
              Clinical Vitals & Camp Scheduling Desk
            </h1>
            <p className="text-xs text-text-muted mt-1 font-sans">
              Officer: <span className="font-semibold text-navy-primary">{currentUser.full_name}</span> • Station: {currentUser.battalion_id}
            </p>
          </div>

          <div className="p-3 bg-white border border-neutral-border rounded-lg shadow-xs flex items-center space-x-3 text-xs">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <div className="font-bold text-navy-primary">Strict Medical Scope</div>
              <div className="text-[10px] text-text-muted leading-tight">
                Zero access to NCO muster, peer notes, or welfare files
              </div>
            </div>
          </div>
        </div>

        {/* Camp Scheduling Metrics */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-3 pt-5 border-t border-neutral-border">
          <div className="p-3 bg-white rounded border border-neutral-border">
            <span className="text-[11px] text-text-muted font-medium block">Total Assigned Strength</span>
            <span className="text-xl font-bold text-navy-primary">
              {worklistData?.total_assigned || 0}
            </span>
          </div>

          <div className="p-3 bg-amber-50/80 rounded border border-amber-300">
            <span className="text-[11px] text-amber-900 font-semibold block flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span>Overdue for Camp (&gt;35d)</span>
            </span>
            <span className="text-xl font-bold text-amber-950">
              {worklistData?.overdue_count || 0}
            </span>
          </div>

          <div className="p-3 bg-emerald-50/80 rounded border border-emerald-300">
            <span className="text-[11px] text-emerald-900 font-semibold block flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Tested Current Cycle</span>
            </span>
            <span className="text-xl font-bold text-emerald-950">
              {worklistData?.tested_this_cycle || 0}
            </span>
          </div>

          <div className="p-3 bg-white rounded border border-neutral-border">
            <span className="text-[11px] text-text-muted font-medium block">Camp Cycle Frequency</span>
            <span className="text-xl font-bold text-navy-primary">
              Every 30-35 Days
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Worklist on Left, Clinical Desk on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =========================================================
            LEFT PANEL: Camp Scheduling Worklist (5 Cols)
        ========================================================= */}
        <div className="lg:col-span-5 gov-card p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-border">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-navy-primary">
                Camp Scheduling Worklist
              </h2>
            </div>
            <button
              onClick={loadWorklist}
              disabled={loading}
              className="p-1 rounded hover:bg-neutral-hover text-text-muted hover:text-text-primary"
              title="Refresh Worklist"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-navy-primary" : ""}`} />
            </button>
          </div>

          {/* Search bar & filter pills */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Service ID, Name, or Company..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded border border-neutral-border bg-white focus:border-navy-primary outline-none"
              />
            </div>

            <div className="flex bg-neutral-card p-1 rounded-md border border-neutral-border text-xs">
              <button
                onClick={() => setFilterTab("all")}
                className={`flex-1 py-1 text-center font-semibold rounded transition-all ${
                  filterTab === "all" ? "bg-white text-navy-primary shadow-xs" : "text-text-muted"
                }`}
              >
                All ({worklistData?.total_assigned || 0})
              </button>
              <button
                onClick={() => setFilterTab("overdue")}
                className={`flex-1 py-1 text-center font-semibold rounded transition-all ${
                  filterTab === "overdue" ? "bg-white text-amber-900 shadow-xs font-bold" : "text-text-muted"
                }`}
              >
                Overdue ({worklistData?.overdue_count || 0})
              </button>
              <button
                onClick={() => setFilterTab("tested")}
                className={`flex-1 py-1 text-center font-semibold rounded transition-all ${
                  filterTab === "tested" ? "bg-white text-emerald-800 shadow-xs" : "text-text-muted"
                }`}
              >
                Current ({worklistData?.tested_this_cycle || 0})
              </button>
            </div>
          </div>

          {/* Scrollable Worklist Entries */}
          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {filteredWorklist.length === 0 ? (
              <div className="text-center py-8 text-xs text-text-muted">
                No matching personnel found in camp schedule.
              </div>
            ) : (
              filteredWorklist.map((item) => {
                const isSelected = item.personnel_id === selectedPersonnelId;
                return (
                  <div
                    key={item.personnel_id}
                    onClick={() => setSelectedPersonnelId(item.personnel_id)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "border-navy-primary bg-navy-primary/5 shadow-xs ring-1 ring-navy-primary"
                        : "border-neutral-border bg-white hover:bg-neutral-hover/40"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="font-bold text-navy-primary">{item.name}</span>
                          {item.is_demo_user && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                              ⚡ {item.demo_role_label || "Quick Login Demo"}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-text-muted mt-0.5">
                          {item.personnel_id} • {item.rank} • {item.company}
                        </div>
                      </div>

                      {item.is_overdue ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1 shrink-0">
                          <Clock className="w-2.5 h-2.5 text-amber-700" />
                          <span>Overdue ({item.days_since_last_camp ?? "N/A"}d)</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center space-x-1 shrink-0">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                          <span>Tested ({item.days_since_last_camp}d ago)</span>
                        </span>
                      )}
                    </div>

                    {item.latest_vitals && (
                      <div className="mt-2 pt-2 border-t border-neutral-border/60 flex items-center justify-between text-[11px] text-text-muted">
                        <div>
                          <span>Last BP: <strong>{item.latest_vitals.bp}</strong></span>
                          <span className="mx-1.5">•</span>
                          <span>Wt: <strong>{item.latest_vitals.weight}</strong></span>
                        </div>
                        {item.latest_vitals.clinical_flag && (
                          <span className="text-[10px] font-bold text-red-700 flex items-center space-x-0.5">
                            <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
                            <span>Drift Shift</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* =========================================================
            RIGHT PANEL: Clinical Camp Desk & History (7 Cols)
        ========================================================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* Patient Card & Vitals Entry Form */}
          <div className="gov-card p-6 border-t-4 border-navy-primary">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-border">
              <div>
                <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">
                  Officer Medical Camp Record
                </span>
                <h2 className="text-xl font-bold text-navy-primary mt-0.5">
                  {patientData ? `${patientData.name} (${patientData.personnel_id})` : selectedPersonnelId}
                </h2>
                {patientData && (
                  <p className="text-xs text-text-muted mt-0.5">
                    {patientData.rank} • {patientData.force} • {patientData.company} • {patientData.battalion}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={selectedPersonnelId}
                  onChange={(e) => setSelectedPersonnelId(e.target.value.toUpperCase())}
                  placeholder="Service ID (e.g. PID100042)"
                  className="text-xs font-mono px-3 py-1.5 rounded border border-neutral-border bg-white focus:border-navy-primary outline-none uppercase"
                />
                <button
                  onClick={() => loadPatientRecord(selectedPersonnelId)}
                  className="px-3 py-1.5 rounded bg-navy-primary hover:bg-navy-light text-white text-xs font-semibold"
                >
                  Pull File
                </button>
              </div>
            </div>

            {/* Trailing Personal Baseline Reference Banner */}
            {patientData?.trailing_personal_baseline && (
              <div className="mt-4 p-3.5 bg-neutral-card/60 rounded-lg border border-neutral-border text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-navy-primary flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-navy-primary" />
                    <span>Personal Longitudinal Baseline (Past {patientData.total_camps_recorded} Camp Averages)</span>
                  </span>
                  <span className="text-[10px] text-text-muted">Own norm, not population avg</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                  <div className="bg-white p-2 rounded border border-neutral-border/60">
                    <span className="text-[10px] text-text-muted block">Baseline BP</span>
                    <span className="font-bold text-navy-primary">
                      {Math.round(patientData.trailing_personal_baseline.systolic_bp ?? 120)} / {Math.round(patientData.trailing_personal_baseline.diastolic_bp ?? 80)} mmHg
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-neutral-border/60">
                    <span className="text-[10px] text-text-muted block">Baseline Weight</span>
                    <span className="font-bold text-navy-primary">
                      {(patientData.trailing_personal_baseline.weight_kg ?? 70).toFixed(1)} kg
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-neutral-border/60">
                    <span className="text-[10px] text-text-muted block">Baseline Sugar</span>
                    <span className="font-bold text-navy-primary">
                      {Math.round(patientData.trailing_personal_baseline.blood_sugar_mg_dl ?? 100)} mg/dL
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-neutral-border/60">
                    <span className="text-[10px] text-text-muted block">Total Camps</span>
                    <span className="font-bold text-navy-primary">
                      {patientData.total_camps_recorded} Sessions
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Instant Clinical Drift Feedback Banner if just submitted */}
            {submitResult && (
              <div
                className={`mt-4 p-4 rounded-lg border text-xs animate-in zoom-in-95 duration-150 ${
                  submitResult.clinical_flag
                    ? "bg-amber-50 border-amber-300 text-amber-950"
                    : "bg-emerald-50 border-emerald-300 text-emerald-950"
                }`}
              >
                <div className="flex items-start space-x-2.5">
                  {submitResult.clinical_flag ? (
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <span className="font-bold block">
                      {submitResult.clinical_flag
                        ? "Clinical MedTech Signal: Baseline Drift Detected"
                        : "Medical Camp Entry Recorded Successfully"}
                    </span>
                    <p className="text-[11px] leading-relaxed">
                      {submitResult.clinical_drift_summary}
                    </p>
                    <div className="pt-1 text-[10px] text-text-muted font-mono">
                      Systolic Shift: {submitResult.drift?.systolic_drift > 0 ? "+" : ""}{submitResult.drift?.systolic_drift} mmHg • Weight Shift: {submitResult.drift?.weight_drift > 0 ? "+" : ""}{submitResult.drift?.weight_drift} kg
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vitals Recording Form */}
            <form onSubmit={handleSubmitCampRecord} className="mt-5 space-y-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-navy-primary mb-1">
                <FilePlus className="w-3.5 h-3.5 text-emerald-700" />
                <span>Log New Monthly Camp Examination Readings</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Systolic BP */}
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Systolic BP (mmHg) <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={60}
                      max={250}
                      value={systolicBp}
                      onChange={(e) => setSystolicBp(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full text-xs px-3.5 py-2 rounded border border-neutral-border bg-white focus:border-navy-primary outline-none font-mono"
                      placeholder="e.g. 124"
                    />
                    <span className="absolute right-3 top-2 text-[10px] text-text-muted font-mono">mmHg</span>
                  </div>
                </div>

                {/* Diastolic BP */}
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Diastolic BP (mmHg) <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={40}
                      max={160}
                      value={diastolicBp}
                      onChange={(e) => setDiastolicBp(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full text-xs px-3.5 py-2 rounded border border-neutral-border bg-white focus:border-navy-primary outline-none font-mono"
                      placeholder="e.g. 82"
                    />
                    <span className="absolute right-3 top-2 text-[10px] text-text-muted font-mono">mmHg</span>
                  </div>
                </div>

                {/* Body Weight */}
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1 flex items-center justify-between">
                    <span>Body Weight (kg) <span className="text-red-600">*</span></span>
                    <Scale className="w-3 h-3 text-text-muted" />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      required
                      min={35}
                      max={180}
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full text-xs px-3.5 py-2 rounded border border-neutral-border bg-white focus:border-navy-primary outline-none font-mono"
                      placeholder="e.g. 74.5"
                    />
                    <span className="absolute right-3 top-2 text-[10px] text-text-muted font-mono">kg</span>
                  </div>
                </div>

                {/* Blood Sugar */}
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1 flex items-center justify-between">
                    <span>Blood Sugar (mg/dL) <span className="text-red-600">*</span></span>
                    <Activity className="w-3 h-3 text-text-muted" />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={40}
                      max={450}
                      value={bloodSugar}
                      onChange={(e) => setBloodSugar(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full text-xs px-3.5 py-2 rounded border border-neutral-border bg-white focus:border-navy-primary outline-none font-mono"
                      placeholder="e.g. 105"
                    />
                    <span className="absolute right-3 top-2 text-[10px] text-text-muted font-mono">mg/dL</span>
                  </div>
                </div>
              </div>

              {/* Clinical Notes */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Medical Officer Clinical Notes & Regimental Instructions:
                </label>
                <textarea
                  rows={2}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="e.g. Advised hydration and salt moderation. Follow-up camp reading in 30 days."
                  className="w-full text-xs p-3 rounded border border-neutral-border bg-white focus:border-navy-primary outline-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-[11px] text-text-muted flex items-center space-x-1.5">
                  <Info className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <span>Logged under medical officer license with immutable security audit trail.</span>
                </div>

                <button
                  type="submit"
                  disabled={submitting || patientLoading}
                  className="px-5 py-2 rounded bg-navy-primary hover:bg-navy-light text-white text-xs font-semibold shadow-xs transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <Heart className="w-3.5 h-3.5 text-gold" />
                  <span>{submitting ? "Logging Camp Vitals..." : "Record Camp Examination"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Longitudinal Medical History Table */}
          <div className="gov-card">
            <div className="gov-card-header">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-navy-primary">
                  Longitudinal Camp Vitals Trend ({patientData?.medical_history.length || 0} Camps)
                </h3>
              </div>
              <span className="text-xs text-text-muted">
                Trailing measurements for {patientData?.name || selectedPersonnelId}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full gov-table text-xs">
                <thead>
                  <tr>
                    <th>Camp Date</th>
                    <th>Blood Pressure</th>
                    <th>Body Weight</th>
                    <th>Blood Sugar</th>
                    <th>Personal Baseline Drift</th>
                    <th>Doctor Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {patientLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-text-muted">
                        Loading officer medical history...
                      </td>
                    </tr>
                  ) : !patientData || patientData.medical_history.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-text-muted">
                        No previous medical camp records logged for this officer yet.
                      </td>
                    </tr>
                  ) : (
                    patientData.medical_history.map((record) => (
                      <tr key={record.id} className="hover:bg-neutral-hover/40">
                        <td>
                          <div className="font-semibold text-navy-primary">{record.camp_date}</div>
                          <div className="text-[10px] text-text-muted">{record.doctor_name}</div>
                        </td>

                        <td>
                          <div className="font-mono font-semibold text-navy-primary text-sm">
                            {Math.round(record.systolic_bp)} / {Math.round(record.diastolic_bp)}
                          </div>
                          <span className="text-[10px] text-text-muted">mmHg</span>
                        </td>

                        <td>
                          <div className="font-mono font-medium text-navy-primary">
                            {record.weight_kg.toFixed(1)} kg
                          </div>
                        </td>

                        <td>
                          <div className="font-mono font-medium text-navy-primary">
                            {Math.round(record.blood_sugar_mg_dl)} mg/dL
                          </div>
                        </td>

                        <td>
                          {record.clinical_flag ? (
                            <div className="p-1.5 bg-amber-50 rounded border border-amber-200 text-amber-900 max-w-xs">
                              <span className="font-bold text-[10px] flex items-center space-x-1 text-amber-800">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                                <span>Drift Warning</span>
                              </span>
                              <p className="text-[10px] leading-tight mt-0.5">
                                {record.clinical_drift_summary}
                              </p>
                            </div>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Within Personal Baseline</span>
                            </span>
                          )}
                        </td>

                        <td className="max-w-[200px]">
                          <span className="text-text-muted italic text-[11px]">
                            {record.clinical_notes || "Routine check-in."}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
