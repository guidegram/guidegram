/**
 * Guidegram Media Cache & Download Governor Service
 *
 * Hardened against competitor issues:
 * - tdesktop #2053: Sent MP4 files mistakenly treated as GIFs (loss of sound/scrubber).
 * - tdesktop #129: Arbitrary 100-message selection limit blocking bulk actions.
 * - tdesktop #669: Runaway GIF autoplay in panels consuming excessive VRAM/CPU.
 * - tdesktop #467: Simultaneous download concurrency governor.
 */

export type MediaKind = 'gif_animation' | 'video_message' | 'regular_video';

export interface MediaInspectParams {
  mimeType: string;
  hasAudioTrack: boolean;
  durationSec: number;
  isExplicitAnimationFlag?: boolean;
}

export class GifVsMp4MediaDisambiguator {
  /**
   * Disambiguates between silent looping GIFs and regular videos with audio (#2053)
   */
  public static classifyMedia(params: MediaInspectParams): MediaKind {
    // If it has an active audio track, it must NEVER be treated as a silent GIF
    if (params.hasAudioTrack) {
      return 'regular_video';
    }

    // Long files (>60s) without audio are still treated as video files
    if (params.durationSec > 60) {
      return 'regular_video';
    }

    // Explicit Telegram animation flag or short silent video
    if (params.isExplicitAnimationFlag || params.mimeType === 'image/gif' || params.durationSec <= 30) {
      return 'gif_animation';
    }

    return 'regular_video';
  }
}

export class ScalableMessageSelectionManager {
  private selectedIds: Set<number | string> = new Set();
  private maxSelectionLimit: number;

  constructor(maxLimit: number = 1000) {
    this.maxSelectionLimit = maxLimit;
  }

  public toggleSelect(messageId: number | string): { selected: boolean; totalCount: number; limitReached: boolean } {
    if (this.selectedIds.has(messageId)) {
      this.selectedIds.delete(messageId);
      return { selected: false, totalCount: this.selectedIds.size, limitReached: false };
    }

    if (this.selectedIds.size >= this.maxSelectionLimit) {
      return { selected: false, totalCount: this.selectedIds.size, limitReached: true };
    }

    this.selectedIds.add(messageId);
    return { selected: true, totalCount: this.selectedIds.size, limitReached: false };
  }

  public selectBatch(messageIds: Array<number | string>): { addedCount: number; totalCount: number } {
    let added = 0;
    for (const id of messageIds) {
      if (this.selectedIds.size >= this.maxSelectionLimit) break;
      if (!this.selectedIds.has(id)) {
        this.selectedIds.add(id);
        added++;
      }
    }
    return { addedCount: added, totalCount: this.selectedIds.size };
  }

  public getSelectedIds(): Array<number | string> {
    return Array.from(this.selectedIds);
  }

  public clear(): void {
    this.selectedIds.clear();
  }
}

export class ViewportGifAutoplayGovernor {
  private visibleGifIds: Set<string> = new Set();
  private playingGifIds: Set<string> = new Set();
  private maxConcurrentPlaying: number = 2; // Strict limit to prevent GPU thrashing (#669)

  constructor(maxConcurrent: number = 2) {
    this.maxConcurrentPlaying = maxConcurrent;
  }

  public onVisibilityChange(gifId: string, isVisible: boolean): { shouldPlay: boolean } {
    if (isVisible) {
      this.visibleGifIds.add(gifId);
    } else {
      this.visibleGifIds.delete(gifId);
      this.playingGifIds.delete(gifId);
    }

    this.rebalancePlayback();
    return { shouldPlay: this.playingGifIds.has(gifId) };
  }

  private rebalancePlayback(): void {
    // Keep at most maxConcurrentPlaying active
    for (const id of this.visibleGifIds) {
      if (this.playingGifIds.size < this.maxConcurrentPlaying) {
        this.playingGifIds.add(id);
      }
    }
  }

  public isPlaying(gifId: string): boolean {
    return this.playingGifIds.has(gifId);
  }

  public getActiveCount(): number {
    return this.playingGifIds.size;
  }
}

export interface QueuedDownloadTask {
  id: string;
  url: string;
  priority: 'high' | 'normal' | 'low';
  onStart: () => void;
}

export class ConcurrentDownloadGovernor {
  private maxConcurrentDownloads: number;
  private activeDownloads: Set<string> = new Set();
  private queue: QueuedDownloadTask[] = [];

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrentDownloads = Math.max(1, maxConcurrent);
  }

  public setMaxConcurrency(max: number): void {
    this.maxConcurrentDownloads = Math.max(1, max);
    this.processQueue();
  }

  public enqueueDownload(task: QueuedDownloadTask): boolean {
    if (this.activeDownloads.size < this.maxConcurrentDownloads) {
      this.activeDownloads.add(task.id);
      task.onStart();
      return true;
    }

    if (task.priority === 'high') {
      this.queue.unshift(task); // High priority at front
    } else {
      this.queue.push(task);
    }
    return false;
  }

  public completeDownload(taskId: string): void {
    this.activeDownloads.delete(taskId);
    this.processQueue();
  }

  private processQueue(): void {
    while (this.activeDownloads.size < this.maxConcurrentDownloads && this.queue.length > 0) {
      const nextTask = this.queue.shift();
      if (nextTask) {
        this.activeDownloads.add(nextTask.id);
        nextTask.onStart();
      }
    }
  }

  public getActiveCount(): number {
    return this.activeDownloads.size;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }
}
