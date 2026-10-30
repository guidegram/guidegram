import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Smile, Layers, Film, Search, X, Clock, RefreshCw, Star, Flame, Sparkles } from 'lucide-react'
import { StickerSetItem, StickerItem } from '../types/telegram'
import lottie from 'lottie-web'

interface MediaPickerDrawerProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  chatId: string
  onSelectEmoji: (emoji: string) => void
  onSelectSticker: (sticker: StickerItem) => void
  onSelectGif?: (gif: StickerItem) => void
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

// Thumbnail renderer for animated Lottie, WebM/MP4 video, or WebP images
const MediaItemThumbnail: React.FC<{
  accountId: string
  item: StickerItem
  onClick: () => void
  sizeClass?: string
}> = ({ accountId, item, onClick, sizeClass = 'w-16 h-16 sm:w-18 sm:h-18 p-1.5' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(item.thumbnailUrl || null)
  const [format, setFormat] = useState<'lottie' | 'video' | 'image' | null>(null)
  const [loading, setLoading] = useState(!item.thumbnailUrl)

  useEffect(() => {
    let active = true
    let animItem: any = null
    if (!window.guidegram?.getStickerData) return

    window.guidegram
      .getStickerData(accountId, item.id, item.accessHash, item.fileReferenceHex)
      .then((res: any) => {
        if (!active || !res) return
        if (typeof res === 'string') {
          setDataUrl(res)
          setFormat('image')
        } else if (res.format === 'lottie' && res.data && containerRef.current) {
          setFormat('lottie')
          try {
            containerRef.current.innerHTML = ''
            animItem = lottie.loadAnimation({
              container: containerRef.current,
              renderer: 'svg',
              loop: true,
              autoplay: true,
              animationData: res.data,
            })
          } catch (_) {}
        } else if (res.format === 'video' && res.url) {
          setFormat('video')
          setDataUrl(res.url)
        } else if (res.url) {
          setFormat('image')
          setDataUrl(res.url)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      if (animItem) animItem.destroy()
    }
  }, [accountId, item.id, item.accessHash])

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${sizeClass} rounded-xl hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer group relative shrink-0`}
      title={item.emoticon ? `${item.emoticon}` : 'Click to send'}
    >
      {format === 'lottie' || item.isAnimated ? (
        <div ref={containerRef} className="w-full h-full object-contain pointer-events-none" />
      ) : format === 'video' && dataUrl ? (
        <video
          src={dataUrl}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-contain pointer-events-none rounded-lg"
        />
      ) : dataUrl ? (
        <img
          src={dataUrl}
          alt={item.emoticon || 'sticker'}
          className="w-full h-full object-contain pointer-events-none group-hover:scale-105 transition-transform"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-lg select-none">
          {loading ? (
            <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-400 border-t-transparent animate-spin" />
          ) : (
            item.emoticon || '⭐'
          )}
        </div>
      )}
      {item.emoticon && item.emoticon !== 'GIF' && (
        <span className="absolute bottom-0.5 right-0.5 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 px-1 rounded pointer-events-none">
          {item.emoticon}
        </span>
      )}
    </button>
  )
}

// Compact Pack Cover Icon for the bottom dock bar
const PackCoverIcon: React.FC<{
  accountId: string
  set: StickerSetItem
  isSelected: boolean
  onClick: () => void
}> = ({ accountId, set, isSelected, onClick }) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(set.thumbnailUrl || null)

  useEffect(() => {
    let active = true
    if (thumbUrl || !window.guidegram?.getStickerSet) return

    window.guidegram
      .getStickerSet(accountId, set.id, set.accessHash)
      .then((detailed) => {
        if (!active || !detailed) return
        if (detailed.thumbnailUrl) {
          setThumbUrl(detailed.thumbnailUrl)
        } else if (detailed.stickers?.[0]) {
          const first = detailed.stickers[0]
          if (first.thumbnailUrl) {
            setThumbUrl(first.thumbnailUrl)
          } else if (window.guidegram?.getStickerData) {
            window.guidegram
              .getStickerData(accountId, first.id, first.accessHash, first.fileReferenceHex)
              .then((res: any) => {
                if (active && res?.url) setThumbUrl(res.url)
              })
              .catch(() => {})
          }
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [accountId, set.id, set.accessHash, thumbUrl])

  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 w-9 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0 overflow-hidden relative border ${
        isSelected
          ? 'bg-accent-cyan/20 border-accent-cyan/60 shadow-sm shadow-accent-cyan/20 scale-105'
          : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
      }`}
      title={set.title}
    >
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={set.title}
          className="w-7 h-7 object-contain rounded"
          loading="lazy"
        />
      ) : (
        <span className="text-[10px] font-bold text-gray-300 uppercase">
          {set.title ? set.title.trim().replace(/^@/, '').slice(0, 2) : '🗂️'}
        </span>
      )}
    </button>
  )
}

