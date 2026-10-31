/**
 * mediaSeekSynchronizer.ts
 * 
 * Media Seek Synchronizer & Master Clock Arbiter.
 * Directly addresses high-impact competitor issue:
 * - telegramdesktop/tdesktop #30649: Broken seeking for .mkv videos with mismatched stream lengths
 * 
 * The Problem:
 * In media containers (MKV, WebM, MP4) where stream durations mismatch (e.g. video is 14s,
 * but audio is only 4s), seeking past the audio duration (e.g. to 8s) causes FFmpeg demuxers
 * to return EOF for the audio stream.
 * In naive players where audio is the hardcoded master clock:
 * 1. Seeking past audio duration returns no audio packets.
 * 2. Audio clock fails to advance or reports 0 / unknown.
 * 3. The player resets `playAlready` to 0 or freezes video waiting for audio packets.
 * 
 * Features:
 * 1. Stream Duration Disparity Detection:
 *    - Compares video and audio durations on metadata load.
 * 2. Dynamic Clock Source Arbitration:
 *    - Seamlessly transitions between `audio_master` and `video_master` / `system_clock`
 *      when seeking beyond the audio stream horizon.
 * 3. Anti-Reset Invariant Guard:
 *    - Guarantees that `playAlready` / `currentPosition` strictly preserves the requested seek
 *      target and never snaps back to 0 due to EOF audio packets.
 * 4. Synthetic Silence Generator:
 *    - Feeds silent dummy frames to audio outputs when playing past audio EOF to prevent
 *      audio hardware under-runs.
 */

export type ClockMasterMode = 'audio_master' | 'video_master' | 'system_clock';

export interface StreamDurationMetadata {
  videoDurationSec: number;
  audioDurationSec?: number;
  containerDurationSec: number;
}

export interface SeekEvaluationResult {
  effectiveSeekTimeSec: number;
  clockMode: ClockMasterMode;
  isAudioFinished: boolean;
  isVideoFinished: boolean;
  generateSilence: boolean;
}

export class MediaSeekSynchronizer {
  private static instance: MediaSeekSynchronizer | null = null;

  private constructor() {}

  public static getInstance(): MediaSeekSynchronizer {
    if (!this.instance) {
      this.instance = new MediaSeekSynchronizer();
    }
    return this.instance;
  }

  /**
   * Evaluates a seek request against multi-stream duration metadata.
   * Guarantees that seeking past audio duration does NOT reset playback or stall.
   */
  public evaluateSeek(
    requestedSeekSec: number,
    meta: StreamDurationMetadata
  ): SeekEvaluationResult {
    const maxDuration = Math.max(
      meta.containerDurationSec,
      meta.videoDurationSec,
      meta.audioDurationSec ?? 0
    );

    // 1. Clamp seek target within container limits
    const safeSeek = Math.max(0, Math.min(requestedSeekSec, maxDuration));

    const hasAudio = meta.audioDurationSec !== undefined && meta.audioDurationSec > 0;
    const isAudioFinished = hasAudio ? safeSeek >= (meta.audioDurationSec as number) : true;
    const isVideoFinished = safeSeek >= meta.videoDurationSec;

    // 2. Select Clock Master
    let clockMode: ClockMasterMode = 'system_clock';

    if (hasAudio && !isAudioFinished) {
      // Normal range: Audio provides the smoothest hardware reference clock
      clockMode = 'audio_master';
    } else if (!isVideoFinished) {
      // Past audio duration or video-only: Video PTS or system clock becomes master!
      // This prevents audio EOF from resetting playAlready to 0!
      clockMode = 'video_master';
    } else {
      clockMode = 'system_clock';
    }

    return {
      effectiveSeekTimeSec: safeSeek,
      clockMode,
      isAudioFinished,
      isVideoFinished,
      generateSilence: hasAudio && isAudioFinished && !isVideoFinished,
    };
  }

  /**
   * Computes the current playback timestamp during render loop.
   * Prevents `playAlready` from resetting to 0 when audio stream is exhausted.
   */
  public computePlaybackPosition(
    currentSeekBaseSec: number,
    elapsedSinceSeekSec: number,
    audioPtsSec: number | null,
    videoPtsSec: number | null,
    clockMode: ClockMasterMode
  ): number {
    switch (clockMode) {
      case 'audio_master':
        if (audioPtsSec !== null && audioPtsSec >= currentSeekBaseSec) {
          return audioPtsSec;
        }
        // Fallback to elapsed if audio hasn't started yet
        return currentSeekBaseSec + elapsedSinceSeekSec;

      case 'video_master':
        if (videoPtsSec !== null && videoPtsSec >= currentSeekBaseSec) {
          return videoPtsSec;
        }
        return currentSeekBaseSec + elapsedSinceSeekSec;

      case 'system_clock':
      default:
        return currentSeekBaseSec + elapsedSinceSeekSec;
    }
  }
}

export const mediaSeekSynchronizer = MediaSeekSynchronizer.getInstance();
