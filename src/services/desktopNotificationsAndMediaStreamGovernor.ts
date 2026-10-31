/**
 * Guidegram Desktop Notifications, Taskbar Badges & High-Def Screen Share Governor
 * 
 * Hardened against:
 * - tdesktop #91 & #3831: Native desktop notification dispatching (Windows Action Center & Linux DBus)
 * - tdesktop #10407: Taskbar/dock icon unread notification counter badge on Linux & Windows
 * - tdesktop #16487: Low-quality screen sharing (adaptive 60fps & high-clarity WebRTC constraints)
 * - tdesktop #7192 & #3830: Custom application status and tray icon path resolution
 */

export interface NativeNotificationPayload {
  title: string;
  body: string;
  iconUrl?: string;
  silent: boolean;
  actions: Array<{ action: string; title: string }>;
  tag: string; // Deduplication tag
  urgency: 'low' | 'normal' | 'critical';
}

export interface ScreenShareProfileConfig {
  contentHint: 'detail' | 'motion' | 'text';
  prefersHighFramerate: boolean;
  maxResolutionWidth: number;
  maxResolutionHeight: number;
}

export interface WebRtcMediaConstraints {
  video: {
    width: { ideal: number; max: number };
    height: { ideal: number; max: number };
    frameRate: { ideal: number; max: number };
    cursor: 'always' | 'motion' | 'never';
  };
  audio: boolean;
}

export class DesktopNotificationsAndMediaStreamGovernor {
  /**
   * Formats native desktop notification payloads with sender avatar, reply actions,
   * urgency levels, and deduplication tags (tdesktop #91, #3831).
   */
  public static formatNativeNotification(
    chatTitle: string,
    senderName: string,
    messageText: string,
    chatId: number,
    avatarUrl?: string,
    isMuted: boolean = false
  ): NativeNotificationPayload {
    const title = chatTitle === senderName ? senderName : `${senderName} (${chatTitle})`;
    const truncatedBody = messageText.length > 200 ? `${messageText.slice(0, 197)}...` : messageText;

    return {
      title,
      body: truncatedBody,
      iconUrl: avatarUrl,
      silent: isMuted,
      actions: [
        { action: 'reply', title: 'Reply' },
        { action: 'markAsRead', title: 'Mark as Read' }
      ],
      tag: `chat_${chatId}`,
      urgency: isMuted ? 'low' : 'normal'
    };
  }

  /**
   * Computes desktop dock/taskbar unread badge numbers and label representations,
   * avoiding negative or NaN values (tdesktop #10407).
   */
  public static computeLauncherBadge(
    unmutedUnreadCount: number,
    mutedUnreadCount: number
  ): { count: number; badgeLabel: string; hasUnmuted: boolean } {
    const total = Math.max(0, unmutedUnreadCount + mutedUnreadCount);
    const hasUnmuted = unmutedUnreadCount > 0;

    let badgeLabel = '';
    if (total > 0) {
      badgeLabel = total > 999 ? '999+' : String(total);
    }

    return {
      count: total,
      badgeLabel,
      hasUnmuted
    };
  }

  /**
   * Calculates optimal WebRTC screen sharing constraints with dynamic 60fps motion
   * or high-clarity text presentation profiles (tdesktop #16487).
   */
  public static getScreenShareConstraints(config: ScreenShareProfileConfig): WebRtcMediaConstraints {
    // If high-framerate motion is preferred (e.g. video/gaming stream), use 60fps
    const frameRate = config.prefersHighFramerate ? 60 : 30;

    const width = Math.min(3840, Math.max(1280, config.maxResolutionWidth || 1920));
    const height = Math.min(2160, Math.max(720, config.maxResolutionHeight || 1080));

    return {
      video: {
        width: { ideal: width, max: width },
        height: { ideal: height, max: height },
        frameRate: { ideal: frameRate, max: frameRate },
        cursor: 'always'
      },
      audio: true
    };
  }

  /**
   * Resolves application status icon file path across SVG, PNG, and ICO formats,
   * returning default fallback if custom path is invalid or missing (tdesktop #7192, #3830).
   */
  public static resolveAppIconPath(
    customIconPath: string | null,
    defaultIconPath: string = 'assets/icons/guidegram.png'
  ): { selectedPath: string; isCustom: boolean } {
    if (!customIconPath || customIconPath.trim() === '') {
      return { selectedPath: defaultIconPath, isCustom: false };
    }

    const trimmed = customIconPath.trim();
    const isSupportedExtension = /\.(png|svg|ico|icns)$/i.test(trimmed);

    if (isSupportedExtension) {
      return { selectedPath: trimmed, isCustom: true };
    }

    return { selectedPath: defaultIconPath, isCustom: false };
  }
}
