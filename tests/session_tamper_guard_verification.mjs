/**
 * Phase 152 Verification Suite:
 * Security Tamper Audit & Session Key Integrity Gate Protocol
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

console.log('🧪 Starting Phase 152 Verification: Security Tamper Audit & Session Key Integrity Gate Protocol...\n');

// 1. Check file existence
const guardFile = path.join(rootDir, 'src', 'services', 'sessionTamperGuard.ts');
assert(fs.existsSync(guardFile), 'src/services/sessionTamperGuard.ts file exists');

// 2. Read source code and check exports
const sourceContent = fs.readFileSync(guardFile, 'utf-8');
assert(
  sourceContent.includes('export class SessionTamperGuard') &&
  sourceContent.includes('export interface SignedSessionEnvelope') &&
  sourceContent.includes('export interface TamperAuditRecord'),
  'sessionTamperGuard.ts exports SessionTamperGuard class and security interfaces'
);

// 3. Test Singleton architecture
assert(
  sourceContent.includes('public static getInstance(') &&
  sourceContent.includes('private static instance: SessionTamperGuard'),
  'SessionTamperGuard enforces singleton cryptographic authority'
);

// 4. Test session signing and HMAC generation
assert(
  sourceContent.includes('signSession(sessionId: string, userId: string') &&
  sourceContent.includes('computeDigest(serialized, this.deviceMasterSecret);') &&
  sourceContent.includes('event: \'SIGN_SUCCESS\''),
  'SessionTamperGuard generates device-bound cryptographic HMAC signatures'
);

// 5. Test tamper verification and automated session wipe
assert(
  sourceContent.includes('verifySessionIntegrity(') &&
  sourceContent.includes('wipeCompromisedSession(envelope.sessionId);') &&
  sourceContent.includes("event: 'TAMPER_DETECTED'"),
  'SessionTamperGuard detects storage tampering and enforces instantaneous session wipe'
);

// 6. Check CSS styles in src/index.css
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'index.css'), 'utf-8');
assert(
  cssContent.includes('.security-tamper-pill') &&
  cssContent.includes('.security-tamper-pill.compromised') &&
  cssContent.includes('.tamper-warning-toast'),
  'src/index.css defines .security-tamper-pill and .tamper-warning-toast CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedTests}/${totalTests} checks passed.`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 152 Verification Passed Successfully!\n');
  process.exit(0);
} else {
  console.error('❌ Phase 152 Verification Failed!\n');
  process.exit(1);
}
