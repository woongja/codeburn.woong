import { Tray, Menu, nativeImage, app } from 'electron'
import * as path from 'path'
import {
  getSettings,
  setMode,
  setPeriod,
  setCurrencySetting,
  setAutoStart,
} from './store'
import { getMainWindow, resizeMainWindow } from './index'
import { broadcastSettings } from './ipc'
import { forceRefresh } from './watcher'
import { setCurrency } from '../shared/currency'
import { setupAutoLaunch } from './auto-launch'
import { WIDGET_SIZES } from '../shared/constants'
import type { WidgetMode, Period, CurrencyCode } from '../shared/types'

let tray: Tray | null = null

function buildMenu(): Menu {
  const settings = getSettings()

  return Menu.buildFromTemplate([
    { label: 'CodeBurn Monitor', enabled: false },
    { type: 'separator' },
    {
      label: 'Widget Mode',
      submenu: [
        {
          label: 'Mini Circle',
          type: 'radio',
          checked: settings.mode === 'circle',
          click: () => applyMode('circle'),
        },
        {
          label: 'Detailed Panel',
          type: 'radio',
          checked: settings.mode === 'panel',
          click: () => applyMode('panel'),
        },
      ],
    },
    {
      label: 'Period',
      submenu: [
        { label: 'Today', type: 'radio', checked: settings.period === 'today', click: () => applyPeriod('today') },
        { label: '7 Days', type: 'radio', checked: settings.period === '7d', click: () => applyPeriod('7d') },
        { label: '30 Days', type: 'radio', checked: settings.period === '30d', click: () => applyPeriod('30d') },
        { label: 'All', type: 'radio', checked: settings.period === 'all', click: () => applyPeriod('all') },
      ],
    },
    {
      label: 'Currency',
      submenu: [
        { label: 'USD ($)', type: 'radio', checked: settings.currency === 'USD', click: () => applyCurrency('USD') },
        { label: 'KRW (₩)', type: 'radio', checked: settings.currency === 'KRW', click: () => applyCurrency('KRW') },
        { label: 'EUR (€)', type: 'radio', checked: settings.currency === 'EUR', click: () => applyCurrency('EUR') },
        { label: 'JPY (¥)', type: 'radio', checked: settings.currency === 'JPY', click: () => applyCurrency('JPY') },
        { label: 'GBP (£)', type: 'radio', checked: settings.currency === 'GBP', click: () => applyCurrency('GBP') },
        { label: 'CNY (¥)', type: 'radio', checked: settings.currency === 'CNY', click: () => applyCurrency('CNY') },
      ],
    },
    { type: 'separator' },
    {
      label: 'Edit Layout...',
      click: () => {
        // Switch to panel mode and open layout editor
        applyMode('panel')
        const win = getMainWindow()
        if (win) win.webContents.send('open-layout-editor')
      },
    },
    { type: 'separator' },
    {
      label: 'Auto Start',
      type: 'checkbox',
      checked: settings.autoStart,
      click: async (menuItem) => {
        setAutoStart(menuItem.checked)
        await setupAutoLaunch(menuItem.checked)
        broadcastSettings()
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])
}

function applyMode(mode: WidgetMode): void {
  setMode(mode)
  const settings = getSettings()
  const width = mode === 'circle' ? 160 : WIDGET_SIZES[settings.layout.widgetSize]
  const height = mode === 'circle' ? 160 : 600
  resizeMainWindow(width, height)
  broadcastSettings()
  rebuildMenu()
}

function applyPeriod(period: Period): void {
  setPeriod(period)
  broadcastSettings()
  forceRefresh()
  rebuildMenu()
}

async function applyCurrency(currency: CurrencyCode): Promise<void> {
  setCurrencySetting(currency)
  await setCurrency(currency)
  broadcastSettings()
  forceRefresh()
  rebuildMenu()
}

function rebuildMenu(): void {
  if (tray) tray.setContextMenu(buildMenu())
}

export function setupTray(): void {
  const iconPath = path.join(__dirname, '..', '..', 'resources', 'icon.png')
  let icon = nativeImage.createFromPath(iconPath)
  if (icon.isEmpty()) {
    // Fallback to a 16x16 transparent image if icon not found
    icon = nativeImage.createEmpty()
  } else {
    icon = icon.resize({ width: 16, height: 16 })
  }
  tray = new Tray(icon)
  tray.setToolTip('CodeBurn Monitor')
  tray.setContextMenu(buildMenu())

  // Left click: toggle widget visibility
  tray.on('click', () => {
    const win = getMainWindow()
    if (!win) return
    if (win.isVisible()) {
      win.hide()
    } else {
      win.show()
    }
  })
}
