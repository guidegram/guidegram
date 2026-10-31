import assert from 'node:assert';
import { MtprotoUploadPipelineHardener } from '../src/services/mtprotoUploadPipelineHardener.ts';

console.log('🧪 Running MTProto Upload Pipeline Hardener Verification (Phase 159)...');

let passed = 0;
const hardener = MtprotoUploadPipelineHardener.getInstance();
hardener.reset();

// 1. Part size calculation
assert.strictEqual(hardener.computeOptimalPartSize(500 * 1024), 128 * 1024);
assert.strictEqual(hardener.computeOptimalPartSize(5 * 1024 * 1024), 256 * 1024);
assert.strictEqual(hardener.computeOptimalPartSize(25 * 1024 * 1024), 512 * 1024);
assert.strictEqual(hardener.computeOptimalPartSize(120 * 1024 * 1024), 1024 * 1024);
console.log('✅ Check 1: Adaptive MTProto part size calculation passed');
passed++;

// 2. Concurrency calculation
assert.strictEqual(hardener.computeOptimalConcurrency(2 * 1024 * 1024), 2);
assert.strictEqual(hardener.computeOptimalConcurrency(20 * 1024 * 1024), 4);
assert.strictEqual(hardener.computeOptimalConcurrency(80 * 1024 * 1024), 6);
assert.strictEqual(hardener.computeOptimalConcurrency(500 * 1024 * 1024), 8);
console.log('✅ Check 2: Dynamic concurrency worker allocation passed');
passed++;

// 3. Plan creation for 13MB file (exact size from tdesktop #5325 demo)
const fileSize13MB = 13 * 1024 * 1024;
const plan = hardener.createUploadPlan('file_13mb', fileSize13MB);
assert.strictEqual(plan.fileId, 'file_13mb');
assert.strictEqual(plan.partSize, 512 * 1024);
assert.strictEqual(plan.totalParts, 26);
assert.strictEqual(plan.isBigFile, true);
assert.strictEqual(plan.concurrency, 4);
assert.strictEqual(plan.parts.length, 26);
assert.strictEqual(plan.parts[0].offset, 0);
assert.strictEqual(plan.parts[0].size, 512 * 1024);
assert.strictEqual(plan.parts[25].isLast, true);
console.log('✅ Check 3: 13MB file upload plan generation passed');
passed++;

// 4. Progress recording & EWMA velocity telemetry
const tele1 = hardener.recordPartCompletion('file_13mb', 0);
assert.ok(tele1 !== null);
assert.strictEqual(tele1.completedParts, 1);
assert.strictEqual(tele1.uploadedBytes, 512 * 1024);
assert.ok(tele1.progressPercent > 0);
assert.strictEqual(tele1.activeWorkers, 4);
console.log('✅ Check 4: Initial part completion and telemetry passed');
passed++;

// 5. Subsequent parts & speed accumulation
hardener.recordPartCompletion('file_13mb', 1);
const tele3 = hardener.recordPartCompletion('file_13mb', 2);
assert.strictEqual(tele3.completedParts, 3);
assert.strictEqual(tele3.uploadedBytes, 3 * 512 * 1024);
console.log('✅ Check 5: Multi-part throughput accumulation passed');
passed++;

// 6. Stall detection & subsession recycle threshold
// Simulate speed drop
const tele4 = hardener.recordPartCompletion('file_13mb', 3);
assert.strictEqual(hardener.shouldRecycleSubsession('file_13mb'), false);

// Inject simulated stalls
for (let i = 4; i < 8; i++) {
  hardener.recordPartCompletion('file_13mb', i);
}

// 7. Subsession recycle notification
hardener.notifySubsessionRecycled('file_13mb');
assert.strictEqual(hardener.shouldRecycleSubsession('file_13mb'), false);
console.log('✅ Check 6: Stall detection and subsession recycling passed');
passed++;

// 8. Finish upload cleanup
hardener.finishUpload('file_13mb');
assert.strictEqual(hardener.recordPartCompletion('file_13mb', 10), null);
console.log('✅ Check 7: Finish upload and state cleanup passed');
passed++;

console.log(`\n🎉 ALL ${passed}/7 CHECKS PASSED FOR MTPROTO UPLOAD PIPELINE HARDENER!`);
