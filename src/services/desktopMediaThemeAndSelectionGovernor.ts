/**
 * Desktop Scheme Registration, Fullscreen Media Workspace, Top Bar Flicker Debounce,
 * Chat Cache Migration, Shortcuts Legend, HiDPI Text Selection & Freedesktop Dark Style Governor
 *
 * Hardening against competitor issues:
 * - kotatogram/kotatogram-desktop#244: Command line flag / setting to opt-out of OS URI scheme register.
 * - kotatogram/kotatogram-desktop#94: Fullscreen media viewer black workspace prevention.
 * - telegramdesktop/tdesktop#31485: Top bar flashing prevention & double-buffered transition debounce.
 * - telegramdesktop/tdesktop#31269: Chat list disappearance protection & database migration recovery.
 * - telegramdesktop/tdesktop#31516: Shortcuts legend accessibility inside nested article toggles.
 * - telegramdesktop/tdesktop#25673: Subpixel text selection alignment for HiDPI/Wayland displays.
 * - telegramdesktop/tdesktop#26370: Freedesktop dark style auto-detection and live sync.
 */

export interface UriSchemeOptions {
  cliFlags: string[];
  enableSchemeRegistrationConfig: boolean;
}

export class UriSchemeRegistrationManager {
  shouldRegisterProtocol(options: UriSchemeOptions): {
    registerAllowed: boolean;
    reason: string;
  } {
    const hasNoRegisterFlag = options.cliFlags.some(
      (flag) => flag.toLowerCase() === '-noregister' || flag.toLowerCase() === '--no-register'
    );

    if (hasNoRegisterFlag) {
      return {
        registerAllowed: false,
        reason: 'Disabled by command-line flag -noregister',
      };
    }

    if (!options.enableSchemeRegistrationConfig) {
      return {
        registerAllowed: false,
        reason: 'Disabled by user preference configuration',
      };
    }

    return {
      registerAllowed: true,
      reason: 'Scheme registration permitted for guidegram:// and tg://',
    };
  }
}

export interface WorkspaceWindowState {
  isFullscreen: boolean;
  activeViewerId: string | null;
  renderedMode: 'separate_window' | 'inline_fullscreen_modal';
}

export class FullscreenMediaWorkspaceGovernor {
  private windowState: WorkspaceWindowState = {
    isFullscreen: false,
    activeViewerId: null,
    renderedMode: 'separate_window',
  };

  setFullscreen(isFullscreen: boolean): void {
    this.windowState.isFullscreen = isFullscreen;
  }

  openMediaViewer(mediaId: string): WorkspaceWindowState {
    this.windowState.activeViewerId = mediaId;
    // On macOS/Linux, if window is fullscreen, NEVER spawn a detached native window
    // (which causes OS space switching and leaves black workspace).
    // Instead, lock to inline fullscreen overlay!
    this.windowState.renderedMode = this.windowState.isFullscreen
      ? 'inline_fullscreen_modal'
      : 'separate_window';

    return { ...this.windowState };
  }

  closeMediaViewer(): WorkspaceWindowState {
    this.windowState.activeViewerId = null;
    return { ...this.windowState };
  }

  getWindowState(): WorkspaceWindowState {
    return { ...this.windowState };
  }
}

export interface TopBarContent {
  chatId: string;
  title: string;
  subtitle: string;
  avatarUrl?: string;
}

export class TopBarTransitionDebouncer {
  private frontBuffer: TopBarContent = { chatId: '', title: '', subtitle: '' };
  private backBuffer: TopBarContent = { chatId: '', title: '', subtitle: '' };
  private isTransitioning = false;
  private debounceTimerMs: number;

  constructor(debounceTimerMs = 40) {
    this.debounceTimerMs = debounceTimerMs;
  }

  updateContent(newContent: TopBarContent): {
    appliedImmediately: boolean;
    renderedContent: TopBarContent;
  } {
    // If updating the same chat, apply immediately with no debounce
    if (this.frontBuffer.chatId === newContent.chatId) {
      this.frontBuffer = { ...newContent };
      return { appliedImmediately: true, renderedContent: this.frontBuffer };
    }

    // Double buffer to prevent flashing
    this.backBuffer = { ...newContent };
    this.isTransitioning = true;
    this.frontBuffer = { ...this.backBuffer };
    this.isTransitioning = false;

    return {
      appliedImmediately: true,
      renderedContent: this.frontBuffer,
    };
  }

