import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VisualCanvas } from './components/VisualCanvas';
import { Header } from './components/Header';
import { AudioAnalysisPanel } from './components/AudioAnalysisPanel';
import { ControlPanel } from './components/ControlPanel';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { audioEngine } from './audio/AudioEngine';
import { VisualSettings, PerformanceMetrics } from './types/visual';
import { AudioFrameData, AudioPlaybackState } from './types/audio';
import { Mic, Radio, Tv, X, Music, Sparkles } from 'lucide-react';
import { loadActiveSettings, saveActiveSettings, decodeSettingsFromUrl } from './utils/storage';

const INITIAL_SETTINGS: VisualSettings = {
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
    chromaticFlash: true,
    filmGrain: true
  },
  logo: {
    enabled: true,
    opacity: 0.35,
    size: 260,
    customUrl: null,
    pulseWithBass: true
  },
  background: {
    textureEnabled: true,
    textureOpacity: 0.35,
    mode: 'obsidian',
    neonHighlight: true
  },
  flanks: {
    stereoTowers: true,
    horizontalOscilloscope: true,
    constellations: true
  }
};

export const App: React.FC = () => {
  const [settings, setSettings] = useState<VisualSettings>(() => {
    const urlConfig = decodeSettingsFromUrl();
    if (urlConfig) {
      return {
        ...INITIAL_SETTINGS,
        ...urlConfig,
        activeSystems: { ...INITIAL_SETTINGS.activeSystems, ...(urlConfig.activeSystems || {}) },
        postProcessing: { ...INITIAL_SETTINGS.postProcessing, ...(urlConfig.postProcessing || {}) },
        logo: { ...INITIAL_SETTINGS.logo, ...(urlConfig.logo || {}) },
        background: { ...INITIAL_SETTINGS.background, ...(urlConfig.background || {}) },
        flanks: { ...INITIAL_SETTINGS.flanks, ...(urlConfig.flanks || {}) }
      };
    }

    const saved = loadActiveSettings();
    if (saved) {
      return {
        ...INITIAL_SETTINGS,
        ...saved,
        activeSystems: { ...INITIAL_SETTINGS.activeSystems, ...(saved.activeSystems || {}) },
        postProcessing: { ...INITIAL_SETTINGS.postProcessing, ...(saved.postProcessing || {}) },
        logo: { ...INITIAL_SETTINGS.logo, ...(saved.logo || {}) },
        background: { ...INITIAL_SETTINGS.background, ...(saved.background || {}) },
        flanks: { ...INITIAL_SETTINGS.flanks, ...(saved.flanks || {}) }
      };
    }
    return INITIAL_SETTINGS;
  });

  // Auto-persist active session settings to localStorage
  useEffect(() => {
    saveActiveSettings(settings);
  }, [settings]);

  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>(audioEngine.getPlaybackState());
  // UI state
  const [showControls, setShowControls] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [showPerf, setShowPerf] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBigScreenMode, setIsBigScreenMode] = useState(false);
  const [isMouseIdle, setIsMouseIdle] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Mouse idle timer for Big Screen Mode
  const mouseTimerRef = useRef<number | null>(null);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Toggle Futuristic Jet Black Mode
  const toggleJetBlack = useCallback(() => {
    setSettings(prev => {
      const nextMode = prev.background?.mode === 'jet-black' ? 'obsidian' : 'jet-black';
      return {
        ...prev,
        background: {
          ...prev.background,
          mode: nextMode,
          textureEnabled: nextMode !== 'jet-black'
        }
      };
    });
  }, []);

  useEffect(() => {
    const handleMouseMove = () => {
      setIsMouseIdle(false);
      if (mouseTimerRef.current !== null) {
        window.clearTimeout(mouseTimerRef.current);
      }
      if (isBigScreenMode) {
        mouseTimerRef.current = window.setTimeout(() => {
          setIsMouseIdle(true);
        }, 2200);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not capture keyboard shortcuts if focused on form elements
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === 'Escape' && isBigScreenMode) {
        setIsBigScreenMode(false);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setIsBigScreenMode(prev => !prev);
      } else if (e.code === 'Space') {
        e.preventDefault();
        audioEngine.togglePlayPause();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setShowTimeline(prev => !prev);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        audioEngine.skipBy(-5);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        audioEngine.skipBy(5);
      } else if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        audioEngine.skipBy(-10);
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        audioEngine.skipBy(10);
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        toggleJetBlack();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      if (mouseTimerRef.current !== null) {
        window.clearTimeout(mouseTimerRef.current);
      }
    };
  }, [isBigScreenMode, toggleFullscreen]);

  // Latest DSP frame data for React UI (throttled to ~20fps to keep DOM fast)
  const [latestAudioData, setLatestAudioData] = useState<AudioFrameData | null>(null);
  const [perfMetrics, setPerfMetrics] = useState<PerformanceMetrics | null>(null);
  const lastHudUpdateRef = useRef(0);

  // Subscribe to audio engine playback state
  useEffect(() => {
    const unsubscribe = audioEngine.subscribeState(state => {
      setPlaybackState(state);
    });
    return () => unsubscribe();
  }, []);

  // Callback from VisualCanvas RAF loop
  const handleAudioFrame = useCallback((data: AudioFrameData) => {
    const now = performance.now();
    // Throttle React state update to ~25 FPS to prevent React render overhead
    if (now - lastHudUpdateRef.current > 40) {
      setLatestAudioData(data);
      lastHudUpdateRef.current = now;
    }
  }, []);

  // Callback for performance metrics
  const handlePerfUpdate = useCallback((metrics: PerformanceMetrics) => {
    setPerfMetrics(metrics);
  }, []);

  const startWithMic = async () => {
    setHasStarted(true);
    try {
      await audioEngine.startMicrophone();
    } catch {
      alert('Microphone access denied or unavailable.');
    }
  };

  const startWithDemo = async () => {
    setHasStarted(true);
    await audioEngine.startDemo();
  };

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden bg-[#040508] text-white font-sans select-none ${
        isBigScreenMode && isMouseIdle ? 'cursor-none' : ''
      }`}
    >
      {/* Full-screen Generative Canvas Engine */}
      <VisualCanvas
        settings={settings}
        onAudioFrame={handleAudioFrame}
        onPerformanceUpdate={handlePerfUpdate}
      />

      {/* Big Screen Mode Floating Exit Button */}
      {isBigScreenMode && (
        <div
          className={`fixed top-6 right-6 z-50 transition-opacity duration-300 ${
            isMouseIdle ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <button
            onClick={() => setIsBigScreenMode(false)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md border border-cyan-400/40 text-xs font-mono text-cyan-200 hover:text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
          >
            <Tv className="w-3.5 h-3.5 text-cyan-400" />
            <span>Exit Big Screen Mode (Esc)</span>
            <X className="w-3.5 h-3.5 text-white/50 ml-1" />
          </button>
        </div>
      )}

      {/* Top Navigation Bar (Hidden in Big Screen Mode) */}
      {!isBigScreenMode && (
        <Header
          playbackState={playbackState}
          showControls={showControls}
          setShowControls={setShowControls}
          showAnalysis={showAnalysis}
          setShowAnalysis={setShowAnalysis}
          showPerf={showPerf}
          setShowPerf={setShowPerf}
          showTimeline={showTimeline}
          setShowTimeline={setShowTimeline}
          isJetBlack={settings.background?.mode === 'jet-black'}
          onToggleJetBlack={toggleJetBlack}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onToggleBigScreen={() => setIsBigScreenMode(true)}
        />
      )}

      {/* Left: Live Audio Signal Analysis HUD */}
      {!isBigScreenMode && showAnalysis && (
        <AudioAnalysisPanel
          data={latestAudioData}
          playbackState={playbackState}
          onClose={() => setShowAnalysis(false)}
        />
      )}

      {/* Right: Instrument Control & Preset Panel */}
      {!isBigScreenMode && showControls && (
        <ControlPanel
          settings={settings}
          onUpdateSettings={setSettings}
          onToggleBigScreen={() => setIsBigScreenMode(true)}
          onClose={() => setShowControls(false)}
        />
      )}

      {/* Bottom Left: Diagnostics & FPS Monitor */}
      {!isBigScreenMode && showPerf && (
        <PerformanceMonitor
          metrics={perfMetrics}
          sampleRate={latestAudioData?.sampleRate}
          onClose={() => setShowPerf(false)}
        />
      )}

      {/* Splash Modal on First Load (Solves Browser AudioContext Autoplay Restriction) */}
      {!hasStarted && !playbackState.isPlaying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="max-w-md w-full bg-[#07090f] border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.15)] text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <Radio className="w-7 h-7 text-cyan-400 animate-pulse" />
            </div>

            <h1 className="text-2xl font-bold tracking-widest font-['Space_Grotesk'] text-white">
              SYNCHRO
            </h1>
            <p className="text-xs font-mono text-cyan-300 tracking-wider mt-1 mb-4 uppercase">
              Real-Time Music-to-Visual Stage Engine
            </p>

            <p className="text-xs text-white/70 leading-relaxed font-sans mb-6">
              Connect your stage microphone or line-in feed to drive sacred geometry, cymatic nodal resonance, and luminous spectral visualizers in real time.
            </p>

            <div className="flex flex-col gap-2.5">
              {/* Option 1: Instant Demo Synth (Zero setup required) */}
              <button
                onClick={startWithDemo}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-mono text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 shadow-[0_0_24px_rgba(6,182,212,0.3)] transition-all hover:scale-[1.02]"
              >
                <Music className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>Launch Demo Synth (Instant Audio & Visuals)</span>
                <Sparkles className="w-3.5 h-3.5 text-cyan-300 ml-1" />
              </button>

              {/* Option 2: Live Stage Microphone / Line-In */}
              <button
                onClick={startWithMic}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl font-mono text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 transition-all hover:scale-[1.01]"
              >
                <Mic className="w-4 h-4 text-emerald-400" />
                <span>Connect Stage Mic / Line-In Audio</span>
              </button>

              {/* Option 3: Manual Enter */}
              <button
                onClick={() => setHasStarted(true)}
                className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl font-mono text-xs font-medium bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-all"
              >
                <span>Enter Directly (Upload Audio File / Manual Config)</span>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono text-white/40">
              <span>Shortcuts:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300">Space</kbd>
              <span>Play</span>
              <span>•</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300">T</kbd>
              <span>Seek Bar</span>
              <span>•</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300">N</kbd>
              <span>Jet Black</span>
              <span>•</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300">←/→</kbd>
              <span>±5s</span>
              <span>•</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300">F</kbd>
              <span>Fullscreen</span>
              <span>•</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300">B</kbd>
              <span>Cinema Mode</span>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-1.5 text-[10px] font-mono text-white/40">
              <span>Web Audio DSP • 60 FPS Canvas 2D • Stage & Big Screen Exhibition</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