// GIF Thumbnail Card with responsive playback
const GifItemCard: React.FC<{
  accountId: string
  item: StickerItem
  onClick: () => void
}> = ({ accountId, item, onClick }) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    if (!window.guidegram?.getStickerData) return

    window.guidegram
      .getStickerData(accountId, item.id, item.accessHash, item.fileReferenceHex)
      .then((res: any) => {
        if (!active || !res) return
        if (typeof res === 'string') {
          setVideoUrl(res)
        } else if (res.url) {
          setVideoUrl(res.url)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [accountId, item.id, item.accessHash])

  return (
    <div
      onClick={onClick}
      className="group relative aspect-video bg-dark-800 rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-primary-500/50 hover:shadow-lg transition-all"
    >
      {videoUrl ? (
        <video
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
      ) : item.thumbnailUrl ? (
        <img
          src={item.thumbnailUrl}
          alt="GIF thumbnail"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
          {loading ? (
            <div className="w-4 h-4 rounded-full border-2 border-primary-400 border-t-transparent animate-spin" />
          ) : (
            'GIF'
          )}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
        <span className="text-[10px] font-semibold text-white bg-primary-600/80 px-1.5 py-0.5 rounded">
          Send GIF
        </span>
      </div>
    </div>
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

  // Emojis state
  const [recentEmojis, setRecentEmojis] = useState<string[]>([])
  const [customEmojiSets, setCustomEmojiSets] = useState<StickerSetItem[]>([])
  const [cachedEmojiSetDetails, setCachedEmojiSetDetails] = useState<Record<string, StickerSetItem>>({})
  const [activeEmojiSetId, setActiveEmojiSetId] = useState<string | null>(null)
  const [loadingEmojiSets, setLoadingEmojiSets] = useState(false)

  // Sticker state
  const [stickerSets, setStickerSets] = useState<StickerSetItem[]>([])
  const [activeStickerSetId, setActiveStickerSetId] = useState<string | null>('recent')
  const [cachedStickerSetDetails, setCachedStickerSetDetails] = useState<Record<string, StickerSetItem>>({})
  const [recentStickers, setRecentStickers] = useState<StickerItem[]>([])
  const [loadingStickerSets, setLoadingStickerSets] = useState(false)
  const [loadingStickerDetails, setLoadingStickerDetails] = useState(false)

  // GIF state
  const [savedGifs, setSavedGifs] = useState<StickerItem[]>([])
  const [loadingGifs, setLoadingGifs] = useState(false)

  // Load recent emojis from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('guidegram_recent_emojis')
      if (saved) setRecentEmojis(JSON.parse(saved))
    } catch (_) {}
  }, [])

  const handlePickEmoji = (emoji: string) => {
    onSelectEmoji(emoji)
    setRecentEmojis((prev) => {
      const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, 32)
      try {
        localStorage.setItem('guidegram_recent_emojis', JSON.stringify(next))
      } catch (_) {}
      return next
    })
  }

  // 1. Fetch Installed Custom Emoji Packs for the Telegram Account
  useEffect(() => {
    if (!isOpen || !accountId || activeTab !== 'emoji') return
    if (customEmojiSets.length > 0) return

    setLoadingEmojiSets(true)
    if (window.guidegram?.getInstalledEmojiSets) {
      window.guidegram
        .getInstalledEmojiSets(accountId)
        .then((sets) => {
          setCustomEmojiSets(sets || [])
          if (sets && sets.length > 0 && !activeEmojiSetId) {
            setActiveEmojiSetId(sets[0].id)
          }
        })
        .catch(() => {})
        .finally(() => setLoadingEmojiSets(false))
    }
  }, [isOpen, accountId, activeTab, customEmojiSets.length])

  // Load details for top custom emoji packs
  useEffect(() => {
    if (!isOpen || !accountId || customEmojiSets.length === 0) return
    const targetSets = customEmojiSets.slice(0, 6)
    targetSets.forEach((set) => {
      if (cachedEmojiSetDetails[set.id]) return
      if (window.guidegram?.getStickerSet) {
        window.guidegram.getStickerSet(accountId, set.id, set.accessHash).then((res) => {
          if (res) {
            setCachedEmojiSetDetails((prev) => ({ ...prev, [set.id]: res }))
          }
        }).catch(() => {})
      }
    })
  }, [isOpen, accountId, customEmojiSets, cachedEmojiSetDetails])

  // Load active custom emoji pack details if not loaded
  useEffect(() => {
    if (!isOpen || !accountId || !activeEmojiSetId || activeEmojiSetId === 'standard') return
    if (cachedEmojiSetDetails[activeEmojiSetId]) return

    const target = customEmojiSets.find((s) => s.id === activeEmojiSetId)
    if (!target) return

    if (window.guidegram?.getStickerSet) {
      window.guidegram.getStickerSet(accountId, target.id, target.accessHash).then((res) => {
        if (res) {
          setCachedEmojiSetDetails((prev) => ({ ...prev, [activeEmojiSetId]: res }))
        }
      }).catch(() => {})
    }
  }, [isOpen, accountId, activeEmojiSetId, customEmojiSets, cachedEmojiSetDetails])

  // 2. Fetch Installed Sticker Packs & Recent Stickers
  useEffect(() => {
    if (!isOpen || !accountId || activeTab !== 'stickers') return

    // Load recent stickers
    if (recentStickers.length === 0 && window.guidegram?.getRecentStickers) {
      window.guidegram.getRecentStickers(accountId).then((list) => {
        if (list) setRecentStickers(list)
      }).catch(() => {})
    }

    // Load installed sticker packs
    if (stickerSets.length === 0 && window.guidegram?.getInstalledStickerSets) {
      setLoadingStickerSets(true)
      window.guidegram
        .getInstalledStickerSets(accountId)
        .then((list) => {
          setStickerSets(list || [])
          if (list && list.length > 0 && !activeStickerSetId) {
            setActiveStickerSetId('recent')
          }
        })
        .catch(() => {})
        .finally(() => setLoadingStickerSets(false))
    }
  }, [isOpen, accountId, activeTab, stickerSets.length, recentStickers.length])

  // Load active sticker pack details
  useEffect(() => {
    if (!isOpen || !accountId || !activeStickerSetId || activeStickerSetId === 'recent') return
    if (cachedStickerSetDetails[activeStickerSetId]) return

    const targetSet = stickerSets.find((s) => s.id === activeStickerSetId)
    if (!targetSet) return

    setLoadingStickerDetails(true)
    if (window.guidegram?.getStickerSet) {
      window.guidegram
        .getStickerSet(accountId, targetSet.id, targetSet.accessHash)
        .then((detailed) => {
          if (detailed) {
            setCachedStickerSetDetails((prev) => ({ ...prev, [activeStickerSetId]: detailed }))
          }
        })
        .catch(() => {})
        .finally(() => setLoadingStickerDetails(false))
    }
  }, [isOpen, accountId, activeStickerSetId, stickerSets, cachedStickerSetDetails])

  // 3. Fetch Saved GIFs
  useEffect(() => {
    if (!isOpen || !accountId || activeTab !== 'gifs') return
    if (savedGifs.length > 0) return

    setLoadingGifs(true)
    if (window.guidegram?.getSavedGifs) {
      window.guidegram
        .getSavedGifs(accountId)
        .then((gifs) => {
          setSavedGifs(gifs || [])
        })
        .catch(() => {})
        .finally(() => setLoadingGifs(false))
    }
  }, [isOpen, accountId, activeTab, savedGifs.length])

  if (!isOpen) return null

  // Active sticker set details
  const activeStickerSet = stickerSets.find((s) => s.id === activeStickerSetId)
  const currentStickers = activeStickerSetId && activeStickerSetId !== 'recent'
    ? cachedStickerSetDetails[activeStickerSetId]?.stickers || []
    : []

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 16 }}
      transition={{ type: 'spring', damping: 25, stiffness: 380 }}
      className="absolute bottom-16 left-4 z-40 w-80 sm:w-[420px] h-[480px] rounded-2xl bg-dark-900/95 border border-white/10 shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header with Telegram-style Navigation Tabs (Emoji | Stickers | GIFs) */}
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
          TAB 1: EMOJI (Real Telegram Premium Custom Emojis + Standard)
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

          {/* Emoji Content Area */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 scrollbar-thin">
            {/* 1. Installed Custom Emoji Packs */}
            {customEmojiSets.length > 0 && !searchQuery && (
              <div className="space-y-4">
                {customEmojiSets.map((pack) => {
                  const details = cachedEmojiSetDetails[pack.id]
                  const emojis = details?.stickers || []
                  if (activeEmojiSetId && activeEmojiSetId !== 'standard' && activeEmojiSetId !== pack.id) {
                    return null
                  }
                  return (
                    <div key={pack.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-300/90 px-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                          <span className="truncate">{pack.title}</span>
                          <span className="text-[10px] text-gray-400 font-normal">({pack.count})</span>
                        </div>
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                          PREMIUM
                        </span>
                      </div>

                      {emojis.length > 0 ? (
                        <div className="grid grid-cols-8 gap-1">
                          {emojis.map((stk) => (
                            <MediaItemThumbnail
                              key={stk.id}
                              accountId={accountId}
                              item={stk}
                              sizeClass="w-9 h-9 sm:w-10 sm:h-10 p-1"
                              onClick={() => {
                                handlePickEmoji(stk.emoticon || '⭐')
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 text-center text-[11px] text-gray-500 flex items-center justify-center gap-2">
                          <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                          <span>Loading custom emojis...</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* 2. Recently Used Unicode Emojis */}
            {recentEmojis.length > 0 && !searchQuery && (
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

            {/* 3. Categorized Standard Unicode Emojis */}
            {(activeEmojiSetId === 'standard' || !activeEmojiSetId || customEmojiSets.length === 0 || searchQuery) && (
              <div className="space-y-4">
                {EMOJI_CATEGORIES.map((cat) => {
                  const filtered = searchQuery
                    ? cat.emojis.filter((e) => e.includes(searchQuery))
                    : cat.emojis
                  if (filtered.length === 0) return null
                  return (
                    <div key={cat.id}>
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                        <span className="text-[10px] text-gray-500 font-normal">({filtered.length})</span>
                      </div>
                      <div className="grid grid-cols-8 gap-1">
                        {filtered.map((emoji, idx) => (
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
                  )
                })}
              </div>
            )}
          </div>

          {/* Bottom Dock for Custom Emoji Packs (Matching Telegram Desktop) */}
          {customEmojiSets.length > 0 && (
            <div className="p-2 border-t border-white/5 bg-dark-950 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveEmojiSetId('standard')}
                className={`h-9 w-9 rounded-xl transition-all flex items-center justify-center text-base cursor-pointer shrink-0 border ${
                  activeEmojiSetId === 'standard'
                    ? 'bg-primary-600/30 border-primary-500/50 scale-105'
                    : 'bg-white/5 border-transparent hover:bg-white/10'
                }`}
                title="Standard Emojis"
              >
                😀
              </button>

              {customEmojiSets.map((pack) => (
                <PackCoverIcon
                  key={pack.id}
                  accountId={accountId}
                  set={pack}
                  isSelected={activeEmojiSetId === pack.id}
                  onClick={() => setActiveEmojiSetId(pack.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 2: STICKERS (Recently Used + Real Installed Packs Dock)
          ========================================================= */}
      {activeTab === 'stickers' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Active Pack Title & Info */}
          <div className="px-3.5 py-2 border-b border-white/5 flex items-center justify-between text-xs bg-dark-850/40">
            <div className="flex items-center gap-2">
              {activeStickerSetId === 'recent' ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-accent-cyan" />
                  <span className="font-semibold text-white">Recently Used Stickers</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5 text-accent-cyan" />
                  <span className="font-semibold text-white truncate max-w-[200px]">
                    {activeStickerSet?.title || 'Sticker Packs'}
                  </span>
                  {activeStickerSet && (
                    <span className="text-[10px] text-gray-400">({activeStickerSet.count})</span>
                  )}
                </>
              )}
            </div>
            {loadingStickerSets && (
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <RefreshCw className="w-3 h-3 animate-spin text-accent-cyan" />
                <span>Syncing...</span>
              </div>
            )}
          </div>

          {/* Stickers Grid */}
          <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
            {/* When Recently Used is selected */}
            {activeStickerSetId === 'recent' ? (
              <div className="space-y-4">
                {recentStickers.length > 0 ? (
                  <div>
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-accent-cyan" />
                      <span>Recent Stickers ({recentStickers.length})</span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 justify-items-center">
                      {recentStickers.map((stk) => (
                        <MediaItemThumbnail
                          key={stk.id}
                          accountId={accountId}
                          item={stk}
                          onClick={() => {
                            onSelectSticker(stk)
                            onClose()
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-xs text-gray-500">
                    No recent stickers yet. Pick a sticker pack from below!
                  </div>
                )}
              </div>
            ) : loadingStickerDetails ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin text-accent-cyan" />
                <span className="text-xs">Loading pack stickers...</span>
              </div>
            ) : currentStickers.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 justify-items-center">
                {currentStickers.map((stk) => (
                  <MediaItemThumbnail
                    key={stk.id}
                    accountId={accountId}
                    item={stk}
                    onClick={() => {
                      onSelectSticker(stk)
                      onClose()
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-gray-500">
                {loadingStickerSets ? 'Fetching sticker sets...' : 'No stickers in this pack.'}
              </div>
            )}
          </div>

          {/* Bottom Dock with Real Pack Covers (Matching Telegram Desktop) */}
          <div className="p-2 border-t border-white/5 bg-dark-950 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {/* Clock button for Recently Used */}
            <button
              type="button"
              onClick={() => setActiveStickerSetId('recent')}
              className={`h-9 w-9 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0 border ${
                activeStickerSetId === 'recent'
                  ? 'bg-accent-cyan/20 border-accent-cyan/60 text-accent-cyan shadow-sm shadow-accent-cyan/20 scale-105'
                  : 'bg-white/5 border-transparent text-gray-400 hover:text-white hover:bg-white/10'
              }`}
              title="Recently Used"
            >
              <Clock className="w-4 h-4" />
            </button>

            {/* Pack Covers */}
            {stickerSets.map((set) => (
              <PackCoverIcon
                key={set.id}
                accountId={accountId}
                set={set}
                isSelected={activeStickerSetId === set.id}
                onClick={() => setActiveStickerSetId(set.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: GIFS (Telegram MTProto Saved GIFs)
          ========================================================= */}
      {activeTab === 'gifs' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* GIFs Header */}
          <div className="px-3.5 py-2 border-b border-white/5 flex items-center justify-between text-xs bg-dark-850/40">
            <div className="flex items-center gap-2">
              <Film className="w-3.5 h-3.5 text-primary-400" />
              <span className="font-semibold text-white">Saved GIFs</span>
              {savedGifs.length > 0 && (
                <span className="text-[10px] text-gray-400">({savedGifs.length})</span>
              )}
            </div>
            {loadingGifs && (
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <RefreshCw className="w-3 h-3 animate-spin text-primary-400" />
                <span>Loading saved GIFs...</span>
              </div>
            )}
          </div>

          {/* Saved GIFs Grid */}
          <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
            {loadingGifs && savedGifs.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin text-primary-400" />
                <span className="text-xs">Fetching your saved GIFs from Telegram...</span>
              </div>
            ) : savedGifs.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {savedGifs.map((gif) => (
                  <GifItemCard
                    key={gif.id}
                    accountId={accountId}
                    item={gif}
                    onClick={() => {
                      if (onSelectGif) {
                        onSelectGif(gif)
                      }
                      onClose()
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400 text-xs text-center px-4">
                <Flame className="w-8 h-8 text-primary-400/50" />
                <div>
                  <p className="font-semibold text-gray-300">No Saved GIFs Found</p>
                  <p className="text-[11px] text-gray-500 mt-1 max-w-[240px]">
                    Right-click any animated GIF in Telegram and select "Save to GIFs" to see it here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
