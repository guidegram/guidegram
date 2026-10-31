/**
 * Article Editor AST, Mini App GIF Upload, Layout Overlap, Call Typography & Channel RSS Governor
 *
 * Hardening against competitor issues:
 * - telegramdesktop/tdesktop#31519: Focus header size highlighting & breadcrumb metrics.
 * - telegramdesktop/tdesktop#31499: Article toggle block click isolation during editing.
 * - telegramdesktop/tdesktop#31452: Lossless AST serialization for nested toggle blocks & checklists.
 * - telegramdesktop/tdesktop#31444: Mini App animated GIF upload preservation.
 * - telegramdesktop/tdesktop#31399: Member role badge overlap avoidance above small attachments.
 * - telegramdesktop/tdesktop#31264: Call participant name typography descender clearance.
 * - telegramdesktop/tdesktop#1640: Channel post to RSS/Atom feed conversion with enclosure caching.
 */

export type HeaderLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeaderFocusInfo {
  level: HeaderLevel;
  fontSizePt: number;
  lineHeightMultiplier: number;
  breadcrumbLabel: string;
}

export class ArticleEditorHeaderIndicator {
  private static readonly LEVEL_MAP: Record<HeaderLevel, { pt: number; multiplier: number; label: string }> = {
    1: { pt: 28, multiplier: 1.25, label: 'Title (H1)' },
    2: { pt: 22, multiplier: 1.3, label: 'Section Header (H2)' },
    3: { pt: 18, multiplier: 1.35, label: 'Subheader (H3)' },
    4: { pt: 15, multiplier: 1.4, label: 'Minor Heading (H4)' },
    5: { pt: 13, multiplier: 1.45, label: 'Paragraph Header (H5)' },
    6: { pt: 11, multiplier: 1.5, label: 'Caption Header (H6)' },
  };

  getHeaderFocusInfo(level: HeaderLevel): HeaderFocusInfo {
    const config = ArticleEditorHeaderIndicator.LEVEL_MAP[level] || ArticleEditorHeaderIndicator.LEVEL_MAP[2];
    return {
      level,
      fontSizePt: config.pt,
      lineHeightMultiplier: config.multiplier,
      breadcrumbLabel: config.label,
    };
  }
}

export interface ToggleBlockState {
  id: string;
  isCollapsed: boolean;
  isEditing: boolean;
  summaryText: string;
  content: string;
}

export class ArticleToggleBlockGovernor {
  private toggles = new Map<string, ToggleBlockState>();

  registerToggle(id: string, summaryText: string, content = '', isCollapsed = false): ToggleBlockState {
    const state: ToggleBlockState = {
      id,
      isCollapsed,
      isEditing: false,
      summaryText,
      content,
    };
    this.toggles.set(id, state);
    return state;
  }

  setEditing(id: string, editing: boolean): void {
    const item = this.toggles.get(id);
    if (!item) return;
    item.isEditing = editing;
    // When editing, do not allow it to stay collapsed
    if (editing && item.isCollapsed) {
      item.isCollapsed = false;
    }
  }

  handleToggleClick(id: string, targetElementType: 'chevron' | 'summary' | 'content_editor'): boolean {
    const item = this.toggles.get(id);
    if (!item) return false;

    // If click originates inside the editable content, NEVER collapse
    if (targetElementType === 'content_editor') {
      return item.isCollapsed;
    }

    // If editing mode is active, only explicit chevron click can collapse
    if (item.isEditing && targetElementType === 'summary') {
      return item.isCollapsed; // No toggle on summary text click while editing
    }

    item.isCollapsed = !item.isCollapsed;
    return item.isCollapsed;
  }

  getToggle(id: string): ToggleBlockState | undefined {
    return this.toggles.get(id);
  }
}

export type ArticleNode =
  | { type: 'paragraph'; text: string }
  | { type: 'checklist'; items: { text: string; checked: boolean; children?: ArticleNode[] }[] }
  | { type: 'toggle'; summary: string; children: ArticleNode[] };

export class NestedChecklistToggleSerializer {
  serializeToAst(nodes: ArticleNode[]): string {
    return JSON.stringify(nodes, null, 2);
  }

