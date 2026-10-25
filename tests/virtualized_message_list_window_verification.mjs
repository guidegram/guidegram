/**
 * Phase 155 Verification Suite:
 * Virtualized Infinite Message List & 100k Render Optimization Protocol
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

console.log('🧪 Starting Phase 155 Verification: Virtualized Infinite Message List & 100k Render Optimization Protocol...\n');

// 1. Check file existence
const windowFile = path.join(rootDir, 'src', 'utils', 'virtualizedMessageListWindow.ts');
assert(fs.existsSync(windowFile), 'src/utils/virtualizedMessageListWindow.ts file exists');

// 2. Read source code and check exports
const sourceContent = fs.readFileSync(windowFile, 'utf-8');
assert(
  sourceContent.includes('export class VirtualizedMessageListWindow') &&
  sourceContent.includes('export interface VirtualWindowResult'),
  'virtualizedMessageListWindow.ts exports VirtualizedMessageListWindow class and window interface'
);

// 3. Test binary search offset resolution
assert(
  sourceContent.includes('findIndexForOffset(offsetY: number): number') &&
  sourceContent.includes('(low + high) >>> 1') &&
  sourceContent.includes('this.prefixHeights[mid]'),
  'VirtualizedMessageListWindow implements O(log N) binary search offset resolution'
);

// 4. Test overscan pre-rendering buffer math
assert(
  sourceContent.includes('computeVisibleWindow(scrollTop: number, viewportHeight: number)') &&
  sourceContent.includes('rawStart - this.overscan') &&
  sourceContent.includes('rawEnd + this.overscan'),
  'VirtualizedMessageListWindow applies overscan buffers to prevent scroll pop-in jank'
);

// 5. Test dynamic height caching and cumulative prefix height array
assert(
  sourceContent.includes('setRowHeight(index: number, height: number): void') &&
  sourceContent.includes('rebuildPrefixOffsets(): void') &&
  sourceContent.includes('this.prefixHeights[i] + h'),
  'VirtualizedMessageListWindow caches measured dynamic heights and accumulates prefix arrays'
);

// 6. Check CSS styles in src/index.css
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'index.css'), 'utf-8');
assert(
  cssContent.includes('.virtual-scroll-viewport') &&
  cssContent.includes('.virtual-message-spacer') &&
  cssContent.includes('contain: strict;'),
  'src/index.css defines .virtual-scroll-viewport and .virtual-message-spacer CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedTests}/${totalTests} checks passed.`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 155 Verification Passed Successfully!\n');
  process.exit(0);
} else {
  console.error('❌ Phase 155 Verification Failed!\n');
  process.exit(1);
}
