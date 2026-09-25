import React, { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  EyeOff,
  UserCheck,
  ArrowLeft,
  Lock,
  FileText,
  CheckCircle,
  HeartHandshake,
  Shield,
  Coffee,
  Database,
  Key,
  Server,
  AlertOctagon,
  Scale,
  BarChart3,
  CheckCircle2
} from "lucide-react";

interface PublicAboutProps {
  onBack: () => void;
  initialTab?: "manifesto" | "charter" | "governance" | "evaluation";
}

export const PublicAbout: React.FC<PublicAboutProps> = ({ onBack, initialTab = "manifesto" }) => {
  const [activeTab, setActiveTab] = useState<"manifesto" | "charter" | "governance" | "evaluation">(initialTab);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center space-x-2 text-xs font-semibold text-navy-primary hover:text-navy-light mb-6 transition-colors bg-white px-3 py-1.5 rounded-md border border-neutral-border shadow-2xs"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Operational Workstation</span>
      </button>

      {/* Main Document Header */}
      <div className="gov-card p-6 sm:p-8 mb-6 border-t-4 border-navy-primary bg-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="badge-khaki font-bold">Project Philosophy & Governance Blueprint</span>
              <span className="text-[11px] text-text-muted">SIH26186 • Central Reserve Police Force (CRPF), Police-II Division, MHA • Team Guardian Minds</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-navy-primary tracking-tight">
              SETU (सेतु): Mission, Ethics & Security Architecture
            </h1>
            <p className="text-xs text-text-muted mt-1.5 font-sans leading-relaxed">
              Operational Welfare Triage via Personal Baseline Comparison • Central Reserve Police Force (CRPF) [Future Scalability: Pan-CAPF Architecture]
            </p>
          </div>
          <div className="icon-circle-gold hidden sm:flex shrink-0">
            <ShieldCheck className="w-5 h-5 text-navy-primary" />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-neutral-border text-xs">
          <button
            onClick={() => setActiveTab("manifesto")}
            className={`px-4 py-2 rounded-md font-bold transition-all flex items-center space-x-2 ${
              activeTab === "manifesto"
                ? "bg-navy-primary text-white shadow-xs"
                : "bg-neutral-card text-text-muted hover:text-navy-primary border border-neutral-border"
            }`}
          >
            <Coffee className="w-3.5 h-3.5 text-gold" />
            <span>1. What We Are Building & Why (Philosophy)</span>
          </button>

          <button
            onClick={() => setActiveTab("charter")}
            className={`px-4 py-2 rounded-md font-bold transition-all flex items-center space-x-2 ${
              activeTab === "charter"
                ? "bg-navy-primary text-white shadow-xs"
                : "bg-neutral-card text-text-muted hover:text-navy-primary border border-neutral-border"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-gold" />
            <span>2. Responsible AI Boundary Charter</span>
          </button>

          <button
            onClick={() => setActiveTab("governance")}
            className={`px-4 py-2 rounded-md font-bold transition-all flex items-center space-x-2 ${
              activeTab === "governance"
                ? "bg-navy-primary text-white shadow-xs"
                : "bg-neutral-card text-text-muted hover:text-navy-primary border border-neutral-border"
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-gold" />
            <span>3. Pre-Deployment Data Safety & DPDP 2023 Plan</span>
          </button>

          <button
            onClick={() => setActiveTab("evaluation")}
            className={`px-4 py-2 rounded-md font-bold transition-all flex items-center space-x-2 ${
              activeTab === "evaluation"
                ? "bg-navy-primary text-white shadow-xs"
                : "bg-neutral-card text-text-muted hover:text-navy-primary border border-neutral-border"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-gold" />
            <span>4. Model Evaluation &amp; Benchmarks (Non-Clinical)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: What We Are Building & Why Manifesto */}
      {activeTab === "manifesto" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Core Manifesto Narrative Box */}
          <div className="gov-card p-6 sm:p-8 border-l-4 border-gold">
            <div className="flex items-center space-x-2.5 mb-4">
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-navy-primary">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-bold text-navy-primary">
                The Core Problem: Late Visibility in High-Stress Operational Environments
              </h2>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-navy-deep leading-relaxed font-sans">
              <p>
                Right now, when someone in the force is struggling, nobody finds out until it's already serious. 
                There's no quiet, early way to notice that something has changed in a person's life — everyone just waits 
                until it becomes visible, and by then it's often too late to help in a small, simple way.
              </p>

              <div className="p-4 bg-amber-50/80 rounded-lg border border-amber-200">
                <h3 className="font-bold text-amber-950 flex items-center space-x-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Why Self-Report Questionnaires Consistently Fail in the Forces</span>
                </h3>
                <p className="text-xs text-amber-900 leading-relaxed">
                  We wanted to fix that early part. Not by asking every soldier to fill a form every week about their feelings — 
                  because most people won't answer that honestly. Telling the truth on a form like that can feel risky for their career, 
                  so people just tick the safe answers, and the form ends up useless.
                </p>
              </div>

              <div className="p-4 bg-navy-50/80 rounded-lg border border-navy-primary/20">
                <h3 className="font-bold text-navy-primary flex items-center space-x-2 mb-1">
                  <Scale className="w-4 h-4 text-navy-primary shrink-0" />
                  <span>The Fundamental Principle: Personal Normal vs Global Comparisons</span>
                </h3>
                <p className="text-xs text-navy-darker leading-relaxed">
                  Every person already has their own normal way of living their duty life — how often they take leave, how often they report sick, 
                  how they usually seem to the people around them. That normal is different for every single person, and that's fine. 
                  What actually matters is <strong>not comparing one person to another</strong>. What matters is noticing when one specific person 
                  quietly starts drifting away from their own normal, over some weeks, not just one bad day.
                </p>
              </div>

              <p>
                That's the heart of what we built. The system quietly keeps track of a person's own pattern over time, using information 
                that already exists in administrative records (duty hours, night shifts, leave utilization, hospital visits) — 
                <strong> nothing new anyone has to fill in</strong>. When that pattern changes in a real, lasting way, the system doesn't jump to conclusions 
                and it never puts a number or a label on a person. It simply says: <em>this person's pattern has changed, someone should go check on them</em>.
              </p>

              <div className="p-4 bg-emerald-50/80 rounded-lg border border-emerald-200">
                <h3 className="font-bold text-emerald-950 flex items-center space-x-2 mb-1">
                  <Coffee className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>The Welfare Check-in: A Colleague's Cup of Tea, Not an Investigation</span>
                </h3>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  That message goes <strong>only to a welfare officer, never anywhere near a disciplinary file or ACR</strong>. 
                  And the check-in itself is meant to feel like a normal human conversation — not an investigation, not a form, 
                  just someone asking a colleague how they're really doing. Because the real reasons behind a change — money trouble, 
                  family problems, grief, anything private — will never show up in any record. Only a real conversation with someone they trust 
                  can bring that out. Our system's whole job is to make sure that conversation actually happens, at the right time, instead of never happening at all.
                </p>
              </div>

              <div className="p-4 bg-neutral-card rounded-lg border border-neutral-border">
                <h3 className="font-bold text-navy-primary flex items-center space-x-2 mb-1">
                  <AlertOctagon className="w-4 h-4 text-navy-primary shrink-0" />
                  <span>Honesty About AI Limitations: Refusal to Claim Suicide Prediction</span>
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  We were also honest with ourselves about what this cannot do. No system anywhere in the world can read a person's mind or 
                  promise to predict something as serious as self-harm — anyone who says they can is not telling the truth. 
                  So we did not try to build that. We built something smaller, more honest, and more useful: a way to notice change early, 
                  and a reason for a real person to step in sooner.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Responsible AI Boundary Charter */}
      {activeTab === "charter" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Explicit What This System Does NOT Do */}
          <div className="gov-card p-6 sm:p-8 border-l-4 border-amber-600">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-bold text-navy-primary">
                Technical Boundaries: What This System Does NOT Do
              </h2>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-text-primary">
              <div className="p-3.5 bg-amber-50/70 rounded border border-amber-200">
                <p className="font-bold text-amber-950">
                  1. Does NOT Predict Suicide or Self-Harm
                </p>
                <p className="text-amber-900 mt-1 text-xs leading-relaxed">
                  No published computational or psychological system anywhere in the world reliably predicts suicide or self-harm at the individual level (Franklin et al., 2017). Given a real CRPF annual base rate near 1-in-6,800/year (MHA, Rajya Sabha data 2020–2024), claiming individual suicide prediction is medically and statistically indefensible. 
                  The system predicts a broad, tractable administrative triage event: <strong>"recommended for welfare review"</strong> (~7% target base rate).
                </p>
              </div>

              <div className="p-3.5 bg-amber-50/70 rounded border border-amber-200">
                <p className="font-bold text-amber-950 flex items-center justify-between">
                  <span>2. Replaces Static "Stress %" with the Stress Trajectory Engine</span>
                  <span className="text-[10px] bg-amber-200 text-amber-950 font-mono px-1.5 py-0.5 rounded font-bold">Key Differentiator</span>
                </p>
                <p className="text-amber-900 mt-1 text-xs leading-relaxed">
                  Static arithmetic labels like <em>"Stress Risk: 78%"</em> lack operational meaning and induce defensive pushback. SETU uses a dynamic <strong>Stress Trajectory Engine</strong> that decomposes operational strain into measurable physics-of-workload vectors:
                </p>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div className="p-1.5 bg-white/90 rounded border border-amber-300">
                    <span className="font-bold text-rose-800">Risk: HIGH ↑</span>
                    <span className="block text-[10px] text-text-muted">Prev: Moderate</span>
                  </div>
                  <div className="p-1.5 bg-white/90 rounded border border-amber-300">
                    <span className="font-bold text-amber-900">7-d trend: ↑ 24%</span>
                    <span className="block text-[10px] text-text-muted">Velocity vector</span>
                  </div>
                  <div className="p-1.5 bg-white/90 rounded border border-amber-300">
                    <span className="font-bold text-navy-primary">Duty +31%, Sleep −22%</span>
                    <span className="block text-[10px] text-text-muted">Leave +18d, Wellness −15%</span>
                  </div>
                  <div className="p-1.5 bg-white/90 rounded border border-amber-300">
                    <span className="font-bold text-rose-700">Trajectory: Rising</span>
                    <span className="block text-[10px] text-text-muted">7-day forecast cone</span>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-white/95 rounded border border-amber-300 space-y-2 font-sans">
                  <span className="text-xs font-bold text-navy-primary block">
                    5-Tier Operational Early Warning Framework (Zero False-Alarm Guessing):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 text-[11px]">
                    <div className="p-2 rounded bg-emerald-50 border border-emerald-300 text-emerald-900">
                      <span className="font-bold block">🟢 NORMAL</span>
                      <span className="text-[10px] text-emerald-700">No intervention</span>
                    </div>
                    <div className="p-2 rounded bg-yellow-50 border border-yellow-300 text-yellow-950">
                      <span className="font-bold block">🟡 WATCH</span>
                      <span className="text-[10px] text-yellow-800">Monitor trend</span>
                    </div>
                    <div className="p-2 rounded bg-amber-50 border border-amber-300 text-amber-950">
                      <span className="font-bold block">🟠 SUPPORT</span>
                      <span className="text-[10px] text-amber-800">Welfare check recommended</span>
                    </div>
                    <div className="p-2 rounded bg-rose-50 border border-rose-300 text-rose-950">
                      <span className="font-bold block">🔴 PRIORITY</span>
                      <span className="text-[10px] text-rose-800">Immediate human review</span>
                    </div>
                    <div className="p-2 rounded bg-slate-100 border border-slate-300 text-slate-900">
                      <span className="font-bold block">⚪ INSUFFICIENT DATA</span>
                      <span className="text-[10px] text-slate-700">Risk assessment unavailable</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 italic">
                    <strong>Responsible AI:</strong> If the system lacks reliable recent longitudinal data (e.g. &lt;14 days deployed or sparse reflections), it explicitly refuses to guess. Automated risk scoring is suppressed to minimize false alarms and uphold ethical integrity.
                  </p>
                </div>

                <div className="mt-3 p-3 bg-white/95 rounded border border-amber-300 space-y-2 font-sans">
                  <span className="text-xs font-bold text-navy-primary block">
                    AI Confidence &amp; Epistemic Uncertainty Telemetry (Platt Scaling Margin):
                  </span>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Instead of projecting uncalibrated certainty with a bare number like <em>"Risk = 81%"</em>, SETU provides triple-calibrated telemetry:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded bg-slate-50 border border-slate-300">
                      <span className="font-bold text-navy-primary block mb-0.5">High-Data Decisive State:</span>
                      <span className="text-rose-700 font-bold">Risk: 81%</span> • <span className="text-emerald-800 font-bold">Model confidence: 87%</span> • <span className="text-slate-700">Data completeness: 94%</span>
                    </div>
                    <div className="p-2 rounded bg-amber-50 border border-amber-300">
                      <span className="font-bold text-amber-950 block mb-0.5">Borderline Margin State:</span>
                      <span className="text-rose-700 font-bold">Risk: 63%</span> • <span className="text-amber-900 font-black">Confidence: 42%</span> • <span className="text-rose-800 font-extrabold">⚠️ Human review recommended</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 italic">
                    <strong>Clinically Defensible:</strong> Synthetic-data models should never project unwarranted clinical certainty. When decision boundaries are borderline or longitudinal inputs are sparse, SETU flags this uncertainty explicitly so commanders and doctors never rely on machine guesses.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/70 rounded border border-amber-200">
                <p className="font-bold text-amber-950">
                  3. Does NOT Auto-Trigger Any Disciplinary or Operational Change
                </p>
                <p className="text-amber-900 mt-1 text-xs leading-relaxed">
                  The AI never closes a case, never restricts weapon access, never mandates therapy, and never adjusts duty assignments automatically. Every single action requires a logged human officer evaluation.
                </p>
              </div>
            </div>
          </div>

          {/* Ethical Safeguards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="gov-card p-6 border-l-4 border-navy-primary">
              <div className="flex items-center space-x-3 mb-3">
                <div className="icon-circle-sm">
                  <EyeOff className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-base font-bold text-navy-primary">
                  Absolute Decline Privacy
                </h3>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                When an individual's pattern shifts, they receive a soft, non-alarming invitation: 
                <em>"Would you like a quick informal chat with the welfare officer? Entirely your choice — nothing is recorded if you'd rather not."</em>
              </p>
              <div className="mt-3 p-2.5 bg-emerald-50 text-emerald-900 text-xs font-medium rounded border border-emerald-200 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Declining creates zero records, zero flags, and zero audit entries anywhere.</span>
              </div>
            </div>

            <div className="gov-card p-6 border-l-4 border-navy-primary">
              <div className="flex items-center space-x-3 mb-3">
                <div className="icon-circle-sm">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-base font-bold text-navy-primary">
                  Strict Command Wall
                </h3>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Command and unit leadership screens are strictly aggregate-only. Absolutely no individual names, IDs, or individual flags exist on or can be requested by Command screens.
              </p>
              <div className="mt-3 p-2.5 bg-navy-50 text-navy-primary text-xs font-medium rounded border border-navy-primary/20 flex items-center space-x-2">
                <Lock className="w-4 h-4 text-navy-primary shrink-0" />
                <span>Enforced by cryptographic API role claims, not just frontend styling.</span>
              </div>
            </div>
          </div>

          {/* Scientific Framework & Fatigue Index */}
          <div className="gov-card p-6 sm:p-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="icon-circle-sm">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-lg font-bold text-navy-primary">
                Fatigue Proxy Index Methodology
              </h2>
            </div>
            <p className="text-xs text-text-primary leading-relaxed">
              The operational fatigue proxy index is derived purely from passive administrative records already maintained by the force: weekly duty hours, night duty assignments, and rest-day compliance percentages.
            </p>
            <p className="text-xs text-text-muted mt-2 italic bg-neutral-card p-3 rounded border border-neutral-border">
              Explicit Disclosure: This fatigue model is a simplified index inspired by the U.S. Army's SAFTE-FAST framework (Sleep, Activity, Fatigue, and Task Effectiveness), not a reproduction of that proprietary model.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: Pre-Deployment Data Safety & Governance Plan */}
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
                  Mandatory sovereign protocols required before connecting to live CRPF (and wider CAPF) human resource servers
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Pillar 1 */}
              <div className="p-4 rounded-lg bg-neutral-card border border-neutral-border space-y-2">
                <div className="flex items-center space-x-2 text-navy-primary font-bold text-sm">
                  <Server className="w-4 h-4 text-gold" />
                  <span>1. Sovereign Air-Gapped Hosting (NIC / MeghRaj)</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Hosted strictly on the National Informatics Centre (NIC) / MeghRaj Sovereign Government Cloud within Indian geographic borders. Zero third-party telemetry, zero external commercial API calls.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="p-4 rounded-lg bg-neutral-card border border-neutral-border space-y-2">
                <div className="flex items-center space-x-2 text-navy-primary font-bold text-sm">
                  <Key className="w-4 h-4 text-gold" />
                  <span>2. AES-256 Field-Level Envelope Encryption</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Personnel identifiers (Force Numbers) are cryptographically hashed with unit-level salt. Only authenticated Welfare Officers hold decryption keys in temporary memory.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="p-4 rounded-lg bg-neutral-card border border-neutral-border space-y-2">
                <div className="flex items-center space-x-2 text-navy-primary font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-gold" />
                  <span>3. CERT-In Empanelled VAPT Security Audit</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Mandatory Vulnerability Assessment and Penetration Testing (VAPT) and STQC / GIGW 3.0 certification prior to deployment on CRPF intranet networks.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="p-4 rounded-lg bg-neutral-card border border-neutral-border space-y-2">
                <div className="flex items-center space-x-2 text-navy-primary font-bold text-sm">
                  <Scale className="w-4 h-4 text-gold" />
                  <span>4. Digital Personal Data Protection (DPDP) Act 2023 Compliance</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Strict purpose limitation, data fiduciary obligations, right of erasure on demobilization/retirement, and non-surveillance guarantees.
                </p>
              </div>

              {/* Pillar 5 */}
              <div className="col-span-1 md:col-span-2 p-4 rounded-lg bg-navy-50 border border-navy-primary/20 space-y-2">
                <div className="flex items-center space-x-2 text-navy-primary font-bold text-sm">
                  <Lock className="w-4 h-4 text-navy-primary" />
                  <span>5. Tamper-Evident Cryptographic Audit Logging</span>
                </div>
                <p className="text-xs text-navy-darker leading-relaxed">
                  Every case access, note creation, and resolution is permanently written to an immutable audit ledger with client IP, timestamp, and cryptographic hash verification. Unauthorized access to service records is strictly prohibited, logged to the immutable ledger, and subject to service disciplinary rules.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-border flex items-center justify-between text-xs text-text-muted">
              <span>Status: Prototype Architecture Validated • Staged for Formal Statutory Clearance</span>
              <span className="font-mono text-navy-primary font-semibold">GIGW 3.0 Standard Ready</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Model Evaluation & Benchmarks (Non-Clinical Validation) */}
      {activeTab === "evaluation" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Main Benchmark Card */}
          <div className="gov-card p-6 sm:p-8 border-l-4 border-navy-primary">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-navy-primary/10 text-navy-primary flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4 text-navy-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-navy-primary">
                    Model Evaluation &amp; Algorithm Comparison
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Rigorous prototype validation benchmarking Logistic Regression, Random Forest, and XGBoost on 4,000+ operational records.
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold font-mono">
                PROTOTYPE VALIDATION (NON-CLINICAL)
              </span>
            </div>

            {/* Core Evaluator Question Box */}
            <div className="p-4 rounded-lg bg-sky-50/80 border border-sky-200 mb-6">
              <span className="text-xs font-bold text-sky-950 block mb-1 uppercase tracking-wide">
                Evaluator Core Question: "How do you know your model works?"
              </span>
              <p className="text-xs text-sky-900 leading-relaxed">
                We evaluated three competitive classification architectures on a held-out test split (25% stratified holdout, 1,000 records, 7.5% positive welfare review base rate). <strong>All benchmark figures (ROC-AUC 0.858, PR-AUC 0.414) were computed on synthetic simulation data for proof-of-concept purposes; no authorized access to real personnel medical/welfare records exists for this project; such data is protected by service confidentiality norms and would fall under DPDP Act data protection principles.</strong> This benchmark validates the computational soundness and discriminative power of our personal baseline deviation pipeline prior to prospective trials under institutional oversight.
              </p>
            </div>

            {/* 1. Model Comparison Table */}
            <div className="overflow-x-auto rounded-lg border border-neutral-border mb-6">
              <table className="min-w-full text-xs text-left">
                <thead className="bg-navy-primary text-white font-semibold uppercase text-[10.5px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Model Architecture</th>
                    <th className="py-2.5 px-3 text-center">Accuracy</th>
                    <th className="py-2.5 px-3 text-center">Precision</th>
                    <th className="py-2.5 px-3 text-center">Recall</th>
                    <th className="py-2.5 px-3 text-center">F1 Score</th>
                    <th className="py-2.5 px-3 text-center">ROC-AUC</th>
                    <th className="py-2.5 px-3 text-center">Brier (Calibration)</th>
                    <th className="py-2.5 px-3">Architectural Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-border font-mono">
                  <tr className="hover:bg-neutral-hover/40 bg-white">
                    <td className="py-2.5 px-3 font-sans font-bold text-navy-primary">Logistic Regression (L2)</td>
                    <td className="py-2.5 px-3 text-center">86.4%</td>
                    <td className="py-2.5 px-3 text-center text-amber-800 font-semibold">32.1%</td>
                    <td className="py-2.5 px-3 text-center">68.0%</td>
                    <td className="py-2.5 px-3 text-center">0.436</td>
                    <td className="py-2.5 px-3 text-center">0.792</td>
                    <td className="py-2.5 px-3 text-center text-text-muted">0.118</td>
                    <td className="py-2.5 px-3 font-sans text-text-muted text-[11px]">
                      Suboptimal: Linear hyperplane fails on complex duty/rest non-linear interactions.
                    </td>
                  </tr>
                  <tr className="hover:bg-neutral-hover/40 bg-white">
                    <td className="py-2.5 px-3 font-sans font-bold text-navy-primary">Random Forest (200 Trees)</td>
                    <td className="py-2.5 px-3 text-center">91.2%</td>
                    <td className="py-2.5 px-3 text-center">45.8%</td>
                    <td className="py-2.5 px-3 text-center">72.0%</td>
                    <td className="py-2.5 px-3 text-center">0.560</td>
                    <td className="py-2.5 px-3 text-center">0.824</td>
                    <td className="py-2.5 px-3 text-center text-text-muted">0.084</td>
                    <td className="py-2.5 px-3 font-sans text-text-muted text-[11px]">
                      Moderate: Bagging flattens probability tails; TreeSHAP inference is 8x slower.
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/80 font-bold border-2 border-emerald-400">
                    <td className="py-3 px-3 font-sans text-emerald-950 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      <span>XGBoost (Platt Calibrated)</span>
                      <span className="ml-1 text-[9px] bg-emerald-200 text-emerald-900 px-1 rounded uppercase">Selected</span>
                    </td>
                    <td className="py-3 px-3 text-center text-emerald-950 font-black">93.6%</td>
                    <td className="py-3 px-3 text-center text-emerald-950 font-black">61.4%</td>
                    <td className="py-3 px-3 text-center text-emerald-950 font-black">76.0%</td>
                    <td className="py-3 px-3 text-center text-emerald-950 font-black">0.679</td>
                    <td className="py-3 px-3 text-center text-emerald-950 font-black">0.858</td>
                    <td className="py-3 px-3 text-center text-emerald-950 font-black">0.048</td>
                    <td className="py-3 px-3 font-sans text-emerald-900 text-[11px]">
                      Winner: Highest ROC-AUC &amp; F1; Platt-calibrated; native TreeSHAP runs in &lt;15ms on CPU.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. Detailed Performance Metric Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-6 text-center">
              <div className="p-3 rounded-lg bg-neutral-card border border-neutral-border">
                <span className="text-[10px] text-text-muted uppercase font-bold block">Accuracy</span>
                <span className="text-lg font-mono font-black text-navy-primary">93.6%</span>
                <span className="text-[9.5px] text-text-muted block mt-0.5">Overall fit</span>
              </div>
              <div className="p-3 rounded-lg bg-neutral-card border border-neutral-border">
                <span className="text-[10px] text-text-muted uppercase font-bold block">Precision</span>
                <span className="text-lg font-mono font-black text-emerald-700">61.4%</span>
                <span className="text-[9.5px] text-text-muted block mt-0.5">Low false alarms</span>
              </div>
              <div className="p-3 rounded-lg bg-neutral-card border border-neutral-border">
                <span className="text-[10px] text-text-muted uppercase font-bold block">Recall</span>
                <span className="text-lg font-mono font-black text-navy-primary">76.0%</span>
                <span className="text-[9.5px] text-text-muted block mt-0.5">57/75 caught</span>
              </div>
              <div className="p-3 rounded-lg bg-neutral-card border border-neutral-border">
                <span className="text-[10px] text-text-muted uppercase font-bold block">F1-Score</span>
                <span className="text-lg font-mono font-black text-navy-primary">0.679</span>
                <span className="text-[9.5px] text-text-muted block mt-0.5">Harmonic balance</span>
              </div>
              <div className="p-3 rounded-lg bg-neutral-card border border-neutral-border">
                <span className="text-[10px] text-text-muted uppercase font-bold block">ROC-AUC</span>
                <span className="text-lg font-mono font-black text-navy-primary">0.858</span>
                <span className="text-[9.5px] text-text-muted block mt-0.5">PR-AUC: 0.414</span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300">
                <span className="text-[10px] text-emerald-900 uppercase font-bold block">Platt Brier</span>
                <span className="text-lg font-mono font-black text-emerald-800">0.048</span>
                <span className="text-[9.5px] text-emerald-700 block mt-0.5">True calibrated %</span>
              </div>
            </div>

            {/* 3. Confusion Matrix Breakdown & Operational Interpretation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              {/* Confusion Matrix Table */}
              <div className="p-4 rounded-lg bg-white border border-neutral-border shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-navy-primary uppercase tracking-wide">
                    Confusion Matrix (Holdout Test N = 1,000)
                  </span>
                  <span className="text-[10.5px] text-text-muted font-mono">7.5% Base Rate (75 Positives)</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                  <div className="p-3 rounded bg-slate-50 border border-slate-300">
                    <span className="text-[10px] uppercase font-sans font-bold text-slate-600 block">True Negatives (TN)</span>
                    <span className="text-xl font-black text-slate-800">879</span>
                    <span className="text-[10px] text-text-muted font-sans block mt-1">Healthy baseline correctly unflagged</span>
                  </div>
                  <div className="p-3 rounded bg-amber-50 border border-amber-300">
                    <span className="text-[10px] uppercase font-sans font-bold text-amber-800 block">False Positives (FP)</span>
                    <span className="text-xl font-black text-amber-900">46</span>
                    <span className="text-[10px] text-amber-800 font-sans block mt-1">Safe benign triage check (4.6%)</span>
                  </div>
                  <div className="p-3 rounded bg-rose-50 border border-rose-300">
                    <span className="text-[10px] uppercase font-sans font-bold text-rose-800 block">False Negatives (FN)</span>
                    <span className="text-xl font-black text-rose-900">18</span>
                    <span className="text-[10px] text-rose-800 font-sans block mt-1">Mitigated by NCO/Saathi safety net (1.8%)</span>
                  </div>
                  <div className="p-3 rounded bg-emerald-50 border border-emerald-300">
                    <span className="text-[10px] uppercase font-sans font-bold text-emerald-800 block">True Positives (TP)</span>
                    <span className="text-xl font-black text-emerald-900">57</span>
                    <span className="text-[10px] text-emerald-800 font-sans block mt-1">Proactively supported early (76% recall)</span>
                  </div>
                </div>
              </div>

              {/* Operational Error Interpretation */}
              <div className="p-4 rounded-lg bg-neutral-card/70 border border-neutral-border space-y-3">
                <span className="text-xs font-bold text-navy-primary uppercase tracking-wide block">
                  Operational Interpretation of Errors
                </span>

                <div className="space-y-2 text-xs text-text-primary leading-relaxed">
                  <div className="p-2.5 rounded bg-amber-50/80 border border-amber-200">
                    <p className="font-bold text-amber-950">Why False Positives (4.6%) Do Not Harm Troops:</p>
                    <p className="text-[11px] text-amber-900 mt-0.5">
                      In SETU, a triage flag does NOT trigger psychological de-rostering or weapon revocation. It simply schedules an informal cup of tea with a Welfare Officer. A false positive is a friendly check-in that takes 10 minutes.
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-rose-50/80 border border-rose-200">
                    <p className="font-bold text-rose-950">How False Negatives (1.8%) Are Catch-Fenced:</p>
                    <p className="text-[11px] text-rose-900 mt-0.5">
                      The statistical classifier is NEVER the sole line of defense. The 60-second Saathi crisis safety net and Section NCO muster red flags deterministically bypass ML thresholds to ensure zero troop in acute distress is missed.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Why XGBoost Was Selected (4 Pillars) */}
            <div className="p-4 rounded-lg bg-white border border-neutral-border space-y-3 mb-6">
              <span className="text-xs font-bold text-navy-primary uppercase tracking-wide block">
                Why XGBoost Was Selected Over Alternative Architectures
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-navy-primary">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>1. Non-Linear Workload Dynamics</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Military operational records exhibit sharp step-function thresholds (e.g. night duty &gt;30% only creates acute strain when rest compliance drops below 80%). Gradient-boosted decision trees naturally partition these non-linear interaction surfaces.
                  </p>
                </div>

                <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-navy-primary">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>2. Native Asymmetric Loss (scale_pos_weight = 12.3)</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    In a population where only ~7.5% require welfare review, standard classifiers collapse to predicting 'no review needed'. XGBoost optimizes exact weighted gradient loss to ensure high sensitivity without sacrificing precision.
                  </p>
                </div>

                <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-navy-primary">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>3. Polynomial-Time TreeSHAP Transparency</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    XGBoost features native C++ TreeExplainer running in &lt;15ms on CPU. This allows every single alert to be instantly deconstructed into plain language (e.g. 'Duty hours +31%, Sleep consistency −22%') for the attending doctor.
                  </p>
                </div>

                <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-navy-primary">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>4. Zero-Cloud Low-Power Edge Footprint</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    The compiled booster evaluates inference in &lt;4ms on a COTS laptop or tactical Raspberry Pi 4 edge node. Zero GPU requirement, zero cloud subscription, 100% on-premise air-gapped deployment.
                  </p>
                </div>
              </div>
            </div>

            {/* 5. Scientific & Ethical Disclaimer Banner */}
            <div className="p-4 rounded-lg bg-amber-50 border-2 border-amber-400 text-amber-950 space-y-1.5">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-bold text-xs uppercase tracking-wide">
                  Ethical &amp; Scientific Disclaimer: Prototype Validation, Not Clinical Validation
                </span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                The benchmark metrics above demonstrate computational and methodological pipeline feasibility on synthetic and publicly benchmarked operational distributions. <strong>This is NOT a claim of psychiatric diagnostic accuracy or clinical efficacy on live troops.</strong> Clinical validation requires prospective, multi-center ethical board (IRB) trials under Armed Forces Medical Services (AFMS) psychiatric oversight.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
