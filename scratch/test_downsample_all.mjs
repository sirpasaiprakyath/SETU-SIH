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

function downsample(buf, factor) {
  const out = new Float32Array(Math.floor(buf.length / factor));
  for (let i = 0; i < out.length; i++) {
    out[i] = buf[i * factor];
  }
  return out;
}

for (const factor of [2, 3, 4]) {
  console.log(`\n=================== TESTING FACTOR ${factor} (effective SR = ${SAMPLE_RATE / factor}) ===================`);
  const effSR = SAMPLE_RATE / factor;
  const bufLen = Math.floor(FRAME_SIZE / factor);
  const yin = Pitchfinder.YIN({ sampleRate: effSR, threshold: 0.25 });
  const mac = Pitchfinder.Macleod({ sampleRate: effSR, bufferSize: bufLen, cutoff: 0.75 });

  console.log('--- 10 Calm Frames ---');
  let calmAgreed = 0;
  for (let i = 0; i < 10; i++) {
    const f0 = 140.0 + i * 2;
    const buf = generateVocalFrame(f0, 0.005, 0.015, 28.0, 100 + i);
    const dBuf = downsample(buf, factor);
    const yVal = yin(dBuf);
    const mRes = mac(dBuf);
    const diff = yVal && mRes.freq > 0 ? Math.abs(yVal - mRes.freq) : 999;
    const pctDiff = yVal && mRes.freq > 0 ? (diff / f0) * 100 : 999;
    const agree = pctDiff <= 5.0;
    if (agree) calmAgreed++;
    console.log(`  Calm ${i+1} (${f0} Hz) -> YIN: ${yVal ? yVal.toFixed(1) : 'null'} | McLeod: ${mRes.freq > 0 ? mRes.freq.toFixed(1) : 'null'} | Diff: ${diff.toFixed(1)} Hz (${pctDiff.toFixed(1)}%) | Agree: ${agree}`);
  }

  console.log('--- 10 Strained Frames ---');
  let strainedAgreed = 0;
  for (let i = 0; i < 10; i++) {
    const f0 = 240.0 + i * 5;
    const buf = generateVocalFrame(f0, 0.030, 0.080, 12.0, 200 + i);
    const dBuf = downsample(buf, factor);
    const yVal = yin(dBuf);
    const mRes = mac(dBuf);
    const diff = yVal && mRes.freq > 0 ? Math.abs(yVal - mRes.freq) : 999;
    const pctDiff = yVal && mRes.freq > 0 ? (diff / f0) * 100 : 999;
    const agree = pctDiff <= 5.0;
    if (agree) strainedAgreed++;
    console.log(`  Strained ${i+1} (${f0} Hz) -> YIN: ${yVal ? yVal.toFixed(1) : 'null'} | McLeod: ${mRes.freq > 0 ? mRes.freq.toFixed(1) : 'null'} | Diff: ${diff.toFixed(1)} Hz (${pctDiff.toFixed(1)}%) | Agree: ${agree}`);
  }
  console.log(`Total agreed: Calm ${calmAgreed}/10, Strained ${strainedAgreed}/10`);
}
