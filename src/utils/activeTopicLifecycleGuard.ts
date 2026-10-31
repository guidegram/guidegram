/**
 * Active Topic Lifecycle Guard & Deletion Eviction Coordinator
 * 
 * Prevents Use-After-Free crashes and render de-synchronization when a currently
 * active forum topic or bot threaded topic is deleted remotely (addressing TDesktop #31533).
 * 
 * Invariant:
 * When an active topic is purged, the UI viewport must gracefully evict the active topic state
 * and transition to the root chat view BEFORE topic data structures are deallocated.
 */

export interface TopicMetadata {
  id: number;
  peerId: string;
  title: string;
  isClosed?: boolean;
  isHidden?: boolean;
  creationDate?: number;
}

export interface TopicEvictionResult {
  evicted: boolean;
  peerId: string;
  previousTopicId: number;
  fallbackView: 'chat_root' | 'general_topic' | 'topics_list';
  reason: 'topic_deleted_by_remote' | 'topic_hidden' | 'manual_eviction';
  noticeMessage: string;
}

export class ActiveTopicLifecycleGuard {
  private static instance: ActiveTopicLifecycleGuard;
  private activeTopicsByPeer = new Map<string, number>(); // peerId -> active topic rootId
  private topicsRegistry = new Map<string, Map<number, TopicMetadata>>(); // peerId -> (topicId -> metadata)

  private constructor() {}

  public static getInstance(): ActiveTopicLifecycleGuard {
    if (!ActiveTopicLifecycleGuard.instance) {
      ActiveTopicLifecycleGuard.instance = new ActiveTopicLifecycleGuard();
    }
    return ActiveTopicLifecycleGuard.instance;
  }

  /**
   * Registers a topic into the local cache.
   */
  public registerTopic(peerId: string, topic: TopicMetadata): void {
    let peerTopics = this.topicsRegistry.get(peerId);
    if (!peerTopics) {
      peerTopics = new Map<number, TopicMetadata>();
      this.topicsRegistry.set(peerId, peerTopics);
    }
    peerTopics.set(topic.id, { ...topic });
  }

  /**
   * Sets the currently active/focused topic for a peer.
   */
  public setActiveTopic(peerId: string, topicId: number | null): void {
    if (topicId === null) {
      this.activeTopicsByPeer.delete(peerId);
    } else {
      this.activeTopicsByPeer.set(peerId, topicId);
    }
  }

  /**
   * Gets the currently active topic ID for a peer.
   */
  public getActiveTopic(peerId: string): number | null {
    return this.activeTopicsByPeer.get(peerId) ?? null;
  }

  /**
   * Handles a remote topic deletion event.
   * Ensures the viewport transitions away before purging the data structures.
   */
  public handleRemoteTopicDeletion(
    peerId: string,
    deletedTopicId: number,
    onEvictionCallback?: (result: TopicEvictionResult) => void
  ): { evicted: boolean; topicDeletedFromRegistry: boolean; result?: TopicEvictionResult } {
    const peerTopics = this.topicsRegistry.get(peerId);
    const topicMeta = peerTopics?.get(deletedTopicId);
    const activeTopicId = this.getActiveTopic(peerId);

    let evictionResult: TopicEvictionResult | undefined;
    let evicted = false;

    // Invariant: If deleted topic is currently open in viewport, evict first!
    if (activeTopicId === deletedTopicId) {
      evicted = true;
      this.setActiveTopic(peerId, null); // Switch to root chat

      evictionResult = {
        evicted: true,
        peerId,
        previousTopicId: deletedTopicId,
        fallbackView: 'chat_root',
        reason: 'topic_deleted_by_remote',
        noticeMessage: `Topic "${topicMeta?.title || '#' + deletedTopicId}" was deleted. Returned to main chat.`,
      };

      if (onEvictionCallback) {
        try {
          onEvictionCallback(evictionResult);
        } catch (_) {}
      }
    }

    // Now safely purge from data registry
    const topicDeletedFromRegistry = peerTopics?.delete(deletedTopicId) ?? false;
    if (peerTopics && peerTopics.size === 0) {
      this.topicsRegistry.delete(peerId);
    }

    return {
      evicted,
      topicDeletedFromRegistry,
      result: evictionResult,
    };
  }

  /**
   * Resets internal state (used in testing).
   */
  public reset(): void {
    this.activeTopicsByPeer.clear();
    this.topicsRegistry.clear();
  }
}

export const activeTopicLifecycleGuard = ActiveTopicLifecycleGuard.getInstance();
