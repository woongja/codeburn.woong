import { ipcMain } from 'electron'
import { getSettings, setMode, setPeriod, setCurrencySetting, setLayout, setPlan, setLanguage } from './store'
import { getMainWindow, resizeMainWindow, moveWindow } from './index'
import { forceRefresh } from './watcher'
import { rebuildMenu } from './tray'
import { parseAllSessions } from '../shared/parser'
import { setCurrency } from '../shared/currency'
import type { WidgetMode, Period, CurrencyCode, LayoutSettings, Plan, Language } from '../shared/types'
import { WIDGET_SIZES } from '../shared/constants'

export function setupIpc(): void {
  ipcMain.handle('get-settings', () => {
    return getSettings()
  })

  ipcMain.handle('get-usage-data', async () => {
    const settings = getSettings()
    return parseAllSessions(settings.period)
  })

  ipcMain.on('change-mode', (_event, mode: WidgetMode) => {
    setMode(mode)
    const settings = getSettings()
    const width = mode === 'circle' ? 160 : WIDGET_SIZES[settings.layout.widgetSize]
    const height = mode === 'circle' ? 160 : Math.round(width * 4 / 3)
    resizeMainWindow(width, height)
    broadcastSettings()
  })

  ipcMain.on('change-period', async (_event, period: Period) => {
    setPeriod(period)
    broadcastSettings()
    forceRefresh()
  })

  ipcMain.on('change-currency', async (_event, currency: CurrencyCode) => {
    setCurrencySetting(currency)
    await setCurrency(currency)
    broadcastSettings()
    forceRefresh()
  })

  ipcMain.on('change-plan', (_event, plan: Plan) => {
    setPlan(plan)
    broadcastSettings()
  })

  ipcMain.on('change-language', (_event, language: Language) => {
    setLanguage(language)
    broadcastSettings()
    rebuildMenu()
  })

  ipcMain.on('update-layout', (_event, layout: LayoutSettings) => {
    setLayout(layout)
    const settings = getSettings()
    if (settings.mode === 'panel') {
      const width = WIDGET_SIZES[layout.widgetSize]
      resizeMainWindow(width, Math.round(width * 4 / 3))
    }
    broadcastSettings()
  })

  ipcMain.on('window-drag', (_event, deltaX: number, deltaY: number) => {
    moveWindow(deltaX, deltaY)
  })

  ipcMain.on('save-position', (_event, _x: number, _y: number) => {
    // Already handled by window 'moved' event
  })

  ipcMain.on('resize-window', (_event, width: number, height: number) => {
    resizeMainWindow(width, height)
  })
}

function broadcastSettings(): void {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('settings-changed', getSettings())
  }
}

export { broadcastSettings }
