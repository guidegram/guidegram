/**
 * Guidegram Font Manager
 * Ensures Persian typography (Vazirmatn) is always available offline.
 * Checks local assets first; if unavailable, dynamically downloads from CDN,
 * caches in CacheStorage, and injects into document.fonts.
 */

const FONT_CACHE_NAME = 'guidegram-fonts-v1'

interface FontAsset {
  family: string
  weight: string
  style?: string
  localUrl: string
  cdnUrl: string
}

const VAZIRMATN_FONTS: FontAsset[] = [
  {
    family: 'Vazirmatn',
    weight: '400',
    localUrl: '/fonts/vazirmatn/Vazirmatn-Regular.woff2',
    cdnUrl: 'https://cdn.jsdelivr.net/npm/vazirmatn@33.0.3/fonts/webfonts/Vazirmatn-Regular.woff2',
  },
  {
    family: 'Vazirmatn',
    weight: '500',
    localUrl: '/fonts/vazirmatn/Vazirmatn-Medium.woff2',
    cdnUrl: 'https://cdn.jsdelivr.net/npm/vazirmatn@33.0.3/fonts/webfonts/Vazirmatn-Medium.woff2',
  },
  {
    family: 'Vazirmatn',
    weight: '600',
    localUrl: '/fonts/vazirmatn/Vazirmatn-SemiBold.woff2',
    cdnUrl: 'https://cdn.jsdelivr.net/npm/vazirmatn@33.0.3/fonts/webfonts/Vazirmatn-SemiBold.woff2',
  },
  {
    family: 'Vazirmatn',
    weight: '700',
    localUrl: '/fonts/vazirmatn/Vazirmatn-Bold.woff2',
    cdnUrl: 'https://cdn.jsdelivr.net/npm/vazirmatn@33.0.3/fonts/webfonts/Vazirmatn-Bold.woff2',
  },
]

export async function initFontManager(): Promise<void> {
  if (typeof window === 'undefined' || !('fonts' in document)) return

  try {
    const hasCache = 'caches' in window
    let cache: Cache | null = null
    if (hasCache) {
      try {
        cache = await caches.open(FONT_CACHE_NAME)
      } catch (_) {}
    }

    for (const font of VAZIRMATN_FONTS) {
      try {
        let fontBuffer: ArrayBuffer | null = null

        // 1. Try CacheStorage
        if (cache) {
          const cachedResponse = await cache.match(font.cdnUrl)
          if (cachedResponse && cachedResponse.ok) {
            fontBuffer = await cachedResponse.arrayBuffer()
          }
        }

        // 2. Try local app assets
        if (!fontBuffer) {
          try {
            const localRes = await fetch(font.localUrl)
            if (localRes.ok) {
              fontBuffer = await localRes.arrayBuffer()
              if (cache) {
                cache.put(
                  font.cdnUrl,
                  new Response(fontBuffer.slice(0), {
                    headers: { 'Content-Type': 'font/woff2' },
                  })
                )
              }
            }
          } catch (_) {}
        }

        // 3. Fallback: fetch from CDN and store in local cache
        if (!fontBuffer) {
          try {
            const cdnRes = await fetch(font.cdnUrl)
            if (cdnRes.ok) {
              fontBuffer = await cdnRes.arrayBuffer()
              if (cache) {
                cache.put(
                  font.cdnUrl,
                  new Response(fontBuffer.slice(0), {
                    headers: { 'Content-Type': 'font/woff2' },
                  })
                )
              }
            }
          } catch (_) {}
        }

        // If font buffer was retrieved, register FontFace dynamically
        if (fontBuffer) {
          const fontFace = new FontFace(font.family, fontBuffer, {
            weight: font.weight,
            style: font.style || 'normal',
            display: 'swap',
          })
          await fontFace.load()
          document.fonts.add(fontFace)
        }
      } catch (err) {
        console.warn(`[FontManager] Could not load font ${font.family} (${font.weight}):`, err)
      }
    }
  } catch (err) {
    console.warn('[FontManager] Initialization error:', err)
  }
}
