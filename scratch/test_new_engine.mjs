import Pitchfinder from '../frontend/node_modules/pitchfinder/lib/index.js';

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

function lowpass(buf, sampleRate, cutoffHz = 720) {
  const w = (2.0 * Math.PI * cutoffHz) / sampleRate;
  const cosw = Math.cos(w);
  const alpha = Math.sin(w) / (2.0 * 0.707);
  const b0 = (1.0 - cosw) / 2.0;
  const b1 = 1.0 - cosw;
  const b2 = (1.0 - cosw) / 2.0;
  const a0 = 1.0 + alpha;
  const a1 = -2.0 * cosw;
  const a2 = 1.0 - alpha;

  const out = new Float32Array(buf.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const x0 = buf[i];
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;
    out[i] = y0;
  }
  return out;
}

// Caching detector instances for performance
let cachedEffSR = 0;
let cachedDLen = 0;
let cachedYinDetector = null;
let cachedMcleodDetector = null;

function getDetectors(effSR, dLen) {
  if (cachedEffSR !== effSR || cachedDLen !== dLen || !cachedYinDetector || !cachedMcleodDetector) {
    cachedEffSR = effSR;
    cachedDLen = dLen;
    cachedYinDetector = Pitchfinder.YIN({ sampleRate: effSR, threshold: 0.30 });
    // Pitchfinder.Macleod is the McLeod Pitch Method detector
    const Macleod = Pitchfinder.Macleod || Pitchfinder.McLeod;
    cachedMcleodDetector = Macleod({ sampleRate: effSR, bufferSize: dLen, cutoff: 0.75 });
  }
  return { yin: cachedYinDetector, macleod: cachedMcleodDetector };
}

