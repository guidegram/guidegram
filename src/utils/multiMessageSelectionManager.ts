/**
 * Multi-Message Selection & Clipboard Retention Manager
 * 
 * Enforces UX invariants for multi-message batch operations (addressing TDesktop #31505).
 * 
 * Invariants:
 * 1. Selection Retention on Copy: Copying selected messages must NEVER wipe the selection state.
 *    Users routinely copy a batch of messages and then immediately forward or delete the exact same set.
 * 2. Chronological Ordering: Copied batch messages must strictly follow conversation timeline order (ascending by date/id).
 * 3. Formatted Export: Generates clean readable transcript with author attribution or raw text mode.
 */

export interface SelectableMessage {
  id: number;
  date: number; // Unix timestamp
  senderName?: string;
  text?: string;
  isOutgoing?: boolean;
}

export interface BatchCopyResult {
  copiedCount: number;
  formattedText: string;
  selectionRetained: boolean;
  selectedIds: number[];
}

export class MultiMessageSelectionManager {
  private selectedIds = new Set<number>();
  private retainSelectionOnCopy: boolean = true;

  constructor(options?: { retainSelectionOnCopy?: boolean }) {
    if (options?.retainSelectionOnCopy !== undefined) {
      this.retainSelectionOnCopy = options.retainSelectionOnCopy;
    }
  }

  /**
   * Toggles selection state of a specific message.
   */
  public toggleMessage(id: number): boolean {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
      return false; // Deselected
    } else {
      this.selectedIds.add(id);
      return true; // Selected
    }
  }

  /**
   * Selects an inclusive range of messages (e.g. Shift+Click).
   */
  public selectRange(fromId: number, toId: number, allMessages: SelectableMessage[]): number[] {
    const fromIndex = allMessages.findIndex((m) => m.id === fromId);
    const toIndex = allMessages.findIndex((m) => m.id === toId);

    if (fromIndex === -1 || toIndex === -1) {
      this.selectedIds.add(toId);
      return this.getSelectedIds();
    }

    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);

    for (let i = start; i <= end; i++) {
      this.selectedIds.add(allMessages[i].id);
    }

    return this.getSelectedIds();
  }

  public getSelectedIds(): number[] {
    return Array.from(this.selectedIds);
  }

  public getSelectedCount(): number {
    return this.selectedIds.size;
  }

  public isSelected(id: number): boolean {
    return this.selectedIds.has(id);
  }

  /**
   * Clears selection explicitly (triggered by Esc, close button, or after deletion).
   */
  public clear(): void {
    this.selectedIds.clear();
  }

  /**
   * Copies selected messages, formats them in chronological order,
   * and preserves the selection state.
   */
  public formatAndCopySelected(
    allMessages: SelectableMessage[],
    options?: { includeSender?: boolean; separator?: string }
  ): BatchCopyResult {
    if (this.selectedIds.size === 0) {
      return {
        copiedCount: 0,
        formattedText: '',
        selectionRetained: true,
        selectedIds: [],
      };
    }

    const includeSender = options?.includeSender ?? true;
    const separator = options?.separator ?? '\n\n';

    // Filter and sort in ascending chronological order
    const selectedMessages = allMessages
      .filter((m) => this.selectedIds.has(m.id))
      .sort((a, b) => a.date - b.date || a.id - b.id);

    const formattedSnippets = selectedMessages.map((m) => {
      const text = m.text || '';
      if (includeSender && m.senderName) {
        return `[${m.senderName}]\n${text}`;
      }
      return text;
    });

    const formattedText = formattedSnippets.join(separator);

    // Invariant: Do NOT clear selectedIds unless explicitly configured
    if (!this.retainSelectionOnCopy) {
      this.selectedIds.clear();
    }

    return {
      copiedCount: selectedMessages.length,
      formattedText,
      selectionRetained: this.retainSelectionOnCopy,
      selectedIds: this.getSelectedIds(),
    };
  }
}

export const multiMessageSelectionManager = new MultiMessageSelectionManager();
