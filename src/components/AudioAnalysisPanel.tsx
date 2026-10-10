import React from 'react';
import { AudioFrameData } from '../types/audio';
import { Zap, Volume2, Music2, Gauge, Info } from 'lucide-react';

interface AudioAnalysisPanelProps {
  data: AudioFrameData | null;
  onClose: () => void;
}

export const AudioAnalysisPanel: React.FC<AudioAnalysisPanelProps> = ({ data, onClose }) => {
  if (!data) return null;

  const bands = [
    { label: 'Sub-Bass', range: '20-80 Hz', value: data.subBass, color: '#a855f7' },
    { label: 'Bass', range: '80-250 Hz', value: data.bass, color: '#8b5cf6' },
    { label: 'Low-Mid', range: '250-800 Hz', value: data.lowMid, color: '#38bdf8' },
    { label: 'Mid', range: '800-2.5k Hz', value: data.mid, color: '#06b6d4' },
    { label: 'High-Mid', range: '2.5k-6k Hz', value: data.highMid, color: '#00ffcc' },
    { label: 'High', range: '6k-16k Hz', value: data.high, color: '#10b981' }
  ];

  return (
    <div className="fixed top-16 left-6 z-20 w-80 bg-[#06080e]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-4 text-white font-mono select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold tracking-wider uppercase text-white/90">
            Audio Signal Analysis
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      {/* Primary Metrics: BPM, RMS, Pitch */}
      <div className="grid grid-cols-3 gap-2 my-3">
        {/* BPM Estimate */}
        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] text-white/50 tracking-wider">EST. BPM</span>
          <div className="text-lg font-bold text-amber-300">
            {data.estimatedBpm ? data.estimatedBpm : '--'}
          </div>
          <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mt-1">
            <div
              className="bg-amber-400 h-full transition-all duration-150"
              style={{ width: `${Math.round(data.bpmConfidence * 100)}%` }}
            />
          </div>
        </div>

        {/* Amplitude / RMS */}
        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] text-white/50 tracking-wider">RMS LOUDNESS</span>
          <div className="text-lg font-bold text-cyan-300">
            {Math.round(data.loudnessEnvelope * 100)}%
          </div>
          <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mt-1">
            <div
              className="bg-cyan-400 h-full transition-all duration-75"
              style={{ width: `${Math.min(100, Math.round(data.loudnessEnvelope * 100))}%` }}
            />
          </div>
        </div>

        {/* Pitch / Note */}
        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] text-white/50 tracking-wider">EST. PITCH</span>
          <div className="text-lg font-bold text-emerald-300 truncate">
            {data.pitchNote ? data.pitchNote : '--'}
          </div>
          <span className="text-[9px] text-white/40 truncate">
            {data.estimatedPitch ? `${Math.round(data.estimatedPitch)} Hz` : 'No Signal'}
          </span>
        </div>
      </div>

      {/* Transient Onset Trigger Banner */}
      <div
        className={`flex items-center justify-between p-2 rounded-lg border transition-all duration-150 mb-3 ${
          data.isTransient
            ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
            : 'bg-white/5 border-white/10 text-white/50'
        }`}
      >
        <div className="flex items-center gap-2">
          <Zap
            className={`w-3.5 h-3.5 ${
              data.isTransient ? 'text-amber-300 fill-amber-300 animate-ping' : 'text-white/30'
            }`}
          />
          <span className="text-xs font-semibold tracking-wider">TRANSIENT ONSET</span>
        </div>
        <span className="text-[11px] font-bold">
          {data.isTransient ? `HIT: ${(data.transientStrength * 100).toFixed(0)}%` : 'IDLE'}
        </span>
      </div>

      {/* Frequency Bands Spectrum Bars */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-between items-center text-[10px] text-white/40 tracking-wider">
          <span>FREQUENCY ENERGY BANDS</span>
          <span>SPECTRAL CENTROID: {Math.round(data.spectralCentroid)} Hz</span>
        </div>

        {bands.map(band => (
          <div key={band.label} className="flex items-center gap-2 text-[11px]">
            <span className="w-16 text-white/60 text-[10px] truncate">{band.label}</span>
            <div className="flex-1 bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full transition-all duration-75"
                style={{
                  width: `${Math.min(100, Math.round(band.value * 100))}%`,
                  backgroundColor: band.color,
                  boxShadow: `0 0 8px ${band.color}`
                }}
              />
            </div>
            <span className="w-8 text-right text-[10px] text-white/50">
              {Math.round(band.value * 100)}%
            </span>
          </div>
        ))}
      </div>

      {/* Scientific Honesty Disclaimer */}
      <div className="p-2 rounded bg-cyan-950/30 border border-cyan-800/30 flex items-start gap-1.5 text-[10px] text-cyan-200/70 leading-relaxed">
        <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
        <p>
          Honest DSP labels: Band energy & transient flux approximate percussion & melodic activity. Architecture is modular for future AI stem isolation models.
        </p>
      </div>
    </div>
  );
};
