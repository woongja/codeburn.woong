import type { UsageData } from '@shared/types'

type Props = { data: UsageData }

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[12px] py-1">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300 font-semibold">{value}</span>
    </div>
  )
}

export function StatsCard({ data }: Props) {
  return (
    <div className="p-3 rounded-[10px] bg-white/[0.03] border border-white/[0.06]">
      <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Statistics</div>
      <StatRow label="API Calls" value={data.totalApiCalls.toLocaleString()} />
      <StatRow label="Sessions" value={data.totalSessions.toLocaleString()} />
      <StatRow label="Cache Hit" value={`${data.cacheHitPercent.toFixed(0)}%`} />
    </div>
  )
}
