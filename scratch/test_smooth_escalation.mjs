function testSmoothFormula(jitter, shimmer, hnr, pitchHz = 130, pitchStd = 18) {
  const refJitterNorm = 0.85;
  const jitterComponent = (Math.max(0.15, jitter) / refJitterNorm) * 12.0;

  const refShimmerNorm = 2.80;
  const shimmerComponent = (Math.max(0.40, shimmer) / refShimmerNorm) * 10.0;

  const clampedHnr = Math.min(Math.max(hnr, 2.0), 34.0);
  const hnrDeficitFromClean = Math.max(0, 32.0 - clampedHnr);
  const hnrComponent = (hnrDeficitFromClean / 11.0) * 8.5;

  let pitchComponent = Math.max(0, (pitchHz - 100) / 130) * 2.0;

  const rawSum = jitterComponent + shimmerComponent + hnrComponent + pitchComponent;

  // Continuous non-compensatory escalation (zero step discontinuities)
  let escalation = 0.0;
  if (jitter > 1.8) {
    escalation = Math.max(escalation, Math.min(16.0, ((jitter - 1.8) / 0.8) * 14.0));
  }
  if (shimmer > 5.0) {
    escalation = Math.max(escalation, Math.min(16.0, ((shimmer - 5.0) / 2.5) * 14.0));
  }
  if (hnr < 14.0) {
    escalation = Math.max(escalation, Math.min(18.0, ((14.0 - hnr) / 7.0) * 16.0));
  }

  const finalScore = Math.round(Math.min(100.0, Math.max(3.0, rawSum + escalation)));
  const tier = finalScore >= 55 ? "Elevated Strain" : finalScore >= 33 ? "Moderate Strain" : "Nominal Baseline";
  return { score: finalScore, tier };
}

console.log('Testing Continuous Escalation for Jitter (1.6% to 2.8%):');
[1.6, 1.8, 1.9, 2.0, 2.1, 2.2, 2.4, 2.6, 2.8].forEach(j => {
  const res = testSmoothFormula(j, 2.8, 21.0);
  console.log(`  Jitter = ${j.toFixed(2)}% -> Score = ${res.score}% (${res.tier})`);
});

console.log('\nTesting Continuous Escalation for Shimmer (4.5% to 8.0%):');
[4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0].forEach(s => {
  const res = testSmoothFormula(0.85, s, 21.0);
  console.log(`  Shimmer = ${s.toFixed(2)}% -> Score = ${res.score}% (${res.tier})`);
});

console.log('\nTesting Continuous Escalation for HNR (16 dB down to 6 dB):');
[16.0, 14.0, 12.0, 10.0, 9.0, 8.0, 7.0, 6.0].forEach(h => {
  const res = testSmoothFormula(0.85, 2.8, h);
  console.log(`  HNR = ${h.toFixed(1)} dB -> Score = ${res.score}% (${res.tier})`);
});
