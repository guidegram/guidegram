/**
 * Vim Modal Keybindings, ARM64 SIMD Dispatch, Wayland Window Management,
 * Portable Path Isolation, Memory Security Hardening, Native Style & API Deprecation Governor
 *
 * Hardening against competitor issues:
 * - kotatogram/kotatogram-desktop#371: Vim modal keybindings (normal vs insert mode, j/k, G/gg, dd).
 * - telegramdesktop/tdesktop#25266: Windows on ARM64 hardware optimization and SIMD instruction dispatch.
 * - telegramdesktop/tdesktop#2353: Native Wayland compositor support and CSD/SSD decoration management.
 * - telegramdesktop/tdesktop#2355: Portable data directory path resolution vs system %APPDATA%.
 * - telegramdesktop/tdesktop#1112: Runtime memory security hardening and cryptographic zeroing.
 * - telegramdesktop/tdesktop#987: Native desktop style enforcement (avoiding forced archaic win98 styles).
 * - kotatogram/kotatogram-desktop#256: Outdated app API layer deprecation warning handler.
 */

export type VimMode = 'normal' | 'insert';

export interface VimCommandResult {
  mode: VimMode;
  action: 'none' | 'nav_next' | 'nav_prev' | 'scroll_top' | 'scroll_bottom' | 'enter_insert' | 'exit_insert' | 'search_focus' | 'delete_draft';
  consumed: boolean;
}

export class VimModalKeybindingController {
  private currentMode: VimMode = 'normal';
  private keySequence = '';
  private isEnabled = true;

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.currentMode = 'insert';
    }
  }

  getMode(): VimMode {
    return this.currentMode;
  }

  handleKey(key: string, isComposerFocused: boolean): VimCommandResult {
    if (!this.isEnabled) {
      return { mode: 'insert', action: 'none', consumed: false };
    }

    if (key === 'Escape') {
      this.currentMode = 'normal';
      this.keySequence = '';
      return { mode: 'normal', action: 'exit_insert', consumed: true };
    }

    if (this.currentMode === 'insert') {
      return { mode: 'insert', action: 'none', consumed: false };
    }

    // Normal mode commands
    if (key === 'i' || key === 'a') {
      this.currentMode = 'insert';
      this.keySequence = '';
      return { mode: 'insert', action: 'enter_insert', consumed: true };
    }

    if (key === 'j') {
      return { mode: 'normal', action: 'nav_next', consumed: true };
    }

    if (key === 'k') {
      return { mode: 'normal', action: 'nav_prev', consumed: true };
    }

    if (key === '/') {
      return { mode: 'normal', action: 'search_focus', consumed: true };
    }

    if (key === 'G') {
      return { mode: 'normal', action: 'scroll_bottom', consumed: true };
    }

    if (key === 'g') {
      if (this.keySequence === 'g') {
        this.keySequence = '';
        return { mode: 'normal', action: 'scroll_top', consumed: true };
      }
      this.keySequence = 'g';
      return { mode: 'normal', action: 'none', consumed: true };
    }

    if (key === 'd') {
      if (this.keySequence === 'd') {
        this.keySequence = '';
        return { mode: 'normal', action: 'delete_draft', consumed: true };
      }
      this.keySequence = 'd';
      return { mode: 'normal', action: 'none', consumed: true };
    }

    this.keySequence = '';
    return { mode: 'normal', action: 'none', consumed: false };
  }
}

export type CpuArch = 'arm64' | 'x64' | 'ia32' | 'arm';

export class Arm64HardwareSimdDispatcher {
  dispatchSimdPipeline(arch: CpuArch): {
    arch: CpuArch;
    pipeline: 'neon' | 'avx2' | 'sse4' | 'scalar';
    isNativeArm64: boolean;
  } {
    if (arch === 'arm64') {
      return {
        arch: 'arm64',
        pipeline: 'neon',
        isNativeArm64: true,
      };
    }

    if (arch === 'x64') {
      return {
        arch: 'x64',
        pipeline: 'avx2',
        isNativeArm64: false,
      };
    }

    return {
      arch,
      pipeline: 'scalar',
      isNativeArm64: false,
    };
  }
}

