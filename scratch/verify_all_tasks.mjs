import { analyzeAudioFrame, calculateJitter, calculateShimmer, computeVocalStrainIndex } from '../frontend/src/utils/acousticEngine.ts';

const SAMPLE_RATE = 48000;
const FRAME_SIZE = 2048;

function generateVocalFrame(f0, jitterFactor, shimmerFactor, snrDb, seed = 42) {
  // Simple deterministic pseudorandom generator
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

  // Calculate signal power
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

  // Normalize
  if (maxAbs > 0) {
    for (let i = 0; i < FRAME_SIZE; i++) buffer[i] = (buffer[i] / maxAbs) * 0.15;
  }
  return buffer;
}

console.log('================================================================');
console.log('TASK 2 VERIFICATION: JITTER & SHIMMER INDEPENDENCE FROM HNR');
console.log('================================================================');

// Generate 5 frames with identical physical cycle perturbation but varying noise (HNR)
const snrLevels = [32, 24, 18, 12, 6];
console.log('Testing identical glottal waveform across 5 degrading SNR levels:');
snrLevels.forEach((snr) => {
  const buf = generateVocalFrame(150.0, 0.005, 0.018, snr, 42);
  const res = analyzeAudioFrame(buf, SAMPLE_RATE);
  console.log(
    `  SNR ${snr.toString().padStart(2)} dB -> HNR: ${res.hnrDb.toFixed(1)} dB | ` +
    `Jitter: ${res.jitterPct !== undefined ? res.jitterPct.toFixed(2) + '%' : 'undefined'} | ` +
    `Shimmer: ${res.shimmerPct !== undefined ? res.shimmerPct.toFixed(2) + '%' : 'undefined'}`
  );
});

// Test frame with < 3 peaks (short buffer / high period or brief window)
console.log('\nTesting frame with < 3 glottal peaks (fewer than 3 cycle boundaries):');
const shortBuf = new Float32Array(FRAME_SIZE);
// only 2 pulses
for (let i = 0; i < 200; i++) shortBuf[500 + i] = Math.sin(i / 10) * 0.1;
for (let i = 0; i < 200; i++) shortBuf[1200 + i] = Math.sin(i / 10) * 0.1;
const shortRes = analyzeAudioFrame(shortBuf, SAMPLE_RATE);
console.log('  Result: jitterPct =', shortRes.jitterPct, '| shimmerPct =', shortRes.shimmerPct);

console.log('\nTesting calculateJitter & calculateShimmer with undefined/NaN values:');
const mixedSamples = [0.45, undefined, 0.52, NaN, 0.48];
console.log('  calculateJitter([0.45, undefined, 0.52, NaN, 0.48]):', calculateJitter(mixedSamples), '%');
console.log('  calculateShimmer([1.8, undefined, 2.1, NaN, 1.9]):', calculateShimmer([1.8, undefined, 2.1, NaN, 1.9]), '%');

console.log('\n================================================================');
console.log('TASK 3 VERIFICATION: CONTINUOUS GRADUATED STRAIN COMPONENT RANGE');
console.log('================================================================');

const profiles = [
  { name: 'Very Deep Calm Voice', f0: 105, jitter: 0.38, shimmer: 1.35, hnr: 32.0 },
  { name: 'User Test 2 (Clear Phonation)', f0: 178, jitter: 0.49, shimmer: 1.54, hnr: 30.9 },
  { name: 'User Test 1 (Baseline Phonation)', f0: 142, jitter: 0.65, shimmer: 2.14, hnr: 24.5 },
  { name: 'Border Normal / Tired Voice', f0: 160, jitter: 0.78, shimmer: 2.65, hnr: 22.0 },
  { name: 'Mild Vocal Fatigue / Dry Throat', f0: 195, jitter: 1.05, shimmer: 3.40, hnr: 18.0 },
  { name: 'High Exhaustion / Hoarseness', f0: 220, jitter: 1.45, shimmer: 4.50, hnr: 14.5 },
  { name: 'Acute Panic / High Distress', f0: 340, jitter: 1.95, shimmer: 5.80, hnr: 11.5 },
  { name: 'User Strained Test (from screenshot)', f0: 214, jitter: 6.95, shimmer: 11.38, hnr: 26.8 }
];

console.log('Profile Evaluation (Linear exponents = 1.0):');
profiles.forEach((p) => {
  const res = computeVocalStrainIndex(p.jitter, p.shimmer, p.hnr, p.f0);
  console.log(
    `  ${p.name.padEnd(36)} -> Pitch:${p.f0.toString().padStart(3)}Hz, J:${p.jitter.toFixed(2)}%, S:${p.shimmer.toFixed(2)}%, HNR:${p.hnr.toFixed(1)}dB => Score: ${res.score}% (${res.tier}) | Driver: ${res.primary_driver}`
  );
});

console.log('\n================================================================');
console.log('TASK 4 VERIFICATION: AUTOCORRELATION (r) DISTRIBUTION & CORRECTION');
console.log('================================================================');

console.log('10 Calm Speech Frames:');
const calmR = [];
for (let i = 0; i < 10; i++) {
  const trueF0 = 140.0 + i * 2;
  const buf = generateVocalFrame(trueF0, 0.005, 0.015, 28.0, 100 + i);
  const res = analyzeAudioFrame(buf, SAMPLE_RATE);
  // Compute raw r by inverse HNR mapping: rawHnr = (hnrDb - 3.0)/1.45; clampedR = 10^(rawHnr/10) / (1 + 10^(rawHnr/10))
  const rawHnr = (res.hnrDb - 3.0) / 1.45;
  const ratio = Math.pow(10, rawHnr / 10.0);
  const rEst = ratio / (1.0 + ratio);
  calmR.push(rEst);
  console.log(`  Calm Frame ${(i+1).toString().padStart(2)}: r = ${rEst.toFixed(4)} | detected F0 = ${res.pitchHz} Hz (true ${trueF0} Hz) | HNR = ${res.hnrDb} dB`);
}

console.log('\n10 Strained Speech Frames:');
const strainedR = [];
for (let i = 0; i < 10; i++) {
  const trueF0 = 240.0 + i * 5;
  const buf = generateVocalFrame(trueF0, 0.030, 0.080, 12.0, 200 + i);
  const res = analyzeAudioFrame(buf, SAMPLE_RATE);
  const rawHnr = (res.hnrDb - 3.0) / 1.45;
  const ratio = Math.pow(10, rawHnr / 10.0);
  const rEst = ratio / (1.0 + ratio);
  strainedR.push(rEst);
  console.log(`  Strained Frame ${(i+1).toString().padStart(2)}: r = ${rEst.toFixed(4)} | detected F0 = ${res.pitchHz} Hz (true ${trueF0} Hz) | HNR = ${res.hnrDb} dB`);
}

const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
console.log('\nAutocorrelation Distribution Summary:');
console.log(`  Calm Speech     : mean r = ${mean(calmR).toFixed(4)}, min r = ${Math.min(...calmR).toFixed(4)}, max r = ${Math.max(...calmR).toFixed(4)}`);
console.log(`  Strained Speech : mean r = ${mean(strainedR).toFixed(4)}, min r = ${Math.min(...strainedR).toFixed(4)}, max r = ${Math.max(...strainedR).toFixed(4)}`);
