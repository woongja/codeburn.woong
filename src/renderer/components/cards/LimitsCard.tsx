import type { UsageData, Plan, WindowStats, Language } from '@shared/types'
import { PLAN_LIMITS } from '@shared/constants'
import { t } from '@shared/i18n'

type Props = { data: UsageData; plan: Plan; language: Language }

function formatTimeRemaining(
  oldestTimestamp: string | null,
  windowMs: number,
  lang: Language,
): string {
  if (!oldestTimestamp) return ''
  const oldest = new Date(oldestTimestamp).getTime()
  const resetAt = oldest + windowMs
  const remainingMs = resetAt - Date.now()
  if (remainingMs <= 0) return ''
  const totalMin = Math.floor(remainingMs / 60_000)
  const days = Math.floor(totalMin / (60 * 24))
  const hours = Math.floor((totalMin - days * 60 * 24) / 60)
  const mins = totalMin % 60
  if (days > 0) return t(lang, 'card.limits.resetDays', { d: days, h: hours })
  if (hours > 0) return t(lang, 'card.limits.resetHours', { h: hours, m: mins })
  return t(lang, 'card.limits.resetMins', { m: mins })
}

function getBarColor(percent: number): string {
  if (percent >= 90) return '#e74c3c'
  if (percent >= 70) return '#f39c12'
  return '#2ecc71'
}

type LimitRowProps = {
  label: string
  stats: WindowStats
  limitUSD: number
  windowMs: number
  language: Language
}

function LimitRow({ label, stats, limitUSD, windowMs, language }: LimitRowProps) {
  const percent = Math.min((stats.costUSD / limitUSD) * 100, 100)
  const barColor = getBarColor(percent)
  const timeStr = formatTimeRemaining(stats.oldestTimestamp, windowMs, language)

  return (
    <div className="mb-2 last:mb-0">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[11px] font-bold text-gray-200">{label}</span>
        <span className="text-[11px] font-bold tabular-nums" style={{ color: barColor }}>
          {percent.toFixed(0)}%
        </span>
      </div>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-1">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percent}%`, background: barColor }}
        />
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-semibold text-gray-400 tabular-nums">
          ${stats.costUSD.toFixed(2)} / ${limitUSD}
        </span>
        {timeStr && (
          <span className="text-[10px] font-semibold text-gray-500">{timeStr}</span>
        )}
      </div>
    </div>
  )
}

export function LimitsCard({ data, plan, language }: Props) {
  const limits = PLAN_LIMITS[plan]

  return (
    <div className="px-3 py-2.5 rounded-[10px] bg-white/[0.04] border border-white/[0.08]">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-accent">
          {t(language, 'card.limits.title')}
        </span>
        <span className="text-[9px] font-bold text-gray-500 uppercase">{limits.displayName}</span>
      </div>
      <LimitRow
        label={t(language, 'card.limits.5h')}
        stats={data.last5h}
        limitUSD={limits.limit5hUSD}
        windowMs={5 * 60 * 60 * 1000}
        language={language}
      />
      <LimitRow
        label={t(language, 'card.limits.week')}
        stats={data.last7d}
        limitUSD={limits.limitWeekUSD}
        windowMs={7 * 24 * 60 * 60 * 1000}
        language={language}
      />
    </div>
  )
}
