import React from 'react';
import { PerformanceMetrics } from '../types/visual';
import { Cpu, X } from 'lucide-react';

interface PerformanceMonitorProps {
  metrics: PerformanceMetrics | null;
  sampleRate?: number;
  onClose: () => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  metrics,
  sampleRate = 48000,
  onClose
}) => {
  if (!metrics) return null;

  return (
    <div className="fixed bottom-6 left-6 z-20 w-80 bg-[#06080e]/92 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-4 text-white font-mono select-none text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold tracking-wider uppercase text-white/90 text-[11px]">
            Engine Timing & Diagnostics
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white px-1 py-0.5 rounded hover:bg-white/10"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2 mb-3">
        {/* FPS */}
        <div className="flex justify-between items-center py-1 px-2 rounded bg-white/5">
          <span className="text-white/60">Display Render FPS</span>
          <span
            className={`font-bold ${
              metrics.fps >= 55 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {metrics.fps} FPS
          </span>
        </div>

        {/* Canvas Render Duration */}
        <div className="flex justify-between items-center py-1 px-2 rounded bg-white/5">
          <span className="text-white/60">Canvas 2D Frame Render</span>
          <span className="font-bold text-cyan-300">
            {metrics.renderTimeMs.toFixed(1)} ms
          </span>
        </div>

        {/* Audio Analysis DSP Duration */}
        <div className="flex justify-between items-center py-1 px-2 rounded bg-white/5">
          <span className="text-white/60">Audio DSP Analysis Frame</span>
          <span className="font-bold text-purple-300">
            {metrics.analysisTimeMs.toFixed(1)} ms
          </span>
        </div>

        {/* Measured In-Engine Processing Time */}
        <div className="flex justify-between items-center py-1 px-2 rounded bg-white/5">
          <span className="text-white/60">Total In-Engine Processing</span>
          <span className="font-bold text-amber-300">
            {(metrics.renderTimeMs + metrics.analysisTimeMs).toFixed(1)} ms
          </span>
        </div>

        {/* Audio Context Sample Rate */}
        <div className="flex justify-between items-center py-1 px-2 rounded bg-white/5">
          <span className="text-white/60">Web Audio Sample Rate</span>
          <span className="font-bold text-white/90">{sampleRate} Hz</span>
        </div>
      </div>

      {/* Latency Integrity Note */}
      <div className="p-2 rounded bg-white/5 border border-white/5 text-[10px] text-white/50 leading-relaxed">
        <span className="text-amber-400 font-semibold block mb-0.5">Honest Latency Note:</span>
        In-engine DSP & draw loop run in ~{(metrics.renderTimeMs + metrics.analysisTimeMs).toFixed(1)}ms. End-to-end microphone latency also includes OS audio buffer (~10-25ms) and display frame presentation interval (~16.6ms).
      </div>
    </div>
  );
};
