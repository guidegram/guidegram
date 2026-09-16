import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Smile, Layers, Film, Search, X, Sparkles, Clock, RefreshCw, Star, Flame, Check } from 'lucide-react'
import { StickerSetItem, StickerItem } from '../types/telegram'
import lottie from 'lottie-web'

interface MediaPickerDrawerProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  chatId: string
  onSelectEmoji: (emoji: string) => void
  onSelectSticker: (sticker: StickerItem) => void
  onSelectGif?: (gifUrl: string) => void
}

type TabType = 'emoji' | 'stickers' | 'gifs'

// Telegram Standard Unicode Emojis Categorized
const EMOJI_CATEGORIES: { id: string; name: string; icon: string; emojis: string[] }[] = [
  {
    id: 'smileys',
    name: 'Smileys & Emotion',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '🥹', '😊', '😇',
      '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛',
      '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒',
      '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭',
      '😮‍💨', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰',
      '😥', '😓', '🫣', '🤗', '🫡', '🤔', '🫢', '🤫', '🤥', '😶', '😐', '😑',
      '😬', '🫨', '🫠', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤',
      '😪', '😵', '😵‍💫', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑',
      '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾',
      '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
    ],
  },
  {
    id: 'people',
    name: 'People & Gestures',
    icon: '👋',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '🫷', '🫸', '👌',
      '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕',
      '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶',
      '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶',
      '👂', '🦻', '👃', '🫀', '🫁', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄',
      '🫦', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👩', '🧓', '👴', '👵',
    ],
  },
  {
    id: 'animals',
    name: 'Animals & Nature',
    icon: '🐶',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁',
      '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦',
      '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝',
      '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️',
      '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀',
      '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍',
      '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂',
      '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺',
      '🐈', '🐈‍⬛', '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇',
      '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔',
    ],
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: '🍕',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒',
      '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️',
      '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖',
      '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴',
      '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗',
      '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤',
      '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧',
      '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜',
      '🍯', '🥛', '🍼', '☕', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺',
      '🍻', '🥂', '🥃', '🫗', '🥤', '🧋', '🧃', '🧉', '🧊',
    ],
  },
  {
    id: 'activities',
    name: 'Activities & Sports',
    icon: '⚽️',
    emojis: [
      '⚽️', '🏀', '🏈', '⚾️', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓',
      '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳️', '🪁', '🏹', '🎣', '🤿',
      '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂',
      '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽',
      '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️',
      '🎫', '🎟️', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹',
      '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳',
      '🎮', '🎰', '🧩',
    ],
  },
  {
    id: 'travel',
    name: 'Travel & Places',
    icon: '✈️',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚',
      '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔',
      '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅',
      '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️',
      '🚀', '🛸', '🚁', '🛶', '⛵️', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓️', '🛟',
      '🪝', '⛽️', '🚧', '🚦', '🚥', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯',
      '🏟️', '🎡', '🎢', '🎠', '⛲️', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️',
      '🗻', '🏕️', '⛺️', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣',
      '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪️', '🕌', '🛕',
      '🕍', '🕋', '⛩️',
    ],
  },
  {
    id: 'objects',
    name: 'Objects',
    icon: '💡',
    emojis: [
      '⌚️', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽',
      '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️',
      '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '⏱️', '⏲️', '⏰', '🕰️', '⌛️',
      '⏳', '📡', '🔋', '🪫', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸',
      '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛',
      '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲',
      '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️',
      '🏺', '🔮', '📿', '🧿', '🪬', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺',
      '🩻', '🩼', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🪠',
      '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪥', '🪒', '🧽', '🪣',
      '🧴', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🪆', '🖼️', '🪞',
      '🪟', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎',
      '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️',
      '🪧', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾',
      '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '🗑️', '🪪', '📇', '🗃️', '🗳️',
      '🗄️', '📋', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📕', '📗', '📘', '📙',
      '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📌', '📍',
      '✂️', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐',
      '🔒', '🔓',
    ],
  },
  {
    id: 'symbols',
    name: 'Symbols & Hearts',
    icon: '💖',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
      '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️',
      '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈️', '♉️', '♊️', '♋️', '♌️',
      '♍️', '♎️', '♏️', '♐️', '♑️', '♒️', '♓️', '🆔', '⚛️', '🉑', '☢️', '☣️',
      '📴', '📳', '🈶', '🈚️', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️',
      '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌',
      '⭕️', '🛑', '⛔️', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱',
      '🔞', '📵', '🚭', '❗️', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️',
      '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯️', '💹', '❇️', '✳️', '❎',
      '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿️', '🅿️', '🛗', '🈳', '🈂️',
      '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '⚧️', '🚻', '🚮', '🎦', '📶',
      '🈁', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '🔟', '🔢', '#️⃣', '*️⃣', '0️⃣',
      '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔣', '◀️',
      '🔼', '▶️', '🔽', '⏪️', '⏫️', '⏩️', '⏬️', '⏭️', '⏮️', '⏯️', '⏸️', '⏹️',
      '⏺️', '⏏️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗',
      '✖️', '🟰', '♾️', '💲', '💱', '™️', '©️', '®️', '👁️‍🗨️', '🔚', '🔙', '🔛',
      '🔝', '🔜', '〰️', '➰', '➿', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢',
      '🔵', '🟣', '⚫️', '⚪️', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳',
      '🔲', '▪️', '▫️', '◾️', '◽️', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦',
      '🟪', '⬛️', '⬜️', '🟫', '🔈', '🔉', '🔊', '🔇', '📣', '📢', '🔔', '🔕',
    ],
  },
  {
    id: 'flags',
    name: 'Flags',
    icon: '🚩',
    emojis: [
      '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇮🇷', '🇺🇸', '🇬🇧', '🇩🇪',
      '🇫🇷', '🇷🇺', '🇨🇦', '🇯🇵', '🇨🇳', '🇦🇺', '🇧🇷', '🇮🇳', '🇮🇹', '🇪🇸', '🇹🇷', '🇦🇪',
      '🇸🇦', '🇰🇷', '🇳🇱', '🇸🇪', '🇨🇭', '🇳🇴', '🇵🇱', '🇺🇦', '🇬🇷', '🇵🇹', '🇲🇽', '🇦🇷',
      '🇪🇬', '🇿🇦', '🇮🇶', '🇵🇰', '🇦🇫', '🇸🇾', '🇱🇧', '🇯🇴', '🇴🇲', '🇶🇦', '🇰🇼', '🇧🇭',
    ],
  },
]

