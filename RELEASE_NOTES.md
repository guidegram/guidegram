# 🛡️ Guidegram v2.6.0-rc.2

### 🚀 What's Changed in this Pre-release:
* **UI & Performance:** Fixed event-loop freezes ("Not Responding" hangs), optimized avatar IPC listeners with negative photo caching, and memoized unread badge filters.
* **Notification System:** Hardened mute gating for groups and channels to strictly respect Telegram mute settings across all peer ID formats.
* **Chat & Profile Integrity:** Fixed outgoing messages erroneously stamping sender identity over contact titles and avatars in private chats.
* **Media & Bubbles:** Added multi-image album pasting and modernized round video message bubbles with circular progress and frosted badges.
* **Background Safety:** Throttled window-focus sync and blocked bot accounts from triggering invalid contact audit RPCs.
