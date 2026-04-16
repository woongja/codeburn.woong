import { useState, useEffect } from 'react'
import type { UsageData, Settings, CardId, Language } from '@shared/types'
import { t } from '@shared/i18n'
import { CostCard } from './cards/CostCard'
import { StatsCard } from './cards/StatsCard'
import { TokensCard } from './cards/TokensCard'
import { ModelsCard } from './cards/ModelsCard'
import { ProjectsCard } from './cards/ProjectsCard'
import { DailyCard } from './cards/DailyCard'
import { LimitsCard } from './cards/LimitsCard'
import { LayoutEditor } from './LayoutEditor'

type Props = {
  data: UsageData
  settings: Settings
  onMinimize: () => void
}

function renderCard(id: CardId, data: UsageData, settings: Settings) {
  const lang = settings.language
  switch (id) {
    case 'cost': return <CostCard data={data} period={settings.period} language={lang} />
    case 'limits': return <LimitsCard data={data} plan={settings.plan} language={lang} />
    case 'stats': return <StatsCard data={data} language={lang} />
    case 'tokens': return <TokensCard data={data} language={lang} />
    case 'models': return <ModelsCard data={data} language={lang} />
    case 'projects': return <ProjectsCard data={data} language={lang} />
    case 'daily': return <DailyCard data={data} language={lang} />
  }
}

type TrafficLightProps = {
  color: string
  hoverColor: string
  symbol: string
  title: string
  onClick: () => void
}

function TrafficLight({ color, hoverColor, symbol, title, onClick }: TrafficLightProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
      className="w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-bold cursor-pointer"
      style={{
        background: color,
        boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.2)',
      }}
    >
      <span style={{ color: hoverColor, opacity: hovered ? 1 : 0, transition: 'opacity 0.1s' }}>
        {symbol}
      </span>
    </button>
  )
}

type LangToggleProps = {
  current: Language
}

function LangToggle({ current }: LangToggleProps) {
  return (
    <div
      className="flex items-center rounded-full overflow-hidden"
      data-no-drag
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {(['ko', 'en'] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => window.electronAPI.changeLanguage(lang)}
          className="px-2 py-0.5 text-[9px] font-extrabold tracking-wider transition-colors"
          style={{
            background: current === lang ? '#f0a030' : 'transparent',
            color: current === lang ? '#1a1a2e' : 'rgba(255,255,255,0.5)',
          }}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

export function DetailPanel({ data, settings, onMinimize }: Props) {
  const [showEditor, setShowEditor] = useState(false)
  const lang = settings.language

  useEffect(() => {
    const handler = () => setShowEditor(true)
    const w = window as unknown as { __layoutEditorOpen?: () => void }
    w.__layoutEditorOpen = handler
    return () => { w.__layoutEditorOpen = undefined }
  }, [])

  const enabledCards = [...settings.layout.cards]
    .filter((c) => c.enabled)
    .sort((a, b) => a.order - b.order)

  if (showEditor) {
    return <LayoutEditor settings={settings} onClose={() => setShowEditor(false)} />
  }

  return (
    <div
      className="rounded-[12px] overflow-hidden h-full flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #1c2238 0%, #14172a 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 12px 48px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.05) inset',
      }}
    >
      {/* Mac-style title bar */}
      <div
        className="flex items-center justify-between px-3 py-2.5 relative"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Traffic lights (left): red=quit, yellow=minimize-to-circle, green=settings */}
        <div className="flex gap-1.5 items-center" data-no-drag>
          <TrafficLight
            color="#ff5f57"
            hoverColor="#4d0000"
            symbol="×"
            title={t(lang, 'panel.quit')}
            onClick={() => window.electronAPI.quitApp()}
          />
          <TrafficLight
            color="#ffbd2e"
            hoverColor="#995700"
            symbol="−"
            title={t(lang, 'panel.minimize')}
            onClick={onMinimize}
          />
          <TrafficLight
            color="#28c940"
            hoverColor="#006500"
            symbol="⚙"
            title={t(lang, 'panel.editLayout')}
            onClick={() => setShowEditor(true)}
          />
        </div>

        {/* Title (centered absolutely) */}
        <span
          className="absolute left-1/2 -translate-x-1/2 text-[11px] font-bold tracking-wider"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          CODEBURN
        </span>

        {/* Language toggle (right) */}
        <LangToggle current={lang} />
      </div>

      {/* Cards */}
      <div className="p-2 flex flex-col gap-2 overflow-y-auto flex-1">
        {enabledCards.map((cardConfig) => (
          <div key={cardConfig.id}>
            {renderCard(cardConfig.id, data, settings)}
          </div>
        ))}
      </div>
    </div>
  )
}
