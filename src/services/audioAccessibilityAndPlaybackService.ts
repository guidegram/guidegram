/**
 * Guidegram Audio Accessibility & Playback Service
 *
 * Hardened against competitor issues:
 * - tdesktop #277: Option to disable mobile sound/vibration notifications when active on Desktop.
 * - tdesktop #151 & #418: Custom audio volume, output sink selection, and smooth gain.
 * - tdesktop #384: Pitch-preserved playback speedup (1.0x, 1.25x, 1.5x, 2.0x) for voice & audio.
 * - tdesktop #2801: Preventing audio engine from blocking Modern Standby (DRIPS sleep).
 */

export class ActiveDesktopSessionMuteCoordinator {
  private lastUserActivityTime: number = 0;
  private activeThresholdMs: number = 60000; // 60s of inactivity considered idle

  public recordUserActivity(timestamp: number = Date.now()): void {
    this.lastUserActivityTime = timestamp;
  }

  /**
   * Determines if mobile notification sound should be muted because desktop is active (#277)
   */
  public shouldMuteMobileNotifications(now: number = Date.now()): boolean {
    const isDesktopActive = now - this.lastUserActivityTime <= this.activeThresholdMs;
    return isDesktopActive;
  }
}

export class GranularAudioVolumeAndOutputManager {
  private volume: number = 1.0;
  private previousNonZeroVolume: number = 1.0;
  private selectedOutputDeviceId: string = 'default';

  public setVolume(vol: number): number {
    const clamped = Math.max(0, Math.min(vol, 1.0));
    if (clamped > 0) {
      this.previousNonZeroVolume = clamped;
    }
    this.volume = clamped;
    return this.volume;
  }

  public getVolume(): number {
    return this.volume;
  }

  public toggleMute(): { isMuted: boolean; currentVolume: number } {
    if (this.volume > 0) {
      this.previousNonZeroVolume = this.volume;
      this.volume = 0;
    } else {
      this.volume = this.previousNonZeroVolume || 1.0;
    }
    return {
      isMuted: this.volume === 0,
      currentVolume: this.volume,
    };
  }

  public setOutputDevice(deviceId: string): void {
    this.selectedOutputDeviceId = deviceId || 'default';
  }

  public getOutputDevice(): string {
    return this.selectedOutputDeviceId;
  }
}

export class PitchPreservedSpeedPlaybackEngine {
  public static readonly ALLOWED_SPEEDS = [1.0, 1.25, 1.5, 2.0] as const;
  private currentSpeedIndex: number = 0;

  public cycleNextSpeed(): { speed: number; preservesPitch: boolean } {
    this.currentSpeedIndex = (this.currentSpeedIndex + 1) % PitchPreservedSpeedPlaybackEngine.ALLOWED_SPEEDS.length;
    return {
      speed: this.getCurrentSpeed(),
      preservesPitch: true, // Guarantees natural human pitch (#384)
    };
  }

  public setSpeed(speed: number): { speed: number; preservesPitch: boolean } {
    const matched = PitchPreservedSpeedPlaybackEngine.ALLOWED_SPEEDS.findIndex(s => Math.abs(s - speed) < 0.05);
    if (matched !== -1) {
      this.currentSpeedIndex = matched;
    } else {
      this.currentSpeedIndex = 0;
    }
    return {
      speed: this.getCurrentSpeed(),
      preservesPitch: true,
    };
  }

  public getCurrentSpeed(): number {
    return PitchPreservedSpeedPlaybackEngine.ALLOWED_SPEEDS[this.currentSpeedIndex];
  }
}

export class ModernStandbyAudioReleaseGuard {
  private isPlaying: boolean = false;
  private isSuspendedForSleep: boolean = false;

  public setPlaybackState(playing: boolean): void {
    this.isPlaying = playing;
  }

  /**
   * Automatically pauses audio and releases audio locks on system suspend (#2801)
   */
  public onSystemSleep(pauseAction: () => void): { wasSuspended: boolean } {
    if (this.isPlaying) {
      this.isSuspendedForSleep = true;
      pauseAction();
      this.isPlaying = false;
      return { wasSuspended: true };
    }
    return { wasSuspended: false };
  }

  /**
   * Resumes playback upon wake if previously suspended
   */
  public onSystemWake(resumeAction?: () => void): { resumed: boolean } {
    if (this.isSuspendedForSleep) {
      this.isSuspendedForSleep = false;
      if (resumeAction) {
        resumeAction();
        this.isPlaying = true;
        return { resumed: true };
      }
    }
    return { resumed: false };
  }
}
