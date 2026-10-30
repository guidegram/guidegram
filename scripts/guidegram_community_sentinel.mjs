// scripts/guidegram_community_sentinel.mjs
// 🛰️ Guidegram Live Community Sentinel & Competitor Radar
// WebSocket + HTTP Live Surveillance Daemon running every 15 minutes

import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'community_sentinel_state.json');
const LOG_FILE = path.join(DATA_DIR, 'sentinel.log');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Logging helper
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch {}
}

// Persistent state
let state = {
  startedAt: new Date().toISOString(),
  lastScanAt: null,
  totalScans: 0,
  seenItems: {}, // id -> timestamp
  discoveries: [],
  competitorMentions: []
};

if (fs.existsSync(STATE_FILE)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    state = { ...state, ...loaded };
  } catch (err) {
    log(`Warning: Failed to load previous state, starting fresh: ${err.message}`);
  }
}

function saveState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    log(`Error saving state: ${err.message}`);
  }
}

// Competitors Dictionary & Analysis Map
const COMPETITORS = {
  ayugram: {
    name: 'AyuGram',
    type: 'Ghost / Anti-Delete Client (C++ tdesktop fork)',
    pros: 'Ghost mode (invisible read), local deleted message viewing',
    guidegramEdge: 'Guidegram has isolated per-account proxies (SOCKS5/MTProto), modern vertical dock for 50+ accounts without 3-account ceiling, 28+ workstation presets, direct bot token login, and pure portable ./data storage.'
  },
  '64gram': {
    name: '64Gram',
    type: 'Performance Desktop Fork',
    pros: 'Multi-threaded downloads, enhanced file sending',
    guidegramEdge: 'Guidegram offers multi-worker downloads plus per-account network/proxy isolation, environment spoofing, and group analytics.'
  },
  kotatogram: {
    name: 'Kotatogram',
    type: 'Customization Desktop Fork',
    pros: 'Custom folder colors, detailed chat list',
    guidegramEdge: 'Guidegram eliminates the 3-account ceiling natively, has independent proxy per account, and true registry-free portability.'
  },
  unigram: {
    name: 'Unigram',
    type: 'Windows UWP Client',
    pros: 'Windows fluent UI',
    guidegramEdge: 'Guidegram is truly portable (runs off USB drive), does not store in AppData, and supports per-account proxies.'
  },
  nicegram: {
    name: 'Nicegram / Nekogram',
    type: 'Mobile Multi-Account & Crypto',
    pros: 'Mobile multiactions',
    guidegramEdge: 'Guidegram is designed as a desktop workstation power-tool for managing tens or hundreds of desktop identities.'
  }
};

// Connected WebSocket Clients
const wsClients = new Set();

function broadcast(event, payload) {
  const msg = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  for (const client of wsClients) {
    try {
      sendWsFrame(client, msg);
    } catch {
      wsClients.delete(client);
    }
  }
}

function sendWsFrame(socket, text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let header;

  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len <= 0xffff) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }

  socket.write(Buffer.concat([header, payload]));
}

