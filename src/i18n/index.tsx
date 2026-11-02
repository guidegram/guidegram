import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { Language, translations } from './translations'

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>, fallback?: string) => string
  isRTL: boolean
  formatNumber: (n: number | string) => string
  formatSendersCount: (count: number) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('guidegram_language') as Language
      if (saved === 'en' || saved === 'fa') return saved
    } catch (_) {}
    return 'en' // default
  })

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    try {
      localStorage.setItem('guidegram_language', lang)
    } catch (_) {}
  }

  const isRTL = language === 'fa'

  useEffect(() => {
    document.documentElement.setAttribute('lang', language)
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr')
    if (isRTL) {
      document.body.classList.add('font-persian')
      document.body.classList.remove('font-latin')
    } else {
      document.body.classList.add('font-latin')
      document.body.classList.remove('font-persian')
    }
  }, [language, isRTL])

  const t = (key: string, params?: Record<string, string | number>, fallback?: string): string => {
    const dict = translations[language] || translations.en
    let str = dict[key] || translations.en[key]

    if (!str) {
      return fallback !== undefined ? fallback : ''
    }

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      }
    }
    return str
  }

  // Convert numbers to Persian digits if in Persian mode
  const formatNumber = (n: number | string): string => {
    const str = String(n)
    if (!isRTL) return str
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
    return str.replace(/\d/g, (d) => persianDigits[parseInt(d, 10)])
  }

  const formatSendersCount = (count: number): string => {
    if (count <= 1) return t('chat.sender_count_single')
    return t('chat.sender_count_multiple', { count: formatNumber(count) })
  }

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      isRTL,
      formatNumber,
      formatSendersCount,
    }),
    [language, isRTL]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = (): I18nContextType => {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    // Fallback safe context if used outside provider
    return {
      language: 'en',
      setLanguage: () => {},
      t: (k: string) => k,
      isRTL: false,
      formatNumber: (n) => String(n),
      formatSendersCount: (c) => `${c} people`,
    }
  }
  return ctx
}
