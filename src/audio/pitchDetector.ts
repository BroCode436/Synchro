// Autocorrelation-based pitch detector with parabolic interpolation and note mapping

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface PitchResult {
  frequency: number;
  note: string;
  cents: number;
  confidence: number;
}

// Reusable prefix energy buffer to avoid repeated O(N) tau energy loops
let prefixEnergyBuffer = new Float32Array(2049);

export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
  minFreq = 65,     // ~C2 (guitar/bass low range)
  maxFreq = 1200,   // ~D6 (guitar high range)
  clarityThreshold = 0.82
): PitchResult | null {
  const bufferSize = buffer.length;

  if (prefixEnergyBuffer.length <= bufferSize) {
    prefixEnergyBuffer = new Float32Array(bufferSize + 1);
  }

  // 1. Single-pass RMS and prefix sum of squares
  prefixEnergyBuffer[0] = 0;
  for (let i = 0; i < bufferSize; i++) {
    const val = buffer[i];
    prefixEnergyBuffer[i + 1] = prefixEnergyBuffer[i] + val * val;
  }

  const sumSq = prefixEnergyBuffer[bufferSize];
  const rms = Math.sqrt(sumSq / bufferSize);
  if (rms < 0.015) {
    return null; // Signal too quiet
  }

  // 2. Determine lag search range
  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.floor(sampleRate / minFreq);

  if (maxPeriod >= bufferSize) {
    return null;
  }

  // 3. Normalized square difference / autocorrelation
  let bestPeriod = -1;
  let maxCorr = -1;

  // Search window (capped at 640 samples with step 2 for fast correlation)
  const maxSearchLen = Math.min(640, bufferSize - maxPeriod);
  const totalEnergy = prefixEnergyBuffer[maxSearchLen];

  if (totalEnergy <= 0.0001) return null;

  for (let tau = minPeriod; tau <= maxPeriod; tau++) {
    let corr = 0;
    const len = Math.min(maxSearchLen, bufferSize - tau);

    for (let i = 0; i < len; i += 2) {
      corr += buffer[i] * buffer[i + tau];
    }

    // O(1) tau slice energy via prefix sums (replaces 320 multiplications per tau)
    const tauEnergy = prefixEnergyBuffer[tau + len] - prefixEnergyBuffer[tau];
    const norm = Math.sqrt(totalEnergy * tauEnergy);
    const normalizedCorr = norm > 0.0001 ? corr / norm : 0;

    if (normalizedCorr > maxCorr) {
      maxCorr = normalizedCorr;
      bestPeriod = tau;
    }
  }

  // Check if confidence exceeds threshold
  if (bestPeriod === -1 || maxCorr < clarityThreshold) {
    return null;
  }

  // 4. Parabolic interpolation around the peak for fractional period accuracy
  let refinedPeriod = bestPeriod;
  if (bestPeriod > minPeriod && bestPeriod < maxPeriod) {
    const y1 = calculateCorrAtTauFast(buffer, bestPeriod - 1, maxSearchLen);
    const y2 = maxCorr;
    const y3 = calculateCorrAtTauFast(buffer, bestPeriod + 1, maxSearchLen);

    const denom = 2 * (2 * y2 - y1 - y3);
    if (Math.abs(denom) > 1e-5) {
      const delta = (y3 - y1) / denom;
      refinedPeriod = bestPeriod + delta;
    }
  }

  const fundamentalFreq = sampleRate / refinedPeriod;

  // Validate frequency
  if (fundamentalFreq < minFreq || fundamentalFreq > maxFreq) {
    return null;
  }

  // 5. Convert to musical note name and cents offset
  const midiNote = 69 + 12 * Math.log2(fundamentalFreq / 440);
  const roundedMidi = Math.round(midiNote);
  const cents = Math.round((midiNote - roundedMidi) * 100);

  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  const noteName = `${NOTE_NAMES[noteIndex]}${octave}`;

  return {
    frequency: Math.round(fundamentalFreq * 10) / 10,
    note: noteName,
    cents,
    confidence: Math.min(1, Math.max(0, maxCorr))
  };
}

function calculateCorrAtTauFast(buffer: Float32Array, tau: number, maxSearchLen: number): number {
  let corr = 0;
  const len = Math.min(maxSearchLen, buffer.length - tau);
  for (let i = 0; i < len; i += 2) {
    corr += buffer[i] * buffer[i + tau];
  }
  const e1 = prefixEnergyBuffer[len];
  const e2 = prefixEnergyBuffer[tau + len] - prefixEnergyBuffer[tau];
  const norm = Math.sqrt(e1 * e2);
  return norm > 0.0001 ? corr / norm : 0;
}
