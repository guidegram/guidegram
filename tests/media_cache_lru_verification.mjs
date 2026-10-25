import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { MediaCacheManager } from '../electron/mediaCacheManager.ts'

test('MediaCacheManager: LRU quota enforcement evicts oldest files first to 80% ceiling', () => {
  const tmpDir = path.join(os.tmpdir(), `guidegram_cache_test_${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })

  try {
    // Create 5 files of 1000 bytes each (Total: 5000 bytes)
    const file1 = path.join(tmpDir, 'file1_oldest.bin')
    const file2 = path.join(tmpDir, 'file2_older.bin')
    const file3 = path.join(tmpDir, 'file3_middle.bin')
    const file4 = path.join(tmpDir, 'file4_newer.bin')
    const file5 = path.join(tmpDir, 'file5_newest.bin')

    const buf = Buffer.alloc(1000, 0xaa)
    fs.writeFileSync(file1, buf)
    fs.writeFileSync(file2, buf)
    fs.writeFileSync(file3, buf)
    fs.writeFileSync(file4, buf)
    fs.writeFileSync(file5, buf)

    // Artificially modify mtime/atime to create clear LRU order
    const now = Date.now() / 1000
    fs.utimesSync(file1, now - 500, now - 500)
    fs.utimesSync(file2, now - 400, now - 400)
    fs.utimesSync(file3, now - 300, now - 300)
    fs.utimesSync(file4, now - 200, now - 200)
    fs.utimesSync(file5, now - 100, now - 100)

    // Quota: 3000 bytes. 80% ceiling target = 2400 bytes.
    // Starting total = 5000 bytes.
    // Need to evict at least 3 files (3000 bytes) to get remaining to <= 2400 bytes (2000 bytes remaining).
    const result = MediaCacheManager.enforceQuota(tmpDir, 3000)

    assert.equal(result.evictedFiles, 3, 'Should evict exactly 3 oldest files')
    assert.equal(result.freedBytes, 3000)
    assert.equal(result.remainingBytes, 2000)
    assert.equal(result.totalFiles, 2)

    // Verify oldest files are removed and newest remain
    assert.equal(fs.existsSync(file1), false, 'file1 (oldest) should be evicted')
    assert.equal(fs.existsSync(file2), false, 'file2 should be evicted')
    assert.equal(fs.existsSync(file3), false, 'file3 should be evicted')
    assert.equal(fs.existsSync(file4), true, 'file4 (newer) should be preserved')
    assert.equal(fs.existsSync(file5), true, 'file5 (newest) should be preserved')
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  }
})

test('MediaCacheManager: Under-quota directories trigger zero evictions', () => {
  const tmpDir = path.join(os.tmpdir(), `guidegram_cache_under_${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })

  try {
    const f = path.join(tmpDir, 'small.bin')
    fs.writeFileSync(f, Buffer.alloc(100))

    const res = MediaCacheManager.enforceQuota(tmpDir, 5000)
    assert.equal(res.evictedFiles, 0)
    assert.equal(res.freedBytes, 0)
    assert.equal(res.remainingBytes, 100)
    assert.equal(fs.existsSync(f), true)
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  }
})

test('MediaCacheManager: Telemetry report accurately reflects disk consumption', () => {
  const tmpDir = path.join(os.tmpdir(), `guidegram_cache_report_${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })

  try {
    const f1 = path.join(tmpDir, 'f1.bin')
    const f2 = path.join(tmpDir, 'f2.bin')
    fs.writeFileSync(f1, Buffer.alloc(2048))
    fs.writeFileSync(f2, Buffer.alloc(2048))

    const report = MediaCacheManager.getReport(tmpDir, 8192)
    assert.equal(report.filesCount, 2)
    assert.equal(report.totalBytes, 4096)
    assert.equal(report.formattedSize, '4.0 KB')
    assert.equal(report.quotaUtilizationPercent, 50)
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  }
})
