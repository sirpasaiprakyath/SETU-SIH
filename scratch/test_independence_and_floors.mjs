import { analyzeAudioFrame, computeVocalStrainIndex } from '../frontend/src/utils/acousticEngine.ts';

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
    const ampJittered = Math.max(0.1, 1.0 + randn() * shimmerFactor);
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

console.log('================================================================');
console.log('TASK Q — TRUE INDEPENDENCE TEST FOR JITTER / SHIMMER / HNR');
console.log('================================================================');

console.log('\n(a) Varying ONLY Pitch Timing Jitter (Shimmer = 0.0, Constant Studio SNR = 36 dB):');
const jitterLevels = [0.000, 0.008, 0.018, 0.032, 0.055];
jitterLevels.forEach((jf) => {
  const buf = generateVocalFrame(160.0, jf, 0.000, 36.0, 50);
  const res = analyzeAudioFrame(buf, SAMPLE_RATE);
  console.log(
    `  Jitter Input: ${(jf * 100).toFixed(1).padStart(4)}% -> Measured Jitter: ${res.jitterPct !== undefined ? res.jitterPct.toFixed(2) + '%' : 'N/A'} | Shimmer: ${res.shimmerPct !== undefined ? res.shimmerPct.toFixed(2) + '%' : 'N/A'} | HNR: ${res.hnrDb.toFixed(1)} dB`
  );
});

console.log('\n(b) Varying ONLY Amplitude Shimmer (Jitter = 0.0, Constant Studio SNR = 36 dB):');
const shimmerLevels = [0.000, 0.020, 0.050, 0.100, 0.180];
shimmerLevels.forEach((sf) => {
  const buf = generateVocalFrame(160.0, 0.000, sf, 36.0, 50);
  const res = analyzeAudioFrame(buf, SAMPLE_RATE);
  console.log(
    `  Shimmer Input: ${(sf * 100).toFixed(1).padStart(4)}% -> Measured Shimmer: ${res.shimmerPct !== undefined ? res.shimmerPct.toFixed(2) + '%' : 'N/A'} | Jitter: ${res.jitterPct !== undefined ? res.jitterPct.toFixed(2) + '%' : 'N/A'} | HNR: ${res.hnrDb.toFixed(1)} dB`
  );
});

console.log('\n================================================================');
console.log('TASK P — RE-VALIDATION OF ESCALATION FLOORS AGAINST LINEAR FORMULA');
console.log('================================================================');

// Test 1: Jitter boundary around 2.2% with other metrics normal (shimmer=2.8%, hnr=21dB, pitch=130Hz)
console.log('\nEvaluating Jitter floor threshold (jitter >= 2.2% -> floor 58%):');
[2.0, 2.15, 2.19, 2.20, 2.30, 2.60].forEach((j) => {
  const res = computeVocalStrainIndex(j, 2.80, 21.0, 130);
  console.log(`  Jitter = ${j.toFixed(2)}% -> Score = ${res.score}% (${res.tier}) | Driver: ${res.primary_driver}`);
});

// Test 2: Shimmer boundary around 6.5% with other metrics normal (jitter=0.85%, hnr=21dB, pitch=130Hz)
console.log('\nEvaluating Shimmer floor threshold (shimmer >= 6.5% -> floor 60%):');
[5.8, 6.2, 6.49, 6.50, 6.8, 7.5].forEach((s) => {
  const res = computeVocalStrainIndex(0.85, s, 21.0, 130);
  console.log(`  Shimmer = ${s.toFixed(2)}% -> Score = ${res.score}% (${res.tier}) | Driver: ${res.primary_driver}`);
});

// Test 3: HNR boundary around 9.0 dB with other metrics normal (jitter=0.85%, shimmer=2.8%, pitch=130Hz)
console.log('\nEvaluating HNR floor threshold (hnr <= 9.0 dB -> floor 62%):');
[11.0, 9.5, 9.05, 9.00, 8.5, 7.0].forEach((h) => {
  const res = computeVocalStrainIndex(0.85, 2.80, h, 130);
  console.log(`  HNR = ${h.toFixed(2)} dB -> Score = ${res.score}% (${res.tier}) | Driver: ${res.primary_driver}`);
});
