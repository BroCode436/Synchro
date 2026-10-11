import { VisualSettings, PresetType, SymmetryMode } from '../types/visual';

export interface SavedPreset {
  id: string;
  name: string;
  createdAt: number;
  settings: VisualSettings;
  isFavorite?: boolean;
}

export interface StoredLogo {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
}

export interface PresetExportSchemaV1 {
  schemaVersion: 1;
  generator: 'Synchro Stage Engine';
  exportedAt: number;
  presets: SavedPreset[];
}

const STORAGE_KEYS = {
  ACTIVE_SETTINGS: 'synchro_active_settings_v1',
  SAVED_PRESETS: 'synchro_saved_presets_v1',
  RECENT_LOGOS: 'synchro_recent_logos_v1'
};

export const DEFAULT_VISUAL_SETTINGS: VisualSettings = {
  sensitivity: 1.15,
  intensity: 1.05,
  smoothing: 0.75,
  symmetryFolds: 6,
  symmetryMode: 'radial',
  activeSystems: {
    melodic: true,
    percussion: true,
    harmonic: true,
    bass: true
  },
  paletteId: 'synchro-default',
  preset: 'cymatics',
  postProcessing: {
    trails: true,
    trailPersistence: 0.88,
    bloomGlow: true,
    chromaticFlash: false,
    filmGrain: false
  },
  logo: {
    enabled: true,
    opacity: 0.38,
    size: 270,
    customUrl: null,
    pulseWithBass: true,
    blendMode: 'screen',
    featherEdge: true,
    haloGlow: true
  },
  background: {
    textureEnabled: true,
    textureOpacity: 0.45
  },
  flanks: {
    stereoTowers: true,
    horizontalOscilloscope: true,
    constellations: true
  }
};

const VALID_PRESETS: PresetType[] = ['cymatics', 'celestial', 'kaleidoscope', 'sketch', 'minimal'];
const VALID_SYMMETRY_MODES: SymmetryMode[] = ['radial', 'bilateral'];

/**
 * Validates and sanitizes a raw settings object.
 * Rejects malicious scripts and ensures all fields conform to types and safe bounds.
 */
