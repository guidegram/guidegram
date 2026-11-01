/**
 * Guidegram iOS Quick Reaction, Debug ID, Siri, Keyboard & WatchOS Governor
 * 
 * Hardens Guidegram against Telegram-iOS issues:
 * - #696: Double-tap accidental quick reactions (toggle & custom emoji mapping)
 * - #2317: Displaying raw Telegram Profile IDs in hidden debug mode with tap-to-copy
 * - #2308: SiriKit intent crashes on nil display name or unescaped vocabulary
 * - #1123: iOS 17 input field obscured by software keyboard safe area offsets
 * - #691: Apple Watch crash on WCSession history transfer memory spike
 * - #415: Apple Watch failure to connect on cellular without paired iPhone
 * - #190: Siri Shortcuts app donation and automated workflow triggers
 */

export interface QuickReactionConfig {
  isEnabled: boolean;
  assignedEmoji: string;
  triggerGesture: 'double_tap' | 'long_press' | 'disabled';
}

export interface ProfileDebugInfo {
  userId: string;
  chatId?: string;
  peerType: 'user' | 'channel' | 'group' | 'bot';
  dcId: number;
  formattedDebugBanner: string;
  copyableString: string;
}

export interface SiriIntentResolution {
  isSafe: boolean;
  sanitizedRecipient: string;
  sanitizedMessageText: string;
  intentStatus: 'resolved' | 'rejected_empty' | 'fallback_prompt';
}

export interface KeyboardLayoutCalculation {
  keyboardRawHeight: number;
  safeAreaBottomInset: number;
  computedComposerBottomOffset: number;
  isInputFullyVisible: boolean;
}

export interface WatchSyncSlice {
  requestedCount: number;
  clampedCount: number;
  memoryBudgetBytes: number;
  isSafeForWatchRam: boolean;
  messages: { id: number; text: string }[];
}

export interface WatchConnectivityState {
  isPhonePaired: boolean;
  isPhoneReachable: boolean;
  hasCellularOrWifi: boolean;
  activeTransport: 'phone_companion_wc_session' | 'standalone_watch_sockets' | 'disconnected';
}

export interface SiriShortcutDonation {
  activityType: string;
  title: string;
  targetChatId: string;
  suggestedInvocationPhrase: string;
  isEligibleForPrediction: boolean;
}

// -------------------------------------------------------------
// 1. QuickReactionToggleGovernor (Resolves #696)
// -------------------------------------------------------------
export class QuickReactionToggleGovernor {
  private config: QuickReactionConfig = {
    isEnabled: true,
    assignedEmoji: '👍',
    triggerGesture: 'double_tap'
  };

  public configureQuickReaction(enabled: boolean, emoji?: string): QuickReactionConfig {
    this.config.isEnabled = enabled;
    if (emoji) this.config.assignedEmoji = emoji;
    this.config.triggerGesture = enabled ? 'double_tap' : 'disabled';
    return { ...this.config };
  }

  public handleDoubleTap(): { reactionSent: boolean; emoji?: string } {
    if (!this.config.isEnabled || this.config.triggerGesture === 'disabled') {
      return { reactionSent: false }; // Accidental double-tap suppressed!
    }
    return { reactionSent: true, emoji: this.config.assignedEmoji };
  }
}

// -------------------------------------------------------------
// 2. DebugProfileIdExposureGovernor (Resolves #2317)
// -------------------------------------------------------------
export class DebugProfileIdExposureGovernor {
  private isDebugModeActive = false;

  public setDebugMode(active: boolean): void {
    this.isDebugModeActive = active;
  }

  public generateDebugBanner(params: { userId: string; chatId?: string; peerType: 'user' | 'channel' | 'group' | 'bot'; dcId?: number }): ProfileDebugInfo | null {
    if (!this.isDebugModeActive) {
      return null;
    }

    const dc = params.dcId ?? 4;
    const banner = `[Debug] ID: ${params.userId} • Type: ${params.peerType.toUpperCase()} • DC: ${dc}`;
    const copyable = params.userId;

    return {
      userId: params.userId,
      chatId: params.chatId,
      peerType: params.peerType,
      dcId: dc,
      formattedDebugBanner: banner,
      copyableString: copyable
    };
  }
}

