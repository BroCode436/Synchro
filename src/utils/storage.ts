import { VisualSettings } from '../types/visual';

export interface SavedPreset {
  id: string;
  name: string;
  createdAt: number;
  settings: VisualSettings;
}

export interface StoredLogo {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
}

const STORAGE_KEYS = {
  ACTIVE_SETTINGS: 'synchro_active_settings_v1',
  SAVED_PRESETS: 'synchro_saved_presets_v1',
  RECENT_LOGOS: 'synchro_recent_logos_v1'
};

export function loadActiveSettings(): Partial<VisualSettings> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_SETTINGS);
    if (!raw) return null;
    return JSON.parse(raw);
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
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load saved presets:', e);
    return [];
  }
}

export function saveUserPreset(name: string, settings: VisualSettings): SavedPreset[] {
  try {
    const existing = loadSavedPresets();
    const newPreset: SavedPreset = {
      id: `preset_${Date.now()}`,
      name: name.trim() || `Preset ${existing.length + 1}`,
      createdAt: Date.now(),
      settings: JSON.parse(JSON.stringify(settings))
    };
    const updated = [newPreset, ...existing];
    localStorage.setItem(STORAGE_KEYS.SAVED_PRESETS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to save user preset:', e);
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
    // Avoid exact duplicate dataUrls
    const filtered = existing.filter(l => l.dataUrl !== dataUrl);
    const newLogo: StoredLogo = {
      id: `logo_${Date.now()}`,
      name: name || 'Uploaded Emblem',
      dataUrl,
      createdAt: Date.now()
    };
    // Keep max 6 recent logos to respect localStorage quota
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
