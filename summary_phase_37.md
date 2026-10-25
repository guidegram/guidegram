# Phase 37 Summary: Master Passcode & Key Derivation with PBKDF2 (Layer 08, MM-004)

### Problem & Invariant Violation
Previously:
- `PrivacySecuritySettings` in `electron/telegram/accountManager.ts` (line 10571) returned hardcoded `localPasscode: false` with zero actual local passcode or vault locking capabilities.
- Local SQLite database, sensitive cached assets, and session state remained fully exposed in memory if the user stepped away from the workstation.

### Architectural & Surgical Solution
1. **Implemented `PasscodeGuard` (`electron/passcodeGuard.ts`)**:
   - Cryptographically derived keys using **PBKDF2-HMAC-SHA512** with 100,000 iterations and a 32-byte cryptographically secure salt.
   - Constant-time verification with `crypto.timingSafeEqual` preventing side-channel timing attacks.
   - Memory hygiene: ephemeral derived buffers zeroized via `computedHash.fill(0)` immediately after use.
   - Brute-force exponential backoff: progressive lock-out after 5 failed attempts (30-second initial penalty escalating to multi-minute lockout).
   - Inactivity auto-lock watcher: configurable inactivity delay (1 to 60 minutes) automatically locking session.
2. **Integrated into System Core**:
   - Initialized in `electron/main.ts` using portable user data path (`portableDataDir`).
   - Connected `getPrivacySettings` in `electron/telegram/accountManager.ts` directly to `passcodeGuard.isPasscodeSet()`.
   - Exposed full IPC suite (`passcode:get-status`, `passcode:set`, `passcode:remove`, `passcode:unlock`, `passcode:lock`, `passcode:set-autolock-minutes`) in `electron/main.ts` and `electron/preload.ts`.
3. **Verification & Testing**:
   - `tests/passcode_guard_verification.mjs` passed 23/23 assertions.
   - `npm run build` completed successfully in ~15s.
   - Swarm consensus achieved with ARCHITECT, AUDITOR, and VERIFIER PASS votes.
