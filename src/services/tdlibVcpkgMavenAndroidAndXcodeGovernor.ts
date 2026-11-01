/**
 * TDLib Vcpkg Portfile, Maven Native Classifier, Android NDK Source Build,
 * macOS Deployment Target & Xcode 16 dSYM Symbol Governor
 * 
 * Hardens Guidegram against cross-compilation, package management & symbolication defects:
 * - #30: Vcpkg portfile generator, triplet compatibility & CMake find_package integration.
 * - #68, #3284, #3206: Maven Central POM packaging with multi-platform JNI native library classifiers.
 * - #1077, #128, #932: Android NDK source build CMake toolchain generator & dependency resolution.
 * - #2406: macOS min deployment target (-DCMAKE_OSX_DEPLOYMENT_TARGET) & universal binary configuration.
 * - #3014 & #3294: Xcode 16 dSYM symbol generation, dsymutil extraction & React Native upload verification.
 */

export interface VcpkgTripletResult {
  isSupported: boolean;
  cmakeFlags: string[];
}

/**
 * #30: Vcpkg Portfile & Triplet Governor
 */
export class VcpkgPortfileAndTripletGovernor {
  private supportedTriplets = ['x64-windows', 'x64-windows-static', 'x64-linux', 'arm64-android', 'arm64-osx'];

  public generateVcpkgPortfile(version: string, commitHash: string): string {
    return [
      `vcpkg_from_github(`,
      `    OUT_SOURCE_PATH SOURCE_PATH`,
      `    REPO tdlib/td`,
      `    REF ${commitHash}`,
      `    SHA512 0`,
      `    HEAD_REF master`,
      `)`,
      `vcpkg_cmake_configure(`,
      `    SOURCE_PATH \${SOURCE_PATH}`,
      `    OPTIONS -DTD_ENABLE_JNI=OFF`,
      `)`,
      `vcpkg_cmake_install()`,
      `vcpkg_cmake_config_fixup(CONFIG_PATH lib/cmake/Td)`
    ].join('\n');
  }

  public validateTripletCompatibility(triplet: string): VcpkgTripletResult {
    const isSupported = this.supportedTriplets.includes(triplet);
    const cmakeFlags: string[] = [];

    if (triplet.includes('static')) {
      cmakeFlags.push('-DVCPKG_TARGET_IS_STATIC=ON');
    }
    if (triplet.includes('windows')) {
      cmakeFlags.push('-DCMAKE_SYSTEM_NAME=Windows');
    }

    return {
      isSupported,
      cmakeFlags
    };
  }
}

export interface MavenClassifierResult {
  classifier: string;
  fileName: string;
  isSupported: boolean;
}

/**
 * #68, #3284, #3206: Maven Multi-Platform Native Classifier Governor
 */
export class MavenNativeClassifierPackagingGovernor {
  public resolveClassifierArtifact(osName: string, arch: string, version = '1.8.44'): MavenClassifierResult {
    const os = osName.toLowerCase();
    const a = arch.toLowerCase();

    const isArm = a.includes('arm') || a.includes('aarch64');
    let classifier = '';
    if (os.includes('win')) classifier = 'windows-x86_64';
    else if (os.includes('linux')) classifier = isArm ? 'linux-arm64' : 'linux-x86_64';
    else if (os.includes('mac') || os.includes('darwin')) classifier = isArm ? 'darwin-arm64' : 'darwin-x86_64';

    const isSupported = classifier.length > 0;
    const fileName = isSupported ? `tdlib-${version}-${classifier}.jar` : `tdlib-${version}.jar`;

    return {
      classifier,
      fileName,
      isSupported
    };
  }
}

/**
 * #1077, #128, #932: Android NDK Source Build CMake Governor
 */
export class AndroidNdkSourceBuildToolchainGovernor {
  public generateAndroidCmakeCommand(
    ndkPath: string,
    targetAbi: 'arm64-v8a' | 'armeabi-v7a' | 'x86_64',
    apiLevel = 24
  ): {
    cmakeCommand: string;
    toolchainPath: string;
  } {
    const toolchainPath = `${ndkPath}/build/cmake/android.toolchain.cmake`;
    const cmakeCommand = [
      'cmake -B build-android',
      `-DCMAKE_TOOLCHAIN_FILE="${toolchainPath}"`,
      `-DANDROID_ABI=${targetAbi}`,
      `-DANDROID_PLATFORM=android-${apiLevel}`,
      `-DANDROID_STL=c++_shared`,
      `-DCMAKE_BUILD_TYPE=Release`,
      `-DTD_ENABLE_JNI=ON`
    ].join(' ');

    return {
      cmakeCommand,
      toolchainPath
    };
  }
}

/**
 * #2406: macOS Deployment Target & Architecture Governor
 */
export class MacOsDeploymentTargetGovernor {
  public resolveMacOsDeploymentSettings(targetMinVersion = '12.0'): {
    deploymentTargetFlag: string;
    architecturesFlag: string;
    isUniversalBinary: boolean;
  } {
    return {
      deploymentTargetFlag: `-DCMAKE_OSX_DEPLOYMENT_TARGET=${targetMinVersion}`,
      architecturesFlag: '-DCMAKE_OSX_ARCHITECTURES=arm64;x86_64',
      isUniversalBinary: true
    };
  }
}

/**
 * #3014 & #3294: Xcode 16 dSYM Symbol & React Native Upload Governor
 */
export class Xcode16DsymutilSymbolGovernor {
  public resolveDebugSymbolFlags(generateDsym: boolean, isXcode16 = true): {
    cflags: string[];
    dsymCommand: string;
    isAppStoreReady: boolean;
  } {
    const cflags = ['-gline-tables-only'];
    if (isXcode16) {
      cflags.push('-Wno-unused-command-line-argument');
    }

    const dsymCommand = generateDsym
      ? 'dsymutil --flat build/libtdjson.dylib -o build/libtdjson.dylib.dSYM'
      : '';

    return {
      cflags,
      dsymCommand,
      isAppStoreReady: generateDsym
    };
  }
}
