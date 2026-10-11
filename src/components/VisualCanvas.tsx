import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { VisualEngine } from '../visuals/VisualEngine';
import { VisualSettings, PerformanceMetrics } from '../types/visual';
import { AudioFrameData } from '../types/audio';

interface VisualCanvasProps {
  settings: VisualSettings;
  onAudioFrame?: (data: AudioFrameData) => void;
  onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
}

export const VisualCanvas: React.FC<VisualCanvasProps> = ({
  settings,
  onAudioFrame,
  onPerformanceUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const visualEngineRef = useRef<VisualEngine | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Performance tracking
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  const currentFpsRef = useRef(60);
  const lastFrameTimeRef = useRef(performance.now());

  // Store latest props in refs to avoid recreating RAF
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const onAudioFrameRef = useRef(onAudioFrame);
  onAudioFrameRef.current = onAudioFrame;

  const onPerfRef = useRef(onPerformanceUpdate);
  onPerfRef.current = onPerformanceUpdate;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize visual engine
    visualEngineRef.current = new VisualEngine(canvas);

    // Handle high DPI resizing
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Main 60 FPS requestAnimationFrame loop
    const renderLoop = (timeMs: number) => {
      const frameStart = performance.now();

      // 1. Audio DSP Analysis
      const audioData = audioEngine.analyzeFrame();
      // Throttle React HUD updates to ~12 FPS (every 5th frame) to keep CPU focused on 60 FPS Canvas rendering!
      if (onAudioFrameRef.current && frameCountRef.current % 5 === 0) {
        onAudioFrameRef.current(audioData);
      }

      // 2. Visual Canvas Rendering
      const renderStart = performance.now();
      if (visualEngineRef.current) {
        visualEngineRef.current.render(audioData, settingsRef.current, timeMs);
      }
      const renderDuration = performance.now() - renderStart;

      // 3. FPS & Performance Tracking
      frameCountRef.current++;
      const timeSinceLastFps = timeMs - lastFpsTimeRef.current;
      if (timeSinceLastFps >= 500) {
        currentFpsRef.current = Math.round((frameCountRef.current * 1000) / timeSinceLastFps);
        frameCountRef.current = 0;
        lastFpsTimeRef.current = timeMs;

        if (onPerfRef.current) {
          onPerfRef.current({
            fps: currentFpsRef.current,
            renderTimeMs: Math.round(renderDuration * 10) / 10,
            analysisTimeMs: Math.round(audioData.analysisTimeMs * 10) / 10,
            totalLatencyEstimateMs: Math.round((audioData.analysisTimeMs + renderDuration + 16.6) * 10) / 10,
            droppedFrames: Math.max(0, 60 - currentFpsRef.current)
          });
        }
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="synchro-canvas"
      className={`fixed inset-0 w-full h-full block z-0 ${settings.background?.mode === 'jet-black' ? 'bg-black' : 'bg-[#040508]'} cursor-crosshair select-none`}
    />
  );
};
