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

// Low-pass filter (2nd order Butterworth low-pass filter at cutoff = 1.4 * F0)
function applyLowPass(input, sampleRate, cutoffHz) {
  const output = new Float32Array(input.length);
  const w = 2.0 * Math.PI * cutoffHz / sampleRate;
  const cosw = Math.cos(w);
  const alpha = Math.sin(w) / (2.0 * 0.707); // Q = 0.707 (Butterworth)

  const b0 = (1.0 - cosw) / 2.0;
  const b1 = 1.0 - cosw;
  const b2 = (1.0 - cosw) / 2.0;
  const a0 = 1.0 + alpha;
  const a1 = -2.0 * cosw;
  const a2 = 1.0 - alpha;

  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x0 = input[i];
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;
    output[i] = y0;
  }
  return output;
}

// Peak picker on filtered buffer
function filteredPeakPicker(rawBuffer, filteredBuffer, P, rms) {
  const peaks = [];
  const amps = [];
  let searchStart = 0;
  const SIZE = filteredBuffer.length;

  // Find first peak in [0, P]
  let maxVal = -1e9;
  let firstPeak = -1;
  for (let i = 0; i < Math.min(SIZE, P * 1.2); i++) {
    if (filteredBuffer[i] > maxVal) {
      maxVal = filteredBuffer[i];
      firstPeak = i;
    }
  }

  if (firstPeak < 0) return { jitter: 0, shimmer: 0 };
  peaks.push(firstPeak);
  amps.push(rawBuffer[firstPeak]); // True amplitude from raw buffer at peak instant

  // Subsequent peaks: search around expected pulse location (lastPeak + P) ± 25%
  let cur = firstPeak;
  const halfWindow = Math.round(P * 0.25);

  while (cur + P - halfWindow < SIZE) {
    const center = cur + P;
    const start = Math.max(0, center - halfWindow);
    const end = Math.min(SIZE, center + halfWindow + 1);

    let localMax = -1e9;
    let localIdx = -1;
    for (let i = start; i < end; i++) {
      if (filteredBuffer[i] > localMax) {
        localMax = filteredBuffer[i];
        localIdx = i;
      }
    }

    if (localIdx >= 0) {
      peaks.push(localIdx);
      amps.push(Math.abs(rawBuffer[localIdx]));
      cur = localIdx;
    } else {
      cur += P;
    }
  }

  if (peaks.length < 3) return { jitter: 0, shimmer: 0, peaks };
  const periods = [];
  const cycleAmps = [];
  for (let i = 0; i < peaks.length - 1; i++) {
    periods.push(peaks[i + 1] - peaks[i]);
    let cycleEnergy = 0;
    const len = peaks[i + 1] - peaks[i];
    for (let s = peaks[i]; s < peaks[i + 1]; s++) {
      cycleEnergy += rawBuffer[s] * rawBuffer[s];
    }
    cycleAmps.push(Math.sqrt(cycleEnergy / len));
  }
  const meanP = periods.reduce((a, b) => a + b, 0) / periods.length;
  let sumPeriodDiff = 0;
  for (let i = 0; i < periods.length - 1; i++) sumPeriodDiff += Math.abs(periods[i + 1] - periods[i]);
  const cycleJitter = ((sumPeriodDiff / (periods.length - 1)) / meanP) * 100;

  const meanAmp = cycleAmps.reduce((a, b) => a + b, 0) / cycleAmps.length;
  let sumAmpDiff = 0;
  for (let i = 0; i < cycleAmps.length - 1; i++) sumAmpDiff += Math.abs(cycleAmps[i + 1] - cycleAmps[i]);
  const cycleShimmer = ((sumAmpDiff / (cycleAmps.length - 1)) / meanAmp) * 100;

  return { jitter: cycleJitter, shimmer: cycleShimmer, periods, peaks, cycleAmps };
}

const f0 = 254.0;
const P = Math.round(SAMPLE_RATE / f0); // 189
const buf = generateVocalFrame(f0, 0.005, 0.020, 10.1, 777);
const filtered = applyLowPass(buf, SAMPLE_RATE, Math.min(900, f0 * 1.5));

let sumSq = 0;
for (let i = 0; i < FRAME_SIZE; i++) sumSq += buf[i] * buf[i];
const rms = Math.sqrt(sumSq / FRAME_SIZE);

const resFiltered = filteredPeakPicker(buf, filtered, P, rms);
console.log('--- METHOD 2: Formant-Attenuated Peak Tracking on Same Audio ---');
console.log('Detected Peaks:', resFiltered.peaks);
console.log('Peak Periods:', resFiltered.periods);
console.log('Measured Jitter  :', resFiltered.jitter.toFixed(2) + '%');
console.log('Measured Shimmer :', resFiltered.shimmer.toFixed(2) + '%');
