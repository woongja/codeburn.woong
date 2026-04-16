import type { UsageData } from '@shared/types'

type Props = { data: UsageData }

const MODEL_COLORS: Record<string, string> = {
  'claude-opus-4-6': '#e74c3c',
  'claude-opus-4-5': '#e74c3c',
  'claude-sonnet-4-6': '#3498db',
  'claude-sonnet-4-5': '#3498db',
  'claude-haiku-4-5': '#2ecc71',
  'claude-3-5-haiku': '#2ecc71',
}

function getColor(model: string): string {
  for (const [key, color] of Object.entries(MODEL_COLORS)) {
    if (model.includes(key) || key.includes(model)) return color
  }
  return '#888'
}

export function ModelsCard({ data }: Props) {
  const maxCost = Math.max(...data.models.map((m) => m.costUSD), 0.01)

  return (
    <div className="p-3 rounded-[10px] bg-white/[0.03] border border-white/[0.06]">
      <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Models</div>
      {data.models.map((m) => {
        const color = getColor(m.model)
        const widthPercent = (m.costUSD / maxCost) * 100
        return (
          <div key={m.model} className="flex items-center gap-2 py-1 text-[11px]">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-gray-400 flex-1 truncate">{m.displayName}</span>
            <span className="text-gray-300 font-semibold min-w-[50px] text-right">
              ${m.costUSD.toFixed(2)}
            </span>
            <div className="w-[50px] h-1 bg-white/10 rounded-sm overflow-hidden">
              <div className="h-full rounded-sm" style={{ width: `${widthPercent}%`, background: color }} />
            </div>
          </div>
        )
      })}
      {data.models.length === 0 && (
        <div className="text-[11px] text-gray-600 text-center py-2">No data</div>
      )}
    </div>
  )
}
