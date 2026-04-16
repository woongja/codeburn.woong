import { useCallback } from 'react'
import { t } from '@shared/i18n'
import type { Language } from '@shared/types'

export function useT(lang: Language) {
  return useCallback(
    (key: string, params?: Record<string, string | number>) => t(lang, key, params),
    [lang],
  )
}
