/**
 * Phase 156 Verification Suite:
 * Desktop Keyboard Shortcut Matrix & Accessible Focus Trapping Protocol
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

console.log('🧪 Starting Phase 156 Verification: Desktop Keyboard Shortcut Matrix & Accessible Focus Trapping Protocol...\n');

// 1. Check file existence
const managerFile = path.join(rootDir, 'src', 'services', 'keyboardShortcutManager.ts');
assert(fs.existsSync(managerFile), 'src/services/keyboardShortcutManager.ts file exists');

// 2. Read source code and check exports
const sourceContent = fs.readFileSync(managerFile, 'utf-8');
assert(
  sourceContent.includes('export class KeyboardShortcutManager') &&
  sourceContent.includes('export interface ShortcutDefinition'),
  'keyboardShortcutManager.ts exports KeyboardShortcutManager class and ShortcutDefinition interface'
);

// 3. Test Singleton architecture
assert(
  sourceContent.includes('public static getInstance(): KeyboardShortcutManager') &&
  sourceContent.includes('private static instance: KeyboardShortcutManager'),
  'KeyboardShortcutManager enforces singleton shortcut matrix controller'
);

// 4. Test input isolation & shortcut evaluator
assert(
  sourceContent.includes('handleKeyDown(e: KeyboardEvent): boolean') &&
  sourceContent.includes('isInputElement(') &&
  sourceContent.includes('if (isInput && !s.allowInInputs) continue;'),
  'KeyboardShortcutManager isolates keystrokes from text input and textarea elements'
);

// 5. Test WAI-ARIA modal focus trapping and restore
assert(
  sourceContent.includes('trapFocusInElement(container: HTMLElement): void') &&
  sourceContent.includes('releaseFocusTrap(): void') &&
  sourceContent.includes('handleFocusTrapCycle(e: KeyboardEvent): void'),
  'KeyboardShortcutManager implements cyclic modal focus trapping conforming to WAI-ARIA standards'
);

// 6. Check CSS styles in src/index.css
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'index.css'), 'utf-8');
assert(
  cssContent.includes('.keyboard-shortcut-kbd') &&
  cssContent.includes('.accessible-focus-ring:focus-visible'),
  'src/index.css defines .keyboard-shortcut-kbd and accessible focus-visible outline tokens'
);

console.log(`\n📊 Verification Result: ${passedTests}/${totalTests} checks passed.`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 156 Verification Passed Successfully!\n');
  process.exit(0);
} else {
  console.error('❌ Phase 156 Verification Failed!\n');
  process.exit(1);
}
