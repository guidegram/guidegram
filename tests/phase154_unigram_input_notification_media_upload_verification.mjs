import assert from 'node:assert/strict';
import { UnigramInputNotificationMediaAndUploadGovernor } from '../src/services/unigramInputNotificationMediaAndUploadGovernor.ts';

console.log('🧪 Starting Phase 154: Unigram Input, Notification, Media, and Upload Hardening Test Suite...');

const governor = new UnigramInputNotificationMediaAndUploadGovernor();

// =========================================================================
// Test 1: Unigram #1416 - Quick Reply from Notifications Validation
// =========================================================================
console.log('Testing Unigram #1416: Quick reply action validation and feedback toast...');
{
  // Sub-case 1: Missing chat ID
  const resInvalidChat = governor.processNotificationQuickReply(
    { action: 'reply', chatId: '', replyText: 'Hi' },
    true
  );
  assert.equal(resInvalidChat.success, false);
  assert.equal(resInvalidChat.status, 'invalid_chat');

  // Sub-case 2: Unauthenticated lock screen
  const resUnauth = governor.processNotificationQuickReply(
    { action: 'reply', chatId: '12345', replyText: 'Hi' },
    false
  );
  assert.equal(resUnauth.success, false);
  assert.equal(resUnauth.status, 'auth_required');

  // Sub-case 3: Empty text reply
  const resEmpty = governor.processNotificationQuickReply(
    { action: 'reply', chatId: '12345', replyText: '   ' },
    true
  );
  assert.equal(resEmpty.success, false);
  assert.equal(resEmpty.status, 'empty_text');

  // Sub-case 4: Successful quick reply
  const resSuccess = governor.processNotificationQuickReply(
    { action: 'reply', chatId: '12345', replyText: 'Got it, thanks!' },
    true
  );
  assert.equal(resSuccess.success, true);
  assert.equal(resSuccess.status, 'queued');
  assert.ok(resSuccess.messageId?.startsWith('outbox_'));
  assert.equal(resSuccess.feedbackToast, 'Reply sent');
  console.log('✅ Unigram #1416: Quick reply validation verified.');
}

// =========================================================================
// Test 2: Unigram #714 - Notification Deep Link Reply Context Preservation
// =========================================================================
console.log('Testing Unigram #714: Deep link quote snippet and composer focus preservation...');
{
  const uri = 'guidegram://chat/-1001987654321?replyTo=8842&text=Checking+in';
  const context = governor.parseNotificationDeepLink(uri);
  assert.equal(context.chatId, '-1001987654321');
  assert.equal(context.replyToMsgId, '8842');
  assert.equal(context.initialText, 'Checking in');
  assert.equal(context.quoteSnippet, 'Quoting message #8842');
  assert.equal(context.focusComposer, true);

  // Test JSON notification payload fallback
  const jsonPayload = JSON.stringify({ chatId: '554433', replyTo: '9911', text: 'Hello' });
  const jsonContext = governor.parseNotificationDeepLink(jsonPayload);
  assert.equal(jsonContext.chatId, '554433');
  assert.equal(jsonContext.replyToMsgId, '9911');
  assert.equal(jsonContext.initialText, 'Hello');
  console.log('✅ Unigram #714: Deep link reply context verified.');
}

// =========================================================================
// Test 3: Unigram #2619 - Window Focus Loss / Regain Input Lockup Recovery
// =========================================================================
console.log('Testing Unigram #2619: Window focus input lockup recovery...');
{
  const mockDom = {
    hasStuckOverlay: true,
    hasPointerLock: true,
    isImeComposing: true,
    activeElement: 'body'
  };

  const status = governor.recoverWindowFocusAndInputState(mockDom);
  assert.equal(status.recovered, true);
  assert.equal(status.zombieOverlaysCleared, 1);
  assert.equal(status.pointerCaptureReleased, true);
  assert.equal(status.imeCompositionReset, true);
  assert.equal(status.activeElementTag, 'input#message_composer');
  console.log('✅ Unigram #2619: Window focus input recovery verified.');
}

// =========================================================================
// Test 4: Unigram #3296 - Voice Recording Lifecycle on Alt+Tab / Blur
// =========================================================================
console.log('Testing Unigram #3296: Voice recording blur safety pause and restore...');
{
  const sessionId = 'voice_session_1';
  governor.startVoiceRecording(sessionId, 'chat_999');

  // User hits Alt+Tab or minimizes window
  const suspended = governor.handleWindowBlurOrMinimize(sessionId);
  assert.ok(suspended);
  assert.equal(suspended.state, 'paused');
  assert.equal(suspended.isSuspended, true);
  assert.ok(suspended.cachedDraftBlobId?.startsWith('voice_draft_voice_session_1_'));

  // User restores window
  const restored = governor.handleWindowRestore(sessionId);
  assert.ok(restored);
  assert.equal(restored.canResume, true);
  assert.equal(restored.uiLockCleared, true);

  // User finalizes voice message
  const finalized = governor.finalizeOrDiscardVoiceRecording(sessionId, 'finalize');
  assert.ok(finalized);
  assert.equal(finalized.state, 'finalized');
  console.log('✅ Unigram #3296: Voice recording lifecycle recovery verified.');
}

