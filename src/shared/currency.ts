import * as fs from 'fs'
import * as path from 'path'
import { CACHE_DIR, CURRENCY_SYMBOLS } from './constants'
import type { CurrencyCode } from './types'

type CurrencyCache = {
  code: CurrencyCode
  rate: number
  fetchedAt: number
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
let activeRate: { code: CurrencyCode; rate: number } = { code: 'USD', rate: 1 }

function getCachePath(): string {
  return path.join(CACHE_DIR, 'exchange-rate.json')
}

function loadCachedRate(code: CurrencyCode): number | null {
  try {
    const raw = fs.readFileSync(getCachePath(), 'utf-8')
    const cache: CurrencyCache = JSON.parse(raw)
    if (cache.code === code && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      return cache.rate
    }
  } catch {
    // no cache
  }
  return null
}

function saveCachedRate(code: CurrencyCode, rate: number): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
    const cache: CurrencyCache = { code, rate, fetchedAt: Date.now() }
    fs.writeFileSync(getCachePath(), JSON.stringify(cache))
  } catch {
    // ignore write errors
  }
}

export async function setCurrency(code: CurrencyCode): Promise<void> {
  if (code === 'USD') {
    activeRate = { code: 'USD', rate: 1 }
    return
  }

  // Try cache first
  const cached = loadCachedRate(code)
  if (cached !== null) {
    activeRate = { code, rate: cached }
    return
  }

  // Fetch from Frankfurter API
  try {
    const response = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${code}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json() as { rates: Record<string, number> }
    const rate = data.rates[code]
    if (rate) {
      activeRate = { code, rate }
      saveCachedRate(code, rate)
    }
  } catch {
    // Keep current rate on failure
  }
}

export function formatCost(costUSD: number): string {
  const symbol = CURRENCY_SYMBOLS[activeRate.code] ?? '$'
  const converted = costUSD * activeRate.rate

  if (activeRate.code === 'KRW' || activeRate.code === 'JPY') {
    return `${symbol}${Math.round(converted).toLocaleString()}`
  }

  if (converted >= 1) return `${symbol}${converted.toFixed(2)}`
  if (converted >= 0.01) return `${symbol}${converted.toFixed(3)}`
  return `${symbol}${converted.toFixed(4)}`
}

export function convertCost(costUSD: number): number {
  return costUSD * activeRate.rate
}

export function getCurrencySymbol(): string {
  return CURRENCY_SYMBOLS[activeRate.code] ?? '$'
}
