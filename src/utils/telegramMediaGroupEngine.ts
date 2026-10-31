/**
 * telegramMediaGroupEngine.ts
 * 
 * Authoritative Telegram Media Group / Album Engine & Protocol Validator.
 * Implements strict Telegram Bot API (sendMediaGroup) & MTProto (messages.sendMultiMedia) rules:
 * 
 * 1. Allowed Media Types:
 *    - Visual: Photo & Video can be mixed together in the same album (2..10 items).
 *    - Audio: Can only be grouped with other Audio items (2..10 items).
 *    - Document: Can only be grouped with other Document items (2..10 items).
 *    - Animations (GIFs), Stickers, and Voices are STRICTLY FORBIDDEN in albums.
 * 2. Group Size Constraint:
 *    - Minimum: 2 items.
 *    - Maximum: 10 items per album chunk.
 * 3. Caption Invariant:
 *    - Only one item in the album receives the master caption (traditionally the first item).
 * 4. Automatic Partitioning:
 *    - Automatically slices large selections (>10 items) or heterogeneous lists (mixing visual, audio, animations)
 *      into valid Telegram album chunks and isolated standalone messages without API errors.
 */

export type TelegramMediaGroupType = 'visual' | 'audio' | 'document';

export interface MediaCandidate {
  id?: string | number;
  mediaType?: string;
  name?: string;
  mimeType?: string;
  caption?: string;
  [key: string]: any;
}

export interface MediaGroupValidationResult {
  valid: boolean;
  error?: string;
  groupType?: TelegramMediaGroupType;
  itemCount: number;
}

export interface PartitionedMediaChunk<T extends MediaCandidate = MediaCandidate> {
  isGroup: boolean;
  groupType?: TelegramMediaGroupType;
  groupedId?: string;
  items: T[];
}

/**
 * Checks if a media item is an animation (GIF) which Telegram forbids in albums.
 */
export function isAnimationMedia(item: MediaCandidate): boolean {
  if (!item) return false;
  if (item.mediaType === 'animation' || item.mediaType === 'gif') return true;
  if (item.mimeType === 'image/gif') return true;
  if (typeof item.name === 'string' && item.name.toLowerCase().endsWith('.gif')) return true;
  return false;
}

/**
 * Classifies a media item into its Telegram album group category.
 * Returns null if the item cannot be part of any Telegram album.
 */
export function getMediaGroupType(item: MediaCandidate): TelegramMediaGroupType | null {
  if (!item) return null;
  if (isAnimationMedia(item)) return null;

  const type = (item.mediaType || '').toLowerCase();
  if (type === 'photo' || type === 'video') return 'visual';
  if (type === 'audio' || type === 'music') return 'audio';
  if (type === 'document' || type === 'file') return 'document';

  // Fallback check by mime type or file extension if mediaType is missing/generic
  if (item.mimeType) {
    if (item.mimeType.startsWith('image/') || item.mimeType.startsWith('video/')) return 'visual';
    if (item.mimeType.startsWith('audio/')) return 'audio';
  }
  if (item.name) {
    const ext = item.name.toLowerCase().split('.').pop() || '';
    if (['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'mkv'].includes(ext)) return 'visual';
    if (['mp3', 'm4a', 'flac', 'ogg', 'wav'].includes(ext)) return 'audio';
    if (['pdf', 'doc', 'docx', 'zip', 'tar', 'txt'].includes(ext)) return 'document';
  }

  return 'document';
}

/**
 * Checks whether two media items can legally share the same Telegram album.
 */
export function canGroupTogether(a: MediaCandidate, b: MediaCandidate): boolean {
  const typeA = getMediaGroupType(a);
  const typeB = getMediaGroupType(b);
  if (!typeA || !typeB) return false;
  return typeA === typeB;
}

/**
 * Validates an array of media items against Telegram's official album invariants.
 */
export function validateMediaGroup(items: MediaCandidate[]): MediaGroupValidationResult {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'Media group cannot be empty.', itemCount: 0 };
  }

  const count = items.length;
  if (count < 2) {
    return { valid: false, error: 'Telegram media albums require at least 2 items.', itemCount: count };
  }
  if (count > 10) {
    return { valid: false, error: `Telegram media albums cannot exceed 10 items (got ${count}).`, itemCount: count };
  }

  // Check for forbidden animations
  for (let i = 0; i < items.length; i++) {
    if (isAnimationMedia(items[i])) {
      return {
        valid: false,
        error: `Item #${i + 1} is an animation (GIF). Animations cannot be sent in a media group.`,
        itemCount: count
      };
    }
  }

  const firstType = getMediaGroupType(items[0]);
  if (!firstType) {
    return { valid: false, error: `Item #1 has an unsupportable album type (${items[0].mediaType}).`, itemCount: count };
  }

  for (let i = 1; i < items.length; i++) {
    const currentType = getMediaGroupType(items[i]);
    if (currentType !== firstType) {
      return {
        valid: false,
        error: `Cannot mix ${firstType} with ${currentType ?? 'unknown'} in the same album.`,
        itemCount: count
      };
    }
  }

  return {
    valid: true,
    groupType: firstType,
    itemCount: count
  };
}

/**
 * Partitions any arbitrary list of media items into valid Telegram album chunks (2..10 items)
 * and isolates incompatible items (animations, standalone single items, type changes)
 * into standalone messages.
 */
export function partitionMediaIntoTelegramAlbums<T extends MediaCandidate>(
  items: T[],
  idPrefix = 'album'
): PartitionedMediaChunk<T>[] {
  if (!items || items.length === 0) return [];

  const chunks: PartitionedMediaChunk<T>[] = [];
  let currentBucket: T[] = [];
  let currentType: TelegramMediaGroupType | null = null;

  const flushBucket = () => {
    if (currentBucket.length === 0) return;

    if (currentBucket.length === 1 || !currentType) {
      // Single items cannot form a group; output as standalone
      for (const single of currentBucket) {
        chunks.push({
          isGroup: false,
          items: [single]
        });
      }
    } else {
      // 2..10 items -> Valid album
      const groupId = `${idPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      chunks.push({
        isGroup: true,
        groupType: currentType,
        groupedId: groupId,
        items: [...currentBucket]
      });
    }

    currentBucket = [];
    currentType = null;
  };

  for (const item of items) {
    // If it's an animation, flush current bucket and emit as standalone
    if (isAnimationMedia(item)) {
      flushBucket();
      chunks.push({
        isGroup: false,
        items: [item]
      });
      continue;
    }

    const itemType = getMediaGroupType(item);
    if (!itemType) {
      flushBucket();
      chunks.push({
        isGroup: false,
        items: [item]
      });
      continue;
    }

    // If bucket already has 10 items or has a different type, flush it
    if (currentBucket.length >= 10 || (currentType && currentType !== itemType)) {
      flushBucket();
    }

    currentBucket.push(item);
    currentType = itemType;
  }

  flushBucket();
  return chunks;
}

/**
 * Distributes a master caption across album items according to Telegram protocol.
 * Only the designated index (default: first item 0) receives the master caption;
 * all other items have their caption set to empty string or undefined.
 */
export function assignAlbumCaptions<T extends MediaCandidate>(
  items: T[],
  masterCaption?: string,
  targetIndex = 0
): T[] {
  if (!items || items.length === 0) return [];
  const trimmed = masterCaption ? masterCaption.trim() : '';

  return items.map((item, index) => ({
    ...item,
    caption: index === targetIndex ? (trimmed || undefined) : undefined
  }));
}
