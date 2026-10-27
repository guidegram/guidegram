import https from 'https'

const GITHUB_TOKEN = 'process.env.GITHUB_TOKEN || '''
const REPO_OWNER = 'guidegram'
const REPO_NAME = 'guidegram.github.io'

const pageHtml = `<!DOCTYPE html>
<html lang="en" dir="ltr" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Guidegram — The Sovereign Power-User Telegram Client</title>
  <link rel="icon" href="https://raw.githubusercontent.com/guidegram/guidegram/main/src/assets/logo.png" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            dark: {
              950: '#07090e',
              900: '#0c1017',
              850: '#121722',
              800: '#182030',
            },
            emerald: {
              400: '#34d399',
              500: '#10b981',
              600: '#059669',
            },
            cyan: {
              400: '#22d3ee',
              500: '#06b6d4',
            }
          }
        }
      }
    }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Vazirmatn:wght@400;500;600;700;800;900&family=Noto+Sans+SC:wght@400;600;700&family=Noto+Sans+Arabic:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #07090e;
      color: #f3f4f6;
    }
    [dir="rtl"] {
      font-family: 'Vazirmatn', 'Noto Sans Arabic', Tahoma, sans-serif;
    }
    .glow-radial {
      background: radial-gradient(circle at 50% 20%, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.08) 35%, transparent 70%);
    }
    .glass-card {
      background: rgba(14, 20, 31, 0.75);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.07);
    }
    .glass-card:hover {
      border-color: rgba(16, 185, 129, 0.4);
      transform: translateY(-3px);
      box-shadow: 0 15px 35px -10px rgba(16, 185, 129, 0.2);
    }
    .glow-badge {
      box-shadow: 0 0 25px -4px rgba(16, 185, 129, 0.4);
    }
    /* Screenshot placeholder styling */
    .screenshot-frame {
      background: linear-gradient(145deg, rgba(20, 27, 42, 0.9), rgba(12, 17, 27, 0.95));
      border: 1px solid rgba(255, 255, 255, 0.08);
      position: relative;
      overflow: hidden;
    }
    .screenshot-frame::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, transparent 60%, rgba(7, 9, 14, 0.8) 100%);
      pointer-events: none;
    }
  </style>
</head>
<body class="min-h-screen flex flex-col selection:bg-emerald-500 selection:text-black">

  <!-- Top Sticky Navigation -->
  <header class="w-full border-b border-white/5 bg-dark-950/85 backdrop-blur-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      <!-- Brand Logo -->
      <a href="#" class="flex items-center gap-3 group">
        <div class="w-10 h-10 rounded-xl overflow-hidden shadow-md border border-emerald-500/30 flex items-center justify-center bg-dark-900 group-hover:scale-105 transition-transform duration-200">
          <img src="https://raw.githubusercontent.com/guidegram/guidegram/main/src/assets/logo.png" alt="Guidegram" class="w-full h-full object-cover" />
        </div>
        <div class="flex flex-col">
          <span class="text-lg font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">Guidegram</span>
          <span class="text-[10px] text-gray-400 tracking-wider font-mono">v2.4.2 PRO</span>
        </div>
      </a>

      <!-- Right Nav Items & 12-Language Selector -->
      <div class="flex items-center gap-3 sm:gap-4">
        <!-- Language Switcher Dropdown -->
        <div class="relative">
          <select id="langSelect" class="bg-dark-900 text-gray-200 text-xs font-semibold py-2 px-3 pr-8 rounded-xl border border-white/10 hover:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-pointer appearance-none">
            <option value="fa">🇮🇷 فارسی (FA)</option>
            <option value="en" selected>🇺🇸 English (EN)</option>
            <option value="ru">🇷🇺 Русский (RU)</option>
            <option value="ar">🇸🇦 العربية (AR)</option>
            <option value="zh">🇨🇳 简体中文 (ZH)</option>
            <option value="es">🇪🇸 Español (ES)</option>
            <option value="de">🇩🇪 Deutsch (DE)</option>
            <option value="fr">🇫🇷 Français (FR)</option>
            <option value="tr">🇹🇷 Türkçe (TR)</option>
            <option value="pt">🇧🇷 Português (PT)</option>
            <option value="it">🇮🇹 Italiano (IT)</option>
            <option value="id">🇮🇩 Bahasa Indonesia (ID)</option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>

        <a href="https://github.com/guidegram/guidegram" target="_blank" class="hidden sm:flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
          <span>GitHub</span>
        </a>

        <a href="#downloads" class="px-4 py-2 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-xl transition-all shadow-md hover:scale-105 active:scale-95" data-i18n="nav_download">
          Download
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="glow-radial relative overflow-hidden pt-16 sm:pt-24 pb-16 px-4 sm:px-6">
    <div class="max-w-5xl mx-auto text-center flex flex-col items-center relative z-10">
      <!-- Badge -->
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6 glow-badge">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span data-i18n="hero_badge">Official v2.4.2 Released • Anti-Delete & MCP Enabled</span>
      </div>

      <!-- Main Headline -->
      <h1 class="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight max-w-4xl mb-6">
        <span data-i18n="hero_title_1">The Sovereign Telegram Client for</span>
        <span class="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent" data-i18n="hero_title_2">Power Users & Developers</span>
      </h1>

      <!-- Subtitle -->
      <p class="text-gray-300 text-sm sm:text-base md:text-lg max-w-2xl mb-8 leading-relaxed" data-i18n="hero_subtitle">
        Anti-Delete message recovery, user profile modification radar, group analytics heatmaps, native AI Model Context Protocol (MCP), and isolated per-account MTProto proxies.
      </p>

      <!-- CTA Buttons -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto mb-14" id="downloads">
        <a href="https://github.com/guidegram/guidegram/releases/latest" class="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-xl flex items-center justify-center gap-2.5 transition-all hover:scale-105 active:scale-95">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          <span data-i18n="btn_download_android">Download for Android (APK)</span>
        </a>
        <a href="https://github.com/guidegram/guidegram/releases/latest" class="px-7 py-3.5 rounded-2xl bg-dark-850 hover:bg-dark-800 text-gray-200 border border-white/10 font-bold text-sm flex items-center justify-center gap-2.5 transition-all hover:scale-105 active:scale-95">
          <svg class="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          <span data-i18n="btn_download_windows">Windows Portable (No-Install)</span>
        </a>
      </div>

      <!-- Hero App Preview Mockup Frame (Slot for future screenshots) -->
      <div class="w-full max-w-4xl rounded-3xl screenshot-frame shadow-2xl p-4 sm:p-6 text-left relative group">
        <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-rose-500/80"></span>
            <span class="w-3 h-3 rounded-full bg-amber-500/80"></span>
            <span class="w-3 h-3 rounded-full bg-emerald-500/80"></span>
            <span class="text-xs font-mono text-gray-400 ml-2">Guidegram Desktop & Mobile Suite</span>
          </div>
          <span class="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20" data-i18n="badge_live">Live Architecture</span>
        </div>
        
        <!-- Interactive Preview Box / Screenshot Placeholder -->
        <div class="aspect-[16/9] w-full bg-dark-950/80 rounded-2xl border border-white/5 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden group-hover:border-emerald-500/30 transition-colors" data-screenshot-placeholder="main-app-overview">
          <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/20">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          </div>
          <h4 class="text-base font-bold text-gray-200 mb-1" data-i18n="hero_mockup_title">Unified Workspace: Multi-Account • Anti-Filter • Analytics</h4>
          <p class="text-xs text-gray-400 max-w-md" data-i18n="hero_mockup_sub">Engineered with high-speed MTProto Layer 229, local SQLite caching, and zero telemetry leaks.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- 8 Superpower Features Grid -->
  <section class="max-w-7xl mx-auto px-4 sm:px-6 py-20">
    <div class="text-center max-w-3xl mx-auto mb-16">
      <h2 class="text-xs font-bold text-emerald-400 tracking-widest uppercase mb-2" data-i18n="feat_section_badge">Elite Capabilities</h2>
      <p class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight" data-i18n="feat_section_title">Engineered Beyond Standard Telegram</p>
      <p class="text-sm text-gray-400 mt-3" data-i18n="feat_section_desc">Discover the strategic tools designed exclusively for power users, community managers, and automation engineers.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      
      <!-- Feature 1: Anti-Delete & Anti-Edit -->
      <div class="p-6 rounded-3xl glass-card transition-all flex flex-col justify-between">
        <div>
          <div class="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-5 border border-rose-500/20">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </div>
          <h3 class="text-lg font-bold text-white mb-2" data-i18n="f1_title">Anti-Delete & Anti-Edit Engine</h3>
          <p class="text-xs text-gray-300 leading-relaxed mb-4" data-i18n="f1_desc">
            Deleted messages remain visible with a distinct badge. View complete edit histories for every message with side-by-side diffs and exact timestamps.
          </p>
        </div>
        <!-- Screenshot Placeholder -->
        <div class="aspect-[16/10] rounded-xl screenshot-frame p-3 flex flex-col justify-end text-[11px] text-gray-400 border border-white/5" data-screenshot-placeholder="anti-delete">
          <span class="text-rose-400 font-mono font-semibold" data-i18n="f1_tag">✓ Deleted Message Preserved</span>
        </div>
      </div>

      <!-- Feature 2: User Change Tracker & Profile Radar -->
      <div class="p-6 rounded-3xl glass-card transition-all flex flex-col justify-between">
        <div>
          <div class="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-5 border border-cyan-500/20">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
          </div>
          <h3 class="text-lg font-bold text-white mb-2" data-i18n="f2_title">User Change Tracker & Radar</h3>
          <p class="text-xs text-gray-300 leading-relaxed mb-4" data-i18n="f2_desc">
            Automated timeline surveillance of your contacts: tracks avatar updates, name modifications, username changes, bio edits, and online/offline sessions.
          </p>
        </div>
        <div class="aspect-[16/10] rounded-xl screenshot-frame p-3 flex flex-col justify-end text-[11px] text-gray-400 border border-white/5" data-screenshot-placeholder="user-radar">
          <span class="text-cyan-400 font-mono font-semibold" data-i18n="f2_tag">✓ Contact Profile Audit Active</span>
        </div>
      </div>

      <!-- Feature 3: Deep Group Intelligence & Heatmaps -->
      <div class="p-6 rounded-3xl glass-card transition-all flex flex-col justify-between">
        <div>
          <div class="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-5 border border-purple-500/20">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
          </div>
          <h3 class="text-lg font-bold text-white mb-2" data-i18n="f3_title">Group Intelligence & Heatmaps</h3>
          <p class="text-xs text-gray-300 leading-relaxed mb-4" data-i18n="f3_desc">
            24-hour activity heatmaps, member contribution rankings, peak conversation hour analysis, admin audit logs, and message volume graphs.
          </p>
        </div>
        <div class="aspect-[16/10] rounded-xl screenshot-frame p-3 flex flex-col justify-end text-[11px] text-gray-400 border border-white/5" data-screenshot-placeholder="group-heatmaps">
          <span class="text-purple-400 font-mono font-semibold" data-i18n="f3_tag">✓ 24h Activity Leaderboard</span>
        </div>
      </div>

      <!-- Feature 4: AI & Model Context Protocol (MCP) -->
      <div class="p-6 rounded-3xl glass-card transition-all flex flex-col justify-between">
        <div>
          <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-5 border border-amber-500/20">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h3 class="text-lg font-bold text-white mb-2" data-i18n="f4_title">AI Model Context Protocol (MCP)</h3>
          <p class="text-xs text-gray-300 leading-relaxed mb-4" data-i18n="f4_desc">
            Directly connect Claude Desktop, Cursor, and AI agents to Telegram. Execute automated message queries, channel broadcasts, and analytics via open MCP standard.
          </p>
        </div>
        <div class="aspect-[16/10] rounded-xl screenshot-frame p-3 flex flex-col justify-end text-[11px] text-gray-400 border border-white/5" data-screenshot-placeholder="mcp-hub">
          <span class="text-amber-400 font-mono font-semibold" data-i18n="f4_tag">✓ MCP Server Running: Port 3000</span>
        </div>
      </div>

      <!-- Feature 5: True Ghost Mode -->
      <div class="p-6 rounded-3xl glass-card transition-all flex flex-col justify-between">
        <div>
          <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-5 border border-indigo-500/20">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"></path></svg>
          </div>
          <h3 class="text-lg font-bold text-white mb-2" data-i18n="f5_title">Invisible Ghost Mode</h3>
          <p class="text-xs text-gray-300 leading-relaxed mb-4" data-i18n="f5_desc">
            Read incoming messages invisibly without sending read receipts (no second checkmark) and suppress "typing..." or "uploading..." statuses.
          </p>
        </div>
        <div class="aspect-[16/10] rounded-xl screenshot-frame p-3 flex flex-col justify-end text-[11px] text-gray-400 border border-white/5" data-screenshot-placeholder="ghost-mode">
          <span class="text-indigo-400 font-mono font-semibold" data-i18n="f5_tag">✓ Invisible Read Receipts Active</span>
        </div>
      </div>

      <!-- Feature 6: Dedicated Per-Account Proxies -->
      <div class="p-6 rounded-3xl glass-card transition-all flex flex-col justify-between">
        <div>
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5 border border-emerald-500/20">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
          <h3 class="text-lg font-bold text-white mb-2" data-i18n="f6_title">Isolated Per-Account Proxies</h3>
          <p class="text-xs text-gray-300 leading-relaxed mb-4" data-i18n="f6_desc">
            Assign dedicated SOCKS5/MTProto tunnels to each account. Includes auto-harvest scanner, health benchmark pingers, and automatic fallback rotation.
          </p>
        </div>
        <div class="aspect-[16/10] rounded-xl screenshot-frame p-3 flex flex-col justify-end text-[11px] text-gray-400 border border-white/5" data-screenshot-placeholder="proxy-hunter">
          <span class="text-emerald-400 font-mono font-semibold" data-i18n="f6_tag">✓ MTProto Auto-Hunter & Healer</span>
        </div>
      </div>

      <!-- Feature 7: Turbo Parallel Downloads -->
      <div class="p-6 rounded-3xl glass-card transition-all flex flex-col justify-between">
        <div>
          <div class="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-5 border border-teal-500/20">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          </div>
          <h3 class="text-lg font-bold text-white mb-2" data-i18n="f7_title">Turbo Parallel Downloads</h3>
          <p class="text-xs text-gray-300 leading-relaxed mb-4" data-i18n="f7_desc">
            Up to 3x faster media download rates. Leverages 4 concurrent MTProto workers to stream and chunk large video files, albums, and archives simultaneously.
          </p>
        </div>
        <div class="aspect-[16/10] rounded-xl screenshot-frame p-3 flex flex-col justify-end text-[11px] text-gray-400 border border-white/5" data-screenshot-placeholder="turbo-download">
          <span class="text-teal-400 font-mono font-semibold" data-i18n="f7_tag">✓ 4x Parallel MTProto Workers</span>
        </div>
      </div>

      <!-- Feature 8: Anti-Ban Hardware Shield & Passcode -->
      <div class="p-6 rounded-3xl glass-card transition-all flex flex-col justify-between">
        <div>
          <div class="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-5 border border-blue-500/20">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h3 class="text-lg font-bold text-white mb-2" data-i18n="f8_title">Hardware Masking & Vault Armor</h3>
          <p class="text-xs text-gray-300 leading-relaxed mb-4" data-i18n="f8_desc">
            Cryptographic device identifier randomization prevents Telegram hardware-level mass bans. Complete local passcode locking with Argon2 key derivation.
          </p>
        </div>
        <div class="aspect-[16/10] rounded-xl screenshot-frame p-3 flex flex-col justify-end text-[11px] text-gray-400 border border-white/5" data-screenshot-placeholder="hardware-vault">
          <span class="text-blue-400 font-mono font-semibold" data-i18n="f8_tag">✓ Hardware Fingerprint Masked</span>
        </div>
      </div>

    </div>
  </section>

  <!-- Technical Specs & Architecture Bar -->
  <section class="max-w-7xl mx-auto px-4 sm:px-6 py-12 border-t border-b border-white/5 bg-dark-900/50">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
      <div>
        <div class="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">229</div>
        <div class="text-xs text-gray-400 mt-1" data-i18n="spec_layer">MTProto Layer</div>
      </div>
      <div>
        <div class="text-2xl sm:text-3xl font-extrabold text-teal-400 font-mono">100+</div>
        <div class="text-xs text-gray-400 mt-1" data-i18n="spec_accounts">Concurrent Accounts</div>
      </div>
      <div>
        <div class="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono">0 ms</div>
        <div class="text-xs text-gray-400 mt-1" data-i18n="spec_telemetry">Zero Telemetry Leaks</div>
      </div>
      <div>
        <div class="text-2xl sm:text-3xl font-extrabold text-purple-400 font-mono">60 FPS</div>
        <div class="text-xs text-gray-400 mt-1" data-i18n="spec_ui">Hardware GPU Accelerated</div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="w-full py-12 border-t border-white/5 bg-dark-950 text-center text-xs text-gray-500">
    <div class="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <span class="font-bold text-gray-300">Guidegram</span>
        <span>—</span>
        <span data-i18n="footer_tag">The Sovereign Telegram Client for Power Users.</span>
      </div>
      <div class="flex items-center gap-6">
        <a href="https://github.com/guidegram/guidegram" target="_blank" class="hover:text-emerald-400 transition-colors">GitHub Repository</a>
        <a href="https://github.com/guidegram/guidegram/releases" target="_blank" class="hover:text-emerald-400 transition-colors">Release Notes</a>
        <a href="https://github.com/guidegram/guidegram/blob/main/LICENSE" target="_blank" class="hover:text-emerald-400 transition-colors">License</a>
      </div>
    </div>
  </footer>

  <!-- 12-Language Dictionary & Live RTL Engine -->
  <script>
    const i18nData = {
      en: {
        dir: 'ltr',
        nav_download: 'Download',
        hero_badge: 'Official v2.4.2 Released • Anti-Delete & MCP Enabled',
        hero_title_1: 'The Sovereign Telegram Client for',
        hero_title_2: 'Power Users & Developers',
        hero_subtitle: 'Anti-Delete message recovery, user profile modification radar, group analytics heatmaps, native AI Model Context Protocol (MCP), and isolated per-account MTProto proxies.',
        btn_download_android: 'Download for Android (APK)',
        btn_download_windows: 'Windows Portable (No-Install)',
        badge_live: 'Live Architecture',
        hero_mockup_title: 'Unified Workspace: Multi-Account • Anti-Filter • Analytics',
        hero_mockup_sub: 'Engineered with high-speed MTProto Layer 229, local SQLite caching, and zero telemetry leaks.',
        feat_section_badge: 'Elite Capabilities',
        feat_section_title: 'Engineered Beyond Standard Telegram',
        feat_section_desc: 'Discover the strategic tools designed exclusively for power users, community managers, and automation engineers.',
        f1_title: 'Anti-Delete & Anti-Edit Engine',
        f1_desc: 'Deleted messages remain visible with a distinct badge. View complete edit histories for every message with side-by-side diffs and exact timestamps.',
        f1_tag: '✓ Deleted Message Preserved',
        f2_title: 'User Change Tracker & Radar',
        f2_desc: 'Automated timeline surveillance of your contacts: tracks avatar updates, name modifications, username changes, bio edits, and online/offline sessions.',
        f2_tag: '✓ Contact Profile Audit Active',
        f3_title: 'Group Intelligence & Heatmaps',
        f3_desc: '24-hour activity heatmaps, member contribution rankings, peak conversation hour analysis, admin audit logs, and message volume graphs.',
        f3_tag: '✓ 24h Activity Leaderboard',
        f4_title: 'AI Model Context Protocol (MCP)',
        f4_desc: 'Directly connect Claude Desktop, Cursor, and AI agents to Telegram. Execute automated message queries, channel broadcasts, and analytics via open MCP standard.',
        f4_tag: '✓ MCP Server Running: Port 3000',
        f5_title: 'Invisible Ghost Mode',
        f5_desc: 'Read incoming messages invisibly without sending read receipts (no second checkmark) and suppress "typing..." or "uploading..." statuses.',
        f5_tag: '✓ Invisible Read Receipts Active',
        f6_title: 'Isolated Per-Account Proxies',
        f6_desc: 'Assign dedicated SOCKS5/MTProto tunnels to each account. Includes auto-harvest scanner, health benchmark pingers, and automatic fallback rotation.',
        f6_tag: '✓ MTProto Auto-Hunter & Healer',
        f7_title: 'Turbo Parallel Downloads',
        f7_desc: 'Up to 3x faster media download rates. Leverages 4 concurrent MTProto workers to stream and chunk large video files, albums, and archives simultaneously.',
        f7_tag: '✓ 4x Parallel MTProto Workers',
        f8_title: 'Hardware Masking & Vault Armor',
        f8_desc: 'Cryptographic device identifier randomization prevents Telegram hardware-level mass bans. Complete local passcode locking with Argon2 key derivation.',
        f8_tag: '✓ Hardware Fingerprint Masked',
        spec_layer: 'MTProto Layer',
        spec_accounts: 'Concurrent Accounts',
        spec_telemetry: 'Zero Telemetry Leaks',
        spec_ui: 'Hardware GPU Accelerated',
        footer_tag: 'The Sovereign Telegram Client for Power Users.'
      },
      fa: {
        dir: 'rtl',
        nav_download: 'دانلود نرم‌افزار',
        hero_badge: 'نسخه رسمی ۲.۴.۲ منتشر شد • مجهز به ضد-حذف و MCP هوش مصنوعی',
        hero_title_1: 'کلاینت مقتدر و فوق‌پیشرفته تلگرام برای',
        hero_title_2: 'کاربران حرفه‌ای و مدیران سیستم',
        hero_subtitle: 'بازیابی پیام‌های حذف‌شده و تاریخچه ادیت‌ها، رادار رهگیری تغییرات مخاطبین، هیت‌مپ‌های آماری گروه‌ها، پروتکل هوش مصنوعی MCP و پروکسی‌های اختصاصی برای هر اکانت.',
        btn_download_android: 'دانلود نسخه اندروید (APK)',
        btn_download_windows: 'نسخه پرتابل ویندوز (بدون نیاز به نصب)',
        badge_live: 'معماری زنده',
        hero_mockup_title: 'فضای کاری یکپارچه: مولتی‌اکانت • ضد فیلتر • آنالیتیکس',
        hero_mockup_sub: 'طراحی شده بر بستر MTProto لایه ۲۲۹ با دیتابیس لوکال SQLite و صفر درصد نشت تله‌متری.',
        feat_section_badge: 'سوپر-قابلیت‌های گایدگرام',
        feat_section_title: 'فراتر از محدودیت‌های تلگرام رسمی',
        feat_section_desc: 'ابزارهای راهبردی اختصاصی برای کاربران حرفه‌ای، مدیران کامیونیتی‌ها و مهندسان اتوماسیون هوش مصنوعی.',
        f1_title: 'موتور ضد-حذف و ضد-ویرایش (Anti-Delete)',
        f1_desc: 'پیام‌های پاک‌شده هرگز غیب نمی‌شوند و با برچسب مشخص باقی می‌مانند! تاریخچه تمام ادیت‌های یک پیام به همراه دیف کلمات و تایم‌استمپ دقیق در دسترس شماست.',
        f1_tag: '✓ پیام حذف‌شده با موفقیت حفظ شد',
        f2_title: 'رادار رهگیری تغییرات کاربران (User Tracker)',
        f2_desc: 'رصد خودکار پروفایل مخاطبین در تایم‌لاین: ثبت فوری تغییر عکس پروفایل، تغییر نام و فامیلی، ویرایش بیو، تغییر آیدی، و لاگ دقیق زمان‌های آنلاین و آفلاین.',
        f2_tag: '✓ رادار آدیت پروفایل فعال است',
        f3_title: 'هوشمندی و هیت‌مپ فعالیت گروه‌ها',
        f3_desc: 'هیت‌مپ‌های حرارتی ۲۴ ساعته ترافیک گفتگوها، لیدربورد فعال‌ترین کاربران، نمودارهای حجم پیام در ساعات اوج و لاگ تمام رخدادهای ادمین‌ها.',
        f3_tag: '✓ لیدربورد ۲۴ ساعته فعالیت فعال است',
        f4_title: 'پروتکل هوش مصنوعی تلگرام (MCP Hub)',
        f4_desc: 'اتصال بومی تلگرام به نرم‌افزارهای Claude Desktop، Cursor و مدل‌های زبانی. استعلام هوشمند پیام‌ها، خلاصه‌سازی کانال‌ها و اتوماسیون با استاندارد MCP.',
        f4_tag: '✓ سرور محلی MCP فعال روی پورت ۳۰۰۰',
        f5_title: 'حالت روح واقعی و نامرئی (Ghost Mode)',
        f5_desc: 'پیام‌های دریافتی را بدون ثبت تیک دوم بخوانید و وضعیت در حال تایپ (Typing...) یا ارسال مدیا را کاملاً از دید دیگران مخفی نگه دارید.',
        f5_tag: '✓ تیک دوم خوانده‌شدن غیرفعال شد',
        f6_title: 'پروکسی‌های ایزوله به ازای هر اکانت',
        f6_desc: 'تخصیص تونل‌های جداگانه SOCKS5 و MTProto به هر حساب کاربری؛ مجهز به موتور شکار خودکار پروکسی (Auto-Harvest)، بنچمارک پینگ و جابجایی خودکار.',
        f6_tag: '✓ شکارچی خودکار پروکسی فعال است',
        f7_title: 'دانلود موازی و پرسرعت توربو (Turbo Download)',
        f7_desc: 'سرعت دانلود و استریم تا ۳ برابر سریع‌تر با ۴ ورکر هم‌زمان MTProto که فایل‌های حجیم ویدیویی و آرشیوها را به صورت قطعه‌های موازی دریافت می‌کنند.',
        f7_tag: '✓ ۴ کانکشن موازی MTProto فعال است',
        f8_title: 'سپر ضد-بن سخت‌افزاری و قفل پس‌کد',
        f8_desc: 'ماسک کردن اثرانگشت سخت‌افزاری برای جلوگیری از بن سراسری اکانت‌ها توسط تلگرام؛ قفل امنیتی نرم‌افزار با الگوریتم مشتق کلید Argon2.',
        f8_tag: '✓ اثرانگشت سخت‌افزاری با موفقیت ماسک شد',
        spec_layer: 'لایه رسمی MTProto',
        spec_accounts: 'اکانت فعال هم‌زمان',
        spec_telemetry: 'نشت حریم خصوصی',
        spec_ui: 'رندرینگ سخت‌افزاری GPU',
        footer_tag: 'کلاینت مقتدر و امن تلگرام برای کاربران حرفه‌ای سراسر جهان.'
      },
      ru: {
        dir: 'ltr',
        nav_download: 'Скачать',
        hero_badge: 'Официальный релиз v2.4.2 • Anti-Delete и MCP включены',
        hero_title_1: 'Суверенный клиент Telegram для',
        hero_title_2: 'Продвинутых пользователей',
        hero_subtitle: 'Восстановление удаленных сообщений, радар изменений профилей пользователей, тепловые карты групп, нативный протокол ИИ MCP и изолированные прокси на аккаунт.',
        btn_download_android: 'Скачать для Android (APK)',
        btn_download_windows: 'Windows Portable (Без установки)',
        badge_live: 'Живая архитектура',
        hero_mockup_title: 'Единая рабочая среда: Мульти-аккаунты • Анти-фильтр • Аналитика',
        hero_mockup_sub: 'Создано на базе MTProto Layer 229, локальной SQLite и без утечек телеметрии.',
        feat_section_badge: 'Элитные возможности',
        feat_section_title: 'За пределами стандартного Telegram',
        feat_section_desc: 'Стратегические инструменты, разработанные для исследователей, администраторов сообществ и инженеров ИИ.',
        f1_title: 'Движок Anti-Delete и Anti-Edit',
        f1_desc: 'Удаленные сообщения остаются на месте с меткой. Просматривайте полную историю правок каждого сообщения с точными временными метками.',
        f1_tag: '✓ Удаленное сообщение сохранено',
        f2_title: 'Радар изменений пользователей',
        f2_desc: 'Автоматическое наблюдение за контактами: отслеживание обновлений аватарок, смены имен, юзернеймов, био и сессий онлайн/офлайн.',
        f2_tag: '✓ Аудит профилей контактов активен',
        f3_title: 'Аналитика групп и тепловые карты',
        f3_desc: '24-часовые тепловые карты активности, рейтинги участников, анализ пиковых часов общения и журнал действий администраторов.',
        f3_tag: '✓ Таблица лидеров за 24ч активна',
        f4_title: 'Протокол ИИ Model Context Protocol (MCP)',
        f4_desc: 'Подключайте Claude Desktop, Cursor и нейросети напрямую к Telegram. Автоматические запросы сообщений и аналитика по стандарту MCP.',
        f4_tag: '✓ MCP сервер запущен: Порт 3000',
        f5_title: 'Невидимый режим призрака (Ghost Mode)',
        f5_desc: 'Читайте входящие сообщения скрытно без отправки отчетов о прочтении (без второй галочки) и скрывайте статус набора текста.',
        f5_tag: '✓ Невидимое чтение активно',
        f6_title: 'Изолированные прокси для аккаунтов',
        f6_desc: 'Назначайте отдельные туннели SOCKS5/MTProto каждому аккаунту. Включает авто-поиск прокси, бенчмарк пинга и умную ротацию.',
        f6_tag: '✓ Авто-охотник MTProto активен',
        f7_title: 'Турбо параллельные загрузки',
        f7_desc: 'Увеличение скорости скачивания до 3 раз. Использование 4 одновременных воркеров MTProto для потоковой передачи больших видео и архивов.',
        f7_tag: '✓ 4x параллельных воркера MTProto',
        f8_title: 'Маскировка железа и защита кодом',
        f8_desc: 'Криптографическая маскировка идентификаторов устройств предотвращает баны железа в Telegram. Локальная блокировка паролем Argon2.',
        f8_tag: '✓ Отпечаток оборудования замаскирован',
        spec_layer: 'Слой MTProto',
        spec_accounts: 'Активных аккаунтов',
        spec_telemetry: 'Утечек телеметрии',
        spec_ui: 'GPU ускорение 60 FPS',
        footer_tag: 'Суверенный клиент Telegram для профессионалов по всему миру.'
      },
      ar: {
        dir: 'rtl',
        nav_download: 'تحميل التطبيق',
        hero_badge: 'الإصدار الرسمي v2.4.2 • يدعم مكافحة الحذف وبروتوكول MCP',
        hero_title_1: 'عميل تيليجرام السيادي الأقوى لـ',
        hero_title_2: 'المحترفين والمطورين',
        hero_subtitle: 'استعادة الرسائل المحذوفة وسجل التعديلات، رادار تتبع تغييرات الملفات الشخصية، الخرائط الحرارية لنشاط المجموعات، وبروكسيات مخصصة لكل حساب.',
        btn_download_android: 'تحميل للأندرويد (APK)',
        btn_download_windows: 'نسخة ويندوز محمولة (بدون تثبيت)',
        badge_live: 'بنية حية',
        hero_mockup_title: 'مساحة عمل موحدة: حسابات متعددة • تجاوز الحجب • تحليلات عميقة',
        hero_mockup_sub: 'مصمم بالكامل على بروتوكول MTProto الطبقة 229 مع قاعدة بيانات SQLite محلية وبدون أي تسريب للبيانات.',
        feat_section_badge: 'قدرات نخبوية',
        feat_section_title: 'أبعد بكثير من التيليجرام الرسمي',
        feat_section_desc: 'اكتشف الأدوات الاستراتيجية المصممة حصرياً للمحترفين ومديري المجتمعات ومهندسي الأتمتة.',
        f1_title: 'محرك مكافحة الحذف والتعديل (Anti-Delete)',
        f1_desc: 'الرسائل المحذوفة لا تختفي أبداً وتظل مرئية بشارة خاصة. شاهد السجل الكامل لجميع تعديلات الرسائل مع الفروقات والتوقيت الدقيق.',
        f1_tag: '✓ تم حفظ الرسالة المحذوفة بنجاح',
        f2_title: 'رادار تتبع تغييرات المستخدمين (User Tracker)',
        f2_desc: 'مراقبة تلقائية لجهات اتصالك: تتبع فوري لتغيير الصورة، الاسم، المعرف، النبذة الشخصية، وأوقات الاتصال والانقطاع بدقة.',
        f2_tag: '✓ رادار التدقيق نشط الآن',
        f3_title: 'ذكاء المجموعات والخرائط الحرارية',
        f3_desc: 'خرائط حرارية على مدار 24 ساعة للنشاط، ترتيب الأعضاء الأكثر تفاعلاً، تحليل أوقات الذروة، وسجل كامل لإجراءات المشرفين.',
        f3_tag: '✓ لوحة صدارة النشاط 24 ساعة نشطة',
        f4_title: 'بروتوكول الذكاء الاصطناعي (MCP Hub)',
        f4_desc: 'ربط مباشر ومحلي بين التيليجرام ونماذج الذكاء الاصطناعي مثل Claude Desktop وCursor لأتمتة الاستعلامات وتحليل القنوات.',
        f4_tag: '✓ خادم MCP يعمل على منفذ 3000',
        f5_title: 'وضع الشبح الخفي الحقيقي (Ghost Mode)',
        f5_desc: 'اقرأ الرسائل الواردة بشكل خفي تام دون إرسال إشعار القراءة (بدون علامة صح ثانية) مع إخفاء حالة جاري الكتابة.',
        f5_tag: '✓ القراءة الخفية مفعلة بالكامل',
        f6_title: 'بروكسيات معزولة لكل حساب على حدة',
        f6_desc: 'تخصيص بروكسي SOCKS5/MTProto خاص بكل حساب؛ يشمل ماسح صيد البروكسيات التلقائي، واختبار سرعة البينج، والتدوير التلقائي.',
        f6_tag: '✓ صائد البروكسيات التلقائي يعمل',
        f7_title: 'تنزيلات تيربو متوازية فائقة السرعة',
        f7_desc: 'سرعة تنزيل أعلى حتى 3 أضعاف باستخدام 4 عمال MTProto متزامنين لتحميل مقاطع الفيديو والملفات الضخمة في أجزاء متوازية.',
        f7_tag: '✓ 4 اتصالات MTProto متوازية نشطة',
        f8_title: 'قناع حماية العتاد وقفل الأمان',
        f8_desc: 'تشفير ومحاكاة المعرفات العتادية لمنع حظر التيليجرام للأجهزة؛ قفل محلي تام لكامل التطبيق برمز مرور بتقنية Argon2.',
        f8_tag: '✓ تم تمويه البصمة العتادية بنجاح',
        spec_layer: 'طبقة MTProto',
        spec_accounts: 'حساب نشط بالتزامن',
        spec_telemetry: 'تسريب للبيانات الشخصية',
        spec_ui: 'تسريع كامل ببطاقة الشاشة',
        footer_tag: 'عميل تيليجرام السيادي للمستخدمين المحترفين حول العالم.'
      },
      zh: {
        dir: 'ltr',
        nav_download: '下载客户端',
        hero_badge: '官方 v2.4.2 发布 • 防撤回与 MCP 人工智能已启用',
        hero_title_1: '专为极客与专业用户打造的',
        hero_title_2: '电报终极客户端',
        hero_subtitle: '防消息撤回与编辑记录、用户资料变更雷达追踪、群组活跃热力图、原生 AI 协议支持以及独立账户专属代理。',
        btn_download_android: '下载 Android 版 (APK)',
        btn_download_windows: 'Windows 免安装便携版',
        badge_live: '实时架构',
        hero_mockup_title: '统一工作台：多账户管理 • 防封锁 • 深度洞察',
        hero_mockup_sub: '基于 MTProto 第 229 层架构构建，本地 SQLite 缓存加速，零隐私泄露。',
        feat_section_badge: '旗舰特性',
        feat_section_title: '突破官方限制的专业利器',
        feat_section_desc: '探索专为高阶极客、社群管理专家与自动化工程师量身定制的战略级工具。',
        f1_title: '防消息撤回与编辑历史追踪',
        f1_desc: '撤回的消息依然可见并带有明显标识。查看每条消息的完整修改历史，支持对比差异并附带精确时间戳。',
        f1_tag: '✓ 撤回消息已成功留存',
        f2_title: '联系人资料变更雷达追踪',
        f2_desc: '全自动追踪联系人时间线：实时记录头像更改、昵称修改、用户名变动、个人简介修改及在线/离线时段。',
        f2_tag: '✓ 联系人审计雷达已就绪',
        f3_title: '深度群组情报与活跃热力图',
        f3_desc: '24小时消息热力分布图、活跃成员贡献排行榜、高峰交流时段精准分析及完整的管理员操作审计日志。',
        f3_tag: '✓ 24小时群活跃看板运行中',
        f4_title: 'AI 模型上下文协议 (MCP)',
        f4_desc: '通过开放 MCP 标准直接将 Claude Desktop、Cursor 和大语言模型与 Telegram 深度互联，实现消息自动化分析。',
        f4_tag: '✓ 本地 MCP 服务端口: 3000',
        f5_title: '真正的无痕幽灵隐身模式',
        f5_desc: '隐身阅读所有来信而不会触发已读双对勾标记，同时彻底隐藏“正在输入...”或“正在发送媒体”的状态。',
        f5_tag: '✓ 已读回执已被彻底拦截',
        f6_title: '独立单账户隔离代理体系',
        f6_desc: '为每个账户独立绑定专属 SOCKS5/MTProto 代理通道。内置自动搜猎器、延迟基准测试与智能故障轮换。',
        f6_tag: '✓ MTProto 自动搜猎器运行中',
        f7_title: '多线程并行极速下载',
        f7_desc: '最高提升3倍媒体下载速率。借助4个并发 MTProto Worker 将大型视频文件与归档分片并发流式传输。',
        f7_tag: '✓ 4路并行 MTProto 线程已连接',
        f8_title: '硬件指纹伪装与保险库锁',
        f8_desc: '设备标识符密码学随机化，彻底杜绝 Telegram 硬件级封禁；采用 Argon2 算法保护的本地密码锁。',
        f8_tag: '✓ 硬件指纹已成功隐匿保护',
        spec_layer: 'MTProto 协议层',
        spec_accounts: '多账户并发在线',
        spec_telemetry: '零遥测泄露保证',
        spec_ui: 'GPU 硬件渲染加速',
        footer_tag: '专为全球极客与高端用户打造的卓越 Telegram 客户端。'
      },
      es: {
        dir: 'ltr',
        nav_download: 'Descargar',
        hero_badge: 'Lanzamiento v2.4.2 • Anti-Eliminación y MCP Activados',
        hero_title_1: 'El Cliente Soberano de Telegram para',
        hero_title_2: 'Usuarios Avanzados y Desarrolladores',
        hero_subtitle: 'Recuperación de mensajes eliminados, radar de cambios de perfil, mapas de calor grupales, protocolo IA MCP y proxies dedicados por cuenta.',
        btn_download_android: 'Descargar para Android (APK)',
        btn_download_windows: 'Windows Portable (Sin Instalación)',
        badge_live: 'Arquitectura en Vivo',
        hero_mockup_title: 'Espacio Unificado: Multi-Cuenta • Anti-Bloqueo • Analítica',
        hero_mockup_sub: 'Desarrollado sobre MTProto Capa 229 con almacenamiento SQLite local y cero fugas de telemetría.',
        feat_section_badge: 'Capacidades de Élite',
        feat_section_title: 'Diseñado Más Allá del Telegram Estándar',
        feat_section_desc: 'Descubra las herramientas estratégicas diseñadas para usuarios avanzados, administradores y desarrolladores.',
        f1_title: 'Motor Anti-Eliminación y Anti-Edición',
        f1_desc: 'Los mensajes eliminados permanecen visibles con una insignia distintiva. Vea historiales completos de edición con marcas de tiempo exactas.',
        f1_tag: '✓ Mensaje eliminado preservado',
        f2_title: 'Rastreador de Cambios de Usuario',
        f2_desc: 'Vigilancia automática de contactos: detecta cambios de foto de perfil, modificaciones de nombre, usuario, biografía y estados en línea.',
        f2_tag: '✓ Auditoría de contactos activa',
        f3_title: 'Inteligencia Grupal y Mapas de Calor',
        f3_desc: 'Mapas de calor de actividad 24h, clasificación de participantes, análisis de horas pico y registro de acciones de administradores.',
        f3_tag: '✓ Tabla de clasificación 24h activa',
        f4_title: 'Protocolo de Contexto IA (MCP)',
        f4_desc: 'Conecte Claude Desktop, Cursor y agentes IA directamente a Telegram mediante el estándar abierto MCP para análisis y automatización.',
        f4_tag: '✓ Servidor MCP activo en puerto 3000',
        f5_title: 'Modo Fantasma Invisible Real',
        f5_desc: 'Lea mensajes entrantes sin emitir confirmación de lectura (sin segundo check) y oculte el estado de "escribiendo...".',
        f5_tag: '✓ Lectura invisible habilitada',
        f6_title: 'Proxies Aislados por Cuenta',
        f6_desc: 'Asigne túneles SOCKS5/MTProto dedicados a cada cuenta. Incluye cazador automático, pruebas de ping y rotación inteligente.',
        f6_tag: '✓ Cazador automático MTProto activo',
        f7_title: 'Descargas Paralelas Turbo',
        f7_desc: 'Descargas hasta 3 veces más rápidas. Utiliza 4 workers concurrentes de MTProto para transmitir y descargar archivos grandes.',
        f7_tag: '✓ 4 workers concurrentes MTProto',
        f8_title: 'Enmascaramiento de Hardware y Candado',
        f8_desc: 'Aleatorización criptográfica de identificadores de hardware para prevenir bloqueos por dispositivo; bloqueo con código Argon2.',
        f8_tag: '✓ Huella de hardware enmascarada',
        spec_layer: 'Capa MTProto',
        spec_accounts: 'Cuentas Concurrentes',
        spec_telemetry: 'Cero Fugas de Datos',
        spec_ui: 'Aceleración GPU 60 FPS',
        footer_tag: 'El cliente soberano de Telegram para usuarios avanzados en todo el mundo.'
      },
      de: {
        dir: 'ltr',
        nav_download: 'Herunterladen',
        hero_badge: 'Offizielles v2.4.2 Release • Anti-Delete & MCP Aktiviert',
        hero_title_1: 'Der Souveräne Telegram-Client für',
        hero_title_2: 'Power-User & Entwickler',
        hero_subtitle: 'Wiederherstellung gelöschter Nachrichten, Profil-Änderungsradar, Gruppen-Heatmaps, natives KI-MCP-Protokoll und isolierte Proxys pro Konto.',
        btn_download_android: 'Für Android herunterladen (APK)',
        btn_download_windows: 'Windows Portable (Ohne Installation)',
        badge_live: 'Live-Architektur',
        hero_mockup_title: 'Einheitlicher Arbeitsbereich: Multi-Account • Anti-Zensur • Analytik',
        hero_mockup_sub: 'Entwickelt mit MTProto Layer 229, lokalem SQLite-Caching und ohne Telemetrie-Lecks.',
        feat_section_badge: 'Elite-Funktionen',
        feat_section_title: 'Weit über den Standard-Telegram hinaus',
        feat_section_desc: 'Entdecken Sie strategische Werkzeuge für Power-User, Community-Manager und KI-Automatisierungsingenieure.',
        f1_title: 'Anti-Delete & Anti-Edit Engine',
        f1_desc: 'Gelöschte Nachrichten bleiben mit einem Badge sichtbar. Vollständiger Änderungsverlauf mit Diff-Vergleichen und Zeitstempeln.',
        f1_tag: '✓ Gelöschte Nachricht erhalten',
        f2_title: 'Benutzer-Änderungsradar & Tracker',
        f2_desc: 'Automatische Überwachung Ihrer Kontakte: Erfasst Avatar-Updates, Namensänderungen, Benutzername, Biografie und Online-Zeiten.',
        f2_tag: '✓ Kontakt-Überwachung aktiv',
        f3_title: 'Gruppen-Intelligenz & Heatmaps',
        f3_desc: '24-Stunden-Aktivitäts-Heatmaps, Mitglieder-Ranglisten, Analyse von Spitzenzeiten und Administrator-Aktionsprotokolle.',
        f3_tag: '✓ 24h-Aktivitäts-Rangliste aktiv',
        f4_title: 'KI Model Context Protocol (MCP)',
        f4_desc: 'Verbinden Sie Claude Desktop, Cursor und KI-Modelle direkt mit Telegram über den offenen MCP-Standard für Automatisierung.',
        f4_tag: '✓ MCP-Server läuft auf Port 3000',
        f5_title: 'Echter Unsichtbarer Geistermodus',
        f5_desc: 'Nachrichten unsichtbar lesen, ohne Lesebestätigungen (kein zweites Häkchen) zu senden, und Tipp-Status unterdrücken.',
        f5_tag: '✓ Unsichtbares Lesen aktiviert',
        f6_title: 'Isolierte Proxys pro Konto',
        f6_desc: 'Dedizierte SOCKS5/MTProto-Tunnel pro Konto mit automatischem Proxy-Jäger, Latenz-Benchmarks und Ausfall-Rotation.',
        f6_tag: '✓ MTProto-Auto-Hunter aktiv',
        f7_title: 'Turbo-Parallele Downloads',
        f7_desc: 'Bis zu 3-mal schnellere Mediendownloads dank 4 parallelen MTProto-Workern für große Videodateien und Archive.',
        f7_tag: '✓ 4 parallele MTProto-Worker',
        f8_title: 'Hardware-Maskierung & Tresor-Schutz',
        f8_desc: 'Kryptografische Hardware-Verschleierung verhindert Gerätesperren; vollständige lokale Passcode-Sperre mit Argon2.',
        f8_tag: '✓ Hardware-Fingerabdruck maskiert',
        spec_layer: 'MTProto Schicht',
        spec_accounts: 'Parallele Konten',
        spec_telemetry: 'Keine Telemetrie-Lecks',
        spec_ui: 'GPU-Hardware-Beschleunigt',
        footer_tag: 'Der souveräne Telegram-Client für Power-User weltweit.'
      },
      fr: {
        dir: 'ltr',
        nav_download: 'Télécharger',
        hero_badge: 'Version Officielle v2.4.2 • Anti-Suppression & MCP Activés',
        hero_title_1: 'Le Client Telegram Souverain pour les',
        hero_title_2: 'Utilisateurs Avancés & Développeurs',
        hero_subtitle: 'Récupération des messages supprimés, radar de profil, cartes thermiques de groupe, protocole IA MCP et proxys dédiés par compte.',
        btn_download_android: 'Télécharger pour Android (APK)',
        btn_download_windows: 'Windows Portable (Sans Installation)',
        badge_live: 'Architecture en Direct',
        hero_mockup_title: 'Espace Unifié : Multi-Comptes • Anti-Censure • Analytique',
        hero_mockup_sub: 'Développé avec MTProto Couche 229, cache SQLite local et zéro fuite de télémétrie.',
        feat_section_badge: 'Capacités d\\'Élite',
        feat_section_title: 'Conçu au-delà du Telegram Standard',
        feat_section_desc: 'Outils stratégiques conçus pour les utilisateurs avancés, gestionnaires de communautés et ingénieurs IA.',
        f1_title: 'Moteur Anti-Suppression & Anti-Édition',
        f1_desc: 'Les messages supprimés restent visibles avec un badge. Historique complet des modifications avec horodatage précis.',
        f1_tag: '✓ Message supprimé conservé',
        f2_title: 'Radar de Surveillance des Profils',
        f2_desc: 'Surveillance automatique des contacts : suivi des changements d\\'avatar, de nom, de nom d\\'utilisateur, de bio et de présence.',
        f2_tag: '✓ Audit des contacts actif',
        f3_title: 'Intelligence de Groupe & Cartes Thermiques',
        f3_desc: 'Cartes thermiques d\\'activité 24h, classement des membres les plus actifs, analyse des heures de pointe et logs administrateur.',
        f3_tag: '✓ Classement 24h en direct',
        f4_title: 'Protocole de Contexte IA (MCP)',
        f4_desc: 'Connectez Claude Desktop, Cursor et les modèles IA à Telegram via le standard ouvert MCP pour l\\'automatisation avancée.',
        f4_tag: '✓ Serveur MCP actif sur le port 3000',
        f5_title: 'Véritable Mode Fantôme Invisible',
        f5_desc: 'Lisez les messages sans confirmation de lecture (aucun second check) et masquez l\\'indicateur d\\'écriture.',
        f5_tag: '✓ Lecture invisible activée',
        f6_title: 'Proxys Dédiés et Isolés par Compte',
        f6_desc: 'Tunnels SOCKS5/MTProto individuels par compte, avec recherche automatique de proxys, tests de ping et rotation automatique.',
        f6_tag: '✓ Chasseur MTProto actif',
        f7_title: 'Téléchargements Parallèles Turbo',
        f7_desc: 'Téléchargements jusqu\\'à 3 fois plus rapides grâce à 4 workers MTProto simultanés pour les fichiers vidéo volumineux.',
        f7_tag: '✓ 4 workers MTProto en parallèle',
        f8_title: 'Masquage Matériel & Coffre Fort',
        f8_desc: 'Masquage cryptographique des identifiants matériels pour contrer les bannissements; verrouillage par code avec Argon2.',
        f8_tag: '✓ Empreinte matérielle masquée',
        spec_layer: 'Couche MTProto',
        spec_accounts: 'Comptes Parallèles',
        spec_telemetry: 'Zéro Fuite de Données',
        spec_ui: 'Accélération GPU 60 FPS',
        footer_tag: 'Le client Telegram souverain pour les utilisateurs exigeants du monde entier.'
      },
      tr: {
        dir: 'ltr',
        nav_download: 'İndir',
        hero_badge: 'Resmi v2.4.2 Sürümü • Silinmeyi Önleme & MCP Aktif',
        hero_title_1: 'Güçlü Kullanıcılar ve Geliştiriciler İçin',
        hero_title_2: 'En İleri Düzey Telegram İstemcisi',
        hero_subtitle: 'Silinen mesajları kurtarma, kullanıcı değişiklik radarı, grup aktivite ısı haritaları, yerel Yapay Zeka MCP protokolü ve hesap başına özel proxy.',
        btn_download_android: 'Android İçin İndir (APK)',
        btn_download_windows: 'Windows Taşınabilir (Kurulumsuz)',
        badge_live: 'Canlı Mimari',
        hero_mockup_title: 'Birleşik Çalışma Alanı: Çoklu Hesap • Anti-Sansür • Analitik',
        hero_mockup_sub: 'MTProto Katman 229 ile geliştirildi, yerel SQLite önbelleği ve sıfır telemetri sızıntısı.',
        feat_section_badge: 'Üstün Yetenekler',
        feat_section_title: 'Standart Telegram Sınırlarının Çok Ötesinde',
        feat_section_desc: 'Güçlü kullanıcılar, topluluk yöneticileri ve otomasyon mühendisleri için özel araçlar.',
        f1_title: 'Anti-Delete & Anti-Edit Motoru',
        f1_desc: 'Silinen mesajlar özel rozetle yerinde kalır. Her mesajın tüm düzenleme geçmişini kesin zaman damgalarıyla inceleyin.',
        f1_tag: '✓ Silinen Mesaj Korundu',
        f2_title: 'Kullanıcı Değişiklik Radarı',
        f2_desc: 'Kişilerinizin profil değişikliklerini otomatik takip edin: profil fotoğrafı, isim, kullanıcı adı, biyografi ve çevrimiçi saatleri.',
        f2_tag: '✓ Kişi Denetim Radarı Aktif',
        f3_title: 'Grup Zekası & Aktivite Isı Haritaları',
        f3_desc: '24 saatlik aktivite ısı haritaları, en aktif üyeler sıralaması, yoğun saat analizi ve yönetici işlem günlükleri.',
        f3_tag: '✓ 24 Saatlik Lider Tablosu Aktif',
        f4_title: 'Yapay Zeka Model Context Protocol (MCP)',
        f4_desc: 'Claude Desktop, Cursor ve yapay zeka modellerini doğrudan Telegram\\'a bağlayın. Açık standartla mesaj analizini otomatikleştirin.',
        f4_tag: '✓ MCP Sunucusu Aktif: Port 3000',
        f5_title: 'Gerçek Görünmez Hayalet Modu',
        f5_desc: 'Gelen mesajları okundu bilgisi göndermeden (ikinci tik olmadan) gizlice okuyun ve "yazıyor..." bildirimini gizleyin.',
        f5_tag: '✓ Görünmez Okuma Aktif',
        f6_title: 'Hesap Başına İzole Edilmiş Proxy',
        f6_desc: 'Her hesaba özel SOCKS5/MTProto tüneli atayın. Otomatik proxy avcısı, ping kıyaslama ve kesintisiz yedekleme içerir.',
        f6_tag: '✓ MTProto Otomatik Avcı Aktif',
        f7_title: 'Turbo Paralel İndirmeler',
        f7_desc: '3 kata kadar daha hızlı indirme. Büyük video dosyalarını aynı anda 4 paralel MTProto çalışanıyla parçalı indirin.',
        f7_tag: '✓ 4x Paralel MTProto Çalışanı',
        f8_title: 'Donanım Maskeleme & Güvenlik Kilidi',
        f8_desc: 'Cihaz düzeyinde toplu banları engellemek için kriptografik donanım kimliği maskeleme; Argon2 ile yerel şifre kilidi.',
        f8_tag: '✓ Donanım Parmak İzi Maskelendi',
        spec_layer: 'MTProto Katmanı',
        spec_accounts: 'Eşzamanlı Hesap',
        spec_telemetry: 'Sıfır Veri Sızıntısı',
        spec_ui: 'GPU Donanım Hızlandırma',
        footer_tag: 'Tüm dünyadaki güçlü kullanıcılar için bağımsız Telegram istemcisi.'
      },
      pt: {
        dir: 'ltr',
        nav_download: 'Baixar',
        hero_badge: 'Versão Oficial v2.4.2 • Anti-Exclusão e MCP Ativos',
        hero_title_1: 'O Cliente Soberano do Telegram para',
        hero_title_2: 'Usuários Avançados & Desenvolvedores',
        hero_subtitle: 'Recuperação de mensagens apagadas, radar de mudanças de perfil, mapas de calor para grupos, protocolo IA MCP e proxies dedicados por conta.',
        btn_download_android: 'Baixar para Android (APK)',
        btn_download_windows: 'Windows Portátil (Sem Instalação)',
        badge_live: 'Arquitetura Ativa',
        hero_mockup_title: 'Ambiente Unificado: Multi-Conta • Anti-Bloqueio • Analítica',
        hero_mockup_sub: 'Desenvolvido na Camada 229 do MTProto com SQLite local e zero vazamento de telemetria.',
        feat_section_badge: 'Recursos de Elite',
        feat_section_title: 'Projetado Muito Além do Telegram Padrão',
        feat_section_desc: 'Descubra ferramentas estratégicas criadas para usuários avançados, moderadores e engenheiros de IA.',
        f1_title: 'Motor Anti-Delete & Anti-Edit',
        f1_desc: 'Mensagens apagadas permanecem visíveis com selo distintivo. Histórico completo de edições com carimbos de data e hora.',
        f1_tag: '✓ Mensagem apagada preservada',
        f2_title: 'Radar de Mudanças de Contatos',
        f2_desc: 'Vigilância automática de contatos: registra trocas de foto, alterações de nome, @username, biografia e horários online.',
        f2_tag: '✓ Auditoria de contatos ativa',
        f3_title: 'Inteligência de Grupos e Mapas de Calor',
        f3_desc: 'Mapas de calor de atividade 24h, ranking de membros ativos, análise de horários de pico e registros de administradores.',
        f3_tag: '✓ Ranking de 24h em tempo real',
        f4_title: 'Protocolo de Contexto de IA (MCP)',
        f4_desc: 'Conecte o Claude Desktop, Cursor e IAs diretamente ao Telegram via padrão MCP para consultas e automações inteligentes.',
        f4_tag: '✓ Servidor MCP rodando na porta 3000',
        f5_title: 'Modo Fantasma Invisível Real',
        f5_desc: 'Leia mensagens sem enviar confirmação de leitura (sem segundo check) e oculte o status de digitação.',
        f5_tag: '✓ Leitura invisível ativada',
        f6_title: 'Proxies Isolados por Conta',
        f6_desc: 'Atribua túneis dedicados SOCKS5/MTProto a cada conta. Inclui coletor automático, testes de ping e rotação inteligente.',
        f6_tag: '✓ Coletor automático MTProto ativo',
        f7_title: 'Downloads Paralelos Turbo',
        f7_desc: 'Até 3x mais rápido no download de mídias usando 4 workers concorrentes de MTProto para transferir vídeos pesados.',
        f7_tag: '✓ 4 workers concorrentes MTProto',
        f8_title: 'Mascaramento de Hardware e Cofre',
        f8_desc: 'Randomização criptográfica de identificadores de hardware contra banimentos em massa; bloqueio por senha com Argon2.',
        f8_tag: '✓ Impressão digital mascarada',
        spec_layer: 'Camada MTProto',
        spec_accounts: 'Contas Simultâneas',
        spec_telemetry: 'Zero Vazamento de Dados',
        spec_ui: 'Aceleração GPU 60 FPS',
        footer_tag: 'O cliente soberano do Telegram para usuários avançados em todo o mundo.'
      },
      it: {
        dir: 'ltr',
        nav_download: 'Scarica',
        hero_badge: 'Release Ufficiale v2.4.2 • Anti-Delete & MCP Attivi',
        hero_title_1: 'Il Client Sovrano di Telegram per',
        hero_title_2: 'Utenti Esperti & Sviluppatori',
        hero_subtitle: 'Recupero messaggi cancellati, radar modifiche profilo, mappe termiche di gruppo, protocollo IA MCP e proxy dedicati per account.',
        btn_download_android: 'Scarica per Android (APK)',
        btn_download_windows: 'Windows Portatile (Senza Installazione)',
        badge_live: 'Architettura Live',
        hero_mockup_title: 'Spazio Unificato: Multi-Account • Anti-Censura • Analitica',
        hero_mockup_sub: 'Costruito su MTProto Layer 229, cache SQLite locale e zero fughe di telemetria.',
        feat_section_badge: 'Funzionalità di Élite',
        feat_section_title: 'Progettato Oltre il Telegram Standard',
        feat_section_desc: 'Strumenti strategici per utenti avanzati, amministratori di community e ingegneri di automazione.',
        f1_title: 'Motore Anti-Delete & Anti-Edit',
        f1_desc: 'I messaggi cancellati rimangono visibili con un badge dedicato. Cronologia completa di ogni modifica con timestamp precisi.',
        f1_tag: '✓ Messaggio cancellato preservato',
        f2_title: 'Radar Modifiche Utenti & Contatti',
        f2_desc: 'Traccia automaticamente i contatti: aggiornamenti foto profilo, cambi nome, username, bio e sessioni online/offline.',
        f2_tag: '✓ Radar contatti attivo',
        f3_title: 'Intelligenza Gruppi & Mappe Termiche',
        f3_desc: 'Mappe termiche di attività nelle 24h, classifica utenti più attivi, analisi orari di punta e log degli amministratori.',
        f3_tag: '✓ Classifica 24h attiva',
        f4_title: 'Protocollo IA Model Context Protocol (MCP)',
        f4_desc: 'Collega Claude Desktop, Cursor e modelli IA direttamente a Telegram tramite lo standard aperto MCP per l\\'automazione.',
        f4_tag: '✓ Server MCP attivo su porta 3000',
        f5_title: 'Vero Modo Fantasma Invisibile',
        f5_desc: 'Leggi i messaggi senza inviare la conferma di lettura (niente doppia spunta) e nascondi lo stato di digitazione.',
        f5_tag: '✓ Lettura invisibile attiva',
        f6_title: 'Proxy Isolati per Singolo Account',
        f6_desc: 'Assegna tunnel SOCKS5/MTProto dedicati a ogni account. Include scanner automatico, test del ping e rotazione intelligente.',
        f6_tag: '✓ Cacciatore MTProto attivo',
        f7_title: 'Download Paralleli Turbo',
        f7_desc: 'Velocità di download fino a 3 volte superiore grazie a 4 worker MTProto simultanei per video e file di grandi dimensioni.',
        f7_tag: '✓ 4 worker MTProto paralleli',
        f8_title: 'Mascheramento Hardware & Blocco Codice',
        f8_desc: 'Randomizzazione crittografica degli identificatori hardware contro i ban dei dispositivi; blocco passcode con Argon2.',
        f8_tag: '✓ Impronta hardware mascherata',
        spec_layer: 'Livello MTProto',
        spec_accounts: 'Account Simultanei',
        spec_telemetry: 'Zero Fughe di Dati',
        spec_ui: 'Accelerazione GPU 60 FPS',
        footer_tag: 'Il client sovrano di Telegram per utenti esigenti in tutto il mondo.'
      },
      id: {
        dir: 'ltr',
        nav_download: 'Unduh',
        hero_badge: 'Rilis Resmi v2.4.2 • Anti-Hapus & MCP Aktif',
        hero_title_1: 'Klien Telegram Tangguh untuk',
        hero_title_2: 'Pengguna Mahir & Pengembang',
        hero_subtitle: 'Pemulihan pesan yang dihapus, radar perubahan profil kontak, heatmap aktivitas grup, protokol AI MCP, dan proxy terisolasi per akun.',
        btn_download_android: 'Unduh untuk Android (APK)',
        btn_download_windows: 'Windows Portabel (Tanpa Instalasi)',
        badge_live: 'Arsitektur Langsung',
        hero_mockup_title: 'Ruang Kerja Terpadu: Banyak Akun • Anti-Blokir • Analitik',
        hero_mockup_sub: 'Dibuat dengan MTProto Layer 229, cache SQLite lokal, dan nol kebocoran privasi.',
        feat_section_badge: 'Kemampuan Elit',
        feat_section_title: 'Melampaui Standar Telegram Biasa',
        feat_section_desc: 'Fitur strategis yang dirancang khusus untuk pengguna mahir, manajer komunitas, dan insinyur otomatisasi.',
        f1_title: 'Mesin Anti-Hapus & Anti-Edit',
        f1_desc: 'Pesan yang dihapus tetap terlihat dengan lencana khusus. Lihat riwayat pengeditan lengkap dengan perbedaan kata dan cap waktu.',
        f1_tag: '✓ Pesan yang dihapus berhasil disimpan',
        f2_title: 'Radar Perubahan Profil Pengguna',
        f2_desc: 'Pemantauan otomatis kontak Anda: catat perubahan foto profil, nama, username, bio, dan sesi online/offline.',
        f2_tag: '✓ Audit kontak aktif',
        f3_title: 'Intelijen Grup & Heatmap Aktivitas',
        f3_desc: 'Heatmap aktivitas 24 jam, papan peringkat anggota teraktif, analisis jam sibuk, dan catatan tindakan admin.',
        f3_tag: '✓ Papan peringkat 24 jam aktif',
        f4_title: 'Protokol AI Model Context Protocol (MCP)',
        f4_desc: 'Hubungkan Claude Desktop, Cursor, dan AI langsung ke Telegram melalui standar MCP terbuka untuk otomatisasi cerdas.',
        f4_tag: '✓ Server MCP aktif di port 3000',
        f5_title: 'Mode Siluman Tak Terlihat Nyata',
        f5_desc: 'Baca pesan masuk tanpa tanda centang dua terbaca dan sembunyikan status "sedang mengetik...".',
        f5_tag: '✓ Pembacaan tak terlihat aktif',
        f6_title: 'Proxy Terisolasi per Akun',
        f6_desc: 'Tetapkan terowongan SOCKS5/MTProto terdedikasi untuk tiap akun dengan pemindai proxy otomatis dan pengujian ping.',
        f6_tag: '✓ Pemburu MTProto otomatis aktif',
        f7_title: 'Unduhan Paralel Turbo',
        f7_desc: 'Kecepatan unduh hingga 3 kali lebih cepat menggunakan 4 pekerja MTProto simultan untuk video besar dan arsip.',
        f7_tag: '✓ 4 pekerja MTProto paralel aktif',
        f8_title: 'Penyamaran Perangkat & Kunci Sandi',
        f8_desc: 'Pengacakan kriptografi identitas perangkat untuk mencegah pemblokiran hardware; kunci kode sandi lokal dengan Argon2.',
        f8_tag: '✓ Sidik jari perangkat disamarkan',
        spec_layer: 'Lapisan MTProto',
        spec_accounts: 'Akun Bersamaan',
        spec_telemetry: 'Nol Kebocoran Data',
        spec_ui: 'Akselerasi GPU 60 FPS',
        footer_tag: 'Klien Telegram tangguh bagi pengguna berdaya tinggi di seluruh dunia.'
      }
    };

    function applyLanguage(langCode) {
      const data = i18nData[langCode] || i18nData.en;
      document.documentElement.lang = langCode;
      document.documentElement.dir = data.dir;

      // Update all data-i18n elements
      document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        if (data[key]) {
          el.innerText = data[key];
        }
      });

      // Save preference
      try {
        localStorage.setItem('guidegram_lang', langCode);
      } catch (_) {}
    }

    const selectEl = document.getElementById('langSelect');
    selectEl.addEventListener('change', (e) => {
      applyLanguage(e.target.value);
    });

    // Auto-detect browser language or read cached
    const saved = localStorage.getItem('guidegram_lang');
    if (saved && i18nData[saved]) {
      selectEl.value = saved;
      applyLanguage(saved);
    } else {
      const browserLang = (navigator.language || '').slice(0, 2).toLowerCase();
      if (i18nData[browserLang]) {
        selectEl.value = browserLang;
        applyLanguage(browserLang);
      } else {
        applyLanguage('en');
      }
    }
  </script>
</body>
</html>`

