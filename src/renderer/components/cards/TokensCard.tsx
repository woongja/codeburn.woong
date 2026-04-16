import type { UsageData } from '@shared/types'

type Props = { data: UsageData }

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[12px] py-1">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300 font-semibold">{value}</span>
    </div>
  )
}

export function TokensCard({ data }: Props) {
  return (
    <div className="p-3 rounded-[10px] bg-white/[0.03] border border-white/[0.06]">
      <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Tokens</div>
      <StatRow label="Input" value={formatTokens(data.tokens.inputTokens)} />
      <StatRow label="Output" value={formatTokens(data.tokens.outputTokens)} />
      <StatRow label="Cache Read" value={formatTokens(data.tokens.cacheReadInputTokens)} />
      <StatRow label="Cache Write" value={formatTokens(data.tokens.cacheCreationInputTokens)} />
    </div>
  )
}
