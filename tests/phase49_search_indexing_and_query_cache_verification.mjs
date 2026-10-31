import assert from 'node:assert/strict';
import { SearchIndexingAndQueryCacheGovernor } from '../src/services/searchIndexingAndQueryCacheGovernor.ts';

console.log('🧪 Starting Phase 49 Search Indexing & Query Cache Verification Suite...');

// 1. IME Composition Search Guard (telegram-tt #533)
{
  console.log('  Testing IME composition search suppression...');
  // While user is composing (isComposing = true), search must not dispatch
  const whileComposing = SearchIndexingAndQueryCacheGovernor.shouldDispatchSearch(true, 'سلام');
  assert.strictEqual(whileComposing, false);

  // Once composition finishes (isComposing = false), search dispatches
  const afterComposing = SearchIndexingAndQueryCacheGovernor.shouldDispatchSearch(false, 'سلام');
  assert.strictEqual(afterComposing, true);

  // Empty string does not dispatch
  const empty = SearchIndexingAndQueryCacheGovernor.shouldDispatchSearch(false, '   ');
  assert.strictEqual(empty, false);
  console.log('  ✅ IME composition search guard verified');
}

// 2. Persian & Arabic Normalization & Zero-Width Sanitization (tdlib #1004, tdesktop #7417)
{
  console.log('  Testing Arabic/Persian letter and zero-width normalization...');
  // Arabic Kaf (ك) and Yeh (ي), diacritics (َ ِ ُ) and zero-width non-joiner (\u200C)
  const messyText = 'كِتَاب\u200Cي';
  const normalized = SearchIndexingAndQueryCacheGovernor.normalizeSearchText(messyText);

  // Should normalize to 'کتابی' (Persian Kaf, no tashkeel, no ZWNJ, Persian Yeh)
  assert.strictEqual(normalized, 'کتابی');
  console.log('  ✅ Query text normalization verified');
}

// 3. Structured Query Directive Parsing (kotatogram #433)
{
  console.log('  Testing search query directives parsing...');
  // ID directive: id:777888
  const idQuery = SearchIndexingAndQueryCacheGovernor.parseSearchDirectives('id:777888');
  assert.strictEqual(idQuery.isStructured, true);
  assert.strictEqual(idQuery.filterType, 'id');
  assert.strictEqual(idQuery.filterValue, '777888');

  // Hash tag ID directive: #999111
  const hashIdQuery = SearchIndexingAndQueryCacheGovernor.parseSearchDirectives('#999111');
  assert.strictEqual(hashIdQuery.isStructured, true);
  assert.strictEqual(hashIdQuery.filterType, 'id');
  assert.strictEqual(hashIdQuery.filterValue, '999111');

  // User directive: from:@durov
  const fromQuery = SearchIndexingAndQueryCacheGovernor.parseSearchDirectives('from:@durov');
  assert.strictEqual(fromQuery.isStructured, true);
  assert.strictEqual(fromQuery.filterType, 'user');
  assert.strictEqual(idQuery.filterValue, '777888');

  // General text
  const generalQuery = SearchIndexingAndQueryCacheGovernor.parseSearchDirectives('Hello world');
  assert.strictEqual(generalQuery.isStructured, false);
  assert.strictEqual(generalQuery.filterType, 'general');
  console.log('  ✅ Structured query directive parsing verified');
}

// 4. Emoji Autocomplete Matching (tdesktop #627, tweb #473)
{
  console.log('  Testing emoji autocomplete shortcodes...');
  const matches = SearchIndexingAndQueryCacheGovernor.autocompleteEmoji(':sm');
  assert.ok(matches.length >= 1);
  assert.strictEqual(matches[0].emoji, '😀');
  assert.strictEqual(matches[0].shortcode, ':smile:');

  const fireMatches = SearchIndexingAndQueryCacheGovernor.autocompleteEmoji(':fi');
  assert.ok(fireMatches.length >= 1);
  assert.strictEqual(fireMatches[0].emoji, '🔥');

  // Non-shortcode token
  const noMatches = SearchIndexingAndQueryCacheGovernor.autocompleteEmoji('hello');
  assert.strictEqual(noMatches.length, 0);
  console.log('  ✅ Emoji autocomplete verified');
}

// 5. Query Cache & Expiry (TDesktop-x64 #72)
{
  console.log('  Testing query cache and TTL invalidation...');
  const governor = new SearchIndexingAndQueryCacheGovernor();
  const mockResults = [{ id: 1, title: 'Result A' }, { id: 2, title: 'Result B' }];

  const t0 = 1000000;
  governor.setCachedResults('test_query', mockResults, t0);

  // Cache hit within 60s
  const hit = governor.getCachedResults('test_query', t0 + 30000);
  assert.deepStrictEqual(hit, mockResults);

  // Cache miss / expired after 65s
  const expired = governor.getCachedResults('test_query', t0 + 65000);
  assert.strictEqual(expired, null);
  console.log('  ✅ Query cache and TTL verified');
}

console.log('✨ All Phase 49 Verification Tests Passed 100% Successfully!');
