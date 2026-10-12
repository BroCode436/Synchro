// Built-in Multi-Timbral Generative Synthesizer Engine for Demo Mode
// Provides Kick, Snare, Hi-hat, Bassline, Chords, and Melodic Lead via Web Audio API nodes

import { DemoStemMutes } from '../types/audio';

export class DemoSynthEngine {
  private ctx: AudioContext;
  private outputNode: GainNode;
  private isPlaying = false;
  private timerId: number | null = null;
  private currentStep = 0;
  private bpm = 120;
  private stepIntervalMs = (60 / 120 / 4) * 1000; // 16th notes
  private stemMutes: DemoStemMutes = {
    drums: false,
    bass: false,
    chords: false,
    melody: false
  };

  // Musical scales (D minor / Aeolian)
  // D2, F2, G2, A2, C3, D3, F3, G3, A3, C4, D4, E4, F4, G4, A4
  private leadScale = [
    293.66, 329.63, 349.23, 392.00, 440.00, 523.25, 587.33, 659.25, 698.46, 880.00
  ];
  private bassNotes = [73.42, 73.42, 87.31, 98.00, 110.00, 98.00, 87.31, 65.41]; // D1, F1, G1, A1, C1
  private chordProgressions = [
    [146.83, 220.00, 261.63], // Dm (D3, A3, C4)
    [174.61, 261.63, 329.63], // Fmaj7 (F3, C4, E4)
    [196.00, 293.66, 349.23], // Gm7 (G3, D4, F4)
    [220.00, 329.63, 440.00]  // Am (A3, E4, A4)
  ];

  // Pre-allocated noise buffer for percussion (reused across all snare & hi-hat hits)
  private noiseBuffer: AudioBuffer | null = null;

  constructor(audioContext: AudioContext, destination: AudioNode) {
    this.ctx = audioContext;
    this.outputNode = this.ctx.createGain();
    this.outputNode.gain.value = 0.85;
    this.outputNode.connect(destination);
    this.initNoiseBuffer();
  }

  private initNoiseBuffer(): void {
    const bufferSize = Math.floor(this.ctx.sampleRate * 1.0); // 1 second of white noise
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  private onStepCallback: ((step: number) => void) | null = null;

  public setStemMutes(mutes: DemoStemMutes): void {
    this.stemMutes = { ...mutes };
  }

  public setOnStepCallback(cb: ((step: number) => void) | null): void {
    this.onStepCallback = cb;
  }

  public jumpToStep(step: number): void {
    this.currentStep = ((Math.floor(step) % 64) + 64) % 64;
  }

  public getCurrentStep(): number {
    return this.currentStep;
  }

  public start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentStep = 0;
    this.scheduleNextStep();
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public reset(): void {
    this.currentStep = 0;
    if (this.onStepCallback) {
      this.onStepCallback(0);
    }
  }

  private scheduleNextStep(): void {
    if (!this.isPlaying) return;

    const step = this.currentStep;
    const now = this.ctx.currentTime;

    if (this.onStepCallback) {
      this.onStepCallback(step);
    }

    // 1. DRUMS (16-step pattern)
    if (!this.stemMutes.drums) {
      // Kick on 0, 4, 8, 12 (four on the floor with occasional offbeat on 14)
      if (step % 4 === 0 || step === 14) {
        this.triggerKick(now, step === 14 ? 0.7 : 1.0);
      }
      // Snare / Clap on 4, 12
      if (step === 4 || step === 12) {
        this.triggerSnare(now);
      }
      // Hi-hat on every 8th note or 16th note
      if (step % 2 === 0 || step % 4 === 2) {
        this.triggerHiHat(now, step % 2 === 0 ? 0.4 : 0.7);
      }
    }

    // 2. BASS (driving rolling bassline on 16th notes)
    if (!this.stemMutes.bass) {
      if (step % 2 === 0 || (step % 4 === 3 && Math.random() > 0.4)) {
        const chordIndex = Math.floor(step / 16) % this.bassNotes.length;
        const noteFreq = this.bassNotes[chordIndex];
        this.triggerBass(now, noteFreq);
      }
    }

    // 3. CHORDS (on beat 0 of every 8 or 16 steps)
    if (!this.stemMutes.chords) {
      if (step % 8 === 0) {
        const chordIndex = Math.floor(step / 8) % this.chordProgressions.length;
        const chord = this.chordProgressions[chordIndex];
        this.triggerChord(now, chord);
      }
    }

    // 4. MELODIC LEAD / GUITAR SIMULATION (soaring expressive monophonic melodic line)
    if (!this.stemMutes.melody) {
      // Melodic phrase triggers on syncopated steps
      const melodySteps = [0, 3, 6, 8, 10, 11, 14];
      if (melodySteps.includes(step % 16)) {
        const leadNoteIndex = (Math.floor(step / 2) + Math.floor(step / 7)) % this.leadScale.length;
        const freq = this.leadScale[leadNoteIndex];
        this.triggerLead(now, freq);
      }
    }

    this.currentStep = (this.currentStep + 1) % 64;
    this.timerId = window.setTimeout(() => this.scheduleNextStep(), this.stepIntervalMs);
  }

  // --- Drum Synthesizers ---
  private triggerKick(time: number, velocity: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);

    gain.gain.setValueAtTime(0.8 * velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gain);
    gain.connect(this.outputNode);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };

