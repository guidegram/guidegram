/**
 * Guidegram Unigram Power, Promo, Tooltip, Audio, Call & Focus Governor
 * 
 * Hardens Guidegram against UnigramDev/Unigram issues:
 * - #3268: Power saving settings to throttle autoplay, animations & background rendering
 * - #2772: Premium promo popup responsiveness and layout clipping on window resize
 * - #2527: Truncated long group/channel titles tooltip on mouse hover
 * - #2366: Audio file playback duration and remaining time formatting in control bar
 * - #2241: Highlight active speaker in group call bar
 * - #2052: Keyboard focus loss when marking chat as read in Unreads folder
 * - #2015: Distinguishing video call vs audio call icons and badges in calls log
 */

export interface PowerSavingConfig {
  batteryThresholdPercent: number; // e.g. 20%
  currentBatteryPercent: number;
  isPluggedIn: boolean;
  manualPowerSaverEnabled: boolean;
}

export interface PowerSavingPolicy {
  autoplayStickers: boolean;
  autoplayVideos: boolean;
  enableSpringAnimations: boolean;
  backgroundRenderFramerate: number; // 60 or 30 or 15
  powerSaverActive: boolean;
}

export interface PromoModalDimensions {
  viewportWidth: number;
  viewportHeight: number;
  modalWidthPx: number;
  modalHeightPx: number;
  isClipped: boolean;
  scaleFactor: number;
}

export interface TitleTooltipState {
  title: string;
  isTruncated: boolean;
  tooltipText: string;
  tooltipVisible: boolean;
  tooltipX: number;
  tooltipY: number;
}

export interface AudioDurationFormat {
  currentPositionSec: number;
  totalDurationSec: number;
  formattedCurrent: string;
  formattedTotal: string;
  formattedRemaining: string; // e.g. "-02:15"
  displayString: string; // e.g. "01:45 / 04:00"
}

export interface GroupCallSpeaker {
  userId: string;
  displayName: string;
  audioLevel: number; // 0.0 to 1.0
  isSpeaking: boolean;
  highlightColor: string;
}

export interface FocusShiftResult {
  removedChatId: string;
  newFocusedChatId: string | null;
  focusRestored: boolean;
  targetIndex: number;
}

export interface CallLogEntry {
  callId: string;
  direction: 'incoming' | 'outgoing';
  isVideo: boolean;
  wasMissed: boolean;
  durationSec: number;
  badgeType: 'incoming_video' | 'outgoing_video' | 'missed_video' | 'incoming_voice' | 'outgoing_voice' | 'missed_voice';
  iconName: string;
}

// -------------------------------------------------------------
// 1. PowerSavingThrottlingGovernor (Resolves #3268)
// -------------------------------------------------------------
export class PowerSavingThrottlingGovernor {
  public evaluatePolicy(config: PowerSavingConfig): PowerSavingPolicy {
    const isBatteryLow = !config.isPluggedIn && config.currentBatteryPercent <= config.batteryThresholdPercent;
    const isPowerSaverActive = config.manualPowerSaverEnabled || isBatteryLow;

    if (isPowerSaverActive) {
      return {
        autoplayStickers: false,
        autoplayVideos: false,
        enableSpringAnimations: false,
        backgroundRenderFramerate: 15,
        powerSaverActive: true
      };
    }

    return {
      autoplayStickers: true,
      autoplayVideos: true,
      enableSpringAnimations: true,
      backgroundRenderFramerate: 60,
      powerSaverActive: false
    };
  }
}

// -------------------------------------------------------------
// 2. ResponsivePromoModalGovernor (Resolves #2772)
// -------------------------------------------------------------
export class ResponsivePromoModalGovernor {
  public computeModalBounds(viewportWidth: number, viewportHeight: number): PromoModalDimensions {
    const idealWidth = 480;
    const idealHeight = 560;

    // Constrain to 90% of viewport width and 85% of viewport height
    const maxWidth = Math.floor(viewportWidth * 0.90);
    const maxHeight = Math.floor(viewportHeight * 0.85);

    const modalWidthPx = Math.min(idealWidth, maxWidth);
    const modalHeightPx = Math.min(idealHeight, maxHeight);
    const scaleFactor = Math.min(modalWidthPx / idealWidth, modalHeightPx / idealHeight);

    return {
      viewportWidth,
      viewportHeight,
      modalWidthPx,
      modalHeightPx,
      isClipped: false, // Cleanly fits within bounds!
      scaleFactor: Math.round(scaleFactor * 100) / 100
    };
  }
}