export class WaylandWindowEnvironmentGovernor {
  resolveWindowDecorations(sessionType: string | undefined): {
    isWayland: boolean;
    useClientSideDecorations: boolean;
    subsurfaceIntegration: boolean;
  } {
    const isWayland = sessionType?.toLowerCase() === 'wayland';
    return {
      isWayland,
      useClientSideDecorations: isWayland, // Under Wayland, client-side decorations prevent missing frame borders
      subsurfaceIntegration: isWayland,
    };
  }
}

export class PortableDataPathResolver {
  resolveDataPath(options: {
    executableDirPath: string;
    hasAdjacentTdata: boolean;
    hasPortableFlag: boolean;
    systemAppDataPath: string;
  }): {
    resolvedPath: string;
    isPortable: boolean;
  } {
    if (options.hasAdjacentTdata || options.hasPortableFlag) {
      return {
        resolvedPath: `${options.executableDirPath}/tdata`,
        isPortable: true,
      };
    }

    return {
      resolvedPath: `${options.systemAppDataPath}/Guidegram/tdata`,
      isPortable: false,
    };
  }
}

export class RuntimeMemoryHardeningGovernor {
  /**
   * Cryptographically zeros buffer to prevent lingering keys in memory
   */
  wipeSensitiveBuffer(buffer: Uint8Array): void {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = 0;
    }
  }

  isZeroed(buffer: Uint8Array): boolean {
    return buffer.every((byte) => byte === 0);
  }
}

export class NativeDesktopStyleAdaptor {
  resolveThemeStyle(platform: string, desktopEnv?: string): {
    themeName: string;
    fontFamily: string;
    borderCornerRadiusPx: number;
  } {
    if (platform === 'darwin') {
      return {
        themeName: 'macOS-Aqua',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text"',
        borderCornerRadiusPx: 10,
      };
    }

    if (platform === 'win32') {
      return {
        themeName: 'Windows-Fluent',
        fontFamily: '"Segoe UI Variable", "Segoe UI", sans-serif',
        borderCornerRadiusPx: 8,
      };
    }

    // Linux
    const isKde = desktopEnv?.toLowerCase().includes('kde') || desktopEnv?.toLowerCase().includes('plasma');
    return {
      themeName: isKde ? 'Breeze' : 'Adwaita',
      fontFamily: 'Inter, system-ui, sans-serif',
      borderCornerRadiusPx: 6,
    };
  }
}

export class ApiLayerDeprecationHandler {
  evaluateDeprecation(serverNotice?: {
    isDeprecated: boolean;
    sunsetTimestamp?: number;
    updateUrl?: string;
  }): {
    status: 'ok' | 'warning' | 'urgent_update';
    message: string;
    daysRemaining?: number;
  } {
    if (!serverNotice || !serverNotice.isDeprecated) {
      return {
        status: 'ok',
        message: 'Client protocol version is fully supported.',
      };
    }

    const now = Date.now();
    const sunsetMs = serverNotice.sunsetTimestamp || now + 30 * 86400 * 1000;
    const diffDays = Math.max(0, Math.ceil((sunsetMs - now) / (86400 * 1000)));

    if (diffDays <= 3) {
      return {
        status: 'urgent_update',
        message: 'This version will stop working in less than 3 days. Please update immediately.',
        daysRemaining: diffDays,
      };
    }

    return {
      status: 'warning',
      message: `An update is required soon (${diffDays} days remaining).`,
      daysRemaining: diffDays,
    };
  }
}

export class DesktopVimArm64WaylandAndSecurityGovernor {
  public vimController = new VimModalKeybindingController();
  public simdDispatcher = new Arm64HardwareSimdDispatcher();
  public waylandGovernor = new WaylandWindowEnvironmentGovernor();
  public pathResolver = new PortableDataPathResolver();
  public memoryHardener = new RuntimeMemoryHardeningGovernor();
  public styleAdaptor = new NativeDesktopStyleAdaptor();
  public deprecationHandler = new ApiLayerDeprecationHandler();
}
