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

const detectYIN = Pitchfinder.YIN({ sampleRate: SAMPLE_RATE });
const detectMacleod = Pitchfinder.Macleod({ sampleRate: SAMPLE_RATE, bufferSize: 2048 });

console.log('Testing 10 Calm Frames:');
for (let i = 0; i < 10; i++) {
  const trueF0 = 140.0 + i * 2;
  const buf = generateVocalFrame(trueF0, 0.005, 0.015, 28.0, 100 + i);
  const y = detectYIN(buf);
  const m = detectMacleod(buf);
  console.log(`Calm ${(i+1).toString().padStart(2)}: true ${trueF0} Hz -> YIN: ${y ? y.toFixed(1) : 'null'} | Macleod: ${m.freq > 0 ? m.freq.toFixed(1) : 'null'} (prob ${m.probability.toFixed(3)})`);
}

console.log('\nTesting 10 Strained Frames:');
for (let i = 0; i < 10; i++) {
  const trueF0 = 240.0 + i * 5;
  const buf = generateVocalFrame(trueF0, 0.030, 0.080, 12.0, 200 + i);
  const y = detectYIN(buf);
  const m = detectMacleod(buf);
  console.log(`Strained ${(i+1).toString().padStart(2)}: true ${trueF0} Hz -> YIN: ${y ? y.toFixed(1) : 'null'} | Macleod: ${m.freq > 0 ? m.freq.toFixed(1) : 'null'} (prob ${m.probability.toFixed(3)})`);
}
