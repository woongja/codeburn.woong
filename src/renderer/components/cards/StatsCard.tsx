import type { UsageData, Language } from '@shared/types'
import { t } from '@shared/i18n'

type Props = { data: UsageData; language: Language }

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-[12px] font-semibold text-gray-300">{label}</span>
      <span className="text-[14px] font-bold text-white tabular-nums">{value}</span>
    </div>
  )
}

export function StatsCard({ data, language }: Props) {
  return (
    <div className="px-3 py-2.5 rounded-[10px] bg-white/[0.04] border border-white/[0.08]">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-accent mb-1.5">
        {t(language, 'card.stats.title')}
      </div>
      <StatRow label={t(language, 'card.stats.apiCalls')} value={data.totalApiCalls.toLocaleString()} />
      <StatRow label={t(language, 'card.stats.sessions')} value={data.totalSessions.toLocaleString()} />
    </div>
  )
}
