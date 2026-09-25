import React, { useState, useEffect } from "react";
import type { User } from "./types";
import { apiLogin, apiGetMe, getCachedUser, removeToken } from "./api";
import { AppHeader } from "./components/AppHeader";
import { PersonnelView } from "./components/PersonnelView";
import { NcoView } from "./components/NcoView";
import { WelfareView } from "./components/WelfareView";
import { DoctorView } from "./components/DoctorView";
import { CommandView } from "./components/CommandView";
import { AdminView } from "./components/AdminView";
import { PublicAbout } from "./components/PublicAbout";
import { Shield, Lock, AlertCircle } from "lucide-react";

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [publicAboutTab, setPublicAboutTab] = useState<"manifesto" | "charter" | "governance" | null>(null);

  // Login form state
  const [username, setUsername] = useState("welfare_demo");
  const [password, setPassword] = useState("Password@123");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const cached = getCachedUser();
    const isExplicitLogout = localStorage.getItem("gm_explicit_logout") === "true";
    if (cached) {
      setCurrentUser(cached);
      try {
        const fresh = await apiGetMe();
        setCurrentUser(fresh);
      } catch (err) {
        // Token expired or invalid
        removeToken();
        setCurrentUser(null);
      }
    } else if (!isExplicitLogout) {
      // Default to Welfare Officer for initial demonstration if not explicitly logged out
      loginAsDemoUser("welfare_demo");
    }
    setLoading(false);
  };

  const loginAsDemoUser = async (user: string) => {
    setLoggingIn(true);
    setLoginError(null);
    try {
      localStorage.removeItem("gm_explicit_logout");
      const data = await apiLogin(user, "Password@123");
      setCurrentUser(data.user);
      setPublicAboutTab(null);
    } catch (err: any) {
      setLoginError(err.message || "Login failed. Ensure backend server is running.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      localStorage.removeItem("gm_explicit_logout");
      const data = await apiLogin(username, password);
      setCurrentUser(data.user);
      setPublicAboutTab(null);
    } catch (err: any) {
      setLoginError(err.message || "Invalid credentials.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.setItem("gm_explicit_logout", "true");
    removeToken();
    setCurrentUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFBFD] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-3 border-navy-primary border-t-gold animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-text-muted font-sans">Connecting to SETU Security Core...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD] text-text-primary">
      {/* Header */}
      <AppHeader
        currentUser={currentUser}
        onSwitchRole={loginAsDemoUser}
        onLogout={handleLogout}
        onOpenPublicAbout={(tab = "manifesto") => setPublicAboutTab(tab)}
      />

      {/* Main Container */}
      <main className="flex-1">
        {publicAboutTab ? (
          <PublicAbout
            initialTab={publicAboutTab}
            onBack={() => setPublicAboutTab(null)}
          />
        ) : !currentUser ? (
          /* Login Screen */
          <div className="max-w-xl mx-auto py-12 px-4">
            <div className="gov-card p-6 sm:p-8 border-t-4 border-navy-primary">
              {/* National Header in Login Box */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-[3px] bg-gold text-navy-primary flex items-center justify-center mx-auto mb-3 border border-gold-dark font-bold">
                  <Shield className="w-6 h-6 text-navy-primary font-bold" />
                </div>
                <span className="badge-khaki font-semibold mb-1">
                  Ministry of Home Affairs • Government of India
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-navy-primary mt-1">
                  SETU (सेतु) Access Portal
                </h2>
                <p className="text-xs text-text-muted mt-1 font-sans">
                  SIH26186 — CAPF Personnel Welfare Monitoring System • गार्जियन माइंड्स (Guardian Minds)
                </p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 bg-red-50 text-red-800 border border-red-200 rounded-[2px] text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleManualLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Force Personnel System Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-[2px] border border-neutral-border bg-white focus:border-navy-primary outline-none"
                    placeholder="e.g. welfare_demo"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Security Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-[2px] border border-neutral-border bg-white focus:border-navy-primary outline-none"
                    placeholder="••••••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loggingIn}
                  className="w-full py-2.5 rounded-[2px] bg-navy-primary hover:bg-navy-light text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-gold" />
                  <span>{loggingIn ? "Authenticating via Secure Token..." : "Access Authorized Workstation"}</span>
                </button>
              </form>

              {/* Quick 1-Click Evaluation Credentials for Evaluators */}
              <div className="mt-6 pt-5 border-t border-neutral-border">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold text-navy-primary uppercase tracking-wider">
                    ⚡ 1-Click Institutional Role Logins for SIH Judges:
                  </p>
                  <span className="text-[10px] text-text-muted">Click any role to test</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => loginAsDemoUser("personnel_demo")}
                    className="p-2.5 rounded bg-neutral-card hover:bg-neutral-hover border border-neutral-border text-left transition-colors group"
                  >
                    <div className="font-bold text-navy-primary group-hover:text-navy-light">
                      1. Frontline Personnel (Shifted Pattern)
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">
                      Ct. Rajesh Kumar Singh • Soft Invite & 100% Decline Privacy
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => loginAsDemoUser("personnel_calm")}
                    className="p-2.5 rounded bg-neutral-card hover:bg-neutral-hover border border-neutral-border text-left transition-colors group"
                  >
                    <div className="font-bold text-navy-primary group-hover:text-navy-light">
                      2. Frontline Personnel (Normal Baseline)
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">
                      Ct. Sandeep Verma • Steady Service View (Zero Flags)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => loginAsDemoUser("nco_demo")}
                    className="p-2.5 rounded bg-neutral-card hover:bg-neutral-hover border border-neutral-border text-left transition-colors group"
                  >
                    <div className="font-bold text-navy-primary group-hover:text-navy-light">
                      3. Section NCO / Havildar
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">
                      Havildar Vikram Rathore • Rapid Muster & Leniency Filter
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => loginAsDemoUser("doctor_demo")}
                    className="p-2.5 rounded bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-300 text-left transition-colors group"
                  >
                    <div className="font-bold text-emerald-950 flex items-center justify-between">
                      <span>4. Doctor / Medical Officer</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 font-bold">New Role</span>
                    </div>
                    <div className="text-[10px] text-emerald-900 mt-0.5">
                      Dr. Maninderjit Singh • Monthly Medical Camp & Vitals Roster
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => loginAsDemoUser("welfare_demo")}
                    className="p-2.5 rounded bg-amber-50 hover:bg-amber-100/80 border border-amber-300 text-left transition-colors group"
                  >
                    <div className="font-bold text-amber-950 flex items-center justify-between">
                      <span>5. Welfare Officer (Sole Access)</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-bold">Key Demo</span>
                    </div>
                    <div className="text-[10px] text-amber-900 mt-0.5">
                      Dr. Ananya Sharma • Triage Queue & Tea Check-in Protocol
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => loginAsDemoUser("command_demo")}
                    className="p-2.5 rounded bg-neutral-card hover:bg-neutral-hover border border-neutral-border text-left transition-colors group"
                  >
                    <div className="font-bold text-navy-primary group-hover:text-navy-light">
                      6. Command / Unit Leadership
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">
                      Cmdt. Arvind Joshi • Aggregate Strain Heatmap (Zero PII)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => loginAsDemoUser("admin_demo")}
                    className="p-2.5 rounded bg-neutral-card hover:bg-neutral-hover border border-neutral-border text-left transition-colors group"
                  >
                    <div className="font-bold text-navy-primary group-hover:text-navy-light">
                      7. Security & Audit Admin
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">
                      Director M. Sundaram • Immutable Audit Ledger & DPDP Plan
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Role-based Workspaces */
          <div>
            {currentUser.role === "personnel" && <PersonnelView currentUser={currentUser} />}
            {currentUser.role === "nco" && <NcoView currentUser={currentUser} />}
            {currentUser.role === "doctor" && <DoctorView currentUser={currentUser} />}
            {currentUser.role === "welfare_officer" && <WelfareView currentUser={currentUser} />}
            {currentUser.role === "command" && <CommandView currentUser={currentUser} />}
            {currentUser.role === "admin" && <AdminView currentUser={currentUser} />}
          </div>
        )}
      </main>

      {/* Official Government Footer */}
      <footer className="bg-navy-primary text-slate-300 text-xs py-6 border-t-2 border-gold mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-serif font-semibold text-white flex items-center space-x-2">
              <span>SETU (सेतु) — SIH26186 Personnel Welfare Monitoring System</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Developed by Team Guardian Minds for the Central Armed Police Forces • Ministry of Home Affairs, Government of India
            </p>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <button
              onClick={() => setPublicAboutTab("manifesto")}
              className="text-gold hover:underline font-semibold"
            >
              Why We Built This
            </button>
            <span>•</span>
            <button
              onClick={() => setPublicAboutTab("charter")}
              className="hover:text-gold transition-colors underline"
            >
              AI Boundary Charter
            </button>
            <span>•</span>
            <button
              onClick={() => setPublicAboutTab("governance")}
              className="hover:text-gold transition-colors underline"
            >
              DPDP 2023 Security Blueprint
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