// Native Node.js WebSocket + HTTP Server
const PORT = process.env.SENTINEL_PORT || 8999;
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/api/status' || req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'active',
      startedAt: state.startedAt,
      lastScanAt: state.lastScanAt,
      totalScans: state.totalScans,
      activeWsClients: wsClients.size,
      recentDiscoveriesCount: state.discoveries.length,
      competitorMentionsCount: state.competitorMentions.length,
      competitorsMonitored: Object.keys(COMPETITORS),
      recentDiscoveries: state.discoveries.slice(-5).reverse(),
      recentCompetitorMentions: state.competitorMentions.slice(-5).reverse()
    }, null, 2));
    return;
  }

  if (req.url === '/api/scan' && req.method === 'POST') {
    runSurveillanceCycle().then(result => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, newItems: result }));
    });
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Guidegram Sentinel Radar</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; }
          .card { background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #334155; }
          h1, h2 { color: #38bdf8; margin-top: 0; }
          .badge { background: #0284c7; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold; }
          .pill { background: #334155; padding: 4px 10px; border-radius: 20px; font-size: 13px; display: inline-block; margin: 4px 2px; }
          pre { background: #020617; padding: 12px; border-radius: 8px; overflow-x: auto; color: #a5f3fc; }
        </style>
      </head>
      <body>
        <h1>🛰️ Guidegram Live Community Sentinel</h1>
        <div class="card">
          <h2>Radar Status: <span class="badge">ACTIVE (15-Min Interval)</span></h2>
          <p>WebSocket endpoint: <code>ws://localhost:${PORT}</code> | Connected clients: <b>${wsClients.size}</b></p>
          <p>Total Scans: <b>${state.totalScans}</b> | Last Scan: <b>${state.lastScanAt || 'Pending'}</b></p>
          <div>
            <b>Monitored Competitors:</b>
            ${Object.keys(COMPETITORS).map(c => `<span class="pill">${COMPETITORS[c].name}</span>`).join('')}
          </div>
        </div>
        <div class="card">
          <h2>Latest Discoveries (${state.discoveries.length})</h2>
          <pre>${JSON.stringify(state.discoveries.slice(-5).reverse(), null, 2)}</pre>
        </div>
      </body>
    </html>
  `);
});

// WebSocket upgrade handler
server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const hash = crypto.createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${hash}\r\n\r\n`
  );

  wsClients.add(socket);
  log(`📡 New WebSocket client connected. Total clients: ${wsClients.size}`);

  sendWsFrame(socket, JSON.stringify({
    event: 'welcome',
    message: 'Connected to Guidegram Live Community Sentinel WebSocket',
    monitoredCompetitors: Object.keys(COMPETITORS),
    stats: {
      totalScans: state.totalScans,
      discoveriesCount: state.discoveries.length
    }
  }));

  socket.on('close', () => {
    wsClients.delete(socket);
    log(`WebSocket client disconnected. Remaining: ${wsClients.size}`);
  });

  socket.on('error', () => {
    wsClients.delete(socket);
  });
});

// Core Surveillance Scanner
async function fetchJson(url, customHeaders = {}) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GuidegramSentinel/1.0',
        ...customHeaders
      },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    log(`Fetch error for ${url}: ${err.message}`);
    return null;
  }
}

function analyzeTextForStrategy(title, body) {
  const fullText = (title + ' ' + (body || '')).toLowerCase();
  const matchedCompetitors = [];

  for (const [key, comp] of Object.entries(COMPETITORS)) {
    if (fullText.includes(key) || fullText.includes(comp.name.toLowerCase())) {
      matchedCompetitors.push(comp);
    }
  }

  // Detect Opportunities
  let opportunity = null;
  let suggestedAngle = null;

  if (fullText.includes('multi account') || fullText.includes('multiple account') || fullText.includes('3 account') || fullText.includes('limit')) {
    opportunity = 'multi_account_ceiling';
    suggestedAngle = 'Highlight Guidegram eliminating the 3-account limit (run 10+ accounts free without Telegram Premium) with fluid vertical dock & keyboard switching.';
  } else if (fullText.includes('proxy') || fullText.includes('socks5') || fullText.includes('mtproto proxy') || fullText.includes('block') || fullText.includes('vpn')) {
    opportunity = 'dedicated_proxy_isolation';
    suggestedAngle = 'Highlight Guidegram dedicated per-account proxy assignment (SOCKS5/HTTP/MTProto) ensuring accounts never share IP addresses.';
  } else if (fullText.includes('deleted') || fullText.includes('anti-delete') || fullText.includes('ghost') || fullText.includes('edit history')) {
    opportunity = 'anti_delete_history';
    suggestedAngle = 'Highlight Guidegram local audit shield trapping message deletion/edit events on disk without cloud sync loss.';
  } else if (fullText.includes('portable') || fullText.includes('usb') || fullText.includes('registry') || fullText.includes('cache disappeared')) {
    opportunity = 'true_portability';
    suggestedAngle = 'Highlight Guidegram 100% portable single-directory footprint (all sessions in ./data, zero registry pollution).';
  } else if (matchedCompetitors.length > 0) {
    opportunity = 'competitor_comparison';
    suggestedAngle = `Highlight Guidegram advantages over ${matchedCompetitors.map(c => c.name).join(', ')}: dedicated per-account proxies, React 19 UI, and direct BotFather token login.`;
  }

  return {
    matchedCompetitors,
    opportunity,
    suggestedAngle
  };
}

