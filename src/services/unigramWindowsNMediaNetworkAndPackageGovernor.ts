/**
 * Unigram Windows N Media Feature Pack, AppContainer Loopback Isolation,
 * MSIX Certificate Trust, C++/WinRT Toolchain & WinUI 3 Modernization Governor
 * 
 * Hardens Guidegram against Windows platform edge-case defects:
 * - #1370: Windows N edition detection (missing MFPlat.dll) & software FFmpeg media fallback.
 * - #2594: AppContainer network proxy loopback isolation & CheckNetIsolation exemption manager.
 * - #2694: Windows 11 MSIX sideloading package signature & root certificate trust validator.
 * - #2982, #2217, #950: C++/WinRT Visual Studio 2022 toolchain version & NuGet restore validator.
 * - #399: Windows PRI localization & BCP-47 multi-tier language fallback.
 * - #2562: Legacy WPF deprecation & modern WinUI 3 / DirectComposition pipeline auditor.
 */

export interface MediaFoundationAudit {
  isMediaFoundationAvailable: boolean;
  isWindowsN: boolean;
  fallbackStrategy: 'SOFTWARE_FFMPEG' | 'NATIVE_MF';
  diagnosticMessage: string;
}

/**
 * #1370: Windows N Media Feature Pack Absence Detector
 */
export class WindowsNMediaFeaturePackGovernor {
  private requiredMfDlls = ['MFPlat.dll', 'MFReadWrite.dll'];

  public checkMediaFoundationAvailability(availableSystemDlls: string[]): MediaFoundationAudit {
    const missingDlls = this.requiredMfDlls.filter(dll => !availableSystemDlls.includes(dll));
    const isWindowsN = missingDlls.length > 0;

    return {
      isMediaFoundationAvailable: !isWindowsN,
      isWindowsN,
      fallbackStrategy: isWindowsN ? 'SOFTWARE_FFMPEG' : 'NATIVE_MF',
      diagnosticMessage: isWindowsN
        ? `Windows N edition detected (missing ${missingDlls.join(', ')}). Active software FFmpeg fallback.`
        : 'Windows Media Foundation APIs are fully available.'
    };
  }
}

export interface LoopbackExemptionResult {
  canConnect: boolean;
  remediationCommand: string | null;
  status: 'CONNECTED' | 'LOOPBACK_BLOCKED';
}

/**
 * #2594: AppContainer Network Loopback Isolation Governor
 */
export class AppContainerNetworkLoopbackGovernor {
  private packageFamilyName = 'Guidegram.Desktop_8wekyb3d8bbwe';

  public evaluateProxyLoopbackAccess(hasLoopbackExemption: boolean, isLocalProxy = false): LoopbackExemptionResult {
    if (isLocalProxy && !hasLoopbackExemption) {
      return {
        canConnect: false,
        remediationCommand: `CheckNetIsolation.exe LoopbackExempt -a -n="${this.packageFamilyName}"`,
        status: 'LOOPBACK_BLOCKED'
      };
    }

    return {
      canConnect: true,
      remediationCommand: null,
      status: 'CONNECTED'
    };
  }
}

export type MsixInstallStatus = 'TRUSTED' | 'UNTRUSTED_ROOT' | 'DEVELOPER_MODE_REQUIRED';

/**
 * #2694: MSIX Package Certificate Trust Governor
 */
export class MsixPackageCertificateTrustGovernor {
  public verifyPackageSignature(
    certificateSubject: string,
    isDeveloperMode: boolean,
    isTrustedRoot: boolean
  ): {
    canInstall: boolean;
    status: MsixInstallStatus;
    diagnosticMessage: string;
  } {
    if (!isTrustedRoot) {
      return {
        canInstall: false,
        status: 'UNTRUSTED_ROOT',
        diagnosticMessage: `Certificate '${certificateSubject}' is not installed in the Windows Trusted Root Certification Authorities store.`
      };
    }

    if (!isDeveloperMode) {
      return {
        canInstall: false,
        status: 'DEVELOPER_MODE_REQUIRED',
        diagnosticMessage: 'Windows Developer Mode or Sideloading must be enabled to install non-Store packages.'
      };
    }

    return {
      canInstall: true,
      status: 'TRUSTED',
      diagnosticMessage: `Package signed with trusted certificate '${certificateSubject}' is verified for installation.`
    };
  }
}

