import assert from 'node:assert';
import { WebClientTransportComposerAndFormattingGovernor } from '../src/services/webClientTransportComposerAndFormattingGovernor.ts';

console.log('=== Phase 135 Verification: Web Transport, Composer & Formatting Governor ===');

const governor = new WebClientTransportComposerAndFormattingGovernor();

// Test 1: Markdown Spoilers Parsing (||spoiler||) (#80)
{
  const parsed = governor.parseRichTextFormatting('Warning: ||This is a major plot spoiler|| do not read!');
  assert.strictEqual(parsed.rawCleanText, 'Warning: This is a major plot spoiler do not read!');
  assert.strictEqual(parsed.entities.length, 1);
  assert.strictEqual(parsed.entities[0].type, 'spoiler');
  assert.strictEqual(parsed.entities[0].offset, 9);
  assert.strictEqual(parsed.entities[0].length, 28);
  console.log('Test 1 Passed: Spoiler text parsing and entity offset extraction verified.');
}

// Test 2: Multiline Code Blocks Parsing (```typescript ... ```) (#32)
{
  const codeBlockInput = 'Here is the function:\n```typescript\nfunction add(a: number, b: number) {\n  return a + b;\n}\n```\nEnjoy!';
  const parsed = governor.parseRichTextFormatting(codeBlockInput);

  assert.ok(parsed.entities.some(e => e.type === 'pre' && e.language === 'typescript'));
  assert.ok(parsed.rawCleanText.includes('function add(a: number, b: number)'));
  assert.ok(!parsed.rawCleanText.includes('```typescript'));
  console.log('Test 2 Passed: Multiline code block syntax preservation verified.');
}

// Test 3: Composer Edit Buffer Flush upon Dispatch (#104)
{
  const dirtyComposer = {
    currentText: 'Edited message text',
    editMessageId: 456,
    replyToMessageId: 123,
    attachedMediaCount: 2,
    isSending: true
  };

  const { clearedState, dispatchedEditMessageId, wasEditing } = governor.flushComposerAfterDispatch(dirtyComposer);

  assert.strictEqual(wasEditing, true);
  assert.strictEqual(dispatchedEditMessageId, 456);
  assert.strictEqual(clearedState.currentText, '');
  assert.strictEqual(clearedState.editMessageId, undefined);
  assert.strictEqual(clearedState.replyToMessageId, undefined);
  assert.strictEqual(clearedState.attachedMediaCount, 0);
  assert.strictEqual(clearedState.isSending, false);
  console.log('Test 3 Passed: Composer edit buffer and draft flush verified.');
}

// Test 4: Close All Open Chats Action (#79)
{
  const result = governor.closeAllOpenChats([101, 102, 103, 104]);
  assert.strictEqual(result.freedTabsCount, 4);
  assert.deepStrictEqual(result.remainingChatIds, []);
  assert.strictEqual(result.activeChatId, null);
  console.log('Test 4 Passed: Close all open conversation tabs action verified.');
}

// Test 5: CJK Multilingual Character Word Wrapping (#149)
{
  const cjkResult = governor.formatCjkWordWrap('你好世界！这是一个中文测试消息。');
  assert.strictEqual(cjkResult.hasCjkCharacters, true);
  assert.ok(cjkResult.cssWordBreakRule.includes('break-all'));

  const latinResult = governor.formatCjkWordWrap('Hello world standard text.');
  assert.strictEqual(latinResult.hasCjkCharacters, false);
  assert.ok(latinResult.cssWordBreakRule.includes('break-word'));
  console.log('Test 5 Passed: CJK multilingual text word breaking verified.');
}

// Test 6: Production Dockerfile and Nginx Configuration (#182)
{
  const { dockerfile, nginxConf } = governor.generateDockerDeploymentSpecs();
  assert.ok(dockerfile.includes('FROM node:20-alpine AS builder'));
  assert.ok(dockerfile.includes('FROM nginx:alpine-slim'));
  assert.ok(nginxConf.includes('try_files $uri $uri/ /index.html;'));
  assert.ok(nginxConf.includes('gzip on;'));
  console.log('Test 6 Passed: Production Docker multi-stage build verified.');
}

// Test 7: Web MTProto WebSocket Packet Framing (#202)
{
  const payload = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
  const packet = governor.frameWebSocketPacket(payload, 42);
  assert.strictEqual(packet.opCode, 'data');
  assert.strictEqual(packet.sequenceNumber, 42);
  assert.strictEqual(packet.payloadBytes.length, 4);
  console.log('Test 7 Passed: Web MTProto WebSocket packet framing verified.');
}

console.log('=== ALL PHASE 135 TESTS PASSED (100% HEALTH) ===');
