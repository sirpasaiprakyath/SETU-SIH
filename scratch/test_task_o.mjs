import { analyzeAudioFrame, calculateJitter } from '../frontend/src/utils/acousticEngine.ts';

const SAMPLE_RATE = 48000;
const FRAME_SIZE = 2048;

function generateVocalFrame(f0, jitterFactor, shimmerFactor, snrDb, seed = 42) {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const randn = () => {
    const u1 = Math.max(1e-9, rand());
    const u2 = rand();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  };

  const periodSamples = SAMPLE_RATE / f0;
  const signal = new Float32Array(FRAME_SIZE);
  let pulsePos = 0;

  while (pulsePos < FRAME_SIZE) {
    const pJittered = periodSamples * (1.0 + randn() * jitterFactor);
    const ampJittered = Math.max(0.2, 1.0 + randn() * shimmerFactor);
    const idx = Math.floor(pulsePos);
    const rem = FRAME_SIZE - idx;
    if (rem > 0) {
      for (let i = 0; i < rem; i++) {
        const tDecay = i / SAMPLE_RATE;
        const formant1 = Math.exp(-tDecay * 400) * Math.sin(2 * Math.PI * 700 * tDecay);
        const formant2 = 0.5 * Math.exp(-tDecay * 550) * Math.sin(2 * Math.PI * 1220 * tDecay);
        const formant3 = 0.25 * Math.exp(-tDecay * 700) * Math.sin(2 * Math.PI * 2600 * tDecay);
        signal[idx + i] += ampJittered * (formant1 + formant2 + formant3);
      }
    }
    pulsePos += pJittered;
  }

  let sumSig = 0;
  for (let i = 0; i < FRAME_SIZE; i++) sumSig += signal[i] * signal[i];
  const sigPower = sumSig / FRAME_SIZE;
  const noisePower = sigPower / Math.pow(10, snrDb / 10.0);
  const noiseStd = Math.sqrt(noisePower);

  let maxAbs = 0;
  const buffer = new Float32Array(FRAME_SIZE);
  for (let i = 0; i < FRAME_SIZE; i++) {
    const n = randn() * noiseStd;
    buffer[i] = signal[i] + n;
    if (Math.abs(buffer[i]) > maxAbs) maxAbs = Math.abs(buffer[i]);
  }

  if (maxAbs > 0) {
    for (let i = 0; i < FRAME_SIZE; i++) buffer[i] = (buffer[i] / maxAbs) * 0.15;
  }
  return buffer;
}

// Generate 7 consecutive frames of 265 Hz phonation (mild-to-moderate effort)
const frames = [];
for (let i = 0; i < 7; i++) {
  frames.push(generateVocalFrame(265.0, 0.020, 0.050, 14.0, 300 + i));
}

// Case 1: WITH the Task N fix (current analyzeAudioFrame)
console.log('--- CASE 1: With Task N Fix (Accurate Fundamental Tracking) ---');
const runWithFix = [];
const pitchesWithFix = [];
frames.forEach((f, idx) => {
  const res = analyzeAudioFrame(f, SAMPLE_RATE);
  runWithFix.push(res.jitterPct);
  pitchesWithFix.push(res.pitchHz);
  console.log(`  Frame ${idx + 1}: F0 = ${res.pitchHz} Hz | Jitter = ${res.jitterPct}%`);
});
const jitterAggregateWithFix = calculateJitter(runWithFix);
console.log(`=> Aggregate calculateJitter(run): ${jitterAggregateWithFix}%`);

// Case 2: SIMULATING UNCORRECTED OCTAVE ERROR ON FRAME 4 (P=549 samples / 88 Hz)
console.log('\n--- CASE 2: Without Task N Fix (Octave/Subharmonic Error on Frame 4) ---');
// For Frame 4, simulate what happened when period was 549 instead of 186
const frame4 = frames[3];
const P_err = 549; // 3x subharmonic period
const peaks_err = [];
let searchStart = 0;
while (searchStart + P_err <= FRAME_SIZE) {
  let maxVal = -1e9;
  let maxIdx = -1;
  const searchEnd = Math.min(FRAME_SIZE, searchStart + P_err);
  for (let i = searchStart; i < searchEnd; i++) {
    if (frame4[i] > maxVal) {
      maxVal = frame4[i];
      maxIdx = i;
    }
  }
  if (maxIdx >= 0) {
    peaks_err.push(maxIdx);
    searchStart = maxIdx + Math.floor(P_err * 0.7);
  } else {
    searchStart += P_err;
  }
}
const periods_err = [];
for (let i = 0; i < peaks_err.length - 1; i++) periods_err.push(peaks_err[i + 1] - peaks_err[i]);
const meanP_err = periods_err.reduce((a, b) => a + b, 0) / periods_err.length;
let sumDiff_err = 0;
for (let i = 0; i < periods_err.length - 1; i++) sumDiff_err += Math.abs(periods_err[i + 1] - periods_err[i]);
const cycleJitter_err = ((sumDiff_err / (periods_err.length - 1)) / meanP_err) * 100;
const frame4_err_jitter = Math.round(Math.min(Math.max(cycleJitter_err, 0.15), 12.0) * 100) / 100;

const runWithoutFix = [...runWithFix];
runWithoutFix[3] = frame4_err_jitter;

frames.forEach((f, idx) => {
  const pitch = idx === 3 ? 88 : pitchesWithFix[idx];
  const j = runWithoutFix[idx];
  console.log(`  Frame ${idx + 1}: F0 = ${pitch} Hz ${idx === 3 ? '(! OCTAVE ERROR 88 Hz !)' : ''} | Jitter = ${j}%`);
});
const jitterAggregateWithoutFix = calculateJitter(runWithoutFix);
console.log(`=> Aggregate calculateJitter(run): ${jitterAggregateWithoutFix}%`);

// Also test inter-period jitter across consecutive frames in the run
console.log('\n--- Cross-Frame Period-Perturbation Comparison ---');
// If inter-frame period jitter is evaluated: |P[i] - P[i-1]| / mean(P)
const periodsWithFix = pitchesWithFix.map(p => 1000 / p); // in ms
const periodsWithoutFix = pitchesWithFix.map((p, i) => i === 3 ? (1000 / 88) : (1000 / p));

function computeInterFrameJitter(periods) {
  let sumDiff = 0;
  for (let i = 0; i < periods.length - 1; i++) sumDiff += Math.abs(periods[i + 1] - periods[i]);
  const meanP = periods.reduce((a, b) => a + b, 0) / periods.length;
  return ((sumDiff / (periods.length - 1)) / meanP) * 100;
}
console.log(`  Cross-frame period jitter (With Task N Fix)   : ${computeInterFrameJitter(periodsWithFix).toFixed(2)}%`);
console.log(`  Cross-frame period jitter (With Octave Error) : ${computeInterFrameJitter(periodsWithoutFix).toFixed(2)}%`);
