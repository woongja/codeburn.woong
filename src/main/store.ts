import Store from 'electron-store'
import { DEFAULT_SETTINGS } from '../shared/constants'
import type { Settings, WidgetMode, Period, CurrencyCode, LayoutSettings } from '../shared/types'

const store = new Store<Settings>({
  defaults: DEFAULT_SETTINGS,
})

export function getSettings(): Settings {
  return {
    mode: store.get('mode'),
    position: store.get('position'),
    period: store.get('period'),
    currency: store.get('currency'),
    autoStart: store.get('autoStart'),
    layout: store.get('layout'),
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

export { store }