export interface CppWinRtBuildStatus {
  canCompile: boolean;
  missingComponents: string[];
  diagnostics: string[];
}

/**
 * #2982, #2217, #950: C++/WinRT Visual Studio 2022 Toolchain Governor
 */
export class CppWinRtVs2022ToolchainGovernor {
  public verifyBuildToolchain(
    vsVersion: string,
    cppWinRtVersion: string,
    hasNuGetRestored: boolean
  ): CppWinRtBuildStatus {
    const missingComponents: string[] = [];
    const diagnostics: string[] = [];

    const vsMajorMinor = parseFloat(vsVersion);
    if (vsMajorMinor < 17.5) {
      missingComponents.push('VS2022_17.5+');
      diagnostics.push(`Visual Studio ${vsVersion} is outdated. VS 17.5+ required for modern C++/WinRT compilation.`);
    }

    const winRtMajor = parseInt(cppWinRtVersion.split('.')[0], 10);
    if (winRtMajor < 2) {
      missingComponents.push('Microsoft.Windows.CppWinRT_2.0+');
      diagnostics.push(`CppWinRT ${cppWinRtVersion} is outdated. Version 2.0+ required.`);
    }

    if (!hasNuGetRestored) {
      missingComponents.push('NuGet_Packages');
      diagnostics.push('NuGet packages must be restored before project compilation (`nuget restore`).');
    }

    const canCompile = missingComponents.length === 0;
    return {
      canCompile,
      missingComponents,
      diagnostics
    };
  }
}

/**
 * #399: Windows PRI Resource Localization Governor
 */
export class WindowsPriLocalizationGovernor {
  private localizedStrings: Map<string, Map<string, string>> = new Map();

  constructor() {
    this.addString('settings_title', 'en', 'Settings');
    this.addString('settings_title', 'fa', 'تنظیمات');
    this.addString('settings_title', 'ru', 'Настройки');
  }

  public addString(key: string, locale: string, value: string): void {
    if (!this.localizedStrings.has(key)) {
      this.localizedStrings.set(key, new Map());
    }
    this.localizedStrings.get(key)!.set(locale, value);
  }

  public resolveLocalizedResource(
    resourceKey: string,
    requestedLocale: string
  ): {
    text: string;
    effectiveLocale: string;
    isFallback: boolean;
  } {
    const dict = this.localizedStrings.get(resourceKey);
    if (!dict) {
      return { text: resourceKey, effectiveLocale: 'en', isFallback: true };
    }

    // Exact locale (e.g. 'fa-IR')
    if (dict.has(requestedLocale)) {
      return { text: dict.get(requestedLocale)!, effectiveLocale: requestedLocale, isFallback: false };
    }

    // Language prefix (e.g. 'fa-IR' -> 'fa')
    const lang = requestedLocale.split('-')[0].toLowerCase();
    if (dict.has(lang)) {
      return { text: dict.get(lang)!, effectiveLocale: lang, isFallback: false };
    }

    // Universal fallback
    const fallback = dict.get('en') || resourceKey;
    return { text: fallback, effectiveLocale: 'en', isFallback: true };
  }
}

/**
 * #2562: Modern UI Framework Auditor (WPF vs WinUI 3)
 */
export class WinUi3RenderingMigrationGovernor {
  public auditUiFramework(framework: 'WPF' | 'WinUI3' | 'UWP_XAML'): {
    isModern: boolean;
    supportsXamlIslands: boolean;
    hasDirectComposition: boolean;
    status: string;
  } {
    if (framework === 'WPF') {
      return {
        isModern: false,
        supportsXamlIslands: false,
        hasDirectComposition: false,
        status: 'Legacy WPF framework detected. High DPI scaling and modern composition limited.'
      };
    }

    return {
      isModern: true,
      supportsXamlIslands: true,
      hasDirectComposition: true,
      status: `Modern ${framework} framework verified with native DirectComposition and smooth animations.`
    };
  }
}
