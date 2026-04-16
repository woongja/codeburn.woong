import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI, UsageData, Settings } from './shared/types'

const api: ElectronAPI = {
  onUsageData: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: UsageData) => callback(data)
    ipcRenderer.on('usage-data', handler)
    return () => { ipcRenderer.removeListener('usage-data', handler) }
  },

  onSettingsChanged: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, settings: Settings) => callback(settings)
    ipcRenderer.on('settings-changed', handler)
    return () => { ipcRenderer.removeListener('settings-changed', handler) }
  },

  changeMode: (mode) => ipcRenderer.send('change-mode', mode),
  changePeriod: (period) => ipcRenderer.send('change-period', period),
  changePlan: (plan) => ipcRenderer.send('change-plan', plan),
  changeLanguage: (lang) => ipcRenderer.send('change-language', lang),
  updateLayout: (layout) => ipcRenderer.send('update-layout', layout),
  windowDrag: (deltaX, deltaY) => ipcRenderer.send('window-drag', deltaX, deltaY),
  savePosition: (x, y) => ipcRenderer.send('save-position', x, y),
  resizeWindow: (width, height) => ipcRenderer.send('resize-window', width, height),
  quitApp: () => ipcRenderer.send('quit-app'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  getUsageData: () => ipcRenderer.invoke('get-usage-data'),
}

contextBridge.exposeInMainWorld('electronAPI', api)
