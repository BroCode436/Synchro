# SYNCHRO — Real-Time Music-to-Visual Engine

**Synchro** is a high-performance, real-time audiovisual instrument built with **TypeScript, React, and Vite**. It converts live audio signals (via microphone, uploaded audio files, or a built-in multi-timbral generative synthesizer) into elaborate, non-representational generative visuals.

---

## 1. Core Architectural Overview

Synchro strictly separates audio input, digital signal processing (DSP), transient detection, visual state mapping, and rendering:

```
[Audio Input] (Microphone / File Upload / Multi-Timbral Demo Synth)
      │
      ▼
[Web Audio API Engine] (AudioContext + AnalyserNode)
      │
      ├──> [Time-Domain Buffer] (Float32Array 2048)
      │         │
      │         ├──> Normalized Autocorrelation Pitch Detector (YIN-derived + Parabolic Interpolation)
      │         └──> RMS Amplitude & Loudness Envelope (Attack/Decay Smoothing)
      │
      └──> [Frequency-Domain Buffer] (Uint8Array 1024)
                │
                ├──> Multi-Band Energy Integration (Sub-Bass, Bass, Low-Mid, Mid, High-Mid, Treble)
                ├──> Spectral Centroid (Center of mass brightness in Hz)
                ├──> Half-Wave Rectified Spectral Flux
                └──> Adaptive Transient Onset Detector & IOI BPM Estimator
      │
      ▼
[Canvas 2D Generative Visual Engine] (60 FPS requestAnimationFrame Loop)
      │
      ├──> System A: Melodic Ribbons (Pitch-driven undulating curves & vibrato)
      ├──> System B: Percussion Impacts (Expanding shock rings & needle bursts)
      ├──> System C: Harmonic Geometry (Nested wireframes morphing with spectral centroid)
      └──> System D: Bass Field (Continuous liquid contour waves with depth)
```

---

## 2. Four Distinct Responsive Visual Systems

1. **Melodic Ribbons (Melody & Lead):**
   - Flowing thin, glowing curves that drift across the canvas.
   - Vertical elevation and wave curvature dynamically map to detected fundamental pitch ($80\text{ Hz} - 1200\text{ Hz}$).
   - Micro-vibrato generates organic wave ripples when pitch stability is high.
   - Attack strength drives stroke width and neon bloom.

2. **Percussion Impacts (Drums & Attacks):**
   - Triggered by transient peaks detected via spectral flux and energy spikes.
   - Radiates expanding shock rings, secondary echo rings, and high-frequency needle bursts.
   - Decays rapidly ($0.3 - 0.45\text{ s}$) to prevent visual clutter and constant flashing.

3. **Harmonic Geometry (Chords & Spectral Body):**
   - Centrally-anchored concentric wireframe polygons and cross-lattice geometries.
   - Morphs vertex counts ($3 \rightarrow 8$ sides) and rotational velocity proportionally to harmonic spectral centroid and mid-frequency energy.

4. **Bass Field (Low-Frequency Energy):**
   - Continuous, slow-moving liquid contour field across the bottom plane.
   - Driven by sub-bass ($20 - 80\text{ Hz}$) and bass ($80 - 250\text{ Hz}$) energy envelopes.
   - Composed of multi-octave harmonic sinusoids for fluid wave motion rather than raw oscilloscope waveforms.

---

## 3. Presets & Palettes

### Visual Presets:
- **Sacred Cymatics:** 6-fold harmonic radial mandala with cymatic standing-wave nodal rings.
- **Celestial Spiral:** Extravagant gossamer orbital ribbons with delicate spiral tendrils.
- **Kaleidoscope Neon:** 8-fold crystal symmetry with crystalline diamond shockbursts.
- **Sacred Sketch:** Ethereal fine-line luminous geometric drawing.
- **Minimal Zen:** Subtle bilateral mirror resonance with deep breathing space.

### 12 Curated Neon Color Palettes:
1. **Electric Neon (Original):** Electric mint melody, icy blue harmony, amber percussion, violet bass.
2. **Neon Aurora:** Arctic cyan harmony, emerald melody, rose pink impacts, deep purple bass.
3. **Solar Flare:** Fiery gold melody, sunset amber, and ultraviolet depths.
4. **Deep Abyss:** Subterranean cobalt, bioluminescent teal, and oceanic blues.
5. **Monochrome Sketch:** High-contrast stark silver linework, titanium accents, and deep obsidian.
6. **Tokyo Night:** Shinjuku neon violet, magenta impact flashes, and laser cyan.
7. **Cyberpunk Matrix:** Phosphor terminal green, digital lime, cyber amber, and black obsidian.
8. **Vaporwave Sunset:** Pastel violet, neon hot pink, soft turquoise, and deep plum.
9. **Blood Moon:** Crimson blood red, dark ruby, burnt copper, and bronze obsidian.
10. **Celestial Gold:** Royal champagne gold, luminous ivory, amber bronze, and deep night.
11. **Ultraviolet Dream:** Pure neon violet, electric indigo, fluorescent cyan, and dark sapphire.
12. **Prismatic Opal:** Multidimensional iridescent rainbow spectrum with crystalline clarity.

