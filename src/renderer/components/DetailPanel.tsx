import { useState, useEffect } from 'react'
import type { UsageData, Settings, CardId, Period } from '@shared/types'
import { CostCard } from './cards/CostCard'
import { StatsCard } from './cards/StatsCard'
import { TokensCard } from './cards/TokensCard'
import { ModelsCard } from './cards/ModelsCard'
import { ProjectsCard } from './cards/ProjectsCard'
import { DailyCard } from './cards/DailyCard'
import { LayoutEditor } from './LayoutEditor'

type Props = {
  data: UsageData
  settings: Settings
  onMinimize: () => void
}

function renderCard(id: CardId, data: UsageData, period: Period) {
  switch (id) {
    case 'cost': return <CostCard data={data} period={period} />
    case 'stats': return <StatsCard data={data} />
    case 'tokens': return <TokensCard data={data} />
    case 'models': return <ModelsCard data={data} />
    case 'projects': return <ProjectsCard data={data} />
    case 'daily': return <DailyCard data={data} />
  }
}

export function DetailPanel({ data, settings, onMinimize }: Props) {
  const [showEditor, setShowEditor] = useState(false)

  // Listen for tray menu's "Edit Layout..." action
  useEffect(() => {
    const handler = () => setShowEditor(true)
    // The preload exposes onSettingsChanged but we need a custom listener.
    // For now, use IPC via a custom global hook.
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
      className="rounded-[14px] overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #16213e 0%, #1a1a2e 100%)',
        border: '1px solid rgba(240, 160, 48, 0.2)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-white/[0.06]">
        <span className="text-[13px] font-bold text-accent">CODEBURN</span>
        <div className="flex gap-2" data-no-drag>
          <button
            onClick={() => setShowEditor(true)}
            className="w-6 h-6 rounded-md bg-white/[0.08] flex items-center justify-center text-[12px] text-gray-500 hover:bg-white/[0.15] hover:text-white transition-colors"
            title="Edit Layout"
          >
            ⚙
          </button>
          <button
            onClick={onMinimize}
            className="w-6 h-6 rounded-md bg-white/[0.08] flex items-center justify-center text-[12px] text-gray-500 hover:bg-white/[0.15] hover:text-white transition-colors"
            title="Minimize"
          >
            −
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="p-2 flex flex-col gap-2 max-h-[540px] overflow-y-auto">
        {enabledCards.map((cardConfig) => (
          <div key={cardConfig.id}>
            {renderCard(cardConfig.id, data, settings.period)}
          </div>
        ))}
      </div>
    </div>
  )
}
