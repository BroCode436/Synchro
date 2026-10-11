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

      // Create demo synth connected to masterGain
      const synthBus = this.ctx.createGain();
      synthBus.connect(this.masterGain);
      this.demoSynth = new DemoSynthEngine(this.ctx, synthBus);
      this.demoSynth.setOnStepCallback((step: number) => {
        if (this.currentSource === 'demo' && this.playbackState.isDemoActive) {
          this.playbackState.currentTime = (step / 64) * 8.0;
          this.playbackState.duration = 8.0;
          this.notifyState();
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
      this.notifyState();
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
      this.notifyState();
    } else if (this.currentSource === 'demo' && this.demoSynth) {
      const loopDuration = 8.0;
      const normalized = Math.max(0, timeSeconds % loopDuration);
      const step = Math.floor((normalized / loopDuration) * 64);
      this.demoSynth.jumpToStep(step);
      this.playbackState.currentTime = normalized;
      this.playbackState.duration = loopDuration;
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

    if (!this.analyser || (!this.playbackState.isPlaying && this.currentLoudnessEnvelope < 0.005)) {
      // Idle / silent frame
      return {
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
        estimatedBpm: this.bpmEstimator.getEstimate().bpm,
        bpmConfidence: this.bpmEstimator.getEstimate().confidence,
        timeDomain: this.timeDomainBuffer,
        frequencyData: this.frequencyBuffer,
        sampleRate,
        bufferSize,
        analysisTimeMs: 0.1
      };
    }

    // 1. Fetch current time-domain and frequency data
    this.analyser.getFloatTimeDomainData(this.timeDomainBuffer);
    this.analyser.getByteFrequencyData(this.frequencyBuffer);

    // 2. Compute RMS amplitude
    let sumSq = 0;
    for (let i = 0; i < bufferSize; i++) {
      const val = this.timeDomainBuffer[i];
      sumSq += val * val;
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

    // 3. Multi-band frequency extraction
    // Frequency resolution per bin = sampleRate / fftSize (e.g. 44100 / 2048 = ~21.5 Hz per bin)
    const binHz = sampleRate / (this.frequencyBuffer.length * 2);

    const getBandEnergy = (minHz: number, maxHz: number): number => {
      const startBin = Math.max(0, Math.floor(minHz / binHz));
      const endBin = Math.min(this.frequencyBuffer.length - 1, Math.ceil(maxHz / binHz));
      if (startBin >= endBin) return 0;

      let sum = 0;
      for (let b = startBin; b <= endBin; b++) {
        sum += this.frequencyBuffer[b];
      }
      return sum / ((endBin - startBin + 1) * 255);
    };

    const subBass = getBandEnergy(20, 80);
    const bass = getBandEnergy(80, 250);
    const lowMid = getBandEnergy(250, 800);
    const mid = getBandEnergy(800, 2500);
    const highMid = getBandEnergy(2500, 6000);
    const high = getBandEnergy(6000, 16000);

    // 4. Spectral Centroid
    let num = 0;
    let denom = 0;
    for (let b = 1; b < this.frequencyBuffer.length; b++) {
      const mag = this.frequencyBuffer[b];
      const freq = b * binHz;
      num += freq * mag;
      denom += mag;
    }
    const spectralCentroid = denom > 0 ? num / denom : 0;

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

    return {
      rms: currentRms,
      loudnessEnvelope: this.currentLoudnessEnvelope,
      subBass,
      bass,
      lowMid,
      mid,
      highMid,
      high,
      spectralCentroid,
      spectralFlux: onsetResult.flux,
      isTransient: onsetResult.isTransient,
      transientStrength: onsetResult.strength,
      estimatedPitch: pitchResult ? pitchResult.frequency : null,
      pitchNote: pitchResult ? pitchResult.note : null,
      pitchConfidence: pitchResult ? pitchResult.confidence : 0,
      estimatedBpm: bpmData.bpm,
      bpmConfidence: bpmData.confidence,
      timeDomain: this.timeDomainBuffer,
      frequencyData: this.frequencyBuffer,
      sampleRate,
      bufferSize,
      analysisTimeMs
    };
  }

  // --- Subscriptions ---
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
