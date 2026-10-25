/**
 * Guidegram Master Hardening - Phase 155
 * Virtualized Infinite Message List & 100k Render Optimization Protocol
 * 
 * High-performance virtualized viewport windowing engine for Telegram chat histories.
 * Employs binary search offset resolution, overscan pre-rendering, and dynamic height
 * cache accumulation to sustain 60fps scrolling over 100,000+ message records.
 */

export interface VirtualWindowResult {
  startIndex: number;
  endIndex: number;
  offsetY: number;
  totalHeight: number;
  visibleCount: number;
}

export class VirtualizedMessageListWindow {
  private totalItems: number = 0;
  private defaultItemHeight: number = 52;
  private heightCache: Map<number, number> = new Map();
  private prefixHeights: number[] = [];
  private overscan: number = 5;

  constructor(defaultItemHeight: number = 52, overscan: number = 5) {
    this.defaultItemHeight = defaultItemHeight;
    this.overscan = overscan;
  }

  /**
   * Updates total items count and invalidates prefix offsets.
   */
  public setItemCount(count: number): void {
    this.totalItems = Math.max(0, count);
    this.rebuildPrefixOffsets();
  }

  /**
   * Sets measured real-world height for dynamic row and updates offsets.
   */
  public setRowHeight(index: number, height: number): void {
    if (index >= 0 && index < this.totalItems) {
      this.heightCache.set(index, Math.max(20, height));
      this.rebuildPrefixOffsets();
    }
  }

  private rebuildPrefixOffsets(): void {
    this.prefixHeights = new Array(this.totalItems + 1);
    this.prefixHeights[0] = 0;

    for (let i = 0; i < this.totalItems; i++) {
      const h = this.heightCache.get(i) || this.defaultItemHeight;
      this.prefixHeights[i + 1] = this.prefixHeights[i] + h;
    }
  }

  /**
   * Binary searches for index corresponding to scroll offset.
   */
  private findIndexForOffset(offsetY: number): number {
    let low = 0;
    let high = this.totalItems - 1;

    while (low <= high) {
      const mid = (low + high) >>> 1;
      const top = this.prefixHeights[mid];
      const bottom = this.prefixHeights[mid + 1];

      if (offsetY >= top && offsetY < bottom) {
        return mid;
      } else if (offsetY < top) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    return Math.max(0, Math.min(this.totalItems - 1, low));
  }

  /**
   * Computes visible window indices and offsets for a given scroll viewport.
   */
  public computeVisibleWindow(scrollTop: number, viewportHeight: number): VirtualWindowResult {
    if (this.totalItems === 0) {
      return {
        startIndex: 0,
        endIndex: 0,
        offsetY: 0,
        totalHeight: 0,
        visibleCount: 0,
      };
    }

    const clampedScroll = Math.max(0, scrollTop);
    const rawStart = this.findIndexForOffset(clampedScroll);
    const rawEnd = this.findIndexForOffset(clampedScroll + viewportHeight);

    const startIndex = Math.max(0, rawStart - this.overscan);
    const endIndex = Math.min(this.totalItems - 1, rawEnd + this.overscan);
    const offsetY = this.prefixHeights[startIndex] || 0;
    const totalHeight = this.prefixHeights[this.totalItems] || 0;

    return {
      startIndex,
      endIndex,
      offsetY,
      totalHeight,
      visibleCount: endIndex - startIndex + 1,
    };
  }

  /**
   * Returns total cumulative height.
   */
  public getTotalHeight(): number {
    return this.prefixHeights[this.totalItems] || 0;
  }

  /**
   * Returns exact scroll offset to bring an index into view.
   */
  public getScrollOffsetForIndex(index: number): number {
    if (index <= 0) return 0;
    if (index >= this.totalItems) return this.getTotalHeight();
    return this.prefixHeights[index] || 0;
  }

  /**
   * Cleans all caches.
   */
  public clear(): void {
    this.totalItems = 0;
    this.heightCache.clear();
    this.prefixHeights = [];
  }
}
