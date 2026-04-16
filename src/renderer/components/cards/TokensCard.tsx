import type { UsageData, Language } from '@shared/types'
import { t } from '@shared/i18n'

type Props = { data: UsageData; language: Language }

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-[12px] font-semibold text-gray-300">{label}</span>
      <span className="text-[14px] font-bold text-white tabular-nums">{value}</span>
    </div>
  )
}

export function TokensCard({ data, language }: Props) {
  return (
    <div className="px-3 py-2.5 rounded-[10px] bg-white/[0.04] border border-white/[0.08]">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-accent mb-1.5">
        {t(language, 'card.tokens.title')}
      </div>
      <StatRow label={t(language, 'card.tokens.input')} value={formatTokens(data.tokens.inputTokens)} />
      <StatRow label={t(language, 'card.tokens.output')} value={formatTokens(data.tokens.outputTokens)} />
      <StatRow label={t(language, 'card.tokens.cacheRead')} value={formatTokens(data.tokens.cacheReadInputTokens)} />
      <StatRow label={t(language, 'card.tokens.cacheWrite')} value={formatTokens(data.tokens.cacheCreationInputTokens)} />
    </div>
  )
}