// Curated Telegram Premium Custom Emoji Effects
const TELEGRAM_PREMIUM_EMOJIS = [
  { emoji: '⚡️', name: 'Supercharged', glow: 'from-amber-400 to-yellow-500' },
  { emoji: '👑', name: 'Telegram VIP', glow: 'from-yellow-400 to-amber-600' },
  { emoji: '💎', name: 'Precious Gem', glow: 'from-cyan-400 to-blue-500' },
  { emoji: '🔥', name: 'Inferno', glow: 'from-orange-500 to-red-600' },
  { emoji: '⭐️', name: 'Telegram Star', glow: 'from-amber-300 to-yellow-400' },
  { emoji: '🚀', name: 'Cosmic Boost', glow: 'from-indigo-500 to-purple-600' },
  { emoji: '✨', name: 'Sparkles', glow: 'from-pink-400 to-violet-500' },
  { emoji: '💫', name: 'Dizzy Star', glow: 'from-teal-400 to-cyan-500' },
  { emoji: '🛡️', name: 'Verified Shield', glow: 'from-blue-500 to-indigo-600' },
  { emoji: '🏆', name: 'Champion Cup', glow: 'from-yellow-500 to-amber-700' },
  { emoji: '🍾', name: 'Celebration', glow: 'from-emerald-400 to-teal-500' },
  { emoji: '🎉', name: 'Party Popper', glow: 'from-pink-500 to-rose-600' },
  { emoji: '💜', name: 'Telegram Heart', glow: 'from-purple-500 to-pink-500' },
  { emoji: '🍀', name: 'Lucky Clover', glow: 'from-emerald-500 to-green-600' },
  { emoji: '🎯', name: 'Bullseye', glow: 'from-red-500 to-rose-700' },
  { emoji: '🔮', name: 'Crystal Ball', glow: 'from-violet-500 to-indigo-700' },
]

