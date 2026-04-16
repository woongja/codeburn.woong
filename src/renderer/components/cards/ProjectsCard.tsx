import type { UsageData } from '@shared/types'

type Props = { data: UsageData }

export function ProjectsCard({ data }: Props) {
  const maxCost = Math.max(...data.projects.map((p) => p.costUSD), 0.01)

  return (
    <div className="p-3 rounded-[10px] bg-white/[0.03] border border-white/[0.06]">
      <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Projects</div>
      {data.projects.map((p) => {
        const widthPercent = (p.costUSD / maxCost) * 100
        // Show last 2 segments of path
        const shortName = p.projectPath.split('/').slice(-2).join('/')
        return (
          <div key={p.project} className="flex items-center gap-2 py-1 text-[11px]">
            <span className="text-gray-400 flex-1 truncate" title={p.projectPath}>
              {shortName}
            </span>
            <span className="text-gray-300 font-semibold min-w-[45px] text-right">
              ${p.costUSD.toFixed(2)}
            </span>
            <div className="w-[40px] h-1 bg-white/10 rounded-sm overflow-hidden">
              <div className="h-full rounded-sm bg-blue-500" style={{ width: `${widthPercent}%` }} />
            </div>
          </div>
        )
      })}
      {data.projects.length === 0 && (
        <div className="text-[11px] text-gray-600 text-center py-2">No data</div>
      )}
    </div>
  )
}
