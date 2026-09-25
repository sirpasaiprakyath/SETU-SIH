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
        // Vocal tract resonances (Formants F1=700Hz, F2=1220Hz, F3=2600Hz)
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

// User's voice parameters from screenshot:
// Pitch: 254 Hz, SNR: 10.1 dB
const f0 = 254.0;
const P = Math.round(SAMPLE_RATE / f0); // 189
// A real calm voice has physical jitter ~0.005 (0.5%) and shimmer ~0.02 (2.0%)
const buf = generateVocalFrame(f0, 0.005, 0.020, 10.1, 777);

// METHOD 1: Current naive peak picker
function currentPeakPicker(buffer, P, rms) {
  const peaks = [];
  const amps = [];
  let searchStart = 0;
  const SIZE = buffer.length;

  while (searchStart + P <= SIZE) {
    let maxVal = -1e9;
    let maxIdx = -1;
    const searchEnd = Math.min(SIZE, searchStart + P);
    for (let i = searchStart; i < searchEnd; i++) {
      if (buffer[i] > maxVal) {
        maxVal = buffer[i];
        maxIdx = i;
      }
    }
    if (maxIdx >= 0 && maxVal > rms * 0.4) {
      peaks.push(maxIdx);
      amps.push(maxVal);
      searchStart = maxIdx + Math.floor(P * 0.7);
    } else {
      searchStart += P;
    }
  }

  if (peaks.length < 3) return { jitter: 0, shimmer: 0, peaks };
  const periods = [];
  for (let i = 0; i < peaks.length - 1; i++) periods.push(peaks[i + 1] - peaks[i]);
  const meanP = periods.reduce((a, b) => a + b, 0) / periods.length;
  let sumPeriodDiff = 0;
  for (let i = 0; i < periods.length - 1; i++) sumPeriodDiff += Math.abs(periods[i + 1] - periods[i]);
  const cycleJitter = ((sumPeriodDiff / (periods.length - 1)) / meanP) * 100;

  const meanAmp = amps.reduce((a, b) => a + b, 0) / amps.length;
  let sumAmpDiff = 0;
  for (let i = 0; i < amps.length - 1; i++) sumAmpDiff += Math.abs(amps[i + 1] - amps[i]);
  const cycleShimmer = ((sumAmpDiff / (amps.length - 1)) / meanAmp) * 100;

  return { jitter: cycleJitter, shimmer: cycleShimmer, periods, peaks, amps };
}

// Calculate rms
let sumSq = 0;
for (let i = 0; i < FRAME_SIZE; i++) sumSq += buf[i] * buf[i];
const rms = Math.sqrt(sumSq / FRAME_SIZE);

const resCurrent = currentPeakPicker(buf, P, rms);
console.log('--- METHOD 1: Current Naive Peak Picker on Real Speech Frame (True Jitter = 0.5%, True Shimmer = 2.0%) ---');
console.log('Detected Peaks:', resCurrent.peaks);
console.log('Peak Periods:', resCurrent.periods);
console.log('Measured Jitter  :', resCurrent.jitter.toFixed(2) + '%');
console.log('Measured Shimmer :', resCurrent.shimmer.toFixed(2) + '%');
