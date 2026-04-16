import type { UsageData, Language } from '@shared/types'
import { t } from '@shared/i18n'

type Props = {
  data: UsageData
  language: Language
  onClick: () => void
}

export function MiniCircle({ data, language, onClick }: Props) {
  const cost = data.totalCostUSD
  const circumference = 2 * Math.PI * 62

  // Progress ring: show proportional to $50 daily budget (arbitrary visual)
  const progress = Math.min(cost / 50, 1)
  const dashOffset = circumference * (1 - progress)

  return (
    <div
      onClick={onClick}
      className="w-[140px] h-[140px] rounded-full relative flex flex-col items-center justify-center cursor-pointer"
      style={{
        background: 'linear-gradient(135deg, #16213e 0%, #0f3460 100%)',
        border: '2px solid rgba(240, 160, 48, 0.3)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 60px rgba(240,160,48,0.1)',
      }}
    >
      <svg
        className="absolute -top-[4px] -left-[4px] w-[148px] h-[148px]"
        style={{ transform: 'rotate(-90deg)' }}
        viewBox="0 0 148 148"
      >
        <circle cx="74" cy="74" r="62" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
        <circle
          cx="74"
          cy="74"
          r="62"
          fill="none"
          stroke="#f0a030"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>

      <div className="text-[26px] font-extrabold text-white leading-none z-10 tabular-nums">
        <span className="text-[15px] text-accent font-bold">$</span>
        {cost.toFixed(2)}
      </div>
      <div className="text-[10px] font-bold text-gray-400 mt-1 z-10 uppercase tracking-wider">
        {t(language, 'mini.today')}
      </div>
    </div>
  )
}
