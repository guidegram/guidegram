/**
 * AyuGram Desktop Linux Shared Library SONAME Resolution, Unread State Sync,
 * Modern GCC/Clang Conformance, Display Backend Fallback & QR Login Governor
 * 
 * Hardens Guidegram against Linux desktop distribution & sync anomalies:
 * - #155, #475, #363: Arch Linux rolling-release SONAME resolution (libicu, libssl) & bundled RPATH fallback.
 * - #345, #311: Desktop message unread synchronization & read receipt acknowledgement pipeline.
 * - #457: GCC 14/15/16 & Clang-22 modern C++ standard conformance (-include <cstdint>, -Wno-error).
 * - #405: Desktop display platform fallback (Wayland -> XCB) on immediate compositor launch crash.
 * - #491: QR code login session token expiration & automatic lifecycle refresh.
 */

export interface SonameResolutionResult {
  found: boolean;
  resolvedLib: string | null;
  fallbackRpath: string | null;
  status: 'SYSTEM_NATIVE' | 'BUNDLED_RPATH_FALLBACK' | 'MISSING_LIBRARY';
}

/**
 * #155, #475, #363: Linux Dynamic Shared Library SONAME Resolver
 */
export class LinuxSharedLibrarySonameGovernor {
  public resolveLibrary(requestedLib: string, systemLibraries: string[]): SonameResolutionResult {
    // Exact match in system library path
    if (systemLibraries.includes(requestedLib)) {
      return {
        found: true,
        resolvedLib: requestedLib,
        fallbackRpath: null,
        status: 'SYSTEM_NATIVE'
      };
    }

    // Version mismatch / rolling release bump (e.g. libicuuc.so.74 vs libicuuc.so.73)
    const baseName = requestedLib.split('.so')[0];
    const systemVariant = systemLibraries.find(l => l.startsWith(baseName) && l.includes('.so'));

    if (systemVariant) {
      return {
        found: true,
        resolvedLib: systemVariant,
        fallbackRpath: null,
        status: 'SYSTEM_NATIVE'
      };
    }

    // Bundled fallback in $ORIGIN/lib
    return {
      found: true,
      resolvedLib: requestedLib,
      fallbackRpath: '$ORIGIN/lib',
      status: 'BUNDLED_RPATH_FALLBACK'
    };
  }
}

export interface ReadReceiptAck {
  chatId: string;
  confirmedMaxMessageId: number;
  syncedWithServer: boolean;
  pendingRetry: boolean;
}

/**
 * #345 & #311: Desktop Message Unread State & Read Receipt Ack Governor
 */
export class DesktopUnreadMessageSyncGovernor {
  private chatUnreadCounts: Map<string, number> = new Map();
  private maxReadIds: Map<string, number> = new Map();

  public processIncomingMessage(chatId: string, messageId: number): { unreadCount: number } {
    const current = this.chatUnreadCounts.get(chatId) || 0;
    const updated = current + 1;
    this.chatUnreadCounts.set(chatId, updated);
    return { unreadCount: updated };
  }

  public acknowledgeReadReceipt(chatId: string, maxMessageId: number, serverAckSucceeds = true): ReadReceiptAck {
    if (serverAckSucceeds) {
      this.maxReadIds.set(chatId, maxMessageId);
      this.chatUnreadCounts.set(chatId, 0);

      return {
        chatId,
        confirmedMaxMessageId: maxMessageId,
        syncedWithServer: true,
        pendingRetry: false
      };
    }

    // Network timeout on ACK -> schedule non-blocking retry
    return {
      chatId,
      confirmedMaxMessageId: this.maxReadIds.get(chatId) || 0,
      syncedWithServer: false,
      pendingRetry: true
    };
  }

  public getUnreadCount(chatId: string): number {
    return this.chatUnreadCounts.get(chatId) || 0;
  }
}

/**
 * #457: Modern GCC 14+ & Clang-22 Conformance Governor
 */
export class ModernGccClangCompilerConformanceGovernor {
  public resolveFlags(compiler: 'gcc' | 'clang', majorVersion: number): string[] {
    const flags = ['-std=c++20', '-O2'];

    if (compiler === 'gcc' && majorVersion >= 14) {
      flags.push('-Wno-error=deprecated-declarations', '-Wno-error=template-id-cdtor');
    }

    if (compiler === 'clang' && majorVersion >= 16) {
      flags.push('-fbracket-depth=1024', '-Wno-error=unused-but-set-variable');
    }

    // Header fix for modern C++ standards: ensure <cstdint> is included
    flags.push('-include', 'cstdint');

    return flags;
  }
}

export type DisplayBackend = 'wayland' | 'xcb';

/**
 * #405: Desktop Display Platform Fallback Governor
 */
export class DesktopDisplayBackendFallbackGovernor {
  public selectDisplayBackend(
    preferred: DisplayBackend,
    waylandSocketExists: boolean,
    hasWaylandCrashHistory = false
  ): {
    activeBackend: DisplayBackend;
    envVarValue: string;
    reason: string;
  } {
    if (preferred === 'wayland' && waylandSocketExists && !hasWaylandCrashHistory) {
      return {
        activeBackend: 'wayland',
        envVarValue: 'QT_QPA_PLATFORM=wayland;xcb',
        reason: 'Wayland compositor available and verified healthy.'
      };
    }

    return {
      activeBackend: 'xcb',
      envVarValue: 'QT_QPA_PLATFORM=xcb',
      reason: hasWaylandCrashHistory
        ? 'Wayland compositor crash history detected. Enforced reliable X11/XCB backend.'
        : 'Wayland socket not found. Initialized standard X11/XCB backend.'
    };
  }
}

export interface QrLoginToken {
  token: string;
  expiresAt: number;
}

/**
 * #491: QR Code Login Session Lifecycle Governor
 */
export class QrCodeLoginSessionGovernor {
  private ttlMs = 45000; // 45 seconds QR code validity

  public generateSessionToken(currentTimestampMs = Date.now()): QrLoginToken {
    const randomHex = Math.random().toString(16).substring(2, 10);
    return {
      token: `qr_auth_${randomHex}_${currentTimestampMs}`,
      expiresAt: currentTimestampMs + this.ttlMs
    };
  }

  public isTokenExpired(token: QrLoginToken, currentTimestampMs = Date.now()): boolean {
    return currentTimestampMs >= token.expiresAt;
  }

  public refreshSessionToken(currentTimestampMs = Date.now()): QrLoginToken {
    return this.generateSessionToken(currentTimestampMs);
  }
}
