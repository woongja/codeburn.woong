import { useState, useCallback, useRef } from 'react'
import { useUsageData } from './hooks/useUsageData'
import { useSettings } from './hooks/useSettings'
import { MiniCircle } from './components/MiniCircle'
import { DetailPanel } from './components/DetailPanel'

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

  if (!settings) return null

  const opacity = settings.mode === 'panel' ? settings.layout.opacity : 1

  return (
    <div
      style={{ opacity, cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {settings.mode === 'circle' ? (
        <MiniCircle data={data} onClick={handleToggleMode} />
      ) : (
        <DetailPanel data={data} settings={settings} onMinimize={handleToggleMode} />
      )}
    </div>
  )
}
