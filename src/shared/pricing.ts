import * as fs from 'fs'
import * as path from 'path'
import { CACHE_DIR, FALLBACK_PRICING, LITELLM_PRICING_URL, PRICING_CACHE_TTL_MS } from './constants'
import type { ModelCosts } from './constants'

let pricingCache: Record<string, ModelCosts> | null = null

function getCanonicalName(model: string): string {
  return model.replace(/@.*$/, '').replace(/-\d{8}$/, '')
}

function getCachePath(): string {
  return path.join(CACHE_DIR, 'litellm-pricing.json')
}

async function fetchAndCachePricing(): Promise<Record<string, ModelCosts>> {
  const cachePath = getCachePath()

  // Check cache
  try {
    const stat = fs.statSync(cachePath)
    if (Date.now() - stat.mtimeMs < PRICING_CACHE_TTL_MS) {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
      return cached
    }
  } catch {
    // No cache or expired
  }

  // Fetch from LiteLLM
  try {
    const response = await fetch(LITELLM_PRICING_URL)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json() as Record<string, {
      input_cost_per_token?: number
      output_cost_per_token?: number
      cache_creation_input_token_cost?: number
      cache_read_input_token_cost?: number
    }>

    const pricing: Record<string, ModelCosts> = {}
    for (const [model, info] of Object.entries(data)) {
      if (info.input_cost_per_token != null && info.output_cost_per_token != null) {
        pricing[model] = {
          inputCostPerToken: info.input_cost_per_token,
          outputCostPerToken: info.output_cost_per_token,
          cacheWriteCostPerToken: info.cache_creation_input_token_cost ?? info.input_cost_per_token * 1.25,
          cacheReadCostPerToken: info.cache_read_input_token_cost ?? info.input_cost_per_token * 0.1,
          webSearchCostPerRequest: 0.01,
          fastMultiplier: 1,
        }
      }
    }

    // Write cache
    fs.mkdirSync(CACHE_DIR, { recursive: true })
    fs.writeFileSync(cachePath, JSON.stringify(pricing))
    return pricing
  } catch {
    return {}
  }
}

export async function initPricing(): Promise<void> {
  const fetched = await fetchAndCachePricing()
  pricingCache = { ...fetched }
}

export function getModelCosts(model: string): ModelCosts {
  const canonical = getCanonicalName(model)

  // 1. Exact match in fallback (these have correct fastMultiplier)
  if (FALLBACK_PRICING[canonical]) {
    const fallback = FALLBACK_PRICING[canonical]
    if (pricingCache?.[canonical]) {
      return { ...pricingCache[canonical], fastMultiplier: fallback.fastMultiplier }
    }
    return fallback
  }

  // 2. Exact match in LiteLLM cache
  if (pricingCache?.[canonical]) {
    return pricingCache[canonical]
  }

  // 3. Prefix match in fallback
  for (const [key, costs] of Object.entries(FALLBACK_PRICING)) {
    if (canonical.startsWith(key)) return costs
  }

  // 4. Prefix match in LiteLLM
  if (pricingCache) {
    for (const [key, costs] of Object.entries(pricingCache)) {
      if (canonical.startsWith(key)) return costs
    }
  }

  // 5. Default to Sonnet pricing
  return FALLBACK_PRICING['claude-sonnet-4-6']
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens: number,
  cacheReadTokens: number,
  webSearchRequests: number,
  speed: 'standard' | 'fast' = 'standard',
): number {
  const costs = getModelCosts(model)
  const multiplier = speed === 'fast' ? costs.fastMultiplier : 1

  return multiplier * (
    inputTokens * costs.inputCostPerToken +
    outputTokens * costs.outputCostPerToken +
    cacheCreationTokens * costs.cacheWriteCostPerToken +
    cacheReadTokens * costs.cacheReadCostPerToken +
    webSearchRequests * costs.webSearchCostPerRequest
  )
}
