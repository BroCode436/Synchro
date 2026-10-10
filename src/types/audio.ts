export interface AudioFrameData {
  rms: number;                   // 0 to 1 root-mean-square amplitude
  loudnessEnvelope: number;      // 0 to 1 smoothed loudness envelope
  subBass: number;               // 20-80 Hz energy (0 to 1)
  bass: number;                  // 80-250 Hz energy (0 to 1)
  lowMid: number;                // 250-800 Hz energy (0 to 1)
  mid: number;                   // 800-2500 Hz energy (0 to 1)
  highMid: number;               // 2500-6000 Hz energy (0 to 1)
  high: number;                  // 6000-16000 Hz energy (0 to 1)
  spectralCentroid: number;      // Center of mass of spectrum in Hz
  spectralFlux: number;          // Rate of spectral change
  isTransient: boolean;          // True on drum hit / transient onset
  transientStrength: number;     // 0 to 1 magnitude of hit
  estimatedPitch: number | null; // Frequency in Hz or null
  pitchNote: string | null;      // Note string (e.g. "E4", "A2") or null
  pitchConfidence: number;       // 0 to 1 confidence of pitch
  estimatedBpm: number | null;   // Estimated BPM or null
  bpmConfidence: number;         // 0 to 1 confidence
  timeDomain: Float32Array;      // Raw waveform buffer [-1.0 to 1.0]
  frequencyData: Uint8Array;     // FFT spectrum bins [0 to 255]
  sampleRate: number;
  bufferSize: number;
  analysisTimeMs: number;        // Measured DSP processing time per frame
}

export type AudioSourceType = 'demo' | 'mic' | 'file';

export interface AudioPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  fileName: string | null;
  sourceType: AudioSourceType;
  isMicActive: boolean;
  isDemoActive: boolean;
}

export interface DemoStemMutes {
  drums: boolean;
  bass: boolean;
  chords: boolean;
  melody: boolean;
}
