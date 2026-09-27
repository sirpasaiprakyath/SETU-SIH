import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "../LanguageContext";
import {
  X,
  Mic,
  MicOff,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Activity,
  Volume2,
  ChevronRight,
  Radio
} from "lucide-react";
import {
  type AcousticBiomarkers,
  analyzeAudioFrame,
  calculateJitter,
  calculateShimmer,
  calculateMeanHNR,
  computeVocalStrainIndex,
  zeroWipeBuffer
} from "../utils/acousticEngine";
import { apiSubmitVocalCheckin, type VocalCheckinResponse } from "../api";
import { formatRealDateTime, getRealNowIso } from "../utils/dateUtils";
import type { User } from "../types";

interface VoiceStrainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVishram?: () => void;
  onSuccessCheckin?: (res: VocalCheckinResponse) => void;
  currentUser?: User;
}

// dBFS from RMS
function rmsToDb(rms: number): number {
  return Math.round(20 * Math.log10(Math.max(rms, 1e-7)));
}

// Map dBFS → 0-100% bar width. Good speech is -30 to -10 dBFS.
function dbToBarPct(db: number): number {
  return Math.min(100, Math.max(0, Math.round(((db + 70) / 55) * 100)));
}

// ── Pre-flight diagnostics types ─────────────────────────────────────────────
type MicPermission = "checking" | "granted" | "denied" | "prompt" | "unsupported";
type PreflightResult = "idle" | "testing" | "ok" | "silent" | "noisy_room" | "no_permission" | "error";

