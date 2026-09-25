import fs from 'fs';
import path from 'path';
import Pitchfinder from '../frontend/node_modules/pitchfinder/lib/index.js';

// Lowpass filter 720 Hz identical to acousticEngine.ts
function lowpassFilter720(buf, sampleRate) {
  const w = (2.0 * Math.PI * 720) / sampleRate;
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

let cachedEffSR = 0;
let cachedDLen = 0;
let cachedYin = null;
let cachedMacleod = null;

function getPitchDetectors(effSR, dLen) {
  if (cachedEffSR !== effSR || cachedDLen !== dLen || !cachedYin || !cachedMacleod) {
    cachedEffSR = effSR;
    cachedDLen = dLen;
    cachedYin = Pitchfinder.YIN({ sampleRate: effSR, threshold: 0.30 });
    const MacleodFunc = Pitchfinder.Macleod || Pitchfinder.McLeod;
    cachedMacleod = MacleodFunc({ sampleRate: effSR, bufferSize: dLen, cutoff: 0.75 });
  }
  return { yin: cachedYin, macleod: cachedMacleod };
}

export function analyzeAudioFrame(buffer, sampleRate) {
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

  if (rms < 0.002) {
    return { isVoiced: false, rms, pitchHz: 0, hnrDb: 0 };
  }

  const factor = sampleRate >= 44100 ? 3 : (sampleRate >= 22050 ? 2 : 1);
  const effSR = sampleRate / factor;
  const lp = lowpassFilter720(buffer, sampleRate);
  const dLen = Math.floor(lp.length / factor);

  const dBuf = new Float32Array(dLen);
  const yBuf = new Float32Array(dLen);
  for (let j = 0; j < dLen; j++) {
    const s = lp[j * factor];
    dBuf[j] = s;
    yBuf[j] = s + 0.012 * ((j % 4 === 0 || j % 4 === 1) ? 1 : -1);
  }

  const { yin, macleod } = getPitchDetectors(effSR, dLen);
  const rawYin = yin(yBuf);
  const rawMacleod = macleod(dBuf);

  const yinPitch = (rawYin !== null && rawYin >= 65 && rawYin <= 650) ? rawYin : null;
  const mcleodPitch = (rawMacleod.freq > 0 && rawMacleod.freq >= 65 && rawMacleod.freq <= 650) ? rawMacleod.freq : null;

  let validatedPitchHz = 0;
  let isPitchValid = false;

  if (yinPitch !== null && mcleodPitch !== null) {
    const diff = Math.abs(yinPitch - mcleodPitch);
    const avg = (yinPitch + mcleodPitch) / 2;
    const tol = Math.max(10.0, avg * 0.08);
    if (diff <= tol) {
      validatedPitchHz = yinPitch;
      isPitchValid = true;
    }
  }

  if (!isPitchValid || validatedPitchHz <= 0) {
    return { isVoiced: false, rms, pitchHz: 0, hnrDb: 0 };
  }

  const bestPeriod = Math.round(sampleRate / validatedPitchHz);

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

  if (bestCorrelation < 0.45) {
    return { isVoiced: false, rms, pitchHz: 0, hnrDb: 0 };
  }

  const pitchHz = Math.round(sampleRate / bestPeriod);
  const clampedR = Math.min(Math.max(bestCorrelation, 0.05), 0.995);
  const rawHnr = 10 * Math.log10(clampedR / (1 - clampedR));
  const hnrDb = Math.round((rawHnr * 1.45 + 3.0) * 10) / 10;

  let cycleJitter = null;
  let cycleShimmer = null;
  const P = bestPeriod;

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

export function calculateJitter(samples) {
  const valid = samples.filter((s) => typeof s === "number" && !isNaN(s) && s > 0);
  if (valid.length === 0) return 0.55;
  if (valid.length < 3) return Math.round(valid[0] * 100) / 100;
  const sorted = [...valid].sort((a, b) => a - b);
  const start = Math.floor(sorted.length * 0.15);
  const end = Math.ceil(sorted.length * 0.85);
  const trimmed = sorted.slice(start, Math.max(start + 1, end));
  const mean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  return Math.round(Math.min(Math.max(mean, 0.15), 12.0) * 100) / 100;
}

export function calculateShimmer(samples) {
  const valid = samples.filter((s) => typeof s === "number" && !isNaN(s) && s > 0);
  if (valid.length === 0) return 1.85;
  if (valid.length < 3) return Math.round(valid[0] * 100) / 100;
  const sorted = [...valid].sort((a, b) => a - b);
  const start = Math.floor(sorted.length * 0.15);
  const end = Math.ceil(sorted.length * 0.85);
  const trimmed = sorted.slice(start, Math.max(start + 1, end));
  const mean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  return Math.round(Math.min(Math.max(mean, 0.40), 25.0) * 100) / 100;
}

export function calculateMeanHNR(hnrSamples) {
  if (hnrSamples.length === 0) return 0.0;
  const sum = hnrSamples.reduce((acc, v) => acc + v, 0);
  return Math.round(Math.min(Math.max(sum / hnrSamples.length, 0.0), 35.0) * 10) / 10;
}

export function computeVocalStrainIndex(jitter, shimmer, hnr, pitchHz = 130, pitchStd = 18) {
  const jitterRatio = Math.max(0.15, jitter) / 0.85;
  const jitterComponent = Math.min(36.0, jitterRatio * 12.0);

  const shimmerRatio = Math.max(0.40, shimmer) / 2.80;
  const shimmerComponent = Math.min(28.0, shimmerRatio * 10.0);

  const clampedHnr = Math.min(Math.max(hnr, 2.0), 34.0);
  const hnrDeficitFromClean = Math.max(0, 32.0 - clampedHnr);
  const hnrComponent = (hnrDeficitFromClean / 11.0) * 8.5;

  let pitchComponent = 0;
  if (pitchHz <= 230) {
    pitchComponent = Math.max(0, (pitchHz - 100) / 130) * 2.0;
  } else if (pitchHz <= 280) {
    pitchComponent = 2.0 + ((pitchHz - 230) / 50) * 3.5;
  } else {
    pitchComponent = Math.min(26.0, 5.5 + Math.pow((pitchHz - 280) / 100, 1.15) * 16.0);
  }

  let monotonePenalty = 0;
  if (pitchStd < 7.0 && pitchHz > 70) {
    monotonePenalty = Math.min(7.0, ((7.0 - pitchStd) / 5.0) * 7.0);
  }

  const rawSum = jitterComponent + shimmerComponent + hnrComponent + pitchComponent + monotonePenalty;

  let escalation = 0.0;
  if (jitter > 1.8) escalation = Math.max(escalation, Math.min(16.0, ((jitter - 1.8) / 0.8) * 14.0));
  if (shimmer > 5.0) escalation = Math.max(escalation, Math.min(16.0, ((shimmer - 5.0) / 2.5) * 14.0));
  if (hnr < 14.0) escalation = Math.max(escalation, Math.min(18.0, ((14.0 - hnr) / 7.0) * 16.0));
  if (pitchHz > 380) escalation = Math.max(escalation, Math.min(20.0, ((pitchHz - 380) / 100) * 18.0));

  const score = Math.round(Math.min(100.0, Math.max(3.0, rawSum + escalation)));
  let tier = "Nominal Baseline";
  if (score >= 55) tier = "Elevated Strain";
  else if (score >= 33) tier = "Moderate Strain";

  return { score, tier };
}

// WAV Parser
export function parseWav(buffer) {
  const riff = buffer.toString('ascii', 0, 4);
  if (riff !== 'RIFF') throw new Error('Not a valid RIFF file');
  const wave = buffer.toString('ascii', 8, 12);
  if (wave !== 'WAVE') throw new Error('Not a valid WAVE file');

  let offset = 12;
  let audioFormat = 0;
  let numChannels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataOffset = 0;
  let dataSize = 0;

  while (offset < buffer.length - 8) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    offset += 8;

    if (chunkId === 'fmt ') {
      audioFormat = buffer.readUInt16LE(offset);
      numChannels = buffer.readUInt16LE(offset + 2);
      sampleRate = buffer.readUInt32LE(offset + 4);
      bitsPerSample = buffer.readUInt16LE(offset + 14);
      offset += chunkSize;
    } else if (chunkId === 'data') {
      dataOffset = offset;
      dataSize = chunkSize;
      break;
    } else {
      offset += chunkSize;
    }
  }

  if (dataOffset === 0) throw new Error('No data chunk found');

  const bytesPerSample = bitsPerSample / 8;
  const numSamples = Math.floor(dataSize / (bytesPerSample * numChannels));
  const monoSamples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    let sampleVal = 0;
    const base = dataOffset + i * bytesPerSample * numChannels;

    if (audioFormat === 1) { // PCM
      if (bitsPerSample === 16) {
        sampleVal = buffer.readInt16LE(base) / 32768.0;
      } else if (bitsPerSample === 8) {
        sampleVal = (buffer.readUInt8(base) - 128) / 128.0;
      }
    } else if (audioFormat === 3 && bitsPerSample === 32) { // IEEE Float
      sampleVal = buffer.readFloatLE(base);
    }
    monoSamples[i] = sampleVal;
  }

  return { sampleRate, samples: monoSamples, durationSec: numSamples / sampleRate };
}

