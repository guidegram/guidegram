/**
 * fido2PasskeySelector.ts
 * 
 * FIDO2 / WebAuthn Resident Key Disambiguation & Account Resolution Engine.
 * Directly resolves high-impact competitor issue:
 * - tdesktop #31547: Passkey login always picks the first credential when multiple resident keys exist on FIDO2 security key
 * 
 * Background:
 * In FIDO2 CTAP2 ceremonies (libfido2 on Linux/macOS), when a security key holds multiple
 * resident credentials for an RP (e.g. telegram.org) and `allowCredentials` is empty (discoverable passkey login),
 * `fido_dev_get_assert` returns `fido_assert_count(assert) > 1`.
 * Naive implementations hardcode index 0 (`fido_assert_id_ptr(assert, 0)`), permanently locking out
 * all accounts registered at subsequent indexes on the same physical token.
 * 
 * Features:
 * 1. Multi-Assertion Parsing & Validation:
 *    - Parses all N assertions returned by the authenticator.
 *    - Extracts credential ID, userHandle, userName, and displayName.
 * 2. AllowList Matching:
 *    - If target credentials are specified, matches binary credential IDs across all assertions
 *      rather than assuming index 0 matches.
 * 3. Discoverable Multi-Account Selection:
 *    - Resolves account candidates for UI disambiguation (Account Picker dialog).
 * 4. Telemetry & Security Auditing:
 *    - Tracks assertion counts, multi-resident detections, and disambiguation events.
 */

export interface Fido2CredentialAssertion {
  index: number;
  credentialId: string; // Base64URL or Hex representation
  rawCredentialId: Uint8Array;
  userHandle?: string; // Telegram user ID (Base64URL or Hex)
  userName?: string; // Telegram username or phone
  displayName?: string; // User display name
  authenticatorData: Uint8Array;
  signature: Uint8Array;
}

export interface PasskeySelectionResult {
  selectedAssertion: Fido2CredentialAssertion | null;
  totalAssertionsCount: number;
  requiresDisambiguation: boolean;
  availableCandidates: Fido2CredentialAssertion[];
}

export interface Fido2SelectorTelemetry {
  totalCeremoniesProcessed: number;
  multiResidentDetectedCount: number;
  disambiguationsRequiredCount: number;
  exactAllowListMatchesCount: number;
}

export class Fido2PasskeySelector {
  private static instance: Fido2PasskeySelector | null = null;

  // Telemetry
  private totalCeremonies: number = 0;
  private multiResidentDetected: number = 0;
  private disambiguationsRequired: number = 0;
  private exactAllowListMatches: number = 0;

  private constructor() {}

  public static getInstance(): Fido2PasskeySelector {
    if (!this.instance) {
      this.instance = new Fido2PasskeySelector();
    }
    return this.instance;
  }

  /**
   * Resolves the correct credential assertion from a set of FIDO2 assertions.
   * 
   * @param assertions List of parsed assertions from the authenticator
   * @param allowedCredentialIds Optional list of permitted credential IDs (Base64URL or Hex)
   * @param targetUserHandle Optional target Telegram user handle (user ID)
   * @param selectedIndex Optional user-selected index from the Account Picker dialog
   */
  public resolveAssertion(
    assertions: Fido2CredentialAssertion[],
    allowedCredentialIds?: string[],
    targetUserHandle?: string,
    selectedIndex?: number
  ): PasskeySelectionResult {
    this.totalCeremonies++;

    if (!assertions || assertions.length === 0) {
      return {
        selectedAssertion: null,
        totalAssertionsCount: 0,
        requiresDisambiguation: false,
        availableCandidates: [],
      };
    }

    const count = assertions.length;
    if (count > 1) {
      this.multiResidentDetected++;
    }

    // 1. If user explicitly picked an index from the Account Picker dialog
    if (typeof selectedIndex === 'number' && selectedIndex >= 0 && selectedIndex < count) {
      return {
        selectedAssertion: assertions[selectedIndex],
        totalAssertionsCount: count,
        requiresDisambiguation: false,
        availableCandidates: assertions,
      };
    }

    // 2. If allowedCredentialIds is provided, match against allowed IDs across ALL assertions
    if (allowedCredentialIds && allowedCredentialIds.length > 0) {
      const allowedSet = new Set(allowedCredentialIds.map((id) => this.normalizeId(id)));
      for (const assertion of assertions) {
        if (allowedSet.has(this.normalizeId(assertion.credentialId))) {
          this.exactAllowListMatches++;
          return {
            selectedAssertion: assertion,
            totalAssertionsCount: count,
            requiresDisambiguation: false,
            availableCandidates: assertions,
          };
        }
      }
    }

    // 3. If targetUserHandle is provided, match against userHandle
    if (targetUserHandle) {
      const targetNorm = this.normalizeId(targetUserHandle);
      for (const assertion of assertions) {
        if (assertion.userHandle && this.normalizeId(assertion.userHandle) === targetNorm) {
          return {
            selectedAssertion: assertion,
            totalAssertionsCount: count,
            requiresDisambiguation: false,
            availableCandidates: assertions,
          };
        }
      }
    }

    // 4. Discoverable credential flow (no allowCredentials and multiple resident keys on token)
    if (count > 1) {
      this.disambiguationsRequired++;
      return {
        selectedAssertion: null, // Requires user to choose via Account Picker dialog
        totalAssertionsCount: count,
        requiresDisambiguation: true,
        availableCandidates: assertions,
      };
    }

    // 5. Exactly 1 resident credential on the key
    return {
      selectedAssertion: assertions[0],
      totalAssertionsCount: 1,
      requiresDisambiguation: false,
      availableCandidates: assertions,
    };
  }

  /**
   * Normalizes credential IDs and user handles for reliable comparison.
   */
  private normalizeId(id: string): string {
    return id.trim().replace(/=+$/, '').toLowerCase();
  }

  public getTelemetry(): Fido2SelectorTelemetry {
    return {
      totalCeremoniesProcessed: this.totalCeremonies,
      multiResidentDetectedCount: this.multiResidentDetected,
      disambiguationsRequiredCount: this.disambiguationsRequired,
      exactAllowListMatchesCount: this.exactAllowListMatches,
    };
  }
}

export const fido2PasskeySelector = Fido2PasskeySelector.getInstance();
