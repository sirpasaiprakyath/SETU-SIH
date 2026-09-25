import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../LanguageContext";
import {
  Wind,
  Play,
  Pause,
  RotateCcw,
  Music,
  ShieldCheck,
  EyeOff,
  Sparkles,
  Volume2,
  Moon,
  Zap
} from "lucide-react";

type BreathingPhase = "idle" | "inhale" | "hold_in" | "exhale" | "hold_out";

export const VishramSection: React.FC = () => {
  const { language, tr } = useLanguage();

  // Breathing Guide State (strictly local, zero logging or tracking)
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<BreathingPhase>("idle");
  const [secondsRemaining, setSecondsRemaining] = useState(4);
  const [isStealthMode, setIsStealthMode] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Phase duration configuration: Box breathing (4s Inhale, 4s Hold, 4s Exhale, 4s Hold)
  const PHASE_DURATION = 4;

  const triggerHaptic = (targetPhase: BreathingPhase) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        if (targetPhase === "inhale") {
          navigator.vibrate([200, 100, 200, 100, 400]);
        } else if (targetPhase === "hold_in" || targetPhase === "hold_out") {
          navigator.vibrate([80, 120, 80]);
        } else if (targetPhase === "exhale") {
          navigator.vibrate([400, 100, 200, 100, 100]);
        }
      } catch (e) {
        // Haptics gracefully ignored on unsupported devices
      }
    }
  };

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("idle");
      setSecondsRemaining(PHASE_DURATION);
      return;
    }

    // Initialize to inhale if coming from idle
    if (phase === "idle") {
      setPhase("inhale");
      setSecondsRemaining(PHASE_DURATION);
      triggerHaptic("inhale");
    }

    timerRef.current = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev > 1) {
          return prev - 1;
        }

        // Transition to next phase
        setPhase((currentPhase) => {
          let nextPhase: BreathingPhase = "inhale";
          switch (currentPhase) {
            case "inhale":
              nextPhase = "hold_in";
              break;
            case "hold_in":
              nextPhase = "exhale";
              break;
            case "exhale":
              nextPhase = "hold_out";
              break;
            case "hold_out":
              nextPhase = "inhale";
              break;
            default:
              nextPhase = "inhale";
          }
          triggerHaptic(nextPhase);
          return nextPhase;
        });
        return PHASE_DURATION;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, phase]);

  const handleToggleTimer = () => {
    setIsActive((prev) => !prev);
  };

  const handleResetTimer = () => {
    setIsActive(false);
    setPhase("idle");
    setSecondsRemaining(PHASE_DURATION);
  };

  // Phase text and styling (adapts dynamically to Tactical Stealth Blackout Mode)
  const getPhaseDetails = () => {
    if (isStealthMode) {
      switch (phase) {
        case "inhale":
          return {
            title: tr("Breathe In (Tactical Inhale)", "धीरे-धीरे सांस लें"),
            instruction: tr("Silent diaphragmatic expansion", "शांत डायाफ्रामिक श्वास"),
            scale: "scale-125",
            ringColor: "stroke-red-600",
            glowColor: "rgba(220, 38, 38, 0.4)",
            bgColor: "bg-red-950/40",
            textColor: "text-red-400"
          };
        case "hold_in":
          return {
            title: tr("Hold Posture", "सांस रोकें"),
            instruction: tr("Static focus, zero tremor", "स्थिर एकाग्रता • शांत रहें"),
            scale: "scale-125",
            ringColor: "stroke-amber-600",
            glowColor: "rgba(217, 119, 6, 0.3)",
            bgColor: "bg-amber-950/40",
            textColor: "text-amber-400"
          };
        case "exhale":
          return {
            title: tr("Exhale Controlled", "नियंत्रित सांस छोड़ें"),
            instruction: tr("Release autonomic tension", "सहानुभूतिपूर्ण तनाव मुक्त करें"),
            scale: "scale-75",
            ringColor: "stroke-red-800",
            glowColor: "rgba(185, 28, 28, 0.3)",
            bgColor: "bg-red-950/30",
            textColor: "text-red-300"
          };
        case "hold_out":
          return {
            title: tr("Zero-Pressure Rest", "शून्य दबाव विश्राम"),
            instruction: tr("Quiet grounding interval", "शांत ग्राउंडिंग अंतराल"),
            scale: "scale-75",
            ringColor: "stroke-slate-700",
            glowColor: "rgba(100, 116, 139, 0.2)",
            bgColor: "bg-black",
            textColor: "text-slate-400"
          };
        case "idle":
        default:
          return {
            title: tr("Tactical Stealth Pacing", "टैक्टिकल ब्लैकआउट पेसिंग"),
            instruction: tr("Sub-lux red illumination & haptics", "अति-निम्न प्रकाश व कंपन पेसिंग"),
            scale: "scale-95",
            ringColor: "stroke-red-900/60",
            glowColor: "transparent",
            bgColor: "bg-black",
            textColor: "text-red-500"
          };
      }
    }

    switch (phase) {
      case "inhale":
        return {
          title: tr("Breathe In Slowly", "धीरे-धीरे सांस लें"),
          instruction: tr("Expand lungs smoothly through nose", "नाक से धीरे-धीरे फेफड़ों में हवा भरें"),
          scale: "scale-125",
          ringColor: "stroke-emerald-500",
          glowColor: "rgba(16, 185, 129, 0.25)",
          bgColor: "bg-emerald-50/80",
          textColor: "text-navy-primary"
        };
      case "hold_in":
        return {
          title: tr("Hold Gently", "सांस रोकें"),
          instruction: tr("Pause quietly without straining", "बिना जोर लगाए शांति से सांस रोकें"),
          scale: "scale-125",
          ringColor: "stroke-amber-500",
          glowColor: "rgba(245, 158, 11, 0.25)",
          bgColor: "bg-amber-50/80",
          textColor: "text-navy-primary"
        };
      case "exhale":
        return {
          title: tr("Exhale Gently", "धीरे-धीरे सांस छोड़ें"),
          instruction: tr("Release breath smoothly through mouth", "मुँह से धीरे-धीरे पूरी सांस बाहर निकालें"),
          scale: "scale-75",
          ringColor: "stroke-sky-500",
          glowColor: "rgba(14, 165, 233, 0.2)",
          bgColor: "bg-sky-50/80",
          textColor: "text-navy-primary"
        };
      case "hold_out":
        return {
          title: tr("Pause & Settle", "शांत रहें"),
          instruction: tr("Rest before the next natural breath", "अगली सांस से पहले कुछ पल विश्राम करें"),
          scale: "scale-75",
          ringColor: "stroke-indigo-400",
          glowColor: "rgba(99, 102, 241, 0.15)",
          bgColor: "bg-indigo-50/80",
          textColor: "text-navy-primary"
        };
      case "idle":
      default:
        return {
          title: tr("Rhythm Breathing", "लयबद्ध श्वास"),
          instruction: tr("Press Start to begin a quiet 4-4-4-4 rhythm", "4-4-4-4 लय शुरू करने हेतु प्रारंभ दबाएं"),
          scale: "scale-95",
          ringColor: "stroke-slate-300",
          glowColor: "transparent",
          bgColor: "bg-slate-50",
          textColor: "text-navy-primary"
        };
    }
  };

  const currentPhaseDetails = getPhaseDetails();

  return (
    <div
      id="vishram-section"
      className={`p-5 sm:p-6 rounded-xl border-l-4 transition-colors duration-300 space-y-5 ${
        isStealthMode
          ? "bg-black border-l-red-600 border border-red-950/80 text-slate-200 shadow-2xl"
          : "gov-card border-l-emerald-600 bg-white shadow-xs"
      }`}
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-border gap-3">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
            <Wind className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-navy-primary">
                {language === "hi"
                  ? "विश्राम • अल्प विराम एवं विश्राम साधन"
                  : "Vishram • Short Break & Downtime Utility"}
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold border border-emerald-300 flex items-center space-x-1">
                <EyeOff className="w-3 h-3" />
                <span>{tr("100% Unmonitored & Private", "100% व्यक्तिगत • अनियंत्रित")}</span>
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {tr(
                "A self-care downtime resource available anytime to all personnel • Zero logging, zero scores, zero command visibility.",
                "सभी कार्मिकों हेतु उपलब्ध स्व-देखभाल साधन • शून्य ट्रैकिंग, कोई स्कोर नहीं, उच्चाधिकारियों को शून्य दृश्यता।"
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsStealthMode((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              isStealthMode
                ? "bg-red-950 text-red-300 border border-red-600 shadow-md ring-1 ring-red-500/50"
                : "bg-slate-900 text-white hover:bg-black border border-slate-700"
            }`}
          >
            <Moon className={`w-3.5 h-3.5 ${isStealthMode ? "text-red-400" : "text-amber-300"}`} />
            <span>
              {isStealthMode
                ? tr("🌑 Stealth Blackout (<2 lux)", "🌑 ब्लैकआउट सक्रिय (<2 lux)")
                : tr("Tactical Blackout Mode", "टैक्टिकल ब्लैकआउट मोड")}
            </span>
          </button>

          <span className={`text-[11px] px-2.5 py-1 rounded font-medium border flex items-center space-x-1.5 ${
            isStealthMode
              ? "bg-red-950/50 text-red-300 border-red-900"
              : "bg-slate-100 text-slate-700 border-slate-200"
          }`}>
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>{tr("Not a medical treatment • Simple short break", "चिकित्सा उपचार नहीं • केवल अल्प विश्राम")}</span>
          </span>
        </div>
      </div>

      {isStealthMode && (
        <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-lg text-xs text-red-300 flex items-center space-x-2">
          <Zap className="w-4 h-4 text-red-400 shrink-0" />
          <span>
            {tr(
              "Tactical Night-Vision Mode Active: Sub-lux red illumination with silent haptic pulse rhythms. Screen can be kept facedown against chest during post-mission decompression.",
              "टैक्टिकल नाइट-विज़न मोड सक्रिय: अति-निम्न प्रकाश और कंपन लय। ऑपरेशन के उपरांत स्क्रीन को सीने की ओर रख कर विश्राम किया जा सकता है।"
            )}
          </span>
        </div>
      )}

      {/* Main Grid: Breathing Exercise + Audio Downtime */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Panel 1: Pure CSS/SVG Animated Breathing Circle */}
        <div className={`p-5 rounded-lg border flex flex-col justify-between space-y-4 ${
          isStealthMode
            ? "border-red-950/80 bg-zinc-950 text-slate-200"
            : "border-neutral-border bg-gradient-to-b from-white via-slate-50/50 to-emerald-50/20"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold">
              <Sparkles className={`w-4 h-4 ${isStealthMode ? "text-red-500" : "text-emerald-600"}`} />
              <span className={isStealthMode ? "text-red-400" : "text-navy-primary"}>
                {isStealthMode
                  ? tr("Tactical Box Pacing (4-4-4-4 Haptic)", "टैक्टिकल बॉक्स पेसिंग (कंपन युक्त)")
                  : tr("Guided 4-4-4-4 Breathing Cycle", "4-4-4-4 निर्देशित श्वास चक्र")}
              </span>
            </div>
            <span className={`text-[10px] ${isStealthMode ? "text-red-400/80 font-mono" : "text-text-muted"}`}>
              {isStealthMode ? tr("Haptic Pulse Active", "हैप्टिक कंपन सक्रिय") : tr("Visual Pace Guide", "दृश्य गति संकेतक")}
            </span>
          </div>

          {/* SVG & Pure CSS Breathing Circle */}
          <div className="relative flex flex-col items-center justify-center py-6 select-none">
            {/* Ambient animated glow ring */}
            <div
              className={`w-48 h-48 rounded-full flex items-center justify-center transition-transform duration-1000 ease-in-out ${currentPhaseDetails.scale} ${currentPhaseDetails.bgColor}`}
              style={{
                boxShadow: `0 0 35px ${currentPhaseDetails.glowColor}`,
                transitionProperty: "transform, background-color, box-shadow",
                transitionDuration: "1000ms"
              }}
            >
              <svg className="w-48 h-48 absolute inset-0 -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                {/* Outer guide track */}
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke={isStealthMode ? "#2a0808" : "#e2e8f0"}
                  strokeWidth="2.5"
                />
                {/* Animated phase ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  strokeWidth="4"
                  strokeDasharray="276"
                  strokeDashoffset={isActive ? (276 * (PHASE_DURATION - secondsRemaining)) / PHASE_DURATION : 0}
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ease-linear ${currentPhaseDetails.ringColor}`}
                />
              </svg>

              {/* Center Content */}
              <div className="text-center z-10 px-4">
                {isActive ? (
                  <>
                    <div className={`text-3xl font-black font-mono tabular-nums leading-none ${
                      isStealthMode ? "text-red-500" : "text-navy-primary"
                    }`}>
                      {secondsRemaining}
                    </div>
                    <div className={`text-xs font-bold mt-1.5 leading-tight ${currentPhaseDetails.textColor}`}>
                      {currentPhaseDetails.title}
                    </div>
                    <div className={`text-[10px] mt-0.5 max-w-[130px] mx-auto leading-tight ${
                      isStealthMode ? "text-slate-400" : "text-text-muted"
                    }`}>
                      {currentPhaseDetails.instruction}
                    </div>
                  </>
                ) : (
                  <>
                    <Wind className={`w-8 h-8 mx-auto mb-1 ${
                      isStealthMode ? "text-red-500 opacity-80" : "text-emerald-600 opacity-70"
                    }`} />
                    <div className={`text-xs font-bold ${isStealthMode ? "text-red-400" : "text-navy-primary"}`}>
                      {isStealthMode ? tr("Tactical Breath Posture", "टैक्टिकल श्वास स्थिति") : tr("Take a Breath", "एक गहरी सांस लें")}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${isStealthMode ? "text-slate-500" : "text-text-muted"}`}>
                      {tr("4s in • 4s hold • 4s out", "4s अंदर • 4s रोकें • 4s बाहर")}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Controls */}
          <div className="pt-2 border-t border-neutral-border/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleToggleTimer}
                className={`px-4 py-2 rounded text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer transition-colors ${
                  isActive
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : isStealthMode
                    ? "bg-red-700 hover:bg-red-800 text-white shadow-md shadow-red-950/50"
                    : "bg-emerald-700 hover:bg-emerald-800 text-white"
                }`}
              >
                {isActive ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>{tr("Pause", "रोकें")}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>{tr("Start Breathing", "श्वास अभ्यास शुरू करें")}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetTimer}
                className="px-3 py-2 rounded bg-white hover:bg-neutral-hover border border-neutral-border text-text-muted hover:text-text-primary text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                title={tr("Reset to beginning", "रीसेट करें")}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{tr("Reset", "रीसेट")}</span>
              </button>
            </div>

            <span className="text-[11px] text-text-muted italic">
              {tr("Zero tracking • Pure client animation", "शून्य ट्रैकिंग • केवल डिवाइस पर")}
            </span>
          </div>
        </div>

        {/* Panel 2: Self-Hosted Audio Player (Bansuri.mp3) */}
        <div className="p-5 rounded-lg border border-neutral-border bg-gradient-to-b from-white via-slate-50/50 to-amber-50/20 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-neutral-border/60">
              <div className="flex items-center space-x-2 text-xs font-bold text-navy-primary">
                <Music className="w-4 h-4 text-amber-700" />
                <span>{tr("Downtime Ambient Audio", "विश्राम संगीत")}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold border border-amber-200">
                {tr("Self-Hosted Offline MP3", "लोकल ऑडियो")}
              </span>
            </div>

            <div className="mt-3.5 space-y-2">
              <h4 className="text-sm font-bold text-navy-primary">
                {tr("Traditional Bansuri • Calm Flute Melody", "पारंपरिक बाँसुरी • शांत धुन")}
              </h4>
              <p className="text-xs text-text-muted leading-relaxed">
                {tr(
                  "A peaceful, acoustic flute recording suitable for barrack downtime, post-watch reflection, or winding down before sleep. Served completely offline from local static storage.",
                  "बैरक में विश्राम, पोस्ट-वॉच शांत समय या सोने से पहले सुनने हेतु एक शांत बाँसुरी रिकॉर्डिंग। बिना इंटरनेट के लोकल स्टोरेज से उपलब्ध।"
                )}
              </p>
            </div>

            {/* Native HTML5 Audio Player */}
            <div className="mt-4 p-3 bg-white rounded-lg border border-neutral-border shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span className="font-semibold text-navy-primary flex items-center space-x-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Bansuri.mp3</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {tr("Standard HTML5 Player", "मानक HTML5 प्लेयर")}
                </span>
              </div>

              <audio
                controls
                preload="metadata"
                className="w-full h-10 accent-navy-primary"
                src="/Bansuri.mp3"
              >
                {tr("Your browser does not support the audio element.", "आपका ब्राउज़र ऑडियो का समर्थन नहीं करता है।")}
              </audio>
            </div>
          </div>

          {/* Quick Grounding Tips (Sensory Anchor) */}
          <div className="p-3 bg-neutral-card/60 rounded border border-neutral-border space-y-1.5 text-xs text-text-muted">
            <div className="font-bold text-navy-primary text-[11px]">
              {tr("Sensory Reset (Take 30 Seconds):", "30-सेकंड की मानसिक शांति:")}
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-700">
              <li>{tr("Unclench your jaw, drop shoulders away from your ears.", "जबड़े का खिंचाव छोड़ें और कंधों को ढीला करें।")}</li>
              <li>{tr("Feel your boots firmly planted on the ground.", "ज़मीन पर अपने पैरों का स्पर्श महसूस करें।")}</li>
              <li>{tr("Take a slow breath before continuing your day.", "आगे बढ़ने से पहले एक शांत, स्वाभाविक सांस लें।")}</li>
            </ul>
          </div>

          <div className="pt-2 border-t border-neutral-border/60 flex items-center justify-between text-[11px] text-text-muted">
            <span>{tr("Playback is 100% private to your browser.", "ऑडियो सुनना पूरी तरह गोपनीय है।")}</span>
            <span className="text-slate-400">{tr("Zero logs", "शून्य लॉग")}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