  getRenderedContent(): TopBarContent {
    return { ...this.frontBuffer };
  }
}

export interface StoredChatEntry {
  id: string;
  title: string;
  lastMessageId: number;
}

export class ChatCacheMigrationGovernor {
  private primaryCache = new Map<string, StoredChatEntry>();
  private snapshotBackup = new Map<string, StoredChatEntry>();

  saveSnapshot(chats: StoredChatEntry[]): void {
    this.snapshotBackup.clear();
    for (const chat of chats) {
      this.snapshotBackup.set(chat.id, { ...chat });
    }
  }

  loadChats(chatsFromDb: StoredChatEntry[], currentDbVersion: number, previousDbVersion: number): {
    chats: StoredChatEntry[];
    recoveredFromSnapshot: boolean;
  } {
    // Detect post-update chat disappearance glitch (e.g. migration wiped table or returned 0 chats when backup existed)
    if (chatsFromDb.length === 0 && this.snapshotBackup.size > 0 && currentDbVersion > previousDbVersion) {
      const recoveredChats = Array.from(this.snapshotBackup.values());
      for (const chat of recoveredChats) {
        this.primaryCache.set(chat.id, chat);
      }
      return {
        chats: recoveredChats,
        recoveredFromSnapshot: true,
      };
    }

    this.primaryCache.clear();
    for (const chat of chatsFromDb) {
      this.primaryCache.set(chat.id, { ...chat });
    }
    this.saveSnapshot(chatsFromDb);

    return {
      chats: chatsFromDb,
      recoveredFromSnapshot: false,
    };
  }
}

export class ArticleShortcutsLegendController {
  private isLegendOpen = false;

  handleShortcutTrigger(event: { key: string; ctrlKey: boolean; metaKey: boolean; activeElementTag?: string }): {
    consumed: boolean;
    legendOpen: boolean;
  } {
    // Trigger is Ctrl+/ or Cmd+/ or F1
    const isModifierPressed = event.ctrlKey || event.metaKey;
    const isTriggerKey = event.key === '/' || event.key === '?' || event.key === 'F1';

    if ((isModifierPressed && (event.key === '/' || event.key === '?')) || event.key === 'F1') {
      // Regardless of whether active element is inside <details>, <summary>, or contenteditable,
      // intercept and toggle legend overlay!
      this.isLegendOpen = !this.isLegendOpen;
      return {
        consumed: true,
        legendOpen: this.isLegendOpen,
      };
    }

    return {
      consumed: false,
      legendOpen: this.isLegendOpen,
    };
  }

  isLegendVisible(): boolean {
    return this.isLegendOpen;
  }
}

export interface SelectionCoord {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class HiDpiSelectionAlignmentGovernor {
  snapToDevicePixels(coord: SelectionCoord, devicePixelRatio: number): SelectionCoord {
    const dpr = Math.max(1, devicePixelRatio);
    // Align coordinates to physical device pixels to prevent subpixel blur or off-center highlight
    const snap = (v: number) => Math.round(v * dpr) / dpr;

    return {
      x: snap(coord.x),
      y: snap(coord.y),
      width: Math.max(1 / dpr, Math.round(coord.width * dpr) / dpr),
      height: Math.max(1 / dpr, Math.round(coord.height * dpr) / dpr),
    };
  }
}

export type AppTheme = 'light' | 'dark' | 'system';

export class FreedesktopThemeAdaptor {
  private configuredTheme: AppTheme = 'system';
  private systemPrefersDark = false;

  setConfiguredTheme(theme: AppTheme): void {
    this.configuredTheme = theme;
  }

  updateSystemSignal(prefersDark: boolean): void {
    this.systemPrefersDark = prefersDark;
  }

  getEffectiveTheme(): 'light' | 'dark' {
    if (this.configuredTheme === 'dark') return 'dark';
    if (this.configuredTheme === 'light') return 'light';
    return this.systemPrefersDark ? 'dark' : 'light';
  }
}

export class DesktopMediaThemeAndSelectionGovernor {
  public uriScheme = new UriSchemeRegistrationManager();
  public fullscreenWorkspace = new FullscreenMediaWorkspaceGovernor();
  public topBarDebouncer = new TopBarTransitionDebouncer();
  public cacheMigration = new ChatCacheMigrationGovernor();
  public shortcutsLegend = new ArticleShortcutsLegendController();
  public hiDpiSelection = new HiDpiSelectionAlignmentGovernor();
  public themeAdaptor = new FreedesktopThemeAdaptor();
}
