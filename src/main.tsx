import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

// Global window unhandled error listener
window.addEventListener('error', (event) => {
  console.error('[Global Error Listener]', event.error || event.message)
  try {
    window.guidegram?.logError?.(
      `[Window Error] ${event.message}`,
      event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`
    )
  } catch (_) {}
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global Unhandled Rejection]', event.reason)
  try {
    const reasonStr = event.reason instanceof Error ? event.reason.stack : String(event.reason)
    window.guidegram?.logError?.(
      `[Unhandled Promise Rejection] ${event.reason?.message || event.reason}`,
      reasonStr
    )
  } catch (_) {}
})

import { I18nProvider } from './i18n'
import { initFontManager } from './utils/fontManager'

// Initialize offline/cached font manager
initFontManager().catch((err) => console.warn('[FontManager] init failed:', err))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
