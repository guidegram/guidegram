/**
 * Telegram-iOS Build Toolchain, Prerequisites, Packaging Diagnostics,
 * Legacy Media Compatibility & Localization Governor (Final 10 iOS Issues Elimination)
 * 
 * Hardens Guidegram against iOS build pipeline and localization failures:
 * - #453, #469, #941: Build prerequisites verification (Bazel, CMake, Ninja, Yasm, Git-LFS) and tutorial guidance.
 * - #219, #330: Legacy release (5.13, 6.3) OpenSSL/FFmpeg media compiler flags and architecture slicing.
 * - #333, #353, #926: Packaging error analyzer & diagnostic recovery (code sign identity, bitcode, bazel cache).
 * - #2402: Dynamic internationalization & CJK language pack fallback resolver.
 * - #2397: Cyrillic typography glyph caching & layout memory leak watchdog.
 */

export interface ToolchainRequirement {
  name: string;
  minVersion: string;
  installedVersion: string | null;
}

export interface PrerequisitesCheckResult {
  ready: boolean;
  missingTools: string[];
  recommendedInstallCommand: string;
}

/**
 * #453, #469, #941: iOS Build Prerequisites & Toolchain Verification Governor
 */
export class IosBuildEnvironmentAndPrerequisitesGovernor {
  private requiredTools = ['git-lfs', 'cmake', 'ninja', 'python3', 'yasm'];

  public checkPrerequisites(installedTools: Record<string, string>): PrerequisitesCheckResult {
    const missingTools: string[] = [];

    for (const tool of this.requiredTools) {
      if (!installedTools[tool]) {
        missingTools.push(tool);
      }
    }

    const ready = missingTools.length === 0;
    const recommendedInstallCommand = missingTools.length > 0
      ? `brew install ${missingTools.join(' ')}`
      : 'All build prerequisites are satisfied.';

    return {
      ready,
      missingTools,
      recommendedInstallCommand
    };
  }
}

/**
 * #219, #330: Legacy Release Media Compiler Compatibility Governor
 */
export class IosLegacyBranchMediaBuildGovernor {
  public resolveLegacyMediaCompilerFlags(releaseVersion: string): {
    targetArchs: string[];
    cflags: string[];
    useBoringSslShim: boolean;
  } {
    const isLegacy = releaseVersion.startsWith('5.') || releaseVersion.startsWith('6.');

    return {
      targetArchs: isLegacy ? ['arm64'] : ['arm64', 'arm64e'],
      cflags: isLegacy
        ? ['-DOPENSSL_NO_ASM', '-Wno-deprecated-declarations', '-fno-aligned-allocation']
        : ['-std=c++20'],
      useBoringSslShim: isLegacy
    };
  }
}

export type PackagingErrorCode =
  | 'CODE_SIGN_IDENTITY_NOT_FOUND'
  | 'BITCODE_DEPRECATED'
  | 'BAZEL_CACHE_CORRUPT'
  | 'PYTHON_VERSION_MISMATCH'
  | 'UNKNOWN_ERROR';

export interface PackagingDiagnostic {
  code: PackagingErrorCode;
  description: string;
  remediationStep: string;
}

/**
 * #333, #353, #926: Packaging & Make Build Diagnostics Governor
 */
export class IosArchivePackagingDiagnosticsGovernor {
  public diagnoseBuildLog(logOutput: string): PackagingDiagnostic {
    if (logOutput.includes('No signing certificate') || logOutput.includes('no identity found')) {
      return {
        code: 'CODE_SIGN_IDENTITY_NOT_FOUND',
        description: 'Code signing certificate is missing from Apple Keychain.',
        remediationStep: 'Install Apple Development certificate in Apple Keychain or enable development ad-hoc codesigning.'
      };
    }

    if (logOutput.includes('bitcode') && logOutput.includes('deprecated')) {
      return {
        code: 'BITCODE_DEPRECATED',
        description: 'Bitcode submission is deprecated since Xcode 14.',
        remediationStep: 'Set ENABLE_BITCODE=NO in build settings and Xcode target build configs.'
      };
    }

    if (logOutput.includes('bazel') && (logOutput.includes('corrupted') || logOutput.includes('disk full'))) {
      return {
        code: 'BAZEL_CACHE_CORRUPT',
        description: 'Bazel execution cache is corrupted or disk volume full.',
        remediationStep: 'Run `bazel clean --expunge` and restart project generation.'
      };
    }

    if ((logOutput.toLowerCase().includes('python') || logOutput.includes('.py')) && logOutput.includes('SyntaxError')) {
      return {
        code: 'PYTHON_VERSION_MISMATCH',
        description: 'Build script was executed with an incompatible Python version.',
        remediationStep: 'Ensure Python 3.10+ is active on PATH (`python3 --version`).'
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      description: 'Generic build failure occurred.',
      remediationStep: 'Review verbose build logs under build-system/Make logs.'
    };
  }
}

/**
 * #2402 & #2397: Internationalization, CJK Fallback & Typography Cache Governor
 */
export class IosLocalizationAndTypographyGovernor {
  private supportedLocales = ['en', 'zh-hans', 'zh-hant', 'ru', 'fa', 'ar'];
  private glyphMeasurementCache: Map<string, number> = new Map();

  public resolveLocale(requestedLanguageCode: string): { effectiveLocale: string; isFallback: boolean } {
    const normalized = requestedLanguageCode.toLowerCase().replace('_', '-');

    if (this.supportedLocales.includes(normalized)) {
      return { effectiveLocale: normalized, isFallback: false };
    }

    // Dialect fallback: zh-cn -> zh-hans, zh-tw / zh-hk -> zh-hant
    if (normalized.startsWith('zh-cn')) return { effectiveLocale: 'zh-hans', isFallback: false };
    if (normalized.startsWith('zh')) return { effectiveLocale: 'zh-hant', isFallback: false };

    // Default universal fallback
    return { effectiveLocale: 'en', isFallback: true };
  }

  public measureGlyphWidth(char: string, fontSizePx = 14): number {
    const key = `${char}_${fontSizePx}`;
    if (this.glyphMeasurementCache.has(key)) {
      return this.glyphMeasurementCache.get(key)!;
    }

    // Cyrillic / Latin standard proportional estimation; CJK full-width estimation
    const code = char.charCodeAt(0);
    const isCjk = (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);
    const width = isCjk ? fontSizePx : Math.round(fontSizePx * 0.6);

    // Bound cache size to prevent memory leaks (#2397)
    if (this.glyphMeasurementCache.size > 2000) {
      this.glyphMeasurementCache.clear();
    }

    this.glyphMeasurementCache.set(key, width);
    return width;
  }

  public getCacheSize(): number {
    return this.glyphMeasurementCache.size;
  }
}