    osc.start(time);
    osc.stop(time + 0.36);
  }

  private triggerSnare(time: number): void {
    if (!this.noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(900, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    // Body tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.1);

    oscGain.gain.setValueAtTime(0.4, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(oscGain);
    oscGain.connect(this.outputNode);

    noise.onended = () => {
      noise.disconnect();
      filter.disconnect();
      gain.disconnect();
    };

    osc.onended = () => {
      osc.disconnect();
      oscGain.disconnect();
    };

    noise.start(time);
    osc.start(time);
    noise.stop(time + 0.23);
    osc.stop(time + 0.13);
  }

  private triggerHiHat(time: number, velocity: number): void {
    if (!this.noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3 * velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    noise.onended = () => {
      noise.disconnect();
      filter.disconnect();
      gain.disconnect();
    };

    noise.start(time);
    noise.stop(time + 0.07);
  }

  // --- Bass Synthesizer ---
  private triggerBass(time: number, freq: number): void {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, time);
    filter.frequency.exponentialRampToValueAtTime(140, time + 0.18);
    filter.Q.value = 4.0;

    gain.gain.setValueAtTime(0.45, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
    };

    osc.start(time);
    osc.stop(time + 0.23);
  }

  // --- Chords Synthesizer ---
  private triggerChord(time: number, frequencies: number[]): void {
    const chordGain = this.ctx.createGain();
    chordGain.gain.setValueAtTime(0.22, time);
    chordGain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);
    chordGain.connect(this.outputNode);

    let endedCount = 0;
    frequencies.forEach(f => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, time);

      osc.connect(filter);
      filter.connect(chordGain);

      osc.onended = () => {
        osc.disconnect();
        filter.disconnect();
        endedCount++;
        if (endedCount === frequencies.length) {
          chordGain.disconnect();
        }
      };

      osc.start(time);
      osc.stop(time + 1.25);
    });
  }

  // --- Lead / Melodic Guitar-style Synthesizer ---
  private triggerLead(time: number, freq: number): void {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    // Subtle vibrato LFO
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(5.5, time); // 5.5 Hz vibrato
    lfoGain.gain.setValueAtTime(freq * 0.02, time); // 2% pitch wobble
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, time);
    filter.Q.value = 2.0;

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.35, time + 0.03); // Quick attack
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.38);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    osc.onended = () => {
      lfo.stop();
      lfo.disconnect();
      lfoGain.disconnect();
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
    };

    lfo.start(time);
    osc.start(time);
    lfo.stop(time + 0.4);
    osc.stop(time + 0.4);
  }
}
