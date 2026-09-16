# Project: Telegram MTProto Layer 180+ Bot & Universal RichMessage Alignment

## Architecture
- **Backend Architecture (`electron/telegram/`)**:
  - `accountManager.ts`: Master `@mtcute` node client manager. Implements MTProto methods (`messages.startBot`, `bots.getBotInfo`, `bots.getBotMenuButton`, `messages.getBotCallbackAnswer`, `messages.requestAppWebView`, `messages.requestWebView`, `resolveInputPeer`, and media streaming).
  - `types.ts`: Universal data contracts across IPC boundaries (`BotInfo`, `BotCommand`, `BotMenuButton`, `InlineButton`, `ReplyMarkup`, `MessageEntity`, `MessageItem`, `RichMessageBlock`).
  - `main.ts` & `preload.ts`: IPC registration (`telegram:start-bot`, `telegram:get-bot-info`, `telegram:get-bot-menu-button`, `telegram:send-bot-callback`, `telegram:request-app-web-view`, `telegram:request-web-view`, `telegram:download-bot-media`).
- **Frontend Architecture (`src/`)**:
  - `src/components/ChatViewport.tsx`: Main chat container, empty state intro card, message feed, and docked panels.
  - `src/components/chat/BotIntroCard.tsx`: Dedicated rich intro card component with media banner, full description formatting, commands preview, and start bot action.
  - `src/components/chat/BotMenuDrawer.tsx`: Dynamic bot menu button on input bar, command palette popover drawer, and `/` command suggestion overlay.
  - `src/components/chat/ReplyKeyboardPanel.tsx`: Persistent custom reply keyboard panel docked below the input bar with 4-dots grid toggle, multi-row buttons, `single_use`, and special action prompts (`request_phone`, `request_location`, `request_poll`, `simpleWebView`).
  - `src/components/chat/RichMessageRenderer.tsx` & `renderFormattedText`: Universal parser and renderer for MTProto Layer 180+ `pageBlock*` and complete entity parity (`spoiler`, `custom_emoji`, `blockquote`, `pre` with copy badge & syntax highlight, `bank_card`, `table`).
  - `src/components/chat/InlineKeyboard.tsx`: Message bubble inline buttons with non-blocking toast/alert callbacks, WebApp modal launch, switch-inline, and payments.
  - `src/App.tsx`: Top-level dialog and message state synchronization upon `telegram:new-message`.
- **E2E Testing Track (`tests/bot-mtproto/`)**:
  - Independent opaque-box test suites (Tiers 1-4) + adversarial white-box tests (Tier 5).

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1: `messages.startBot` | Invoke `messages.startBot` via MTProto, create dialog if not exists, stream initial message | M1 | ORIGINAL_REQUEST §R1 |
| 2 | R1: 64-bit ID & Peer Resolution | Preserve `accessHash`, handle BigInt/Long without 32-bit truncation, fix `USER_ID_INVALID` | M1 | ORIGINAL_REQUEST §R1 |
| 3 | R1: Real-Time Stream Synchronization | Stream incoming bot responses via `telegram:new-message`, avoid stuck empty state | M1 | ORIGINAL_REQUEST §R1 |
| 4 | R2: Bot Intro & Rich Metadata | Query `users.getFullUser.bot_info` with fallback to `bots.getBotInfo` | M2 | ORIGINAL_REQUEST §R2 |
| 5 | R2: Description Media Download | Fetch & download `description_photo` & `description_document` (video/animation/Lottie) | M2 | ORIGINAL_REQUEST §R2 |
| 6 | R2: Rich Bot Intro Card UI | Render banner media, markdown description, command pills, and START BOT with loading state | M2 | ORIGINAL_REQUEST §R2 |
| 7 | R3: Dynamic Bot Menu Button | Support `botMenuButtonCommands`, `botMenuButton`, `botMenuButtonDefault` in input bar | M3 | ORIGINAL_REQUEST §R3 |
| 8 | R3: Command Palette Drawer & Autocomplete | Popup command list on menu click, `/` autocomplete overlay in input textarea | M3 | ORIGINAL_REQUEST §R3 |
| 9 | R4: Disentangle ReplyKeyboardMarkup | Separate `replyKeyboardMarkup` from inline bubble markup into docked panel | M4 | ORIGINAL_REQUEST §R4 |
| 10 | R4: 4-Dots Input Toggle & Docked Panel | 4-dots grid toggle icon in bottom-right of input bar, show/hide docked keyboard | M4 | ORIGINAL_REQUEST §R4 |
| 11 | R4: Advanced Keyboard Features | Multi-row grid, `single_use` collapse, `request_phone`, `request_location`, `replyKeyboardHide` | M4 | ORIGINAL_REQUEST §R4 |
| 12 | R5: Universal RichMessage Engine | Parse & render all `pageBlock*` (header, paragraph, list, table, photo, video, embed, author_date) | M5 | ORIGINAL_REQUEST §R5 |
| 13 | R5: Full Entity Parity | Spoilers, custom emojis (Lottie/WebM), blockquotes, pre with copy & badge, bank card | M5 | ORIGINAL_REQUEST §R5 |
| 14 | R6: Inline Buttons & Callback Handling | Non-blocking callback alert/toast (`messages.getBotCallbackAnswer`), URL, WebView, SwitchInline, Buy | M6 | ORIGINAL_REQUEST §R6 |
| 15 | R7: E2E Test Suite & Build Verification | Requirement-driven test suite (Tiers 1-5), `tsc --noEmit` & build 0 errors | M7 | ORIGINAL_REQUEST Acceptance Criteria |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Bot Lifecycle & Peer Resolution | Backend `startBot`, high 64-bit ID resolution, `accessHash` persistence, real-time message stream | none | PLANNED |
| M2 | Official Bot Intro Screen & Metadata | `getBotInfo`, description media downloader, `BotIntroCard` UI | M1 | PLANNED |
| M3 | Dynamic Bot Menu & Commands Drawer | `getBotMenuButton`, input bar menu button, command palette drawer, `/` autocomplete | M1 | PLANNED |
| M4 | Persistent Custom Reply Keyboard | Disentangled `ReplyKeyboardMarkup`, 4-dots toggle, docked keyboard panel, button actions | M1 | PLANNED |
| M5 | RichMessage & Universal Entity Alignment | Full `pageBlock*` rendering, complete entity parity (spoilers, code badges, custom emojis) | none | PLANNED |
| M6 | Interactive Inline Buttons & Callbacks | `keyboardButtonCallback` (toast/alert modal), URL, Mini App launcher, switch-inline, buy | M1, M5 | PLANNED |
| M7 | E2E Testing Track & Final Quality Gate | Tiers 1-4 opaque-box tests, Tier 5 adversarial tests, `tsc --noEmit` clean, zero build errors | M1-M6 | PLANNED |

