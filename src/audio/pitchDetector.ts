// Autocorrelation-based pitch detector with parabolic interpolation and note mapping

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface PitchResult {
  frequency: number;
  note: string;
  cents: number;
  confidence: number;
}

export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
  minFreq = 65,     // ~C2 (guitar/bass low range)
  maxFreq = 1200,   // ~D6 (guitar high range)
  clarityThreshold = 0.82
): PitchResult | null {
  const bufferSize = buffer.length;

  // 1. Calculate RMS to reject silence
  let sumSq = 0;
  for (let i = 0; i < bufferSize; i++) {
    sumSq += buffer[i] * buffer[i];
  }
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
  // Autocorrelation r(tau)
  let bestPeriod = -1;
  let maxCorr = -1;

  // Calculate energy for normalization
  let totalEnergy = 0;
  for (let i = 0; i < bufferSize - maxPeriod; i++) {
    totalEnergy += buffer[i] * buffer[i];
  }

  // Fast search window (capped at 512 samples with step 2 for ultra-fast correlation)
  const maxSearchLen = Math.min(640, bufferSize - maxPeriod);

  for (let tau = minPeriod; tau <= maxPeriod; tau++) {
    let corr = 0;
    let tauEnergy = 0;
    const len = Math.min(maxSearchLen, bufferSize - tau);

    for (let i = 0; i < len; i += 2) {
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

  // Check if confidence exceeds threshold
  if (bestPeriod === -1 || maxCorr < clarityThreshold) {
    return null;
  }

  // 4. Parabolic interpolation around the peak for fractional period accuracy
  let refinedPeriod = bestPeriod;
  if (bestPeriod > minPeriod && bestPeriod < maxPeriod) {
    const y1 = calculateCorrAtTau(buffer, bestPeriod - 1);
    const y2 = maxCorr;
    const y3 = calculateCorrAtTau(buffer, bestPeriod + 1);

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

function calculateCorrAtTau(buffer: Float32Array, tau: number): number {
  let corr = 0;
  let e1 = 0;
  let e2 = 0;
  const len = buffer.length - tau;
  for (let i = 0; i < len; i++) {
    corr += buffer[i] * buffer[i + tau];
    e1 += buffer[i] * buffer[i];
    e2 += buffer[i + tau] * buffer[i + tau];
  }
  const norm = Math.sqrt(e1 * e2);
  return norm > 0.0001 ? corr / norm : 0;
}
