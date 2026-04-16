import type { UsageData, Language } from '@shared/types'
import { t } from '@shared/i18n'

type Props = { data: UsageData; language: Language }

export function DailyCard({ data, language }: Props) {
  const days = data.daily.slice(-14)
  const maxCost = Math.max(...days.map((d) => d.costUSD), 0.01)

  return (
    <div className="px-3 py-2.5 rounded-[10px] bg-white/[0.04] border border-white/[0.08]">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-accent mb-1.5">
        {t(language, 'card.daily.title')}
      </div>
      <div className="flex gap-[3px] items-end h-[42px]">
        {days.map((d) => {
          const heightPercent = Math.max((d.costUSD / maxCost) * 100, 5)
          return (
            <div
              key={d.date}
              className="flex-1 rounded-[2px] min-h-[3px]"
              style={{
                height: `${heightPercent}%`,
                background: 'linear-gradient(to top, #f0a030, #e74c3c)',
              }}
              title={`${d.date}: $${d.costUSD.toFixed(2)}`}
            />
          )
        })}
      </div>
      <div className="flex gap-[3px] mt-1.5">
        {days.map((d) => (
          <span key={d.date} className="flex-1 text-[9px] font-bold text-gray-500 text-center tabular-nums">
            {d.date.slice(8)}
          </span>
        ))}
      </div>
      {days.length === 0 && (
        <div className="text-[11px] font-semibold text-gray-500 text-center py-2">
          {t(language, 'common.noData')}
        </div>
      )}
    </div>
  )
}