---

## Interface Contracts

### Backend IPC (`electron/preload.ts` & `electron/main.ts` ↔ `electron/telegram/accountManager.ts`)
```typescript
// 1. Start Bot
startBot(accountId: string, botPeerId: string, startParam?: string): Promise<{ success: boolean; error?: string }>
// IPC channel: 'telegram:start-bot'

// 2. Get Bot Info & Media
getBotInfo(accountId: string, botPeerId: string): Promise<BotInfoResult>
// IPC channel: 'telegram:get-bot-info'

downloadBotMedia(accountId: string, media: { type: 'photo' | 'document'; id: string; accessHash: string; fileReference: string }): Promise<string>
// IPC channel: 'telegram:download-bot-media'

// 3. Get Bot Menu Button
getBotMenuButton(accountId: string, botPeerId: string): Promise<BotMenuButtonResult>
// IPC channel: 'telegram:get-bot-menu-button'

// 4. Send Bot Callback Query
sendBotCallbackQuery(accountId: string, peerId: string, msgId: number, data?: string): Promise<BotCallbackAnswerResult>
// IPC channel: 'telegram:send-bot-callback'

// 5. Request App Web View (Mini App)
requestAppWebView(accountId: string, peerId: string, app: InputBotAppParam, startParam?: string): Promise<WebViewResult>
// IPC channel: 'telegram:request-app-web-view'
```

### Data Contract Types (`electron/telegram/types.ts` & `src/types/telegram.ts`)
```typescript
export interface BotInfoResult {
  userId: string;
  description: string;
  descriptionPhoto?: { id: string; accessHash: string; fileReference: string; url?: string };
  descriptionDocument?: { id: string; accessHash: string; fileReference: string; mimeType: string; url?: string };
  commands: Array<{ command: string; description: string }>;
  menuButton?: BotMenuButtonResult;
}

export type BotMenuButtonResult = 
  | { type: 'default' }
  | { type: 'commands' }
  | { type: 'web_app'; text: string; url: string };

export interface BotCallbackAnswerResult {
  message?: string;
  alert?: boolean;
  url?: string;
  cacheTime?: number;
}
```

---

## Code Layout
- `electron/telegram/accountManager.ts`: Core MTProto client methods and peer resolution.
- `electron/telegram/types.ts`: MTProto data contracts.
- `electron/preload.ts` & `electron/main.ts`: IPC bindings.
- `src/components/ChatViewport.tsx`: Main chat layout integrating new components.
- `src/components/chat/BotIntroCard.tsx`: Bot intro banner & start UI.
- `src/components/chat/BotMenuDrawer.tsx`: Bot menu button & command palette.
- `src/components/chat/ReplyKeyboardPanel.tsx`: Persistent docked reply keyboard & 4-dots button.
- `src/components/chat/RichMessageRenderer.tsx`: Universal `pageBlock*` and entity renderer.
- `src/components/chat/InlineKeyboard.tsx`: Message bubble inline button grid and callback dispatcher.
- `tests/bot-mtproto/`: Comprehensive test suites for all 7 milestones.
