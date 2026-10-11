import test from 'node:test';
import assert from 'node:assert/strict';

// Logic tests for Audio Playback Seeking & Timeline Scrubbing

function clampSeekTime(targetSeconds, duration) {
  const max = duration > 0 ? duration : Infinity;
  return Math.max(0, Math.min(targetSeconds, max));
}

function seekPercentToSeconds(fraction, duration) {
  const clampedFraction = Math.max(0, Math.min(1, fraction));
  return clampedFraction * duration;
}

function skipTime(currentTime, deltaSeconds, duration) {
  return clampSeekTime(currentTime + deltaSeconds, duration);
}

function demoStepFromTime(timeSeconds, loopDuration = 8.0, totalSteps = 64) {
  const normalized = Math.max(0, timeSeconds % loopDuration);
  return Math.floor((normalized / loopDuration) * totalSteps);
}

function formatDetailedTime(secs) {
  if (isNaN(secs) || secs < 0) return '00:00.0';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  const ms = Math.floor((secs % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
}

test('clampSeekTime clamps negative times to 0 and exceeds to duration', () => {
  const duration = 180; // 3 minutes
  assert.strictEqual(clampSeekTime(-15, duration), 0, 'Negative seek should clamp to 0');
  assert.strictEqual(clampSeekTime(0, duration), 0, 'Zero should remain 0');
  assert.strictEqual(clampSeekTime(75.5, duration), 75.5, 'Valid intermediate timestamp preserved');
  assert.strictEqual(clampSeekTime(250, duration), 180, 'Out of bounds seek should clamp to track duration');
});

test('seekPercentToSeconds maps cue points accurately', () => {
  const duration = 200; // 200 seconds
  assert.strictEqual(seekPercentToSeconds(0, duration), 0, '0% is track start');
  assert.strictEqual(seekPercentToSeconds(0.25, duration), 50, '25% is quarter duration');
  assert.strictEqual(seekPercentToSeconds(0.5, duration), 100, '50% is midpoint');
  assert.strictEqual(seekPercentToSeconds(0.75, duration), 150, '75% is drop point');
  assert.strictEqual(seekPercentToSeconds(1.0, duration), 200, '100% is track end');
  assert.strictEqual(seekPercentToSeconds(1.5, duration), 200, 'Over 100% clamps to track end');
  assert.strictEqual(seekPercentToSeconds(-0.2, duration), 0, 'Under 0% clamps to 0');
});

test('skipTime adds or subtracts delta with boundary protections', () => {
  const duration = 100;
  assert.strictEqual(skipTime(20, -10, duration), 10, 'Skip backward -10s from 20s = 10s');
  assert.strictEqual(skipTime(5, -10, duration), 0, 'Skip backward -10s from 5s clamps at 0s');
  assert.strictEqual(skipTime(95, 10, duration), 100, 'Skip forward +10s from 95s clamps at duration 100s');
  assert.strictEqual(skipTime(50, 15, duration), 65, 'Skip forward +15s from 50s = 65s');
});

test('demoStepFromTime calculates corresponding 16th note step in 4-bar loop', () => {
  const loopDuration = 8.0; // 64 steps
  assert.strictEqual(demoStepFromTime(0, loopDuration), 0, '0.0s is step 0 (Bar 1 Beat 1)');
  assert.strictEqual(demoStepFromTime(2.0, loopDuration), 16, '2.0s is step 16 (Bar 2 Beat 1)');
  assert.strictEqual(demoStepFromTime(4.0, loopDuration), 32, '4.0s is step 32 (Bar 3 Beat 1)');
  assert.strictEqual(demoStepFromTime(6.0, loopDuration), 48, '6.0s is step 48 (Bar 4 Beat 1)');
  assert.strictEqual(demoStepFromTime(8.0, loopDuration), 0, '8.0s wraps to step 0');
});

test('formatDetailedTime formats minutes, seconds and tenths accurately', () => {
  assert.strictEqual(formatDetailedTime(0), '00:00.0');
  assert.strictEqual(formatDetailedTime(65.4), '01:05.4');
  assert.strictEqual(formatDetailedTime(183.9), '03:03.9');
  assert.strictEqual(formatDetailedTime(-5), '00:00.0');
});
