import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Sparkles, ShieldCheck, Zap, Shield, Smartphone, ArrowRight, ArrowLeft, X, Minimize2, ExternalLink } from 'lucide-react'
import { useI18n } from '../i18n'

interface WhatsNewModalProps {
  isOpen: boolean
  version: string
  onClose: () => void
}

// Helper to safely parse and compare semver versions
function parseSemver(ver: string): [number, number, number] {
  const parts = ver.replace(/^v/, '').split('.').map((p) => parseInt(p, 10) || 0)
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0]
}

function gte(v1: string, v2: string): boolean {
  const [a1, b1, c1] = parseSemver(v1)
  const [a2, b2, c2] = parseSemver(v2)
  if (a1 !== a2) return a1 > a2
  if (b1 !== b2) return b1 > b2
  return c1 >= c2
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({
  isOpen,
  version,
  onClose,
}) => {
  const { t, isRTL } = useI18n()

  if (!isOpen) return null

  // Version-aware feature resolution:
  // Dynamically showcase the actual highlights of the updated version instead of static fallback items.
  const getVersionFeatures = (ver: string) => {
    const cleanVer = ver.replace(/^v/, '').trim()

    // v2.5.4: Telegram Bot Parity, Custom Button Colors & Emojis, Passcode Security & Smart Context Menus
    if (gte(cleanVer, '2.5.4')) {
      return [
        {
          icon: Sparkles,
          bgColor: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
          title: isRTL ? 'تطابق کامل رابط ربات‌ها با تلگرام رسمی' : 'Official Telegram Bot & UI Parity',
          desc: isRTL
            ? 'پشتیبانی از رنگ دکمه‌های شیشه‌ای و چسبیده (سبز، قرمز، آبی)، آیکون ایموجی‌های پرمیوم در دکمه‌ها و متن، و منوی دستورات در لایه رویی با ساپورت RTL.'
            : 'Full support for Layer 180+ bot button colors (success, danger, primary), custom emoji icons in buttons, and accessible top-layer bot command menu drawer.',
        },
        {
          icon: ShieldCheck,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: isRTL ? 'قفل اختصاصی برنامه و رمز عبور اصلی' : 'Master Passcode & Instant Lock Screen',
          desc: isRTL
            ? 'امنیت کامل گفتگوها با قفل پس‌کد، فعال‌سازی سریع از طریق آیکون قفل در نوار عنوان، و قفل خودکار در صورت عدم فعالیت.'
            : 'Complete session protection with master passcode, titlebar padlock quick-lock trigger, and auto-lock screen safeguards.',
        },
        {
          icon: Zap,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          title: isRTL ? 'تایپ زنده ربات‌ها، درگ سلکت و منوی هوشمند چت' : 'Reactive Bot Streaming, Drag-to-Select & Smart Actions',
          desc: isRTL
            ? 'رندر بلادرنگ تایپ استریمینگ ربات‌ها، انتخاب متن به سبک تلگرام دسکتاپ، و گزینه‌های نمایش در پوشه، باز کردن فایل و کپی نام فایل.'
            : 'Live reactive rendering for streaming bot edits, official tDesktop drag-to-select, and smart context menu actions.',
        },
      ]
    }

    // v2.5.3: Ultra-Low Memory, Profile Photo Carousel, Custom Emoji ID & Zero-Idle GPU
    if (gte(cleanVer, '2.5.3')) {
      return [
        {
          icon: Zap,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          title: isRTL ? 'کاهش ۹۵٪ مصرف رم با معماری چت فعال منفرد' : 'Ultra-Low Memory & Single Active Chat Parity',
          desc: isRTL
            ? 'تطابق کامل با تلگرام دسکتاپ رسمی با نگهداری فقط چت فعال در رم، تخلیه خودکار کش پس‌زمینه و کاهش ۹۵٪ حجم لاگ‌های ادیت و دیلیت.'
            : 'Official Telegram Desktop parity by maintaining only the active chat in memory, auto-evicting background cache, and reducing audit log overhead by 95%.',
        },
        {
          icon: ShieldCheck,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: isRTL ? 'تاریخچه نامحدود ادیت‌ها و کنترل اختصاصی چت‌ها' : 'Unlimited Edit History & Granular Tracking',
          desc: isRTL
            ? 'ثبت تمام نسخه‌های ویرایش‌شده پیام، تفکیک مستقل ردگیری پیام‌های دیلیت/ادیت در پی‌وی، گروه‌ها و کانال‌ها با سقف عددی سفارشی.'
            : 'Track complete revision history per message with dedicated tracking scopes and adjustable limits for Private Chats, Groups, and Channels.',
        },
        {
          icon: Sparkles,
          bgColor: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
          title: isRTL ? 'گالری چندعکس پروفایل، کپی شناسه ایموجی و خواب گرافیک' : 'Multi-Photo Gallery, Emoji ID & GPU Sleep',
          desc: isRTL
            ? 'مشاهده تمام عکس‌های پروفایل کاربران در گالری ورق‌زن، کپی شناسه ایموجی‌های پریمیوم، بهینه‌سازی کامل گرافیک و اصلاح پنجره امکانات جدید.'
            : 'Browse full profile photo history in a carousel gallery, copy custom emoji IDs, native GPU occlusion sleep, and dynamic version highlights.',
        },
      ]
    }

    // v2.5.1: Multi-Window Parallel Accounts, Outer Dock Badges & Instant Pre-Warming
    if (gte(cleanVer, '2.5.1')) {
      return [
        {
          icon: Sparkles,
          bgColor: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
          title: isRTL ? 'پشتیبانی از چند پنجره همزمان برای اکانت‌ها' : 'Multi-Window Parallel Account Workspaces',
          desc: isRTL
            ? 'امکان باز کردن حساب‌های کاربری در پنجره‌های مستقل و همزمان با فرآیند رندرینگ ایزوله و نوار وظیفه اختصاصی.'
            : 'Open multiple accounts simultaneously in dedicated standalone windows with isolated rendering contexts and custom taskbar badges.',
        },
        {
          icon: Zap,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          title: isRTL ? 'بج اعلان هوشمند روی داک و تسک‌بار' : 'Dynamic Dock Badges & Taskbar Parity',
          desc: isRTL
            ? 'نمایش تعداد پیام‌های خوانده‌نشده هر اکانت روی آیکون نوار وظیفه و داک با به‌روزرسانی آنی.'
            : 'Accurate unread notification badge counts rendered directly on the taskbar icon and dock with zero latency.',
        },
        {
          icon: ShieldCheck,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: isRTL ? 'پیش‌گرمایش نشست‌ها و ورود فوق‌سریع' : 'Zero-Freeze Session Pre-Warming',
          desc: isRTL
            ? 'بارگذاری موازی سشن‌ها و سوکت‌های فعال در بک‌گراند برای سوییچ فوری و بدون تأخیر بین اکانت‌ها.'
            : 'Background session and socket pre-warming engine for instantaneous account switching with zero frame drops.',
        },
      ]
    }

    // v2.5.0: Native WebRTC Voice & Video Calling & Turbo Multi-DC Media Pipeline
    if (gte(cleanVer, '2.5.0')) {
      return [
        {
          icon: Sparkles,
          bgColor: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
          title: isRTL ? 'تماس صوتی و تصویری نیتیو WebRTC' : 'Native WebRTC Voice & Video Calling',
          desc: isRTL
            ? 'برقراری تماس‌های صوتی و تصویری با کیفیت بالا، رمزنگاری نقطه به نقطه و حداقل تأخیر در شبکه.'
            : 'Full end-to-end encrypted high-fidelity voice and video calls powered by native WebRTC integration.',
        },
        {
          icon: Zap,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          title: isRTL ? 'موتور دانلود توربو و چند مسیره فایل‌ها' : 'Turbo Multi-DC Media Pipeline',
          desc: isRTL
            ? 'دانلود چند مسیره و همزمان فایل‌های حجیم، ویدیوها و اسناد با حداکثر پهنای باند و بدون افت سرعت.'
            : 'High-speed multi-part parallel chunk downloading across Telegram DCs with zero buffer bottlenecks.',
        },
        {
          icon: ShieldCheck,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: isRTL ? 'انیمیشن‌های ستاره‌ای و هدایای تعاملی' : 'Interactive Telegram Star Gifts & 3D Visuals',
          desc: isRTL
            ? 'مشاهده و ارسال هدایای ستاره‌ای تلگرام با افکت‌های نوری سه‌بعدی و انیمیشن‌های روان فیزیک‌محور.'
            : 'Full support for sending and viewing Telegram Star Gifts with rich interactive 3D particle animations.',
        },
      ]
    }

    // v2.4.6: Session Tamper Guard & Data Shield Mirroring
    if (gte(cleanVer, '2.4.6')) {
      return [
        {
          icon: ShieldCheck,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: isRTL ? 'سپر امنیتی ضد دستکاری نشست‌ها' : 'Session Tamper Guard & Data Shield',
          desc: isRTL
            ? 'محافظت سخت‌افزاری و ایزوله‌سازی سشن‌ها برای جلوگیری از خروج ناخواسته یا تداخل در حالت پرتابل.'
            : 'Hardware-isolated session protection and atomic data mirroring to prevent unexpected session termination.',
        },
        {
          icon: Zap,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          title: isRTL ? 'پایداری اتصال در نوسانات شدید اینترنت' : 'Deep MTProto Reconnect Resilience',
          desc: isRTL
            ? 'اتصال مجدد خودکار و هوشمند در اختلالات شبکه بدون ایجاد تداخل یا قطع شدن ارتباط کاربر.'
            : 'Automatic socket health monitoring and silent reconnection fallback during heavy network disruptions.',
        },
        {
          icon: Sparkles,
          bgColor: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
          title: isRTL ? 'بهینه‌سازی مصرف حافظه و ذخیره‌سازی' : 'Zero-Leak Background Memory Management',
          desc: isRTL
            ? 'آزادسازی خودکار منابع پس‌زمینه و جلوگیری از انباشت کش پیام‌های غیرضروری.'
            : 'Automated background garbage collection and stale cache purging to maintain smooth performance.',
        },
      ]
    }

    // v2.4.1: Full-Width Kinetic Tabs, Mouse-Wheel Horizontal Scroll & Zero-Fake MTProto Parity
    if (gte(cleanVer, '2.4.1')) {
      return [
        {
          icon: Sparkles,
          bgColor: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
          title: isRTL ? 'تب‌های تمام‌عرض پوشه‌ها با اسکرول افقی ماوس' : 'Full-Width Kinetic Tabs & Mouse-Wheel Scroll',
          desc: isRTL
            ? 'تب‌های بالای صفحه حالا تمام عرض را پر کرده و با چرخش چرخ ماوس به نرمی اسکرول می‌شوند.'
            : 'Tabs now span the entire top header with seamless mouse-wheel horizontal navigation, zero vertical clipping, and instant folder switching.',
        },
        {
          icon: Zap,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          title: isRTL ? 'پاکسازی کامل داده‌های ساختگی و لایه ۲۲۹' : 'Zero-Fake & MTProto Layer 229 Hardening',
          desc: isRTL
            ? 'حذف کامل داده‌های فرضی، اتصال مستقیم به تنظیمات حریم خصوصی MTProto و آمار زنده بوست کانال‌ها.'
            : '100% purged mock data, deterministic transaction IDs, live MTProto privacy querying, and real channel boost statistics.',
        },
        {
          icon: ShieldCheck,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: isRTL ? 'رنگ‌بندی رسمی پروفایل و ناوبری خودکار' : 'Wired Interactive UI & Profile Color Parity',
          desc: isRTL
            ? 'تطابق کامل پالت رنگی مخاطبان با تلگرام رسمی، دیالوگ تغییر آواتار و دسترسی سریع به تنظیمات پروکسی.'
            : 'Avatar change dialog, proxy navigation shortcut, official Telegram peer color palettes, and automated chat navigation.',
        },
      ]
    }

    // v2.4.0: Universal Guidegram MCP Architecture, Online Radar, Star Gifts & Persian AI Search
    if (gte(cleanVer, '2.4.0')) {
      return [
        {
          icon: Sparkles,
          bgColor: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
          title: isRTL ? 'سرور جامع MCP و جستجوی هوشمند فارسی' : 'Universal MCP Server & Persian AI Engine',
          desc: isRTL
            ? 'پشتیبانی از دستیار هوش مصنوعی با ۲۱ ابزار عملیاتی، متدهای کامل لایه ۲۲۹ و جستجوی فازی نام‌ها و پیام‌های فارسی.'
            : '2-tier hybrid architecture with 21 high-level tools, full MTProto Layer 229 parity (859 methods), and fuzzy Persian name/message search.',
        },
        {
          icon: Zap,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          title: isRTL ? 'رادار آنلاین و تاریخچه تغییرات مخاطبان' : 'Online Radar & Contact Audit Timeline',
          desc: isRTL
            ? 'نمایش دقیق زمان آنلاین بودن، ثبت تغییرات نام و تصویر پروفایل مخاطبان و تاریخچه کامل فعالیت‌ها.'
            : 'Track exact user status, live online transitions, contact profile/name change histories, and Star Gifts with 3D orbit visuals.',
        },
        {
          icon: ShieldCheck,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: isRTL ? 'پخش پایدار صوت و استریم مدیا' : 'Hardened Media Streaming & Audio Fixes',
          desc: isRTL
            ? 'رفع نشت صدا در حالت بی‌صدا، سریال‌سازی امن مقادیر عددی بزرگ و تطابق شمارنده پیام‌های خوانده‌نشده.'
            : 'Muted audio leak protection, BigInt-safe MCP serialization, and unread counter bi-directional sync across all Telegram sessions.',
        },
      ]
    }

    // v2.2.0: Telegram Parity Attachments, Centered Channels, Clipboard Paste & TitleBar Hub
    if (gte(cleanVer, '2.2.0')) {
      return [
        {
          icon: Sparkles,
          bgColor: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
          title: isRTL ? 'منوی پیوست پیشرفته تلگرام' : 'Telegram Premium Attachment Suite',
          desc: isRTL
            ? 'منوی شناور پیوست با دسترسی سریع به تصاویر، اسناد، چک‌لیست‌ها، مقالات، موقعیت زنده، نظرسنجی و فایل صوتی.'
            : 'Docked popover right above the paperclip with Photos, Documents, Checklists, Articles, Live Location, Polls, and Audio.',
        },
        {
          icon: Zap,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          title: isRTL ? 'پست‌های وسط‌چین در کانال‌ها' : 'Centered Channel Feed & Dynamic Widths',
          desc: isRTL
            ? 'چینش شکیل و خوانای پست‌های کانال در مرکز صفحه و باز شدن فرم‌های ربات بدون فشردگی افقی.'
            : 'Channels now center posts beautifully with wide cards, while bot forms expand smoothly without horizontal compression.',
        },
        {
          icon: ShieldCheck,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: isRTL ? 'پیست مستقیم تصویر با کلید میانبر' : 'Clipboard Instant Paste & 60m Auto-Update',
          desc: isRTL
            ? 'ارسال مستقیم اسکرین‌شات‌ها با Ctrl+V، فعال‌سازی حالت روح با یک کلیک و به‌روزرسانی ایمن پس‌زمینه.'
            : 'Paste screenshots directly with Ctrl+V, toggle Ghost Mode with a single click, and enjoy hands-free zero-data-loss background updates.',
        },
      ]
    }

    // v2.1.0: Apple & Telegram iOS-Grade 50-Phase Visual & Fluid Motion Architecture
    if (gte(cleanVer, '2.1.0')) {
      return [
        {
          icon: Sparkles,
          bgColor: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
          title: isRTL ? 'انیمیشن‌ها و فیزیک سیال اپل و تلگرام' : 'Apple & Telegram Fluid Kinematics',
          desc: isRTL
            ? 'طراحی بصری پیشرفته با فیزیک فنری روان، جابجایی نرم بین تب‌ها و تعاملات میکرو دقیق.'
            : '50-phase comprehensive visual evolution with high-fidelity spring physics, shared layout tabs, and ultra-fluid micro-interactions.',
        },
        {
          icon: Zap,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          title: isRTL ? 'بازخورد لمسی و هپتیک دکمه‌ها' : 'Haptic Tactile Micro-Interactions',
          desc: isRTL
            ? 'فیدبک حسی در هنگام کلیک روی دکمه‌ها، پنجره‌ها، پلیرهای صوتی و تصویری و لیست گفتگوها.'
            : 'Tactile responsive feedback on all action buttons, dialogs, drawers, audio/video players, and unified inbox rows.',
        },
        {
          icon: ShieldCheck,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: isRTL ? 'سازگاری با پروتکل لایه ۲۲۹+' : 'MTProto Layer 229+ & Zero-Loss Vault',
          desc: isRTL
            ? 'پوشش کامل پروتکل تلگرام با امنیت فوق‌العاده سشن‌ها و پایپ‌لاین آنی دانلود رسانه‌ها.'
            : 'Complete Telegram protocol coverage with bulletproof session security and instant multi-DC media pipeline.',
        },
      ]
    }

    // v2.0.0: MTProto Layer 229+ Full Parity (859 Methods), Turbo Multi-DC Media Engine, Session Vault
    if (gte(cleanVer, '2.0.0')) {
      return [
        {
          icon: Zap,
          bgColor: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
          title: isRTL ? 'سازگاری کامل با لایه ۲۲۹ تلگرام' : 'MTProto Layer 229+ Full Parity',
          desc: isRTL
            ? 'پشتیبانی از ۸۵۹ متد پروتکل در ۲۸ بخش مختلف شامل کانال‌ها، استوری‌ها، پرداخت‌ها، ستاره‌ها و بات‌ها.'
            : 'Complete protocol parity with 859 methods connected across 28 namespaces (Channels, Stories, Payments, Stars, Bots & Security).',
        },
        {
          icon: ShieldCheck,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          title: isRTL ? 'موتور دانلود پرسرعت چند مسیره' : 'Turbo Multi-DC Media Engine',
          desc: isRTL
            ? 'دانلود آنی و با کیفیت اصلی تصاویر، ویدیوها و اسناد با ترجمه محلی ساختار فایل‌ها.'
            : 'Instant full-resolution download pipeline for photos, documents, and videos with native InputFileLocation translation.',
        },
        {
          icon: Sparkles,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: isRTL ? 'محافظت از نشست‌های چندگانه' : 'Multi-Account Session Vault',
          desc: isRTL
            ? 'حفظ پایدار و بدون خطای تمام اکانت‌های لاگین‌شده در مهاجرت‌ها و به‌روزرسانی‌های نرم‌افزار.'
            : 'Bulletproof portable deployment with automatic session preservation across all authenticated accounts.',
        },
      ]
    }

    // v1.11.5: Instant Window Restore, Taskbar Parity & Singleton Lock Stabilization
    if (cleanVer.startsWith('1.11.5')) {
      return [
        {
          icon: Minimize2,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          title: t('whatsnew.feat_window_restore_title'),
          desc: t('whatsnew.feat_window_restore_desc'),
        },
        {
          icon: Shield,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: t('whatsnew.feat_singleton_ipc_title'),
          desc: t('whatsnew.feat_singleton_ipc_desc'),
        },
        {
          icon: Smartphone,
          bgColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          title: t('whatsnew.feat_phone_2fa_title'),
          desc: t('whatsnew.feat_phone_2fa_desc'),
        },
      ]
    }

    // v1.11.4: Mobile 2FA resilience, smart tray close intercept & unread sync
    if (cleanVer.startsWith('1.11.4')) {
      return [
        {
          icon: Smartphone,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: t('whatsnew.feat_phone_2fa_title'),
          desc: t('whatsnew.feat_phone_2fa_desc'),
        },
        {
          icon: Minimize2,
          bgColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          title: t('whatsnew.feat_tray_close_title'),
          desc: t('whatsnew.feat_tray_close_desc'),
        },
        {
          icon: Zap,
          bgColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          title: t('whatsnew.feat_unread_sync_title'),
          desc: t('whatsnew.feat_unread_sync_desc'),
        },
      ]
    }

    // v1.11.3: Unread counter parity & MTProto read sync
    if (cleanVer.startsWith('1.11.3')) {
      return [
        {
          icon: Zap,
          bgColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          title: t('whatsnew.feat_unread_sync_title'),
          desc: t('whatsnew.feat_unread_sync_desc'),
        },
        {
          icon: Shield,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          title: t('whatsnew.feat_isolation_title'),
          desc: t('whatsnew.feat_isolation_desc'),
        },
        {
          icon: Smartphone,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          title: t('whatsnew.feat_login_title'),
          desc: t('whatsnew.feat_login_desc'),
        },
      ]
    }

    // General fallback
    return [
      {
        icon: Smartphone,
        bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        title: t('whatsnew.feat_phone_2fa_title'),
        desc: t('whatsnew.feat_phone_2fa_desc'),
      },
      {
        icon: Minimize2,
        bgColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        title: t('whatsnew.feat_tray_close_title'),
        desc: t('whatsnew.feat_tray_close_desc'),
      },
      {
        icon: Zap,
        bgColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        title: t('whatsnew.feat_unread_sync_title'),
        desc: t('whatsnew.feat_unread_sync_desc'),
      },
    ]
  }

  const features = getVersionFeatures(version)

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative w-full max-w-lg bg-[#0f141c]/95 border border-white/10 rounded-3xl p-6 md:p-7 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden"
      >
        {/* Background glow accents */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-accent-cyan/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-primary-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={onClose}
          className={`absolute top-5 ${isRTL ? 'left-5' : 'right-5'} p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer`}
          title={t('app.close')}
        >
          <X className="w-5 h-5" />
        </motion.button>

        {/* Header Badge & Title */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 via-accent-cyan to-emerald-400 flex items-center justify-center text-white shadow-[0_0_25px_rgba(14,165,233,0.4)] shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {t('whatsnew.title')}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/30">
                v{version}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {t('whatsnew.subtitle')}
            </p>
          </div>
        </div>

        {/* Zero Data Loss Guarantee Banner */}
        <div className="mb-5 p-3 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/20 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-[11.5px] leading-snug">
            <p className="font-semibold text-emerald-300">
              {t('whatsnew.data_safe_title')}
            </p>
            <p className="text-gray-400 mt-0.5 text-[10.5px]">
              {t('whatsnew.data_safe_desc')}
            </p>
          </div>
        </div>

        {/* Features List */}
        <div className="space-y-2.5 mb-6">
          <div className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-1 flex items-center justify-between">
            <span>{t('whatsnew.section_title')}</span>
          </div>

          {features.map((feat, idx) => {
            const Icon = feat.icon
            return (
              <motion.div
                whileHover={{ scale: 1.02, x: 2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                key={idx}
                className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 transition-colors flex items-start gap-3"
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${feat.bgColor}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="text-xs font-semibold text-gray-200">
                      {feat.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Action Button & Release Notes Link */}
        <div className="space-y-2.5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-primary-600 via-primary-500 to-accent-cyan hover:from-primary-500 hover:to-accent-cyan text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(59,130,246,0.35)] hover:shadow-[0_0_35px_rgba(14,165,233,0.5)] transition-all cursor-pointer group"
          >
            <span>{t('whatsnew.action_button')}</span>
            {isRTL ? (
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            ) : (
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            )}
          </motion.button>

          <a
            href={`https://github.com/guidegram/guidegram/releases`}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-1.5 text-[11px] text-gray-400 hover:text-primary-400 transition-colors py-1 cursor-pointer"
          >
            <span>{t('whatsnew.view_release_notes')}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </motion.div>
    </div>
  )
}
