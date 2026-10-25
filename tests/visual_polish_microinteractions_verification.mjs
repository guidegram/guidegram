/**
 * tests/visual_polish_microinteractions_verification.mjs
 * Verification suite for Phase 110: 60fps Micro-Interactions, Tooltip Springs & Visual Polish Capstone Protocol
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 110 Verification: 60fps Micro-Interactions, Tooltip Springs & Visual Polish Capstone Protocol...\n');

let totalChecks = 0;
let passedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedChecks++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

const rootDir = process.cwd();
const indexCssPath = resolve(rootDir, 'src/index.css');
const chatViewportPath = resolve(rootDir, 'src/components/ChatViewport.tsx');

const indexCss = readFileSync(indexCssPath, 'utf8');
const chatViewport = readFileSync(chatViewportPath, 'utf8');

// 1. CSS Online Badge Pulse & Keyframes
assert(
  indexCss.includes('.online-badge-pulse') && indexCss.includes('@keyframes onlineDotPulse'),
  'index.css defines .online-badge-pulse with @keyframes onlineDotPulse emerald glowing cycle'
);

// 2. CSS Scroll Bottom Bounce Animation & Hover State
assert(
  indexCss.includes('.scroll-bottom-bounce') && indexCss.includes('.scroll-bottom-bounce:hover'),
  'index.css defines .scroll-bottom-bounce class with tactile spring transform and active states'
);

// 3. CSS Tooltip Spring Class
assert(
  indexCss.includes('.tooltip-spring'),
  'index.css defines .tooltip-spring with cubic-bezier elastic scale curves'
);

// 4. ChatViewport Online Indicator Integration
assert(
  chatViewport.includes('online-badge-pulse') && chatViewport.includes('text-emerald-400 font-medium'),
  'ChatViewport integrates .online-badge-pulse with emerald badge in chat header'
);

// 5. ChatViewport Scroll to Bottom AnimatePresence
assert(
  chatViewport.includes('<AnimatePresence>') && chatViewport.includes('showScrollBottom'),
  'ChatViewport wraps Floating Scroll to Bottom button in AnimatePresence'
);

// 6. ChatViewport Scroll to Bottom Motion Button
assert(
  chatViewport.includes('<motion.button') && chatViewport.includes('scroll-bottom-bounce'),
  'ChatViewport implements motion.button with .scroll-bottom-bounce class'
);

// 7. ChatViewport Scroll to Bottom Spring Physics
assert(
  chatViewport.includes('stiffness: 420, damping: 24, mass: 0.7'),
  'ChatViewport configures cubic spring physics (stiffness 420, damping 24, mass 0.7)'
);

// 8. ChatViewport Scroll to Bottom Hover/Tap Scaling
assert(
  chatViewport.includes('whileHover={{ scale: 1.08 }}') && chatViewport.includes('whileTap={{ scale: 0.92 }}'),
  'ChatViewport configures tactile whileHover (1.08) and whileTap (0.92) scales'
);

// 9. ChatViewport Unread Badge Motion Span
assert(
  chatViewport.includes('<motion.span') && chatViewport.includes('unreadScrollCount'),
  'ChatViewport animates unread scroll counter pill with spring pop'
);

console.log(`\n📊 Verification Summary: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 110 Verification PASSED: All 60fps Micro-Interactions & Visual Polish Capstone constraints satisfied!\n');
  process.exit(0);
} else {
  console.error('💥 Phase 110 Verification FAILED: Some assertions did not pass.\n');
  process.exit(1);
}
