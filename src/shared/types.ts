// Token usage for a single API call
export type TokenUsage = {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly cacheCreationInputTokens: number
  readonly cacheReadInputTokens: number
}

// Raw JSONL entry from Claude Code session files
export type JournalEntry = {
  readonly type: string
  readonly uuid?: string
  readonly timestamp?: string
  readonly message?: {
    readonly id?: string
    readonly role: 'user' | 'assistant'
    readonly model?: string
    readonly content?: ReadonlyArray<ContentBlock> | string
    readonly usage?: {
      readonly input_tokens: number
      readonly output_tokens: number
      readonly cache_creation_input_tokens?: number
      readonly cache_read_input_tokens?: number
      readonly server_tool_use?: {
        readonly web_search_requests?: number
      }
      readonly speed?: 'standard' | 'fast'
    }
  }
  readonly [key: string]: unknown
}

export type ContentBlock =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'tool_use'; readonly name: string; readonly input: Record<string, unknown> }
  | { readonly type: string; readonly [key: string]: unknown }

// Parsed result for one API call
export type ParsedApiCall = {
  readonly model: string
  readonly usage: TokenUsage
  readonly costUSD: number
  readonly speed: 'standard' | 'fast'
  readonly timestamp: string
  readonly deduplicationKey: string
}

// Aggregated per-model stats
export type ModelBreakdown = {
  readonly model: string
  readonly displayName: string
  readonly calls: number
  readonly costUSD: number
  readonly tokens: TokenUsage
}

// Aggregated per-project stats
export type ProjectBreakdown = {
  readonly project: string
  readonly projectPath: string
  readonly costUSD: number
  readonly apiCalls: number
}

// Aggregated per-day stats
export type DailyBreakdown = {
  readonly date: string // YYYY-MM-DD
  readonly costUSD: number
  readonly apiCalls: number
}

// Aggregated stats for a fixed time window (used by limits card)
export type WindowStats = {
  readonly costUSD: number
  readonly apiCalls: number
  readonly oldestTimestamp: string | null // earliest call in the window (for reset countdown)
}

// Full usage data sent from main to renderer
export type UsageData = {
  readonly totalCostUSD: number
  readonly totalApiCalls: number
  readonly totalSessions: number
  readonly cacheHitPercent: number
  readonly tokens: TokenUsage
  readonly models: ReadonlyArray<ModelBreakdown>
  readonly projects: ReadonlyArray<ProjectBreakdown>
  readonly daily: ReadonlyArray<DailyBreakdown>
  // Always-current windows (independent of selected period)
  readonly last5h: WindowStats
  readonly last7d: WindowStats
}

// Claude subscription plan (rough estimates of API-equivalent cost limits)
export type Plan = 'free' | 'pro' | 'max5x' | 'max20x'

// Card IDs for layout editor
export type CardId = 'cost' | 'stats' | 'tokens' | 'models' | 'projects' | 'daily' | 'limits'

export type CardConfig = {
  readonly id: CardId
  readonly enabled: boolean
  readonly order: number
}

export type LayoutSettings = {
  readonly cards: ReadonlyArray<CardConfig>
  readonly widgetSize: 'small' | 'medium' | 'large'
  readonly opacity: number
}

export type WidgetMode = 'circle' | 'panel'
export type Period = 'today' | '7d' | '30d' | 'all'
export type CurrencyCode = 'USD' | 'KRW' | 'EUR' | 'JPY' | 'GBP' | 'CNY'
export type Language = 'ko' | 'en'

// Full settings stored in electron-store
export type Settings = {
  readonly mode: WidgetMode
  readonly position: { readonly x: number; readonly y: number }
  readonly period: Period
  readonly currency: CurrencyCode
  readonly autoStart: boolean
  readonly plan: Plan
  readonly language: Language
  readonly layout: LayoutSettings
}

// IPC API exposed via contextBridge
export type ElectronAPI = {
  readonly onUsageData: (callback: (data: UsageData) => void) => () => void
  readonly onSettingsChanged: (callback: (settings: Settings) => void) => () => void
  readonly changeMode: (mode: WidgetMode) => void
  readonly changePeriod: (period: Period) => void
  readonly changePlan: (plan: Plan) => void
  readonly changeLanguage: (lang: Language) => void
  readonly updateLayout: (layout: LayoutSettings) => void
  readonly windowDrag: (deltaX: number, deltaY: number) => void
  readonly savePosition: (x: number, y: number) => void
  readonly resizeWindow: (width: number, height: number) => void
  readonly getSettings: () => Promise<Settings>
  readonly getUsageData: () => Promise<UsageData>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