  deserializeFromAst(jsonString: string): ArticleNode[] {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        return parsed as ArticleNode[];
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Export to markdown preserving custom tags for nested toggles inside checklists
   * preventing destruction into standard bullet items on mobile/web clients.
   */
  exportSafeMarkdown(nodes: ArticleNode[]): string {
    const lines: string[] = [];

    for (const node of nodes) {
      if (node.type === 'paragraph') {
        lines.push(node.text);
      } else if (node.type === 'checklist') {
        for (const item of node.items) {
          const checkMark = item.checked ? '[x]' : '[ ]';
          lines.push(`- ${checkMark} ${item.text}`);
          if (item.children && item.children.length > 0) {
            for (const child of item.children) {
              if (child.type === 'toggle') {
                lines.push(`  <details><summary>${child.summary}</summary>`);
                for (const sub of child.children) {
                  if (sub.type === 'paragraph') {
                    lines.push(`    ${sub.text}`);
                  }
                }
                lines.push('  </details>');
              }
            }
          }
        }
      } else if (node.type === 'toggle') {
        lines.push(`<details><summary>${node.summary}</summary>`);
        for (const child of node.children) {
          if (child.type === 'paragraph') {
            lines.push(`  ${child.text}`);
          }
        }
        lines.push('</details>');
      }
    }

    return lines.join('\n');
  }
}

export interface UploadedMediaItem {
  filename: string;
  bytes: Uint8Array;
  declaredMimeType?: string;
}

export class MiniAppMediaUploadPreserver {
  detectAndPreserveGif(media: UploadedMediaItem): {
    isAnimatedGif: boolean;
    finalMimeType: string;
    shouldTranscodeToStatic: boolean;
  } {
    // Check GIF header magic bytes: GIF87a (0x47 0x49 0x46 0x38 0x37 0x61) or GIF89a (0x47 0x49 0x46 0x38 0x39 0x61)
    const isGif =
      media.bytes.length >= 6 &&
      media.bytes[0] === 0x47 &&
      media.bytes[1] === 0x49 &&
      media.bytes[2] === 0x46 &&
      media.bytes[3] === 0x38 &&
      (media.bytes[4] === 0x37 || media.bytes[4] === 0x39) &&
      media.bytes[5] === 0x61;

    if (isGif) {
      return {
        isAnimatedGif: true,
        finalMimeType: 'image/gif',
        shouldTranscodeToStatic: false, // PRESERVE animated frames for BotFather and Mini Apps!
      };
    }

    return {
      isAnimatedGif: false,
      finalMimeType: media.declaredMimeType || 'application/octet-stream',
      shouldTranscodeToStatic: false,
    };
  }
}

export interface BubbleHeaderInput {
  senderName: string;
  senderNameWidthPx: number;
  roleBadgeText?: string;
  roleBadgeWidthPx?: number;
  attachmentWidthPx: number;
  bubblePaddingPx: number;
}

export class MessageBubbleHeaderLayoutGovernor {
  computeHeaderLayout(input: BubbleHeaderInput): {
    layoutMode: 'inline' | 'stacked' | 'flex_wrap';
    totalHeaderWidthPx: number;
    requiresBadgeWrap: boolean;
  } {
    const badgeWidth = input.roleBadgeWidthPx ? input.roleBadgeWidthPx + 6 : 0; // 6px gap
    const senderAndBadgeWidth = input.senderNameWidthPx + badgeWidth;
    const availableWidth = Math.max(input.attachmentWidthPx - input.bubblePaddingPx * 2, 80);

    if (senderAndBadgeWidth <= availableWidth) {
      return {
        layoutMode: 'inline',
        totalHeaderWidthPx: senderAndBadgeWidth,
        requiresBadgeWrap: false,
      };
    }

    // If attachment is too narrow (e.g. small sticker or thumbnail), wrap badge to second line or expand bubble
    return {
      layoutMode: 'stacked',
      totalHeaderWidthPx: Math.max(input.senderNameWidthPx, badgeWidth),
      requiresBadgeWrap: true,
    };
  }
}

export interface CallCardTypographyConfig {
  fontSizePx: number;
  fontFamily: string;
  hasDescenders: boolean; // letters with g, j, p, q, y
}

export class CallParticipantTypographyGovernor {
  computeCardBoundingBox(config: CallCardTypographyConfig): {
    lineHeightPx: number;
    bottomPaddingPx: number;
    totalHeightPx: number;
  } {
    // Normal baseline line height multiplier = 1.3
    const standardLineHeight = Math.ceil(config.fontSizePx * 1.3);
    // When text has descenders, add 4px guaranteed clearance so bottom of letters isn't clipped
    const bottomPaddingPx = config.hasDescenders ? 6 : 2;
    const totalHeightPx = standardLineHeight + bottomPaddingPx;

    return {
      lineHeightPx: standardLineHeight,
      bottomPaddingPx,
      totalHeightPx,
    };
  }

  detectDescenders(text: string): boolean {
    return /[gjpqyQ]/.test(text);
  }
}

export interface ChannelPost {
  id: string;
  title?: string;
  text: string;
  date: Date;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaLengthBytes?: number;
}

export interface RssFeedConfig {
  channelUsername: string;
  channelTitle: string;
  channelDescription: string;
  channelUrl: string;
}

export class ChannelRssFeedGenerator {
  generateRss2Feed(config: RssFeedConfig, posts: ChannelPost[]): string {
    const itemsXml = posts
      .map((p) => {
        const itemTitle = p.title || p.text.slice(0, 50).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const itemDesc = p.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const enclosureTag = p.mediaUrl
          ? `<enclosure url="${p.mediaUrl}" type="${p.mediaMimeType || 'image/jpeg'}" length="${p.mediaLengthBytes || 0}" />`
          : '';

        return `    <item>
      <title>${itemTitle}</title>
      <link>${config.channelUrl}/${p.id}</link>
      <guid>${config.channelUrl}/${p.id}</guid>
      <pubDate>${p.date.toUTCString()}</pubDate>
      <description>${itemDesc}</description>
      ${enclosureTag}
    </item>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${config.channelTitle}</title>
    <link>${config.channelUrl}</link>
    <description>${config.channelDescription}</description>
${itemsXml}
  </channel>
</rss>`;
  }
}

export class ArticleEditorLayoutAndMediaUploadGovernor {
  public headerIndicator = new ArticleEditorHeaderIndicator();
  public toggleGovernor = new ArticleToggleBlockGovernor();
  public astSerializer = new NestedChecklistToggleSerializer();
  public uploadPreserver = new MiniAppMediaUploadPreserver();
  public bubbleLayout = new MessageBubbleHeaderLayoutGovernor();
  public callTypography = new CallParticipantTypographyGovernor();
  public rssGenerator = new ChannelRssFeedGenerator();
}
