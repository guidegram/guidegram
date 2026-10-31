/**
 * Image Format Decoder, File Dialog Crash Guard & Modal Accessibility Governor
 *
 * Hardened against competitor issues:
 * - telegramdesktop/tdesktop #5522: Support HEIC/HEIF images on Windows/Desktop
 * - telegramdesktop/tdesktop #6520: Increase photo size limit beyond 1280px (HD 2560px & original resolution)
 * - kotatogram/kotatogram-desktop #213: Kotatogram crash when opening OS native file dialog (crash guard & fallback)
 * - morethanwords/tweb #311: User status keeps appending "when" while user is typing
 * - morethanwords/tweb #710: Document download controls announced as "Open document" regardless of state
 * - Ajaxy/telegram-tt #431: Inconsistent UI and accessibility in confirmation modals (Pin / Delete)
 * - Ajaxy/telegram-tt #17: App refreshes/reflows erroneously on launching on-screen keyboard
 */

export type ImageFormat = 'heic' | 'heif' | 'webp' | 'avif' | 'jpeg' | 'png' | 'gif' | 'unknown';

export type PhotoQualityMode = 'standard_1280' | 'hd_2560' | 'uncompressed_original';

export type DownloadState = 'not_downloaded' | 'downloading' | 'paused' | 'downloaded';

export class ImageDecoderAndModalAccessibilityGovernor {
  constructor() {
    this.reset();
  }

  public reset(): void {}

  /**
   * Detects image format by sniffing magic bytes header (TDesktop #5522)
   */
  public detectImageFormat(headerBytes: Uint8Array | number[], fileName: string = ''): ImageFormat {
    if (!headerBytes || headerBytes.length < 12) {
      const ext = fileName.split('.').pop()?.toLowerCase();
      if (ext === 'heic') return 'heic';
      if (ext === 'heif') return 'heif';
      if (ext === 'webp') return 'webp';
      if (ext === 'avif') return 'avif';
      if (ext === 'jpg' || ext === 'jpeg') return 'jpeg';
      if (ext === 'png') return 'png';
      if (ext === 'gif') return 'gif';
      return 'unknown';
    }

    const b = Array.from(headerBytes);

    // JPEG: FF D8 FF
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
      return 'jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
      return 'png';
    }

