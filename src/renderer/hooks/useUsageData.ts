import { useState, useEffect } from 'react'
import type { UsageData } from '@shared/types'

const emptyData: UsageData = {
  totalCostUSD: 0,
  totalApiCalls: 0,
  totalSessions: 0,
  cacheHitPercent: 0,
  tokens: { inputTokens: 0, outputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 },
  models: [],
  projects: [],
  daily: [],
}

export function useUsageData(): UsageData {
  const [data, setData] = useState<UsageData>(emptyData)

  useEffect(() => {
    // Initial fetch
    window.electronAPI.getUsageData().then(setData)

    // Subscribe to updates
    const unsubscribe = window.electronAPI.onUsageData(setData)
    return unsubscribe
  }, [])

  return data
}
