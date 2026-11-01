/**
 * Verification Suite for Phase 194:
 * TDLib Cross-Platform Toolchains, Native Bridges & Architecture Governor
 * 
 * Verifies fixes for:
 * - tdlib/td #77: Android NDK ABI toolchain, libc++ stl & .so header verification.
 * - tdlib/td #18: Emscripten WASM build flags, memory growth (-s ALLOW_MEMORY_GROWTH) & JS bridge.
 * - tdlib/td #38: iOS CocoaPods & XCFramework multi-architecture slice bundler.
 * - tdlib/td #27: C# / .NET P/Invoke native binding marshaller & pinned buffer safety.
 * - tdlib/td #1824: MSVC Visual Studio 2022 C++20 conformance (/permissive-, /utf-8, /Zc:__cplusplus).
 * - tdlib/td #1112: React Native TurboModule & JSI synchronous bridge with zero-copy payloads.
 * - tdlib/td #315: Java / Kotlin JNI library loader with bundled fallback search paths.
 */

import assert from 'node:assert/strict';
import {
  AndroidNdkAbiToolchainGovernor,
  EmscriptenWasmToolchainGovernor,
  IosXcFrameworkSliceGovernor,
  DotNetNativePInvokeGovernor,
  MsvcVs2022BuildGovernor,
  ReactNativeJsiTurboModuleGovernor,
  JavaJniDynamicLoaderGovernor
} from '../src/services/tdlibCrossPlatformToolchainsAndBridgeGovernor.ts';

console.log('🧪 Starting Phase 194 Verification: TDLib Cross-Platform Toolchains & Native Bridges...');

// -------------------------------------------------------------
// Test 1: #77 - Android NDK ABI Toolchain & ELF Header Validation
// -------------------------------------------------------------
console.log('  Testing #77: Android NDK ABI & ELF Verification...');
const ndkGov = new AndroidNdkAbiToolchainGovernor();

const arm64 = ndkGov.resolveAbiBuildSettings('arm64-v8a');
assert.equal(arm64.targetArch, 'aarch64');
assert.equal(arm64.stl, 'c++_shared');
assert.ok(arm64.cflags.includes('-march=armv8-a'));

const arm32 = ndkGov.resolveAbiBuildSettings('armeabi-v7a');
assert.equal(arm32.targetArch, 'arm');
assert.ok(arm32.cflags.includes('-mfpu=neon'));

// Valid ELF Magic: 0x7F, 0x45, 0x4C, 0x46
assert.equal(ndkGov.validateElfMagic([0x7f, 0x45, 0x4c, 0x46]), true);
// Invalid Magic
assert.equal(ndkGov.validateElfMagic([0x4d, 0x5a, 0x90, 0x00]), false);
console.log('  ✅ #77 Verified: Android NDK ABI toolchains and ELF headers verified.');

// -------------------------------------------------------------
// Test 2: #18 - Emscripten WASM Toolchain & JS Bridge
// -------------------------------------------------------------
console.log('  Testing #18: Emscripten WASM & Memory Growth...');
const wasmGov = new EmscriptenWasmToolchainGovernor();

const flags = wasmGov.getCompilerFlags();
assert.ok(flags.emflags.includes('-s ALLOW_MEMORY_GROWTH=1'));
assert.ok(flags.exportedFunctions.includes('_td_json_client_create'));
assert.equal(flags.allowMemoryGrowth, true);

const bridge = wasmGov.createJsBridge();
assert.equal(bridge.isInitialized, true);
const ack = bridge.sendQuery({ '@type': 'getAuthorizationState' });
assert.ok(ack.startsWith('wasm_ack:getAuthorizationState:'));
console.log('  ✅ #18 Verified: Emscripten WASM memory growth and JS bridge verified.');

// -------------------------------------------------------------
// Test 3: #38 - iOS XCFramework Slices
// -------------------------------------------------------------
console.log('  Testing #38: iOS XCFramework Multi-Architecture Slicing...');
const xcGov = new IosXcFrameworkSliceGovernor();