async function deployLanding() {
  console.log('[Deployer] Fetching existing file SHA if any...')
  let sha = null
  try {
    const checkRes = await request('GET', `/repos/${REPO_OWNER}/${REPO_NAME}/contents/index.html`)
    sha = checkRes.sha
    console.log('[Deployer] Existing SHA found:', sha)
  } catch (err) {
    console.log('[Deployer] File does not exist yet or first commit')
  }

  const encodedContent = Buffer.from(pageHtml, 'utf8').toString('base64')
  const payload = {
    message: 'feat(landing): complete 12-language sovereign landing page with anti-delete, MCP, and radar showcase',
    content: encodedContent,
  }
  if (sha) payload.sha = sha

  console.log('[Deployer] Uploading 12-language landing page to guidegram.github.io...')
  const putRes = await request('PUT', `/repos/${REPO_OWNER}/${REPO_NAME}/contents/index.html`, payload)
  console.log('[Deployer] SUCCESS! Commit URL:', putRes.content?.html_url)
}

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'User-Agent': 'Guidegram-Deployment-Engine',
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        ...(postData ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        } : {})
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)) } catch (e) { resolve(data) }
        } else {
          reject(new Error(`GitHub API HTTP ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', (e) => reject(e))
    if (postData) req.write(postData)
    req.end()
  })
}

deployLanding().catch((err) => {
  console.error('[Deployer] Fatal:', err)
  process.exit(1)
})