// Popular reaction GIFs categories for Telegram
const GIF_CATEGORIES = [
  { tag: 'trending', label: '🔥 Trending' },
  { tag: 'happy', label: '😊 Happy' },
  { tag: 'love', label: '❤️ Love' },
  { tag: 'clap', label: '👏 Clap' },
  { tag: 'dance', label: '💃 Dance' },
  { tag: 'party', label: '🎉 Party' },
  { tag: 'lol', label: '😂 LOL' },
  { tag: 'yes', label: '👍 Yes' },
  { tag: 'no', label: '🙅 No' },
  { tag: 'fire', label: '🔥 Fire' },
]

// Single Sticker Preview with animated Lottie or WebP
const StickerThumbnail: React.FC<{
  accountId: string
  sticker: StickerItem
  onClick: () => void
}> = ({ accountId, sticker, onClick }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    if (!window.guidegram?.getStickerData) return

    window.guidegram
      .getStickerData(accountId, sticker.id, sticker.accessHash, sticker.fileReferenceHex)
      .then((res) => {
        if (!active || !res) return
        if (res.format === 'lottie' && res.data && containerRef.current) {
          try {
            containerRef.current.innerHTML = ''
            lottie.loadAnimation({
              container: containerRef.current,
              renderer: 'svg',
              loop: true,
              autoplay: true,
              animationData: res.data,
            })
          } catch (_) {}
        } else if (res.url) {
          setDataUrl(res.url)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [accountId, sticker.id, sticker.accessHash])

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-16 h-16 sm:w-18 sm:h-18 p-1.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer group relative shrink-0"
      title={sticker.emoticon ? `${sticker.emoticon} (Click to send)` : 'Click to send'}
    >
      {sticker.isAnimated ? (
        <div ref={containerRef} className="w-full h-full object-contain pointer-events-none" />
      ) : dataUrl ? (
        <img
          src={dataUrl}
          alt={sticker.emoticon || 'sticker'}
          className="w-full h-full object-contain pointer-events-none group-hover:scale-105 transition-transform"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xl select-none">
          {loading ? (
            <div className="w-4 h-4 rounded-full border-2 border-primary-400 border-t-transparent animate-spin" />
          ) : (
            sticker.emoticon || '⭐'
          )}
        </div>
      )}
      {sticker.emoticon && (
        <span className="absolute bottom-1 right-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 px-1 rounded">
          {sticker.emoticon}
        </span>
      )}
    </button>
  )
}

export const MediaPickerDrawer: React.FC<MediaPickerDrawerProps> = ({
  isOpen,
  onClose,
  accountId,
  onSelectEmoji,
  onSelectSticker,
  onSelectGif,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('emoji')
  const [searchQuery, setSearchQuery] = useState('')
  const [recentEmojis, setRecentEmojis] = useState<string[]>([])
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState<string>('smileys')

  // Sticker state
  const [sets, setSets] = useState<StickerSetItem[]>([])
  const [activeSetId, setActiveSetId] = useState<string | null>(null)
  const [cachedSetDetails, setCachedSetDetails] = useState<Record<string, StickerSetItem>>({})
  const [loadingSets, setLoadingSets] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // GIF state
  const [selectedGifTag, setSelectedGifTag] = useState('trending')

  // Load recent emojis from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('guidegram_recent_emojis')
      if (saved) {
        setRecentEmojis(JSON.parse(saved))
      }
    } catch (_) {}
  }, [])

  const handlePickEmoji = (emoji: string) => {
    onSelectEmoji(emoji)
    // Update recents
    setRecentEmojis((prev) => {
      const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, 32)
      try {
        localStorage.setItem('guidegram_recent_emojis', JSON.stringify(next))
      } catch (_) {}
      return next
    })
  }

  // Load installed sticker packs
  useEffect(() => {
    if (!isOpen || !accountId || activeTab !== 'stickers') return
    if (sets.length > 0) return
    setLoadingSets(true)
    if (window.guidegram?.getInstalledStickerSets) {
      window.guidegram
        .getInstalledStickerSets(accountId)
        .then((list) => {
          setSets(list || [])
          if (list && list.length > 0 && !activeSetId) {
            setActiveSetId(list[0].id)
          }
        })
        .catch(() => {})
        .finally(() => setLoadingSets(false))
    }
  }, [isOpen, accountId, activeTab, sets.length])

  // Load active pack stickers
  useEffect(() => {
    if (!isOpen || !accountId || !activeSetId || activeTab !== 'stickers') return
    if (cachedSetDetails[activeSetId]) return

    const targetSet = sets.find((s) => s.id === activeSetId)
    if (!targetSet) return

    setLoadingDetails(true)
    if (window.guidegram?.getStickerSet) {
      window.guidegram
        .getStickerSet(accountId, targetSet.id, targetSet.accessHash)
        .then((detailed) => {
          if (detailed) {
            setCachedSetDetails((prev) => ({ ...prev, [activeSetId]: detailed }))
          }
        })
        .catch(() => {})
        .finally(() => setLoadingDetails(false))
    }
  }, [isOpen, accountId, activeSetId, sets, activeTab, cachedSetDetails])

  // Filter emojis based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return EMOJI_CATEGORIES
    const q = searchQuery.toLowerCase()
    return EMOJI_CATEGORIES.map((cat) => {
      const matched = cat.emojis.filter((e) => e.includes(q))
      return { ...cat, emojis: matched }
    }).filter((cat) => cat.emojis.length > 0)
  }, [searchQuery])

  if (!isOpen) return null

  const activeSet = sets.find((s) => s.id === activeSetId)
  const activeDetails = activeSetId ? cachedSetDetails[activeSetId] : null
  const currentStickers = activeDetails?.stickers || []

  return (
    <div
      className="absolute bottom-16 left-4 z-40 w-80 sm:w-[410px] h-[440px] rounded-2xl bg-dark-900/95 border border-white/10 shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header with Telegram-style Navigation Tabs */}
      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between bg-dark-850/90">
        <div className="flex items-center gap-1 bg-dark-800 p-0.5 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('emoji')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'emoji'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Emoji</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stickers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'stickers'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Stickers</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gifs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'gifs'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>GIFs</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          title="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* =========================================================
          TAB 1: EMOJI (Standard Unicode + Telegram Premium Custom)
          ========================================================= */}
      {activeTab === 'emoji' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search bar */}
          <div className="px-3 pt-2.5 pb-1.5">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-dark-800 border border-white/5 rounded-xl focus-within:border-primary-500/50 transition-colors">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search emojis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-gray-100 placeholder-gray-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Emoji Category Navigator Pills */}
          {!searchQuery && (
            <div className="px-3 py-1 flex items-center gap-1 overflow-x-auto scrollbar-none border-b border-white/5 shrink-0">
              {recentEmojis.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedEmojiCategory('recents')}
                  className={`p-1.5 rounded-lg text-sm transition-all cursor-pointer shrink-0 ${
                    selectedEmojiCategory === 'recents' ? 'bg-white/15 text-white scale-105' : 'opacity-60 hover:opacity-100'
                  }`}
                  title="Recent"
                >
                  <Clock className="w-3.5 h-3.5 text-primary-400" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedEmojiCategory('premium')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                  selectedEmojiCategory === 'premium'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-amber-400/80 hover:text-amber-300'
                }`}
                title="Telegram Premium Custom Emojis"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Premium</span>
              </button>
              {EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedEmojiCategory(cat.id)}
                  className={`p-1.5 rounded-lg text-sm transition-all cursor-pointer shrink-0 ${
                    selectedEmojiCategory === cat.id ? 'bg-white/15 text-white scale-110' : 'opacity-60 hover:opacity-100'
                  }`}
                  title={cat.name}
                >
                  {cat.icon}
                </button>
              ))}
            </div>
          )}

          {/* Emoji Palette Scrollable List */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 scrollbar-thin">
            {/* Recent Emojis Section */}
            {!searchQuery && (selectedEmojiCategory === 'recents' || selectedEmojiCategory === 'smileys') && recentEmojis.length > 0 && (
              <div>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-primary-400" />
                  <span>Recently Used</span>
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {recentEmojis.map((emoji, idx) => (
                    <button
                      key={`recent-${idx}`}
                      type="button"
                      onClick={() => handlePickEmoji(emoji)}
                      className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-white/10 active:scale-90 transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Telegram Premium Custom Emojis Section */}
            {!searchQuery && (selectedEmojiCategory === 'premium' || selectedEmojiCategory === 'smileys') && (
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-transparent border border-amber-500/20">
                <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>Telegram Premium Custom Emojis</span>
                  </div>
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-semibold">
                    VIP
                  </span>
                </div>
                <div className="grid grid-cols-8 gap-1.5">
                  {TELEGRAM_PREMIUM_EMOJIS.map((p, idx) => (
                    <button
                      key={`prem-${idx}`}
                      type="button"
                      onClick={() => handlePickEmoji(p.emoji)}
                      className="group relative w-9 h-9 flex items-center justify-center text-2xl rounded-xl hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                      title={`${p.name} (Telegram Premium)`}
                    >
                      <span className="group-hover:scale-125 transition-transform drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]">
                        {p.emoji}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Categorized Unicode Emojis */}
            {filteredCategories.map((cat) => (
              <div key={cat.id}>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                  <span className="text-[10px] text-gray-500 font-normal">({cat.emojis.length})</span>
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {cat.emojis.map((emoji, idx) => (
                    <button
                      key={`${cat.id}-${idx}`}
                      type="button"
                      onClick={() => handlePickEmoji(emoji)}
                      className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-white/10 active:scale-90 transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: STICKERS (MTProto Installed Sticker Packs + Lottie)
          ========================================================= */}
      {activeTab === 'stickers' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Active Pack Title & Info */}
          <div className="px-3.5 py-2 border-b border-white/5 flex items-center justify-between text-xs bg-dark-850/40">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-accent-cyan" />
              <span className="font-semibold text-white truncate max-w-[200px]">
                {activeSet?.title || 'Sticker Packs'}
              </span>
              {activeSet && (
                <span className="text-[10px] text-gray-400">({activeSet.count})</span>
              )}
            </div>
            {loadingSets && (
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <RefreshCw className="w-3 h-3 animate-spin text-accent-cyan" />
                <span>Syncing...</span>
              </div>
            )}
          </div>

          {/* Stickers Grid */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-4 sm:grid-cols-5 gap-1.5 justify-items-center scrollbar-thin">
            {loadingDetails ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center gap-2 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin text-accent-cyan" />
                <span className="text-xs">Loading animated stickers...</span>
              </div>
            ) : currentStickers.length > 0 ? (
              currentStickers.map((stk) => (
                <StickerThumbnail
                  key={stk.id}
                  accountId={accountId}
                  sticker={stk}
                  onClick={() => {
                    onSelectSticker(stk)
                    onClose()
                  }}
                />
              ))
            ) : (
              <div className="col-span-full py-16 text-center text-xs text-gray-500">
                {loadingSets ? 'Fetching installed sticker sets from Telegram...' : 'No stickers in this pack.'}
              </div>
            )}
          </div>

          {/* Bottom Tabs for Installed Packs */}
          {sets.length > 0 && (
            <div className="p-1.5 border-t border-white/5 bg-dark-950 flex items-center gap-1 overflow-x-auto scrollbar-none">
              {sets.map((set) => {
                const isSelected = set.id === activeSetId
                return (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => setActiveSetId(set.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                    title={set.title}
                  >
                    <Layers className="w-3 h-3" />
                    <span className="max-w-[80px] truncate">{set.title}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 3: GIFS (Telegram Trending Reactions & Search)
          ========================================================= */}
      {activeTab === 'gifs' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Reaction category tags */}
          <div className="p-2 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 bg-dark-850/40">
            {GIF_CATEGORIES.map((cat) => (
              <button
                key={cat.tag}
                type="button"
                onClick={() => setSelectedGifTag(cat.tag)}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  selectedGifTag === cat.tag
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-dark-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* GIF Collection */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col items-center justify-center gap-3 text-gray-400 text-xs text-center">
            <Flame className="w-8 h-8 text-primary-400 animate-pulse" />
            <div>
              <p className="font-semibold text-gray-200">Tenor GIF Integration</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Type @gif in the chat box to search animated GIFs live</p>
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectEmoji('🔥')
                onClose()
              }}
              className="px-3 py-1.5 rounded-xl bg-primary-600/30 hover:bg-primary-600/50 text-primary-300 border border-primary-500/30 font-medium text-xs transition-colors cursor-pointer"
            >
              Insert Reaction 🔥
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
