import { app, BrowserWindow, Menu, screen } from 'electron'
import * as path from 'path'
import { getSettings, setPosition } from './store'
import { setupTray } from './tray'
import { setupIpc } from './ipc'
import { startWatcher, stopWatcher } from './watcher'
import { setupAutoLaunch } from './auto-launch'
import { WIDGET_SIZES } from '../shared/constants'

let mainWindow: BrowserWindow | null = null

function getInitialPosition(): { x: number; y: number } {
  const settings = getSettings()
  if (settings.position.x !== -1 && settings.position.y !== -1) {
    return settings.position
  }
  // Default: bottom-right, above taskbar
  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize
  const { x: areaX, y: areaY } = display.workArea
  const widgetWidth = WIDGET_SIZES[settings.layout.widgetSize]
  const widgetHeight = settings.mode === 'circle' ? 160 : 500
  console.log('[main] workArea:', display.workArea, 'workAreaSize:', display.workAreaSize)
  return {
    x: areaX + width - widgetWidth - 20,
    y: areaY + height - widgetHeight - 20,
  }
}

function createWindow(): BrowserWindow {
  const settings = getSettings()
  const pos = getInitialPosition()
  const widgetWidth = settings.mode === 'circle'
    ? 160
    : WIDGET_SIZES[settings.layout.widgetSize]

  const preloadPath = path.join(__dirname, '..', 'preload.js')
  console.log('[main] preload path:', preloadPath)
  console.log('[main] window position:', pos, 'size:', widgetWidth, 'x', settings.mode === 'circle' ? 160 : 600)

  // Frameless transparent window - Mac-style traffic lights are rendered in React
  const win = new BrowserWindow({
    width: widgetWidth,
    height: settings.mode === 'circle' ? 160 : Math.round(widgetWidth * 4 / 3), // 3:4 aspect ratio for panel
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Remove default menu (File/Edit/View)
  win.setMenu(null)

  win.once('ready-to-show', () => {
    console.log('[main] window ready, showing')
    win.show()
  })

  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('[main] did-fail-load:', code, desc, url)
  })

  win.webContents.on('preload-error', (_e, preloadPath, error) => {
    console.error('[main] preload-error:', preloadPath, error)
  })

  win.webContents.on('console-message', (_e, _level, message) => {
    console.log('[renderer]', message)
  })

  // Load renderer
  if (!app.isPackaged && process.env.VITE_DEV_SERVER_URL) {
    console.log('[main] loading dev URL:', process.env.VITE_DEV_SERVER_URL)
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools({ mode: 'undocked' })
  } else if (!app.isPackaged) {
    console.log('[main] loading default dev URL: http://localhost:5173')
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'undocked' })
  } else {
    const htmlPath = path.join(__dirname, '..', 'renderer', 'index.html')
    console.log('[main] loading file:', htmlPath)
    win.loadFile(htmlPath)
  }

  // Save position on move
  win.on('moved', () => {
    const [x, y] = win.getPosition()
    setPosition(x, y)
  })

  return win
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function resizeMainWindow(width: number, height: number): void {
  if (mainWindow) {
    mainWindow.setSize(width, height)
  }
}

export function moveWindow(deltaX: number, deltaY: number): void {
  if (!mainWindow) return
  const [x, y] = mainWindow.getPosition()
  mainWindow.setPosition(x + deltaX, y + deltaY)
}

app.whenReady().then(async () => {
  console.log('[main] app ready, creating window')
  // Globally remove the default application menu (File/Edit/View)
  Menu.setApplicationMenu(null)
  try {
    mainWindow = createWindow()
    setupIpc()
    console.log('[main] IPC ready')
    try { setupTray() } catch (e) { console.error('[main] tray failed:', e) }
    try { startWatcher() } catch (e) { console.error('[main] watcher failed:', e) }

    const settings = getSettings()
    try { await setupAutoLaunch(settings.autoStart) } catch (e) { console.error('[main] auto-launch failed:', e) }
    console.log('[main] startup complete')
  } catch (err) {
    console.error('[main] startup failed:', err)
  }
})

app.on('window-all-closed', () => {
  // Don't quit, keep in tray
})

app.on('before-quit', () => {
  stopWatcher()
})
