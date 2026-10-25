/**
 * tests/shader_engine_hub_benchmark_verification.mjs
 * Verification suite for Phase 130: Cluster 4 Midpoint Benchmark & Visual Engine Architecture Consolidation Protocol
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Phase 130 Verification: Cluster 4 Midpoint Benchmark & Visual Engine Architecture Consolidation Protocol...\n');

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
const hubPath = resolve(rootDir, 'src/utils/shaderEngineHub.ts');
const indexCssPath = resolve(rootDir, 'src/index.css');

// 1. Verify existence of shaderEngineHub.ts
assert(existsSync(hubPath), 'src/utils/shaderEngineHub.ts file exists');

const hubContent = readFileSync(hubPath, 'utf8');
const indexCss = readFileSync(indexCssPath, 'utf8');

// 2. Hub class and interface exports
assert(
  hubContent.includes('export class ShaderEngineHub') &&
  hubContent.includes('export interface VisualEngineStats'),
  'shaderEngineHub.ts exports ShaderEngineHub class and VisualEngineStats interface'
);

// 3. Verify all 19 Cluster 4 visual engines are re-exported
const expectedEngines = [
  'dynamicGradientShader',
  'fluidParticleCanvas',
  'cinematicBloomShader',
  'parallaxTiltEngine',
  'organicWaveShader',
  'vectorMorphEngine',
  'glassmorphismShader',
  'ambientVignetteShader',
  'fluidRippleShader',
  'chromaticAberrationShader',
  'holographicPrismaticShader',
  'auroraBorealisShader',
  'neomorphicLightingShader',
  'causticWaterShader',
  'cosmicNebulaShader',
  'cyberpunkGlitchShader',
  'liquidMetaballsShader',
  'audioSpectrumShader',
  'matrixDigitalRainShader',
];

let allEnginesPresent = true;
expectedEngines.forEach((engineName) => {
  const filePath = resolve(rootDir, `src/utils/${engineName}.ts`);
  if (!existsSync(filePath) || !hubContent.includes(`export * from './${engineName}'`)) {
    allEnginesPresent = false;
  }
});

assert(allEnginesPresent, 'All 19 Cluster 4 visual engine modules exist and are re-exported by ShaderEngineHub');

// 4. Registry operations and statistics
assert(
  hubContent.includes('registerEngine') &&
  hubContent.includes('unregisterEngine') &&
  hubContent.includes('destroyAll') &&
  hubContent.includes('getStats'),
  'ShaderEngineHub provides lifecycle management: register, unregister, destroyAll, and getStats'
);

// 5. CSS tokens verification
assert(
  indexCss.includes('.visual-engine-gpu-surface') &&
  indexCss.includes('.cluster4-capstone-glow') &&
  indexCss.includes('contain: strict'),
  'src/index.css defines .visual-engine-gpu-surface and .cluster4-capstone-glow CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedChecks}/${totalChecks} checks passed.`);

if (passedChecks === totalChecks) {
  console.log('🎉 Phase 130 Verification Passed Successfully!');
  process.exit(0);
} else {
  console.error('💥 Phase 130 Verification Failed!');
  process.exit(1);
}
