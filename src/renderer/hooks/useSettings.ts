import { useState, useEffect } from 'react'
import type { Settings } from '@shared/types'

export function useSettings(): Settings | null {
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    // Initial fetch
    window.electronAPI.getSettings().then(setSettings)

    // Subscribe to changes
    const unsubscribe = window.electronAPI.onSettingsChanged(setSettings)
    return unsubscribe
  }, [])

  return settings
}
