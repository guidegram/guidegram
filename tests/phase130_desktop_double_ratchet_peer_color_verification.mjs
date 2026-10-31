import assert from 'node:assert';
import { DesktopDoubleRatchetPeerColorAndMetadataGovernor } from '../src/services/desktopDoubleRatchetPeerColorAndMetadataGovernor.ts';

console.log('=== Phase 130 Verification: Double Ratchet, Peer Color & Metadata Governor ===');

const governor = new DesktopDoubleRatchetPeerColorAndMetadataGovernor();

// Test 1: Double Ratchet Session Initialization & Forward Secrecy Step (#236)
{
  const session = governor.initializeDoubleRatchetSession(
    1001,
    'root-secret-key-32bytes-long-abc',
    'pk-local-curve25519-abc',
    'pk-remote-curve25519-xyz'
  );

  assert.strictEqual(session.chatId, 1001);
  assert.strictEqual(session.senderSequenceNumber, 0);

  const { envelope, updatedState } = governor.ratchetEncrypt(session, 'Secret Message 1');
  assert.strictEqual(envelope.sequenceNumber, 1);
  assert.strictEqual(updatedState.senderSequenceNumber, 1);
  assert.ok(envelope.ciphertext.length > 0);
  assert.ok(envelope.hmacTag.startsWith('hmac-1-'));
  console.log('Test 1 Passed: Double Ratchet secret chat encryption step verified.');
}

// Test 2: Deterministic Peer Color Calculation & Contrast (#238, #237)
{
  const peer1 = governor.computePeerColor(1005, 'dark');
  const peer2 = governor.computePeerColor(1005, 'dark'); // Deterministic check
  assert.strictEqual(peer1.colorIndex, peer2.colorIndex);
  assert.strictEqual(peer1.hexColor, peer2.hexColor);
  assert.strictEqual(peer1.isAccessibleForDarkTheme, true);
  assert.ok(peer1.contrastRatioAgainstBackground >= 4.5);

  const peerDiff = governor.computePeerColor(1006, 'dark');
  assert.notStrictEqual(peer1.colorIndex, peerDiff.colorIndex);
  console.log('Test 2 Passed: Deterministic accessible peer color palette verified.');
}

// Test 3: Unsolicited Promo & Sponsored Channel Suppression (#240)
{
  const dialogs = [
    { id: 1, title: 'Friends Chat', isPromoSuggestion: false },
    { id: 2, title: 'Adware Crypto Channel', isPromoSuggestion: true },
    { id: 3, title: 'Dev Community', isPromoSuggestion: false, isSponsoredAd: false },
    { id: 4, title: 'Sponsored VPN', isSponsoredAd: true }
  ];

  const cleaned = governor.filterDialogList(dialogs);
  assert.strictEqual(cleaned.length, 2);
  assert.strictEqual(cleaned[0].id, 1);
  assert.strictEqual(cleaned[1].id, 3);
  console.log('Test 3 Passed: Promo and sponsored suggestions filtering verified.');
}

// Test 4: Search Query Analysis - Numerical Peer ID & Repetitive Spam (#247)
{
  const spamResult = governor.analyzeSearchQuery('11111');
  assert.strictEqual(spamResult.isSpamRepetitiveInput, true);

  const peerIdResult = governor.analyzeSearchQuery('123456789');
  assert.strictEqual(peerIdResult.isNumericalPeerId, true);
  assert.strictEqual(peerIdResult.numericValue, 123456789);

  const normalResult = governor.analyzeSearchQuery('hello world');
  assert.strictEqual(normalResult.isNumericalPeerId, false);
  assert.strictEqual(normalResult.isSpamRepetitiveInput, false);
  console.log('Test 4 Passed: Search query numerical and spam analysis verified.');
}

// Test 5: macOS Bundle Metadata & Desktop Keywords (#249, #242)
{
  const meta = governor.generateAppMetadata('64Gram', 'io.github.tdesktop_x64.TDesktop');
  assert.ok(meta.infoPlistXml.includes('<string>64Gram</string>'));
  assert.ok(meta.infoPlistXml.includes('<string>io.github.tdesktop_x64.TDesktop</string>'));
  assert.ok(meta.keywords.includes('telegram'));
  assert.ok(meta.keywords.includes('messaging'));
  console.log('Test 5 Passed: macOS bundle ID and desktop search keywords verified.');
}

// Test 6: Ratchet Multiple Sequential Advances
{
  let state = governor.initializeDoubleRatchetSession(2002, 'root-2', 'pk-1', 'pk-2');
  for (let i = 1; i <= 5; i++) {
    const res = governor.ratchetEncrypt(state, `Message ${i}`);
    assert.strictEqual(res.envelope.sequenceNumber, i);
    state = res.updatedState;
  }
  assert.strictEqual(state.senderSequenceNumber, 5);
  console.log('Test 6 Passed: Multi-step Ratchet key advancement verified.');
}

// Test 7: Peer Color Negative ID Boundary
{
  const negativePeer = governor.computePeerColor(-100123456789, 'dark');
  assert.ok(negativePeer.colorIndex >= 0 && negativePeer.colorIndex < 7);
  assert.ok(negativePeer.hexColor.startsWith('#'));
  console.log('Test 7 Passed: Negative Channel/Group ID color calculation verified.');
}

console.log('=== ALL PHASE 130 TESTS PASSED (100% HEALTH) ===');
