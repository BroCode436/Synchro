export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  colors: {
    background: string;
    melodic: string;       // Melody / guitar ribbons (e.g. electric cyan/mint)
    harmonic: string;      // Chords / geometry (e.g. icy blue)
    percussion: string;    // Drums / hits (e.g. amber / coral / electric orange)
    bass: string;          // Bass energy (e.g. deep violet / purple)
    accent: string;        // Highlights / spikes (e.g. pure white / neon silver)
    glow: string;          // Glow ambient color
  };
}

export type PresetType = 'cymatics' | 'celestial' | 'kaleidoscope' | 'sketch' | 'minimal';

export type SymmetryMode = 'radial' | 'bilateral';

export interface VisualSystemsToggle {
  melodic: boolean;
  percussion: boolean;
  harmonic: boolean;
  bass: boolean;
}

export interface PostProcessingSettings {
  trails: boolean;
  trailPersistence: number; // 0.80 to 0.98
  bloomGlow: boolean;
  chromaticFlash: boolean;
  filmGrain: boolean;
}

export type LogoBlendMode = 'screen' | 'lighten' | 'multiply' | 'source-over';

export interface LogoSettings {
  enabled: boolean;
  opacity: number;          // 0 to 1
  size: number;             // px (100 to 500)
  customUrl?: string | null;// Custom user uploaded logo URL
  pulseWithBass: boolean;   // Subtle reactive glow
  blendMode?: LogoBlendMode;// 'screen', 'lighten', 'multiply', 'source-over'
  featherEdge?: boolean;    // Radial vignette mask eliminating box edges
  haloGlow?: boolean;       // Atmospheric reactive stage lighting halo behind logo
}

export type BackgroundMode = 'obsidian' | 'jet-black';

export interface BackgroundSettings {
  textureEnabled: boolean;
  textureOpacity: number;    // 0 to 1
  mode: BackgroundMode;      // 'obsidian' (classic slate grain) | 'jet-black' (futuristic OLED pitch black)
  neonHighlight?: boolean;   // Boosts glow luminescence and contrast against pitch black
}

export interface FlankSettings {
  stereoTowers: boolean;          // Left & right audio spectrum visualizer towers
  horizontalOscilloscope: boolean;// Center horizontal waveform beam
  constellations: boolean;        // Upper left/right geometric molecular constellation nodes
}

export interface CustomColorPalette {
  melodic: string;       // Melody / ribbons
  harmonic: string;      // Geometry / chords
  bass: string;          // Bass / cymatics
  percussion: string;    // Drums / shocks
  accent: string;        // Peak highlights
}

export interface VisualSettings {
  sensitivity: number;       // 0.5 to 2.5 (controls audio threshold/gain)
  intensity: number;         // 0.2 to 2.0 (controls visual density, scale, line count)
  smoothing: number;         // 0.0 to 0.95 (controls envelope smoothing)
  symmetryFolds: number;     // 2, 4, 6, 8, 12 fold symmetry
  symmetryMode: SymmetryMode;// radial or bilateral
  activeSystems: VisualSystemsToggle;
  paletteId: string;
  customColors?: CustomColorPalette;
  preset: PresetType;
  postProcessing: PostProcessingSettings;
  logo: LogoSettings;
  background: BackgroundSettings;
  flanks: FlankSettings;
}

export interface PerformanceMetrics {
  fps: number;
  renderTimeMs: number;
  analysisTimeMs: number;
  totalLatencyEstimateMs: number;
  droppedFrames: number;
}
