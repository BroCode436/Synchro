import React, { useRef, useState } from 'react';
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
  Tv,
  Music,
  Circle,
  Square,
  Video,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';
import { AudioPlaybackState } from '../types/audio';
import { audioEngine } from '../audio/AudioEngine';
import { sessionRecorder, RecordingStatus } from '../utils/recorder';
import { PlaybackTimeline } from './PlaybackTimeline';

interface HeaderProps {
  playbackState: AudioPlaybackState;
  showControls: boolean;
  setShowControls: (show: boolean) => void;
  showAnalysis: boolean;
  setShowAnalysis: (show: boolean) => void;
  showPerf: boolean;
  setShowPerf: (show: boolean) => void;
  showTimeline?: boolean;
  setShowTimeline?: (show: boolean | ((prev: boolean) => boolean)) => void;
  isJetBlack?: boolean;
  onToggleJetBlack?: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onToggleBigScreen: () => void;
}

export const HeaderComponent: React.FC<HeaderProps> = ({
  playbackState,
  showControls,
  setShowControls,
  showAnalysis,
  setShowAnalysis,
  showPerf,
  setShowPerf,
  showTimeline,
  setShowTimeline,
  isJetBlack,
  onToggleJetBlack,
  isFullscreen,
  onToggleFullscreen,
  onToggleBigScreen
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>({
    isRecording: false,
    durationSeconds: 0,
    hasAudio: false,
    mimeType: ''
  });
  const [recordNotice, setRecordNotice] = useState<string | null>(null);

  const handleToggleRecord = async () => {
    if (recordingStatus.isRecording) {
      const result = await sessionRecorder.stop();
      setRecordingStatus({ isRecording: false, durationSeconds: 0, hasAudio: false, mimeType: '' });
      if (result) {
        const a = document.createElement('a');
        a.href = result.url;
        a.download = result.filename;
        a.click();
        setRecordNotice(`Saved: ${result.filename} (${result.durationSeconds}s)`);
        setTimeout(() => setRecordNotice(null), 4500);
        setTimeout(() => URL.revokeObjectURL(result.url), 10000);
      }
    } else {
      const canvas = document.getElementById('synchro-canvas') as HTMLCanvasElement | null;
      if (!canvas) {
        alert('Could not find visualization canvas element.');
        return;
      }
      const res = await sessionRecorder.start(canvas, (status) => setRecordingStatus(status));
      if (!res.success) {
        alert(`Recording error: ${res.error || 'Failed to start recording'}`);
      } else {
        setRecordNotice(`Recording started (${res.hasAudio ? 'Video + Mixed Audio' : 'Video Only'})`);
        setTimeout(() => setRecordNotice(null), 3000);
      }
    }
  };

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

  const [internalShowTimeline, setInternalShowTimeline] = useState(false);
  const isTimelineOpen = showTimeline !== undefined ? showTimeline : internalShowTimeline;

  const toggleTimeline = () => {
    if (setShowTimeline) {
      setShowTimeline(prev => !prev);
    } else {
      setInternalShowTimeline(prev => !prev);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      audioEngine.loadAudioFile(file);
      if (setShowTimeline) {
        setShowTimeline(true);
      } else {
        setInternalShowTimeline(true);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-30 select-none">
      <header className="flex items-center justify-between px-6 py-3.5 bg-[#06080d]/85 backdrop-blur-md border-b border-white/10">
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
              playbackState.isMicActive
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : playbackState.isDemoActive
                ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse'
                : (playbackState.sourceType === 'file' && playbackState.isPlaying)
                ? 'bg-indigo-400 shadow-[0_0_8px_#818cf8]'
                : 'bg-amber-400/80 shadow-[0_0_6px_#f59e0b]'
            }`}
          />
          <span className="text-[11px] font-mono uppercase tracking-wider text-white/70">
            {playbackState.isMicActive
              ? 'Live Stage Input (Active)'
              : playbackState.isDemoActive
              ? 'Procedural Synth (120 BPM • D Minor)'
              : playbackState.sourceType === 'file'
              ? (playbackState.isPlaying ? `Playing: ${playbackState.fileName}` : `Paused: ${playbackState.fileName}`)
              : 'Awaiting Audio (Select Mic / Synth / File)'}
          </span>
        </div>
      </div>

      {/* Input Sources & Playback Controls */}
      <div className="flex items-center gap-2">
        {/* Built-in Generative Synth Demo Button */}
        <button
          onClick={() => {
            if (playbackState.isDemoActive) {
              audioEngine.stopDemo();
            } else {
              audioEngine.startDemo();
            }
          }}
          title="Toggle Built-in Procedural Generative Synthesizer (120 BPM • D Minor)"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
            playbackState.isDemoActive
              ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 shadow-[0_0_14px_rgba(6,182,212,0.3)] font-semibold'
              : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'
          }`}
        >
          <Music className={`w-3.5 h-3.5 ${playbackState.isDemoActive ? 'text-cyan-400 animate-pulse' : 'text-cyan-300/70'}`} />
          <span>{playbackState.isDemoActive ? 'Demo Playing' : 'Demo Synth'}</span>
        </button>

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

        {/* Transport Controls (Play / Pause / Reset / Skip / Scrubber Toggle) */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
          <button
            onClick={() => audioEngine.togglePlayPause()}
            title={playbackState.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
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
            title="Reset Playback / Track Position to 0:00"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Quick Skip Buttons */}
          {(playbackState.sourceType === 'file' || playbackState.sourceType === 'demo') && (
            <div className="hidden sm:flex items-center gap-0.5">
              <button
                onClick={() => audioEngine.skipBy(-10)}
                title="Skip back 10 seconds (← / J)"
                className="flex items-center justify-center h-8 px-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[10px] font-mono border border-white/10 transition-all"
              >
                -10s
              </button>
              <button
                onClick={() => audioEngine.skipBy(10)}
                title="Skip forward 10 seconds (→ / L)"
                className="flex items-center justify-center h-8 px-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[10px] font-mono border border-white/10 transition-all"
              >
                +10s
              </button>
            </div>
          )}

          {/* Inline Mini Seek Scrubber */}
          {(playbackState.sourceType === 'file' || playbackState.sourceType === 'demo') && playbackState.duration > 0 && (
            <div className="hidden md:flex items-center gap-2 pl-1">
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  audioEngine.seekPercent(fraction);
                }}
                title="Click anywhere to jump audio playback timestamp"
                className="relative w-24 lg:w-32 h-2 rounded-full bg-white/10 border border-white/15 cursor-pointer overflow-hidden group hover:h-2.5 transition-all"
              >
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 transition-[width] duration-75"
                  style={{ width: `${Math.min(100, Math.max(0, (playbackState.currentTime / playbackState.duration) * 100))}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-white/50 tabular-nums whitespace-nowrap">
                {formatTime(playbackState.currentTime)} / {formatTime(playbackState.duration)}
              </span>
            </div>
          )}

          {/* Scrubber / Timeline Drawer Toggle Button */}
          <button
            onClick={toggleTimeline}
            title="Toggle Audio Seek Scrubber & Step Timeline (Press T)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
              isTimelineOpen
                ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.3)] font-semibold'
                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{isTimelineOpen ? 'Hide Seek' : 'Seek Bar'}</span>
          </button>
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

        {/* Futuristic Jet Black Mode Quick Toggle */}
        <button
          onClick={onToggleJetBlack}
          title={isJetBlack ? 'Switch to Obsidian Slate Texture' : 'Switch to Futuristic Jet Black Mode (Removes texture for pure neon contrast)'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all ${
            isJetBlack
              ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)] font-semibold'
              : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${isJetBlack ? 'text-cyan-400' : 'text-white/40'}`} />
          <span className="hidden xl:inline">{isJetBlack ? 'Jet Black' : 'Obsidian'}</span>
        </button>

        {/* Real-Time Session Recorder */}
        {recordingStatus.isRecording ? (
          <button
            onClick={handleToggleRecord}
            title="Stop recording session"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-red-500/20 border border-red-500/60 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse transition-all"
          >
            <Square className="w-3 h-3 text-red-400 fill-red-400" />
            <span>REC {Math.floor(recordingStatus.durationSeconds / 60)}:{(recordingStatus.durationSeconds % 60).toString().padStart(2, '0')}</span>
            <span className="text-[9px] px-1 py-0.5 rounded bg-black/50 text-white/70">
              {recordingStatus.hasAudio ? 'A+V' : 'Video'}
            </span>
          </button>
        ) : (
          <button
            onClick={handleToggleRecord}
            title="Record stage visualization and audio to video"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border bg-white/5 border-white/10 text-white/70 hover:text-red-400 hover:border-red-400/40 hover:bg-red-500/10 transition-all"
          >
            <Circle className="w-3 h-3 text-red-500 fill-red-500" />
            <span className="hidden sm:inline">Record</span>
          </button>
        )}

        {recordNotice && (
          <span className="hidden lg:inline text-[10px] font-mono text-cyan-300 animate-pulse bg-cyan-500/10 border border-cyan-400/30 px-2 py-1 rounded">
            {recordNotice}
          </span>
        )}

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

      {/* Expanded Audio Seek Timeline Drawer */}
      {isTimelineOpen && (
        <PlaybackTimeline
          playbackState={playbackState}
          onClose={() => toggleTimeline()}
          onUploadClick={() => fileInputRef.current?.click()}
          onStartDemoClick={async () => {
            if (!playbackState.isDemoActive) {
              await audioEngine.startDemo();
            }
          }}
        />
      )}
    </div>
  );
};

export const Header = React.memo(HeaderComponent);