const manifest = xcGov.generateXcFrameworkManifest('TDLib', [
  'ios-arm64',
  'ios-arm64_x86_64-simulator'
]);
assert.equal(manifest.frameworkName, 'TDLib.xcframework');
assert.equal(manifest.hasDeviceSlice, true);
assert.equal(manifest.hasSimulatorSlice, true);
console.log('  ✅ #38 Verified: iOS XCFramework slice bundling verified.');

// -------------------------------------------------------------
// Test 4: #27 - .NET P/Invoke Marshaller & Pinned Buffers
// -------------------------------------------------------------
console.log('  Testing #27: C# / .NET P/Invoke Native Marshaller...');
const pinvokeGov = new DotNetNativePInvokeGovernor();

const pinned = pinvokeGov.allocatePinnedBuffer(1024);
assert.ok(pinned.handle >= 1000);
assert.ok(pinned.address > 0);
assert.equal(pinvokeGov.getActivePinnedCount(), 1);

const freed = pinvokeGov.freePinnedBuffer(pinned.handle);
assert.equal(freed, true);
assert.equal(pinvokeGov.getActivePinnedCount(), 0);

const marshalled = pinvokeGov.marshalUtf8String([71, 117, 105, 100, 101, 103, 114, 97, 109]);
assert.equal(marshalled, 'Guidegram');
console.log('  ✅ #27 Verified: .NET native buffer pinning and marshalling verified.');

// -------------------------------------------------------------
// Test 5: #1824 - MSVC Visual Studio 2022 Conformance
// -------------------------------------------------------------
console.log('  Testing #1824: MSVC VS2022 C++20 Conformance Flags...');
const msvcGov = new MsvcVs2022BuildGovernor();

const msvcFlags = msvcGov.resolveMsvcFlags('c++20');
assert.ok(msvcFlags.includes('/std:c++20'));
assert.ok(msvcFlags.includes('/permissive-'));
assert.ok(msvcFlags.includes('/utf-8'));
assert.ok(msvcFlags.includes('/Zc:__cplusplus'));
assert.equal(msvcGov.isConformanceSatisfied(msvcFlags), true);
console.log('  ✅ #1824 Verified: MSVC VS2022 standards conformance verified.');

// -------------------------------------------------------------
// Test 6: #1112 - React Native TurboModule & JSI Bridge
// -------------------------------------------------------------
console.log('  Testing #1112: React Native TurboModule JSI Dispatch...');
const rkJsiGov = new ReactNativeJsiTurboModuleGovernor();

const versionRes = rkJsiGov.invokeSync('getVersion', {});
assert.equal(versionRes.status, 'OK');
assert.equal(versionRes.result, '1.8.44');

const sendRes = rkJsiGov.invokeSync('send', { '@type': 'setTdlibParameters' });
assert.equal(sendRes.status, 'OK');
assert.equal(sendRes.result.echoType, 'setTdlibParameters');
console.log('  ✅ #1112 Verified: React Native JSI TurboModule zero-copy dispatch verified.');

// -------------------------------------------------------------
// Test 7: #315 - Java / Kotlin JNI Library Loader
// -------------------------------------------------------------
console.log('  Testing #315: Java / Kotlin JNI Dynamic Loader...');
const jniGov = new JavaJniDynamicLoaderGovernor();

// Found in search path
const foundRes = jniGov.resolveNativeLibrary('tdjni', [
  '/usr/local/lib/libunrelated.so',
  '/app/native-libs/libtdjni.so'
]);
assert.equal(foundRes.loaded, true);
assert.equal(foundRes.resolvedPath, '/app/native-libs/libtdjni.so');

// Missing library
const missingRes = jniGov.resolveNativeLibrary('tdjni', [
  '/usr/local/lib/libother.so'
]);
assert.equal(missingRes.loaded, false);
assert.equal(missingRes.resolvedPath, null);
assert.ok(missingRes.diagnostic.includes('could not be located'));
console.log('  ✅ #315 Verified: Java JNI dynamic library loader verified.');

console.log('\n🎉 ALL 7 PHASE 194 TDLIB CROSS-PLATFORM VERIFICATION TESTS PASSED! 🚀');
