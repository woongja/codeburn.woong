import type { UsageData, Period, Language } from '@shared/types'
import { t } from '@shared/i18n'

type Props = { data: UsageData; period: Period; language: Language }

export function CostCard({ data, period, language }: Props) {
  return (
    <div className="px-3 py-3 rounded-[10px] bg-white/[0.04] border border-white/[0.08]">
      <div className="text-center text-[36px] font-extrabold text-white leading-none tabular-nums">
        <span className="text-[22px] text-accent font-bold">$</span>
        {data.totalCostUSD.toFixed(2)}
      </div>
      <div className="flex gap-1 justify-center mt-3" data-no-drag>
        {(['today', '7d', '30d', 'all'] as const).map((p) => (
          <button
            key={p}
            onClick={() => window.electronAPI.changePeriod(p)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
              p === period
                ? 'bg-accent/25 text-accent'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
            }`}
          >
            {t(language, `period.${p}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
