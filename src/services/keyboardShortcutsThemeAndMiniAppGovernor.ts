/**
 * Keyboard Send Shortcuts, Theme Accent & Mini App Viewport Governor
 *
 * Hardened against competitor issues:
 * - morethanwords/tweb #100, #71, #24: Send on Enter / Ctrl+Enter broken on ChromeOS, Android, and Vivaldi
 * - morethanwords/tweb #518: Support custom aspect ratios for Telegram Mini Apps (TWA)
 * - morethanwords/tweb #228: Customizable PWA theme & accent color
 * - telegramdesktop/tdesktop #31283: Mini App malformed from list button vs bot menu button
 * - Ajaxy/telegram-tt #550: Crash when parsing invalid color strings like #hsla(...)
 * - Ajaxy/telegram-tt #397: Missing Roboto font weight 600 fallback
 * - morethanwords/tweb #136: Media preview support in bot descriptions
 */

export type SendKeyboardMode = 'enter' | 'ctrl_enter';

export interface KeyboardEventLike {
  key: string;
  code?: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

export type MiniAppDisplayMode = 'standard' | 'expanded' | 'fullscreen' | 'custom_aspect';

export interface MiniAppViewportConfig {
  width: number;
  height: number;
  aspectRatio: number;
  mode: MiniAppDisplayMode;
  allowCustomParams: boolean;
}

export interface BotDescriptionMedia {
  type: 'photo' | 'animation' | 'video';
  url: string;
  thumbnailUrl?: string;
}

export class KeyboardShortcutsThemeAndMiniAppGovernor {
  private sendMode: SendKeyboardMode = 'enter';
  private currentAccentColor: string = '#0088cc';
  private customAspectRatios: Map<string, number> = new Map(); // appId -> ratio (w/h)

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.sendMode = 'enter';
    this.currentAccentColor = '#0088cc';
    this.customAspectRatios.clear();
  }

  public setSendMode(mode: SendKeyboardMode): void {
    this.sendMode = mode;
  }

  public getSendMode(): SendKeyboardMode {
    return this.sendMode;
  }

  /**
   * Evaluates if a keyboard event should trigger message sending (morethanwords #100, #71, #24)
   */
  public shouldSendMessage(event: KeyboardEventLike, mode: SendKeyboardMode = this.sendMode): boolean {
    const isEnter = event.key === 'Enter' || event.code === 'Enter';
    if (!isEnter) return false;

    if (mode === 'enter') {
      // Send on Enter: plain Enter without Shift or Alt sends
      return !event.shiftKey && !event.altKey;
    } else {
      // Send on Ctrl+Enter: requires Ctrl (Windows/Linux) or Meta/Cmd (macOS)
      return (event.ctrlKey || event.metaKey) && !event.shiftKey;
    }
  }

  /**
   * Calculates Mini App Viewport with custom aspect ratio support (morethanwords #518, TDesktop #31283)
   */
  public calculateMiniAppViewport(
    appId: string,
    mode: MiniAppDisplayMode = 'standard',
    windowWidth: number = 1280,
    windowHeight: number = 720
  ): MiniAppViewportConfig {
    const customRatio = this.customAspectRatios.get(appId);

    if (mode === 'fullscreen') {
      return {
        width: windowWidth,
        height: windowHeight,
        aspectRatio: windowWidth / Math.max(1, windowHeight),
        mode: 'fullscreen',
        allowCustomParams: true
      };
    }

    if (mode === 'custom_aspect' && customRatio) {
      let w = Math.min(windowWidth * 0.9, 800);
      let h = w / customRatio;
      if (h > windowHeight * 0.85) {
        h = windowHeight * 0.85;
        w = h * customRatio;
      }
      return {
        width: Math.round(w),
        height: Math.round(h),
        aspectRatio: customRatio,
        mode: 'custom_aspect',
        allowCustomParams: true
      };
    }

    if (mode === 'expanded') {
      return {
        width: Math.round(Math.min(windowWidth * 0.85, 960)),
        height: Math.round(windowHeight * 0.85),
        aspectRatio: 960 / Math.max(1, windowHeight * 0.85),
        mode: 'expanded',
        allowCustomParams: true
      };
    }

    // Default standard modal (portrait phone aspect 9:16 or min 400x600)
    return {
      width: 420,
      height: 640,
      aspectRatio: 420 / 640,
      mode: 'standard',
      allowCustomParams: true
    };
  }

