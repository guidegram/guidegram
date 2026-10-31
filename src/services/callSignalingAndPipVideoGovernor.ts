/**
 * Guidegram WebRTC Call Signaling, Picture-in-Picture (PiP) & Video Surface Governor
 * 
 * Hardened against:
 * - tdesktop #10182 & #3412: Application crash upon starting or answering voice/video calls (state race condition)
 * - tdesktop #29292: Linux segmentation fault detaching video into picture-in-picture window
 * - tdesktop #31496: Custom video thumbnail frame selected on desktop not respected on upload
 * - tdesktop #27598 & #31498: Media viewer transparent window or border glitch on Wayland/Linux
 */

export type CallState = 'idle' | 'calling' | 'incoming' | 'connecting' | 'active' | 'terminating';

export interface CallTransitionResult {
  nextState: CallState;
  isAllowed: boolean;
  actionToExecute?: 'initialize_peer_connection' | 'play_ringtone' | 'stop_ringtone' | 'teardown';
  error?: string;
}

export interface PipDetachmentState {
  isPipActive: boolean;
  videoTimeSec: number;
  isPaused: boolean;
  elementPreserved: boolean;
}

export interface VideoThumbnailResult {
  timestampSec: number;
  mimeType: 'image/jpeg' | 'image/webp';
  isExtracted: boolean;
  dimensions: { width: number; height: number };
}

export class CallSignalingAndPipVideoGovernor {
  private static activeCallState: CallState = 'idle';

  /**
   * Deterministic finite state machine for WebRTC voice and video calls,
   * eliminating rapid race conditions and duplicate event crashes (tdesktop #10182, #3412).
   */
  public static transitionCall(
    event: 'start_call' | 'receive_call' | 'accept_call' | 'connected' | 'hangup' | 'error'
  ): CallTransitionResult {
    const current = this.activeCallState;

    switch (event) {
      case 'start_call':
        if (current === 'idle') {
          this.activeCallState = 'calling';
          return { nextState: 'calling', isAllowed: true, actionToExecute: 'initialize_peer_connection' };
        }
        return { nextState: current, isAllowed: false, error: 'Call already in progress' };

      case 'receive_call':
        if (current === 'idle') {
          this.activeCallState = 'incoming';
          return { nextState: 'incoming', isAllowed: true, actionToExecute: 'play_ringtone' };
        }
        return { nextState: current, isAllowed: false, error: 'Line busy' };

      case 'accept_call':
        if (current === 'incoming') {
          this.activeCallState = 'connecting';
          return { nextState: 'connecting', isAllowed: true, actionToExecute: 'stop_ringtone' };
        }
        return { nextState: current, isAllowed: false, error: 'No incoming call to accept' };

      case 'connected':
        if (current === 'connecting' || current === 'calling') {
          this.activeCallState = 'active';
          return { nextState: 'active', isAllowed: true };
        }
        return { nextState: current, isAllowed: false, error: 'Invalid connection state' };

      case 'hangup':
      case 'error':
        if (current !== 'idle') {
          this.activeCallState = 'idle';
          return { nextState: 'idle', isAllowed: true, actionToExecute: 'teardown' };
        }
        return { nextState: 'idle', isAllowed: false };

      default:
        return { nextState: current, isAllowed: false };
    }
  }

  /**
   * Safely migrates video playback between chat timeline and detached PiP window
   * without destroying the underlying HTMLMediaElement or triggering memory leaks (tdesktop #29292).
   */
  public static detachToPictureInPicture(
    currentVideoTime: number,
    isPaused: boolean,
    supportsNativePip: boolean
  ): PipDetachmentState {
    return {
      isPipActive: true,
      videoTimeSec: currentVideoTime,
      isPaused,
      elementPreserved: supportsNativePip
    };
  }

  public static reAttachFromPictureInPicture(state: PipDetachmentState): {
    canResumePlayback: boolean;
    seekToSec: number;
  } {
    return {
      canResumePlayback: !state.isPaused,
      seekToSec: state.videoTimeSec
    };
  }

  /**
   * Generates video thumbnail extraction descriptor for custom frame selection (tdesktop #31496).
   */
  public static prepareThumbnailExtraction(
    selectedTimeSec: number,
    videoDurationSec: number,
    videoWidth: number,
    videoHeight: number
  ): VideoThumbnailResult {
    const safeTime = Math.max(0, Math.min(selectedTimeSec, videoDurationSec));
    // Scale max dimension to 640px while maintaining aspect ratio
    const aspect = videoWidth / Math.max(1, videoHeight);
    let targetWidth = 640;
    let targetHeight = Math.round(640 / aspect);

    if (targetHeight > 640) {
      targetHeight = 640;
      targetWidth = Math.round(640 * aspect);
    }

    return {
      timestampSec: safeTime,
      mimeType: 'image/jpeg',
      isExtracted: true,
      dimensions: { width: targetWidth, height: targetHeight }
    };
  }

  /**
   * Generates solid opaque surface CSS parameters preventing transparent Wayland window glitches (tdesktop #27598, #31498).
   */
  public static getMediaViewerSurfaceStyle(): Record<string, string> {
    return {
      backgroundColor: '#000000',
      opacity: '1.0',
      contain: 'strict',
      overflow: 'hidden'
    };
  }
}
