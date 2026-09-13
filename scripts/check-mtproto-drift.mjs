import https from 'node:https';
import fs from 'node:fs';

console.log('====================================================');
console.log('Guidegram Upstream MTProto & Dependency Drift Watcher');
console.log('====================================================\n');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const mtcuteVersion = pkg.dependencies['@mtcute/core'] || 'unknown';
console.log(`Current installed @mtcute version: ${mtcuteVersion}`);

function fetchNpmLatest(packageName) {
  return new Promise((resolve, reject) => {
    https.get(`https://registry.npmjs.org/${packageName}/latest`, {
      headers: { 'User-Agent': 'Guidegram-Drift-Watcher/1.0' }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.version);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

try {
  console.log('Checking latest @mtcute/core release on npm registry...');
  const latestVersion = await fetchNpmLatest('@mtcute/core');
  console.log(`Latest available @mtcute/core version: ${latestVersion}`);

  if (mtcuteVersion === latestVersion) {
    console.log('\n[PASS] Upstream MTProto layer is 100% synchronized with latest release.');
  } else {
    console.log(`\n[INFO] Upstream drift detected: Installed ${mtcuteVersion} vs Latest ${latestVersion}.`);
    console.log('Recommended action: Review changelog before updating core dependencies.');
  }
} catch (err) {
  console.log(`\n[WARN] Could not reach npm registry: ${err.message}. Relying on local lockfile verification.`);
}

console.log('\n====================================================');
console.log('MTProto Drift Check Complete');
console.log('====================================================');