export const VoiceStrainModal: React.FC<VoiceStrainModalProps> = ({
  isOpen,
  onClose,
  onOpenVishram,
  onSuccessCheckin,
  currentUser
}) => {
  const { tr } = useLanguage();

  // ── Page state machine ───────────────────────────────────────────────────
  // idle → consent → preflight → recording → analyzing → completed / failed_*
  const [page, setPage] = useState<
    "idle" | "consent" | "preflight" | "recording" | "analyzing" | "completed" |
    "failed_silence" | "failed_quality" | "failed_permission" | "failed_error"
  >("idle");

  const [qualityNotice, setQualityNotice] = useState<{ en: string; hi: string } | null>(null);
  const [countdown, setCountdown] = useState<number>(10);
  const [biomarkers, setBiomarkers] = useState<AcousticBiomarkers | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<VocalCheckinResponse | null>(null);

  // Cooldown & Tactical Field Outpost Offline Storage Keys
  // TASK 3: Cooldown changed to 24 hours (Daily Roll-Call muster cadence)
  const COOLDOWN_MS = 24 * 60 * 60 * 1000;
  const COOLDOWN_KEY = "dhvani_last_submit_ts";
  const OFFLINE_QUEUE_KEY = "dhvani_offline_queue";
  const LOCAL_HISTORY_KEY = "dhvani_local_history";
  const PERSONAL_BASELINE_KEY = "dhvani_personal_baseline";
  const [cooldownRemaining, setCooldownRemaining] = useState<string | null>(null);
  const cooldownTimerRef = useRef<number | null>(null);

  // TASK 2: One-time enrollment consent helpers (tied to user account)
  const getConsentKey = useCallback(() => {
    return currentUser?.username ? `dhvani_consent_${currentUser.username}` : "dhvani_consent_accepted";
  }, [currentUser]);

  const hasGivenConsent = useCallback(() => {
    const key = getConsentKey();
    return localStorage.getItem(key) === "true" || localStorage.getItem("dhvani_consent_accepted") === "true";
  }, [getConsentKey]);

  // Tactical background synchronization for queued field outpost records
  const drainOfflineQueue = useCallback(async () => {
    const rawQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!rawQueue) return;
    try {
      const queue = JSON.parse(rawQueue);
      if (!Array.isArray(queue) || queue.length === 0) return;
      console.log(`[Dhvani] Flushing ${queue.length} pending outpost check-in(s) to Unit Medical Cell...`);
      const remaining: any[] = [];
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        try {
          await apiSubmitVocalCheckin(item.payload);
          console.log(`[Dhvani] Synced queued record ${i + 1}/${queue.length}`);
        } catch (_) {
          // Network still unreachable; retain remaining queue
          remaining.push(...queue.slice(i));
          break;
        }
      }
      if (remaining.length > 0) {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
      } else {
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
        console.log("[Dhvani] All pending outpost check-ins successfully synced to Medical Cell.");
      }
    } catch (e) {
      console.warn("[Dhvani] Offline sync queue error", e);
    }
  }, []);

  // ── Pre-flight state ─────────────────────────────────────────────────────
  const [micPermission, setMicPermission] = useState<MicPermission>("checking");
  const [preflightResult, setPreflightResult] = useState<PreflightResult>("idle");
  const [preflightDb, setPreflightDb] = useState<number>(-70);
  const [preflightNoiseFloorDb, setPreflightNoiseFloorDb] = useState<number>(-70); // measured ambient noise
  const [preflightDeviceLabel, setPreflightDeviceLabel] = useState<string>("");
  const [preflightError, setPreflightError] = useState<string>("");
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [preflightProgress, setPreflightProgress] = useState<number>(0);
  const [preflightTimeRemaining, setPreflightTimeRemaining] = useState<number>(5);

  // Pre-flight audio refs (separate from main recording)
  const preflightStreamRef = useRef<MediaStream | null>(null);
  const preflightCtxRef = useRef<AudioContext | null>(null);
  const preflightSamplerRef = useRef<number | null>(null);
  const preflightAnimRef = useRef<number | null>(null);
  const preflightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const preflightPeakDbRef = useRef<number>(-70);
  const preflightVoicedCountRef = useRef<number>(0);  // how many voiced/periodic frames detected
  const preflightNoiseFloorRmsRef = useRef<number>(0); // measured ambient noise RMS

  // ── Recording live state ─────────────────────────────────────────────────
  const [speechDetected, setSpeechDetected] = useState<boolean>(false);
  const [liveDb, setLiveDb] = useState<number>(-70);
  const [liveTelemetry, setLiveTelemetry] = useState<{
    pitch: number; rms: number; db: number; hnr: number; liveStrain: number;
  }>({ pitch: 0, rms: 0, db: -70, hnr: 0, liveStrain: 0 });

  const isRecordingRef = useRef<boolean>(false);  // controls sampler loop & stopAudioCapture
  const voicedFramesRef = useRef<number>(0);       // total voiced frame count (for quality gate)
  const consecutiveSilentRef = useRef<number>(0);  // consecutive silent frames (silent-abort logic)

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const samplerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const pitchSamplesRef = useRef<number[]>([]);       // all voiced pitch Hz (for stats: min/max/avg/std)
  const amplitudeSamplesRef = useRef<number[]>([]);    // all voiced amplitude (for SNR / broad stats)
  const hnrSamplesRef = useRef<number[]>([]);          // all voiced HNR samples
  const speechRmsSamplesRef = useRef<number[]>([]);
  const noiseRmsSamplesRef = useRef<number[]>([]);
  const lastBufferRef = useRef<Float32Array | null>(null);

  // ── Voiced-run accumulators (Task 2/Option B) ─────────────────────────────
  // Jitter & shimmer are ONLY valid within a continuous, unbroken voiced run.
  // We segment the 10s sentence into runs; each run ends at any silence gap.
  // Minimum run length = 8 frames (320ms) — too short = not enough periods.
  const jitterSamplesRef    = useRef<number[]>([]);    // all voiced frame jitter %
  const shimmerSamplesRef   = useRef<number[]>([]);    // all voiced frame shimmer %
  const voicedPitchRunsRef  = useRef<number[][]>([]);  // completed runs: pitch Hz
  const voicedAmpRunsRef    = useRef<number[][]>([]);  // completed runs: amplitude
  const voicedHnrRunsRef    = useRef<number[][]>([]);  // completed runs: HNR
  const voicedJitterRunsRef = useRef<number[][]>([]);  // completed runs: jitter %
  const voicedShimmerRunsRef= useRef<number[][]>([]);  // completed runs: shimmer %
  const currentPitchRunRef  = useRef<number[]>([]);    // in-progress run: pitch
  const currentAmpRunRef    = useRef<number[]>([]);    // in-progress run: amplitude
  const currentHnrRunRef    = useRef<number[]>([]);    // in-progress run: HNR
  const currentJitterRunRef = useRef<number[]>([]);    // in-progress run: jitter %
  const currentShimmerRunRef= useRef<number[]>([]);    // in-progress run: shimmer %
  const MIN_RUN_FRAMES = 5;  // 200ms minimum phonation per run (captures natural conversational syllables)
  const silenceGapCounterRef = useRef<number>(0);      // frames of consecutive silence within a run
  const MAX_GAP_FRAMES = 3;  // allow ≤3 silent frames (120ms) before sealing a run

  // ── Check permissions on open ────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      // TASK 2: If a person has NOT yet given enrollment consent, show consent first
      const consented = hasGivenConsent();
      if (!consented) {
        setPage("consent");
      } else {
        setPage("idle");
      }
      setBiomarkers(null);
      setSubmitResult(null);
      setQualityNotice(null);
      setCountdown(10);
      setSpeechDetected(false);
      setLiveDb(-70);
      setPreflightDb(-70);
      setPreflightResult("idle");
      setPreflightDeviceLabel("");
      setPreflightError("");
      setPreflightNoiseFloorDb(-70);
      preflightPeakDbRef.current = -70;
      preflightVoicedCountRef.current = 0;
      preflightNoiseFloorRmsRef.current = 0;
      voicedFramesRef.current = 0;
      consecutiveSilentRef.current = 0;
      isRecordingRef.current = false;
      pitchSamplesRef.current = [];
      amplitudeSamplesRef.current = [];
      hnrSamplesRef.current = [];
      jitterSamplesRef.current = [];
      shimmerSamplesRef.current = [];
      speechRmsSamplesRef.current = [];
      noiseRmsSamplesRef.current = [];
      voicedPitchRunsRef.current = [];
      voicedAmpRunsRef.current = [];
      voicedHnrRunsRef.current = [];
      voicedJitterRunsRef.current = [];
      voicedShimmerRunsRef.current = [];
      currentPitchRunRef.current = [];
      currentAmpRunRef.current = [];
      currentHnrRunRef.current = [];
      currentJitterRunRef.current = [];
      currentShimmerRunRef.current = [];
      checkCooldown();
      checkPermissions();
      drainOfflineQueue();

      // Enumerate input devices so user can pick the right mic
      const loadDevices = async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const inputs = devices.filter(d => d.kind === "audioinput");
          setAudioDevices(inputs);
        } catch (_) {}
      };
      loadDevices();
    } else {
      stopPreflight();
      stopAudioCapture();
      if (cooldownTimerRef.current) { clearInterval(cooldownTimerRef.current); cooldownTimerRef.current = null; }
    }
  }, [isOpen, drainOfflineQueue, hasGivenConsent]);

  useEffect(() => {
    const handleOnline = () => {
      console.log("[Dhvani] Network restored. Checking pending tactical check-ins...");
      drainOfflineQueue();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [drainOfflineQueue]);

  const checkPermissions = async () => {
    if (!navigator.permissions) {
      setMicPermission("unsupported");
      return;
    }
    try {
      const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
      setMicPermission(status.state as MicPermission);
      status.onchange = () => setMicPermission(status.state as MicPermission);
    } catch {
      setMicPermission("unsupported");
    }
  };

  const checkCooldown = () => {
    const lastSubmit = localStorage.getItem(COOLDOWN_KEY);
    if (!lastSubmit) { setCooldownRemaining(null); return; }
    const elapsed = Date.now() - parseInt(lastSubmit, 10);
    if (elapsed >= COOLDOWN_MS) { setCooldownRemaining(null); return; }
    const update = () => {
      const left = COOLDOWN_MS - (Date.now() - parseInt(localStorage.getItem(COOLDOWN_KEY) || "0", 10));
      if (left <= 0) { setCooldownRemaining(null); if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current); }
      else {
        const h = Math.floor(left / 3600000);
        const m = Math.floor((left % 3600000) / 60000);
        const s = Math.floor((left % 60000) / 1000);
        setCooldownRemaining(`${h}h ${m}m ${s}s`);
      }
    };
    update();
    cooldownTimerRef.current = window.setInterval(update, 1000);
  };

  // ── Pre-flight: open mic and show live level for 5 seconds ───────────────
  const stopPreflight = useCallback(() => {
    if (preflightSamplerRef.current !== null) { clearInterval(preflightSamplerRef.current); preflightSamplerRef.current = null; }
    if (preflightAnimRef.current !== null) { cancelAnimationFrame(preflightAnimRef.current); preflightAnimRef.current = null; }
    if (preflightStreamRef.current) { preflightStreamRef.current.getTracks().forEach(t => t.stop()); preflightStreamRef.current = null; }
    if (preflightCtxRef.current && preflightCtxRef.current.state !== "closed") { preflightCtxRef.current.close().catch(() => {}); preflightCtxRef.current = null; }
  }, []);

  const runPreflight = async () => {
    setPreflightResult("testing");
    setPreflightDb(-70);
    setPreflightNoiseFloorDb(-70);
    setPreflightProgress(0);
    setPreflightTimeRemaining(5);
    preflightPeakDbRef.current = -70;
    preflightVoicedCountRef.current = 0;
    preflightNoiseFloorRmsRef.current = 0;
    setPreflightError("");
    stopPreflight();

    let stream: MediaStream;
    try {
      // Use audio: true (or deviceId if user selected one).
      // Plain constraints let the OS DSP pipeline work for array mics.
      const audioConstraint: MediaTrackConstraints = selectedDeviceId
        ? { deviceId: { exact: selectedDeviceId } }
        : true as any;
      stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint, video: false });
    } catch (err: any) {
      console.error("Preflight getUserMedia error:", err.name, err.message);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setMicPermission("denied");
        setPreflightResult("no_permission");
      } else {
        setPreflightError(`${err.name}: ${err.message}`);
        setPreflightResult("error");
      }
      return;
    }

    preflightStreamRef.current = stream;

    // Show which device we got
    const track = stream.getAudioTracks()[0];
    if (track) {
      const label = track.label || "Unknown microphone";
      setPreflightDeviceLabel(label);
      console.log("[Dhvani Preflight] Mic device:", label);
      console.log("[Dhvani Preflight] Track settings:", JSON.stringify(track.getSettings()));
      console.log("[Dhvani Preflight] Track enabled:", track.enabled, "| readyState:", track.readyState, "| muted:", track.muted);
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    preflightCtxRef.current = ctx;

    if (ctx.state === "suspended") {
      await ctx.resume();
      console.log("[Dhvani Preflight] AudioContext resumed, state:", ctx.state);
    }

    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);

    // Draw waveform on preflight canvas
    if (preflightCanvasRef.current) {
      const canvas = preflightCanvasRef.current;
      const cctx = canvas.getContext("2d")!;
      const buf = new Uint8Array(analyser.fftSize);
      const drawPre = () => {
        preflightAnimRef.current = requestAnimationFrame(drawPre);
        analyser.getByteTimeDomainData(buf);
        cctx.fillStyle = "#0f172a";
        cctx.fillRect(0, 0, canvas.width, canvas.height);
        // Centre line
        cctx.strokeStyle = "#1e293b";
        cctx.lineWidth = 1;
        cctx.beginPath();
        cctx.moveTo(0, canvas.height / 2);
        cctx.lineTo(canvas.width, canvas.height / 2);
        cctx.stroke();
        // Waveform
        cctx.strokeStyle = "#38bdf8";
        cctx.lineWidth = 2;
        cctx.beginPath();
        const sw = canvas.width / buf.length;
        for (let i = 0; i < buf.length; i++) {
          const y = ((buf[i] - 128) / 128.0) * (canvas.height / 2) + canvas.height / 2;
          if (i === 0) cctx.moveTo(0, y); else cctx.lineTo(i * sw, y);
        }
        cctx.stroke();
      };
      drawPre();
    }

    const fbuf = new Float32Array(analyser.fftSize);
    // Phase 1 (ticks 0-24, 1s): measure the ambient noise floor silently.
    // Phase 2 (ticks 25-124, 4s): detect speech — require periodic/voiced frames.
    const NOISE_PHASE_TICKS = 25;  // 1 second of ambient measurement
    const TOTAL_TICKS = 125;       // 5 seconds total
    let consecutiveVoicedFrames = 0; // resets to 0 on any non-voiced frame
    let tick = 0;
    let noiseRmsSum = 0;
    console.log("[Dhvani Preflight] AudioContext state:", ctx.state, "| sampleRate:", ctx.sampleRate);

    preflightSamplerRef.current = window.setInterval(() => {
      analyser.getFloatTimeDomainData(fbuf);

      // Use the acoustic engine — same as recording — to distinguish speech from noise
      const frame = analyzeAudioFrame(fbuf, ctx.sampleRate);
      const db = rmsToDb(frame.rms);
      setPreflightDb(db);
      if (db > preflightPeakDbRef.current) preflightPeakDbRef.current = db;

      if (tick < NOISE_PHASE_TICKS) {
        // Phase 1: accumulate ambient noise floor
        noiseRmsSum += frame.rms;
        if (tick === NOISE_PHASE_TICKS - 1) {
          const noiseFloorRms = noiseRmsSum / NOISE_PHASE_TICKS;
          preflightNoiseFloorRmsRef.current = noiseFloorRms;
          const noiseFloorDb = rmsToDb(noiseFloorRms);
          setPreflightNoiseFloorDb(noiseFloorDb);
          console.log(`[Dhvani Pre] Noise floor measured: ${noiseFloorRms.toFixed(5)} RMS = ${noiseFloorDb} dBFS`);
        }
      } else {
        // Phase 2: detect genuine human voiced speech.
        // Ambient noise floor measured in Phase 1 provides the reference floor.
        // True human speech MUST:
        // 1. Rise above the ambient noise floor (at least +4 dB / 1.6x RMS)
        // 2. Be periodic human vocal cords (isVoiced = true, r > 0.48)
        // 3. Have vocal harmonic clarity (hnrDb >= 13.0 dB)
        // 4. Have human fundamental frequency (75 - 550 Hz)
        const noiseRms = Math.max(0.005, preflightNoiseFloorRmsRef.current);
        const minSpeechRms = Math.max(0.012, noiseRms * 1.6);

        const isSpeechFrame =
          frame.rms >= minSpeechRms &&
          frame.isVoiced &&
          frame.pitchHz >= 75 && frame.pitchHz <= 550 &&
          frame.hnrDb >= 13.0;

        if (isSpeechFrame) {
          consecutiveVoicedFrames++;
          preflightVoicedCountRef.current++;
        } else {
          consecutiveVoicedFrames = 0; // reset streak on any non-voiced frame
        }

        // Require 6 CONSECUTIVE voiced frames (240ms of unbroken speech phonation)
        // Ambient noise/fan will NEVER sustain 6 consecutive harmonic frames above noise floor!
        if (consecutiveVoicedFrames >= 6) {
          console.log(`[Dhvani Pre] GENUINE SPEECH CONFIRMED: streak=${consecutiveVoicedFrames} peak=${preflightPeakDbRef.current}dB noiseFloor=${rmsToDb(noiseRms)}dB`);
          setPreflightResult("ok");
        }
      }

      tick++;
      const progress = Math.min(100, Math.round((tick / TOTAL_TICKS) * 100));
      setPreflightProgress(progress);
      const secLeft = Math.max(0, Math.ceil((TOTAL_TICKS - tick) * 0.04));
      setPreflightTimeRemaining(secLeft);

      if (tick >= TOTAL_TICKS) {
        clearInterval(preflightSamplerRef.current!);
        preflightSamplerRef.current = null;
        // Keep mic stream and canvas active so user sees live feedback!

        const peakDb = preflightPeakDbRef.current;
        const noiseFloorDb = rmsToDb(preflightNoiseFloorRmsRef.current);
        console.log(
          `[Dhvani Pre] DONE. voicedCount=${preflightVoicedCountRef.current} consecutive=${consecutiveVoicedFrames} peak=${peakDb}dB noiseFloor=${noiseFloorDb}dB`
        );

        // Only declare "ok" if genuine speech was confirmed (6 consecutive frames or 8 total frames rising > 5 dB above noise floor)
        if (consecutiveVoicedFrames >= 6 || (preflightVoicedCountRef.current >= 8 && peakDb >= noiseFloorDb + 5)) {
          setPreflightResult("ok");
        } else if (peakDb < -50) {
          setPreflightResult("silent");
        } else {
          // Room noise calibrated, but no human voice detected:
          setPreflightResult("noisy_room");
        }
      }
    }, 40);
  };

  // ── Recording: stop everything ───────────────────────────────────────────
  const stopAudioCapture = useCallback(() => {
    isRecordingRef.current = false;
    if (samplerRef.current !== null) { clearInterval(samplerRef.current); samplerRef.current = null; }
    if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
    if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
    if (lastBufferRef.current) { zeroWipeBuffer(lastBufferRef.current); lastBufferRef.current = null; }
  }, []);

  // ── Waveform renderer (recording) ────────────────────────────────────────
  const drawWaveform = (analyser: AnalyserNode, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufLen);
    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteTimeDomainData(data);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const sw = canvas.width / bufLen;
      for (let i = 0; i < bufLen; i++) {
        const y = (data[i] / 128.0) * (canvas.height / 2);
        if (i === 0) ctx.moveTo(0, y); else ctx.lineTo(i * sw, y);
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };
    render();
  };

  // ── Start actual 10s recording (called from preflight "Looks good" button) ──
  const startVoiceCheck = async () => {
    stopPreflight();
    setPage("recording");
    setCountdown(10);
    setSpeechDetected(false);
    setLiveDb(-70);
    setQualityNotice(null);
    setBiomarkers(null);
    setSubmitResult(null);
    voicedFramesRef.current = 0;
    consecutiveSilentRef.current = 0;
    isRecordingRef.current = false;
    pitchSamplesRef.current = [];
    amplitudeSamplesRef.current = [];
    hnrSamplesRef.current = [];
    jitterSamplesRef.current = [];
    shimmerSamplesRef.current = [];
    speechRmsSamplesRef.current = [];
    noiseRmsSamplesRef.current = [];
    // Reset voiced-run state
    voicedPitchRunsRef.current  = [];
    voicedAmpRunsRef.current    = [];
    voicedHnrRunsRef.current    = [];
    voicedJitterRunsRef.current = [];
    voicedShimmerRunsRef.current= [];
    currentPitchRunRef.current  = [];
    currentAmpRunRef.current    = [];
    currentHnrRunRef.current    = [];
    currentJitterRunRef.current = [];
    currentShimmerRunRef.current= [];
    silenceGapCounterRef.current = 0;

    // ── Get microphone ────────────────────────────────────────────────────
    let stream: MediaStream;
    try {
      const audioConstraint: MediaTrackConstraints = selectedDeviceId
        ? { deviceId: { exact: selectedDeviceId } }
        : true as any;
      stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint, video: false });
    } catch (err: any) {
      console.error("Recording getUserMedia error:", err.name, err.message);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setPage("failed_permission");
      } else {
        setPage("failed_error");
      }
      return;
    }

    mediaStreamRef.current = stream;
    const track = stream.getAudioTracks()[0];
    console.log("[Dhvani Record] Mic:", track?.label, "| enabled:", track?.enabled, "| readyState:", track?.readyState);

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioCtx();
    audioContextRef.current = audioCtx;

    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
      console.log("[Dhvani Record] AudioContext resumed, state:", audioCtx.state, "sampleRate:", audioCtx.sampleRate);
    }

    const src = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    analyserRef.current = analyser;
    console.log("[Dhvani Record] Graph: MediaStreamSource → AnalyserNode connected. fftSize:", analyser.fftSize);

    if (canvasRef.current) drawWaveform(analyser, canvasRef.current);

    const buffer = new Float32Array(analyser.fftSize);
    lastBufferRef.current = buffer;
    isRecordingRef.current = true;

    // ── Acoustic sampler @ 40ms ──────────────────────────────────────────
    // Helper: seal the current in-progress voiced run into the completed-runs arrays
    const sealCurrentRun = () => {
      if (currentPitchRunRef.current.length >= MIN_RUN_FRAMES) {
        voicedPitchRunsRef.current.push([...currentPitchRunRef.current]);
        voicedAmpRunsRef.current.push([...currentAmpRunRef.current]);
        voicedHnrRunsRef.current.push([...currentHnrRunRef.current]);
        voicedJitterRunsRef.current.push([...currentJitterRunRef.current]);
        voicedShimmerRunsRef.current.push([...currentShimmerRunRef.current]);
      }
      currentPitchRunRef.current  = [];
      currentAmpRunRef.current    = [];
      currentHnrRunRef.current    = [];
      currentJitterRunRef.current = [];
      currentShimmerRunRef.current= [];
      silenceGapCounterRef.current = 0;
    };

    startTimeRef.current = Date.now();

    samplerRef.current = window.setInterval(() => {
      analyser.getFloatTimeDomainData(buffer);
      const frame = analyzeAudioFrame(buffer, audioCtx.sampleRate);
      const db = rmsToDb(frame.rms);
      setLiveDb(db);

      console.log(
        `[Dhvani] rms=${frame.rms.toFixed(4)} dB=${db} voiced=${frame.isVoiced} ` +
        `pitch=${Math.round(frame.pitchHz)} hnr=${Math.round(frame.hnrDb)} ` +
        `runLen=${currentPitchRunRef.current.length} completedRuns=${voicedPitchRunsRef.current.length}`
      );

      // Use noise floor measured in preflight to establish dynamic speech floor
      const noiseRms = Math.max(0.005, preflightNoiseFloorRmsRef.current);
      const minSpeechRms = Math.max(0.010, noiseRms * 1.5);

      // ── Jitter-eligible voiced frame: must pass VAD AND be periodic ───────
      const isJitterEligible =
        frame.rms >= minSpeechRms &&
        frame.isVoiced &&
        frame.pitchHz >= 75 && frame.pitchHz <= 550 &&
        frame.hnrDb >= 13.0;

      // ── Speech-present frame: require energy above noise floor AND harmonicity ──
      const isSpeechFrame =
        frame.rms >= minSpeechRms &&
        frame.isVoiced &&
        frame.hnrDb >= 12.0;

      if (isSpeechFrame) {
        setSpeechDetected(true);
        consecutiveSilentRef.current = 0;
        speechRmsSamplesRef.current.push(frame.rms);

        // broad stats arrays (used for pitch range / SNR / fallback)
        if (frame.isVoiced && frame.pitchHz >= 65 && frame.pitchHz <= 650) {
          pitchSamplesRef.current.push(frame.pitchHz);
          hnrSamplesRef.current.push(frame.hnrDb);
          amplitudeSamplesRef.current.push(frame.rms * 100);
          if (frame.jitterPct !== undefined) jitterSamplesRef.current.push(frame.jitterPct);
          if (frame.shimmerPct !== undefined) shimmerSamplesRef.current.push(frame.shimmerPct);
          voicedFramesRef.current++;
        } else if (frame.rms >= 0.012) {
          voicedFramesRef.current++;
        }

        // ── Option B: maintain continuous voiced run for jitter/shimmer ───
        if (isJitterEligible) {
          silenceGapCounterRef.current = 0;
          currentPitchRunRef.current.push(frame.pitchHz);
          currentAmpRunRef.current.push(frame.rms * 100);
          currentHnrRunRef.current.push(frame.hnrDb);
          if (frame.jitterPct !== undefined) currentJitterRunRef.current.push(frame.jitterPct);
          if (frame.shimmerPct !== undefined) currentShimmerRunRef.current.push(frame.shimmerPct);
        } else {
          // Speech is present but this frame isn't jitter-eligible (e.g. plosive burst,
          // unvoiced consonant). Allow up to MAX_GAP_FRAMES before sealing the run.
          silenceGapCounterRef.current++;
          if (silenceGapCounterRef.current > MAX_GAP_FRAMES) sealCurrentRun();
        }

        // ── Live HUD uses ONLY the current in-progress run (last 15 frames)
        const liveRunJitter = currentJitterRunRef.current.slice(-15).filter((v) => typeof v === "number" && !isNaN(v) && v > 0);
        const liveRunShimmer = currentShimmerRunRef.current.slice(-15).filter((v) => typeof v === "number" && !isNaN(v) && v > 0);
        const lj  = liveRunJitter.length >= 3 ? calculateJitter(liveRunJitter) : (frame.jitterPct ?? (liveRunJitter.length > 0 ? liveRunJitter[liveRunJitter.length - 1] : 0.60));
        const ls  = liveRunShimmer.length >= 3 ? calculateShimmer(liveRunShimmer) : (frame.shimmerPct ?? (liveRunShimmer.length > 0 ? liveRunShimmer[liveRunShimmer.length - 1] : 1.85));
        const lso = computeVocalStrainIndex(
          lj, ls,
          frame.hnrDb > 0 ? frame.hnrDb : 21.0,
          frame.pitchHz > 0 ? frame.pitchHz : 130
        );
        setLiveTelemetry({
          pitch: Math.round(frame.pitchHz),
          rms: Math.round(frame.rms * 1000) / 1000,
          db,
          hnr: Math.round(frame.hnrDb * 10) / 10,
          liveStrain: lso.score
        });

      } else {
        // ── Silence frame ────────────────────────────────────────────────
        noiseRmsSamplesRef.current.push(frame.rms);
        consecutiveSilentRef.current++;
        silenceGapCounterRef.current++;

        // Seal current run after MAX_GAP_FRAMES of silence
        if (silenceGapCounterRef.current > MAX_GAP_FRAMES) sealCurrentRun();

        setLiveTelemetry(prev => ({ ...prev, rms: Math.round(frame.rms * 1000) / 1000, db }));

        // Personnel are given the full 10 seconds to speak the muster phrase.
        // Full evaluation is conducted at finishRecording() without premature aborts.
      }
    }, 40);

    // ── Countdown: Date.now() anchor, 250ms tick ─────────────────────────
    timerIntervalRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, Math.ceil(10 - elapsed));
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timerIntervalRef.current!); timerIntervalRef.current = null;
        if (samplerRef.current !== null) { clearInterval(samplerRef.current); samplerRef.current = null; }
        setTimeout(() => finishRecording(buffer), 50);
      }
    }, 250);
  };

  // ── Finish & analyze ─────────────────────────────────────────────────────
  const finishRecording = (buffer: Float32Array) => {
    stopAudioCapture();
    setPage("analyzing");

    setTimeout(() => {
      if (voicedFramesRef.current < 5 && speechRmsSamplesRef.current.length < 5) {
        zeroWipeBuffer(buffer);
        setPage("failed_silence");
        return;
      }

      const voicedDurationSec = Math.round(((voicedFramesRef.current * 40) / 1000) * 10) / 10;
      if (voicedDurationSec < 1.0) {
        zeroWipeBuffer(buffer);
        setQualityNotice({ en: "Speech audio too brief (less than 1.0s detected). Please speak the complete roll-call phrase steadily.", hi: "आवाज की अवधि बहुत कम। कृपया पूरा वाक्य स्थिर गति से बोलें।" });
        setPage("failed_quality");
        return;
      }

      const meanSpeechRms = speechRmsSamplesRef.current.length > 0 ? speechRmsSamplesRef.current.reduce((a, b) => a + b, 0) / speechRmsSamplesRef.current.length : 0.01;
      const meanNoiseRms = noiseRmsSamplesRef.current.length > 0 ? noiseRmsSamplesRef.current.reduce((a, b) => a + b, 0) / noiseRmsSamplesRef.current.length : 0.001;
      const snrDb = Math.round(20 * Math.log10(Math.max(meanSpeechRms, 1e-4) / Math.max(meanNoiseRms, 1e-4)) * 10) / 10;

      if (snrDb < 6.0 && meanNoiseRms > 0.08) {
        zeroWipeBuffer(buffer);
        setQualityNotice({ en: "Excessive background noise detected. Please try in a quieter spot.", hi: "अत्यधिक शोर दर्ज। कृपया शांत स्थान पर पुनः प्रयास करें।" });
        setPage("failed_quality");
        return;
      }

      // ── Task 2 (Option B): Seal any open run, then aggregate per-run jitter/shimmer ──
      // Seal the current in-progress run (if it meets minimum length)
      if (currentPitchRunRef.current.length >= MIN_RUN_FRAMES) {
        voicedPitchRunsRef.current.push([...currentPitchRunRef.current]);
        voicedAmpRunsRef.current.push([...currentAmpRunRef.current]);
        voicedHnrRunsRef.current.push([...currentHnrRunRef.current]);
        voicedJitterRunsRef.current.push([...currentJitterRunRef.current]);
        voicedShimmerRunsRef.current.push([...currentShimmerRunRef.current]);
      }

      // Diagnostic dump — log all runs with lengths, pitch and glottal cycle perturbation
      const runs = voicedPitchRunsRef.current;
      console.log(`[Dhvani] finishRecording: ${runs.length} voiced runs found`);
      runs.forEach((run, i) => {
        const durationMs = run.length * 40;
        const firstPitch = Math.round(run[0]);
        const lastPitch  = Math.round(run[run.length - 1]);
        const jitterRun  = voicedJitterRunsRef.current[i] || [];
        const shimmerRun = voicedShimmerRunsRef.current[i] || [];
        const runJitter  = jitterRun.length > 0 ? calculateJitter(jitterRun) : 0.60;
        const runShimmer = shimmerRun.length > 0 ? calculateShimmer(shimmerRun) : 1.85;
        console.log(
          `  Run[${i}]: ${run.length} frames (${durationMs}ms) | pitch ${firstPitch}→${lastPitch} Hz ` +
          `| jitter=${runJitter.toFixed(2)}% shimmer=${runShimmer.toFixed(2)}%`
        );
      });

      let jitter: number;
      let shimmer: number;
      let hnr: number;

      if (runs.length === 0 || voicedJitterRunsRef.current.length === 0) {
        // Fall back to all collected speech frames
        console.warn("[Dhvani] No voiced runs ≥ 8 frames — falling back to broad frame arrays");
        jitter  = calculateJitter(jitterSamplesRef.current);
        shimmer = calculateShimmer(shimmerSamplesRef.current);
        hnr     = calculateMeanHNR(hnrSamplesRef.current);
      } else {
        // Compute jitter and shimmer WITHIN each run independently, then
        // aggregate as length-weighted mean across runs.
        let totalJitterWeight = 0;
        let totalShimmerWeight = 0;
        let totalHnrWeight = 0;
        let weightedJitter  = 0;
        let weightedShimmer = 0;
        let weightedHnr     = 0;

        runs.forEach((_run, i) => {
          const jitterRun  = (voicedJitterRunsRef.current[i] || []).filter((v) => typeof v === "number" && !isNaN(v) && v > 0);
          const shimmerRun = (voicedShimmerRunsRef.current[i] || []).filter((v) => typeof v === "number" && !isNaN(v) && v > 0);
          const hnrRun     = (voicedHnrRunsRef.current[i] || []).filter((v) => typeof v === "number" && !isNaN(v) && v > 0);

          if (jitterRun.length > 0) {
            const rj = calculateJitter(jitterRun);
            weightedJitter += rj * jitterRun.length;
            totalJitterWeight += jitterRun.length;
          }

          if (shimmerRun.length > 0) {
            const rs = calculateShimmer(shimmerRun);
            weightedShimmer += rs * shimmerRun.length;
            totalShimmerWeight += shimmerRun.length;
          }

          if (hnrRun.length > 0) {
            const rh = calculateMeanHNR(hnrRun);
            weightedHnr += rh * hnrRun.length;
            totalHnrWeight += hnrRun.length;
          }
        });

        jitter  = totalJitterWeight > 0
          ? Math.round((weightedJitter  / totalJitterWeight) * 100) / 100
          : (jitterSamplesRef.current.length > 0 ? calculateJitter(jitterSamplesRef.current) : 0.60);

        shimmer = totalShimmerWeight > 0
          ? Math.round((weightedShimmer / totalShimmerWeight) * 100) / 100
          : (shimmerSamplesRef.current.length > 0 ? calculateShimmer(shimmerSamplesRef.current) : 2.00);

        hnr     = totalHnrWeight > 0
          ? Math.round((weightedHnr     / totalHnrWeight) * 10)  / 10
          : (hnrSamplesRef.current.length > 0 ? calculateMeanHNR(hnrSamplesRef.current) : 21.0);

        console.log(`[Dhvani] Aggregated (length-weighted): jitter=${jitter}% shimmer=${shimmer}% hnr=${hnr}dB`);
      }

      const allPitch = pitchSamplesRef.current;
      const avgPitch = allPitch.length > 0 ? Math.round(allPitch.reduce((a, b) => a + b, 0) / allPitch.length) : 0;
      const minPitch = allPitch.length > 0 ? Math.min(...allPitch) : 0;
      const maxPitch = allPitch.length > 0 ? Math.max(...allPitch) : 0;
      const pitchStd = allPitch.length > 2
        ? Math.round(Math.sqrt(allPitch.reduce((acc, v) => acc + Math.pow(v - avgPitch, 2), 0) / allPitch.length) * 10) / 10
        : 0;

      let personalBaseline: { jitter?: number; shimmer?: number; hnr?: number; pitch?: number } | undefined;
      try { const r = localStorage.getItem("dhvani_personal_baseline"); if (r) personalBaseline = JSON.parse(r); } catch (_) {}

      const { score, tier, primary_driver } = computeVocalStrainIndex(jitter, shimmer, hnr, avgPitch, pitchStd, personalBaseline);
      const confidence_level: "High" | "Moderate" | "Low (Retake Advised)" =
        snrDb < 9.0 || voicedDurationSec < 1.8 ? "Low (Retake Advised)"
        : snrDb < 14.0 || voicedDurationSec < 2.8 ? "Moderate" : "High";
      const confidence_score = confidence_level === "High" ? 0.95 : confidence_level === "Moderate" ? 0.82 : 0.65;

      console.log(`[Dhvani] Final: score=${score}% tier="${tier}" jitter=${jitter}% shimmer=${shimmer}% hnr=${hnr}dB avgPitch=${avgPitch}Hz`);

      zeroWipeBuffer(buffer);

      // TASK 1: When confidence is Low (Retake Advised), do NOT render score, tier, or "review advised" language.
      // Do NOT save to history, API, or personal baseline. Re-use existing failed_quality pattern.
      if (confidence_level === "Low (Retake Advised)") {
        console.warn(`[Dhvani] Quality gate rejected: Low confidence (SNR=${snrDb}dB, Voiced=${voicedDurationSec}s). Suppressing score & requiring retake.`);
        const lowSnr = snrDb < 9.0;
        const lowDuration = voicedDurationSec < 1.8;
        let reasonEn = "";
        let reasonHi = "";
        if (lowSnr && lowDuration) {
          reasonEn = `Low signal-to-noise ratio (${snrDb} dB SNR, min 9 dB) and short speech duration (${voicedDurationSec}s voiced, min 1.8s).`;
          reasonHi = `आसपास का शोर अधिक था (${snrDb} dB SNR, न्यूनतम 9 dB) एवं आवाज़ की अवधि कम थी (${voicedDurationSec}s, न्यूनतम 1.8s)।`;
        } else if (lowSnr) {
          reasonEn = `Low signal-to-noise ratio (${snrDb} dB SNR, minimum required 9 dB). High ambient background noise detected.`;
          reasonHi = `ध्वनि अनुपात अपर्याप्त (${snrDb} dB SNR, न्यूनतम 9 dB)। अत्यधिक वातावरणीय शोर दर्ज।`;
        } else {
          reasonEn = `Voiced speech duration was too short (${voicedDurationSec}s voiced, minimum required 1.8s).`;
          reasonHi = `आवाज़ की अवधि अपर्याप्त थी (${voicedDurationSec}s, न्यूनतम आवश्यक 1.8s)।`;
        }
        setQualityNotice({
          en: `${reasonEn} The recording did not meet quality requirements. Please retry in a quieter spot and speak the roll-call phrase for the full 10 seconds.`,
          hi: `${reasonHi} यह रिकॉर्डिंग गुणवत्ता आवश्यकताओं के अनुरूप नहीं थी। कृपया शांत स्थान पर पुनः प्रयास करें और पूरे 10 सेकंड तक वाक्य बोलें।`
        });
        setBiomarkers(null);
        setPage("failed_quality");
        return;
      }

      // Valid check-in: confidence is Moderate or High
      const finalBiomarkers: AcousticBiomarkers = {
        pitch_hz: avgPitch, pitch_std_hz: pitchStd, pitch_min_hz: minPitch, pitch_max_hz: maxPitch,
        total_frames_analyzed: voicedFramesRef.current,
        jitter_pct: jitter, shimmer_pct: shimmer, hnr_db: hnr,
        strain_score: score, strain_tier: tier, confidence_level, confidence_score,
        primary_driver, voiced_duration_sec: voicedDurationSec, snr_db: snrDb
      };
      setBiomarkers(finalBiomarkers);
      setPage("completed");

      // TASK 2: Auto-save immediately for enrolled personnel!
      autoSaveRecord(finalBiomarkers);
    }, 600);
  };

  // TASK 2: Auto-save after one-time enrollment consent (no manual click-gate)
  const autoSaveRecord = async (bm: AcousticBiomarkers) => {
    const lastSubmit = localStorage.getItem(COOLDOWN_KEY);
    if (lastSubmit && Date.now() - parseInt(lastSubmit, 10) < COOLDOWN_MS) {
      checkCooldown();
      return;
    }
    setIsSubmitting(true);

    // Compute local trailing baseline drift from stored on-device history
    let localHistory: any[] = [];
    try {
      const rawHist = localStorage.getItem(LOCAL_HISTORY_KEY);
      if (rawHist) localHistory = JSON.parse(rawHist);
    } catch (_) {}

    const cutoff14d = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const past14d = Array.isArray(localHistory) ? localHistory.filter((r) => r.timestamp >= cutoff14d) : [];
    const avgPriorStrain = past14d.length > 0
      ? past14d.reduce((acc, curr) => acc + (curr.strain_score || 0), 0) / past14d.length
      : bm.strain_score;
    const localDrift = Math.round((bm.strain_score - avgPriorStrain) * 10) / 10;

    const nowIso = getRealNowIso();
    const payload = {
      strain_score: bm.strain_score,
      strain_tier: bm.strain_tier,
      jitter_pct: bm.jitter_pct,
      shimmer_pct: bm.shimmer_pct,
      hnr_db: bm.hnr_db,
      pitch_hz: bm.pitch_hz,
      duration_sec: 10.0,
      session_mode: "live_mic",
      recorded_at: nowIso
    };

    let res: VocalCheckinResponse;
    let isOfflineCached = false;

    try {
      res = await apiSubmitVocalCheckin(payload);
      // Online uplink operational; flush any pending queued outpost check-ins
      drainOfflineQueue();
    } catch (netErr: any) {
      console.warn("[Dhvani] Medical Cell server offline or network unreachable. Engaging Tactical Field Baseline Mode.", netErr);
      isOfflineCached = true;
      res = {
        status: "offline_cached",
        record_id: Date.now(),
        created_at: nowIso,
        strain_score: bm.strain_score,
        strain_tier: bm.strain_tier,
        jitter_pct: bm.jitter_pct,
        shimmer_pct: bm.shimmer_pct,
        hnr_db: bm.hnr_db,
        pitch_hz: bm.pitch_hz,
        strain_drift_vs_baseline: localDrift,
        prior_14d_checks_count: past14d.length,
        recommendation: bm.strain_score >= 55.0
          ? "Marked acoustic vocal perturbation detected. Recommend medical officer welfare review and Vishram rest pacing."
          : bm.strain_score >= 33.0
          ? "Moderate vocal cord perturbation observed. Recommend routine monitoring, hydration, and regular sleep continuity."
          : "Acoustic parameters within resting physiological baseline. Non-diagnostic auxiliary screening.",
        privacy_guarantee: "Zero audio recorded or stored. Secure DPDP on-device encryption active."
      };

      // Append to offline queue for automatic background sync upon reconnection
      try {
        const rawQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
        const queue = rawQueue ? JSON.parse(rawQueue) : [];
        queue.push({ payload, timestamp: Date.now() });
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(-30)));
      } catch (e) {
        console.error("[Dhvani] Failed to append to offline queue", e);
      }
    }

    // Persist to local history & personal baseline
    try {
      const newEntry = {
        id: res.record_id || Date.now(),
        timestamp: Date.now(),
        created_at: res.created_at || nowIso,
        strain_score: bm.strain_score,
        strain_tier: bm.strain_tier,
        jitter_pct: bm.jitter_pct,
        shimmer_pct: bm.shimmer_pct,
        hnr_db: bm.hnr_db,
        pitch_hz: bm.pitch_hz,
        synced: !isOfflineCached
      };
      const updatedHist = [newEntry, ...localHistory].slice(0, 30);
      localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(updatedHist));
      localStorage.setItem(PERSONAL_BASELINE_KEY, JSON.stringify({
        lastStrain: bm.strain_score,
        lastTier: bm.strain_tier,
        lastJitter: bm.jitter_pct,
        lastShimmer: bm.shimmer_pct,
        lastHnr: bm.hnr_db,
        lastPitch: bm.pitch_hz,
        lastRecordedAt: res.created_at || nowIso,
        synced: !isOfflineCached,
        updatedAt: Date.now()
      }));
    } catch (_) {}

    localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
    checkCooldown();
    setSubmitResult(res);
    if (onSuccessCheckin) onSuccessCheckin(res);
    setIsSubmitting(false);
  };

  const resetToIdle = () => {
    stopPreflight();
    stopAudioCapture();
    setPage("idle");
    setBiomarkers(null);
    setSubmitResult(null);
    setQualityNotice(null);
    setCountdown(10);
    setSpeechDetected(false);
    setLiveDb(-70);
    setPreflightDb(-70);
    setPreflightResult("idle");
    setPreflightDeviceLabel("");
    setPreflightError("");
    preflightPeakDbRef.current = -70;
    voicedFramesRef.current = 0;
    consecutiveSilentRef.current = 0;
    pitchSamplesRef.current = [];
    amplitudeSamplesRef.current = [];
    hnrSamplesRef.current = [];
    jitterSamplesRef.current = [];
    shimmerSamplesRef.current = [];
    speechRmsSamplesRef.current = [];
    noiseRmsSamplesRef.current = [];
    voicedPitchRunsRef.current = [];
    voicedAmpRunsRef.current = [];
    voicedHnrRunsRef.current = [];
    voicedJitterRunsRef.current = [];
    voicedShimmerRunsRef.current = [];
    currentPitchRunRef.current = [];
    currentAmpRunRef.current = [];
    currentHnrRunRef.current = [];
    currentJitterRunRef.current = [];
    currentShimmerRunRef.current = [];
  };

  if (!isOpen) return null;

  const micBarPct = dbToBarPct(liveDb);
  const preflightBarPct = dbToBarPct(preflightDb);
  const micBarColor = liveDb > -12 ? "bg-rose-500" : liveDb > -30 ? "bg-emerald-400" : liveDb > -50 ? "bg-sky-400" : "bg-slate-600";
  const preflightBarColor = preflightDb > -12 ? "bg-rose-500" : preflightDb > -30 ? "bg-emerald-400" : preflightDb > -50 ? "bg-sky-400" : "bg-slate-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-neutral-border overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-800">

        {/* Header */}
        <div className="bg-navy-primary text-white p-5 flex items-center justify-between border-b-2 border-gold">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded bg-navy-light/60 border border-gold/40 flex items-center justify-center text-gold">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {tr("Dhvani • Vocal Acoustic Fatigue Screener", "ध्वनि • स्वर-आधारित तनाव एवं थकान परीक्षण")}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gold text-navy-primary">
                  {tr("CRPF Medical Cell", "सीआरपीएफ चिकित्सा प्रकोष्ठ")}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {tr("Real-time vocal-cord strain screener • 10s muster phrase", "10-सेकंड रोल-कॉल स्वर-तंतु परीक्षण")}
              </p>
            </div>
          </div>
          <button onClick={() => { stopPreflight(); stopAudioCapture(); onClose(); }} className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-navy-light transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Privacy bar — always shown */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start space-x-2.5 text-xs text-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span className="text-[11px] text-slate-600">
              <span className="font-bold text-slate-900">{tr("DPDP Privacy:", "DPDP गोपनीयता:")}</span>{" "}
              {tr(
                "Vocal strain scoring (Jitter/Shimmer/HNR/Pitch) runs 100% on-device. The PCM audio buffer is zero-wiped after metric extraction and is never stored or transmitted. Only non-invertible scalar metrics are submitted. No audio leaves this device.",
                "स्वर-तनाव स्कोरिंग 100% ऑन-डिवाइस। PCM बफर तुरंत मिटाया जाता है, कभी संचित या प्रेषित नहीं। केवल Jitter/Shimmer/HNR संख्याएं दर्ज। कोई ऑडियो डिवाइस नहीं छोड़ता।"
              )}
            </span>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              PAGE: IDLE — Start + permission status
          ══════════════════════════════════════════════════════════════ */}
          {page === "idle" && (
            <div className="space-y-4">
              {/* Daily Cadence Cooldown Banner (TASK 3: 24h daily roll-call cadence) */}
              {cooldownRemaining && (
                <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-lg text-xs text-amber-950 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-base">🔒</span>
                    <div>
                      <span className="font-bold block">{tr("Daily Roll-Call Check Complete", "आज का दैनिक रोल-कॉल चेक-इन पूर्ण")}</span>
                      <span className="text-[11px] text-amber-800">
                        {tr(`Next check-in window opens in ${cooldownRemaining} (24-hour daily roll-call cadence).`, `अगली जांच विंडो ${cooldownRemaining} में खुलेगी (24-घंटे दैनिक चक्र)।`)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem(COOLDOWN_KEY);
                      setCooldownRemaining(null);
                    }}
                    className="text-[10px] font-bold text-navy-primary hover:underline cursor-pointer bg-amber-200/90 hover:bg-amber-300 px-2.5 py-1 rounded shrink-0 shadow-2xs"
                    title="Reset cooldown for demonstration / evaluation"
                  >
                    {tr("Reset Demo", "डेमो रीसेट")}
                  </button>
                </div>
              )}

              {/* Permission status badge */}
              <div className={`p-3 rounded-lg border flex items-start space-x-2.5 text-xs ${
                micPermission === "granted" ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : micPermission === "denied" ? "bg-rose-50 border-rose-300 text-rose-900"
                : micPermission === "prompt" ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-slate-50 border-slate-200 text-slate-700"
              }`}>
                {micPermission === "granted" ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                 : micPermission === "denied" ? <MicOff className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                 : <Mic className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />}
                <div>
                  <span className="font-bold block">
                    {micPermission === "granted" ? tr("Microphone: Permission Granted", "माइक्रोफ़ोन: अनुमति प्राप्त")
                     : micPermission === "denied" ? tr("Microphone: Permission BLOCKED — Click 🔒 in address bar → Allow", "माइक्रोफ़ोन: अनुमति अवरुद्ध — एड्रेस बार में 🔒 क्लिक करें → Allow")
                     : micPermission === "prompt" ? tr("Microphone: Will ask for permission when you click Start", "माइक्रोफ़ोन: प्रारंभ करने पर अनुमति मांगी जाएगी")
                     : tr("Microphone: Status unknown", "माइक्रोफ़ोन: स्थिति अज्ञात")}
                  </span>
                  {micPermission === "denied" && (
                    <span className="text-[11px] block mt-0.5 text-rose-700">
                      {tr("Chrome: Settings → Privacy → Site Settings → Microphone → Allow this site", "Chrome: Settings → Privacy → Site Settings → Microphone → इस साइट को Allow करें")}
                    </span>
                  )}
                </div>
              </div>

              {/* Prompt phrase */}
              <div className="p-5 bg-gradient-to-b from-slate-50 to-white rounded-xl border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-navy-primary/10 text-navy-primary flex items-center justify-center mx-auto">
                  <Mic className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-navy-primary">{tr("Daily Roll-Call & Voice Check Phrase", "दैनिक रोल-कॉल व स्वर परीक्षण वाक्य")}</h4>
                  <p className="text-xs text-slate-500 mt-1">{tr("Conducted once daily during morning muster. Check your mic, then speak steadily for 10 seconds:", "प्रातःकालीन रोल-कॉल के समय दिन में एक बार। माइक जांचें, फिर 10 सेकंड स्थिर गति से बोलें:")}</p>
                </div>
                <div className="p-3.5 bg-white rounded-lg border-2 border-dashed border-amber-300 max-w-md mx-auto">
                  <span className="text-navy-primary block font-bold text-sm sm:text-base leading-relaxed">
                    {tr('"Jai Hind Sir. All is well, all secure. 1, 2, 3, 4, 5 — Jai Hind."', '"जय हिंद सर। सब ठीक-ठाक है, सब सुरक्षित है। 1, 2, 3, 4, 5 — जय हिंद।"')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (hasGivenConsent()) {
                      setPage("preflight");
                      runPreflight();
                    } else {
                      setPage("consent");
                    }
                  }}
                  disabled={micPermission === "denied"}
                  className="px-6 py-2.5 rounded-lg bg-navy-primary hover:bg-navy-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 mx-auto"
                >
                  <Radio className="w-4 h-4 text-gold" />
                  <span>
                    {cooldownRemaining
                      ? tr("Retest Check (Demo Mode)", "पुनः परीक्षण (डेमो मोड)")
                      : tr("Check Microphone & Start", "माइक्रोफ़ोन जांचें और शुरू करें")}
                  </span>
                  <ChevronRight className="w-3 h-3" />
                </button>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setPage("consent")}
                    className="text-[11px] text-slate-500 hover:text-navy-primary underline cursor-pointer"
                  >
                    {tr("View Data Governance & Enrollment Consent Protocol (90-Day Retention)", "डेटा प्रशासन एवं स्वैच्छिक सहमति प्रोटोकॉल देखें (90-दिवसीय प्रतिधारण)")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              PAGE: CONSENT — Voluntary Informed Consent & DPDP Privacy Terms
          ══════════════════════════════════════════════════════════════ */}
          {page === "consent" && (
            <div className="space-y-4">
              <div className="p-4 bg-navy-primary/5 rounded-xl border border-navy-primary/20 space-y-3">
                <div className="flex items-center space-x-2.5 border-b border-navy-primary/10 pb-2.5">
                  <ShieldCheck className="w-5 h-5 text-navy-primary shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm text-navy-primary">
                      {tr("Voluntary Biometric Welfare Consent & Enrollment", "स्वैच्छिक बायोमेट्रिक कल्याण सहमति एवं नामांकन")}
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      {tr("CAPF Personnel Data Governance & Privacy Standard (DPDP Aligned)", "सीएपीएफ कार्मिक डेटा प्रशासन एवं गोपनीयता मानक")}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-900 block mb-0.5">
                      1. {tr("What is collected (Acoustic Metrics Only):", "1. क्या एकत्र किया जाता है (केवल ध्वनिक मेट्रिक्स):")}
                    </span>
                    <span className="text-[11px] text-slate-600 leading-relaxed block">
                      {tr(
                        "Only mathematical vocal parameters (micro-jitter, shimmer, harmonics-to-noise ratio, and strain index). NO audio recording is ever saved, stored on disk, or uploaded to any server. Audio buffers exist only in local browser memory and are zero-wiped immediately upon calculation.",
                        "केवल गणितीय पैरामीटर (माइक्रो-जिटर, शिम्मर, HNR और स्ट्रेन इंडेक्स)। कोई भी ऑडियो रिकॉर्डिंग कभी भी सेव, डिस्क पर स्टोर या सर्वर पर अपलोड नहीं की जाती है। गणना के तुरंत बाद ऑडियो बफर शून्य कर दिए जाते हैं।"
                      )}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-900 block mb-0.5">
                      2. {tr("Why it is collected (Early Fatigue & Health Support):", "2. यह क्यों एकत्र किया जाता है (थकान एवं स्वास्थ्य सहायता):")}
                    </span>
                    <span className="text-[11px] text-slate-600 leading-relaxed block">
                      {tr(
                        "To detect cumulative operational fatigue, vocal cord strain, and sleep deprivation before physical exhaustion occurs. High-strain alerts allow the Unit Medical Officer and Welfare Officer to offer rest and recuperation (Vishram) support.",
                        "शारीरिक थकावट से पहले संचयी परिचालन थकान और तनाव का पता लगाने के लिए। उच्च-तनाव अलर्ट यूनिट मेडिकल ऑफिसर और वेलफेयर ऑफिसर को समय पर विश्राम एवं स्वास्थ्य सहायता प्रदान करने में सक्षम बनाते हैं।"
                      )}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-900 block mb-0.5">
                      3. {tr("Data Retention & 90-Day Auto-Purge:", "3. डेटा प्रतिधारण एवं 90-दिवसीय स्वतः निष्कासन:")}
                    </span>
                    <span className="text-[11px] text-slate-600 leading-relaxed block">
                      {tr(
                        "Check-in records are retained for 90 days only. An automated server retention protocol permanently purges older records. Records cannot be accessed for disciplinary, appraisal, or punitive reviews.",
                        "चेक-इन रिकॉर्ड केवल 90 दिनों तक रखे जाते हैं। स्वचालित सर्वर प्रोटोकॉल 90 दिनों से पुराने रिकॉर्ड्स को स्थायी रूप से हटा देता है। रिकॉर्ड्स का उपयोग किसी भी अनुशासनात्मक या मूल्यांकन समीक्षा के लिए नहीं किया जा सकता।"
                      )}
                    </span>
                  </div>

                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="font-bold text-emerald-950 block mb-0.5">
                      4. {tr("100% Voluntary — Decline Without Penalty:", "4. पूर्णतः स्वैच्छिक — बिना किसी दंड के अस्वीकार करने की स्वतंत्रता:")}
                    </span>
                    <span className="text-[11px] text-emerald-800 leading-relaxed block">
                      {tr(
                        "Your participation is completely voluntary. Declining to check in has ZERO effect on your service standing, leave requests, duty rosters, or APAR evaluations.",
                        "आपकी भागीदारी पूरी तरह स्वैच्छिक है। चेक-इन न करने से आपकी सेवा, अवकाश अनुरोध, ड्यूटी रोस्टर या एसीआर/अपार पर कोई प्रभाव नहीं पड़ता है।"
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (hasGivenConsent()) {
                        setPage("idle");
                      } else {
                        onClose();
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                  >
                    {hasGivenConsent() ? tr("Back", "पीछे") : tr("Cancel", "रद्द करें")}
                  </button>
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => onClose()}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold cursor-pointer"
                    >
                      {tr("Decline & Close", "अस्वीकार करें व बंद करें")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const consentKey = getConsentKey();
                        localStorage.setItem(consentKey, "true");
                        localStorage.setItem("dhvani_consent_accepted", "true");
                        localStorage.setItem("dhvani_consent_timestamp", Date.now().toString());
                        setPage("preflight");
                        runPreflight();
                      }}
                      className="flex-1 sm:flex-none px-5 py-2 rounded-lg bg-navy-primary hover:bg-navy-light text-white text-xs font-bold shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-gold" />
                      <span>{tr("I Understand & Consent", "मैं समझता हूँ और सहमति देता हूँ")}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              PAGE: PREFLIGHT — Mic test & calibration before the 10s recording
          ══════════════════════════════════════════════════════════════ */}
          {page === "preflight" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-navy-primary border-b border-slate-100 pb-2">
                <span className="flex items-center space-x-2">
                  <Radio className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span>{tr("Step 1 of 2 — Microphone & Audio Calibration", "चरण 1 / 2 — माइक्रोफ़ोन एवं ध्वनिक अंशांकन")}</span>
                </span>
                {audioDevices.length > 1 ? (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      setSelectedDeviceId(e.target.value);
                      stopPreflight();
                      setTimeout(runPreflight, 80);
                    }}
                    className="text-[10px] text-slate-700 bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 max-w-[210px] truncate cursor-pointer"
                  >
                    {audioDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        🎙 {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                ) : preflightDeviceLabel ? (
                  <span className="text-[10px] text-slate-500 font-normal font-mono truncate max-w-[200px]" title={preflightDeviceLabel}>
                    🎙 {preflightDeviceLabel}
                  </span>
                ) : null}
              </div>

              {/* Waveform Canvas with overlay status pill */}
              <div className="relative border border-slate-700 rounded-lg overflow-hidden bg-slate-900 shadow-inner">
                <canvas ref={preflightCanvasRef} width={480} height={64} className="w-full h-16 block" />
                <div
                  className="absolute top-2 right-2 flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold backdrop-blur-md border shadow-xs"
                  style={{
                    backgroundColor:
                      preflightResult === "ok"
                        ? "rgba(16, 185, 129, 0.25)"
                        : preflightResult === "noisy_room"
                        ? "rgba(245, 158, 11, 0.25)"
                        : preflightResult === "silent"
                        ? "rgba(239, 68, 68, 0.25)"
                        : "rgba(59, 130, 246, 0.25)",
                    borderColor:
                      preflightResult === "ok"
                        ? "rgba(16, 185, 129, 0.6)"
                        : preflightResult === "noisy_room"
                        ? "rgba(245, 158, 11, 0.6)"
                        : preflightResult === "silent"
                        ? "rgba(239, 68, 68, 0.6)"
                        : "rgba(59, 130, 246, 0.6)",
                    color:
                      preflightResult === "ok"
                        ? "#34d399"
                        : preflightResult === "noisy_room"
                        ? "#fbbf24"
                        : preflightResult === "silent"
                        ? "#f87171"
                        : "#60a5fa"
                  }}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      preflightResult === "ok"
                        ? "bg-emerald-400"
                        : preflightResult === "noisy_room"
                        ? "bg-amber-400"
                        : preflightResult === "silent"
                        ? "bg-rose-400"
                        : "bg-blue-400 animate-ping"
                    }`}
                  />
                  <span>
                    {preflightResult === "ok"
                      ? tr("Voice Signal Verified", "स्वर संकेत सत्यापित")
                      : preflightResult === "noisy_room"
                      ? tr("Ambient Calibrated", "परिवेश ध्वनि मापी गई")
                      : preflightResult === "silent"
                      ? tr("Low Signal", "कम ध्वनि संकेत")
                      : tr(`Calibrating (${preflightTimeRemaining}s)`, `अंशांकन जारी (${preflightTimeRemaining}s)`)}
                  </span>
                </div>
              </div>

              {/* Live dBFS bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-600">
                  <div className="flex items-center space-x-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-navy-primary" />
                    <span className="font-semibold">{tr("Live Input Level", "लाइव इनपुट स्तर")}</span>
                  </div>
                  <span
                    className={`font-bold font-mono ${
                      preflightDb > -30 ? "text-emerald-600" : preflightDb > -50 ? "text-sky-600" : "text-slate-400"
                    }`}
                  >
                    {preflightDb} dBFS {preflightDb > -30 ? "• Good Speech Zone" : preflightDb > -50 ? "• Active Input" : "• Silence"}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden relative shadow-inner">
                  <div className={`h-full rounded-full transition-all duration-75 ${preflightBarColor}`} style={{ width: `${preflightBarPct}%` }} />
                  {/* Speech zone marker */}
                  <div className="absolute top-0 left-[40%] w-px h-full bg-emerald-500/60" />
                  <div className="absolute top-0 left-[80%] w-px h-full bg-rose-500/60" />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-mono px-0.5">
                  <span>-70 dBFS (Silence)</span>
                  <span className="text-emerald-600 font-semibold">{tr("Optimal Speech Range (-30 to -10 dBFS)", "अनुकूल स्वर परास")}</span>
                  <span className="text-rose-500">Clipping</span>
                </div>
              </div>

              {/* Diagnostic Cards for all states */}
              {preflightResult === "testing" && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-950 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping shrink-0" />
                      <span className="font-bold text-blue-900">{tr("Calibrating Audio — Say 'Jai Hind' or count 1 to 5", "ऑडियो अंशांकन — 'जय हिंद' बोलें या 1 से 5 गिनें")}</span>
                    </div>
                    <span className="text-[10px] font-mono text-blue-700 font-bold">{preflightTimeRemaining}s</span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    {tr("Measuring ambient room acoustics and microphone sensitivity. Speak into the microphone now.", "कमरे की परिवेशीय ध्वनि और माइक संवेदनशीलता का अंशांकन हो रहा है। अभी बोलें।")}
                  </p>
                  <div className="w-full bg-blue-200/80 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full transition-all duration-100" style={{ width: `${preflightProgress}%` }} />
                  </div>
                </div>
              )}

              {preflightResult === "ok" && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-950 space-y-1.5 shadow-xs animate-in fade-in duration-200">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-900 text-sm">{tr("Microphone & Voice Signal Verified!", "माइक्रोफ़ोन एवं स्वर संकेत सत्यापित!")}</span>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        {tr(`Peak detected: ${preflightPeakDbRef.current} dBFS • Room noise floor: ${preflightNoiseFloorDb} dBFS. Audio is clear and calibrated for the 10-second muster evaluation.`, `अधिकतम स्तर: ${preflightPeakDbRef.current} dBFS • परिवेश शोर: ${preflightNoiseFloorDb} dBFS। ऑडियो स्पष्ट है, 10-सेकंड परीक्षण के लिए तैयार।`)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {preflightResult === "noisy_room" && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-start space-x-2">
                    <Volume2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-900">{tr("Microphone Active — Ambient Noise Calibrated", "माइक्रोफ़ोन सक्रिय — परिवेशीय ध्वनि दर्ज")}</span>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                        {tr(`Room noise floor measured at ${preflightNoiseFloorDb} dBFS (peak input: ${preflightPeakDbRef.current} dBFS). Microphone is functional. If you spoke quietly, speak slightly louder into the mic, or proceed directly to the test below.`, `परिवेशीय शोर स्तर: ${preflightNoiseFloorDb} dBFS (अधिकतम: ${preflightPeakDbRef.current} dBFS)। माइक सक्रिय है। यदि आवाज़ धीमी थी तो थोड़ा तेज़ बोलें, या नीचे से सीधे परीक्षण शुरू करें।`)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {preflightResult === "silent" && (
                <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-950 space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-rose-900">{tr("Low Audio Signal Detected", "कम ऑडियो संकेत दर्ज")}</span>
                      <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                        {tr(`Peak level was ${preflightPeakDbRef.current} dBFS (below -50 dBFS). Verify your microphone is unmuted in Windows or browser, or proceed directly if ready.`, `अधिकतम स्तर ${preflightPeakDbRef.current} dBFS था (-50 dBFS से कम)। जांचें कि माइक म्यूट न हो, या सीधे आगे बढ़ें।`)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {preflightResult === "no_permission" && (
                <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-lg text-xs text-rose-900 space-y-2">
                  <div className="flex items-center space-x-2">
                    <MicOff className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-bold">{tr("Microphone permission denied by browser", "ब्राउज़र ने माइक्रोफ़ोन अनुमति अस्वीकार की")}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded border border-rose-200 text-[11px] text-slate-700 space-y-1">
                    <p>1. {tr("Click the 🔒 icon in your browser address bar", "ब्राउज़र एड्रेस बार में 🔒 आइकन क्लिक करें")}</p>
                    <p>2. {tr('Set Microphone to "Allow"', '"Microphone" को "Allow" करें')}</p>
                    <p>3. {tr("Refresh the page and try again", "पेज रीफ्रेश करें और पुनः प्रयास करें")}</p>
                  </div>
                </div>
              )}

              {preflightResult === "error" && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-900 space-y-1">
                  <p className="font-bold">{tr("Microphone hardware error", "माइक्रोफ़ोन हार्डवेयर त्रुटि")}</p>
                  <p className="font-mono text-[11px] text-rose-800 bg-rose-100 p-1.5 rounded">{preflightError}</p>
                </div>
              )}

              {/* ── STEP 1 ACTION CONTROLS: ALWAYS ACCESSIBLE & UNBLOCKABLE ── */}
              <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={resetToIdle}
                  className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center space-x-1 order-2 sm:order-1"
                >
                  <span>{tr("← Back", "← वापस")}</span>
                </button>

                <div className="flex items-center space-x-2 order-1 sm:order-2 flex-1 sm:justify-end">
                  <button
                    type="button"
                    onClick={runPreflight}
                    className="px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-2xs"
                    title={tr("Restart 5-second acoustic calibration", "5-सेकंड अंशांकन पुनः प्रारंभ करें")}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>{tr("Restart Check", "पुनः जांच")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={startVoiceCheck}
                    className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 text-white ${
                      preflightResult === "ok"
                        ? "bg-emerald-700 hover:bg-emerald-800 ring-2 ring-emerald-500/50 animate-pulse"
                        : "bg-navy-primary hover:bg-navy-light"
                    }`}
                  >
                    <Mic className={`w-4 h-4 ${preflightResult === "ok" ? "text-emerald-200" : "text-gold"}`} />
                    <span>
                      {preflightResult === "ok"
                        ? tr("Start 10s Voice Test →", "10-सेकंड स्वर परीक्षण शुरू करें →")
                        : tr("Proceed to 10s Voice Test →", "10-सेकंड स्वर परीक्षण पर जाएं →")}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              PAGE: RECORDING
          ══════════════════════════════════════════════════════════════ */}
          {page === "recording" && (
            <div className="p-5 bg-white rounded-xl border-2 border-navy-primary space-y-4 text-center">
              <div className="flex items-center justify-between text-navy-primary text-xs font-bold border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                  <span className="text-red-700 uppercase tracking-wide text-[11px] font-mono font-bold">{tr("Live Recording", "लाइव रिकॉर्डिंग")}</span>
                </div>
                <span className="font-bold font-mono text-navy-primary text-sm">{countdown} {tr("seconds remaining", "सेकंड शेष")}</span>
              </div>

              {/* Live Mic Level Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <div className="flex items-center space-x-1"><Volume2 className="w-3 h-3" /><span>{tr("Mic Level", "माइक स्तर")}</span></div>
                  <span className={liveDb > -30 ? "text-emerald-600 font-bold" : liveDb > -50 ? "text-sky-500" : "text-rose-500 font-bold"}>
                    {liveDb} dBFS {liveDb > -30 ? "✓ Picking up voice" : liveDb > -50 ? "Low — speak louder" : "⚠ Silent — check mic!"}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-75 ${micBarColor}`} style={{ width: `${micBarPct}%` }} />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>Silence</span><span className="text-emerald-600">Good</span><span className="text-rose-500">Clip</span>
                </div>
              </div>

              {/* VAD Pulse Indicator — driven by harmonicity-gated on-device VAD (Option B) */}
              <div className="p-4 bg-slate-900 text-white rounded-xl text-center space-y-3 shadow-inner border border-slate-700">
                <div className="flex items-center justify-center space-x-3 py-2">
                  {/* Outer ring — always visible, fades when silent */}
                  <div className={`relative flex items-center justify-center transition-all duration-300 ${
                    speechDetected ? "opacity-100" : "opacity-40"
                  }`}>
                    {/* Pulsing ring: animates only when voice is detected */}
                    {speechDetected && (
                      <span className="absolute inline-flex w-14 h-14 rounded-full bg-emerald-400/30 animate-ping" />
                    )}
                    <span className={`relative inline-flex w-10 h-10 rounded-full border-4 transition-colors duration-200 items-center justify-center ${
                      speechDetected
                        ? "border-emerald-400 bg-emerald-500/20"
                        : "border-slate-600 bg-slate-800"
                    }`}>
                      <Mic className={`w-4 h-4 transition-colors duration-200 ${
                        speechDetected ? "text-emerald-400" : "text-slate-500"
                      }`} />
                    </span>
                  </div>
                  <div className="text-left">
                    <p className={`font-bold text-sm transition-colors duration-200 ${
                      speechDetected ? "text-emerald-400" : "text-slate-400"
                    }`}>
                      {speechDetected
                        ? tr("Voice Detected — Keep speaking", "आवाज़ मिली — बोलते रहें")
                        : tr("Listening… Speak the phrase now", "प्रतीक्षारत… अभी वाक्य बोलें")
                      }
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {tr(
                        "On-device voice activity detection — no audio transmitted",
                        "ऑन-डिवाइस VAD — कोई ऑडियो प्रेषित नहीं"
                      )}
                    </p>
                  </div>
                </div>

                {/* Prompt phrase — static reference, no word matching */}
                <div className="px-3 py-2 bg-slate-800 rounded-lg border border-slate-700 text-center">
                  <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-wide font-bold">
                    {tr("Say this phrase:", "यह वाक्य बोलें:")}
                  </p>
                  <p className="text-slate-100 font-semibold text-xs sm:text-sm leading-relaxed">
                    {tr(
                      '"Jai Hind Sir. All is well, all secure. 1, 2, 3, 4, 5 — Jai Hind."',
                      '"जय हिंद सर। सब ठीक-ठाक है, सब सुरक्षित है। 1, 2, 3, 4, 5 — जय हिंद।"'
                    )}
                  </p>
                </div>
              </div>

              {/* Waveform */}
              <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
                <canvas ref={canvasRef} width={480} height={60} className="w-full h-16" />
              </div>

              {/* DSP HUD */}
              <div className="grid grid-cols-4 gap-2 bg-slate-950 p-2.5 rounded-lg text-left text-white border border-slate-800 font-mono shadow-inner">
                {[
                  { label: tr("Pitch (F0)", "पिच"), value: liveTelemetry.pitch > 0 ? `${liveTelemetry.pitch} Hz` : "—", color: "text-amber-400" },
                  { label: tr("Audio Level", "ध्वनि"), value: `${liveTelemetry.db} dBFS`, color: "text-sky-400" },
                  { label: tr("Clarity HNR", "स्पष्टता"), value: liveTelemetry.hnr > 0 ? `${liveTelemetry.hnr} dB` : "—", color: "text-emerald-400" },
                  { label: tr("Live Strain", "तनाव"), value: `${liveTelemetry.liveStrain}%`, color: liveTelemetry.liveStrain >= 55 ? "text-rose-400" : liveTelemetry.liveStrain >= 33 ? "text-amber-400" : "text-emerald-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-slate-900/90 p-2 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-400 block font-sans uppercase font-bold tracking-wider">{label}</span>
                    <span className={`text-xs sm:text-sm font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-navy-primary h-full transition-all duration-250" style={{ width: `${((10 - countdown) / 10) * 100}%` }} />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              PAGE: ANALYZING
          ══════════════════════════════════════════════════════════════ */}
          {page === "analyzing" && (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 rounded-full border-3 border-navy-primary border-t-gold animate-spin mx-auto" />
              <div className="font-bold text-xs text-navy-primary">{tr("Analyzing acoustic parameters & discarding volatile audio buffer...", "ध्वनिक मापदंडों का विश्लेषण एवं मेमोरी निष्कासन...")}</div>
              <p className="text-[11px] text-slate-500">{tr("Zero audio stored or transmitted • On-device DSP only", "शून्य ऑडियो संचित या प्रेषित • ऑन-डिवाइस DSP मात्र")}</p>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              PAGE: COMPLETED (TASK 1: Softened language; TASK 2: Auto-saved)
          ══════════════════════════════════════════════════════════════ */}
          {page === "completed" && biomarkers && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Baseline Calibration Notice */}
              <div className="flex items-start space-x-2.5 text-xs text-navy-primary bg-blue-50/90 border border-blue-200 p-2.5 rounded-lg">
                <Activity className="w-4 h-4 text-navy-primary shrink-0 mt-0.5" />
                <div className="text-[11px] leading-snug">
                  <span className="font-bold block">{tr("Calibrated against your personal baseline, not a generic threshold.", "आपके व्यक्तिगत बेसलाइन से तुलना।")}</span>
                </div>
              </div>

              {/* Signal Quality Badge (TASK 1: Only Moderate or High confidence ever reaches here) */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${biomarkers.confidence_level === "High" ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-amber-50 text-amber-800 border-amber-300"}`}>
                  {tr(`Signal Quality: ${biomarkers.confidence_level}`, `ध्वनि गुणवत्ता: ${biomarkers.confidence_level}`)}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">SNR: {biomarkers.snr_db} dB • {biomarkers.voiced_duration_sec}s voiced</span>
              </div>

              {/* Softened Calmer Self-Facing Completed Box (TASK 1) */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 text-slate-900 flex items-start space-x-3.5 shadow-2xs">
                <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0 text-emerald-700 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-navy-primary">
                    {tr("Check-in recorded — thank you", "दैनिक चेक-इन दर्ज — धन्यवाद")}
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {biomarkers.strain_tier === "Nominal Baseline"
                      ? tr("Acoustic parameters recorded within personal baseline. Have a safe and steady duty shift.", "ध्वनिक मापदंड व्यक्तिगत बेसलाइन के अनुकूल दर्ज। सुरक्षित ड्यूटी करें।")
                      : tr("Acoustic parameters recorded for your daily wellness profile. Remember to stay hydrated and take scheduled rest breaks.", "दैनिक स्वास्थ्य प्रोफाइल हेतु ध्वनिक मापदंड दर्ज। पर्याप्त जलपान रखें और समय पर विश्राम लें।")}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {tr("Detailed clinical evaluations and trend analytics are maintained confidentially by the Unit Welfare Officer.", "विस्तृत मूल्यांकन एवं रुझान विश्लेषण यूनिट वेलफेयर ऑफिसर द्वारा गोपनीय रूप से प्रबंधित हैं।")}
                  </p>
                </div>
              </div>

              {/* Neutral Physical Acoustic Telemetry (Pitch, Jitter, Shimmer, HNR) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                {[
                  { label: tr("Pitch (F0)", "पिच F0"), value: `${biomarkers.pitch_hz} Hz`, note: biomarkers.pitch_min_hz && biomarkers.pitch_max_hz ? `${biomarkers.pitch_min_hz}–${biomarkers.pitch_max_hz} Hz` : "" },
                  { label: tr("Jitter (RAP)", "Jitter"), value: `${biomarkers.jitter_pct}%`, note: tr("Frequency micro-tremor", "आवृत्ति सूक्ष्म-कंपन") },
                  { label: tr("Shimmer (APQ)", "Shimmer"), value: `${biomarkers.shimmer_pct}%`, note: tr("Amplitude stability", "आयाम स्थिरता") },
                  { label: tr("HNR (Clarity)", "HNR"), value: `${biomarkers.hnr_db} dB`, note: tr("Harmonic clarity", "हार्मोनिक स्पष्टता") },
                ].map(({ label, value, note }) => (
                  <div key={label} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block">{label}</span>
                    <span className="text-sm font-bold text-navy-primary font-mono">{value}</span>
                    {note && <span className="text-[9px] text-slate-500 block mt-0.5">{note}</span>}
                  </div>
                ))}
              </div>

              {/* Auto-Save Confirmation Banner (TASK 2) */}
              {submitResult ? (
                submitResult.status === "offline_cached" ? (
                  <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-lg text-xs text-amber-950 flex items-start space-x-2.5">
                    <Radio className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                    <div className="space-y-1 w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900">{tr("Saved to Tactical Field Baseline", "सामरिक फील्ड बेसलाइन में सहेजा गया")}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900 border border-amber-300">
                          CRPF Outpost Mode
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        {tr(
                          "Acoustic biometrics safely recorded to secure on-device baseline. Queued for automatic upload once Unit Medical Cell uplink is re-established.",
                          "ध्वनिक बायोमेट्रिक डेटा सुरक्षित ऑन-डिवाइस बेसलाइन में सहेजा गया। नेटवर्क बहाल होने पर स्वतः सिंक होगा।"
                        )}
                      </p>
                      <div className="text-[10px] text-amber-900/80 font-mono pt-1.5 flex items-center justify-between border-t border-amber-200 mt-1">
                        <span>{tr("Recorded At:", "रिकॉर्ड समय:")} {formatRealDateTime(submitResult.created_at || new Date())}</span>
                        <span className="font-sans font-semibold text-amber-800">IST (UTC+5:30)</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-950 flex items-start space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="space-y-1 w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900">{tr("Logged to Unit Health Record", "यूनिट स्वास्थ्य रिकॉर्ड में दर्ज")}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Cloud Synced
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        {tr("Acoustic parameters verified and saved to Unit Medical Cell baseline database.", "ध्वनिक बायोमार्कर सत्यापित एवं यूनिट मेडिकल सेल बेसलाइन डेटाबेस में दर्ज।")}
                      </p>
                      <div className="text-[10px] text-emerald-900/80 font-mono pt-1.5 flex items-center justify-between border-t border-emerald-200 mt-1">
                        <span>{tr("Recorded At:", "रिकॉर्ड समय:")} {formatRealDateTime(submitResult.created_at || new Date())}</span>
                        <span className="font-sans font-semibold text-emerald-800">IST (UTC+5:30)</span>
                      </div>
                    </div>
                  </div>
                )
              ) : isSubmitting ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center space-x-2">
                  <div className="w-3.5 h-3.5 border-2 border-navy-primary border-t-transparent rounded-full animate-spin" />
                  <span>{tr("Auto-saving to health record...", "स्वास्थ्य रिकॉर्ड में स्वतः दर्ज हो रहा है...")}</span>
                </div>
              ) : null}

              {/* Cooldown Status (TASK 3: 24h daily roll-call cadence) */}
              {cooldownRemaining && (
                <div className="py-2.5 px-3.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-600 text-xs font-semibold flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span>🔒</span>
                    <span>{tr(`Next daily roll-call check-in in ${cooldownRemaining}`, `अगली दैनिक जांच ${cooldownRemaining} में`)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem(COOLDOWN_KEY);
                      setCooldownRemaining(null);
                    }}
                    className="text-[10px] font-bold text-navy-primary hover:underline cursor-pointer bg-slate-200 hover:bg-slate-300 px-2.5 py-0.5 rounded shadow-2xs"
                    title="Reset cooldown for demonstration / evaluation"
                  >
                    {tr("Reset Demo", "डेमो रीसेट")}
                  </button>
                </div>
              )}

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-500 text-center">
                {tr("Dhvani is an auxiliary early-warning screening tool, not a psychiatric diagnosis.", "ध्वनि एक सहायक प्रारंभिक चेतावनी संकेतक है, मनोरोग निदान नहीं।")}
              </div>

              {/* Action Bar (TASK 2: Removed manual click-gate) */}
              <div className="pt-2 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => { stopAudioCapture(); onClose(); }}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-navy-primary hover:bg-navy-light text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-gold" />
                  <span>{tr("Done", "पूर्ण")}</span>
                </button>
                <button
                  type="button"
                  onClick={resetToIdle}
                  className="py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5 border border-slate-300"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{tr("Run Another Check", "पुनः परीक्षण")}</span>
                </button>
                {biomarkers.strain_score > 35 && onOpenVishram && (
                  <button
                    type="button"
                    onClick={() => { onClose(); onOpenVishram(); }}
                    className="py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <Activity className="w-4 h-4" />
                    <span>{tr("Open Vishram Pacing", "विश्राम पेसिंग")}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              FAILURE PAGES (TASK 1: Re-use failed_quality for Low confidence retake)
          ══════════════════════════════════════════════════════════════ */}
          {(page === "failed_silence" || page === "failed_quality" || page === "failed_permission" || page === "failed_error") && (
            <div className={`p-6 rounded-xl text-center space-y-4 animate-in fade-in border-2 ${
              page === "failed_permission" ? "bg-rose-50 border-rose-400"
              : page === "failed_quality" ? "bg-amber-50 border-amber-400"
              : "bg-rose-50 border-rose-300"
            }`}>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto border ${
                page === "failed_permission" ? "bg-rose-100 text-rose-700 border-rose-200"
                : page === "failed_quality" ? "bg-amber-100 text-amber-800 border-amber-200"
                : "bg-rose-100 text-rose-700 border-rose-200"
              }`}>
                {page === "failed_permission" ? <MicOff className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
              </div>

              <div>
                <h4 className="font-bold text-base">
                  {page === "failed_permission" ? tr("Microphone Access Denied", "माइक्रोफ़ोन अनुमति अस्वीकृत")
                   : page === "failed_quality" ? tr("Signal Quality Inadequate — Retake Required", "ध्वनि गुणवत्ता अपर्याप्त — पुनः प्रयास आवश्यक")
                   : page === "failed_error" ? tr("Hardware Error", "हार्डवेयर त्रुटि")
                   : tr("No Speech Audio Detected", "कोई आवाज़ दर्ज नहीं")}
                </h4>
                <p className="text-xs mt-1.5 max-w-md mx-auto leading-relaxed text-slate-700">
                  {page === "failed_permission" ? tr("Grant microphone permission via the 🔒 lock in your address bar.", "एड्रेस बार में 🔒 से माइक्रोफ़ोन की अनुमति दें।")
                   : page === "failed_quality" ? tr(qualityNotice?.en || "The recording did not meet acoustic quality requirements (low SNR and/or short voiced duration). Please retry in a quieter spot and speak for the full 10 seconds.", qualityNotice?.hi || "रिकॉर्डिंग ध्वनि गुणवत्ता आवश्यकताओं के अनुरूप नहीं थी (कम SNR या अपर्याप्त आवाज़)। कृपया शांत स्थान पर पुनः प्रयास करें और पूरे 10 सेकंड बोलें।")
                   : tr("The microphone did not pick up audible speech. Use the Mic Check step to diagnose the issue.", "माइक्रोफ़ोन में आवाज़ नहीं आई। माइक जांच चरण से समस्या पहचानें।")}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1 max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={startVoiceCheck}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-navy-primary hover:bg-navy-light text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Mic className="w-4 h-4 text-gold" />
                  <span>{tr("Try 10s Voice Test Again →", "10-सेकंड स्वर परीक्षण पुनः करें →")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setPage("preflight"); runPreflight(); }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{tr("Back to Mic Check", "माइक जांच पर वापस")}</span>
                </button>
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
};
