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

// Inspect Strained Frame 6
const trueF0 = 265.0;
const buf = generateVocalFrame(trueF0, 0.030, 0.080, 12.0, 205); // i = 5 -> seed 205

// Compute correlations directly to see what peaks exist
const minPeriod = Math.floor(SAMPLE_RATE / 600); // 80
const maxPeriod = Math.floor(SAMPLE_RATE / 60);  // 800
const correlations = new Float32Array(maxPeriod + 1);

let sum = 0;
for (let i = 0; i < FRAME_SIZE; i++) sum += buf[i];
const mean = sum / FRAME_SIZE;

for (let period = minPeriod; period <= maxPeriod; period++) {
  let correlation = 0;
  let norm1 = 0;
  let norm2 = 0;
  for (let i = 0; i < FRAME_SIZE - period; i++) {
    const b1 = buf[i] - mean;
    const b2 = buf[i + period] - mean;
    correlation += b1 * b2;
    norm1 += b1 * b1;
    norm2 += b2 * b2;
  }
  correlations[period] = correlation / (Math.sqrt(norm1 * norm2) + 1e-9);
}

// Find all local peaks
console.log('Local peaks for Strained Frame 6 (True F0 = 265 Hz, True Period = ' + (SAMPLE_RATE / 265).toFixed(1) + '):');
const peaks = [];
for (let p = minPeriod + 1; p < maxPeriod; p++) {
  if (correlations[p] > correlations[p - 1] && correlations[p] >= correlations[p + 1] && correlations[p] > 0.40) {
    peaks.push({ period: p, f0: (SAMPLE_RATE / p).toFixed(1), r: correlations[p].toFixed(4) });
  }
}
console.table(peaks);
