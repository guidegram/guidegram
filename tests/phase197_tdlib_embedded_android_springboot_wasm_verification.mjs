/**
 * Verification Suite for Phase 197:
 * TDLib Embedded (Tizen/POSIX), Android Studio AAR, Spring Boot DLL Extraction,
 * Flutter iOS App Store Symbols & WASM Transferable WebWorker Governor
 * 
 * Verifies fixes for:
 * - tdlib/td #1576 & #796: Android Studio Gradle jniLibs packaging & prebuilt ABI layout verification.
 * - tdlib/td #631 & #3009: Windows .NET Core / Spring Boot native DLL extraction from JAR/assembly to temp directory.
 * - tdlib/td #908 & #1695: Embedded POSIX (Tizen, Vita) static compilation & socket buffer optimization.
 * - tdlib/td #2113: Flutter iOS App Store Connect upload bitcode stripping & dSYM symbol preservation.
 * - tdlib/td #127: WebAssembly multi-threaded WebWorker bridge with zero-copy Transferable ArrayBuffers.
 */

import assert from 'node:assert/strict';
import {
  AndroidStudioAarJniPackagerGovernor,
  WindowsNativeDllJarExtractorGovernor,
  EmbeddedTizenPosixNetworkGovernor,
  FlutterIosAppStoreSymbolsGovernor,
  WasmWebWorkerTransferableGovernor
} from '../src/services/tdlibEmbeddedAndroidSpringBootAndWasmGovernor.ts';

console.log('🧪 Starting Phase 197 Verification: TDLib Embedded, Android AAR & Spring Boot...');

// -------------------------------------------------------------
// Test 1: #1576 & #796 - Android Studio JNI AAR Packaging
// -------------------------------------------------------------
console.log('  Testing #1576 & #796: Android Studio JNI Libs Architecture Verification...');
const aarGov = new AndroidStudioAarJniPackagerGovernor();

// Complete ABI set
const completeSet = [
  'app/src/main/jniLibs/arm64-v8a/libtdjni.so',
  'app/src/main/jniLibs/armeabi-v7a/libtdjni.so',
  'app/src/main/jniLibs/x86_64/libtdjni.so'
];
const validLayout = aarGov.verifyJniLibsLayout(completeSet);
assert.equal(validLayout.isValidLayout, true);
assert.equal(validLayout.hasArm64, true);
assert.equal(validLayout.hasArmV7, true);
assert.equal(validLayout.hasX86_64, true);
assert.equal(validLayout.missingAbis.length, 0);

// Incomplete ABI set (missing x86_64)
const incompleteSet = [
  'app/src/main/jniLibs/arm64-v8a/libtdjni.so',
  'app/src/main/jniLibs/armeabi-v7a/libtdjni.so'
];
const partialLayout = aarGov.verifyJniLibsLayout(incompleteSet);
assert.equal(partialLayout.isValidLayout, false);
assert.ok(partialLayout.missingAbis.includes('x86_64'));
console.log('  ✅ #1576 & #796 Verified: Android Studio JNI AAR layout verification verified.');

// -------------------------------------------------------------
// Test 2: #631 & #3009 - Spring Boot / .NET Native DLL Extraction
// -------------------------------------------------------------
console.log('  Testing #631 & #3009: Spring Boot / .NET Native DLL Extraction...');
const extractorGov = new WindowsNativeDllJarExtractorGovernor();

const extractRes = extractorGov.extractNativeDllFromJar('/native/windows/tdjni.dll', 'C:\\Users\\User\\AppData\\Local\\Temp');
assert.equal(extractRes.extracted, true);
assert.ok(extractRes.targetPath.includes('tdjni.dll'));
assert.ok(extractRes.loadCommand.startsWith('System.load('));
console.log('  ✅ #631 & #3009 Verified: Spring Boot & .NET native DLL extraction verified.');

// -------------------------------------------------------------
// Test 3: #908 & #1695 - Embedded POSIX Network Socket Configuration
// -------------------------------------------------------------
console.log('  Testing #908 & #1695: Embedded POSIX Network Sockets (Tizen & Vita)...');
const socketGov = new EmbeddedTizenPosixNetworkGovernor();

const embeddedConfig = socketGov.configureSocketOptions(true);
assert.equal(embeddedConfig.useNonBlocking, true);
assert.equal(embeddedConfig.sendBufferBytes, 64 * 1024);

const desktopConfig = socketGov.configureSocketOptions(false);
assert.equal(desktopConfig.useNonBlocking, true);
assert.equal(desktopConfig.sendBufferBytes, 1024 * 1024);
console.log('  ✅ #908 & #1695 Verified: Embedded socket buffer configurations verified.');

// -------------------------------------------------------------
// Test 4: #2113 - Flutter iOS App Store Connect Symbol Audit
// -------------------------------------------------------------
console.log('  Testing #2113: Flutter iOS App Store Symbols Audit...');
const symbolGov = new FlutterIosAppStoreSymbolsGovernor();

// Framework with bitcode (rejected by App Store)
const rejectedAudit = symbolGov.auditIosFramework('TDLib.framework', true, true);
assert.equal(rejectedAudit.canUploadToAppStore, false);
assert.equal(rejectedAudit.isBitcodeDisabled, false);
assert.ok(rejectedAudit.diagnostics[0].includes('Bitcode enabled'));

// Framework without dSYM (rejected for crash reporting)
const noDsymAudit = symbolGov.auditIosFramework('TDLib.framework', false, false);
assert.equal(noDsymAudit.canUploadToAppStore, false);
assert.equal(noDsymAudit.hasDsymSymbols, false);

// Clean compliant framework
const cleanAudit = symbolGov.auditIosFramework('TDLib.framework', false, true);
assert.equal(cleanAudit.canUploadToAppStore, true);
assert.equal(cleanAudit.isBitcodeDisabled, true);
assert.equal(cleanAudit.hasDsymSymbols, true);
console.log('  ✅ #2113 Verified: App Store Connect symbol and bitcode verification verified.');

// -------------------------------------------------------------
// Test 5: #127 - WebAssembly WebWorker Transferable Buffers
// -------------------------------------------------------------
console.log('  Testing #127: WebAssembly WebWorker Transferable Payload...');
const wasmGov = new WasmWebWorkerTransferableGovernor();

const query = {
  '@type': 'sendMessage',
  chat_id: 12345678,
  input_message_content: { '@type': 'inputMessageText', text: { text: 'Hello Transferable' } }
};

const prepared = wasmGov.prepareTransferablePayload(query);
assert.equal(prepared.isTransferable, true);
assert.ok(prepared.byteLength > 0);
assert.ok(prepared.serializedBuffer instanceof ArrayBuffer);

const restored = wasmGov.deserializePayload(prepared.serializedBuffer);
assert.equal(restored['@type'], 'sendMessage');
assert.equal(restored.chat_id, 12345678);
assert.equal(restored.input_message_content.text.text, 'Hello Transferable');
console.log('  ✅ #127 Verified: WASM transferable WebWorker buffers verified.');

console.log('\n🎉 ALL 5 PHASE 197 TDLIB VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');
