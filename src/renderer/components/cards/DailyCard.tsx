import type { UsageData } from '@shared/types'

type Props = { data: UsageData }

export function DailyCard({ data }: Props) {
  const days = data.daily.slice(-14) // Show up to 14 days
  const maxCost = Math.max(...days.map((d) => d.costUSD), 0.01)

  return (
    <div className="p-3 rounded-[10px] bg-white/[0.03] border border-white/[0.06]">
      <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Daily</div>
      <div className="flex gap-[3px] items-end h-[40px]">
        {days.map((d) => {
          const heightPercent = Math.max((d.costUSD / maxCost) * 100, 5)
          return (
            <div
              key={d.date}
              className="flex-1 rounded-sm min-h-[3px] opacity-80"
              style={{
                height: `${heightPercent}%`,
                background: 'linear-gradient(to top, #f0a030, #e74c3c)',
              }}
              title={`${d.date}: $${d.costUSD.toFixed(2)}`}
            />
          )
        })}
      </div>
      <div className="flex gap-[3px] mt-1">
        {days.map((d) => (
          <span key={d.date} className="flex-1 text-[8px] text-gray-600 text-center">
            {d.date.slice(8)}
          </span>
        ))}
      </div>
      {days.length === 0 && (
        <div className="text-[11px] text-gray-600 text-center py-2">No data</div>
      )}
    </div>
  )
}