// =========================================================================
// Test 5: Unigram #859 - Clipboard File Paste Governor
// =========================================================================
console.log('Testing Unigram #859: Clipboard file paste inspection and ingestion...');
{
  const items = [
    { kind: 'string', type: 'text/plain', data: 'Look at these files: ' },
    { kind: 'file', type: 'image/png', fileName: 'diagram.png', size: 1048576, data: 'blob:image/1' },
    { kind: 'file', type: 'application/pdf', fileName: 'report.pdf', size: 5242880, data: 'blob:pdf/2' },
    { kind: 'file', type: 'application/zip', fileName: 'huge.zip', size: 3 * 1024 * 1024 * 1024 } // 3GB exceeds 2GB limit
  ];

  const parsed = governor.parseClipboardPasteItems(items);
  assert.equal(parsed.plainText, 'Look at these files: ');
  assert.equal(parsed.pastedFiles.length, 2);
  assert.equal(parsed.pastedFiles[0].name, 'diagram.png');
  assert.equal(parsed.pastedFiles[0].isImage, true);
  assert.equal(parsed.pastedFiles[1].name, 'report.pdf');
  assert.equal(parsed.pastedFiles[1].isImage, false);
  assert.equal(parsed.errors.length, 1);
  assert.ok(parsed.errors[0].includes('exceeds max limit'));
  console.log('✅ Unigram #859: Clipboard file paste governor verified.');
}

// =========================================================================
// Test 6: Unigram #1939 - Image Routing (Photo vs Uncompressed Document)
// =========================================================================
console.log('Testing Unigram #1939: Image media compression routing...');
{
  // Case A: Standard high-res JPEG without force document -> Should route as photo with scaled dimensions
  const photoDecision = governor.decideImageRouting({
    mimeType: 'image/jpeg',
    originalWidth: 4000,
    originalHeight: 3000
  });
  assert.equal(photoDecision.mode, 'photo');
  assert.equal(photoDecision.thumbnailRequired, true);
  assert.equal(photoDecision.targetWidth, 2560);
  assert.equal(photoDecision.targetHeight, 1920);

  // Case B: User requested send as document -> Preserve uncompressed
  const docDecision = governor.decideImageRouting({
    mimeType: 'image/jpeg',
    originalWidth: 4000,
    originalHeight: 3000,
    forceAsDocument: true
  });
  assert.equal(docDecision.mode, 'document');
  assert.equal(docDecision.thumbnailRequired, false);

  // Case C: SVG vector -> Always document to preserve XML source
  const svgDecision = governor.decideImageRouting({
    mimeType: 'image/svg+xml',
    isSvg: true
  });
  assert.equal(svgDecision.mode, 'document');
  console.log('✅ Unigram #1939: Image media compression routing verified.');
}

// =========================================================================
// Test 7: Unigram #3306 - MP4 HEVC / FastStart Video Upload Resiliency
// =========================================================================
console.log('Testing Unigram #3306: MP4 HEVC video chunked upload and stall recovery...');
{
  const uploadId = 'upload_hevc_movie';
  const totalSize = 2 * 1024 * 1024; // 2MB
  const chunkSize = 512 * 1024; // 512KB -> 4 chunks

  const upload = governor.initializeVideoUpload(uploadId, 'clip.mp4', totalSize, {
    codecHint: 'hevc',
    hasFastStartMoov: false,
    chunkSizeBytes: chunkSize
  });

  assert.equal(upload.totalChunks, 4);
  assert.equal(upload.codec, 'hevc');
  assert.equal(upload.status, 'uploading');

  // Chunk 1 & 2 succeed
  governor.uploadNextChunk(uploadId, chunkSize);
  governor.uploadNextChunk(uploadId, chunkSize);
  assert.equal(upload.uploadedBytes, 1024 * 1024);

  // Chunk 3 simulates stall
  governor.uploadNextChunk(uploadId, chunkSize, true);
  assert.equal(upload.status, 'stalled');

  // Resume stalled upload
  governor.resumeStalledVideoUpload(uploadId);
  assert.equal(upload.status, 'uploading');

  // Complete chunk 3 & 4
  governor.uploadNextChunk(uploadId, chunkSize);
  const completed = governor.uploadNextChunk(uploadId, chunkSize);
  assert.equal(completed.status, 'completed');
  assert.equal(completed.uploadedBytes, totalSize);
  console.log('✅ Unigram #3306: MP4 HEVC video chunked upload resiliency verified.');
}

console.log('🎉 Phase 154: All 7 Unigram hardening tests PASSED with 100% precision!');
