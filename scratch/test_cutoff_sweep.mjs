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

function lowpass(buf, sampleRate, cutoffHz = 950) {
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

for (const cutoff of [900, 1000, 1100, 1200]) {
  console.log(`\n=================== TESTING CUTOFF ${cutoff} Hz ===================`);
  let calmOk = 0;
  let strainedOk = 0;

  const factor = 3;
  const effSR = SAMPLE_RATE / factor;
  const yin = Pitchfinder.YIN({ sampleRate: effSR, threshold: 0.35 });
  const mac = Pitchfinder.Macleod({ sampleRate: effSR, bufferSize: Math.floor(FRAME_SIZE / factor), cutoff: 0.75 });

  for (let i = 0; i < 10; i++) {
    const f0 = 140.0 + i * 2;
    const buf = generateVocalFrame(f0, 0.005, 0.015, 28.0, 100 + i);
    const lp = lowpass(buf, SAMPLE_RATE, cutoff);
    const dLen = Math.floor(lp.length / factor);
    const yBuf = new Float32Array(dLen);
    const mBuf = new Float32Array(dLen);
    for (let j = 0; j < dLen; j++) {
      const s = lp[j * factor];
      mBuf[j] = s;
      yBuf[j] = s + 0.015 * ((j % 4 === 0 || j % 4 === 1) ? 1 : -1);
    }
    const y = yin(yBuf);
    const m = mac(mBuf);
    const yVal = (y && y >= 65 && y <= 650) ? y : null;
    const mVal = (m.freq > 0 && m.freq >= 65 && m.freq <= 650) ? m.freq : null;
    if (yVal && mVal && Math.abs(yVal - mVal) <= Math.max(8, ((yVal+mVal)/2)*0.08)) {
      calmOk++;
    }
  }

  for (let i = 0; i < 10; i++) {
    const f0 = 240.0 + i * 5;
    const buf = generateVocalFrame(f0, 0.030, 0.080, 12.0, 200 + i);
    const lp = lowpass(buf, SAMPLE_RATE, cutoff);
    const dLen = Math.floor(lp.length / factor);
    const yBuf = new Float32Array(dLen);
    const mBuf = new Float32Array(dLen);
    for (let j = 0; j < dLen; j++) {
      const s = lp[j * factor];
      mBuf[j] = s;
      yBuf[j] = s + 0.015 * ((j % 4 === 0 || j % 4 === 1) ? 1 : -1);
    }
    const y = yin(yBuf);
    const m = mac(mBuf);
    const yVal = (y && y >= 65 && y <= 650) ? y : null;
    const mVal = (m.freq > 0 && m.freq >= 65 && m.freq <= 650) ? m.freq : null;
    if (yVal && mVal && Math.abs(yVal - mVal) <= Math.max(12, ((yVal+mVal)/2)*0.10)) {
      strainedOk++;
    }
  }

  console.log(`Calm agreed: ${calmOk}/10, Strained agreed: ${strainedOk}/10`);
}
