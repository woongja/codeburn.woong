import { Tray, Menu, nativeImage, app } from 'electron'
import * as path from 'path'
import {
  getSettings,
  setMode,
  setPeriod,
  setCurrencySetting,
  setAutoStart,
  setPlan,
  setLanguage,
} from './store'
import { getMainWindow, resizeMainWindow } from './index'
import { broadcastSettings } from './ipc'
import { forceRefresh } from './watcher'
import { setCurrency } from '../shared/currency'
import { setupAutoLaunch } from './auto-launch'
import { PLAN_LIMITS, WIDGET_SIZES } from '../shared/constants'
import { t } from '../shared/i18n'
import type { WidgetMode, Period, CurrencyCode, Plan, Language } from '../shared/types'

let tray: Tray | null = null

function buildMenu(): Menu {
  const settings = getSettings()
  const lang = settings.language

  return Menu.buildFromTemplate([
    { label: t(lang, 'tray.title'), enabled: false },
    { type: 'separator' },
    {
      label: t(lang, 'tray.mode'),
      submenu: [
        {
          label: t(lang, 'tray.mode.circle'),
          type: 'radio',
          checked: settings.mode === 'circle',
          click: () => applyMode('circle'),
        },
        {
          label: t(lang, 'tray.mode.panel'),
          type: 'radio',
          checked: settings.mode === 'panel',
          click: () => applyMode('panel'),
        },
      ],
    },
    {
      label: t(lang, 'tray.period'),
      submenu: [
        { label: t(lang, 'tray.period.today'), type: 'radio', checked: settings.period === 'today', click: () => applyPeriod('today') },
        { label: t(lang, 'tray.period.7d'), type: 'radio', checked: settings.period === '7d', click: () => applyPeriod('7d') },
        { label: t(lang, 'tray.period.30d'), type: 'radio', checked: settings.period === '30d', click: () => applyPeriod('30d') },
        { label: t(lang, 'tray.period.all'), type: 'radio', checked: settings.period === 'all', click: () => applyPeriod('all') },
      ],
    },
    {
      label: t(lang, 'tray.currency'),
      submenu: [
        { label: 'USD ($)', type: 'radio', checked: settings.currency === 'USD', click: () => applyCurrency('USD') },
        { label: 'KRW (₩)', type: 'radio', checked: settings.currency === 'KRW', click: () => applyCurrency('KRW') },
        { label: 'EUR (€)', type: 'radio', checked: settings.currency === 'EUR', click: () => applyCurrency('EUR') },
        { label: 'JPY (¥)', type: 'radio', checked: settings.currency === 'JPY', click: () => applyCurrency('JPY') },
        { label: 'GBP (£)', type: 'radio', checked: settings.currency === 'GBP', click: () => applyCurrency('GBP') },
        { label: 'CNY (¥)', type: 'radio', checked: settings.currency === 'CNY', click: () => applyCurrency('CNY') },
      ],
    },
    {
      label: t(lang, 'tray.plan'),
      submenu: (Object.entries(PLAN_LIMITS) as Array<[Plan, { displayName: string }]>).map(([plan, info]) => ({
        label: info.displayName,
        type: 'radio' as const,
        checked: settings.plan === plan,
        click: () => applyPlan(plan),
      })),
    },
    {
      label: t(lang, 'tray.language'),
      submenu: [
        { label: '한국어', type: 'radio', checked: lang === 'ko', click: () => applyLanguage('ko') },
        { label: 'English', type: 'radio', checked: lang === 'en', click: () => applyLanguage('en') },
      ],
    },
    { type: 'separator' },
    {
      label: t(lang, 'tray.editLayout'),
      click: () => {
        applyMode('panel')
        const win = getMainWindow()
        if (win) win.webContents.send('open-layout-editor')
      },
    },
    { type: 'separator' },
    {
      label: t(lang, 'tray.autoStart'),
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
      label: t(lang, 'tray.quit'),
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
  const height = mode === 'circle' ? 160 : Math.round(width * 4 / 3)
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

function applyPlan(plan: Plan): void {
  setPlan(plan)
  broadcastSettings()
  rebuildMenu()
}

function applyLanguage(lang: Language): void {
  setLanguage(lang)
  broadcastSettings()
  rebuildMenu()
}

function rebuildMenu(): void {
  if (tray) tray.setContextMenu(buildMenu())
}

export function setupTray(): void {
  const iconPath = path.join(__dirname, '..', '..', 'resources', 'icon.png')
  let icon = nativeImage.createFromPath(iconPath)
  if (icon.isEmpty()) {
    icon = nativeImage.createEmpty()
  } else {
    icon = icon.resize({ width: 16, height: 16 })
  }
  tray = new Tray(icon)
  tray.setToolTip('CodeBurn Monitor')
  tray.setContextMenu(buildMenu())

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

export { rebuildMenu }
