import assert from 'node:assert';
import { WebDevServerServiceWorkerPhishingAndDateTimeGovernor } from '../src/services/webDevServerServiceWorkerPhishingAndDateTimeGovernor.ts';

console.log('=== Phase 137 Verification: Web Dev Server, Service Worker & Anti-Phishing Governor ===');

const governor = new WebDevServerServiceWorkerPhishingAndDateTimeGovernor();

// Test 1: Vite Network IP Host Binding & HMR Port (#466)
{
  const viteConfig = governor.generateViteNetworkConfig('192.168.1.100', 3000);
  assert.strictEqual(viteConfig.host, '0.0.0.0');
  assert.strictEqual(viteConfig.port, 3000);
  assert.strictEqual(viteConfig.cors, true);
  assert.strictEqual(viteConfig.hmrHost, '192.168.1.100');
  console.log('Test 1 Passed: Vite dev server 0.0.0.0 binding and HMR host config verified.');
}

// Test 2: Service Worker Controllerless Direct Fallback (#462)
{
  // Simulated SW without controller (e.g. Incognito or un-controlled initial load)
  const fallback = governor.resolveServiceWorkerTransport(false, true);
  assert.strictEqual(fallback.hasActiveController, false);
  assert.strictEqual(fallback.transportMode, 'direct_main_thread_worker');
  assert.ok(fallback.fallbackReason?.includes('Direct Dedicated WebWorker'));

  // Normal active SW controller
  const active = governor.resolveServiceWorkerTransport(true, true);
  assert.strictEqual(active.transportMode, 'service_worker_proxy');
  console.log('Test 2 Passed: Service Worker controllerless fallback verified.');
}

// Test 3: Anti-Phishing Domain & Unauthorized Iframe Embed Prevention (#366)
{
  // Official origin, not framed
  const safe = governor.evaluateAntiPhishing('web.guidegram.io', false);
  assert.strictEqual(safe.isOriginSafe, true);
  assert.strictEqual(safe.alertRequired, false);

  // Phishing clone domain
  const phish = governor.evaluateAntiPhishing('guidegram-login-steal.com', false);
  assert.strictEqual(phish.isOriginSafe, false);
  assert.strictEqual(phish.alertRequired, true);
  assert.ok(phish.blockedActionReason?.includes('Untrusted deployment domain'));

  // Official domain but framed inside unauthorized iframe
  const framed = governor.evaluateAntiPhishing('web.guidegram.io', true);
  assert.strictEqual(framed.isIframeEmbedded, true);
  assert.strictEqual(framed.alertRequired, true);
  assert.ok(framed.blockedActionReason?.includes('unauthorized third-party iframe is prohibited'));
  console.log('Test 3 Passed: Anti-phishing domain and iframe embed detection verified.');
}

// Test 4: Customizable Date/Time Formats (DD/MM/YYYY vs YYYY-MM-DD) (#199)
{
  // 2026-05-15 14:30 UTC
  const testTime = Date.UTC(2026, 4, 15, 14, 30, 0);

  const formatDdMm = governor.formatDateTime(testTime, {
    datePattern: 'DD/MM/YYYY',
    use24HourFormat: true
  });
  assert.strictEqual(formatDdMm.formattedDate, '15/05/2026');
  assert.strictEqual(formatDdMm.formattedTime, '14:30');
  assert.strictEqual(formatDdMm.fullString, '15/05/2026 14:30');

  const formatIso12h = governor.formatDateTime(testTime, {
    datePattern: 'YYYY-MM-DD',
    use24HourFormat: false
  });
  assert.strictEqual(formatIso12h.formattedDate, '2026-05-15');
  assert.strictEqual(formatIso12h.formattedTime, '2:30 PM');
  console.log('Test 4 Passed: Customizable date/time patterns (DD/MM/YYYY and 12h/24h) verified.');
}

// Test 5: Date Pattern MM/DD/YYYY
{
  const testTime = Date.UTC(2026, 11, 25, 9, 5, 0);
  const formatted = governor.formatDateTime(testTime, {
    datePattern: 'MM/DD/YYYY',
    use24HourFormat: true
  });
  assert.strictEqual(formatted.formattedDate, '12/25/2026');
  assert.strictEqual(formatted.formattedTime, '09:05');
  console.log('Test 5 Passed: MM/DD/YYYY date pattern formatting verified.');
}

// Test 6: Cross-Platform Build Scripts (#241, #249, #203)
{
  const scripts = governor.generateCrossPlatformScripts();
  assert.ok(scripts.dev.includes('--host 0.0.0.0'));
  assert.ok(scripts.build.includes('--max-old-space-size=4096'));
  console.log('Test 6 Passed: Cross-platform npm scripts verified.');
}

// Test 7: Localhost Safe Origin Verification
{
  const localhostSafe = governor.evaluateAntiPhishing('localhost', false);
  assert.strictEqual(localhostSafe.isOriginSafe, true);
  assert.strictEqual(localhostSafe.alertRequired, false);
  console.log('Test 7 Passed: Localhost development origin verified.');
}

console.log('=== ALL PHASE 137 TESTS PASSED (100% HEALTH) ===');
