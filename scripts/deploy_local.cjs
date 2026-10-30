const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const srcAsar = path.resolve('release/win-unpacked/resources/app.asar');
const destAsar = 'D:\\Guidegram\\resources\\app.asar';
const destDir = 'D:\\Guidegram\\resources';

console.log('Source asar:', srcAsar, 'size:', fs.statSync(srcAsar).size);
console.log('Dest asar:', destAsar);

// Check if running
let isRunning = false;
try {
  const pids = cp.execSync('tasklist /FI "IMAGENAME eq Guidegram.exe"').toString();
  if (pids.includes('Guidegram.exe')) {
    isRunning = true;
    console.log('Guidegram is currently running.');
  }
} catch (e) {}

// Backup existing app.asar if exists
if (fs.existsSync(destAsar)) {
  const bakPath = 'D:\\Guidegram\\resources\\app.asar.bak';
  console.log('Creating backup at:', bakPath);
  try {
    fs.copyFileSync(destAsar, bakPath);
  } catch (e) {
    console.log('Backup notice:', e.message);
  }
}

// Attempt copy
let copied = false;
try {
  fs.copyFileSync(srcAsar, destAsar);
  copied = true;
  console.log('Successfully copied app.asar directly!');
} catch (e) {
  console.log('Direct copy failed with error:', e.message);
  if (isRunning) {
    console.log('Terminating Guidegram.exe to release file lock...');
    try {
      cp.execSync('taskkill /F /IM Guidegram.exe');
      console.log('Guidegram.exe stopped.');
      // Wait 1 second
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
      fs.copyFileSync(srcAsar, destAsar);
      copied = true;
      console.log('Successfully copied app.asar after terminating Guidegram.exe!');
    } catch (killErr) {
      console.error('Failed to terminate and copy:', killErr.message);
    }
  }
}

// Copy unpacked if present
const srcUnpacked = path.resolve('release/win-unpacked/resources/app.asar.unpacked');
const destUnpacked = 'D:\\Guidegram\\resources\\app.asar.unpacked';
if (fs.existsSync(srcUnpacked)) {
  console.log('Syncing app.asar.unpacked...');
  try {
    cp.execSync(`xcopy /E /I /Y "${srcUnpacked}" "${destUnpacked}"`);
    console.log('Synced app.asar.unpacked successfully.');
  } catch (e) {
    console.warn('xcopy notice:', e.message);
  }
}

// Verify deployed asar size & timestamp
const destStat = fs.statSync(destAsar);
console.log('Deployed app.asar size:', destStat.size, 'mtime:', destStat.mtime);

if (copied && isRunning) {
  console.log('Restarting Guidegram.exe...');
  const child = cp.spawn('D:\\Guidegram\\Guidegram.exe', [], {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
  console.log('Guidegram.exe restarted with PID:', child.pid);
}

console.log('Deployment complete!');