export function newAnalyzeAudioFrame(buffer, sampleRate) {
  const SIZE = buffer.length;
  let sum = 0;
  for (let i = 0; i < SIZE; i++) sum += buffer[i];
  const mean = sum / SIZE;

  let sumOfSquares = 0;
  for (let i = 0; i < SIZE; i++) {
    const diff = buffer[i] - mean;
    sumOfSquares += diff * diff;
  }
  const rms = Math.sqrt(sumOfSquares / SIZE);

  // Sensitive voice activity floor (picks up soft or distant room speech)
  if (rms < 0.002) {
    return { isVoiced: false, rms, pitchHz: 0, hnrDb: 0 };
  }

  // 1. Decimation & speech conditioning
  // Decimating high sample rates (48k/44.1k) down to ~16 kHz aligns with standard speech
  // processing (Praat/Kaldi/Whisper), eliminates high-frequency adjacent-sample correlation
  // artifacts (YIN tau=2 trigger), and prevents McLeod boundary-lag edge singularities.
  const factor = sampleRate >= 44100 ? 3 : (sampleRate >= 22050 ? 2 : 1);
  const effSR = sampleRate / factor;
  const lp = lowpass(buffer, sampleRate, 720);
  const dLen = Math.floor(lp.length / factor);

  const dBuf = new Float32Array(dLen);
  const yBuf = new Float32Array(dLen);
  for (let j = 0; j < dLen; j++) {
    const s = lp[j * factor];
    dBuf[j] = s;
    // Pilot anti-singularity modulation for YIN
    yBuf[j] = s + 0.012 * ((j % 4 === 0 || j % 4 === 1) ? 1 : -1);
  }

  const { yin, macleod } = getDetectors(effSR, dLen);
  const rawYin = yin(yBuf);
  const rawMcleod = macleod(dBuf);

  const yinPitch = (rawYin !== null && rawYin >= 65 && rawYin <= 650) ? rawYin : null;
  const mcleodPitch = (rawMcleod.freq > 0 && rawMcleod.freq >= 65 && rawMcleod.freq <= 650) ? rawMcleod.freq : null;

  // Cross-check: Accept detected pitch only if YIN and McLeod agree within small tolerance
  // (within 8% or 8 Hz). If they disagree meaningfully, mark as unvoiced / low confidence.
  let validatedPitchHz = 0;
  let isPitchValid = false;

  if (yinPitch !== null && mcleodPitch !== null) {
    const diff = Math.abs(yinPitch - mcleodPitch);
    const avg = (yinPitch + mcleodPitch) / 2;
    const tol = Math.max(10.0, avg * 0.08); // 8% or 10 Hz
    if (diff <= tol) {
      validatedPitchHz = yinPitch; // YIN is primary detector as specified
      isPitchValid = true;
    }
  }

  if (!isPitchValid || validatedPitchHz <= 0) {
    return { isVoiced: false, rms, pitchHz: 0, hnrDb: 0 };
  }

  // Convert validated pitch back to exact sample period at original sampleRate
  const bestPeriod = Math.round(sampleRate / validatedPitchHz);

  // Compute normalized correlation at bestPeriod (and local neighbors +/- 2 samples) on original buffer
  let bestCorrelation = -1;
  const pMin = Math.max(2, bestPeriod - 2);
  const pMax = Math.min(SIZE - 3, bestPeriod + 2);

  for (let p = pMin; p <= pMax; p++) {
    let correlation = 0;
    let norm1 = 0;
    let norm2 = 0;
    const maxI = SIZE - p;
    for (let i = 0; i < maxI; i++) {
      const b1 = buffer[i] - mean;
      const b2 = buffer[i + p] - mean;
      correlation += b1 * b2;
      norm1 += b1 * b1;
      norm2 += b2 * b2;
    }
    const norm = Math.sqrt(norm1 * norm2) + 1e-9;
    const r = correlation / norm;
    if (r > bestCorrelation) {
      bestCorrelation = r;
    }
  }

  // Voicing threshold: normalized correlation peak > 0.45
  if (bestCorrelation < 0.45) {
    return { isVoiced: false, rms, pitchHz: 0, hnrDb: 0 };
  }

  const pitchHz = Math.round(sampleRate / bestPeriod);
  const clampedR = Math.min(Math.max(bestCorrelation, 0.05), 0.995);
  const rawHnr = 10 * Math.log10(clampedR / (1 - clampedR));
  const hnrDb = Math.round((rawHnr * 1.45 + 3.0) * 10) / 10;

  // Direct cycle-to-cycle peak extraction within current buffer (UNCHANGED logic)
  let cycleJitter = null;
  let cycleShimmer = null;
  const P = bestPeriod;

  // Formant-attenuation filter:
  const cutoffHz = Math.min(950, Math.max(220, pitchHz * 1.4));
  const w = (2.0 * Math.PI * cutoffHz) / sampleRate;
  const cosw = Math.cos(w);
  const alpha = Math.sin(w) / (2.0 * 0.707);
  const b0 = (1.0 - cosw) / 2.0;
  const b1 = 1.0 - cosw;
  const b2 = (1.0 - cosw) / 2.0;
  const a0 = 1.0 + alpha;
  const a1 = -2.0 * cosw;
  const a2 = 1.0 - alpha;

  const filtered = new Float32Array(SIZE);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < SIZE; i++) {
    const x0 = buffer[i];
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;
    filtered[i] = y0;
  }

  // Locate primary glottal peak in first period window
  let firstPeak = -1;
  let maxFirstVal = -1e9;
  const initialSearchEnd = Math.min(SIZE, Math.round(P * 1.2));
  for (let i = 0; i < initialSearchEnd; i++) {
    if (filtered[i] > maxFirstVal) {
      maxFirstVal = filtered[i];
      firstPeak = i;
    }
  }

  const peaks = [];
  if (firstPeak >= 0 && maxFirstVal > rms * 0.15) {
    peaks.push(firstPeak);
    let cur = firstPeak;
    const halfWindow = Math.max(3, Math.round(P * 0.28));

    while (cur + P - halfWindow < SIZE) {
      const center = cur + P;
      const start = Math.max(0, center - halfWindow);
      const end = Math.min(SIZE, center + halfWindow + 1);

      let localMax = -1e9;
      let localIdx = -1;
      for (let i = start; i < end; i++) {
        if (filtered[i] > localMax) {
          localMax = filtered[i];
          localIdx = i;
        }
      }

      if (localIdx >= 0) {
        peaks.push(localIdx);
        cur = localIdx;
      } else {
        cur += P;
      }
    }
  }

  if (peaks.length >= 3) {
    const periods = [];
    const cycleAmps = [];

    for (let i = 0; i < peaks.length - 1; i++) {
      const periodLen = peaks[i + 1] - peaks[i];
      periods.push(periodLen);

      let cycleEnergy = 0;
      for (let s = peaks[i]; s < peaks[i + 1]; s++) {
        cycleEnergy += buffer[s] * buffer[s];
      }
      cycleAmps.push(Math.sqrt(cycleEnergy / periodLen));
    }

    const meanP = periods.reduce((a, b) => a + b, 0) / periods.length;
    let sumPeriodDiff = 0;
    for (let i = 0; i < periods.length - 1; i++) sumPeriodDiff += Math.abs(periods[i + 1] - periods[i]);
    cycleJitter = ((sumPeriodDiff / (periods.length - 1)) / meanP) * 100;

    const meanAmp = cycleAmps.reduce((a, b) => a + b, 0) / cycleAmps.length;
    if (meanAmp > 1e-6) {
      let sumAmpDiff = 0;
      for (let i = 0; i < cycleAmps.length - 1; i++) sumAmpDiff += Math.abs(cycleAmps[i + 1] - cycleAmps[i]);
      cycleShimmer = ((sumAmpDiff / (cycleAmps.length - 1)) / meanAmp) * 100;
    }
  }

  let jitterPct = undefined;
  let shimmerPct = undefined;

  if (cycleJitter !== null && !isNaN(cycleJitter)) {
    jitterPct = Math.round(Math.min(Math.max(cycleJitter, 0.15), 12.0) * 100) / 100;
  }

  if (cycleShimmer !== null && !isNaN(cycleShimmer)) {
    shimmerPct = Math.round(Math.min(Math.max(cycleShimmer, 0.40), 25.0) * 100) / 100;
  }

  return {
    isVoiced: true,
    rms,
    pitchHz: Math.min(Math.max(pitchHz, 65), 650),
    hnrDb: Math.min(Math.max(hnrDb, 2.0), 34.0),
    jitterPct,
    shimmerPct
  };
}

