import { analyzeAudioFrame } from '../frontend/src/utils/acousticEngine.ts';

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

function testPitchDetection(buffer, sampleRate) {
  const minPeriod = Math.floor(sampleRate / 600); // 80
  const maxPeriod = Math.floor(sampleRate / 60);  // 800
  const correlations = new Float32Array(maxPeriod + 1);

  let sum = 0;
  for (let i = 0; i < FRAME_SIZE; i++) sum += buffer[i];
  const mean = sum / FRAME_SIZE;

  for (let period = minPeriod; period <= maxPeriod; period++) {
    let correlation = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < FRAME_SIZE - period; i++) {
      const b1 = buffer[i] - mean;
      const b2 = buffer[i + period] - mean;
      correlation += b1 * b2;
      norm1 += b1 * b1;
      norm2 += b2 * b2;
    }
    const norm = Math.sqrt(norm1 * norm2) + 1e-9;
    correlations[period] = correlation / norm;
  }

  const octaveCost = 0.06;
  let bestAdjusted = -1;
  let bestPeriod = -1;
  let bestRawCorrelation = -1;

  for (let period = minPeriod + 1; period < maxPeriod; period++) {
    const r = correlations[period];
    if (r > correlations[period - 1] && r >= correlations[period + 1] && r > 0.45) {
      const adjustedR = r - octaveCost * Math.log2(period / minPeriod);
      if (adjustedR > bestAdjusted) {
        bestAdjusted = adjustedR;
        bestPeriod = period;
        bestRawCorrelation = r;
      }
    }
  }

  if (bestPeriod < 0) {
    for (let period = minPeriod; period <= maxPeriod; period++) {
      if (correlations[period] > bestRawCorrelation) {
        bestRawCorrelation = correlations[period];
        bestPeriod = period;
      }
    }
  }

  // Explicit sub-multiple harmonic disambiguation:
  // For the candidate period, verify whether a candidate at 1/2, 1/3, or 1/4 of that period
  // exhibits comparable correlation (within 0.18 margin).
  // If so, prefer the shorter period as the true fundamental frequency F0.
  let confirmedPeriod = bestPeriod;
  let confirmedR = bestRawCorrelation;

  if (confirmedPeriod > 0) {
    const divisors = [4, 3, 2];
    for (const div of divisors) {
      const targetSubPeriod = Math.round(confirmedPeriod / div);
      if (targetSubPeriod < minPeriod) continue;

      const tolerance = Math.max(3, Math.round(targetSubPeriod * 0.10));
      let subPeakPeriod = -1;
      let subPeakR = -1;

      for (let p = Math.max(minPeriod + 1, targetSubPeriod - tolerance); p <= Math.min(maxPeriod - 1, targetSubPeriod + tolerance); p++) {
        const r = correlations[p];
        if (r > correlations[p - 1] && r >= correlations[p + 1] && r > 0.45) {
          if (r > subPeakR) {
            subPeakR = r;
            subPeakPeriod = p;
          }
        }
      }

      if (subPeakPeriod > 0 && subPeakR > 0.48) {
        // If sub-peak correlation is within 0.18 of candidate, or sub-peak itself is strong (>0.58),
        // the larger period was a subharmonic multiple.
        if (confirmedR - subPeakR < 0.18 || subPeakR >= 0.58) {
          confirmedPeriod = subPeakPeriod;
          confirmedR = subPeakR;
        }
      }
    }
  }

  const pitchHz = Math.round(sampleRate / confirmedPeriod);
  return { pitchHz, r: confirmedR, period: confirmedPeriod };
}

console.log('Testing 10 Calm Frames:');
for (let i = 0; i < 10; i++) {
  const trueF0 = 140.0 + i * 2;
  const buf = generateVocalFrame(trueF0, 0.005, 0.015, 28.0, 100 + i);
  const res = testPitchDetection(buf, SAMPLE_RATE);
  console.log(`  Calm Frame ${(i+1).toString().padStart(2)}: true ${trueF0} Hz -> detected ${res.pitchHz} Hz | r = ${res.r.toFixed(4)} | diff = ${Math.abs(res.pitchHz - trueF0).toFixed(1)} Hz`);
}

console.log('\nTesting 10 Strained Frames:');
for (let i = 0; i < 10; i++) {
  const trueF0 = 240.0 + i * 5;
  const buf = generateVocalFrame(trueF0, 0.030, 0.080, 12.0, 200 + i);
  const res = testPitchDetection(buf, SAMPLE_RATE);
  console.log(`  Strained Frame ${(i+1).toString().padStart(2)}: true ${trueF0} Hz -> detected ${res.pitchHz} Hz | r = ${res.r.toFixed(4)} | diff = ${Math.abs(res.pitchHz - trueF0).toFixed(1)} Hz`);
}
