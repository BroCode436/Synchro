import React, { useRef } from 'react';
import {
  Mic,
  MicOff,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Activity,
  Maximize2,
  Minimize2,
  Radio,
  Tv
} from 'lucide-react';
import { AudioPlaybackState } from '../types/audio';
import { audioEngine } from '../audio/AudioEngine';

interface HeaderProps {
  playbackState: AudioPlaybackState;
  showControls: boolean;
  setShowControls: (show: boolean) => void;
  showAnalysis: boolean;
  setShowAnalysis: (show: boolean) => void;
  showPerf: boolean;
  setShowPerf: (show: boolean) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onToggleBigScreen: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  playbackState,
  showControls,
  setShowControls,
  showAnalysis,
  setShowAnalysis,
  showPerf,
  setShowPerf,
  isFullscreen,
  onToggleFullscreen,
  onToggleBigScreen
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleStartMic = async () => {
    try {
      if (playbackState.isMicActive) {
        audioEngine.stopMicrophone();
      } else {
        await audioEngine.startMicrophone();
      }
    } catch (err) {
      alert('Could not access microphone or audio input. Please ensure microphone permissions are granted.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      audioEngine.loadAudioFile(file);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-3.5 bg-[#06080d]/85 backdrop-blur-md border-b border-white/10 select-none">
      {/* Brand & Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <div className="absolute inset-0 rounded-lg bg-cyan-400/20 blur-sm -z-10" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-['Space_Grotesk'] text-lg font-bold tracking-widest text-white">
                SYNCHRO
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono tracking-wider font-semibold rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                STAGE ENGINE
              </span>
            </div>
            <p className="text-[11px] font-mono text-white/40 tracking-tight">
              Real-Time Music-to-Visual Instrument
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="hidden md:flex items-center gap-2 pl-4 border-l border-white/10">
          <div
            className={`w-2 h-2 rounded-full ${
              playbackState.isMicActive || (playbackState.sourceType === 'file' && playbackState.isPlaying)
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : 'bg-amber-400/80 shadow-[0_0_6px_#f59e0b]'
            }`}
          />
          <span className="text-[11px] font-mono uppercase tracking-wider text-white/70">
            {playbackState.isMicActive
              ? 'Live Stage Input (Active)'
              : playbackState.sourceType === 'file'
              ? (playbackState.isPlaying ? `Playing: ${playbackState.fileName}` : `Paused: ${playbackState.fileName}`)
              : 'Awaiting Audio (Click Mic / Stage Input)'}
          </span>
        </div>
      </div>

      {/* Input Sources & Playback Controls */}
      <div className="flex items-center gap-2">
        {/* Live Stage Input (Microphone / Line-In) Button */}
        <button
          onClick={handleStartMic}
          title="Toggle Live Stage Microphone or Line-In Audio Input"
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
            playbackState.isMicActive
              ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.3)] font-semibold'
              : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'
          }`}
        >
          {playbackState.isMicActive ? (
            <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          ) : (
            <MicOff className="w-3.5 h-3.5 text-white/40" />
          )}
          <span>{playbackState.isMicActive ? 'Stage Mic Active' : 'Live Stage Input'}</span>
        </button>

        {/* File Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Upload audio track (MP3, WAV, FLAC, OGG)"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
            playbackState.sourceType === 'file' && playbackState.fileName
              ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-300'
              : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'
          }`}
        >
          <Upload className="w-3.5 h-3.5 text-indigo-400" />
          <span className="max-w-[120px] truncate">
            {playbackState.fileName ? 'Change File' : 'Upload File'}
          </span>
        </button>

        {/* Transport Controls (Play / Pause / Reset) */}
        <div className="flex items-center gap-1 pl-2 border-l border-white/10">
          <button
            onClick={() => audioEngine.togglePlayPause()}
            title={playbackState.isPlaying ? 'Pause' : 'Play'}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all"
          >
            {playbackState.isPlaying ? (
              <Pause className="w-4 h-4 text-amber-300" />
            ) : (
              <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            )}
          </button>
          <button
            onClick={() => audioEngine.resetPlayback()}
            title="Reset Playback / Track Position"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Timecode display for file */}
          {playbackState.sourceType === 'file' && playbackState.duration > 0 && (
            <span className="text-[11px] font-mono text-white/50 pl-2">
              {formatTime(playbackState.currentTime)} / {formatTime(playbackState.duration)}
            </span>
          )}
        </div>
      </div>

      {/* Panels and View Toggles */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowAnalysis(!showAnalysis)}
          title="Toggle Live Audio Analysis HUD"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all ${
            showAnalysis
              ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
              : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Analysis</span>
        </button>

        <button
          onClick={() => setShowControls(!showControls)}
          title="Toggle Visual Engine Controls"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all ${
            showControls
              ? 'bg-purple-500/20 border-purple-400/40 text-purple-300'
              : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Controls</span>
        </button>

        <button
          onClick={() => setShowPerf(!showPerf)}
          title="Toggle Diagnostics & FPS"
          className={`px-2 py-1.5 rounded-lg text-xs font-mono border transition-all ${
            showPerf
              ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
              : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
          }`}
        >
          FPS
        </button>

        <button
          onClick={onToggleFullscreen}
          title="Toggle Fullscreen"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={onToggleBigScreen}
          title="Big Screen / Cinema Exhibition Mode (Only Visuals)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/40 text-cyan-200 hover:border-cyan-400 hover:text-white shadow-[0_0_12px_rgba(6,182,212,0.2)] transition-all"
        >
          <Tv className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Big Screen</span>
        </button>
      </div>
    </header>
  );
};
