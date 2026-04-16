import Store from 'electron-store'
import { DEFAULT_SETTINGS, DEFAULT_CARDS } from '../shared/constants'
import type { Settings, WidgetMode, Period, CurrencyCode, LayoutSettings, Plan, CardConfig, Language } from '../shared/types'

const store = new Store<Settings>({
  defaults: DEFAULT_SETTINGS,
})

// Migrate older layouts that may be missing newer cards (e.g., 'limits')
function migrateLayout(layout: LayoutSettings): LayoutSettings {
  const existingIds = new Set(layout.cards.map((c) => c.id))
  const missing: CardConfig[] = DEFAULT_CARDS
    .filter((d) => !existingIds.has(d.id))
    .map((d, i) => ({ ...d, order: layout.cards.length + i }))

  if (missing.length === 0) return layout

  return {
    ...layout,
    cards: [...layout.cards, ...missing],
  }
}

export function getSettings(): Settings {
  const rawLayout = store.get('layout')
  const layout = migrateLayout(rawLayout)
  return {
    mode: store.get('mode'),
    position: store.get('position'),
    period: store.get('period'),
    currency: store.get('currency'),
    autoStart: store.get('autoStart'),
    plan: store.get('plan'),
    language: store.get('language'),
    layout,
  }
}

export function setMode(mode: WidgetMode): void {
  store.set('mode', mode)
}

export function setPeriod(period: Period): void {
  store.set('period', period)
}

export function setCurrencySetting(currency: CurrencyCode): void {
  store.set('currency', currency)
}

export function setAutoStart(enabled: boolean): void {
  store.set('autoStart', enabled)
}

export function setPosition(x: number, y: number): void {
  store.set('position', { x, y })
}

export function setLayout(layout: LayoutSettings): void {
  store.set('layout', layout)
}

export function setPlan(plan: Plan): void {
  store.set('plan', plan)
}

export function setLanguage(language: Language): void {
  store.set('language', language)
}

export { store }
