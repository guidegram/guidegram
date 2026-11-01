/**
 * Guidegram iOS Spellcheck, Share Popover, Browser, Siri Watermark, HEIF & BOM Governor
 * 
 * Hardens Guidegram against Telegram-iOS issues:
 * - #2401: Multilingual spellcheck false positives and dictionary fallback (Bulgarian/Cyrillic/RTL)
 * - #2391: iPad Share Sheet popover presentation anchor & memory streaming
 * - #2347: In-app browser content bleeding through translucent header above fixed elements
 * - #2339: AirPods Siri Announce Notifications repeatedly announcing older messages
 * - #2337: Sony FX3 / 10-bit Rec.2100 HEIF image upload stall and downsampling
 * - #2329: Stories publishing settings non-scrollable layout on compact viewports
 * - #2321: UTF-8 BOM corruption of Chinese Markdown entity offset ranges
 */

export interface SpellcheckResult {
  text: string;
  detectedLocale: string;
  isDictionarySupported: boolean;
  suppressUnderlines: boolean;
}

export interface PopoverAnchorConfig {
  sourceViewId: string;
  sourceRect: { x: number; y: number; width: number; height: number };
  permittedArrowDirections: ('up' | 'down' | 'left' | 'right')[];
  usesMemoryMappedFileStream: boolean;
}

export interface BrowserSafeAreaStyles {
  injectedCss: string;
  topChromeHeightPx: number;
  fixedHeaderOffsetPx: number;
}

export interface NotificationAnnouncement {
  chatId: string;
  messageId: string;
  timestampMs: number;
  shouldAnnounce: boolean;
  suppressionReason?: string;
}

export interface HeifInspectionResult {
  isHeif: boolean;
  bitDepth: 8 | 10 | 12;
  colorSpace: 'sRGB' | 'Rec2100_HLG' | 'Rec2100_PQ' | 'DisplayP3';
  requiresTranscoding: boolean;
  targetFormat: 'image/jpeg' | 'image/png';
}

export interface StoriesSheetLayout {
  isScrollable: boolean;
  contentHeightPx: number;
  viewportHeightPx: number;
  overscrollEnabled: boolean;
  actionButtonsVisible: boolean;
}

export interface NormalizedEntity {
  type: string;
  offset: number;
  length: number;
}

export interface NormalizedBomResult {
  cleanedText: string;
  bomRemoved: boolean;
  entities: NormalizedEntity[];
}

