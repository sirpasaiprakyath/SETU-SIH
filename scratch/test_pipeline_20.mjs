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

// Lowpass filter isolating human fundamental range (< 750 Hz)
function lowpass(buf, sampleRate, cutoffHz = 750) {
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

function detectPitchWithPitchfinder(buffer, sampleRate) {
  // 1. Condition speech signal: filter frequencies above human fundamental range
  const filtered = lowpass(buffer, sampleRate, 750);

  // 2. Downsample to ~16 kHz (factor 3 for 48k, factor 2 for 44.1k/32k, factor 1 for <=16k)
  const factor = sampleRate >= 44100 ? 3 : (sampleRate >= 22050 ? 2 : 1);
  const effSR = sampleRate / factor;
  const dLen = Math.floor(filtered.length / factor);
  const dBuf = new Float32Array(dLen);
  for (let i = 0; i < dLen; i++) dBuf[i] = filtered[i * factor];

  // 3. Primary detector: Pitchfinder.YIN
  const yinDetector = Pitchfinder.YIN({
    sampleRate: effSR,
    threshold: 0.30
  });

  // 4. Secondary cross-check detector: Pitchfinder.Macleod (McLeod Pitch Method)
  const mcleodDetector = Pitchfinder.Macleod({
    sampleRate: effSR,
    bufferSize: dLen,
    cutoff: 0.75
  });

  const yinPitch = yinDetector(dBuf);
  const mcleodRes = mcleodDetector(dBuf);
  const mcleodPitch = mcleodRes.freq > 0 ? mcleodRes.freq : null;

  // Validate within human vocal range [65, 650] Hz
  const yValid = yinPitch !== null && yinPitch >= 65 && yinPitch <= 650 ? yinPitch : null;
  const mValid = mcleodPitch !== null && mcleodPitch >= 65 && mcleodPitch <= 650 ? mcleodPitch : null;

  // Cross-check: agree within 5% or 5 Hz
  let finalPitch = 0;
  let isVoiced = false;

  if (yValid && mValid) {
    const diff = Math.abs(yValid - mValid);
    const avg = (yValid + mValid) / 2;
    if (diff <= Math.max(5.0, avg * 0.05)) {
      finalPitch = (yValid + mValid) / 2;
      isVoiced = true;
    }
  } else if (yValid && !mValid) {
    // If one detected and passed high probability
    // Prompt states: "Only accept a frame's detected pitch as valid if YIN and McLeod agree within a small tolerance (e.g. within 5%, or a few Hz at low frequencies); if they disagree meaningfully, mark that frame as unvoiced/low-confidence rather than arbitrarily picking one detector's result."
  }

  return { isVoiced, finalPitch, yinPitch: yValid, mcleodPitch: mValid, probability: mcleodRes.probability };
}

console.log('Testing 10 Calm Frames:');
for (let i = 0; i < 10; i++) {
  const f0 = 140.0 + i * 2;
  const buf = generateVocalFrame(f0, 0.005, 0.015, 28.0, 100 + i);
  const res = detectPitchWithPitchfinder(buf, SAMPLE_RATE);
  console.log(`Calm ${i+1} (${f0} Hz): Final=${res.finalPitch.toFixed(1)} Hz | YIN=${res.yinPitch?.toFixed(1)} | McLeod=${res.mcleodPitch?.toFixed(1)} | Voiced=${res.isVoiced}`);
}

console.log('\nTesting 10 Strained Frames:');
for (let i = 0; i < 10; i++) {
  const f0 = 240.0 + i * 5;
  const buf = generateVocalFrame(f0, 0.030, 0.080, 12.0, 200 + i);
  const res = detectPitchWithPitchfinder(buf, SAMPLE_RATE);
  console.log(`Strained ${i+1} (${f0} Hz): Final=${res.finalPitch.toFixed(1)} Hz | YIN=${res.yinPitch?.toFixed(1)} | McLeod=${res.mcleodPitch?.toFixed(1)} | Voiced=${res.isVoiced}`);
}
