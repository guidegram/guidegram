export interface CopyClipboardOptions {
  isSensitive?: boolean
  ttlMs?: number
}

/**
 * Native Electron Clipboard copy helper with fallback
 */
export async function copyTextToClipboard(
  text: string,
  options?: CopyClipboardOptions
): Promise<boolean> {
  if (!text && text !== '') return false

  // 1. Primary: Native Electron Main Process via IPC (Bypasses Chromium focus constraints)
  if (window.guidegram?.copyToClipboard) {
    try {
      const ok = await window.guidegram.copyToClipboard(text, options)
      if (ok) return true
    } catch (_) {}
  }

  // 2. Secondary: Web Clipboard API
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (_) {}
  }

  // 3. Fallback: execCommand('copy')
  try {
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.focus()
    el.select()
    const success = document.execCommand('copy')
    document.body.removeChild(el)
    return success
  } catch (_) {
    return false
  }
}
