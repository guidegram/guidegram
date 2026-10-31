import assert from 'node:assert';
import { DesktopDoubleRatchetGiftsAndStickerGovernor } from '../src/services/desktopDoubleRatchetGiftsAndStickerGovernor.ts';

console.log('=== Phase 131 Verification: Double Ratchet, Gifts & Stickers Governor ===');

const governor = new DesktopDoubleRatchetGiftsAndStickerGovernor();

// Test 1: Advanced Session Creation & DH Ratchet Step (#234)
{
  const session = governor.createAdvancedSession(
    'sess-101',
    'root-master-key-seed-32bytes-xyz',
    { publicKey: 'pk-local-init', privateKey: 'sk-local-init' },
    'pk-remote-init'
  );

  assert.strictEqual(session.sessionId, 'sess-101');
  assert.strictEqual(session.remoteEphemeralPublicKey, 'pk-remote-init');

  // Advance DH ratchet with new remote key
  const updatedSession = governor.advanceDhRatchet(session, 'pk-remote-ephemeral-v2');
  assert.strictEqual(updatedSession.remoteEphemeralPublicKey, 'pk-remote-ephemeral-v2');
  assert.notStrictEqual(updatedSession.rootKey, session.rootKey);
  assert.notStrictEqual(updatedSession.localEphemeralKeyPair.publicKey, 'pk-local-init');
  console.log('Test 1 Passed: DH ratchet step advancement verified.');
}

// Test 2: Out-of-Order Message Decryption & Skipped Keys (#235, #233)
{
  const session = governor.createAdvancedSession(
    'sess-102',
    'root-key-2',
    { publicKey: 'pk-local-2', privateKey: 'sk-local-2' },
    'pk-remote-2'
  );

  // Pre-store a skipped key for message seq 3
  session.skippedMessageKeys.set('pk-remote-2:3', 'mk-skipped-key-for-seq-3');

  // Simulate arrival of message seq 3 (out of order)
  const ciphertext = Buffer.from('Secret delayed message::[ENC:mk-skipped-key-for-seq-3]').toString('base64');
  const { plaintext, session: afterDecSession } = governor.decryptWithOutOfOrderSupport(session, ciphertext, 3, 'pk-remote-2');

  assert.strictEqual(plaintext, 'Secret delayed message');
  assert.strictEqual(afterDecSession.skippedMessageKeys.has('pk-remote-2:3'), false); // Consumed
  console.log('Test 2 Passed: Out-of-order message key resolution verified.');
}

// Test 3: Session Zeroization & Security Teardown (#232)
{
  const session = governor.createAdvancedSession(
    'sess-103',
    'root-key-3',
    { publicKey: 'pk-3', privateKey: 'sk-3' },
    'pk-remote-3'
  );

  governor.zeroizeSession(session);
  assert.strictEqual(session.isZeroized, true);
  assert.strictEqual(session.rootKey, '');
  assert.strictEqual(session.localEphemeralKeyPair.privateKey, '');

  assert.throws(() => {
    governor.decryptWithOutOfOrderSupport(session, 'dGVzdA==', 1, 'pk-remote-3');
  }, /Cannot decrypt: Session keys have been zeroized/);
  console.log('Test 3 Passed: Cryptographic key zeroization teardown verified.');
}

// Test 4: Profile Star Gifts Shelf Sorting and Pinning (#227)
{
  const gifts = [
    { id: 'gift-1', starsPrice: 50, title: 'Star Cup', slug: 'star-cup', isUpgradedUnique: false, receivedTimestamp: 1000, isPinnedInProfile: false },
    { id: 'gift-2', starsPrice: 500, title: 'Rare Diamond', slug: 'rare-diamond', isUpgradedUnique: true, receivedTimestamp: 2000, isPinnedInProfile: true },
    { id: 'gift-3', starsPrice: 100, title: 'Golden Heart', slug: 'golden-heart', isUpgradedUnique: false, receivedTimestamp: 1500, isPinnedInProfile: false }
  ];

  const shelf = governor.resolveProfileGifts(gifts);
  assert.strictEqual(shelf.totalStarsValue, 650);
  assert.strictEqual(shelf.pinnedGifts.length, 1);
  assert.strictEqual(shelf.pinnedGifts[0].id, 'gift-2');
  assert.strictEqual(shelf.regularGifts.length, 2);
  assert.strictEqual(shelf.regularGifts[0].id, 'gift-3'); // newer regular gift first
  console.log('Test 4 Passed: Profile Star Gifts shelf management verified.');
}

// Test 5: Recent Stickers Shelf Expansion & LRU Eviction (#222)
{
  let shelf = [];
  // Add 125 stickers to test 120-capacity limit
  for (let i = 1; i <= 125; i++) {
    shelf = governor.recordStickerUsage(shelf, {
      documentId: `doc-sticker-${i}`,
      emoji: '👍',
      packName: 'Standard Pack'
    });
  }

  assert.strictEqual(shelf.length, 120);
  assert.strictEqual(shelf[0].documentId, 'doc-sticker-125'); // Most recent at the top
  console.log('Test 5 Passed: Expanded recent stickers shelf (120 cap) verified.');
}

// Test 6: Recent Stickers Pinning (Pinned item never evicted) (#222)
{
  let shelf = [
    { documentId: 'pinned-sticker-1', emoji: '❤️', packName: 'Love Pack', lastUsedTimestamp: 1, useCount: 10, isPinned: true }
  ];

  for (let i = 1; i <= 125; i++) {
    shelf = governor.recordStickerUsage(shelf, {
      documentId: `bulk-${i}`,
      emoji: '🔥',
      packName: 'Fire Pack'
    });
  }

  assert.strictEqual(shelf.length, 120);
  assert.ok(shelf.some(s => s.documentId === 'pinned-sticker-1' && s.isPinned));
  console.log('Test 6 Passed: Pinned sticker immunity from LRU eviction verified.');
}

// Test 7: View As JSON Developer Inspection (#219)
{
  const inspection = governor.viewAsJson({
    id: 12345,
    message: 'Hello Developer',
    sender: { id: 99, role: 'admin' },
    isSecret: true
  });

  assert.ok(inspection.formattedJson.includes('"message": "Hello Developer"'));
  assert.ok(inspection.byteSize > 20);
  console.log('Test 7 Passed: View As JSON formatting and byte calculation verified.');
}

console.log('=== ALL PHASE 131 TESTS PASSED (100% HEALTH) ===');
