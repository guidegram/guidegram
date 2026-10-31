/**
 * telegramBotCommandParser.ts
 * 
 * Telegram Bot Command Syntax, Username Targeting & Privacy Mode Router (Phase 162).
 * Directly resolves the core Telegram Bot API phenomenon reported in teloxide/teloxide #978:
 * ("Bot stops responding after some time: Only to commands in group chats it seems").
 * 
 * Official Telegram Bot API Privacy Mode Specifications:
 * 1. In Private Chats (DMs):
 *    - All commands (/cmd or /cmd@BotUsername) are delivered to the bot.
 * 2. In Group Chats & Supergroups with Group Privacy Enabled (Default):
 *    - General commands without username (/cmd) are delivered ONLY IF the bot was the
 *      last bot/user to send a message to the group. If any other participant speaks,
 *      Telegram server silently filters /cmd.
 *    - Targeted commands (/cmd@MyBotUsername) are ALWAYS delivered regardless of speaker order.
 *    - Targeted commands for another bot (/cmd@OtherBot) MUST be ignored by MyBot.
 * 3. Client Autocomplete Invariant:
 *    - In group chats, selecting a command from the autocomplete palette must append
 *      `@bot_username` (e.g. `/info@MyBot`) to guarantee delivery under privacy mode.
 */

export interface ParsedBotCommand {
  raw: string;
  command: string; // e.g. "info" (lowercase, without slash)
  botUsername?: string; // e.g. "my_bot" (lowercase, without @)
  args: string; // e.g. "param1 param2"
  isTargeted: boolean;
}

/**
 * Parses a message string into structured command, target username, and arguments.
 * Returns null if message does not start with a valid bot command slash.
 */
export function parseBotCommand(text: string): ParsedBotCommand | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return null;

  // Telegram bot commands syntax: /command[@username] [args]
  // Command names are 1-32 chars: a-z, 0-9, and underscore.
  const match = trimmed.match(/^\/([a-zA-Z0-9_]{1,64})(?:@([a-zA-Z0-9_]{3,32}))?(?:\s+(.*))?$/s);
  if (!match) return null;

  const command = match[1].toLowerCase();
  const botUsername = match[2] ? match[2].toLowerCase() : undefined;
  const args = match[3] ? match[3].trim() : '';

  return {
    raw: trimmed,
    command,
    botUsername,
    args,
    isTargeted: Boolean(botUsername),
  };
}

/**
 * Determines whether a bot should process an incoming command based on chat context,
 * username targeting, and Telegram Group Privacy Mode rules.
 */
export function shouldBotProcessCommand(
  parsed: ParsedBotCommand,
  botUsername: string,
  options?: {
    isGroupChat?: boolean;
    isLastSpeaker?: boolean;
    hasGroupPrivacyDisabled?: boolean;
  }
): boolean {
  if (!parsed || !botUsername) return false;

  const cleanMyBot = botUsername.toLowerCase().replace(/^@/, '');
  const isGroup = Boolean(options?.isGroupChat);

  // 1. If command explicitly specifies a username:
  if (parsed.isTargeted && parsed.botUsername) {
    return parsed.botUsername === cleanMyBot;
  }

  // 2. In private chats (1-on-1 DM):
  if (!isGroup) {
    return true;
  }

  // 3. In group chats without explicit username:
  // If group privacy is disabled, bot receives all commands like an ordinary user
  if (options?.hasGroupPrivacyDisabled) {
    return true;
  }

  // Under Telegram Default Privacy Mode:
  // General commands are delivered only if the bot was the last to speak in the group
  return Boolean(options?.isLastSpeaker);
}

/**
 * Formats a command string for insertion into the chat composer.
 * In group chats with a known bot username, appends `@bot_username` to guarantee
 * delivery through Telegram Group Privacy Mode filters.
 */
export function formatCommandForChat(
  command: string,
  botUsername?: string,
  isGroupChat = false
): string {
  const cleanCmd = command.startsWith('/') ? command.slice(1).trim() : command.trim();
  if (!cleanCmd) return '';

  if (isGroupChat && botUsername) {
    const cleanUser = botUsername.startsWith('@') ? botUsername.slice(1).trim() : botUsername.trim();
    if (cleanUser) {
      return `/${cleanCmd}@${cleanUser}`;
    }
  }

  return `/${cleanCmd}`;
}
