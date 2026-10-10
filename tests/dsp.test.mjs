import test from 'node:test';
import assert from 'node:assert/strict';

// Test Pitch Detection Math
function detectPitchSynthetic(buffer, sampleRate, minFreq = 65, maxFreq = 1200) {
  const bufferSize = buffer.length;
  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.floor(sampleRate / minFreq);

  let totalEnergy = 0;
  for (let i = 0; i < bufferSize - maxPeriod; i++) {
    totalEnergy += buffer[i] * buffer[i];
  }
  if (totalEnergy === 0) return null;

  let bestPeriod = -1;
  let maxCorr = -1;

  for (let tau = minPeriod; tau <= maxPeriod; tau++) {
    let corr = 0;
    let tauEnergy = 0;
    const len = bufferSize - tau;
    for (let i = 0; i < len; i++) {
      corr += buffer[i] * buffer[i + tau];
      tauEnergy += buffer[i + tau] * buffer[i + tau];
    }
    const norm = Math.sqrt(totalEnergy * tauEnergy);
    const normalizedCorr = norm > 0.0001 ? corr / norm : 0;
    if (normalizedCorr > maxCorr) {
      maxCorr = normalizedCorr;
      bestPeriod = tau;
    }
  }

  if (bestPeriod === -1 || maxCorr < 0.8) return null;
  return sampleRate / bestPeriod;
}

test('detectPitch accurately detects a 440 Hz (A4) sine wave', () => {
  const sampleRate = 44100;
  const targetFreq = 440;
  const buffer = new Float32Array(2048);
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.sin((2 * Math.PI * targetFreq * i) / sampleRate);
  }

  const detected = detectPitchSynthetic(buffer, sampleRate);
  assert.ok(detected !== null, 'Pitch should be detected');
  assert.ok(Math.abs(detected - targetFreq) < 5, `Detected ${detected} Hz should be close to 440 Hz`);
});

test('detectPitch rejects silent buffer', () => {
  const sampleRate = 44100;
  const buffer = new Float32Array(2048); // All zeros
  const detected = detectPitchSynthetic(buffer, sampleRate);
  assert.strictEqual(detected, null, 'Silent buffer should return null');
});

test('BPM interval math correctly clusters 120 BPM pulses', () => {
  const bpm = 120;
  const intervalMs = (60 / bpm) * 1000; // 500ms
  const intervals = [502, 498, 500, 501, 499];

  let sum = 0;
  for (const val of intervals) sum += val;
  const avgInterval = sum / intervals.length;
  const calculatedBpm = Math.round(60000 / avgInterval);

  assert.strictEqual(calculatedBpm, 120, 'Should match 120 BPM');
});