  public setCustomAspectRatio(appId: string, ratio: number): void {
    if (ratio > 0.2 && ratio < 5.0) {
      this.customAspectRatios.set(appId, ratio);
    }
  }

  /**
   * Safely parses and normalizes theme colors without crashing on syntax errors (morethanwords #228, Ajaxy #550)
   */
  public parseColorSafely(input: string): { valid: boolean; hex: string; rgba: string } {
    if (!input || typeof input !== 'string') {
      return { valid: false, hex: '#0088cc', rgba: 'rgba(0, 136, 204, 1)' };
    }

    let clean = input.trim().toLowerCase();

    // Fix bug Ajaxy #550: strip erroneous '#hsla(...)' or '#rgba(...)' prefixes
    if (clean.startsWith('#hsla') || clean.startsWith('#hsl')) {
      clean = clean.substring(1);
    }
    if (clean.startsWith('#rgba') || clean.startsWith('#rgb')) {
      clean = clean.substring(1);
    }

    // Standard Hex: #fff or #ffffff
    const hexMatch = clean.match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/);
    if (hexMatch) {
      let hex = hexMatch[1];
      if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
      }
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return { valid: true, hex: `#${hex}`, rgba: `rgba(${r}, ${g}, ${b}, 1)` };
    }

    // RGB / RGBA
    const rgbMatch = clean.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
    if (rgbMatch) {
      const r = Math.min(255, parseInt(rgbMatch[1], 10));
      const g = Math.min(255, parseInt(rgbMatch[2], 10));
      const b = Math.min(255, parseInt(rgbMatch[3], 10));
      const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;
      const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      return { valid: true, hex, rgba: `rgba(${r}, ${g}, ${b}, ${a})` };
    }

    // HSL / HSLA
    const hslMatch = clean.match(/^hsla?\((\d+),\s*(\d+)%?,\s*(\d+)%?(?:,\s*([\d.]+))?\)$/);
    if (hslMatch) {
      const h = parseInt(hslMatch[1], 10) / 360;
      const s = parseInt(hslMatch[2], 10) / 100;
      const l = parseInt(hslMatch[3], 10) / 100;
      const a = hslMatch[4] !== undefined ? parseFloat(hslMatch[4]) : 1;

      // HSL to RGB conversion
      let r: number, g: number, b: number;
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }
      const ri = Math.round(r * 255);
      const gi = Math.round(g * 255);
      const bi = Math.round(b * 255);
      const hex = `#${((1 << 24) + (ri << 16) + (gi << 8) + bi).toString(16).slice(1)}`;
      return { valid: true, hex, rgba: `rgba(${ri}, ${gi}, ${bi}, ${a})` };
    }

    // Fallback safe color
    return { valid: false, hex: '#0088cc', rgba: 'rgba(0, 136, 204, 1)' };
  }

  /**
   * Font stack resolver with weight 600 fallback (Ajaxy #397)
   */
  public getResolvedFontWeight(fontFamily: string, requestedWeight: number = 600): number {
    // If requesting 600 (semi-bold) on fonts lacking 600 weight, fall back to 700 bold
    if (requestedWeight === 600) {
      if (fontFamily.toLowerCase().includes('roboto')) {
        return 700; // Bold fallback ensures legible rendering on systems missing Roboto-Medium
      }
    }
    return requestedWeight;
  }

  /**
   * Extracts media preview attachments from bot description text (morethanwords #136)
   */
  public parseBotDescriptionMedia(description: string): BotDescriptionMedia[] {
    if (!description) return [];

    const mediaList: BotDescriptionMedia[] = [];
    // Detect GIF / MP4 / Image URLs in bot descriptions
    const urlRegex = /(https?:\/\/[^\s]+\.(?:gif|mp4|webm|jpg|jpeg|png))/gi;
    let match: RegExpExecArray | null;

    while ((match = urlRegex.exec(description)) !== null) {
      const url = match[1];
      const ext = url.split('.').pop()?.toLowerCase();
      if (ext === 'gif' || ext === 'mp4' || ext === 'webm') {
        mediaList.push({ type: 'animation', url });
      } else {
        mediaList.push({ type: 'photo', url });
      }
    }

    return mediaList;
  }
}

export const keyboardShortcutsThemeAndMiniAppGovernor = new KeyboardShortcutsThemeAndMiniAppGovernor();
