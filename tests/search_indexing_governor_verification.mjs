/**
 * Search Indexing and Query Cache Governor Verification Suite
 */

import { SearchIndexingAndQueryCacheGovernor } from '../dist-test-search/searchIndexingAndQueryCacheGovernor.js';
import assert from 'node:assert';

console.log('--- Starting Search Indexing & Query Cache Governor Verification ---');

// 1. IME Composition Search Guard (telegram-tt #533)
const whileComposing = SearchIndexingAndQueryCacheGovernor.shouldDispatchSearch(true, 'سلام');
assert.strictEqual(whileComposing, false);

const afterComposing = SearchIndexingAndQueryCacheGovernor.shouldDispatchSearch(false, 'سلام');
assert.strictEqual(afterComposing, true);

const empty = SearchIndexingAndQueryCacheGovernor.shouldDispatchSearch(false, '   ');
assert.strictEqual(empty, false);
console.log('✅ Check 1 Passed: IME composition search suppression verified.');

// 2. Persian & Arabic Normalization & Zero-Width Sanitization (tdlib #1004, tdesktop #7417)
const messyText = 'كِتَاب\u200Cي';
const normalized = SearchIndexingAndQueryCacheGovernor.normalizeSearchText(messyText);
assert.strictEqual(normalized, 'کتابی');
console.log('✅ Check 2 Passed: Arabic/Persian letter and zero-width normalization verified.');

// 3. Structured Query Directive Parsing (kotatogram #433)
const idQuery = SearchIndexingAndQueryCacheGovernor.parseSearchDirectives('id:777888');
assert.strictEqual(idQuery.isStructured, true);
assert.strictEqual(idQuery.filterType, 'id');
assert.strictEqual(idQuery.filterValue, '777888');

const hashIdQuery = SearchIndexingAndQueryCacheGovernor.parseSearchDirectives('#999111');
assert.strictEqual(hashIdQuery.isStructured, true);
assert.strictEqual(hashIdQuery.filterType, 'id');
assert.strictEqual(hashIdQuery.filterValue, '999111');

const fromQuery = SearchIndexingAndQueryCacheGovernor.parseSearchDirectives('from:@durov');
assert.strictEqual(fromQuery.isStructured, true);
assert.strictEqual(fromQuery.filterType, 'user');
console.log('✅ Check 3 Passed: Structured query directive parsing verified.');

// 4. Emoji Autocomplete Matching (tdesktop #627, tweb #473)
const matches = SearchIndexingAndQueryCacheGovernor.autocompleteEmoji(':sm');
assert.ok(matches.length >= 1);
assert.strictEqual(matches[0].emoji, '😀');
assert.strictEqual(matches[0].shortcode, ':smile:');

const fireMatches = SearchIndexingAndQueryCacheGovernor.autocompleteEmoji(':fi');
assert.ok(fireMatches.length >= 1);
assert.strictEqual(fireMatches[0].emoji, '🔥');
console.log('✅ Check 4 Passed: Emoji autocomplete shortcodes verified.');

// 5. Query Cache & Expiry (TDesktop-x64 #72)
const governor = new SearchIndexingAndQueryCacheGovernor();
const mockResults = [{ id: 1, title: 'Result A' }, { id: 2, title: 'Result B' }];

const t0 = 1000000;
governor.setCachedResults('test_query', mockResults, t0);

const hit = governor.getCachedResults('test_query', t0 + 30000);
assert.deepStrictEqual(hit, mockResults);

const expired = governor.getCachedResults('test_query', t0 + 65000);
assert.strictEqual(expired, null);
console.log('✅ Check 5 Passed: Query cache TTL invalidation verified.');

console.log('🎉 ALL 5 SEARCH INDEXING & QUERY CACHE GOVERNOR CHECKS PASSED!');
