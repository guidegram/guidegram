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

/**
 * Native Electron & Web API Image Copy Helper
 * Supports blobs, data URLs, guidegram-media URLs, and local files
 */
export async function copyImageToClipboard(imageUrl: string): Promise<boolean> {
  if (!imageUrl) return false

  // 1. Electron Native IPC
  if (window.guidegram?.copyImageToClipboard) {
    try {
      if (imageUrl.startsWith('data:image/')) {
        const ok = await window.guidegram.copyImageToClipboard({ dataUrl: imageUrl })
        if (ok) return true
      } else if (
        imageUrl.startsWith('guidegram-media://') ||
        imageUrl.includes(':\\') ||
        imageUrl.startsWith('/') ||
        imageUrl.startsWith('file://')
      ) {
        const ok = await window.guidegram.copyImageToClipboard({ filePath: imageUrl })
        if (ok) return true
      }
    } catch (_) {}
  }

  // 2. Web Clipboard API (Blob)
  try {
    const res = await fetch(imageUrl)
    const blob = await res.blob()
    const pngBlob = blob.type === 'image/png' ? blob : await convertBlobToPng(blob)
    if (navigator?.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob })
      ])
      return true
    }
  } catch (_) {}

  // 3. Fallback: Draw to canvas and send dataUrl to Electron
  try {
    const dataUrl = await imageUrlToPngDataUrl(imageUrl)
    if (window.guidegram?.copyImageToClipboard) {
      const ok = await window.guidegram.copyImageToClipboard({ dataUrl })
      if (ok) return true
    }
  } catch (_) {}

  return false
}

function convertBlobToPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const objUrl = URL.createObjectURL(blob)
    img.onload = () => {
      URL.revokeObjectURL(objUrl)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas context failed'))
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Blob conversion failed'))), 'image/png')
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(objUrl)
      reject(e)
    }
    img.src = objUrl
  })
}

function imageUrlToPngDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas context failed'))
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = url
  })
}
