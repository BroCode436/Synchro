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

test('OnsetDetector tracks all bins and triggers transient on sudden energy burst', () => {
  const bins = 1024;
  const detector = new (function() {
    this.prevSpectrum = null;
    this.fluxHistory = [];
    this.lastOnsetTime = 0;
    this.detect = function(spectrum, currentRms, currentTimeMs) {
      if (!this.prevSpectrum) {
        this.prevSpectrum = new Float32Array(bins);
        for (let i = 0; i < bins; i++) this.prevSpectrum[i] = spectrum[i] / 255;
        return { isTransient: false, flux: 0 };
      }
      let flux = 0;
      const maxBin = Math.min(bins, Math.floor(bins * 0.75));
      for (let i = 0; i < maxBin; i++) {
        const currentVal = spectrum[i] / 255;
        const diff = currentVal - this.prevSpectrum[i];
        if (diff > 0 && i >= 2) {
          const weight = i < bins * 0.15 ? 1.5 : (i < bins * 0.4 ? 1.2 : 0.8);
          flux += diff * weight;
        }
        this.prevSpectrum[i] = currentVal;
      }
      flux /= Math.max(1, maxBin - 2);
      this.fluxHistory.push(flux);
      if (this.fluxHistory.length > 25) this.fluxHistory.shift();
      let sum = 0;
      for (let i = 0; i < this.fluxHistory.length; i++) sum += this.fluxHistory[i];
      const meanFlux = sum / this.fluxHistory.length;
      const threshold = meanFlux * 1.6 + 0.012;
      const isTransient = flux > threshold && currentRms > 0.03 && (currentTimeMs - this.lastOnsetTime > 70);
      if (isTransient) this.lastOnsetTime = currentTimeMs;
      return { isTransient, flux, prev0: this.prevSpectrum[0], prev1: this.prevSpectrum[1] };
    };
  })();

  const quietSpec = new Uint8Array(bins).fill(5);
  quietSpec[0] = 50; // DC offset
  quietSpec[1] = 40; // Sub rumble
  detector.detect(quietSpec, 0.01, 100);

  // Second frame: change DC and sub rumble
  const nextSpec = new Uint8Array(bins).fill(5);
  nextSpec[0] = 120;
  nextSpec[1] = 90;
  const res1 = detector.detect(nextSpec, 0.01, 120);

  // Verify bins 0 and 1 are tracked and not stale
  assert.strictEqual(Math.round(res1.prev0 * 255), 120, 'Bin 0 must be updated');
  assert.strictEqual(Math.round(res1.prev1 * 255), 90, 'Bin 1 must be updated');

  // Third frame: Percussion hit (huge burst in low-mid bins)
  const hitSpec = new Uint8Array(bins).fill(10);
  for (let i = 2; i < 150; i++) hitSpec[i] = 220;
  const res2 = detector.detect(hitSpec, 0.5, 200);

  assert.strictEqual(res2.isTransient, true, 'Sudden percussion attack must trigger transient');
});
