import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Phase 24: Preload IPC Strict Type Safety & No any Verification', async (t) => {
  const preloadSource = fs.readFileSync(path.resolve('electron/preload.ts'), 'utf-8')

  await t.test('1. Verify zero Promise<any> in electron/preload.ts', () => {
    const promiseAnyMatches = preloadSource.match(/:\s*Promise<any>/g)
    assert.equal(promiseAnyMatches, null, `Found loose Promise<any> returns in preload.ts: ${promiseAnyMatches?.length}`)
  })

  await t.test('2. Verify zero options?: any or params: any in method parameters', () => {
    const looseParamsMatches = preloadSource.match(/\((options|params|invoice|settings|filter|rules)\s*\??:\s*any/g)
    assert.equal(looseParamsMatches, null, `Found loose any parameters in preload.ts: ${looseParamsMatches?.join(', ')}`)
  })

  await t.test('3. Verify dist-electron/preload.cjs exists and is non-empty', () => {
    const bundlePath = path.resolve('dist-electron/preload.cjs')
    assert.ok(fs.existsSync(bundlePath), 'dist-electron/preload.cjs must exist after build')
    const stat = fs.statSync(bundlePath)
    assert.ok(stat.size > 20000, `dist-electron/preload.cjs should be > 20KB, got ${stat.size}`)
  })

  await t.test('4. Verify GuidegramAPI export is derived from guidegramAPI', () => {
    assert.ok(preloadSource.includes('export type GuidegramAPI = typeof guidegramAPI'), 'Must export GuidegramAPI type')
    assert.ok(preloadSource.includes("contextBridge.exposeInMainWorld('guidegram', guidegramAPI)"), 'Must expose guidegramAPI')
  })
})