// -------------------------------------------------------------
// 1. MultilingualSpellcheckGovernor (Resolves #2401)
// -------------------------------------------------------------
export class MultilingualSpellcheckGovernor {
  private supportedDictionaries = new Set(['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'ru-RU', 'it-IT']);

  public evaluateSpellcheck(text: string, preferredLocale: string): SpellcheckResult {
    // Detect Cyrillic, Bulgarian, Greek, or Persian scripts
    const hasBulgarianOrCyrillic = /[\u0400-\u04FF]/.test(text);
    const hasPersianArabic = /[\u0600-\u06FF]/.test(text);

    let effectiveLocale = preferredLocale;
    if (hasBulgarianOrCyrillic && !preferredLocale.startsWith('bg') && !preferredLocale.startsWith('ru')) {
      effectiveLocale = 'bg-BG';
    } else if (hasPersianArabic && !preferredLocale.startsWith('fa')) {
      effectiveLocale = 'fa-IR';
    }

    const isSupported = this.supportedDictionaries.has(effectiveLocale);

    return {
      text,
      detectedLocale: effectiveLocale,
      isDictionarySupported: isSupported,
      // If system dictionary is missing for the language, suppress red underline false positives!
      suppressUnderlines: !isSupported
    };
  }
}

// -------------------------------------------------------------
// 2. IPadSharePopoverAnchorGovernor (Resolves #2391)
// -------------------------------------------------------------
export class IPadSharePopoverAnchorGovernor {
  public configurePopoverAnchor(params: {
    containerWidth: number;
    containerHeight: number;
    fileSizeBytes: number;
    sourceButtonId?: string;
  }): PopoverAnchorConfig {
    // If no button anchor provided, anchor safely to top-trailing corner of the container
    const x = params.sourceButtonId ? 200 : params.containerWidth - 60;
    const y = params.sourceButtonId ? 150 : 40;

    // iPad extension memory ceiling is 120MB; stream files > 15MB via memory-mapped handles
    const useMmap = params.fileSizeBytes > 15 * 1024 * 1024;

    return {
      sourceViewId: params.sourceButtonId ?? 'navigation_bar_share_item',
      sourceRect: { x, y, width: 44, height: 44 },
      permittedArrowDirections: ['up', 'down'],
      usesMemoryMappedFileStream: useMmap
    };
  }
}

// -------------------------------------------------------------
// 3. InAppBrowserSafeAreaGovernor (Resolves #2347)
// -------------------------------------------------------------
export class InAppBrowserSafeAreaGovernor {
  public generateSafeAreaFix(navigationBarHeightPx: number = 44, statusBarHeightPx: number = 47): BrowserSafeAreaStyles {
    const totalTopChrome = navigationBarHeightPx + statusBarHeightPx;

    const injectedCss = `
      :root {
        --tg-browser-chrome-offset: ${totalTopChrome}px;
      }
      body {
        padding-top: var(--tg-browser-chrome-offset) !important;
      }
      header, .fixed-top, [style*="position: fixed"] {
        top: 0 !important;
        margin-top: 0 !important;
      }
    `.trim();

    return {
      injectedCss,
      topChromeHeightPx: totalTopChrome,
      fixedHeaderOffsetPx: totalTopChrome
    };
  }
}

// -------------------------------------------------------------
// 4. SiriAnnounceWatermarkGovernor (Resolves #2339)
// -------------------------------------------------------------
export class SiriAnnounceWatermarkGovernor {
  private lastAnnouncedTimestamps = new Map<string, number>();

  public shouldAnnounceMessage(chatId: string, messageId: string, timestampMs: number): NotificationAnnouncement {
    const watermark = this.lastAnnouncedTimestamps.get(chatId) ?? 0;

    if (timestampMs <= watermark) {
      return {
        chatId,
        messageId,
        timestampMs,
        shouldAnnounce: false,
        suppressionReason: `Message timestamp ${timestampMs} is older than or equal to last announced watermark ${watermark}.`
      };
    }

    // Update monotonic watermark
    this.lastAnnouncedTimestamps.set(chatId, timestampMs);

    return {
      chatId,
      messageId,
      timestampMs,
      shouldAnnounce: true
    };
  }
}

// -------------------------------------------------------------
// 5. ProfessionalHeifTranscoderGovernor (Resolves #2337)
// -------------------------------------------------------------
export class ProfessionalHeifTranscoderGovernor {
  public inspectAndNormalizeHeif(fileHeader: {
    mimeType: string;
    bitDepth: number;
    colorSpace: string;
  }): HeifInspectionResult {
    const isHeif = fileHeader.mimeType === 'image/heif' || fileHeader.mimeType === 'image/heic';
    const is10BitOrHigher = fileHeader.bitDepth >= 10;
    const isHdr = fileHeader.colorSpace.includes('HLG') || fileHeader.colorSpace.includes('PQ') || fileHeader.colorSpace.includes('Rec2100');

    const requiresTranscoding = isHeif && (is10BitOrHigher || isHdr);

    return {
      isHeif,
      bitDepth: (fileHeader.bitDepth as 8 | 10 | 12),
      colorSpace: (fileHeader.colorSpace as any),
      requiresTranscoding,
      targetFormat: 'image/jpeg'
    };
  }
}

// -------------------------------------------------------------
// 6. StoriesPublishingSheetGovernor (Resolves #2329)
// -------------------------------------------------------------
export class StoriesPublishingSheetGovernor {
  public calculateSheetLayout(viewportHeightPx: number, contentComponentsHeightPx: number = 720): StoriesSheetLayout {
    // If content exceeds viewport (minus safe area ~100px), sheet MUST be scrollable
    const usableHeight = viewportHeightPx - 100;
    const isScrollable = contentComponentsHeightPx > usableHeight;

    return {
      isScrollable,
      contentHeightPx: contentComponentsHeightPx,
      viewportHeightPx,
      overscrollEnabled: true,
      actionButtonsVisible: true
    };
  }
}

// -------------------------------------------------------------
// 7. CjkBomEntityNormalizerGovernor (Resolves #2321)
// -------------------------------------------------------------
export class CjkBomEntityNormalizerGovernor {
  public stripBomAndNormalizeEntities(rawText: string, rawEntities: NormalizedEntity[]): NormalizedBomResult {
    const BOM = '\uFEFF';
    let cleanedText = rawText;
    let bomRemoved = false;
    let bomOffsetShift = 0;

    if (rawText.startsWith(BOM)) {
      cleanedText = rawText.slice(1);
      bomRemoved = true;
      bomOffsetShift = 1;
    }

    // Shift entity offsets to account for removed BOM
    const normalizedEntities = rawEntities.map(e => ({
      ...e,
      offset: Math.max(0, e.offset - bomOffsetShift)
    }));

    return {
      cleanedText,
      bomRemoved,
      entities: normalizedEntities
    };
  }
}