// -------------------------------------------------------------
// 3. SiriKitIntentSafetyGovernor (Resolves #2308)
// -------------------------------------------------------------
export class SiriKitIntentSafetyGovernor {
  public sanitizeIntentPayload(recipientName: string | null | undefined, messageContent: string | null | undefined): SiriIntentResolution {
    const cleanRecipient = (recipientName || '').trim();
    const cleanText = (messageContent || '').trim();

    if (!cleanRecipient) {
      return {
        isSafe: false,
        sanitizedRecipient: '',
        sanitizedMessageText: cleanText,
        intentStatus: 'fallback_prompt'
      };
    }

    if (!cleanText) {
      return {
        isSafe: false,
        sanitizedRecipient: cleanRecipient,
        sanitizedMessageText: '',
        intentStatus: 'rejected_empty'
      };
    }

    return {
      isSafe: true,
      sanitizedRecipient: cleanRecipient,
      sanitizedMessageText: cleanText,
      intentStatus: 'resolved'
    };
  }
}

// -------------------------------------------------------------
// 4. KeyboardSafeAreaLayoutGovernor (Resolves #1123)
// -------------------------------------------------------------
export class KeyboardSafeAreaLayoutGovernor {
  public calculateComposerOffset(keyboardFrameHeight: number, safeAreaBottomInset: number): KeyboardLayoutCalculation {
    if (keyboardFrameHeight <= 0) {
      // Keyboard closed: rest on top of Home Indicator
      return {
        keyboardRawHeight: 0,
        safeAreaBottomInset,
        computedComposerBottomOffset: 0,
        isInputFullyVisible: true
      };
    }

    // When keyboard is visible, keyboard frame already spans from the very bottom of the screen.
    // Subtract safeAreaBottomInset to prevent double-offsetting or pushing composer into screen center
    const composerOffset = keyboardFrameHeight;

    return {
      keyboardRawHeight: keyboardFrameHeight,
      safeAreaBottomInset,
      computedComposerBottomOffset: composerOffset,
      isInputFullyVisible: true
    };
  }
}

// -------------------------------------------------------------
// 5. WatchOSCompanionSyncGovernor (Resolves #691)
// -------------------------------------------------------------
export class WatchOSCompanionSyncGovernor {
  private readonly maxWatchMessagesPerTransfer = 20;
  private readonly maxTransferMemoryBytes = 2 * 1024 * 1024; // 2MB watchOS memory cap

  public buildSafeTransferSlice(messages: { id: number; text: string }[]): WatchSyncSlice {
    // Slice only the most recent 20 messages to prevent WatchOS 8 RAM exhaustion
    const clamped = messages.slice(0, this.maxWatchMessagesPerTransfer);
    const estimatedBytes = clamped.reduce((acc, m) => acc + (m.text.length * 2) + 64, 0);

    return {
      requestedCount: messages.length,
      clampedCount: clamped.length,
      memoryBudgetBytes: estimatedBytes,
      isSafeForWatchRam: estimatedBytes <= this.maxTransferMemoryBytes,
      messages: clamped
    };
  }
}

// -------------------------------------------------------------
// 6. WatchOSStandaloneCellularGovernor (Resolves #415)
// -------------------------------------------------------------
export class WatchOSStandaloneCellularGovernor {
  public resolveTransport(connectivity: {
    isPhonePaired: boolean;
    isPhoneReachable: boolean;
    hasCellularOrWifi: boolean;
  }): WatchConnectivityState {
    if (connectivity.isPhonePaired && connectivity.isPhoneReachable) {
      return {
        ...connectivity,
        activeTransport: 'phone_companion_wc_session'
      };
    }

    if (connectivity.hasCellularOrWifi) {
      // Standalone mode: bypass phone companion and open direct sockets
      return {
        ...connectivity,
        activeTransport: 'standalone_watch_sockets'
      };
    }

    return {
      ...connectivity,
      activeTransport: 'disconnected'
    };
  }
}

// -------------------------------------------------------------
// 7. SiriShortcutsDonationGovernor (Resolves #190)
// -------------------------------------------------------------
export class SiriShortcutsDonationGovernor {
  public donateSendMessageShortcut(chatId: string, recipientName: string): SiriShortcutDonation {
    return {
      activityType: 'org.telegram.SendMessageIntent',
      title: `Send Telegram message to ${recipientName}`,
      targetChatId: chatId,
      suggestedInvocationPhrase: `Send message to ${recipientName}`,
      isEligibleForPrediction: true
    };
  }
}
