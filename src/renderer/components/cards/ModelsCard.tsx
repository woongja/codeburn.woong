import type { UsageData, Language } from '@shared/types'
import { t } from '@shared/i18n'

type Props = { data: UsageData; language: Language }

const MODEL_COLORS: Record<string, string> = {
  'claude-opus-4-6': '#e74c3c',
  'claude-opus-4-5': '#e74c3c',
  'claude-sonnet-4-6': '#3498db',
  'claude-sonnet-4-5': '#3498db',
  'claude-haiku-4-5': '#2ecc71',
  'claude-3-5-haiku': '#2ecc71',
}

function getColor(model: string): string {
  for (const [key, color] of Object.entries(MODEL_COLORS)) {
    if (model.includes(key) || key.includes(model)) return color
  }
  return '#888'
}

export function ModelsCard({ data, language }: Props) {
  const maxCost = Math.max(...data.models.map((m) => m.costUSD), 0.01)

  return (
    <div className="px-3 py-2.5 rounded-[10px] bg-white/[0.04] border border-white/[0.08]">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-accent mb-1.5">
        {t(language, 'card.models.title')}
      </div>
      {data.models.map((m) => {
        const color = getColor(m.model)
        const widthPercent = (m.costUSD / maxCost) * 100
        return (
          <div key={m.model} className="flex items-center gap-2 py-1">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-[12px] font-semibold text-gray-200 flex-1 truncate">{m.displayName}</span>
            <span className="text-[12px] font-bold text-white tabular-nums min-w-[50px] text-right">
              ${m.costUSD.toFixed(2)}
            </span>
            <div className="w-[50px] h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${widthPercent}%`, background: color }} />
            </div>
          </div>
        )
      })}
      {data.models.length === 0 && (
        <div className="text-[11px] font-semibold text-gray-500 text-center py-2">
          {t(language, 'common.noData')}
        </div>
      )}
    </div>
  )
}
