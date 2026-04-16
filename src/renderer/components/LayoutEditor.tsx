import { useState, useCallback } from 'react'
import type { Settings, CardConfig, CardId, LayoutSettings } from '@shared/types'
import { DEFAULT_LAYOUT } from '@shared/constants'
import { t } from '@shared/i18n'

type Props = {
  settings: Settings
  onClose: () => void
}

export function LayoutEditor({ settings, onClose }: Props) {
  const lang = settings.language
  const [cards, setCards] = useState<CardConfig[]>(
    [...settings.layout.cards].sort((a, b) => a.order - b.order),
  )
  const [widgetSize, setWidgetSize] = useState(settings.layout.widgetSize)
  const [opacity, setOpacity] = useState(settings.layout.opacity)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const save = useCallback((updated: Partial<LayoutSettings>) => {
    const layout: LayoutSettings = {
      cards: updated.cards ?? cards,
      widgetSize: updated.widgetSize ?? widgetSize,
      opacity: updated.opacity ?? opacity,
    }
    window.electronAPI.updateLayout(layout)
  }, [cards, widgetSize, opacity])

  const toggleCard = (id: CardId) => {
    const updated = cards.map((c) =>
      c.id === id ? { ...c, enabled: !c.enabled } : c,
    )
    setCards(updated)
    save({ cards: updated })
  }

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    const reordered = [...cards]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(index, 0, moved)
    const withOrder = reordered.map((c, i) => ({ ...c, order: i }))
    setCards(withOrder)
    setDragIndex(index)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    save({ cards })
  }

  const handleSizeChange = (size: typeof widgetSize) => {
    setWidgetSize(size)
    save({ widgetSize: size })
  }

  const handleOpacityChange = (value: number) => {
    setOpacity(value)
    save({ opacity: value })
  }

  const handleReset = () => {
    const sortedDefault = [...DEFAULT_LAYOUT.cards].sort((a, b) => a.order - b.order)
    setCards(sortedDefault)
    setWidgetSize(DEFAULT_LAYOUT.widgetSize)
    setOpacity(DEFAULT_LAYOUT.opacity)
    window.electronAPI.updateLayout(DEFAULT_LAYOUT)
  }

  return (
    <div
      className="rounded-[14px] overflow-hidden h-full flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #16213e 0%, #1a1a2e 100%)',
        border: '1px solid rgba(240, 160, 48, 0.4)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 40px rgba(240,160,48,0.08)',
      }}
    >
      {/* Header (fixed) */}
      <div
        className="flex justify-between items-center px-4 py-3 shrink-0"
        style={{ background: 'rgba(240,160,48,0.08)', borderBottom: '1px solid rgba(240,160,48,0.2)' }}
      >
        <span className="text-[14px] font-bold text-accent">⚙ {t(lang, 'editor.title')}</span>
        <button
          onClick={onClose}
          className="w-[22px] h-[22px] rounded-full bg-white/10 flex items-center justify-center text-[12px] text-gray-500 hover:text-white"
          data-no-drag
        >
          ✕
        </button>
      </div>

      {/* Card toggles (scrollable) */}
      <div className="p-3 overflow-y-auto flex-1" data-no-drag>
        {cards.map((card, index) => (
          <div
            key={card.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2.5 px-3 py-2.5 mb-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] cursor-grab hover:bg-white/[0.06] transition-colors ${
              dragIndex === index ? 'opacity-50' : ''
            }`}
          >
            <span className="text-gray-600 text-[14px]">☰</span>
            <span className="flex-1 text-[12px] font-semibold text-gray-300">{t(lang, `cards.${card.id}`)}</span>
            <button
              onClick={() => toggleCard(card.id)}
              className={`w-9 h-5 rounded-full relative transition-colors ${
                card.enabled ? 'bg-accent/60' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-[left] ${
                  card.enabled ? 'left-[18px]' : 'left-[2px]'
                }`}
              />
            </button>
          </div>
        ))}

        {/* Widget Size */}
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-4 mb-2">{t(lang, 'editor.size')}</div>
        <div className="flex gap-1.5">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              onClick={() => handleSizeChange(size)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold text-center transition-colors ${
                size === widgetSize
                  ? 'bg-accent/15 border border-accent/40 text-accent'
                  : 'bg-white/5 border border-white/[0.08] text-gray-400 hover:bg-white/10'
              }`}
            >
              {t(lang, `editor.size.${size}`)}
            </button>
          ))}
        </div>

        {/* Opacity */}
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-4 mb-2">{t(lang, 'editor.opacity')}</div>
        <div className="flex items-center gap-2.5">
          <input
            type="range"
            min={30}
            max={100}
            value={opacity * 100}
            onChange={(e) => handleOpacityChange(Number(e.target.value) / 100)}
            className="flex-1 accent-accent h-1"
          />
          <span className="text-[12px] text-gray-300 min-w-[32px]">{Math.round(opacity * 100)}%</span>
        </div>
      </div>

      {/* Footer (fixed at bottom) */}
      <div className="flex gap-2 p-3 border-t border-white/[0.06] shrink-0">
        <button
          onClick={handleReset}
          className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-[11px] font-bold hover:bg-white/10 transition-colors"
        >
          {t(lang, 'editor.reset')}
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2 rounded-lg bg-accent/30 border border-accent/50 text-accent text-[11px] font-bold hover:bg-accent/40 transition-colors"
        >
          {t(lang, 'editor.done')}
        </button>
      </div>
    </div>
  )
}
