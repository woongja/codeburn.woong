import type { CardConfig, CurrencyCode, LayoutSettings, Settings } from './types'

export const CLAUDE_PROJECTS_DIR = (() => {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  return `${home}/.claude/projects`
})()

export const CACHE_DIR = (() => {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  return `${home}/.cache/codeburn-monitor`
})()

export const LITELLM_PRICING_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json'

export const PRICING_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export const FILE_WATCH_COOLDOWN_MS = 10_000 // 10 seconds

export const WIDGET_SIZES = {
  small: 260,
  medium: 300,
  large: 360,
} as const

export const DEFAULT_CARDS: ReadonlyArray<CardConfig> = [
  { id: 'cost', enabled: true, order: 0 },
  { id: 'stats', enabled: true, order: 1 },
  { id: 'tokens', enabled: true, order: 2 },
  { id: 'models', enabled: true, order: 3 },
  { id: 'projects', enabled: true, order: 4 },
  { id: 'daily', enabled: true, order: 5 },
]

export const DEFAULT_LAYOUT: LayoutSettings = {
  cards: DEFAULT_CARDS,
  widgetSize: 'medium',
  opacity: 0.85,
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'circle',
  position: { x: -1, y: -1 }, // -1 = auto (bottom-right)
  period: 'today',
  currency: 'USD',
  autoStart: true,
  layout: DEFAULT_LAYOUT,
}

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  KRW: '₩',
  EUR: '€',
  JPY: '¥',
  GBP: '£',
  CNY: '¥',
}

export type ModelCosts = {
  readonly inputCostPerToken: number
  readonly outputCostPerToken: number
  readonly cacheWriteCostPerToken: number
  readonly cacheReadCostPerToken: number
  readonly webSearchCostPerRequest: number
  readonly fastMultiplier: number
}

export const FALLBACK_PRICING: Record<string, ModelCosts> = {
  'claude-opus-4-6':   { inputCostPerToken: 5e-6,   outputCostPerToken: 25e-6,  cacheWriteCostPerToken: 6.25e-6,  cacheReadCostPerToken: 0.5e-6,  webSearchCostPerRequest: 0.01, fastMultiplier: 6 },
  'claude-opus-4-5':   { inputCostPerToken: 5e-6,   outputCostPerToken: 25e-6,  cacheWriteCostPerToken: 6.25e-6,  cacheReadCostPerToken: 0.5e-6,  webSearchCostPerRequest: 0.01, fastMultiplier: 1 },
  'claude-sonnet-4-6': { inputCostPerToken: 3e-6,   outputCostPerToken: 15e-6,  cacheWriteCostPerToken: 3.75e-6,  cacheReadCostPerToken: 0.3e-6,  webSearchCostPerRequest: 0.01, fastMultiplier: 5 },
  'claude-sonnet-4-5': { inputCostPerToken: 3e-6,   outputCostPerToken: 15e-6,  cacheWriteCostPerToken: 3.75e-6,  cacheReadCostPerToken: 0.3e-6,  webSearchCostPerRequest: 0.01, fastMultiplier: 1 },
  'claude-haiku-4-5':  { inputCostPerToken: 1e-6,   outputCostPerToken: 5e-6,   cacheWriteCostPerToken: 1.25e-6,  cacheReadCostPerToken: 0.1e-6,  webSearchCostPerRequest: 0.01, fastMultiplier: 5 },
  'claude-3-5-haiku':  { inputCostPerToken: 0.8e-6, outputCostPerToken: 4e-6,   cacheWriteCostPerToken: 1e-6,     cacheReadCostPerToken: 0.08e-6, webSearchCostPerRequest: 0.01, fastMultiplier: 1 },
}

export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'claude-opus-4-6': 'Opus 4.6',
  'claude-opus-4-5': 'Opus 4.5',
  'claude-sonnet-4-6': 'Sonnet 4.6',
  'claude-sonnet-4-5': 'Sonnet 4.5',
  'claude-haiku-4-5': 'Haiku 4.5',
  'claude-3-5-haiku': 'Haiku 3.5',
}
