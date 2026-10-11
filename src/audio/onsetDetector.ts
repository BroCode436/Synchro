// Spectral Flux & Energy Transient Onset Detector

export class OnsetDetector {
  private prevSpectrum: Float32Array | null = null;
  private fluxHistory: number[] = [];
  private historySize = 25;
  private lastOnsetTime = 0;
  private minIntervalMs = 70; // Refractory period to avoid multi-triggering
  private thresholdMultiplier = 1.6;

  public detect(
    spectrum: Uint8Array,
    currentRms: number,
    currentTimeMs: number
  ): { isTransient: boolean; strength: number; flux: number } {
    const bins = spectrum.length;

    if (!this.prevSpectrum || this.prevSpectrum.length !== bins) {
      this.prevSpectrum = new Float32Array(bins);
      for (let i = 0; i < bins; i++) {
        this.prevSpectrum[i] = spectrum[i] / 255;
      }
      return { isTransient: false, strength: 0, flux: 0 };
    }

    // 1. Calculate positive spectral flux (half-wave rectified difference)
    // Focus particularly on low-to-mid bands where drums/percussion attacks reside
    let flux = 0;
    const maxBin = Math.min(bins, Math.floor(bins * 0.75));

    for (let i = 0; i < maxBin; i++) {
      const currentVal = spectrum[i] / 255;
      const diff = currentVal - this.prevSpectrum[i];
      if (diff > 0 && i >= 2) {
        // Weight low-to-mid frequencies slightly higher for drum hits
        const weight = i < bins * 0.15 ? 1.5 : (i < bins * 0.4 ? 1.2 : 0.8);
        flux += diff * weight;
      }
      this.prevSpectrum[i] = currentVal;
    }

    flux /= Math.max(1, maxBin - 2);

    // 2. Maintain sliding window of flux values
    this.fluxHistory.push(flux);
    if (this.fluxHistory.length > this.historySize) {
      this.fluxHistory.shift();
    }

    // 3. Compute dynamic adaptive threshold
    let sum = 0;
    for (let i = 0; i < this.fluxHistory.length; i++) {
      sum += this.fluxHistory[i];
    }
    const meanFlux = sum / this.fluxHistory.length;
    const threshold = meanFlux * this.thresholdMultiplier + 0.012;

    // 4. Trigger detection with refractory lockout and minimum loudness check
    const timeSinceLast = currentTimeMs - this.lastOnsetTime;
    const isOverThreshold = flux > threshold && currentRms > 0.03;
    const isTransient = isOverThreshold && timeSinceLast > this.minIntervalMs;

    let strength = 0;
    if (isTransient) {
      this.lastOnsetTime = currentTimeMs;
      // Strength normalized relative to threshold
      strength = Math.min(1.0, Math.max(0.2, (flux - threshold) * 5 + currentRms));
    }

    return {
      isTransient,
      strength,
      flux
    };
  }

  public reset(): void {
    this.prevSpectrum = null;
    this.fluxHistory = [];
    this.lastOnsetTime = 0;
  }
}
