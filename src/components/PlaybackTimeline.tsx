import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  FastForward,
  Rewind,
  Clock,
  Music,
  Upload,
  Radio,
  X,
  Volume2,
  Sparkles
} from 'lucide-react';
import { AudioPlaybackState } from '../types/audio';
import { audioEngine } from '../audio/AudioEngine';

interface PlaybackTimelineProps {
  playbackState: AudioPlaybackState;
  onClose: () => void;
  onUploadClick: () => void;
  onStartDemoClick: () => void;
}

export const PlaybackTimelineComponent: React.FC<PlaybackTimelineProps> = ({
  playbackState,
  onClose,
  onUploadClick,
  onStartDemoClick
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);
  const [hoverPositionPx, setHoverPositionPx] = useState<number>(0);

  const [liveTime, setLiveTime] = useState(playbackState.currentTime);
  const [liveDuration, setLiveDuration] = useState(playbackState.duration || (playbackState.sourceType === 'demo' ? 8.0 : 0));

  useEffect(() => {
    return audioEngine.subscribeTime((time, dur) => {
      setLiveTime(time);
      if (dur > 0) setLiveDuration(dur);
    });
  }, []);

  const duration = liveDuration || (playbackState.sourceType === 'demo' ? 8.0 : 0);
  const currentTime = Math.max(0, Math.min(liveTime, duration || 0));
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatDetailedTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00.0';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const formatSimpleTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const seekFromClientX = useCallback((clientX: number) => {
    if (!trackRef.current || duration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audioEngine.seekPercent(fraction);
  }, [duration]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const fraction = rect.width > 0 ? x / rect.width : 0;

    setHoverFraction(fraction);
    setHoverPositionPx(x);

    if (isDragging && duration > 0) {
      seekFromClientX(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture release safety guard
      }
    }
  };

  const handlePointerLeave = () => {
    if (!isDragging) {
      setHoverFraction(null);
    }
  };

  // Active step for demo mode (0 to 63)
  const currentDemoStep = Math.floor((currentTime / (duration || 8.0)) * 64) % 64;
  const currentDemoBar = Math.floor(currentDemoStep / 16);

  return (
    <div className="bg-[#070a12]/95 backdrop-blur-2xl border-b border-cyan-500/25 px-6 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.7)] text-white select-none transition-all">
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        {/* Top Header Row: Source Details, Timecode & Close */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase">
                Playback Scrubber & Timeline
              </span>
            </div>

            {/* Current Source Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-white/80">
              {playbackState.sourceType === 'file' ? (
                <>
                  <Volume2 className="w-3 h-3 text-indigo-400" />
                  <span className="max-w-[200px] truncate">{playbackState.fileName || 'Audio Track'}</span>
                </>
              ) : playbackState.sourceType === 'demo' ? (
                <>
                  <Music className="w-3 h-3 text-cyan-400" />
                  <span>Procedural Synth (120 BPM • 4 Bars • 64 Steps)</span>
                </>
              ) : (
                <>
                  <Radio className="w-3 h-3 text-emerald-400" />
                  <span>Live Stage Microphone / Line-In</span>
                </>
              )}
            </div>

            {/* Play/Pause state pill */}
            <span
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                playbackState.isPlaying
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {playbackState.isPlaying ? 'PLAYING' : 'PAUSED'}
            </span>
          </div>

          {/* Timecode & Percentage display */}
          <div className="flex items-center gap-4">
            {duration > 0 && (
              <div className="flex items-center gap-2 font-mono">
                <span className="text-base font-bold text-white tracking-wider tabular-nums">
                  {formatDetailedTime(currentTime)}
                </span>
                <span className="text-white/40 text-sm">/</span>
                <span className="text-sm text-white/60 tabular-nums">
                  {formatDetailedTime(duration)}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold tabular-nums">
                  {progressPercent.toFixed(1)}%
                </span>
              </div>
            )}

            <button
              onClick={onClose}
              title="Close Timeline Scrubber (T)"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Mic Notice if microphone is active */}
        {playbackState.sourceType === 'mic' && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs font-mono">
            <div className="flex items-center gap-2 text-emerald-300">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Live Stage Microphone is a continuous real-time input stream. To seek audio playback to arbitrary timestamps, switch to Demo Synth or upload a track:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onStartDemoClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 transition-all"
              >
                <Music className="w-3.5 h-3.5 text-cyan-400" />
                <span>Launch Demo Synth</span>
              </button>
              <button
                onClick={onUploadClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 transition-all"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Upload Audio File</span>
              </button>
            </div>
          </div>
        )}

        {/* Interactive Scrubbing Wave Bar (when file or demo is active) */}
        {duration > 0 && (
          <div className="flex flex-col gap-2">
            <div
              ref={trackRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              className="relative w-full h-8 flex items-center cursor-pointer group touch-none"
            >
              {/* Background Track Channel */}
              <div className="w-full h-3 rounded-full bg-black/60 border border-cyan-500/30 overflow-hidden shadow-inner relative">
                {/* Subtle Grid / Beat Marks on track */}
                <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-full w-[1px] ${i % 4 === 0 ? 'bg-cyan-300' : 'bg-white/50'}`}
                    />
                  ))}
                </div>

                {/* Progress Fill Bar with Gradient and Glow */}
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500 shadow-[0_0_16px_rgba(6,182,212,0.6)] relative"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Hover Line and Tooltip */}
              {hoverFraction !== null && (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none flex flex-col items-center"
                  style={{ left: `${hoverPositionPx}px` }}
                >
                  {/* Floating timestamp pill */}
                  <div className="absolute -top-7 px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-400/60 text-[10px] font-mono text-cyan-200 font-bold whitespace-nowrap shadow-[0_0_12px_rgba(6,182,212,0.4)] transform -translate-x-1/2">
                    {formatDetailedTime(hoverFraction * duration)} • {(hoverFraction * 100).toFixed(0)}%
                  </div>
                  {/* Hairline cursor */}
                  <div className="w-[1.5px] h-full bg-cyan-300/80 shadow-[0_0_6px_#22d3ee]" />
                </div>
              )}

              {/* Glowing Playhead Thumb Pin */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 border-cyan-400 shadow-[0_0_14px_#22d3ee] pointer-events-none transition-transform group-hover:scale-125"
                style={{
                  left: `calc(${progressPercent}% - 10px)`
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-600 m-auto mt-1" />
              </div>
            </div>

            {/* Quick Transport, Skip, and Cue Buttons Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
              {/* Primary Transport Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => audioEngine.togglePlayPause()}
                  title={playbackState.isPlaying ? 'Pause' : 'Play'}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.2)] transition-all"
                >
                  {playbackState.isPlaying ? (
                    <Pause className="w-4 h-4 text-amber-300" />
                  ) : (
                    <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  )}
                </button>

                <button
                  onClick={() => audioEngine.resetPlayback()}
                  title="Reset to 0:00"
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Skip Buttons */}
                <div className="flex items-center gap-1 pl-2 border-l border-white/10">
                  <button
                    onClick={() => audioEngine.skipBy(-15)}
                    title="Jump back 15 seconds"
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-mono text-[11px] border border-white/10 transition-all"
                  >
                    -15s
                  </button>
                  <button
                    onClick={() => audioEngine.skipBy(-5)}
                    title="Jump back 5 seconds (←)"
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-mono text-[11px] border border-white/10 transition-all"
                  >
                    -5s
                  </button>
                  <button
                    onClick={() => audioEngine.skipBy(5)}
                    title="Jump forward 5 seconds (→)"
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-mono text-[11px] border border-white/10 transition-all"
                  >
                    +5s
                  </button>
                  <button
                    onClick={() => audioEngine.skipBy(15)}
                    title="Jump forward 15 seconds"
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-mono text-[11px] border border-white/10 transition-all"
                  >
                    +15s
                  </button>
                </div>
              </div>

              {/* Percentage Cue Points Jump Presets */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-white/40 mr-1 hidden sm:inline">Cue Jump:</span>
                {[
                  { label: '0% Intro', fraction: 0 },
                  { label: '25%', fraction: 0.25 },
                  { label: '50% Mid', fraction: 0.5 },
                  { label: '75% Drop', fraction: 0.75 },
                  { label: '90% Outro', fraction: 0.9 }
                ].map(({ label, fraction }) => (
                  <button
                    key={label}
                    onClick={() => audioEngine.seekPercent(fraction)}
                    title={`Jump directly to ${label} (${formatSimpleTime(fraction * duration)})`}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-cyan-500/20 text-white/60 hover:text-cyan-300 font-mono text-[11px] border border-white/10 hover:border-cyan-400/40 transition-all"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Keyboard Shortcuts Hint */}
              <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-mono text-white/40 pl-2 border-l border-white/10">
                <kbd className="px-1 py-0.5 rounded bg-white/10 text-cyan-300">Space</kbd> Play
                <kbd className="px-1 py-0.5 rounded bg-white/10 text-cyan-300 ml-1">← / →</kbd> ±5s
                <kbd className="px-1 py-0.5 rounded bg-white/10 text-cyan-300 ml-1">T</kbd> Toggle
              </div>
            </div>

            {/* Procedural Synth 16-Step / 4-Bar Step Sequencer Selector (when Demo active) */}
            {playbackState.sourceType === 'demo' && (
              <div className="mt-2 pt-2 border-t border-cyan-500/20 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span className="text-[11px] font-mono font-semibold text-cyan-300">
                      Demo Synth Pattern Steps — Click any step to jump playback directly into that beat:
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3].map(bar => (
                      <button
                        key={bar}
                        onClick={() => audioEngine.jumpDemoStep(bar * 16)}
                        title={`Jump to Bar ${bar + 1} (Step ${bar * 16 + 1})`}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
                          currentDemoBar === bar
                            ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                            : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        Bar {bar + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 16-Step Visual Bar Matrix for the Active Bar */}
                <div className="grid grid-cols-16 gap-1 w-full">
                  {Array.from({ length: 16 }).map((_, stepIdx) => {
                    const globalStep = currentDemoBar * 16 + stepIdx;
                    const isActive = currentDemoStep === globalStep;
                    const isQuarterNote = stepIdx % 4 === 0;

                    return (
                      <button
                        key={stepIdx}
                        onClick={() => audioEngine.jumpDemoStep(globalStep)}
                        title={`Jump to Step ${stepIdx + 1} of Bar ${currentDemoBar + 1}`}
                        className={`h-7 rounded flex flex-col items-center justify-center font-mono text-[9px] transition-all border ${
                          isActive
                            ? 'bg-cyan-400 border-white text-black font-extrabold shadow-[0_0_14px_#22d3ee] scale-105'
                            : isQuarterNote
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
                            : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span>{stepIdx + 1}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state prompt if no track loaded and demo inactive */}
        {duration <= 0 && playbackState.sourceType !== 'mic' && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 gap-3">
            <div className="flex items-center gap-2.5 text-xs text-white/70 font-mono">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>No audio track loaded. Start the Demo Synth or upload an audio file to scrub and seek playback.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onStartDemoClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-mono font-medium transition-all"
              >
                <Music className="w-3.5 h-3.5 text-cyan-400" />
                <span>Launch Demo Synth</span>
              </button>
              <button
                onClick={onUploadClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-mono font-medium transition-all"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Upload Audio File</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const PlaybackTimeline = React.memo(PlaybackTimelineComponent);
