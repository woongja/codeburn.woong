import type { UsageData, Period } from '@shared/types'

type Props = { data: UsageData; period: Period }

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  '7d': '7D',
  '30d': '30D',
  all: 'All',
}

export function CostCard({ data, period }: Props) {
  return (
    <div className="p-3 rounded-[10px] bg-white/[0.03] border border-white/[0.06]">
      <div className="text-center text-[32px] font-bold text-white leading-none">
        <span className="text-[20px] text-accent">$</span>
        {data.totalCostUSD.toFixed(2)}
      </div>
      <div className="flex gap-1 justify-center mt-2" data-no-drag>
        {(['today', '7d', '30d', 'all'] as const).map((p) => (
          <button
            key={p}
            onClick={() => window.electronAPI.changePeriod(p)}
            className={`text-[10px] px-2.5 py-0.5 rounded-full cursor-pointer transition-colors ${
              p === period
                ? 'bg-accent/20 text-accent'
                : 'bg-white/5 text-gray-500 hover:bg-white/10'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>
    </div>
  )
}