export function processAudioFile(wavPath) {
  const buf = fs.readFileSync(wavPath);
  const { sampleRate, samples, durationSec } = parseWav(buf);

  const FRAME_SIZE = 2048;
  const HOP_SIZE = Math.round(sampleRate * 0.040); // 40ms hop
  const MIN_RUN_FRAMES = 8;
  const MAX_GAP_FRAMES = 3;

  const pitchSamples = [];
  const hnrSamples = [];
  const jitterSamples = [];
  const shimmerSamples = [];

  const voicedPitchRuns = [];
  const voicedJitterRuns = [];
  const voicedShimmerRuns = [];
  const voicedHnrRuns = [];

  let curPitchRun = [];
  let curJitterRun = [];
  let curShimmerRun = [];
  let curHnrRun = [];
  let silenceGap = 0;

  const sealRun = () => {
    if (curPitchRun.length >= MIN_RUN_FRAMES) {
      voicedPitchRuns.push([...curPitchRun]);
      voicedJitterRuns.push([...curJitterRun]);
      voicedShimmerRuns.push([...curShimmerRun]);
      voicedHnrRuns.push([...curHnrRun]);
    }
    curPitchRun = [];
    curJitterRun = [];
    curShimmerRun = [];
    curHnrRun = [];
    silenceGap = 0;
  };

  const frameBuf = new Float32Array(FRAME_SIZE);

  for (let offset = 0; offset + FRAME_SIZE <= samples.length; offset += HOP_SIZE) {
    for (let i = 0; i < FRAME_SIZE; i++) frameBuf[i] = samples[offset + i];
    const frame = analyzeAudioFrame(frameBuf, sampleRate);

    const isJitterEligible = frame.rms >= 0.008 && frame.isVoiced && frame.pitchHz >= 75 && frame.pitchHz <= 550 && frame.hnrDb >= 13.0;

    if (frame.isVoiced) {
      pitchSamples.push(frame.pitchHz);
      hnrSamples.push(frame.hnrDb);
      if (frame.jitterPct !== undefined) jitterSamples.push(frame.jitterPct);
      if (frame.shimmerPct !== undefined) shimmerSamples.push(frame.shimmerPct);

      if (isJitterEligible) {
        silenceGap = 0;
        curPitchRun.push(frame.pitchHz);
        curHnrRun.push(frame.hnrDb);
        if (frame.jitterPct !== undefined) curJitterRun.push(frame.jitterPct);
        if (frame.shimmerPct !== undefined) curShimmerRun.push(frame.shimmerPct);
      } else {
        silenceGap++;
        if (silenceGap > MAX_GAP_FRAMES) sealRun();
      }
    } else {
      silenceGap++;
      if (silenceGap > MAX_GAP_FRAMES) sealRun();
    }
  }
  sealRun();

  let jitter, shimmer, hnr;
  if (voicedPitchRuns.length === 0 || voicedJitterRuns.length === 0) {
    jitter = calculateJitter(jitterSamples);
    shimmer = calculateShimmer(shimmerSamples);
    hnr = calculateMeanHNR(hnrSamples);
  } else {
    let totJ = 0, wJ = 0;
    let totS = 0, wS = 0;
    let totH = 0, wH = 0;
    for (let r = 0; r < voicedPitchRuns.length; r++) {
      const len = voicedPitchRuns[r].length;
      if (voicedJitterRuns[r].length > 0) {
        wJ += calculateJitter(voicedJitterRuns[r]) * len;
        totJ += len;
      }
      if (voicedShimmerRuns[r].length > 0) {
        wS += calculateShimmer(voicedShimmerRuns[r]) * len;
        totS += len;
      }
      if (voicedHnrRuns[r].length > 0) {
        wH += calculateMeanHNR(voicedHnrRuns[r]) * len;
        totH += len;
      }
    }
    jitter = totJ > 0 ? Math.round((wJ / totJ) * 100) / 100 : calculateJitter(jitterSamples);
    shimmer = totS > 0 ? Math.round((wS / totS) * 100) / 100 : calculateShimmer(shimmerSamples);
    hnr = totH > 0 ? Math.round((wH / totH) * 10) / 10 : calculateMeanHNR(hnrSamples);
  }

  const meanPitch = pitchSamples.length > 0 ? Math.round((pitchSamples.reduce((a, b) => a + b, 0) / pitchSamples.length) * 10) / 10 : 0;
  const strain = computeVocalStrainIndex(jitter, shimmer, hnr, meanPitch);

  return {
    file: path.basename(wavPath),
    durationSec: Math.round(durationSec * 10) / 10,
    meanPitchHz: meanPitch,
    jitterPct: jitter,
    shimmerPct: shimmer,
    hnrDb: hnr,
    strainScore: strain.score,
    strainTier: strain.tier,
    runsCount: voicedPitchRuns.length
  };
}

// CLI driver
const args = process.argv.slice(2);
if (args.length > 0) {
  console.log(`Processing ${args.length} file(s)...`);
  for (const f of args) {
    if (fs.existsSync(f)) {
      const res = processAudioFile(f);
      console.log(`\n=== RESULTS FOR ${res.file} ===`);
      console.log(`Duration:       ${res.durationSec}s (${res.runsCount} voiced runs)`);
      console.log(`Mean Pitch F0:  ${res.meanPitchHz} Hz`);
      console.log(`Jitter (local): ${res.jitterPct} %`);
      console.log(`Shimmer (loc):  ${res.shimmerPct} %`);
      console.log(`Mean HNR:       ${res.hnrDb} dB`);
      console.log(`Strain Index:   ${res.strainScore} / 100 (${res.strainTier})`);
    } else {
      console.error(`File not found: ${f}`);
    }
  }
}
