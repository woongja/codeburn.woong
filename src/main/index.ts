import { app, BrowserWindow, screen } from 'electron'
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
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  const widgetWidth = WIDGET_SIZES[settings.layout.widgetSize]
  const widgetHeight = settings.mode === 'circle' ? 160 : 500
  return {
    x: width - widgetWidth - 20,
    y: height - widgetHeight - 20,
  }
}

function createWindow(): BrowserWindow {
  const settings = getSettings()
  const pos = getInitialPosition()
  const widgetWidth = settings.mode === 'circle'
    ? 160
    : WIDGET_SIZES[settings.layout.widgetSize]

  const win = new BrowserWindow({
    width: widgetWidth,
    height: settings.mode === 'circle' ? 160 : 600,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Load renderer
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
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
  mainWindow = createWindow()
  setupIpc()
  setupTray()
  startWatcher()

  const settings = getSettings()
  await setupAutoLaunch(settings.autoStart)
})

app.on('window-all-closed', () => {
  // Don't quit, keep in tray
})

app.on('before-quit', () => {
  stopWatcher()
})
