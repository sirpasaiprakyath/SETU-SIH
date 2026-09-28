import React, { useState } from "react";
import {
  User,
  LogOut,
  Info,
  ChevronDown,
  CheckCircle2,
  Coffee,
  PhoneCall,
  Scale,
} from "lucide-react";
import type {
  User as UserType,
} from "../types";

interface AppHeaderProps {
  currentUser: UserType | null;
  onSwitchRole: (username: string) => void;
  onLogout: () => void;
  onOpenPublicAbout: (tab?: "manifesto" | "charter" | "governance") => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentUser,
  onSwitchRole,
  onLogout,
  onOpenPublicAbout,
}) => {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<"normal" | "large">("normal");

  const demoAccounts = [
    {
      username: "personnel_demo",
      label: "1. Frontline Personnel (Shifted Pattern)",
      sub: "📱 Mobile App (Android/PWA) • Ct. Rajesh Kumar Singh",
      role: "personnel",
    },
    {
      username: "personnel_calm",
      label: "2. Frontline Personnel (Normal Baseline)",
      sub: "📱 Mobile App (Android/PWA) • Ct. Sandeep Verma",
      role: "personnel",
    },
    {
      username: "nco_demo",
      label: "3. Section NCO / Havildar",
      sub: "📱 Tactical Tablet View • Havildar Vikram Rathore",
      role: "nco",
    },
    {
      username: "doctor_demo",
      label: "4. Doctor / Medical Officer",
      sub: "💻 Clinical Console • Dr. Maninderjit Singh",
      role: "doctor",
    },
    {
      username: "welfare_demo",
      label: "5. Welfare Officer (Sole Access)",
      sub: "💻 Welfare Desk • Asst. Cmdt. Dr. Ananya Sharma",
      role: "welfare_officer",
    },
    {
      username: "command_demo",
      label: "6. Command / Unit Leadership",
      sub: "💻 Command Radar • Cmdt. Arvind Joshi",
      role: "command",
    },
    {
      username: "admin_demo",
      label: "7. Security & Audit Admin",
      sub: "💻 Admin Ledger • Director M. Sundaram",
      role: "admin",
    },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "personnel":
        return <span className="badge-khaki font-semibold flex items-center gap-1"><span>📱</span> Frontline Mobile App</span>;
      case "nco":
        return <span className="badge-navy font-semibold flex items-center gap-1"><span>📲</span> Tactical Tablet (Section)</span>;
      case "doctor":
        return <span className="badge-navy font-bold text-emerald-300 border border-emerald-500/50">Medical Officer (Doctor)</span>;
      case "welfare_officer":
        return <span className="badge-gold font-bold">Welfare Officer (Isolated)</span>;
      case "command":
        return <span className="badge-navy font-bold">Command Leadership (Aggregate Only)</span>;
      case "admin":
        return <span className="badge-navy font-semibold">MHA Security Administrator</span>;
      default:
        return null;
    }
  };

  const handleFontSizeChange = (level: "normal" | "large") => {
    setFontSizeLevel(level);
    const root = document.documentElement;
    if (level === "normal") {
      root.classList.remove("text-size-large");
    } else {
      root.classList.add("text-size-large");
    }
  };

  return (
    <header className="bg-navy-primary text-white select-none border-b border-navy-deep">
      {/* Official Government Tricolor Stripe */}
      <div className="h-1 w-full flex">
        <div className="flex-1 bg-[#FF9933]"></div>
        <div className="flex-1 bg-[#FFFFFF]"></div>
        <div className="flex-1 bg-[#138808]"></div>
      </div>

      {/* Top Ministry & Standard GIGW Accessibility Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 border-b border-navy-deep/60 flex flex-wrap items-center justify-between text-xs text-slate-300">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-gold text-[10px]">
              Government of India
            </span>
            <span className="text-slate-500">|</span>
            <span className="font-semibold text-slate-200 text-[11px] sm:text-xs">
              Ministry of Home Affairs
            </span>
          </div>
          <span className="text-slate-500 hidden md:inline">|</span>
          <span className="text-slate-300 font-medium text-[11px] hidden md:inline">
            CRPF (Police-II Division, MHA • Pan-CAPF Scalable)
          </span>
        </div>

        {/* Top Right: GIGW Accessibility Controls */}
        <div className="flex items-center space-x-2.5 text-[11px] mt-1 sm:mt-0">
          {/* 24x7 Force Helpline */}
          <div className="hidden lg:flex items-center space-x-1.5 text-slate-300 bg-navy-deep px-2 py-0.5 rounded-[2px] border border-navy-light/40">
            <PhoneCall className="w-3 h-3 text-emerald-400" />
            <span>Tele-MANAS: <strong>14416</strong></span>
            <span className="text-slate-500">•</span>
            <span>KIRAN: <strong>1800-599-0019</strong></span>
          </div>

          <span className="text-slate-500 hidden sm:inline">|</span>

          {/* Accessibility: Text Size (A / A+) */}
          <div className="flex items-center space-x-1 bg-navy-deep px-1 py-0.5 rounded-[2px] border border-navy-light/40" title="Text size controller">
            <span className="text-[10px] text-slate-400 px-1 font-mono">
              Size:
            </span>
            <button
              onClick={() => handleFontSizeChange("normal")}
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded-[2px] cursor-pointer ${
                fontSizeLevel === "normal" ? "bg-navy-light text-gold border border-gold/40" : "text-slate-300 hover:text-white"
              }`}
              title="Normal Text Size"
            >
              A (Normal)
            </button>
            <button
              onClick={() => handleFontSizeChange("large")}
              className={`px-1.5 py-0.5 text-[11px] font-bold rounded-[2px] cursor-pointer ${
                fontSizeLevel === "large" ? "bg-navy-light text-gold border border-gold/40" : "text-slate-300 hover:text-white"
              }`}
              title="Large Text Size"
            >
              A+ (Large)
            </button>
          </div>

          <span className="text-slate-500 hidden sm:inline">|</span>

          {/* Philosophy / Manifesto Button */}
          <button
            onClick={() => onOpenPublicAbout("manifesto")}
            className="text-gold hover:text-white flex items-center space-x-1 font-semibold underline decoration-gold/60 cursor-pointer"
          >
            <Coffee className="w-3 h-3 text-gold" />
            <span>Overview &amp; Why</span>
          </button>

          {/* AI Charter */}
          <button
            onClick={() => onOpenPublicAbout("charter")}
            className="text-slate-300 hover:text-white flex items-center space-x-1 underline decoration-slate-400 cursor-pointer"
          >
            <Info className="w-3 h-3 text-slate-400" />
            <span>AI Charter</span>
          </button>
        </div>
      </div>

      {/* Main Branding & Live Role Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 border-b-2 border-gold">
        {/* Emblem & Identity */}
        <div className="flex items-center space-x-3.5">
          <img
            src="/SETU_LOGO.png"
            alt="SETU Guardian Minds Logo"
            className="w-10 h-10 rounded-[4px] object-contain bg-white p-0.5 border border-gold-dark shrink-0 shadow-md"
          />
          <div>
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                SETU
              </h1>
              <span className="text-xs sm:text-sm font-semibold text-gold-light">
                Guardian Minds
              </span>
              <span className="px-1.5 py-0.2 rounded-[2px] bg-navy-deep text-[10px] font-mono font-bold text-gold border border-navy-light/60 uppercase">
                SIH26186
              </span>
            </div>
            <p className="text-xs text-slate-300 font-sans tracking-normal mt-0.5">
              Multimodal Predictive Intelligence for Personnel Wellness
            </p>
          </div>
        </div>

        {/* User Identity */}
        <div className="flex items-center space-x-2.5">
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center space-x-2.5 px-3 py-1.5 rounded-[2px] bg-navy-deep hover:bg-navy-light text-left border border-gold/40 cursor-pointer"
                title="Switch role for demonstration"
              >
                <div className="w-6 h-6 rounded-[2px] bg-navy-primary text-gold border border-gold/40 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-white leading-tight flex items-center space-x-1.5">
                    <span>{currentUser.full_name}</span>
                    <ChevronDown className="w-3 h-3 text-gold" />
                  </div>
                  <div className="text-[10px] text-slate-300 font-mono flex items-center space-x-1 mt-0.5">
                    <span>{currentUser.username}</span>
                    <span>•</span>
                    <span className="capitalize">{currentUser.role.replace("_", " ")}</span>
                  </div>
                </div>
              </button>

              {/* Dropdown Menu */}
              {roleMenuOpen && (
                <div className="absolute right-0 mt-1 w-84 rounded-[3px] bg-white text-navy-primary border border-neutral-border py-1 z-50">
                  <div className="px-3 py-2 border-b border-neutral-border bg-neutral-card text-xs">
                    <p className="font-bold text-navy-primary flex items-center space-x-1.5">
                      <Scale className="w-3.5 h-3.5 text-navy-primary" />
                      <span>Live Institutional Role Switcher</span>
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Select any account to evaluate role-isolated interfaces
                    </p>
                  </div>

                  <div className="divide-y divide-neutral-border/50 max-h-84 overflow-y-auto">
                    {demoAccounts.map((account) => (
                      <button
                        key={account.username}
                        onClick={() => {
                          onSwitchRole(account.username);
                          setRoleMenuOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 hover:bg-neutral-hover text-xs transition-colors flex items-start justify-between ${
                          currentUser.username === account.username ? "bg-navy-50" : ""
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-navy-primary flex items-center space-x-1.5">
                            <span>{account.label}</span>
                            {currentUser.username === account.username && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                            )}
                          </div>
                          <div className="text-[11px] text-text-muted mt-0.5">{account.sub}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="p-2.5 border-t border-neutral-border bg-neutral-card/70 flex items-center justify-between text-xs">
                    <button
                      onClick={() => {
                        onOpenPublicAbout("manifesto");
                        setRoleMenuOpen(false);
                      }}
                      className="text-navy-primary hover:text-navy-light font-semibold flex items-center space-x-1 underline text-[11px]"
                    >
                      <Coffee className="w-3 h-3 text-gold" />
                      <span>What We Built & Why</span>
                    </button>
                    <button
                      onClick={onLogout}
                      className="text-red-700 hover:text-red-900 font-semibold flex items-center space-x-1 text-[11px]"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentUser && (
            <div className="hidden md:block">
              {getRoleBadge(currentUser.role)}
            </div>
          )}
        </div>
      </div>

    </header>
  );
};