export function validateVisualSettings(raw: unknown): VisualSettings | null {
  if (!raw || typeof raw !== 'object') return null;

  try {
    const input = raw as Partial<VisualSettings>;

    const sensitivity = typeof input.sensitivity === 'number' && !isNaN(input.sensitivity)
      ? Math.max(0.2, Math.min(3.0, input.sensitivity))
      : DEFAULT_VISUAL_SETTINGS.sensitivity;

    const intensity = typeof input.intensity === 'number' && !isNaN(input.intensity)
      ? Math.max(0.2, Math.min(3.0, input.intensity))
      : DEFAULT_VISUAL_SETTINGS.intensity;

    const smoothing = typeof input.smoothing === 'number' && !isNaN(input.smoothing)
      ? Math.max(0.0, Math.min(0.98, input.smoothing))
      : DEFAULT_VISUAL_SETTINGS.smoothing;

    const symmetryFolds = typeof input.symmetryFolds === 'number' && !isNaN(input.symmetryFolds)
      ? Math.max(2, Math.min(16, Math.round(input.symmetryFolds)))
      : DEFAULT_VISUAL_SETTINGS.symmetryFolds;

    const symmetryMode: SymmetryMode = VALID_SYMMETRY_MODES.includes(input.symmetryMode as SymmetryMode)
      ? (input.symmetryMode as SymmetryMode)
      : 'radial';

    const preset: PresetType = VALID_PRESETS.includes(input.preset as PresetType)
      ? (input.preset as PresetType)
      : 'cymatics';

    const paletteId = typeof input.paletteId === 'string' && input.paletteId.length > 0 && input.paletteId.length < 64
      ? input.paletteId.replace(/[^a-zA-Z0-9_-]/g, '')
      : DEFAULT_VISUAL_SETTINGS.paletteId;

    const activeSystems = {
      melodic: input.activeSystems?.melodic !== false,
      percussion: input.activeSystems?.percussion !== false,
      harmonic: input.activeSystems?.harmonic !== false,
      bass: input.activeSystems?.bass !== false
    };

    const postProcessing = {
      trails: input.postProcessing?.trails !== false,
      trailPersistence: typeof input.postProcessing?.trailPersistence === 'number'
        ? Math.max(0.5, Math.min(0.98, input.postProcessing.trailPersistence))
        : DEFAULT_VISUAL_SETTINGS.postProcessing.trailPersistence,
      bloomGlow: input.postProcessing?.bloomGlow !== false,
      chromaticFlash: Boolean(input.postProcessing?.chromaticFlash),
      filmGrain: Boolean(input.postProcessing?.filmGrain)
    };

    let safeCustomUrl: string | null = null;
    if (typeof input.logo?.customUrl === 'string') {
      const url = input.logo.customUrl.trim();
      // Only allow safe data URLs or relative asset paths
      if (url.startsWith('data:image/') || url.startsWith('/') || url.startsWith('https://')) {
        safeCustomUrl = url;
      }
    }

    const logo = {
      enabled: Boolean(input.logo?.enabled),
      opacity: typeof input.logo?.opacity === 'number'
        ? Math.max(0, Math.min(1, input.logo.opacity))
        : DEFAULT_VISUAL_SETTINGS.logo.opacity,
      size: typeof input.logo?.size === 'number'
        ? Math.max(80, Math.min(600, input.logo.size))
        : DEFAULT_VISUAL_SETTINGS.logo.size,
      customUrl: safeCustomUrl,
      pulseWithBass: input.logo?.pulseWithBass !== false,
      blendMode: input.logo?.blendMode || 'screen',
      featherEdge: input.logo?.featherEdge !== false,
      haloGlow: input.logo?.haloGlow !== false
    };

    const background = {
      textureEnabled: input.background?.textureEnabled !== false,
      textureOpacity: typeof input.background?.textureOpacity === 'number'
        ? Math.max(0, Math.min(1, input.background.textureOpacity))
        : DEFAULT_VISUAL_SETTINGS.background.textureOpacity
    };

    const flanks = {
      stereoTowers: input.flanks?.stereoTowers !== false,
      horizontalOscilloscope: input.flanks?.horizontalOscilloscope !== false,
      constellations: input.flanks?.constellations !== false
    };

    let customColors = undefined;
    if (input.customColors && typeof input.customColors === 'object') {
      const isHex = (c: unknown) => typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c);
      customColors = {
        melodic: isHex(input.customColors.melodic) ? input.customColors.melodic : '#22d3ee',
        harmonic: isHex(input.customColors.harmonic) ? input.customColors.harmonic : '#a5f3fc',
        bass: isHex(input.customColors.bass) ? input.customColors.bass : '#818cf8',
        percussion: isHex(input.customColors.percussion) ? input.customColors.percussion : '#fbbf24',
        accent: isHex(input.customColors.accent) ? input.customColors.accent : '#ffffff'
      };
    }

    return {
      sensitivity,
      intensity,
      smoothing,
      symmetryFolds,
      symmetryMode,
      activeSystems,
      paletteId,
      customColors,
      preset,
      postProcessing,
      logo,
      background,
      flanks
    };
  } catch (e) {
    console.warn('Validation error for visual settings:', e);
    return null;
  }
}

export function restoreDefaultSettings(): VisualSettings {
  return JSON.parse(JSON.stringify(DEFAULT_VISUAL_SETTINGS));
}

export function loadActiveSettings(): Partial<VisualSettings> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_SETTINGS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return validateVisualSettings(parsed);
  } catch (e) {
    console.warn('Failed to load active settings from localStorage:', e);
    return null;
  }
}

export function saveActiveSettings(settings: VisualSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to persist active settings:', e);
  }
}

