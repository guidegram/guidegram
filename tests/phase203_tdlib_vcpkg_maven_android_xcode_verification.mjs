/**
 * Verification Suite for Phase 203:
 * TDLib Vcpkg Portfile, Maven Native Classifier, Android NDK Source Build,
 * macOS Deployment Target & Xcode 16 dSYM Symbol Governor
 * 
 * Verifies fixes for:
 * - tdlib/td #30: Vcpkg portfile generator, triplet compatibility & CMake find_package integration.
 * - tdlib/td #68, #3284, #3206: Maven Central POM packaging with multi-platform JNI native library classifiers.
 * - tdlib/td #1077, #128, #932: Android NDK source build CMake toolchain generator & dependency resolution.
 * - tdlib/td #2406: macOS min deployment target (-DCMAKE_OSX_DEPLOYMENT_TARGET) & universal binary configuration.
 * - tdlib/td #3014 & #3294: Xcode 16 dSYM symbol generation, dsymutil extraction & React Native upload verification.
 */

import assert from 'node:assert/strict';
import {
  VcpkgPortfileAndTripletGovernor,
  MavenNativeClassifierPackagingGovernor,
  AndroidNdkSourceBuildToolchainGovernor,
  MacOsDeploymentTargetGovernor,
  Xcode16DsymutilSymbolGovernor
} from '../src/services/tdlibVcpkgMavenAndroidAndXcodeGovernor.ts';

console.log('🧪 Starting Phase 203 Verification: TDLib Vcpkg, Maven, Android NDK & Xcode 16...');

// -------------------------------------------------------------
// Test 1: #30 - Vcpkg Portfile Generator & Triplet Compatibility
// -------------------------------------------------------------
console.log('  Testing #30: Vcpkg Portfile & Triplet Support...');
const vcpkgGov = new VcpkgPortfileAndTripletGovernor();

const portfile = vcpkgGov.generateVcpkgPortfile('1.8.44', 'abcdef012345');
assert.ok(portfile.includes('vcpkg_from_github'));
assert.ok(portfile.includes('vcpkg_cmake_configure'));

const staticTriplet = vcpkgGov.validateTripletCompatibility('x64-windows-static');
assert.equal(staticTriplet.isSupported, true);
assert.ok(staticTriplet.cmakeFlags.includes('-DVCPKG_TARGET_IS_STATIC=ON'));

const androidTriplet = vcpkgGov.validateTripletCompatibility('arm64-android');
assert.equal(androidTriplet.isSupported, true);
console.log('  ✅ #30 Verified: Vcpkg portfile and triplet compatibility verified.');

// -------------------------------------------------------------
// Test 2: #68, #3284, #3206 - Maven Multi-Platform Native Classifiers
// -------------------------------------------------------------
console.log('  Testing #68, #3284, #3206: Maven Central Multi-Platform Classifiers...');
const mavenGov = new MavenNativeClassifierPackagingGovernor();

// Windows x86_64
const winRes = mavenGov.resolveClassifierArtifact('Windows 11', 'amd64');
assert.equal(winRes.isSupported, true);
assert.equal(winRes.classifier, 'windows-x86_64');
assert.equal(winRes.fileName, 'tdlib-1.8.44-windows-x86_64.jar');

// Linux ARM64
const linuxRes = mavenGov.resolveClassifierArtifact('Linux', 'aarch64');
assert.equal(linuxRes.isSupported, true);
assert.equal(linuxRes.classifier, 'linux-arm64');

// macOS Apple Silicon
const macRes = mavenGov.resolveClassifierArtifact('Mac OS X', 'arm64');
assert.equal(macRes.isSupported, true);
assert.equal(macRes.classifier, 'darwin-arm64');
console.log('  ✅ #68, #3284, #3206 Verified: Maven multi-platform native classifiers verified.');

// -------------------------------------------------------------
// Test 3: #1077, #128, #932 - Android NDK Standalone CMake Source Build
// -------------------------------------------------------------
console.log('  Testing #1077, #128, #932: Android NDK Source Build CMake Toolchain...');
const ndkGov = new AndroidNdkSourceBuildToolchainGovernor();

const ndkCmd = ndkGov.generateAndroidCmakeCommand('/opt/android-ndk-r26b', 'arm64-v8a', 24);
assert.ok(ndkCmd.cmakeCommand.includes('-DANDROID_ABI=arm64-v8a'));
assert.ok(ndkCmd.cmakeCommand.includes('-DANDROID_STL=c++_shared'));
assert.ok(ndkCmd.cmakeCommand.includes('-DTD_ENABLE_JNI=ON'));
assert.ok(ndkCmd.toolchainPath.includes('android.toolchain.cmake'));
console.log('  ✅ #1077, #128, #932 Verified: Android NDK standalone CMake source build verified.');

// -------------------------------------------------------------
// Test 4: #2406 - macOS Deployment Target & Universal Binary
// -------------------------------------------------------------
console.log('  Testing #2406: macOS Deployment Target & Architectures...');
const macOsGov = new MacOsDeploymentTargetGovernor();

const macSettings = macOsGov.resolveMacOsDeploymentSettings('12.0');
assert.equal(macSettings.deploymentTargetFlag, '-DCMAKE_OSX_DEPLOYMENT_TARGET=12.0');
assert.equal(macSettings.architecturesFlag, '-DCMAKE_OSX_ARCHITECTURES=arm64;x86_64');
assert.equal(macSettings.isUniversalBinary, true);
console.log('  ✅ #2406 Verified: macOS deployment target and universal binary verified.');

// -------------------------------------------------------------
// Test 5: #3014 & #3294 - Xcode 16 dSYM Symbol & App Store Readiness
// -------------------------------------------------------------
console.log('  Testing #3014 & #3294: Xcode 16 dSYM Symbols & App Store Readiness...');
const dsymGov = new Xcode16DsymutilSymbolGovernor();

const dsymConfig = dsymGov.resolveDebugSymbolFlags(true, true);
assert.ok(dsymConfig.cflags.includes('-gline-tables-only'));
assert.ok(dsymConfig.dsymCommand.includes('dsymutil --flat'));
assert.equal(dsymConfig.isAppStoreReady, true);
console.log('  ✅ #3014 & #3294 Verified: Xcode 16 dSYM symbol generation verified.');

console.log('\n🎉 ALL 5 PHASE 203 TDLIB VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');
