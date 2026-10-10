import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VisualCanvas } from './components/VisualCanvas';
import { Header } from './components/Header';
import { AudioAnalysisPanel } from './components/AudioAnalysisPanel';
import { ControlPanel } from './components/ControlPanel';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { audioEngine } from './audio/AudioEngine';
import { VisualSettings, PerformanceMetrics } from './types/visual';
import { AudioFrameData, AudioPlaybackState } from './types/audio';
import { Mic, Radio, Tv, X } from 'lucide-react';
import { loadActiveSettings, saveActiveSettings } from './utils/storage';

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
    textureOpacity: 0.35
  },
  flanks: {
    stereoTowers: true,
    horizontalOscilloscope: true,
    constellations: true
  }
};

export const App: React.FC = () => {
  const [settings, setSettings] = useState<VisualSettings>(() => {
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBigScreenMode, setIsBigScreenMode] = useState(false);
  const [isMouseIdle, setIsMouseIdle] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Mouse idle timer for Big Screen Mode
  const mouseTimerRef = useRef<number | null>(null);

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
      if (e.key === 'Escape' && isBigScreenMode) {
        setIsBigScreenMode(false);
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
  }, [isBigScreenMode]);

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

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const startWithMic = async () => {
    setHasStarted(true);
    try {
      await audioEngine.startMicrophone();
    } catch {
      alert('Microphone access denied or unavailable.');
    }
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
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onToggleBigScreen={() => setIsBigScreenMode(true)}
        />
      )}

      {/* Left: Live Audio Signal Analysis HUD */}
      {!isBigScreenMode && showAnalysis && (
        <AudioAnalysisPanel
          data={latestAudioData}
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
              <button
                onClick={startWithMic}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-mono text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all hover:scale-[1.02]"
              >
                <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Start Live Stage Audio Input</span>
              </button>

              <button
                onClick={() => setHasStarted(true)}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl font-mono text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-all"
              >
                <span>Enter Directly (Upload File / Stage Config)</span>
              </button>
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