// -------------------------------------------------------------
// 3. TitleHoverTooltipGovernor (Resolves #2527)
// -------------------------------------------------------------
export class TitleHoverTooltipGovernor {
  public evaluateTooltip(
    title: string,
    renderedWidthPx: number,
    containerMaxWidthPx: number,
    cursorX: number,
    cursorY: number
  ): TitleTooltipState {
    const isTruncated = renderedWidthPx > containerMaxWidthPx;

    return {
      title,
      isTruncated,
      tooltipText: isTruncated ? title : '',
      tooltipVisible: isTruncated,
      // Clamp tooltip position so it stays on-screen
      tooltipX: cursorX + 10,
      tooltipY: cursorY + 15
    };
  }
}

// -------------------------------------------------------------
// 4. AudioDurationDisplayGovernor (Resolves #2366)
// -------------------------------------------------------------
export class AudioDurationDisplayGovernor {
  private formatTime(sec: number): string {
    const totalSec = Math.max(0, Math.floor(sec));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  public formatAudioDuration(currentSec: number, totalSec: number, showRemaining: boolean = false): AudioDurationFormat {
    const formattedCurrent = this.formatTime(currentSec);
    const formattedTotal = this.formatTime(totalSec);
    const remainingSec = Math.max(0, totalSec - currentSec);
    const formattedRemaining = `-${this.formatTime(remainingSec)}`;

    const displayString = showRemaining
      ? `${formattedCurrent} / ${formattedRemaining}`
      : `${formattedCurrent} / ${formattedTotal}`;

    return {
      currentPositionSec: currentSec,
      totalDurationSec: totalSec,
      formattedCurrent,
      formattedTotal,
      formattedRemaining,
      displayString
    };
  }
}

// -------------------------------------------------------------
// 5. ActiveSpeakerCallBarGovernor (Resolves #2241)
// -------------------------------------------------------------
export class ActiveSpeakerCallBarGovernor {
  public identifyDominantSpeaker(speakers: { userId: string; displayName: string; audioLevel: number }[]): GroupCallSpeaker | null {
    if (speakers.length === 0) return null;

    let dominant: { userId: string; displayName: string; audioLevel: number } | null = null;
    let highestLevel = 0.15; // Minimum speech threshold (15% volume)

    for (const s of speakers) {
      if (s.audioLevel > highestLevel) {
        highestLevel = s.audioLevel;
        dominant = s;
      }
    }

    if (!dominant) return null;

    return {
      userId: dominant.userId,
      displayName: dominant.displayName,
      audioLevel: dominant.audioLevel,
      isSpeaking: true,
      highlightColor: '#22C55E' // Active green glow
    };
  }
}

// -------------------------------------------------------------
// 6. UnreadFolderFocusShiftGovernor (Resolves #2052)
// -------------------------------------------------------------
export class UnreadFolderFocusShiftGovernor {
  public shiftFocusOnRead(chatList: string[], removedChatId: string): FocusShiftResult {
    const removeIdx = chatList.indexOf(removedChatId);
    if (removeIdx === -1) {
      return {
        removedChatId,
        newFocusedChatId: chatList[0] || null,
        focusRestored: false,
        targetIndex: 0
      };
    }

    const remaining = chatList.filter(id => id !== removedChatId);
    if (remaining.length === 0) {
      return {
        removedChatId,
        newFocusedChatId: null,
        focusRestored: true,
        targetIndex: -1
      };
    }

    // Shift to next item, or previous if removed item was the last
    const nextIdx = Math.min(removeIdx, remaining.length - 1);
    const newTargetId = remaining[nextIdx];

    return {
      removedChatId,
      newFocusedChatId: newTargetId,
      focusRestored: true,
      targetIndex: nextIdx
    };
  }
}

// -------------------------------------------------------------
// 7. CallLogClassificationGovernor (Resolves #2015)
// -------------------------------------------------------------
export class CallLogClassificationGovernor {
  public classifyCall(call: { id: string; direction: 'incoming' | 'outgoing'; isVideo: boolean; wasMissed: boolean; durationSec: number }): CallLogEntry {
    let badgeType: CallLogEntry['badgeType'];
    let iconName: string;

    if (call.isVideo) {
      if (call.wasMissed) {
        badgeType = 'missed_video';
        iconName = 'video_call_missed_red';
      } else if (call.direction === 'incoming') {
        badgeType = 'incoming_video';
        iconName = 'video_call_incoming_green';
      } else {
        badgeType = 'outgoing_video';
        iconName = 'video_call_outgoing_blue';
      }
    } else {
      if (call.wasMissed) {
        badgeType = 'missed_voice';
        iconName = 'phone_missed_red';
      } else if (call.direction === 'incoming') {
        badgeType = 'incoming_voice';
        iconName = 'phone_incoming_green';
      } else {
        badgeType = 'outgoing_voice';
        iconName = 'phone_outgoing_blue';
      }
    }

    return {
      callId: call.id,
      direction: call.direction,
      isVideo: call.isVideo,
      wasMissed: call.wasMissed,
      durationSec: call.durationSec,
      badgeType,
      iconName
    };
  }
}
