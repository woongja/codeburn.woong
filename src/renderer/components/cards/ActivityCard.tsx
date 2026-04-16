import type { UsageData, Language, TaskCategory } from '@shared/types'
import { t } from '@shared/i18n'

type Props = { data: UsageData; language: Language }

// Distinct colors for each category (cycled from a warm palette)
const CATEGORY_COLORS: Record<TaskCategory, string> = {
  coding: '#3498db',       // blue
  debugging: '#e74c3c',    // red
  feature: '#2ecc71',      // green
  refactoring: '#9b59b6',  // purple
  testing: '#f39c12',      // amber
  exploration: '#1abc9c',  // teal
  planning: '#e67e22',     // orange
  delegation: '#16a085',   // dark teal
  git: '#34495e',          // slate
  build: '#7f8c8d',        // gray
  conversation: '#95a5a6', // light gray
  brainstorming: '#d35400',// burnt orange
  general: '#555555',      // neutral
}

export function ActivityCard({ data, language }: Props) {
  const items = data.categories.slice(0, 8) // top 8 by cost
  const maxCost = Math.max(...items.map((c) => c.costUSD), 0.01)

  return (
    <div className="px-3 py-2.5 rounded-[10px] bg-white/[0.04] border border-white/[0.08]">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-accent mb-1.5">
        {t(language, 'card.activity.title')}
      </div>
      {items.map((c) => {
        const color = CATEGORY_COLORS[c.category] ?? '#888'
        const widthPercent = (c.costUSD / maxCost) * 100
        return (
          <div key={c.category} className="flex items-center gap-2 py-1">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-[12px] font-semibold text-gray-200 flex-1 truncate">
              {t(language, `category.${c.category}`)}
            </span>
            <span className="text-[10px] font-bold text-gray-500 tabular-nums">
              {c.turns}
            </span>
            <span className="text-[12px] font-bold text-white tabular-nums min-w-[50px] text-right">
              ${c.costUSD.toFixed(2)}
            </span>
            <div className="w-[40px] h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${widthPercent}%`, background: color }} />
            </div>
          </div>
        )
      })}
      {items.length === 0 && (
        <div className="text-[11px] font-semibold text-gray-500 text-center py-2">
          {t(language, 'common.noData')}
        </div>
      )}
    </div>
  )
}
