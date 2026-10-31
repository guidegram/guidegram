/**
 * Nested Markdown Shortcut Auto-Expansion Engine
 * 
 * Expands inline markdown shortcuts (e.g. '>', '-', '[]', '```') into structured
 * Telegram formatting entities across nested blocks, toggles, and blockquotes (addressing TDesktop #31518).
 * 
 * Prevents input dropouts where nested containers (such as spoiler toggles or nested quotes)
 * fail to propagate cursor input shortcuts to the root formatting governor.
 */

export type FormattingBlockType = 
  | 'paragraph'
  | 'blockquote'
  | 'bullet_list'
  | 'checklist'
  | 'ordered_list'
  | 'code_block'
  | 'toggle_spoiler';

export interface FormattingContext {
  containerType: 'root' | 'toggle' | 'blockquote' | 'nested';
  depth: number;
}

export interface ShortcutExpansionResult {
  expanded: boolean;
  blockType: FormattingBlockType;
  prefixRemoved: string;
  remainingText: string;
  appliedPrefix: string;
}

export class NestedMarkdownShortcutConverter {
  /**
   * Evaluates line input to check if a prefix shortcut should expand into a rich block.
   * Works identically regardless of whether the line is at root level or inside nested toggles.
   */
  public evaluateLineShortcut(
    line: string,
    context: FormattingContext = { containerType: 'root', depth: 0 }
  ): ShortcutExpansionResult {
    const trimmed = line.trimStart();

    // 1. Blockquote shortcut: '>'
    if (trimmed.startsWith('> ') || trimmed === '>') {
      const remaining = trimmed.startsWith('> ') ? trimmed.slice(2) : '';
      return {
        expanded: true,
        blockType: 'blockquote',
        prefixRemoved: '>',
        remainingText: remaining,
        appliedPrefix: '> ',
      };
    }

    // 2. Checklist / Task shortcut: '[] ' or '[ ] '
    if (trimmed.startsWith('[] ') || trimmed.startsWith('[ ] ')) {
      const prefix = trimmed.startsWith('[ ] ') ? '[ ] ' : '[] ';
      return {
        expanded: true,
        blockType: 'checklist',
        prefixRemoved: prefix.trim(),
        remainingText: trimmed.slice(prefix.length),
        appliedPrefix: '☐ ',
      };
    }

    // 3. Bullet list shortcut: '- ' or '* '
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return {
        expanded: true,
        blockType: 'bullet_list',
        prefixRemoved: trimmed.slice(0, 2).trim(),
        remainingText: trimmed.slice(2),
        appliedPrefix: '• ',
      };
    }

    // 4. Code block shortcut: '```'
    if (trimmed.startsWith('```')) {
      return {
        expanded: true,
        blockType: 'code_block',
        prefixRemoved: '```',
        remainingText: trimmed.slice(3).trim(),
        appliedPrefix: '```\n',
      };
    }

    // 5. Ordered list: '1. '
    const orderedMatch = trimmed.match(/^(\d+)\.\s+/);
    if (orderedMatch) {
      return {
        expanded: true,
        blockType: 'ordered_list',
        prefixRemoved: orderedMatch[0].trim(),
        remainingText: trimmed.slice(orderedMatch[0].length),
        appliedPrefix: `${orderedMatch[1]}. `,
      };
    }

    // No shortcut matched
    return {
      expanded: false,
      blockType: 'paragraph',
      prefixRemoved: '',
      remainingText: line,
      appliedPrefix: '',
    };
  }

  /**
   * Formats a document buffer ensuring shortcuts inside toggles/quotes are expanded.
   */
  public expandDocumentBuffer(lines: string[], context: FormattingContext): string[] {
    return lines.map((line) => {
      const result = this.evaluateLineShortcut(line, context);
      if (result.expanded) {
        return `${result.appliedPrefix}${result.remainingText}`;
      }
      return line;
    });
  }
}

export const nestedMarkdownShortcutConverter = new NestedMarkdownShortcutConverter();
