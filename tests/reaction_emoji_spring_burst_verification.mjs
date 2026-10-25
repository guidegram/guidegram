/**
 * tests/reaction_emoji_spring_burst_verification.mjs
 * Verification suite for Phase 109: Interactive Reaction Emoji Spring Burst & Particle Physics Protocol
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 109 Verification: Interactive Reaction Emoji Spring Burst & Particle Physics Protocol...\n');

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

// 1. CSS Reaction Picker Spring Token
assert(
  indexCss.includes('.reaction-picker-spring'),
  'index.css defines .reaction-picker-spring utility class'
);

// 2. CSS Reaction Burst Pop Keyframes & Animation
assert(
  indexCss.includes('.reaction-burst-pop') && indexCss.includes('@keyframes reactionBurst'),
  'index.css defines .reaction-burst-pop and @keyframes reactionBurst with spring curve'
);

// 3. CSS Reaction Pill Spring Token
assert(
  indexCss.includes('.reaction-pill-spring'),
  'index.css defines .reaction-pill-spring for tactile micro-interactions'
);

// 4. ChatViewport Outgoing Reaction Picker AnimatePresence
assert(
  chatViewport.includes('<AnimatePresence>') && chatViewport.includes('reaction-picker-spring'),
  'ChatViewport wraps reaction picker in AnimatePresence with .reaction-picker-spring'
);

// 5. ChatViewport Reaction Picker Spring Physics
assert(
  chatViewport.includes("stiffness: 460, damping: 26, mass: 0.6"),
  'ChatViewport configures cubic spring physics (stiffness 460, damping 26) on picker entrance/exit'
);

// 6. ChatViewport Reaction Emoji Motion Button
assert(
  chatViewport.includes("whileHover={{ scale: 1.3 }}") && chatViewport.includes("whileTap={{ scale: 0.85 }}"),
  'ChatViewport implements tactile whileHover and whileTap scaling on reaction emojis'
);

// 7. ChatViewport Reaction Burst Pop Integration
assert(
  chatViewport.includes("reaction-burst-pop"),
  'ChatViewport triggers reaction-burst-pop animation on chosen reaction states'
);

// 8. ChatViewport Reaction Pill Spring Class
assert(
  chatViewport.includes("reaction-pill-spring"),
  'ChatViewport attaches reaction-pill-spring class to message reaction pills'
);

// 9. ChatViewport Reaction Pill Tactile Scale
assert(
  chatViewport.includes("whileHover={{ scale: 1.14 }}") && chatViewport.includes("whileTap={{ scale: 0.86 }}"),
  'ChatViewport defines responsive spring hover/tap scales (1.14 / 0.86) for reaction pills'
);

// 10. ChatViewport Paid/Star Reaction Spring Button
assert(
  chatViewport.includes("t('stars.send_star_reaction')") && chatViewport.includes("whileHover={{ scale: 1.25 }}"),
  'ChatViewport integrates animated star reaction button with tactile spring feedback'
);

console.log(`\n📊 Verification Summary: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 109 Verification PASSED: All Reaction Emoji Spring Burst & Particle Physics constraints satisfied!\n');
  process.exit(0);
} else {
  console.error('💥 Phase 109 Verification FAILED: Some assertions did not pass.\n');
  process.exit(1);
}