export function loadSavedPresets(): SavedPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_PRESETS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const list: SavedPreset[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const validatedSettings = validateVisualSettings(item.settings);
      if (!validatedSettings) continue;
      list.push({
        id: String(item.id || `preset_${Date.now()}`),
        name: String(item.name || 'Unnamed Preset').slice(0, 50),
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        settings: validatedSettings,
        isFavorite: Boolean(item.isFavorite)
      });
    }
    return list;
  } catch (e) {
    console.warn('Failed to load saved presets:', e);
    return [];
  }
}

export function saveUserPreset(name: string, settings: VisualSettings): SavedPreset[] {
  try {
    const existing = loadSavedPresets();
    const validated = validateVisualSettings(settings) || DEFAULT_VISUAL_SETTINGS;
    const cleanName = name.trim().slice(0, 40) || `Preset ${existing.length + 1}`;

    const newPreset: SavedPreset = {
      id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      createdAt: Date.now(),
      settings: JSON.parse(JSON.stringify(validated)),
      isFavorite: false
    };

    const updated = [newPreset, ...existing];
    localStorage.setItem(STORAGE_KEYS.SAVED_PRESETS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to save user preset:', e);
    return loadSavedPresets();
  }
}

export function renameUserPreset(id: string, newName: string): SavedPreset[] {
  try {
    const existing = loadSavedPresets();
    const cleanName = newName.trim().slice(0, 40);
    if (!cleanName) return existing;

    const updated = existing.map(p => (p.id === id ? { ...p, name: cleanName } : p));
    localStorage.setItem(STORAGE_KEYS.SAVED_PRESETS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to rename preset:', e);
    return loadSavedPresets();
  }
}

export function duplicateUserPreset(id: string): SavedPreset[] {
  try {
    const existing = loadSavedPresets();
    const target = existing.find(p => p.id === id);
    if (!target) return existing;

    const duplicate: SavedPreset = {
      id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `${target.name} (Copy)`.slice(0, 40),
      createdAt: Date.now(),
      settings: JSON.parse(JSON.stringify(target.settings)),
      isFavorite: false
    };

    const updated = [duplicate, ...existing];
    localStorage.setItem(STORAGE_KEYS.SAVED_PRESETS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to duplicate preset:', e);
    return loadSavedPresets();
  }
}

export function toggleFavoritePreset(id: string): SavedPreset[] {
  try {
    const existing = loadSavedPresets();
    const updated = existing.map(p => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
    localStorage.setItem(STORAGE_KEYS.SAVED_PRESETS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to toggle favorite on preset:', e);
    return loadSavedPresets();
  }
}

export function deleteUserPreset(id: string): SavedPreset[] {
  try {
    const existing = loadSavedPresets();
    const updated = existing.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.SAVED_PRESETS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to delete user preset:', e);
    return loadSavedPresets();
  }
}

/**
 * Exports one or all presets as versioned JSON.
 */
export function exportPresetsJson(targetPreset?: SavedPreset): string {
  const presetsToExport = targetPreset ? [targetPreset] : loadSavedPresets();
  const schema: PresetExportSchemaV1 = {
    schemaVersion: 1,
    generator: 'Synchro Stage Engine',
    exportedAt: Date.now(),
    presets: presetsToExport
  };
  return JSON.stringify(schema, null, 2);
}

/**
 * Safely imports presets from a JSON string.
 * Validates schema, checks fields, and prevents duplicate IDs.
 */
export function importPresetsFromJson(jsonStr: string): { success: boolean; count: number; error?: string } {
  try {
    if (!jsonStr || jsonStr.length > 2_000_000) {
      return { success: false, count: 0, error: 'File size exceeds limit' };
    }

    const parsed = JSON.parse(jsonStr);
    let rawList: unknown[] = [];

    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.presets)) {
        rawList = parsed.presets;
      } else if (Array.isArray(parsed)) {
        rawList = parsed;
      } else if (parsed.settings) {
        rawList = [parsed];
      }
    }

    if (rawList.length === 0) {
      return { success: false, count: 0, error: 'No valid preset records found in JSON' };
    }

    const validNewPresets: SavedPreset[] = [];
    for (const item of rawList) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      const settingsObj = rec.settings || rec;
      const validatedSettings = validateVisualSettings(settingsObj);
      if (!validatedSettings) continue;

      const rawName = typeof rec.name === 'string' ? rec.name : 'Imported Look';
      validNewPresets.push({
        id: `preset_imp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: rawName.trim().slice(0, 40) || 'Imported Look',
        createdAt: Date.now(),
        settings: validatedSettings,
        isFavorite: Boolean(rec.isFavorite)
      });
    }

    if (validNewPresets.length === 0) {
      return { success: false, count: 0, error: 'Could not validate any presets from file' };
    }

    const existing = loadSavedPresets();
    const merged = [...validNewPresets, ...existing];
    localStorage.setItem(STORAGE_KEYS.SAVED_PRESETS, JSON.stringify(merged));

    return { success: true, count: validNewPresets.length };
  } catch (e) {
    return { success: false, count: 0, error: (e as Error).message || 'Invalid JSON format' };
  }
}

/**
 * Compact, safe URL sharing encoder.
 * Encodes only visual configuration parameters (never microphone data or private assets).
 */
export function encodeSettingsToUrl(settings: VisualSettings): string {
  try {
    const validated = validateVisualSettings(settings) || DEFAULT_VISUAL_SETTINGS;
    // Strip large custom dataUrl to keep URL length web-friendly
    const shareableSettings: VisualSettings = {
      ...validated,
      logo: {
        ...validated.logo,
        customUrl: null // Stripped for share URL safety
      }
    };
    const jsonStr = JSON.stringify(shareableSettings);
    const base64 = btoa(encodeURIComponent(jsonStr));
    const url = new URL(window.location.href);
    url.hash = `config=${base64}`;
    return url.toString();
  } catch (e) {
    console.warn('Failed to encode settings to URL:', e);
    return window.location.href;
  }
}

/**
 * Safely decodes a shared configuration from the window URL or hash.
 */
export function decodeSettingsFromUrl(urlOrHash?: string): VisualSettings | null {
  try {
    let hash = '';
    if (urlOrHash) {
      const idx = urlOrHash.indexOf('#config=');
      if (idx !== -1) {
        hash = urlOrHash.slice(idx + 8);
      } else if (urlOrHash.startsWith('config=')) {
        hash = urlOrHash.slice(7);
      }
    } else if (typeof window !== 'undefined' && window.location.hash.startsWith('#config=')) {
      hash = window.location.hash.slice(8);
    }

    if (!hash) return null;

    const jsonStr = decodeURIComponent(atob(hash));
    const parsed = JSON.parse(jsonStr);
    return validateVisualSettings(parsed);
  } catch (e) {
    console.warn('Failed to decode settings from URL hash:', e);
    return null;
  }
}

// --- LOGO VAULT STORAGE ---

export function loadRecentLogos(): StoredLogo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECENT_LOGOS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load recent logos:', e);
    return [];
  }
}

export function saveRecentLogo(name: string, dataUrl: string): StoredLogo[] {
  try {
    const existing = loadRecentLogos();
    const filtered = existing.filter(l => l.dataUrl !== dataUrl);
    const newLogo: StoredLogo = {
      id: `logo_${Date.now()}`,
      name: name || 'Uploaded Emblem',
      dataUrl,
      createdAt: Date.now()
    };
    const updated = [newLogo, ...filtered].slice(0, 6);
    localStorage.setItem(STORAGE_KEYS.RECENT_LOGOS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to save recent logo:', e);
    return loadRecentLogos();
  }
}

export function deleteRecentLogo(id: string): StoredLogo[] {
  try {
    const existing = loadRecentLogos();
    const updated = existing.filter(l => l.id !== id);
    localStorage.setItem(STORAGE_KEYS.RECENT_LOGOS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to delete recent logo:', e);
    return loadRecentLogos();
  }
}
