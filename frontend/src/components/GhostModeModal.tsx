import React, { useState, useEffect, useRef } from "react";
import { X, Moon, Zap, VolumeX, Play, Pause } from "lucide-react";
import { useLanguage } from "../LanguageContext";

interface GhostModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Phase = "inhale" | "hold_in" | "exhale" | "hold_out";

export const GhostModeModal: React.FC<GhostModeModalProps> = ({ isOpen, onClose }) => {
  const { tr } = useLanguage();
  const [isActive, setIsActive] = useState(true);
  const [phase, setPhase] = useState<Phase>("inhale");
  const [seconds, setSeconds] = useState(4);
  const timerRef = useRef<number | null>(null);

  const DURATION = 4;

  const triggerHaptic = (targetPhase: Phase) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        if (targetPhase === "inhale") {
          navigator.vibrate([250, 100, 250, 100, 500]);
        } else if (targetPhase === "hold_in" || targetPhase === "hold_out") {
          navigator.vibrate([90, 100, 90]);
        } else if (targetPhase === "exhale") {
          navigator.vibrate([500, 100, 250, 100, 100]);
        }
      } catch (e) {
        // Haptics gracefully ignored if not supported
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("inhale");
      setSeconds(DURATION);
      setIsActive(true);
      return;
    }

    triggerHaptic("inhale");

    timerRef.current = window.setInterval(() => {
      if (!isActive) return;

      setSeconds((prev) => {
        if (prev > 1) {
          return prev - 1;
        }

        setPhase((curr) => {
          let next: Phase = "inhale";
          if (curr === "inhale") next = "hold_in";
          else if (curr === "hold_in") next = "exhale";
          else if (curr === "exhale") next = "hold_out";
          else if (curr === "hold_out") next = "inhale";

          triggerHaptic(next);
          return next;
        });

        return DURATION;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isActive]);

  if (!isOpen) return null;

  const getPhaseInfo = () => {
    switch (phase) {
      case "inhale":
        return {
          label: tr("INHALE (श्वास अंदर)", "सांस अंदर लें"),
          sub: tr("Slow diaphragmatic intake through nose", "नाक से धीरे-धीरे फेफड़ों में हवा भरें"),
          scale: "scale-125",
          ring: "stroke-red-600",
          glow: "rgba(220, 38, 38, 0.4)",
          bg: "bg-red-950/30",
          text: "text-red-400"
        };
      case "hold_in":
        return {
          label: tr("HOLD (सांस रोकें)", "सांस रोकें"),
          sub: tr("Lock core gently, zero tension", "बिना दबाव डाले शांति से सांस रोकें"),
          scale: "scale-125",
          ring: "stroke-amber-600",
          glow: "rgba(217, 119, 6, 0.3)",
          bg: "bg-amber-950/30",
          text: "text-amber-400"
        };
      case "exhale":
        return {
          label: tr("EXHALE (श्वास बाहर)", "सांस छोड़ें"),
          sub: tr("Slow controlled release through mouth", "मुँह से नियंत्रित रूप से पूरी सांस निकालें"),
          scale: "scale-80",
          ring: "stroke-red-800",
          glow: "rgba(185, 28, 28, 0.3)",
          bg: "bg-red-950/20",
          text: "text-red-500"
        };
      case "hold_out":
        return {
          label: tr("REST (विश्राम)", "शांत रहें"),
          sub: tr("Settle before the next cycle", "अगले चक्र से पूर्व शांत रहें"),
          scale: "scale-80",
          ring: "stroke-zinc-800",
          glow: "rgba(39, 39, 42, 0.2)",
          bg: "bg-black",
          text: "text-zinc-500"
        };
    }
  };

  const info = getPhaseInfo();

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black text-white flex flex-col justify-between p-4 sm:p-6 select-none animate-in fade-in duration-300"
      onClick={() => setIsActive((prev) => !prev)}
    >
      {/* Top Bar (Ultra-low lux sub-2 lux crimson) */}
      <div className="flex items-center justify-between border-b border-red-950/60 pb-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-500">
            <Moon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-red-400 tracking-wider">
                GHOST MODE • TACTICAL GROUNDING
              </span>
              <span className="px-1.5 py-0.2 rounded bg-red-950 text-[9px] font-bold text-red-500 border border-red-900">
                &lt;1.5 LUX OLED
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">
              DoD Chill Drills &amp; SEAL Box Breathing • No Login Required • Silent Haptics
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-red-950/50 hover:bg-red-900/60 text-red-400 border border-red-900/80 transition-colors cursor-pointer"
          title="Exit Ghost Mode"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Center Breathing Engine */}
      <div className="flex flex-col items-center justify-center my-auto py-8">
        <div className="relative flex flex-col items-center justify-center">
          {/* Animated Glow Disc */}
          <div
            className={`w-64 h-64 sm:w-80 sm:h-80 rounded-full flex items-center justify-center transition-all duration-1000 ease-in-out border border-red-950/80 ${info.scale} ${info.bg}`}
            style={{
              boxShadow: `0 0 50px ${info.glow}`
            }}
          >
            {/* SVG Ring */}
            <svg className="w-64 h-64 sm:w-80 sm:h-80 absolute inset-0 -rotate-90 pointer-events-none" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="#1c0505" strokeWidth="2" />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                strokeWidth="3.5"
                strokeDasharray="276"
                strokeDashoffset={(276 * (DURATION - seconds)) / DURATION}
                strokeLinecap="round"
                className={`transition-all duration-1000 ease-linear ${info.ring}`}
              />
            </svg>

            {/* In-Ring Counter */}
            <div className="text-center z-10 px-4">
              <div className="text-6xl sm:text-7xl font-black font-mono text-red-500 leading-none tabular-nums tracking-tighter">
                {seconds}
              </div>
              <div className={`text-sm sm:text-base font-black tracking-wide mt-2 ${info.text}`}>
                {info.label}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1 max-w-[180px] mx-auto leading-tight font-sans">
                {info.sub}
              </div>
            </div>
          </div>
        </div>

        {/* Operational Guidance */}
        <div className="mt-8 text-center space-y-1">
          <p className="text-xs font-mono text-zinc-400">
            {isActive
              ? tr("TOUCH ANYWHERE TO PAUSE • HOLD PHONE AGAINST CHEST", "रोकने हेतु कहीं भी स्पर्श करें • फोन को सीने से लगाएं")
              : tr("PAUSED • TOUCH SCREEN TO RESUME PACING", "विराम • पुनः प्रारंभ करने हेतु स्क्रीन स्पर्श करें")}
          </p>
          <p className="text-[10px] text-zinc-600 font-mono">
            {tr(
              "Zero Audio • Sub-Lux Light Discipline • Haptic Vibration Synchronized",
              "शून्य ऑडियो • अति-निम्न प्रकाश अनुशासन • कंपन आधारित लय"
            )}
          </p>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="flex items-center justify-between border-t border-red-950/60 pt-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center space-x-3 text-xs text-zinc-500 font-mono">
          <div className="flex items-center space-x-1.5">
            <VolumeX className="w-3.5 h-3.5 text-red-600" />
            <span>Audio: Silent</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-red-500" />
            <span>Haptics: Active</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsActive((p) => !p)}
            className="px-3 py-1.5 rounded bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-mono font-bold flex items-center space-x-1.5 cursor-pointer"
          >
            {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isActive ? "Pause" : "Resume"}</span>
          </button>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono font-bold cursor-pointer"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
};