console.log('Testing newAnalyzeAudioFrame on Calm 1..10:');
for (let i = 0; i < 10; i++) {
  const f0 = 140.0 + i * 2;
  const buf = generateVocalFrame(f0, 0.005, 0.015, 28.0, 100 + i);
  const res = newAnalyzeAudioFrame(buf, SAMPLE_RATE);
  console.log(`Calm ${i+1} (${f0} Hz) -> Voiced: ${res.isVoiced} | Pitch: ${res.pitchHz} Hz | HNR: ${res.hnrDb} dB | Jitter: ${res.jitterPct}% | Shimmer: ${res.shimmerPct}%`);
}

console.log('\nTesting newAnalyzeAudioFrame on Strained 1..10:');
for (let i = 0; i < 10; i++) {
  const f0 = 240.0 + i * 5;
  const buf = generateVocalFrame(f0, 0.030, 0.080, 12.0, 200 + i);
  const res = newAnalyzeAudioFrame(buf, SAMPLE_RATE);
  console.log(`Strained ${i+1} (${f0} Hz) -> Voiced: ${res.isVoiced} | Pitch: ${res.pitchHz} Hz | HNR: ${res.hnrDb} dB | Jitter: ${res.jitterPct}% | Shimmer: ${res.shimmerPct}%`);
}
