// BPM / Tempo Estimator using Inter-Onset Interval (IOI) Clustering

export class BpmEstimator {
  private onsetTimes: number[] = [];
  private maxHistory = 30;
  private currentBpm: number | null = null;
  private confidence = 0;

  public registerOnset(timestampMs: number): void {
    this.onsetTimes.push(timestampMs);
    if (this.onsetTimes.length > this.maxHistory) {
      this.onsetTimes.shift();
    }

    if (this.onsetTimes.length >= 6) {
      this.calculateBpm();
    }
  }

  private calculateBpm(): void {
    const intervals: number[] = [];
    const len = this.onsetTimes.length;

    // Collect 1st order and 2nd order inter-onset intervals
    for (let i = 1; i < len; i++) {
      const diff1 = this.onsetTimes[i] - this.onsetTimes[i - 1];
      if (diff1 >= 250 && diff1 <= 1500) {
        intervals.push(diff1);
      }
      if (i >= 2) {
        const diff2 = (this.onsetTimes[i] - this.onsetTimes[i - 2]) / 2;
        if (diff2 >= 250 && diff2 <= 1500) {
          intervals.push(diff2);
        }
      }
    }

    if (intervals.length < 5) return;

    // Map intervals to candidate BPM bins [60 to 180 BPM in 2-BPM steps]
    const minBpm = 65;
    const maxBpm = 175;
    const binCount = Math.floor((maxBpm - minBpm) / 2) + 1;
    const bins = new Float32Array(binCount);

    for (const interval of intervals) {
      let candidateBpm = 60000 / interval;

      // Normalize into standard musical tempo range
      while (candidateBpm < minBpm) candidateBpm *= 2;
      while (candidateBpm > maxBpm) candidateBpm /= 2;

      const binIndex = Math.round((candidateBpm - minBpm) / 2);
      if (binIndex >= 0 && binIndex < binCount) {
        bins[binIndex] += 1;
        // Also spread slight gaussian weight to neighbors
        if (binIndex > 0) bins[binIndex - 1] += 0.4;
        if (binIndex < binCount - 1) bins[binIndex + 1] += 0.4;
      }
    }

    // Find peak bin
    let maxVotes = 0;
    let bestBin = -1;
    let totalVotes = 0;

    for (let i = 0; i < binCount; i++) {
      totalVotes += bins[i];
      if (bins[i] > maxVotes) {
        maxVotes = bins[i];
        bestBin = i;
      }
    }

    if (bestBin !== -1 && totalVotes > 0) {
      const estimated = minBpm + bestBin * 2;
      const conf = Math.min(1.0, maxVotes / (totalVotes * 0.4 + 1));

      if (conf > 0.35) {
        if (this.currentBpm === null) {
          this.currentBpm = estimated;
        } else {
          // Smooth tempo transitions
          this.currentBpm = Math.round(this.currentBpm * 0.8 + estimated * 0.2);
        }
        this.confidence = conf;
      }
    }
  }

  public getEstimate(): { bpm: number | null; confidence: number } {
    return {
      bpm: this.currentBpm,
      confidence: this.confidence
    };
  }

  public reset(): void {
    this.onsetTimes = [];
    this.currentBpm = null;
    this.confidence = 0;
  }
}