---

## 4. Background Texture & Static AI Logo Embedding

- **Obsidian Grain Texture Backdrop:** Integrated high-resolution subtle dark slate texture with organic vignette and film grain, providing tactile depth. Toggle and adjust opacity in the **Backdrop** tab.
- **Static AI Logo Embedding:** An emblem generated for Synchro featuring an iconic neon 'S' surrounded by geometric cymatic facets embedded directly in the background. Supports adjustable opacity, scale, optional reactive bass pulsing, and custom artist/band logo uploads.
- **True Screen Centering:** Logical CSS coordinates with DPR transformation guarantee mathematical centering across any display resolution or Windows scaling factor.

---

## 5. Stereo Audio Towers & Horizon Oscilloscope Beam

Inspired by professional concert visualizers and high-end rack hardware instruments:
- **Stereo Side Equalizer Towers (Left & Right Flanks):**
  - 36 segmented vertical frequency bars on each side with cyan-to-violet gradient mapping.
  - Mirrored inner micro-spectrum meters and dynamic peak-hold dots with smooth exponential decay.
  - Outer graduation tick rails with dB markers (`+6dB`, `0dB`, `-12dB`, `-24dB`, `-48dB`).
  - Vertical typography labels: rotated `Left Channel` / `CH-01 [L]` and `Right Channel` / `CH-02 [R]`.
- **Horizontal Oscilloscope Beam:**
  - A glowing, real-time audio time-domain waveform beam spanning horizontally across the canvas through the center.
  - Multi-pass rendering with soft luminous cyan bloom, high-frequency electric core line, and harmonic reflection.
  - Intelligent central tapering ensures the central logo and sacred mandala remain legible.
- **Celestial Constellation Clusters:**
  - Floating geometric hexagonal wireframe networks and 4-point sparkle stars in the upper-left and upper-right corners that react dynamically to harmonic mid/high frequencies.

---

## 6. Big Screen / Cinema Exhibition Mode

Designed for concert visuals, stage projectors, and museum/gallery installations:
- One-click **Big Screen** toggle in the header or backdrop tab.
- Completely hides all UI headers, analysis panels, and controls.
- **Auto-Hiding Cursor:** Mouse cursor disappears after 2 seconds of inactivity so the projection remains pristine. Moving the mouse reveals a subtle floating pill to exit or press `Escape` / `F`.

---

## 4. Built-in Multi-Timbral Demo Synth & Stem Isolation

Synchro includes an autonomous, zero-dependency procedural synthesizer built using Web Audio API nodes (`OscillatorNode`, `BiquadFilterNode`, `GainNode`, buffer noise generators):
- **Kick Drum:** Pitch-swept sine oscillator ($140\text{ Hz} \rightarrow 45\text{ Hz}$) with click transient.
- **Snare / Clap:** High-pass filtered noise burst + triangle body tone.
- **Hi-Hat:** High-pass metallic noise bursts on syncopated 16th notes.
- **Acid / Rolling Bassline:** Resonant sawtooth bass riff in D minor with low-pass envelope.
- **Harmony Pads:** Polyphonic tri-tone chords with gentle swell and filter sweep.
- **Melodic Lead:** Triangle lead with pitch vibrato LFO and bandpass body.

> **Stem Isolation:** In the **Instrument Controls -> Demo Stems** tab, users can toggle individual stems (Mute/Solo Drums, Bass, Chords, Melody) to test and observe how each visual engine responds in isolation!

---

## 5. DSP Signal Extraction & Scientific Honesty

The analysis engine labels signals honestly:
- **Low-Frequency Energy** ($20 - 250\text{ Hz}$), not "Bass Guitar Only".
- **Spectral Flux & Transient Onsets**, not "Acoustic Drum Kit Only".
- **Estimated Monophonic Pitch & Note**, not "Polyphonic Transcription".
- The system architecture is modular, with clean typed interfaces ready to receive isolated stems from models such as Spleeter or Demucs in future iterations.

---

## 6. Setup & Execution

### Prerequisites
- Node.js (v18+ or v20+ recommended)
- Modern web browser with Web Audio API support (Chrome, Edge, Firefox, Brave, Safari)

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Automated Unit Tests
```bash
npm test
```
Runs unit tests validating normalized autocorrelation pitch estimation, silence rejection, and tempo clustering.

### Production Build
```bash
npm run build
```
Creates an optimized, tree-shaken static production bundle in `dist/`.

---

## 7. Performance & Latency Metrics

- **Canvas 2D Render Duration:** $\sim 1.0 - 2.5\text{ ms}$ per frame.
- **Audio DSP Analysis Duration:** $\sim 0.3 - 0.7\text{ ms}$ per frame.
- **Total In-Engine Processing:** $< 3\text{ ms}$.
- **Framerate:** Rock-solid 60 FPS on typical modern hardware.
- **Total End-to-End Latency:** Governed by hardware/OS audio buffer sizes ($\sim 10 - 25\text{ ms}$) plus display refresh intervals ($\sim 16.6\text{ ms}$ at 60Hz).
