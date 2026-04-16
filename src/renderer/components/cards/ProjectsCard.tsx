import type { UsageData, Language } from '@shared/types'
import { t } from '@shared/i18n'

type Props = { data: UsageData; language: Language }

export function ProjectsCard({ data, language }: Props) {
  const maxCost = Math.max(...data.projects.map((p) => p.costUSD), 0.01)

  return (
    <div className="px-3 py-2.5 rounded-[10px] bg-white/[0.04] border border-white/[0.08]">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-accent mb-1.5">
        {t(language, 'card.projects.title')}
      </div>
      {data.projects.map((p) => {
        const widthPercent = (p.costUSD / maxCost) * 100
        const shortName = p.projectPath.split('/').slice(-2).join('/')
        return (
          <div key={p.project} className="flex items-center gap-2 py-1">
            <span className="text-[12px] font-semibold text-gray-200 flex-1 truncate" title={p.projectPath}>
              {shortName}
            </span>
            <span className="text-[12px] font-bold text-white tabular-nums min-w-[45px] text-right">
              ${p.costUSD.toFixed(2)}
            </span>
            <div className="w-[40px] h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${widthPercent}%` }} />
            </div>
          </div>
        )
      })}
      {data.projects.length === 0 && (
        <div className="text-[11px] font-semibold text-gray-500 text-center py-2">
          {t(language, 'common.noData')}
        </div>
      )}
    </div>
  )
}
