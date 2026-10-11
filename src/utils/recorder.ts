// Synchro Session Recorder
// Captures 60 FPS Canvas visual streams synchronized with Web Audio master output

import { audioEngine } from '../audio/AudioEngine';

export interface RecordingStatus {
  isRecording: boolean;
  durationSeconds: number;
  hasAudio: boolean;
  mimeType: string;
}

export class SessionRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private audioDestNode: MediaStreamAudioDestinationNode | null = null;
  private timerId: number | null = null;
  private startTime = 0;
  private durationSeconds = 0;
  private isRecording = false;
  private hasAudio = false;
  private mimeType = 'video/webm';

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream !== 'undefined';
  }

  public getSupportedMimeType(): string {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4'
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  }

  public async start(
    canvas: HTMLCanvasElement,
    onStatusChange?: (status: RecordingStatus) => void
  ): Promise<{ success: boolean; hasAudio: boolean; error?: string }> {
    if (this.isRecording) {
      return { success: false, hasAudio: false, error: 'Recording is already in progress' };
    }

    if (!this.isSupported()) {
      return { success: false, hasAudio: false, error: 'MediaRecorder is not supported in this browser' };
    }

    const mime = this.getSupportedMimeType();
    if (!mime) {
      return { success: false, hasAudio: false, error: 'No compatible video recording codec found' };
    }
    this.mimeType = mime;

    try {
      // 1. Capture 60 FPS video stream from Canvas
      const canvasStream = canvas.captureStream(60);
      const videoTrack = canvasStream.getVideoTracks()[0];
      if (!videoTrack) {
        return { success: false, hasAudio: false, error: 'Could not capture canvas video stream' };
      }

      // 2. Mix Web Audio master stream if AudioContext is active
      const audioTracks: MediaStreamTrack[] = [];
      const ctx = audioEngine.getAudioContext();
      const masterGain = audioEngine.getMasterGain();
      const micStream = audioEngine.getMicStream();

      if (ctx && ctx.state !== 'closed') {
        this.audioDestNode = ctx.createMediaStreamDestination();

        if (masterGain) {
          masterGain.connect(this.audioDestNode);
        }

        if (micStream && micStream.getAudioTracks().length > 0) {
          try {
            const micSrc = ctx.createMediaStreamSource(micStream);
            micSrc.connect(this.audioDestNode);
          } catch {
            // If mic source already created or stream inactive, proceed with master audio
          }
        }

        const mixedAudioTracks = this.audioDestNode.stream.getAudioTracks();
        if (mixedAudioTracks.length > 0) {
          audioTracks.push(...mixedAudioTracks);
        }
      }

      this.hasAudio = audioTracks.length > 0;

      // 3. Combine visual & audio tracks into single synchronous stream
      const combinedStream = new MediaStream([videoTrack, ...audioTracks]);

      // 4. Initialize MediaRecorder
      this.recordedChunks = [];
      const options: MediaRecorderOptions = {
        mimeType: this.mimeType,
        videoBitsPerSecond: 6_000_000 // 6 Mbps for high visual fidelity
      };

      this.mediaRecorder = new MediaRecorder(combinedStream, options);

      this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(500); // 500ms chunks to keep memory predictable

      this.isRecording = true;
      this.startTime = Date.now();
      this.durationSeconds = 0;

      // 5. Progress ticker
      this.timerId = window.setInterval(() => {
        this.durationSeconds = Math.floor((Date.now() - this.startTime) / 1000);
        if (onStatusChange) {
          onStatusChange({
            isRecording: true,
            durationSeconds: this.durationSeconds,
            hasAudio: this.hasAudio,
            mimeType: this.mimeType
          });
        }
        // Safety cap: automatically stop at 5 minutes to avoid memory overflow
        if (this.durationSeconds >= 300) {
          this.stop();
        }
      }, 1000);

      if (onStatusChange) {
        onStatusChange({
          isRecording: true,
          durationSeconds: 0,
          hasAudio: this.hasAudio,
          mimeType: this.mimeType
        });
      }

      return { success: true, hasAudio: this.hasAudio };
    } catch (err) {
      console.error('Failed to start recorder:', err);
      this.cleanup();
      return { success: false, hasAudio: false, error: (err as Error).message };
    }
  }

  public stop(): Promise<{ blob: Blob; url: string; filename: string; durationSeconds: number; hasAudio: boolean } | null> {
    return new Promise((resolve) => {
      if (!this.isRecording || !this.mediaRecorder) {
        this.cleanup();
        resolve(null);
        return;
      }

      const rec = this.mediaRecorder;
      const finalDuration = this.durationSeconds;
      const finalHasAudio = this.hasAudio;

      rec.onstop = () => {
        const ext = this.mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(this.recordedChunks, { type: this.mimeType });
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `synchro_capture_${timestamp}.${ext}`;

        this.cleanup();
        resolve({
          blob,
          url,
          filename,
          durationSeconds: finalDuration,
          hasAudio: finalHasAudio
        });
      };

      rec.stop();
      this.isRecording = false;
    });
  }

  private cleanup(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }

    if (this.audioDestNode) {
      try {
        const masterGain = audioEngine.getMasterGain();
        if (masterGain) masterGain.disconnect(this.audioDestNode);
      } catch {
        // Safe disconnect
      }
      this.audioDestNode = null;
    }

    this.mediaRecorder = null;
    this.isRecording = false;
  }

  public getStatus(): RecordingStatus {
    return {
      isRecording: this.isRecording,
      durationSeconds: this.durationSeconds,
      hasAudio: this.hasAudio,
      mimeType: this.mimeType
    };
  }
}

export const sessionRecorder = new SessionRecorder();
