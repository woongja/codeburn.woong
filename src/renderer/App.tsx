import { useState, useCallback, useRef } from 'react'
import { useUsageData } from './hooks/useUsageData'
import { useSettings } from './hooks/useSettings'
import { MiniCircle } from './components/MiniCircle'
import { DetailPanel } from './components/DetailPanel'
import { t } from '@shared/i18n'

export function App() {
  const data = useUsageData()
  const settings = useSettings()
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    setIsDragging(true)
    dragStart.current = { x: e.screenX, y: e.screenY }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    const deltaX = e.screenX - dragStart.current.x
    const deltaY = e.screenY - dragStart.current.y
    dragStart.current = { x: e.screenX, y: e.screenY }
    window.electronAPI.windowDrag(deltaX, deltaY)
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleToggleMode = useCallback(() => {
    if (!settings) return
    const newMode = settings.mode === 'circle' ? 'panel' : 'circle'
    window.electronAPI.changeMode(newMode)
  }, [settings])

  // Show diagnostic state while settings load (or if electronAPI unavailable)
  if (!settings) {
    const apiAvailable = typeof window.electronAPI !== 'undefined'
    return (
      <div
        style={{
          width: 160,
          height: 160,
          background: 'linear-gradient(135deg, #16213e, #0f3460)',
          border: '2px solid #f0a030',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 11,
          textAlign: 'center',
          padding: 12,
          whiteSpace: 'pre-line',
        }}
      >
        {apiAvailable ? t('ko', 'mini.loading') : t('ko', 'mini.apiUnavailable')}
      </div>
    )
  }

  const opacity = settings.mode === 'panel' ? settings.layout.opacity : 1

  return (
    <div
      style={{
        opacity,
        cursor: isDragging ? 'grabbing' : 'grab',
        width: '100vw',
        height: '100vh',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {settings.mode === 'circle' ? (
        <MiniCircle data={data} language={settings.language} onClick={handleToggleMode} />
      ) : (
        <DetailPanel data={data} settings={settings} onMinimize={handleToggleMode} />
      )}
    </div>
  )
}
