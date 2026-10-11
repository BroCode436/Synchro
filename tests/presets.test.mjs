import test from 'node:test';
import assert from 'node:assert/strict';

// Import pure validator logic for Node.js test environment
const DEFAULT_SETTINGS = {
  sensitivity: 1.15,
  intensity: 1.05,
  smoothing: 0.75,
  symmetryFolds: 6,
  symmetryMode: 'radial',
  activeSystems: { melodic: true, percussion: true, harmonic: true, bass: true },
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
    textureOpacity: 0.45,
    mode: 'obsidian',
    neonHighlight: true
  },
  flanks: { stereoTowers: true, horizontalOscilloscope: true, constellations: true }
};

function validateVisualSettings(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const input = raw;

  const sensitivity = typeof input.sensitivity === 'number' && !isNaN(input.sensitivity)
    ? Math.max(0.2, Math.min(3.0, input.sensitivity))
    : DEFAULT_SETTINGS.sensitivity;

  const intensity = typeof input.intensity === 'number' && !isNaN(input.intensity)
    ? Math.max(0.2, Math.min(3.0, input.intensity))
    : DEFAULT_SETTINGS.intensity;

  const smoothing = typeof input.smoothing === 'number' && !isNaN(input.smoothing)
    ? Math.max(0.0, Math.min(0.98, input.smoothing))
    : DEFAULT_SETTINGS.smoothing;

  const symmetryFolds = typeof input.symmetryFolds === 'number' && !isNaN(input.symmetryFolds)
    ? Math.max(2, Math.min(16, Math.round(input.symmetryFolds)))
    : DEFAULT_SETTINGS.symmetryFolds;

  const symmetryMode = ['radial', 'bilateral'].includes(input.symmetryMode)
    ? input.symmetryMode
    : 'radial';

  const preset = ['cymatics', 'celestial', 'kaleidoscope', 'sketch', 'minimal'].includes(input.preset)
    ? input.preset
    : 'cymatics';

  const paletteId = typeof input.paletteId === 'string' && input.paletteId.length > 0 && input.paletteId.length < 64
    ? input.paletteId.replace(/[^a-zA-Z0-9_-]/g, '')
    : DEFAULT_SETTINGS.paletteId;

  const background = {
    textureEnabled: input.background?.textureEnabled !== false,
    textureOpacity: typeof input.background?.textureOpacity === 'number'
      ? Math.max(0, Math.min(1, input.background.textureOpacity))
      : DEFAULT_SETTINGS.background.textureOpacity,
    mode: input.background?.mode === 'jet-black' ? 'jet-black' : 'obsidian',
    neonHighlight: input.background?.neonHighlight !== false
  };

  return {
    ...DEFAULT_SETTINGS,
    sensitivity,
    intensity,
    smoothing,
    symmetryFolds,
    symmetryMode,
    preset,
    paletteId,
    background
  };
}

test('validateVisualSettings clamps out-of-range sensitivity and intensity', () => {
  const result = validateVisualSettings({
    sensitivity: 999, // Should clamp to 3.0
    intensity: -50,   // Should clamp to 0.2
    symmetryFolds: 100 // Should clamp to 16
  });

  assert.strictEqual(result.sensitivity, 3.0);
  assert.strictEqual(result.intensity, 0.2);
  assert.strictEqual(result.symmetryFolds, 16);
});

test('validateVisualSettings handles jet-black mode and preserves neonHighlight', () => {
  const jetBlackConfig = validateVisualSettings({
    background: {
      mode: 'jet-black',
      textureEnabled: false,
      neonHighlight: true
    }
  });

  assert.strictEqual(jetBlackConfig.background.mode, 'jet-black');
  assert.strictEqual(jetBlackConfig.background.textureEnabled, false);
  assert.strictEqual(jetBlackConfig.background.neonHighlight, true);

  const defaultBg = validateVisualSettings({});
  assert.strictEqual(defaultBg.background.mode, 'obsidian');
  assert.strictEqual(defaultBg.background.textureEnabled, true);
});

test('validateVisualSettings rejects invalid types and replaces with safe defaults', () => {
  const result = validateVisualSettings({
    preset: 'malicious_unknown_script',
    symmetryMode: 'invalid_mode',
    paletteId: 'bad<script>alert(1)</script>'
  });

  assert.strictEqual(result.preset, 'cymatics');
  assert.strictEqual(result.symmetryMode, 'radial');
  assert.strictEqual(result.paletteId, 'badscriptalert1script');
});

test('validateVisualSettings returns null for non-object inputs', () => {
  assert.strictEqual(validateVisualSettings(null), null);
  assert.strictEqual(validateVisualSettings(undefined), null);
  assert.strictEqual(validateVisualSettings('string'), null);
  assert.strictEqual(validateVisualSettings(123), null);
});

test('URL encoding and decoding round-trip preserves valid configuration', () => {
  const original = {
    sensitivity: 1.8,
    intensity: 1.4,
    smoothing: 0.6,
    symmetryFolds: 8,
    symmetryMode: 'bilateral',
    preset: 'celestial',
    paletteId: 'neon-cyber'
  };

  const validated = validateVisualSettings(original);
  const jsonStr = JSON.stringify(validated);
  const encoded = Buffer.from(encodeURIComponent(jsonStr)).toString('base64');

  const decodedJson = decodeURIComponent(Buffer.from(encoded, 'base64').toString('utf8'));
  const decoded = validateVisualSettings(JSON.parse(decodedJson));

  assert.strictEqual(decoded.sensitivity, 1.8);
  assert.strictEqual(decoded.preset, 'celestial');
  assert.strictEqual(decoded.symmetryMode, 'bilateral');
  assert.strictEqual(decoded.symmetryFolds, 8);
});
