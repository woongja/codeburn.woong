import { watch, type FSWatcher } from 'chokidar'
import { CLAUDE_PROJECTS_DIR, FILE_WATCH_COOLDOWN_MS } from '../shared/constants'
import { parseAllSessions } from '../shared/parser'
import { getSettings } from './store'
import { getMainWindow } from './index'

let watcher: FSWatcher | null = null
let cooldownTimer: ReturnType<typeof setTimeout> | null = null
let pendingRefresh = false

async function refreshData(): Promise<void> {
  const settings = getSettings()
  const data = await parseAllSessions(settings.period)
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('usage-data', data)
  }
}

function scheduledRefresh(): void {
  if (cooldownTimer) {
    // Already in cooldown, mark pending
    pendingRefresh = true
    return
  }

  // Execute refresh
  refreshData().catch(console.error)

  // Start cooldown
  cooldownTimer = setTimeout(() => {
    cooldownTimer = null
    if (pendingRefresh) {
      pendingRefresh = false
      scheduledRefresh()
    }
  }, FILE_WATCH_COOLDOWN_MS)
}

export function startWatcher(): void {
  // Initial data load
  refreshData().catch(console.error)

  // Watch for JSONL changes
  watcher = watch(`${CLAUDE_PROJECTS_DIR}/**/*.jsonl`, {
    ignoreInitial: true,
    persistent: true,
    depth: 3,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 200,
    },
  })

  watcher.on('add', scheduledRefresh)
  watcher.on('change', scheduledRefresh)
}

export function stopWatcher(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
  if (cooldownTimer) {
    clearTimeout(cooldownTimer)
    cooldownTimer = null
  }
}

// Force refresh (called when period/currency changes)
export function forceRefresh(): void {
  pendingRefresh = false
  if (cooldownTimer) {
    clearTimeout(cooldownTimer)
    cooldownTimer = null
  }
  refreshData().catch(console.error)
}