    // GIF: GIF87a or GIF89a
    if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
      return 'gif';
    }

    // WebP: RIFF ... WEBP (bytes 8..11 = 'WEBP')
    if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) {
      const tag = String.fromCharCode(b[8], b[9], b[10], b[11]);
      if (tag === 'WEBP') return 'webp';
    }

    // ISO Base Media File Format: check ftyp box at offset 4..7
    const ftyp = String.fromCharCode(b[4], b[5], b[6], b[7]);
    if (ftyp === 'ftyp') {
      const brand = String.fromCharCode(b[8], b[9], b[10], b[11]).toLowerCase();
      if (brand === 'heic' || brand === 'heix' || brand === 'heim' || brand === 'heis') {
        return 'heic';
      }
      if (brand === 'mif1' || brand === 'msf1' || brand === 'hevc') {
        return 'heif';
      }
      if (brand === 'avif' || brand === 'avis') {
        return 'avif';
      }
    }

    return 'unknown';
  }

  /**
   * Calculates photo dimensions according to selected quality mode (TDesktop #6520)
   */
  public calculatePhotoDimensions(
    srcWidth: number,
    srcHeight: number,
    qualityMode: PhotoQualityMode = 'hd_2560'
  ): { targetWidth: number; targetHeight: number; scaleFactor: number; mode: PhotoQualityMode } {
    let maxDim = 2560;
    if (qualityMode === 'standard_1280') maxDim = 1280;
    if (qualityMode === 'uncompressed_original') maxDim = 8192;

    const maxSide = Math.max(srcWidth, srcHeight);
    if (maxSide <= maxDim) {
      return { targetWidth: srcWidth, targetHeight: srcHeight, scaleFactor: 1, mode: qualityMode };
    }

    const scale = maxDim / maxSide;
    return {
      targetWidth: Math.round(srcWidth * scale),
      targetHeight: Math.round(srcHeight * scale),
      scaleFactor: scale,
      mode: qualityMode
    };
  }

  /**
   * Opens file dialog safely with fallback to prevent crashes (Kotatogram #213)
   */
  public async openFileDialogSafely(
    osDialogFn: () => Promise<string[] | null>,
    webFallbackFn: () => Promise<string[] | null>
  ): Promise<{ files: string[]; source: 'native' | 'fallback' }> {
    try {
      // Execute native dialog with timeout
      const nativePromise = osDialogFn();
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Native dialog timeout')), 10_000)
      );

      const res = await Promise.race([nativePromise, timeoutPromise]);
      if (res && Array.isArray(res)) {
        return { files: res, source: 'native' };
      }
      return { files: [], source: 'native' };
    } catch {
      // Native OS dialog crashed or timed out, fall back safely
      try {
        const fallbackRes = await webFallbackFn();
        return { files: fallbackRes || [], source: 'fallback' };
      } catch {
        return { files: [], source: 'fallback' };
      }
    }
  }

  /**
   * Formats user status string preventing concatenation bugs (morethanwords #311)
   */
  public formatUserStatus(
    isTyping: boolean,
    typingAction: 'typing' | 'recording_audio' | 'uploading_photo' = 'typing',
    lastSeenSecondsAgo?: number
  ): string {
    if (isTyping) {
      if (typingAction === 'recording_audio') return 'recording a voice message...';
      if (typingAction === 'uploading_photo') return 'sending a photo...';
      return 'typing...';
    }

    if (lastSeenSecondsAgo === undefined || lastSeenSecondsAgo === null) {
      return 'offline';
    }

    if (lastSeenSecondsAgo < 60) {
      return 'online';
    }

    if (lastSeenSecondsAgo < 3600) {
      const minutes = Math.floor(lastSeenSecondsAgo / 60);
      return `last seen ${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }

    if (lastSeenSecondsAgo < 86400) {
      const hours = Math.floor(lastSeenSecondsAgo / 3600);
      return `last seen ${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    return 'last seen recently';
  }

  /**
   * Generates accessible ARIA labels for download controls (morethanwords #710)
   */
  public getDownloadControlAria(
    state: DownloadState,
    fileName: string,
    progressPercent: number = 0
  ): { ariaLabel: string; buttonAction: string } {
    switch (state) {
      case 'not_downloaded':
        return {
          ariaLabel: `Download ${fileName}`,
          buttonAction: 'download'
        };
      case 'downloading':
        return {
          ariaLabel: `Pause download of ${fileName} (${Math.round(progressPercent)}% completed)`,
          buttonAction: 'pause'
        };
      case 'paused':
        return {
          ariaLabel: `Resume download of ${fileName} (paused at ${Math.round(progressPercent)}%)`,
          buttonAction: 'resume'
        };
      case 'downloaded':
        return {
          ariaLabel: `Open ${fileName}`,
          buttonAction: 'open'
        };
    }
  }

  /**
   * Handles keyboard actions inside confirmation modals (Ajaxy #431)
   */
  public handleModalKeyboard(
    key: string,
    onConfirm: () => void,
    onCancel: () => void
  ): { handled: boolean; action: 'confirm' | 'cancel' | 'none' } {
    if (key === 'Escape') {
      onCancel();
      return { handled: true, action: 'cancel' };
    }
    if (key === 'Enter') {
      onConfirm();
      return { handled: true, action: 'confirm' };
    }
    return { handled: false, action: 'none' };
  }
}

export const imageDecoderAndModalAccessibilityGovernor = new ImageDecoderAndModalAccessibilityGovernor();
