// Master Audio Engine for Synchro
// Orchestrates AudioContext, Sources (Mic, File, Demo Synth), and DSP Analysis

import { AudioFrameData, AudioPlaybackState, AudioSourceType, DemoStemMutes } from '../types/audio';
import { detectPitch } from './pitchDetector';
import { OnsetDetector } from './onsetDetector';
import { BpmEstimator } from './bpmDetector';
import { DemoSynthEngine } from './synthEngine';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;

  // Sources
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private fileSourceNode: MediaElementAudioSourceNode | null = null;
  private currentObjectUrl: string | null = null;
  private audioListeners: {
    timeupdate?: () => void;
    loadedmetadata?: () => void;
    ended?: () => void;
  } = {};
  private demoSynth: DemoSynthEngine | null = null;

  // Analysis modules
  private onsetDetector = new OnsetDetector();
  private bpmEstimator = new BpmEstimator();

  // Buffers
  private timeDomainBuffer: Float32Array = new Float32Array(2048);
  private frequencyBuffer: Uint8Array = new Uint8Array(1024);

  // Envelope state
  private currentLoudnessEnvelope = 0;
  private lastAnalysisTime = 0;
  private pitchFrameCount = 0;
  private cachedPitchResult: ReturnType<typeof detectPitch> = null;

  // Cached DSP bins to avoid recalculations on every frame
  private cachedSampleRate = 0;
  private binHz = 0;
  private subBassRange: [number, number, number] = [0, 0, 0];
  private bassRange: [number, number, number] = [0, 0, 0];
  private lowMidRange: [number, number, number] = [0, 0, 0];
  private midRange: [number, number, number] = [0, 0, 0];
  private highMidRange: [number, number, number] = [0, 0, 0];
  private highRange: [number, number, number] = [0, 0, 0];

  // Reusable audio frame data instance to eliminate garbage collection overhead during 60 FPS analysis
  private reusableFrameData: AudioFrameData = {
    rms: 0,
    loudnessEnvelope: 0,
    subBass: 0,
    bass: 0,
    lowMid: 0,
    mid: 0,
    highMid: 0,
    high: 0,
    spectralCentroid: 0,
    spectralFlux: 0,
    isTransient: false,
    transientStrength: 0,
    estimatedPitch: null,
    pitchNote: null,
    pitchConfidence: 0,
    estimatedBpm: 120,
    bpmConfidence: 0,
    timeDomain: this.timeDomainBuffer,
    frequencyData: this.frequencyBuffer,
    sampleRate: 44100,
    bufferSize: 2048,
    analysisTimeMs: 0.1
  };

  // State
  private currentSource: AudioSourceType = 'mic';
  private playbackState: AudioPlaybackState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    fileName: null,
    sourceType: 'mic',
    isMicActive: false,
    isDemoActive: false
  };

  private stateChangeListeners: ((state: AudioPlaybackState) => void)[] = [];
  private frameListeners: ((data: AudioFrameData) => void)[] = [];
  private timeListeners: ((time: number, duration: number) => void)[] = [];

  constructor() {
    // AudioContext will be initialized on user interaction or first start
  }

  public async initContext(): Promise<AudioContext> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.75;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      this.masterGain.connect(this.analyser);
      this.masterGain.connect(this.ctx.destination);

      this.timeDomainBuffer = new Float32Array(this.analyser.fftSize);
      this.frequencyBuffer = new Uint8Array(this.analyser.frequencyBinCount);
      this.updateBandBins(this.ctx.sampleRate);

      // Create demo synth connected to masterGain
      const synthBus = this.ctx.createGain();
      synthBus.connect(this.masterGain);
      this.demoSynth = new DemoSynthEngine(this.ctx, synthBus);
      this.demoSynth.setOnStepCallback((step: number) => {
        if (this.currentSource === 'demo' && this.playbackState.isDemoActive) {
          const currentTime = (step / 64) * 8.0;
          this.playbackState.currentTime = currentTime;
          this.playbackState.duration = 8.0;
          this.notifyTime(currentTime, 8.0);
        }
      });
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    return this.ctx;
  }

  // --- Source Switching ---

  public async startDemo(): Promise<void> {
    await this.initContext();
    this.stopMicrophone();
    this.stopAudioFile();

    this.currentSource = 'demo';
    if (this.demoSynth) {
      this.demoSynth.start();
    }

    this.playbackState = {
      ...this.playbackState,
      isPlaying: true,
      currentTime: 0,
      duration: 8.0,
      sourceType: 'demo',
      isMicActive: false,
      isDemoActive: true
    };
    this.notifyState();
  }

  public stopDemo(): void {
    if (this.demoSynth) {
      this.demoSynth.stop();
    }
    this.playbackState.isDemoActive = false;
    this.playbackState.isPlaying = false;
    this.notifyState();
  }

  public setDemoStemMutes(mutes: DemoStemMutes): void {
    if (this.demoSynth) {
      this.demoSynth.setStemMutes(mutes);
    }
  }

  public async startMicrophone(): Promise<void> {
    await this.initContext();
    this.stopDemo();
    this.stopAudioFile();

    if (!this.ctx || !this.analyser) return;

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false
        }
      });

      this.micSource = this.ctx.createMediaStreamSource(this.micStream);
      // Connect to analyser ONLY (do NOT connect to ctx.destination to avoid acoustic feedback)
      this.micSource.connect(this.analyser);

      this.currentSource = 'mic';
      this.playbackState = {
        ...this.playbackState,
        isPlaying: true,
        sourceType: 'mic',
        isMicActive: true,
        isDemoActive: false,
        fileName: null
      };
      this.notifyState();
    } catch (err) {
      console.error('Microphone access error:', err);
      throw err;
    }
  }

  public stopMicrophone(): void {
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    this.playbackState.isMicActive = false;
    if (this.currentSource === 'mic') {
      this.playbackState.isPlaying = false;
    }
    this.notifyState();
  }

  public async loadAudioFile(file: File): Promise<void> {
    await this.initContext();
    this.stopDemo();
    this.stopMicrophone();
    this.stopAudioFile();

    if (!this.ctx || !this.masterGain) return;

    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }

    this.currentObjectUrl = URL.createObjectURL(file);
    const audio = new Audio(this.currentObjectUrl);
    audio.crossOrigin = 'anonymous';
    audio.loop = true;

    const onTimeUpdate = () => {
      this.playbackState.currentTime = audio.currentTime;
      this.notifyTime(audio.currentTime, audio.duration || 0);
    };
    const onLoadedMetadata = () => {
      this.playbackState.duration = audio.duration;
      this.notifyState();
    };
    const onEnded = () => {
      this.playbackState.isPlaying = false;
      this.notifyState();
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    this.audioListeners = {
      timeupdate: onTimeUpdate,
      loadedmetadata: onLoadedMetadata,
      ended: onEnded
    };

    this.fileSourceNode = this.ctx.createMediaElementSource(audio);
    // Connect to masterGain only (masterGain routes to analyser and destination)
    this.fileSourceNode.connect(this.masterGain);

    this.audioElement = audio;
    this.currentSource = 'file';

    this.playbackState = {
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      fileName: file.name,
      sourceType: 'file',
      isMicActive: false,
      isDemoActive: false
    };

    await audio.play();
    this.playbackState.isPlaying = true;
    this.notifyState();
  }

  public togglePlayPause(): void {
    if (this.currentSource === 'demo') {
      if (this.playbackState.isDemoActive) {
        this.stopDemo();
      } else {
        this.startDemo();
      }
    } else if (this.currentSource === 'file' && this.audioElement) {
      if (this.audioElement.paused) {
        this.audioElement.play();
        this.playbackState.isPlaying = true;
      } else {
        this.audioElement.pause();
        this.playbackState.isPlaying = false;
      }
      this.notifyState();
    } else if (this.currentSource === 'mic') {
      if (this.playbackState.isMicActive) {
        this.stopMicrophone();
      } else {
        this.startMicrophone();
      }
    }
  }

  public resetPlayback(): void {
    if (this.currentSource === 'file' && this.audioElement) {
      this.audioElement.currentTime = 0;
      this.playbackState.currentTime = 0;
      this.notifyState();
    } else if (this.currentSource === 'demo' && this.demoSynth) {
      this.demoSynth.reset();
      this.playbackState.currentTime = 0;
      this.notifyState();
    }
    this.onsetDetector.reset();
    this.bpmEstimator.reset();
  }

  /**
   * Seek playback to an exact timestamp in seconds.
   * Works for both uploaded audio files and the procedural demo synth.
   */
  public seek(timeSeconds: number): void {
    if (this.currentSource === 'file' && this.audioElement) {
      const maxDuration = this.playbackState.duration > 0 ? this.playbackState.duration : Infinity;
      const clamped = Math.max(0, Math.min(timeSeconds, maxDuration));
      this.audioElement.currentTime = clamped;
      this.playbackState.currentTime = clamped;
      this.notifyTime(clamped, this.playbackState.duration);
      this.notifyState();
    } else if (this.currentSource === 'demo' && this.demoSynth) {
      const loopDuration = 8.0;
      const normalized = Math.max(0, timeSeconds % loopDuration);
      const step = Math.floor((normalized / loopDuration) * 64);
      this.demoSynth.jumpToStep(step);
      this.playbackState.currentTime = normalized;
      this.playbackState.duration = loopDuration;
      this.notifyTime(normalized, loopDuration);
      this.notifyState();
    }
  }

  /**
   * Seek playback to a fractional percentage (0.0 to 1.0).
   */
  public seekPercent(fraction: number): void {
    const clamped = Math.max(0, Math.min(1, fraction));
    if (this.currentSource === 'file' && this.playbackState.duration > 0) {
      this.seek(clamped * this.playbackState.duration);
    } else if (this.currentSource === 'demo') {
      this.seek(clamped * 8.0);
    }
  }

  /**
   * Skip forward or backward by deltaSeconds.
   */
  public skipBy(deltaSeconds: number): void {
    this.seek(this.playbackState.currentTime + deltaSeconds);
  }

  /**
   * Jump Demo Synth to a specific step (0 to 63).
   */
  public jumpDemoStep(step: number): void {
    if (this.demoSynth) {
      this.demoSynth.jumpToStep(step);
      const loopDuration = 8.0;
      this.playbackState.currentTime = (step / 64) * loopDuration;
      this.playbackState.duration = loopDuration;
      this.notifyState();
    }
  }

  public stopAudioFile(): void {
    if (this.audioElement) {
      if (this.audioListeners.timeupdate) {
        this.audioElement.removeEventListener('timeupdate', this.audioListeners.timeupdate);
      }
      if (this.audioListeners.loadedmetadata) {
        this.audioElement.removeEventListener('loadedmetadata', this.audioListeners.loadedmetadata);
      }
      if (this.audioListeners.ended) {
        this.audioElement.removeEventListener('ended', this.audioListeners.ended);
      }
      this.audioListeners = {};

      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
    if (this.fileSourceNode) {
      this.fileSourceNode.disconnect();
      this.fileSourceNode = null;
    }
  }

  // --- Real-Time Audio DSP Analysis Frame ---
  // Called by visual rendering loop on every frame

  public analyzeFrame(): AudioFrameData {
    const startTime = performance.now();
    const sampleRate = this.ctx ? this.ctx.sampleRate : 44100;
    const bufferSize = this.timeDomainBuffer.length;
    const frame = this.reusableFrameData;

    frame.sampleRate = sampleRate;
    frame.bufferSize = bufferSize;
    frame.timeDomain = this.timeDomainBuffer;
    frame.frequencyData = this.frequencyBuffer;

    if (!this.analyser || (!this.playbackState.isPlaying && this.currentLoudnessEnvelope < 0.005)) {
      // Idle / silent frame (mutates reusable frame in-place to avoid GC allocations)
      frame.rms = 0;
      frame.loudnessEnvelope = 0;
      frame.subBass = 0;
      frame.bass = 0;
      frame.lowMid = 0;
      frame.mid = 0;
      frame.highMid = 0;
      frame.high = 0;
      frame.spectralCentroid = 0;
      frame.spectralFlux = 0;
      frame.isTransient = false;
      frame.transientStrength = 0;
      frame.estimatedPitch = null;
      frame.pitchNote = null;
      frame.pitchConfidence = 0;
      frame.estimatedBpm = this.bpmEstimator.getEstimate().bpm;
      frame.bpmConfidence = this.bpmEstimator.getEstimate().confidence;
      frame.analysisTimeMs = 0.1;
      return frame;
    }

    // 1. Fetch current time-domain and frequency data
    this.analyser.getFloatTimeDomainData(this.timeDomainBuffer);
    this.analyser.getByteFrequencyData(this.frequencyBuffer);

    // 2. Compute RMS amplitude (unrolled 4x for SIMD register pipeline execution)
    let sumSq = 0;
    const len4 = bufferSize - 3;
    let i = 0;
    for (; i < len4; i += 4) {
      const v0 = this.timeDomainBuffer[i];
      const v1 = this.timeDomainBuffer[i + 1];
      const v2 = this.timeDomainBuffer[i + 2];
      const v3 = this.timeDomainBuffer[i + 3];
      sumSq += v0 * v0 + v1 * v1 + v2 * v2 + v3 * v3;
    }
    for (; i < bufferSize; i++) {
      const v = this.timeDomainBuffer[i];
      sumSq += v * v;
    }
    const currentRms = Math.sqrt(sumSq / bufferSize);

    // Fast-attack, slow-decay loudness envelope
    const attackCoeff = 0.45;
    const decayCoeff = 0.08;
    if (currentRms > this.currentLoudnessEnvelope) {
      this.currentLoudnessEnvelope += (currentRms - this.currentLoudnessEnvelope) * attackCoeff;
    } else {
      this.currentLoudnessEnvelope += (currentRms - this.currentLoudnessEnvelope) * decayCoeff;
    }

    this.updateBandBins(sampleRate);

    // 3. Multi-band frequency extraction using precomputed bin ranges
    const subBass = this.getBandEnergyRange(this.subBassRange);
    const bass = this.getBandEnergyRange(this.bassRange);
    const lowMid = this.getBandEnergyRange(this.lowMidRange);
    const mid = this.getBandEnergyRange(this.midRange);
    const highMid = this.getBandEnergyRange(this.highMidRange);
    const high = this.getBandEnergyRange(this.highRange);

    // 4. Spectral Centroid (unrolled 4x for fast accumulator math)
    let num = 0;
    let denom = 0;
    const freqLen = this.frequencyBuffer.length;
    const freqLen4 = freqLen - 3;
    let b = 1;
    for (; b < freqLen4; b += 4) {
      const m0 = this.frequencyBuffer[b];
      const m1 = this.frequencyBuffer[b + 1];
      const m2 = this.frequencyBuffer[b + 2];
      const m3 = this.frequencyBuffer[b + 3];
      num += b * m0 + (b + 1) * m1 + (b + 2) * m2 + (b + 3) * m3;
      denom += m0 + m1 + m2 + m3;
    }
    for (; b < freqLen; b++) {
      const m = this.frequencyBuffer[b];
      num += b * m;
      denom += m;
    }
    const spectralCentroid = denom > 0 ? (num * this.binHz) / denom : 0;

    // 5. Transient / Onset Detection
    const now = performance.now();
    const onsetResult = this.onsetDetector.detect(this.frequencyBuffer, currentRms, now);

    if (onsetResult.isTransient) {
      this.bpmEstimator.registerOnset(now);
    }

    const bpmData = this.bpmEstimator.getEstimate();

    // 6. Monophonic Pitch Estimation (throttled every 3 frames for zero DSP lag)
    this.pitchFrameCount++;
    if (currentRms > 0.02) {
      if (this.pitchFrameCount % 3 === 0 || this.cachedPitchResult === null) {
        this.cachedPitchResult = detectPitch(this.timeDomainBuffer, sampleRate);
      }
    } else {
      this.cachedPitchResult = null;
    }
    const pitchResult = this.cachedPitchResult;

    const analysisTimeMs = performance.now() - startTime;

    frame.rms = currentRms;
    frame.loudnessEnvelope = this.currentLoudnessEnvelope;
    frame.subBass = subBass;
    frame.bass = bass;
    frame.lowMid = lowMid;
    frame.mid = mid;
    frame.highMid = highMid;
    frame.high = high;
    frame.spectralCentroid = spectralCentroid;
    frame.spectralFlux = onsetResult.flux;
    frame.isTransient = onsetResult.isTransient;
    frame.transientStrength = onsetResult.strength;
    frame.estimatedPitch = pitchResult ? pitchResult.frequency : null;
    frame.pitchNote = pitchResult ? pitchResult.note : null;
    frame.pitchConfidence = pitchResult ? pitchResult.confidence : 0;
    frame.estimatedBpm = bpmData.bpm;
    frame.bpmConfidence = bpmData.confidence;
    frame.analysisTimeMs = analysisTimeMs;

    return frame;
  }

  // --- Subscriptions ---
  public subscribeFrame(callback: (data: AudioFrameData) => void): () => void {
    this.frameListeners.push(callback);
    return () => {
      this.frameListeners = this.frameListeners.filter(l => l !== callback);
    };
  }

  public notifyFrame(data: AudioFrameData): void {
    if (this.frameListeners.length === 0) return;
    for (let i = 0; i < this.frameListeners.length; i++) {
      this.frameListeners[i](data);
    }
  }

  public subscribeTime(callback: (time: number, duration: number) => void): () => void {
    this.timeListeners.push(callback);
    callback(this.playbackState.currentTime, this.playbackState.duration);
    return () => {
      this.timeListeners = this.timeListeners.filter(l => l !== callback);
    };
  }

  public notifyTime(time: number, duration: number): void {
    if (this.timeListeners.length === 0) return;
    for (let i = 0; i < this.timeListeners.length; i++) {
      this.timeListeners[i](time, duration);
    }
  }

  public subscribeState(callback: (state: AudioPlaybackState) => void): () => void {
    this.stateChangeListeners.push(callback);
    callback({ ...this.playbackState });
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== callback);
    };
  }

  private notifyState(): void {
    const copy = { ...this.playbackState };
    this.stateChangeListeners.forEach(listener => listener(copy));
  }

  private updateBandBins(sampleRate: number): void {
    if (this.cachedSampleRate === sampleRate && this.binHz > 0) return;
    this.cachedSampleRate = sampleRate;
    const binCount = this.frequencyBuffer.length;
    this.binHz = sampleRate / (binCount * 2);

    const calcRange = (minHz: number, maxHz: number): [number, number, number] => {
      const start = Math.max(0, Math.floor(minHz / this.binHz));
      const end = Math.min(binCount - 1, Math.ceil(maxHz / this.binHz));
      const invSpan = start < end ? 1 / ((end - start + 1) * 255) : 0;
      return [start, end, invSpan];
    };

    this.subBassRange = calcRange(20, 80);
    this.bassRange = calcRange(80, 250);
    this.lowMidRange = calcRange(250, 800);
    this.midRange = calcRange(800, 2500);
    this.highMidRange = calcRange(2500, 6000);
    this.highRange = calcRange(6000, 16000);
  }

  private getBandEnergyRange(range: [number, number, number]): number {
    const startBin = range[0];
    const endBin = range[1];
    if (startBin >= endBin) return 0;
    let sum = 0;
    for (let b = startBin; b <= endBin; b++) {
      sum += this.frequencyBuffer[b];
    }
    return sum * range[2];
  }

  public getPlaybackState(): AudioPlaybackState {
    return { ...this.playbackState };
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public getMasterGain(): GainNode | null {
    return this.masterGain;
  }

  public getMicStream(): MediaStream | null {
    return this.micStream;
  }

  public setMasterVolume(val: number): void {
    if (this.masterGain && this.ctx) {
      const clamped = Math.max(0, Math.min(1.5, val));
      this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
    }
  }
}

// Singleton export
export const audioEngine = new AudioEngine();
