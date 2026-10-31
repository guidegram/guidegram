import assert from 'node:assert';
import { ContactSyncAndVCardGovernor } from '../src/services/contactSyncAndVCardGovernor.ts';

console.log('🧪 Starting Phase 70 Contact Synchronization & RFC-6350 VCard Verification Suite...');

const governor = new ContactSyncAndVCardGovernor();

// 1. Test mutual contact status and indicator
console.log('  Testing mutual contact status...');
governor.registerContact({
  userId: 'user_101',
  firstName: 'Arash',
  lastName: 'Kamangir',
  phone: '+989121112233',
  username: 'arash_k',
  isMutual: false,
  hasPhoto: true,
  photoHash: 'hash_arash_1'
});

assert.strictEqual(governor.isMutualContact('user_101'), false);
assert.strictEqual(governor.setMutualStatus('user_101', true), true);
assert.strictEqual(governor.isMutualContact('user_101'), true);
console.log('  ✅ Mutual contact indicator verified');

// 2. Test adding contacts without phone number
console.log('  Testing phone-less contact registration...');
const phoneLess = governor.addContactWithoutPhone('user_102', 'soroush_tele', 'Soroush', 'R');
assert.strictEqual(phoneLess.userId, 'user_102');
assert.strictEqual(phoneLess.username, 'soroush_tele');
assert.strictEqual(phoneLess.phone, undefined);
console.log('  ✅ Phone-less contact registration verified');

// 3. Test delta imported contacts counting across multiple calls (tdlib #103)
console.log('  Testing delta imported contacts counting...');
const delta1 = governor.importContactsDelta([
  { firstName: 'Navid', phone: '+989351112233' },
  { firstName: 'Sara', phone: '+989361112233' }
]);
assert.strictEqual(delta1.importedCount, 2);
assert.strictEqual(delta1.totalImported, 2);

// Second call with same contacts plus one update and one new
const delta2 = governor.importContactsDelta([
  { firstName: 'Navid', lastName: 'Updated', phone: '+989351112233' },
  { firstName: 'Sara', phone: '+989361112233' },
  { firstName: 'Omid', phone: '+989371112233' }
]);
assert.strictEqual(delta2.importedCount, 1);
assert.strictEqual(delta2.updatedCount, 1);
assert.strictEqual(delta2.unchangedCount, 1);
assert.strictEqual(delta2.totalImported, 3);
console.log('  ✅ Delta imported contacts counting verified');

// 4. Test RFC-6350 vCard serialization and parsing
console.log('  Testing RFC-6350 vCard 4.0 serialization & parsing...');
const sampleVCard = governor.generateShareableVCard('user_101');
assert.ok(sampleVCard.includes('BEGIN:VCARD'));
assert.ok(sampleVCard.includes('VERSION:4.0'));
assert.ok(sampleVCard.includes('FN:Arash Kamangir'));
assert.ok(sampleVCard.includes('TEL;TYPE=CELL:+989121112233'));
assert.ok(sampleVCard.includes('X-TG-USER-ID:user_101'));
assert.ok(sampleVCard.includes('X-TG-USERNAME:arash_k'));
assert.ok(sampleVCard.includes('END:VCARD'));

const parsed = governor.parseVCard(sampleVCard);
assert.strictEqual(parsed.fn, 'Arash Kamangir');
assert.strictEqual(parsed.userId, 'user_101');
assert.strictEqual(parsed.username, 'arash_k');
assert.strictEqual(parsed.tel?.[0]?.value, '+989121112233');

// Merging a shared vCard from outside
const mergedContact = governor.parseAndMergeSharedVCard(sampleVCard);
assert.strictEqual(mergedContact.userId, 'user_101');
assert.strictEqual(mergedContact.firstName, 'Arash');
console.log('  ✅ RFC-6350 vCard serialization and deserialization verified');

// 5. Test photo location resolution across DC migration (tdlib #3757)
console.log('  Testing photo location resolution & DC migration...');
const photoLoc = governor.resolveContactPhotoLocation('user_101', 2, 4);
assert.strictEqual(photoLoc.migrated, true);
assert.strictEqual(photoLoc.dcId, 4);
assert.strictEqual(photoLoc.photoHash, 'hash_arash_1');
assert.ok(photoLoc.downloadUrl.includes('dc=4'));
console.log('  ✅ Photo location resolution and DC migration verified');

// 6. Test new contact initial message notification & badge dispatch (Ajaxy #540)
console.log('  Testing new contact initial message dispatch...');
const event1 = governor.handleNewContactMessage('unknown_user_999', 'msg_1001');
assert.strictEqual(event1.notify, true);
assert.strictEqual(event1.badgeCountIncrement, 1);
assert.strictEqual(event1.reason, 'new_peer_contact_message');

const event2 = governor.handleNewContactMessage('user_101', 'msg_1002');
assert.strictEqual(event2.notify, true);
assert.strictEqual(event2.badgeCountIncrement, 1);
assert.strictEqual(event2.reason, 'known_contact_message');
console.log('  ✅ New contact message notification dispatch verified');

// 7. Test permission policy non-intrusive behavior (Telegram-iOS #2265)
console.log('  Testing permission policy non-intrusive behavior...');
const p1 = governor.evaluatePermissionPolicy(false);
assert.strictEqual(p1.canSyncSystemContacts, false);
assert.strictEqual(p1.allowManualEntry, true);
assert.strictEqual(p1.shouldNagUser, true);

// Subsequent denials should not nag
const p2 = governor.evaluatePermissionPolicy(false);
assert.strictEqual(p2.shouldNagUser, false);
assert.strictEqual(p2.allowManualEntry, true);
console.log('  ✅ Permission policy anti-nagging verified');

// 8. Test paginated contact retrieval (Ajaxy #392)
console.log('  Testing paginated contacts retrieval...');
const page1 = governor.getPaginatedContacts(1, 2);
assert.strictEqual(page1.contacts.length, 2);
assert.strictEqual(page1.hasMore, true);
assert.ok(page1.total >= 5);

const page3 = governor.getPaginatedContacts(3, 2);
assert.ok(page3.contacts.length >= 1);
console.log('  ✅ Paginated contact retrieval verified');

console.log('✨ All Phase 70 Verification Tests Passed 100% Successfully!');
