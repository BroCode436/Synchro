// Symmetrical, Extravagant & Ethereal Visual Engine for Synchro
// Inspired by Cymatics, Sacred Geometry, and Ethereal Audiovisual Laser Mandalas

import { AudioFrameData } from '../types/audio';
import { VisualSettings } from '../types/visual';
import { getPalette } from './palettes';

interface ImpactBurst {
  radius: number;
  maxRadius: number;
  strength: number;
  life: number;
  decay: number;
  facets: number;
  rotation: number;
  color: string;
}

// Precomputed static trigonometry lookup tables for 90-segment cymatic bass ring geometry
const BASS_SEGMENTS = 90;
const STATIC_COS_90 = new Float32Array(BASS_SEGMENTS + 1);
const STATIC_SIN_90 = new Float32Array(BASS_SEGMENTS + 1);
for (let s = 0; s <= BASS_SEGMENTS; s++) {
  const theta = (s / BASS_SEGMENTS) * Math.PI * 2;
  STATIC_COS_90[s] = Math.cos(theta);
  STATIC_SIN_90[s] = Math.sin(theta);
}

export class VisualEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Symmetrical Impact Pool
  private impacts: ImpactBurst[] = [];
  private maxImpacts = 8;

  // Background texture & Logo images
  private bgTextureImg: HTMLImageElement | null = null;
  private logoImg: HTMLImageElement | null = null;
  private currentLogoUrl = '';

  // Harmonic Mandala State
  private mandalaRotation = 0;
  private orbitalPhase = 0;
  private smoothedBass = 0;
  private smoothedCentroid = 1000;
  private smoothedPitch = 300;
  private pitchBend = 0;

  // Flank audio towers & constellation state
  private leftTowerPeaks: number[] = new Array(36).fill(0);
  private rightTowerPeaks: number[] = new Array(36).fill(0);
  private constellationPhase = 0;
  private reusableBandEnergies = new Float32Array(5);
  private reusableConstellationNodes: [number, number][] = new Array(9).fill(null).map(() => [0, 0]);

  // Time tracking
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;

    // Load background texture
    this.bgTextureImg = new Image();
    this.bgTextureImg.src = '/textures/bg_texture.jpg';

    // Load AI logo
    this.logoImg = new Image();
    this.logoImg.src = '/logos/synchro_logo.jpg';
    this.currentLogoUrl = '/logos/synchro_logo.jpg';
  }

  public render(audio: AudioFrameData, settings: VisualSettings, timeMs: number): void {
    const ctx = this.ctx;

    // Accurate high-DPI scaling and guaranteed exact screen center
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;
    if (width === 0 || height === 0) return;

    // Update custom logo if changed
    const targetLogoUrl = settings.logo?.customUrl || '/logos/synchro_logo.jpg';
    if (this.currentLogoUrl !== targetLogoUrl && this.logoImg) {
      this.logoImg.src = targetLogoUrl;
      this.currentLogoUrl = targetLogoUrl;
    }

    const dt = this.lastTime > 0 ? Math.min(0.04, (timeMs - this.lastTime) / 1000) : 0.016;
    this.lastTime = timeMs;

    const palette = getPalette(settings.paletteId, settings.customColors);
    const intensity = settings.intensity;
    const sensitivity = settings.sensitivity;
    const folds = Math.max(2, settings.symmetryFolds || 6);
    const isBilateral = settings.symmetryMode === 'bilateral';
    const bloom = settings.postProcessing?.bloomGlow !== false;

    // Futuristic Jet Black Mode: removes obsidian texture, fills with pitch black void, and highlights neons
    const isJetBlack = settings.background?.mode === 'jet-black';
    const neonHighlight = settings.background?.neonHighlight !== false;
    const glowBoost = (isJetBlack && neonHighlight) ? 1.45 : 1.0;

    // Responsive smoothing rate controlled by user smoothing slider
    const smoothingVal = settings.smoothing ?? 0.75;
    const bassSmoothRate = Math.max(0.04, Math.min(0.35, 0.28 - smoothingVal * 0.20));
    const centroidSmoothRate = Math.max(0.02, Math.min(0.20, 0.16 - smoothingVal * 0.12));
    const pitchSmoothRate = Math.max(0.05, Math.min(0.40, 0.32 - smoothingVal * 0.18));

    // Scaled responsive inputs
    const scaledRms = Math.min(1.0, audio.rms * sensitivity);
    const scaledBass = Math.min(1.0, (audio.subBass * 0.75 + audio.bass * 0.55) * sensitivity);
    const scaledMid = Math.min(1.0, (audio.lowMid * 0.5 + audio.mid * 0.5) * sensitivity);
    const scaledHigh = Math.min(1.0, (audio.highMid * 0.4 + audio.high * 0.6) * sensitivity);

    this.smoothedBass += (scaledBass - this.smoothedBass) * bassSmoothRate;
    this.smoothedCentroid += (audio.spectralCentroid - this.smoothedCentroid) * centroidSmoothRate;

    if (audio.estimatedPitch && audio.pitchConfidence > 0.55) {
      this.smoothedPitch += (audio.estimatedPitch - this.smoothedPitch) * pitchSmoothRate;
      this.pitchBend = Math.sin(timeMs * 0.008) * (audio.pitchConfidence > 0.8 ? 0.08 : 0);
    }

    const cx = width * 0.5;
    const cy = height * 0.5;
    const maxRadius = Math.min(width, height) * 0.45;

    // 1. BACKGROUND TEXTURE & MOTION PERSISTENCE FADE
    ctx.save();
    // In Jet Black mode, the obsidian texture is completely removed
    if (!isJetBlack && settings.background?.textureEnabled !== false && this.bgTextureImg && this.bgTextureImg.complete) {
      const texOpacity = settings.background?.textureOpacity ?? 0.45;
      ctx.globalAlpha = texOpacity;
      ctx.drawImage(this.bgTextureImg, 0, 0, width, height);
    }

    const effectiveBgColor = isJetBlack ? '#000000' : palette.colors.background;

    if (settings.postProcessing.trails) {
      let alpha = 1 - settings.postProcessing.trailPersistence;
      if (settings.preset === 'celestial') alpha = 0.09;
      else if (settings.preset === 'cymatics') alpha = 0.12;
      else if (settings.preset === 'sketch') alpha = 0.28;
      else if (settings.preset === 'minimal') alpha = 0.22;
      else if (settings.preset === 'kaleidoscope') alpha = 0.14;

      ctx.fillStyle = effectiveBgColor;
      ctx.globalAlpha = Math.max(0.06, Math.min(0.35, alpha));
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = effectiveBgColor;
      ctx.globalAlpha = isJetBlack ? 1.0 : 0.85;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();

    // 2. SEAMLESS EMBEDDED AI / USER LOGO WITH SOFT ATMOSPHERIC BLEND
    if (settings.logo?.enabled && this.logoImg && this.logoImg.complete) {
      const logoPulse = settings.logo.pulseWithBass ? (1 + this.smoothedBass * 0.14) : 1.0;
      const logoSize = (settings.logo.size || 260) * logoPulse;
      const baseAlpha = settings.logo.opacity ?? 0.35;
      const effectiveAlpha = Math.min(1.0, baseAlpha * (settings.logo.pulseWithBass ? (0.8 + this.smoothedBass * 0.4) : 1.0));
      const blendMode = settings.logo.blendMode || 'screen';
      const useFeather = settings.logo.featherEdge !== false;
      const useHalo = settings.logo.haloGlow !== false;

      // Pass A: Atmospheric Stage Backlight Halo (bathes the emblem in the visualizer's palette)
      if (useHalo) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const haloR = logoSize * 0.65;
        const haloGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
        haloGrad.addColorStop(0, palette.colors.melodic);
        haloGrad.addColorStop(0.45, palette.colors.bass);
        haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = haloGrad;
        ctx.globalAlpha = Math.min(0.42, 0.12 + this.smoothedBass * 0.32);
        ctx.beginPath();
        ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Pass B: Seamless Radial Feathered Logo Drawing (Eliminates all rectangular box edges)
      ctx.save();
      if (useFeather) {
        ctx.beginPath();
        ctx.arc(cx, cy, logoSize * 0.5, 0, Math.PI * 2);
        ctx.clip();
      }

      ctx.globalCompositeOperation = blendMode;
      ctx.globalAlpha = effectiveAlpha;
      ctx.drawImage(
        this.logoImg,
        cx - logoSize * 0.5,
        cy - logoSize * 0.5,
        logoSize,
        logoSize
      );

      // Radial vignette falloff to softly dissolve perimeter into dark background
      if (useFeather) {
        const featherGrad = ctx.createRadialGradient(cx, cy, logoSize * 0.30, cx, cy, logoSize * 0.5);
        featherGrad.addColorStop(0, 'rgba(0,0,0,0)');
        featherGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = featherGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, logoSize * 0.51, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Pass C: Delicate Sacred Geometry Framing Reticle Ring
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = palette.colors.accent;
      ctx.lineWidth = 0.65;
      ctx.globalAlpha = Math.min(0.45, 0.18 + this.smoothedBass * 0.25);
      ctx.beginPath();
      ctx.arc(cx, cy, logoSize * 0.52, 0, Math.PI * 2);
      ctx.stroke();

      // Delicate outer 8-point tick marks
      const reticleNodes = 8;
      const reticleR1 = logoSize * 0.51;
      const reticleR2 = logoSize * 0.54;
      ctx.beginPath();
      for (let n = 0; n < reticleNodes; n++) {
        const theta = (n / reticleNodes) * Math.PI * 2 + this.mandalaRotation * 0.2;
        ctx.moveTo(cx + Math.cos(theta) * reticleR1, cy + Math.sin(theta) * reticleR1);
        ctx.lineTo(cx + Math.cos(theta) * reticleR2, cy + Math.sin(theta) * reticleR2);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 3. HORIZONTAL OSCILLOSCOPE BEAM (Across the horizon connecting left and right flanks)
    if (settings.flanks?.horizontalOscilloscope !== false) {
      this.renderHorizontalOscilloscopeBeam(ctx, width, height, cy, audio, palette, intensity, sensitivity, glowBoost);
    }

    // 4. CELESTIAL CONSTELLATION CLUSTERS (Upper geometric nodes)
    if (settings.flanks?.constellations !== false) {
      this.renderConstellationClusters(ctx, width, height, audio, palette, intensity, dt);
    }

    // 5. TRANSIENT PERCUSSION TRIGGER (Symmetric Crystalline Shocks)
    if (audio.isTransient && settings.activeSystems.percussion) {
      this.spawnSymmetricImpact(audio.transientStrength * sensitivity, palette.colors.percussion, folds);
    }

    // 6. SYSTEM D: BASS FIELD (Cymatic Radial Resonance & Breathing Rings)
    if (settings.activeSystems.bass) {
      this.renderCymaticBassField(ctx, cx, cy, maxRadius, this.smoothedBass, intensity, palette, dt, folds, isBilateral, timeMs, bloom, glowBoost);
    }

    // 7. SYSTEM C: HARMONIC GEOMETRY (Sacred Mandalas & Rotating Crystalline Wireframes)
    if (settings.activeSystems.harmonic) {
      this.renderSacredHarmonicMandala(ctx, cx, cy, maxRadius, scaledMid, this.smoothedCentroid, intensity, palette, dt, folds, isBilateral, timeMs, bloom, glowBoost);
    }

    // 8. SYSTEM A: MELODIC RIBBONS (Extravagant Symmetrical Spirals & Gossamer Tendrils)
    if (settings.activeSystems.melodic) {
      this.renderSymmetricMelodicFilaments(ctx, cx, cy, maxRadius, audio, this.smoothedPitch, intensity, palette, dt, folds, isBilateral, timeMs, bloom, glowBoost);
    }

    // 9. SYSTEM B: PERCUSSION IMPACTS (Crystalline Starlight Shockbursts)
    if (settings.activeSystems.percussion) {
      this.renderSymmetricImpacts(ctx, cx, cy, dt, palette, folds, isBilateral, glowBoost);
    }

    // 10. SUBTLE SACRED RETICLE & CENTRAL NODAL SEED
    this.renderCentralNodalSeed(ctx, cx, cy, scaledRms, palette, glowBoost);

    // 11. STEREO AUDIO SPECTRUM TOWERS (Left & Right Flanks)
    if (settings.flanks?.stereoTowers !== false) {
      this.renderStereoSideTowers(ctx, width, height, cy, audio, palette, intensity, sensitivity, dt, glowBoost);
    }
  }

  // --- SYSTEM A: MELODIC RIBBONS (Extravagant Symmetrical Spirals & Tendrils) ---
  private renderSymmetricMelodicFilaments(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    maxRadius: number,
    audio: AudioFrameData,
    pitchHz: number,
    intensity: number,
    palette: ReturnType<typeof getPalette>,
    dt: number,
    folds: number,
    isBilateral: boolean,
    timeMs: number,
    bloom = true,
    glowBoost = 1.0
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Pitch influences orbital distance and spiral curvature
    const normPitch = Math.max(0.05, Math.min(1.0, (pitchHz - 80) / 900));
    const targetOrbit = maxRadius * (0.25 + normPitch * 0.65);
    const melodicEnergy = Math.max(0.05, audio.mid * 0.7 + audio.high * 0.4);

    this.orbitalPhase += (0.4 + normPitch * 1.5) * dt;

    // Micro-vibrato ripples
    const vibrato = audio.pitchConfidence > 0.7 ? Math.sin(timeMs * 0.015) * 8 : 0;
    const currentRadius = targetOrbit + vibrato;

    // Draw symmetrical ribbons radiating in each fold sector
    const branchCount = isBilateral ? 2 : folds;
    const angleStep = (Math.PI * 2) / branchCount;

    const filaments = Math.round(3 * intensity);

    for (let f = 0; f < filaments; f++) {
      const filamentOffset = (f - 1) * 0.12;
      const waveFreq = 3 + Math.floor(normPitch * 5);
      const waveAmp = (8 + melodicEnergy * 28) * (f === 1 ? 1 : 0.75);

      ctx.beginPath();

      for (let b = 0; b < branchCount; b++) {
        const baseAngle = b * angleStep + this.orbitalPhase * (b % 2 === 0 ? 0.3 : -0.3) + filamentOffset;

        // Trace a delicate logarithmic spiral curve outward and inward
        const segments = 28;
        for (let s = 0; s <= segments; s++) {
          const t = s / segments;
          const r = currentRadius * (0.2 + t * 0.85);
          const theta = baseAngle + t * Math.PI * (1.2 + normPitch * 0.8) + Math.sin(t * waveFreq * Math.PI + this.orbitalPhase * 2) * (waveAmp / r);

          const px = cx + Math.cos(theta) * r;
          const py = cy + Math.sin(theta) * r;

          if (s === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }

        // If bilateral symmetry, also draw mirrored reflection
        if (isBilateral) {
          for (let s = 0; s <= segments; s++) {
            const t = s / segments;
            const r = currentRadius * (0.2 + t * 0.85);
            const theta = baseAngle + t * Math.PI * (1.2 + normPitch * 0.8) + Math.sin(t * waveFreq * Math.PI + this.orbitalPhase * 2) * (waveAmp / r);

            const px = cx - Math.cos(theta) * r; // X mirrored
            const py = cy + Math.sin(theta) * r;

            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
        }
      }

      // Outer ethereal glow (subtle and fine)
      ctx.shadowColor = palette.colors.melodic;
      ctx.shadowBlur = bloom ? (6 + melodicEnergy * 14) * intensity * glowBoost : 0;
      ctx.strokeStyle = palette.colors.melodic;
      ctx.lineWidth = Math.max(0.6, (0.8 + melodicEnergy * 1.4) * intensity * (glowBoost > 1 ? 1.15 : 1.0));
      ctx.globalAlpha = Math.min(1.0, (0.4 + melodicEnergy * 0.5) * (glowBoost > 1 ? 1.2 : 1.0));
      ctx.stroke();

      // Delicate silver-white core hairline
      ctx.shadowBlur = 0;
      ctx.strokeStyle = palette.colors.accent;
      ctx.lineWidth = 0.6;
      ctx.globalAlpha = Math.min(1.0, 0.6 + melodicEnergy * 0.4);
      ctx.stroke();
    }

    ctx.restore();
  }

  // --- SYSTEM B: PERCUSSION IMPACTS (Crystalline Starlight Shockbursts) ---
  private spawnSymmetricImpact(strength: number, color: string, folds: number): void {
    if (this.impacts.length >= this.maxImpacts) {
      this.impacts.shift();
    }

    const facets = Math.max(6, folds * 2);
    this.impacts.push({
      radius: 12,
      maxRadius: Math.min(this.canvas.width, this.canvas.height) * (0.2 + strength * 0.35),
      strength: Math.min(1.0, Math.max(0.25, strength)),
      life: 1.0,
      decay: 2.5 + (1 - strength) * 1.5, // Crisp fast decay
      facets,
      rotation: Math.random() * Math.PI,
      color
    });
  }

  private renderSymmetricImpacts(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    dt: number,
    palette: ReturnType<typeof getPalette>,
    folds: number,
    isBilateral: boolean,
    glowBoost = 1.0
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const imp = this.impacts[i];
      imp.life -= imp.decay * dt;

      if (imp.life <= 0) {
        this.impacts.splice(i, 1);
        continue;
      }

      const progress = 1 - imp.life;
      const currentRadius = imp.radius + (imp.maxRadius - imp.radius) * Math.sin(progress * Math.PI * 0.5);
      const alpha = imp.life * imp.strength;

      // 1. Concentric Symmetrical Polyhedral Ring (Hexagon/Octagon/Dodecagon)
      const sides = imp.facets;
      ctx.beginPath();
      for (let s = 0; s <= sides; s++) {
        const theta = imp.rotation + (s / sides) * Math.PI * 2;
        const px = cx + Math.cos(theta) * currentRadius;
        const py = cy + Math.sin(theta) * currentRadius;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      ctx.strokeStyle = imp.color;
      ctx.shadowColor = imp.color;
      ctx.shadowBlur = 12 * imp.life * glowBoost;
      ctx.lineWidth = Math.max(0.7, 2.0 * imp.life * (glowBoost > 1 ? 1.2 : 1.0));
      ctx.globalAlpha = Math.min(1.0, alpha * (glowBoost > 1 ? 1.2 : 1.0));
      ctx.stroke();

      // 2. Secondary Inward Starlight Facet Ring
      if (progress > 0.15) {
        const innerRadius = currentRadius * 0.62;
        ctx.beginPath();
        for (let s = 0; s <= sides; s++) {
          const theta = imp.rotation + ((s + 0.5) / sides) * Math.PI * 2;
          const px = cx + Math.cos(theta) * innerRadius;
          const py = cy + Math.sin(theta) * innerRadius;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = palette.colors.accent;
        ctx.shadowBlur = 0;
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = alpha * 0.7;
        ctx.stroke();
      }

      // 3. Symmetrical Needle Starlight Rays
      ctx.beginPath();
      for (let s = 0; s < sides; s++) {
        const theta = imp.rotation + (s / sides) * Math.PI * 2;
        const inner = currentRadius * 0.8;
        const outer = currentRadius * (1.15 + imp.strength * 0.35);

        ctx.moveTo(cx + Math.cos(theta) * inner, cy + Math.sin(theta) * inner);
        ctx.lineTo(cx + Math.cos(theta) * outer, cy + Math.sin(theta) * outer);
      }
      ctx.strokeStyle = palette.colors.accent;
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = alpha * 0.85;
      ctx.stroke();
    }

    ctx.restore();
  }

  // --- SYSTEM C: HARMONIC GEOMETRY (Sacred Mandalas & Rotating Crystalline Wireframes) ---
  private renderSacredHarmonicMandala(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    maxRadius: number,
    midEnergy: number,
    spectralCentroid: number,
    intensity: number,
    palette: ReturnType<typeof getPalette>,
    dt: number,
    folds: number,
    isBilateral: boolean,
    timeMs: number,
    bloom = true,
    glowBoost = 1.0
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Harmonic rotation speed driven by brightness/spectral centroid
    const rotSpeed = 0.15 + (spectralCentroid / 2500) * 0.6;
    this.mandalaRotation += rotSpeed * dt;

    const baseRadius = maxRadius * (0.25 + midEnergy * 0.25) * intensity;
    const layers = Math.round(4 * intensity);
    const sectors = isBilateral ? 4 : folds;

    for (let l = 0; l < layers; l++) {
      const layerRadius = baseRadius * (0.4 + (l / layers) * 0.85);
      const layerRot = this.mandalaRotation * (l % 2 === 0 ? 1 : -0.8) + (l * Math.PI) / sectors;
      const sides = sectors * (l % 2 === 1 ? 2 : 1);

      // A. Sacred Rosette Petals (Smooth Bezier/Sinusoidal Petal Envelope)
      ctx.beginPath();
      const petalPoints = sides * 4;
      for (let p = 0; p <= petalPoints; p++) {
        const theta = layerRot + (p / petalPoints) * Math.PI * 2;
        // Harmonic petal oscillation
        const petalDistort = 1 + Math.sin(theta * sides + timeMs * 0.002) * (0.12 + midEnergy * 0.2);
        const r = layerRadius * petalDistort;
        const px = cx + Math.cos(theta) * r;
        const py = cy + Math.sin(theta) * r;

        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      // Outer Glow Pass
      ctx.shadowColor = palette.colors.harmonic;
      ctx.shadowBlur = bloom ? (6 + midEnergy * 15) * intensity * glowBoost : 0;
      ctx.strokeStyle = palette.colors.harmonic;
      ctx.lineWidth = Math.max(0.6, (0.8 + midEnergy * 1.4) * intensity * (glowBoost > 1 ? 1.15 : 1.0));
      ctx.globalAlpha = Math.min(1.0, (0.35 + midEnergy * 0.5) * (glowBoost > 1 ? 1.2 : 1.0));
      ctx.stroke();

      // B. Fine Inner Cross-Lattice Webbing (Star Polygon Intersections)
      if (l >= 1) {
        ctx.beginPath();
        for (let s = 0; s < sides; s++) {
          const theta1 = layerRot + (s / sides) * Math.PI * 2;
          const theta2 = layerRot + (((s + 2) % sides) / sides) * Math.PI * 2;

          ctx.moveTo(cx + Math.cos(theta1) * layerRadius, cy + Math.sin(theta1) * layerRadius);
          ctx.lineTo(cx + Math.cos(theta2) * layerRadius, cy + Math.sin(theta2) * layerRadius);
        }
        ctx.shadowBlur = 0;
        ctx.strokeStyle = palette.colors.accent;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.2 + midEnergy * 0.35;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // --- SYSTEM D: BASS FIELD (Cymatic Radial Resonance & Standing Wave Nodes) ---
  private renderCymaticBassField(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    maxRadius: number,
    bassEnergy: number,
    intensity: number,
    palette: ReturnType<typeof getPalette>,
    dt: number,
    folds: number,
    isBilateral: boolean,
    timeMs: number,
    bloom = true,
    glowBoost = 1.0
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Cymatic standing-wave nodal rings
    const ringCount = Math.round(5 * intensity);
    const wavePhase = timeMs * 0.0018 * (1 + bassEnergy * 2);

    for (let r = 0; r < ringCount; r++) {
      const normR = (r + 1) / (ringCount + 1);
      const ringRadius = maxRadius * (0.35 + normR * 0.65) * (1 + bassEnergy * 0.15);
      const nodes = isBilateral ? 4 : folds;

      ctx.beginPath();
      const waveAmplitude = Math.sin(wavePhase * (r + 1)) * (6 + bassEnergy * 28);
      for (let s = 0; s <= BASS_SEGMENTS; s++) {
        const theta = (s / BASS_SEGMENTS) * Math.PI * 2;
        // Cymatic nodal ripple equation: r = R0 + A * cos(n * theta) * sin(omega * t)
        const ripple = Math.cos(theta * nodes) * waveAmplitude;
        const currentR = ringRadius + ripple;

        const px = cx + STATIC_COS_90[s] * currentR;
        const py = cy + STATIC_SIN_90[s] * currentR;

        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      // Outer Deep Bass Glow
      ctx.shadowColor = palette.colors.bass;
      ctx.shadowBlur = bloom ? (8 + bassEnergy * 20) * intensity * glowBoost : 0;
      ctx.strokeStyle = palette.colors.bass;
      ctx.lineWidth = Math.max(0.6, (0.8 + bassEnergy * 2.2) * intensity * (glowBoost > 1 ? 1.15 : 1.0));
      ctx.globalAlpha = Math.min(1.0, (0.25 + bassEnergy * 0.5) * (glowBoost > 1 ? 1.25 : 1.0));
      ctx.stroke();

      // Hairline accent edge
      ctx.shadowBlur = 0;
      ctx.strokeStyle = r === 0 ? palette.colors.accent : palette.colors.bass;
      ctx.lineWidth = 0.6;
      ctx.globalAlpha = Math.min(0.9, 0.3 + bassEnergy * 0.4);
      ctx.stroke();
    }

    ctx.restore();
  }

  // --- SUBTLE SACRED NODAL SEED (Center Core) ---
  private renderCentralNodalSeed(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rms: number,
    palette: ReturnType<typeof getPalette>,
    glowBoost = 1.0
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const pulseRadius = (2.5 + rms * 8) * (glowBoost > 1 ? 1.2 : 1.0);

    // Glowing central seed
    ctx.beginPath();
    ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
    ctx.fillStyle = palette.colors.accent;
    ctx.shadowColor = palette.colors.melodic;
    ctx.shadowBlur = 12 * glowBoost;
    ctx.globalAlpha = 0.95;
    ctx.fill();

    // Subtle framing reticle crosshair
    const crossSize = 14 + rms * 15;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 0.75;
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.moveTo(cx - crossSize, cy);
    ctx.lineTo(cx + crossSize, cy);
    ctx.moveTo(cx, cy - crossSize);
    ctx.lineTo(cx, cy + crossSize);
    ctx.stroke();

    ctx.restore();
  }

  // --- HORIZONTAL OSCILLOSCOPE BEAM (Minimalist Electric Waveform Ribbon) ---
  private renderHorizontalOscilloscopeBeam(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cy: number,
    audio: AudioFrameData,
    palette: ReturnType<typeof getPalette>,
    intensity: number,
    sensitivity: number,
    glowBoost = 1.0
  ): void {
    const timeDomain = audio.timeDomain;
    if (!timeDomain || timeDomain.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Start cleanly from inner edge of flank towers
    const margin = Math.max(76, width * 0.055);
    const startX = margin;
    const endX = width - margin;
    const beamWidth = endX - startX;
    const points = 160;
    const step = beamWidth / points;

    // Refined, minimalist amplitude
    const baseAmp = (22 + audio.loudnessEnvelope * 110) * intensity * sensitivity;
    const bufferLen = timeDomain.length;
    const invHalfW = 1 / (width * 0.5);

    // Pass 1: Delicate Luminous Envelope Teeth (subtle musical ribs)
    ctx.strokeStyle = palette.colors.melodic;
    ctx.lineWidth = 0.9;
    ctx.globalAlpha = Math.min(0.4, 0.15 + audio.loudnessEnvelope * 0.35);
    ctx.beginPath();
    for (let i = 0; i <= points; i += 2) {
      const x = startX + i * step;
      const bufIdx = Math.floor((i / points) * (bufferLen - 1));
      const sample = Math.abs(timeDomain[bufIdx] || 0);
      const taper = Math.min(1.0, 0.35 + Math.abs(x - width * 0.5) * invHalfW * 0.95);
      const h = (sample * baseAmp * 1.25 + 2 * intensity) * taper;
      ctx.moveTo(x, cy - h);
      ctx.lineTo(x, cy + h);
    }
    ctx.stroke();

    // Pass 2: Soft Luminous Ambient Glow
    ctx.beginPath();
    ctx.moveTo(startX, cy);
    for (let i = 0; i <= points; i++) {
      const x = startX + i * step;
      const bufIdx = Math.floor((i / points) * (bufferLen - 1));
      const sample = timeDomain[bufIdx] || 0;
      const taper = Math.min(1.0, 0.35 + Math.abs(x - width * 0.5) * invHalfW * 0.95);
      const y = cy + sample * baseAmp * taper;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = palette.colors.melodic;
    ctx.lineWidth = 2.4 * intensity;
    ctx.globalAlpha = Math.min(0.35, 0.15 + audio.loudnessEnvelope * 0.3);
    ctx.stroke();

    // Pass 3: Electric Core Hairline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.0;
    ctx.globalAlpha = Math.min(0.9, 0.55 + audio.loudnessEnvelope * 0.35);
    ctx.stroke();

    // Pass 4: Subtle Harmonic Ghost Trace
    ctx.beginPath();
    ctx.moveTo(startX, cy);
    for (let i = 0; i <= points; i += 3) {
      const x = startX + i * step;
      const bufIdx = Math.floor((i / points) * (bufferLen - 1));
      const sample = timeDomain[bufIdx] || 0;
      const taper = Math.min(1.0, 0.35 + Math.abs(x - width * 0.5) * invHalfW * 0.95);
      const y = cy - sample * (baseAmp * 0.5) * taper;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = palette.colors.harmonic;
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = Math.min(0.25, 0.1 + audio.loudnessEnvelope * 0.2);
    ctx.stroke();

    ctx.restore();
  }

  // --- STEREO SIDE TOWERS (Minimalist Precision Audiophile Equalizer Racks) ---
  private renderStereoSideTowers(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cy: number,
    audio: AudioFrameData,
    palette: ReturnType<typeof getPalette>,
    intensity: number,
    sensitivity: number,
    dt: number,
    glowBoost = 1.0
  ): void {
    const freqData = audio.frequencyData;
    if (!freqData || freqData.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Sleek, compact dimensions matching reference image
    const towerH = Math.min(height * 0.68, 460);
    const topY = cy - towerH * 0.5;
    const numColumns = 5;
    const colWidth = 4.5;
    const colGap = 3.0;
    const rackWidth = numColumns * (colWidth + colGap);

    const leftX = Math.max(30, width * 0.022);
    const rightX = width - leftX;

    // Multi-band frequency energies (reusable array, zero allocation)
    this.reusableBandEnergies[0] = Math.min(1.0, (audio.subBass * 1.8 + 0.08) * sensitivity);
    this.reusableBandEnergies[1] = Math.min(1.0, (audio.bass * 1.6 + 0.08) * sensitivity);
    this.reusableBandEnergies[2] = Math.min(1.0, (audio.lowMid * 1.5 + 0.06) * sensitivity);
    this.reusableBandEnergies[3] = Math.min(1.0, (audio.mid * 1.4 + 0.06) * sensitivity);
    this.reusableBandEnergies[4] = Math.min(1.0, (audio.high * 1.3 + 0.05) * sensitivity);

    const segmentsPerHalf = 22;
    const segH = (towerH * 0.5 - 10) / segmentsPerHalf;

    // --- 1. SLENDER VERTICAL SPECTRUM COLUMNS ---
    for (let c = 0; c < numColumns; c++) {
      const bandVal = this.reusableBandEnergies[c];
      const activeSegs = Math.max(1, Math.round(bandVal * segmentsPerHalf));

      // Left column X (from outer edge inward)
      const colLeftX = leftX + c * (colWidth + colGap);
      // Right column X (mirrored from inner edge outward)
      const colRightX = rightX - (c + 1) * (colWidth + colGap);

      // Peak Hold update on columns
      if (activeSegs > this.leftTowerPeaks[c]) {
        this.leftTowerPeaks[c] = activeSegs;
      } else {
        this.leftTowerPeaks[c] = Math.max(0, this.leftTowerPeaks[c] * 0.94);
      }

      if (activeSegs > this.rightTowerPeaks[c]) {
        this.rightTowerPeaks[c] = activeSegs;
      } else {
        this.rightTowerPeaks[c] = Math.max(0, this.rightTowerPeaks[c] * 0.94);
      }

      // Draw segments expanding vertically from cy
      for (let s = 0; s < segmentsPerHalf; s++) {
        const normDist = (s + 1) / segmentsPerHalf;
        const isLit = s < activeSegs;

        // Elegant gradient: Electric cyan near horizon, noble violet towards tips
        const segColor = normDist < 0.36 ? palette.colors.melodic : (normDist < 0.72 ? palette.colors.harmonic : palette.colors.bass);

        // Alpha: subtle translucent glow when lit, faint ghost guide when idle
        const alpha = isLit ? Math.min(0.85, 0.35 + (1 - normDist * 0.25)) : 0.06;

        ctx.fillStyle = segColor;
        ctx.globalAlpha = alpha;

        // Upward segment
        const yUp = cy - (s + 1) * segH;
        ctx.fillRect(colLeftX, yUp, colWidth, segH - 1.5);
        ctx.fillRect(colRightX, yUp, colWidth, segH - 1.5);

        // Downward segment
        const yDown = cy + s * segH;
        ctx.fillRect(colLeftX, yDown, colWidth, segH - 1.5);
        ctx.fillRect(colRightX, yDown, colWidth, segH - 1.5);
      }

      // Floating Peak Indicator Needle (Top & Bottom)
      const peakSeg = Math.round(this.leftTowerPeaks[c]);
      if (peakSeg > 2) {
        ctx.fillStyle = palette.colors.accent;
        ctx.globalAlpha = 0.9;
        const peakYUp = cy - peakSeg * segH;
        const peakYDown = cy + (peakSeg - 1) * segH;
        ctx.fillRect(colLeftX, peakYUp, colWidth, 1.5);
        ctx.fillRect(colLeftX, peakYDown, colWidth, 1.5);
      }

      const rightPeakSeg = Math.round(this.rightTowerPeaks[c]);
      if (rightPeakSeg > 2) {
        ctx.fillStyle = palette.colors.accent;
        ctx.globalAlpha = 0.9;
        const peakYUp = cy - rightPeakSeg * segH;
        const peakYDown = cy + (rightPeakSeg - 1) * segH;
        ctx.fillRect(colRightX, peakYUp, colWidth, 1.5);
        ctx.fillRect(colRightX, peakYDown, colWidth, 1.5);
      }
    }

    // --- 2. PRECISION dB GRADUATION TICKS & RAILS (Batched in single stroke passes) ---
    const tickCount = 14;
    const tickStep = towerH / tickCount;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 0.75;
    ctx.globalAlpha = 0.6;

    ctx.beginPath();
    for (let t = 0; t <= tickCount; t++) {
      const y = topY + t * tickStep;
      const isMajor = t % 2 === 0;
      const tickLen = isMajor ? 6 : 3.5;

      ctx.moveTo(leftX - 8, y);
      ctx.lineTo(leftX - 8 + tickLen, y);

      ctx.moveTo(rightX + 8, y);
      ctx.lineTo(rightX + 8 - tickLen, y);
    }
    ctx.stroke();

    // Thin outer bounding rails (batched)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.45;

    ctx.beginPath();
    ctx.moveTo(leftX - 9, topY);
    ctx.lineTo(leftX - 9, topY + towerH);
    ctx.moveTo(rightX + 9, topY);
    ctx.lineTo(rightX + 9, topY + towerH);
    ctx.stroke();

    // Subtle Monospace Typography: "Left Channel" & "Right Channel"
    ctx.save();
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.globalAlpha = 0.75;

    // Left Label (rotated -90deg)
    ctx.translate(leftX - 18, cy);
    ctx.rotate(-Math.PI * 0.5);
    ctx.textAlign = 'center';
    ctx.fillText('Left Channel', 0, 0);
    ctx.restore();

    // Right Label (rotated 90deg)
    ctx.save();
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.globalAlpha = 0.75;
    ctx.translate(rightX + 22, cy);
    ctx.rotate(Math.PI * 0.5);
    ctx.textAlign = 'center';
    ctx.fillText('Right Channel', 0, 0);
    ctx.restore();

    ctx.restore();
  }

  // --- CELESTIAL CONSTELLATION CLUSTERS (Upper Flanks) ---
  private renderConstellationClusters(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    audio: AudioFrameData,
    palette: ReturnType<typeof getPalette>,
    intensity: number,
    dt: number
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    this.constellationPhase += 0.3 * dt;
    const harmonicEnergy = audio.mid * 0.6 + audio.high * 0.4;
    const clusterAlpha = Math.min(0.65, 0.25 + harmonicEnergy * 0.4);

    const leftAnchorX = width * 0.2;
    const leftAnchorY = height * 0.28;
    const rightAnchorX = width * 0.8;
    const rightAnchorY = height * 0.28;

    const drawConstellation = (ax: number, ay: number, isRight: boolean) => {
      const rot = this.constellationPhase * (isRight ? -0.4 : 0.4);
      const hexR = 36 * intensity * (1 + harmonicEnergy * 0.15);

      const nodes = this.reusableConstellationNodes;
      for (let i = 0; i < 6; i++) {
        const theta = rot + (i / 6) * Math.PI * 2;
        nodes[i][0] = ax + Math.cos(theta) * hexR;
        nodes[i][1] = ay + Math.sin(theta) * hexR;
      }

      nodes[6][0] = ax + Math.cos(rot + 1.2) * (hexR * 1.8);
      nodes[6][1] = ay + Math.sin(rot + 1.2) * (hexR * 1.8);
      nodes[7][0] = ax + Math.cos(rot - 1.8) * (hexR * 2.1);
      nodes[7][1] = ay + Math.sin(rot - 1.8) * (hexR * 2.1);
      nodes[8][0] = ax + (isRight ? 45 : -45);
      nodes[8][1] = ay - 35;

      ctx.strokeStyle = palette.colors.harmonic;
      ctx.lineWidth = 0.6;
      ctx.globalAlpha = clusterAlpha * 0.6;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const [x1, y1] = nodes[i];
        const [x2, y2] = nodes[(i + 1) % 6];
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.moveTo(nodes[0][0], nodes[0][1]);
      ctx.lineTo(nodes[3][0], nodes[3][1]);
      ctx.moveTo(nodes[1][0], nodes[1][1]);
      ctx.lineTo(nodes[4][0], nodes[4][1]);
      ctx.moveTo(nodes[2][0], nodes[2][1]);
      ctx.lineTo(nodes[6][0], nodes[6][1]);
      ctx.moveTo(nodes[5][0], nodes[5][1]);
      ctx.lineTo(nodes[7][0], nodes[7][1]);
      ctx.moveTo(nodes[0][0], nodes[0][1]);
      ctx.lineTo(nodes[8][0], nodes[8][1]);
      ctx.stroke();

      // Batch all node glows into a single path and fill once (saves 16 expensive Canvas blur passes)
      ctx.beginPath();
      for (let i = 0; i < nodes.length; i++) {
        const [nx, ny] = nodes[i];
        ctx.moveTo(nx + 1.6, ny);
        ctx.arc(nx, ny, 1.6, 0, Math.PI * 2);
      }
      ctx.fillStyle = palette.colors.accent;
      ctx.shadowColor = palette.colors.harmonic;
      ctx.shadowBlur = 6;
      ctx.globalAlpha = clusterAlpha;
      ctx.fill();

      // Sparkle Star (4-point sparkle matching user screenshot)
      const starX = isRight ? rightAnchorX + 50 : leftAnchorX - 45;
      const starY = ay + (isRight ? 180 : 120);
      const starSize = (6 + audio.high * 10) * intensity;

      ctx.strokeStyle = palette.colors.accent;
      ctx.shadowColor = palette.colors.melodic;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.0;
      ctx.globalAlpha = Math.min(0.85, 0.3 + audio.high * 0.5);

      ctx.beginPath();
      ctx.moveTo(starX - starSize, starY);
      ctx.lineTo(starX + starSize, starY);
      ctx.moveTo(starX, starY - starSize);
      ctx.lineTo(starX, starY + starSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(starX, starY - starSize * 0.35);
      ctx.lineTo(starX + starSize * 0.35, starY);
      ctx.lineTo(starX, starY + starSize * 0.35);
      ctx.lineTo(starX - starSize * 0.35, starY);
      ctx.closePath();
      ctx.fillStyle = palette.colors.accent;
      ctx.fill();
    };

    drawConstellation(leftAnchorX, leftAnchorY, false);
    drawConstellation(rightAnchorX, rightAnchorY, true);

    ctx.restore();
  }
}
