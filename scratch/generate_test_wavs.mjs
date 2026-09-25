import fs from 'fs';

function generateWav(filename, f0, jitterFactor, shimmerFactor, snrDb, durationSec = 3.0, sampleRate = 48000) {
  let s = 12345;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const randn = () => {
    const u1 = Math.max(1e-9, rand());
    const u2 = rand();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  };

  const totalSamples = Math.floor(durationSec * sampleRate);
  const signal = new Float32Array(totalSamples);
  const periodSamples = sampleRate / f0;
  let pulsePos = 0;

  while (pulsePos < totalSamples) {
    const pJittered = periodSamples * (1.0 + randn() * jitterFactor);
    const ampJittered = Math.max(0.2, 1.0 + randn() * shimmerFactor);
    const idx = Math.floor(pulsePos);
    const rem = totalSamples - idx;
    if (rem > 0) {
      const decayLen = Math.min(rem, Math.floor(sampleRate * 0.025));
      for (let i = 0; i < decayLen; i++) {
        const tDecay = i / sampleRate;
        const formant1 = Math.exp(-tDecay * 400) * Math.sin(2 * Math.PI * 700 * tDecay);
        const formant2 = 0.5 * Math.exp(-tDecay * 550) * Math.sin(2 * Math.PI * 1220 * tDecay);
        const formant3 = 0.25 * Math.exp(-tDecay * 700) * Math.sin(2 * Math.PI * 2600 * tDecay);
        signal[idx + i] += ampJittered * (formant1 + formant2 + formant3);
      }
    }
    pulsePos += pJittered;
  }

  let sumSig = 0;
  for (let i = 0; i < totalSamples; i++) sumSig += signal[i] * signal[i];
  const sigPower = sumSig / totalSamples;
  const noisePower = sigPower / Math.pow(10, snrDb / 10.0);
  const noiseStd = Math.sqrt(noisePower);

  let maxAbs = 0;
  const finalSig = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    const n = randn() * noiseStd;
    finalSig[i] = signal[i] + n;
    if (Math.abs(finalSig[i]) > maxAbs) maxAbs = Math.abs(finalSig[i]);
  }

  // Normalize to 0.7 max amplitude
  const pcm16 = Buffer.alloc(totalSamples * 2);
  for (let i = 0; i < totalSamples; i++) {
    const val = (finalSig[i] / maxAbs) * 0.7;
    const s16 = Math.max(-32768, Math.min(32767, Math.floor(val * 32767)));
    pcm16.writeInt16LE(s16, i * 2);
  }

  // Build RIFF header
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm16.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // subchunk1 size
  header.writeUInt16LE(1, 20);  // PCM format
  header.writeUInt16LE(1, 22);  // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // byte rate
  header.writeUInt16LE(2, 32);  // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(pcm16.length, 40);

  const fullWav = Buffer.concat([header, pcm16]);
  fs.writeFileSync(filename, fullWav);
  console.log(`Generated ${filename}: ${durationSec}s at ${sampleRate}Hz (F0: ${f0}Hz)`);
}

generateWav('scratch/test_calm_150hz.wav', 150.0, 0.006, 0.015, 28.0, 3.0);
generateWav('scratch/test_strained_265hz.wav', 265.0, 0.045, 0.080, 10.0, 3.0);