async function runSurveillanceCycle() {
  log(`🔍 Starting surveillance cycle #${state.totalScans + 1}...`);
  state.totalScans++;
  state.lastScanAt = new Date().toISOString();

  const newDiscoveries = [];

  // 1. Scan Reddit subreddits
  const subreddits = ['Telegram', 'AyuGram', 'SideProject', 'selfhosted'];
  for (const sub of subreddits) {
    const data = await fetchJson(`https://www.reddit.com/r/${sub}/new.json?limit=10`);
    if (data && data.data && Array.isArray(data.data.children)) {
      for (const item of data.data.children) {
        const post = item.data;
        if (!post || state.seenItems[post.id]) continue;
        state.seenItems[post.id] = Date.now();

        const analysis = analyzeTextForStrategy(post.title, post.selftext);
        if (analysis.opportunity || analysis.matchedCompetitors.length > 0) {
          const discovery = {
            id: `reddit_${post.id}`,
            platform: 'reddit',
            subreddit: sub,
            title: post.title,
            author: post.author,
            url: `https://www.reddit.com${post.permalink}`,
            opportunity: analysis.opportunity,
            suggestedAngle: analysis.suggestedAngle,
            matchedCompetitors: analysis.matchedCompetitors.map(c => c.name),
            timestamp: new Date().toISOString()
          };

          newDiscoveries.push(discovery);
          state.discoveries.push(discovery);

          if (analysis.matchedCompetitors.length > 0) {
            state.competitorMentions.push(discovery);
          }

          log(`🎯 Found relevant thread on r/${sub}: "${post.title.slice(0, 60)}..." [Opp: ${analysis.opportunity || 'Competitor'}]`);
          broadcast('new_lead', discovery);
        }
      }
    }
  }

  // 2. Scan Hacker News via Algolia API
  const hnData = await fetchJson('https://hn.algolia.com/api/v1/search_by_date?query=telegram&tags=(story,comment)&hitsPerPage=10');
  if (hnData && Array.isArray(hnData.hits)) {
    for (const hit of hnData.hits) {
      if (!hit.objectID || state.seenItems[hit.objectID]) continue;
      state.seenItems[hit.objectID] = Date.now();

      const title = hit.title || hit.story_title || (hit.comment_text ? hit.comment_text.slice(0, 100) : 'HN Comment');
      const text = hit.comment_text || hit.story_text || '';
      const analysis = analyzeTextForStrategy(title, text);

      if (analysis.opportunity || analysis.matchedCompetitors.length > 0) {
        const discovery = {
          id: `hn_${hit.objectID}`,
          platform: 'hackernews',
          title: title,
          author: hit.author,
          url: hit.story_id ? `https://news.ycombinator.com/item?id=${hit.story_id}` : `https://news.ycombinator.com/item?id=${hit.objectID}`,
          opportunity: analysis.opportunity,
          suggestedAngle: analysis.suggestedAngle,
          matchedCompetitors: analysis.matchedCompetitors.map(c => c.name),
          timestamp: new Date().toISOString()
        };

        newDiscoveries.push(discovery);
        state.discoveries.push(discovery);

        if (analysis.matchedCompetitors.length > 0) {
          state.competitorMentions.push(discovery);
        }

        log(`🎯 Found relevant HN thread: "${title.slice(0, 60)}..."`);
        broadcast('new_lead', discovery);
      }
    }
  }

  // Keep discoveries array trimmed to last 200 items
  if (state.discoveries.length > 200) {
    state.discoveries = state.discoveries.slice(-200);
  }
  if (state.competitorMentions.length > 100) {
    state.competitorMentions = state.competitorMentions.slice(-100);
  }

  saveState();
  broadcast('scan_completed', {
    totalScans: state.totalScans,
    newItemsCount: newDiscoveries.length,
    timestamp: state.lastScanAt
  });

  log(`✅ Surveillance cycle #${state.totalScans} finished. New opportunities: ${newDiscoveries.length}`);
  return newDiscoveries;
}

// Start Server & Scheduler
server.listen(PORT, '127.0.0.1', () => {
  log(`🚀 Guidegram Live Community Sentinel running on http://127.0.0.1:${PORT} (WS on ws://127.0.0.1:${PORT})`);
  log(`⏱️ Schedule: Running surveillance every 15 minutes (900,000ms)...`);

  // Initial immediate scan
  runSurveillanceCycle().catch(err => log(`Initial scan error: ${err.message}`));

  // 15-minute periodic interval
  setInterval(() => {
    runSurveillanceCycle().catch(err => log(`Scheduled scan error: ${err.message}`));
  }, 15 * 60 * 1000);
});

// Graceful exit
process.on('SIGINT', () => {
  log('Shutting down Sentinel...');
  saveState();
  process.exit(0);
});
process.on('SIGTERM', () => {
  log('Terminating Sentinel...');
  saveState();
  process.exit(0);
});
