import type { Language } from './types'

type Dict = Readonly<Record<string, string>>

const en: Dict = {
  // Period tabs
  'period.today': 'Today',
  'period.7d': '7D',
  'period.30d': '30D',
  'period.all': 'All',

  // Stats card
  'card.stats.title': 'Statistics',
  'card.stats.apiCalls': 'API Calls',
  'card.stats.sessions': 'Sessions',
  'card.stats.cacheHit': 'Cache Hit',

  // Tokens card
  'card.tokens.title': 'Tokens',
  'card.tokens.input': 'Input',
  'card.tokens.output': 'Output',
  'card.tokens.cacheRead': 'Cache Read',
  'card.tokens.cacheWrite': 'Cache Write',

  // Other card titles
  'card.models.title': 'Models',
  'card.projects.title': 'Projects',
  'card.daily.title': 'Daily',
  'card.limits.title': 'Limits',
  'card.activity.title': 'By Activity',

  // Task categories
  'category.coding': 'Coding',
  'category.debugging': 'Debugging',
  'category.feature': 'Feature Dev',
  'category.refactoring': 'Refactoring',
  'category.testing': 'Testing',
  'category.exploration': 'Exploration',
  'category.planning': 'Planning',
  'category.delegation': 'Delegation',
  'category.git': 'Git Ops',
  'category.build': 'Build/Deploy',
  'category.conversation': 'Conversation',
  'category.brainstorming': 'Brainstorming',
  'category.continuation': 'Continue',
  'category.general': 'General',
  'card.limits.5h': '5h Session',
  'card.limits.week': 'Weekly',
  'card.limits.resetMins': 'Reset in {m}m',
  'card.limits.resetHours': 'Reset in {h}h {m}m',
  'card.limits.resetDays': 'Reset in {d}d {h}h',

  // Common
  'common.noData': 'No data',
  'mini.today': 'today',
  'mini.loading': 'Loading...',
  'mini.apiUnavailable': 'electronAPI\nnot available\n(preload error)',

  // Layout editor
  'editor.title': 'Layout Editor',
  'editor.size': 'Widget Size',
  'editor.size.small': 'Small',
  'editor.size.medium': 'Medium',
  'editor.size.large': 'Large',
  'editor.opacity': 'Opacity',
  'editor.reset': 'Reset Default',
  'editor.done': 'Done',

  // Card labels (in editor)
  'cards.cost': 'Total Cost',
  'cards.limits': '5h / Weekly Limits',
  'cards.stats': 'Statistics',
  'cards.tokens': 'Tokens',
  'cards.models': 'Models',
  'cards.projects': 'Projects',
  'cards.daily': 'Daily Chart',
  'cards.activity': 'By Activity',

  // Tray menu
  'tray.title': 'CodeBurn Monitor',
  'tray.mode': 'Widget Mode',
  'tray.mode.circle': 'Mini Circle',
  'tray.mode.panel': 'Detailed Panel',
  'tray.period': 'Period',
  'tray.period.today': 'Today',
  'tray.period.7d': '7 Days',
  'tray.period.30d': '30 Days',
  'tray.period.all': 'All',
  'tray.currency': 'Currency',
  'tray.plan': 'Plan',
  'tray.language': 'Language',
  'tray.editLayout': 'Edit Layout...',
  'tray.autoStart': 'Auto Start',
  'tray.quit': 'Quit',

  // DetailPanel buttons
  'panel.quit': 'Quit app',
  'panel.minimize': 'Minimize to circle',
  'panel.hide': 'Hide widget',
  'panel.editLayout': 'Edit Layout',
}

const ko: Dict = {
  // Period tabs
  'period.today': '오늘',
  'period.7d': '7일',
  'period.30d': '30일',
  'period.all': '전체',

  // Stats card
  'card.stats.title': '통계',
  'card.stats.apiCalls': 'API 호출',
  'card.stats.sessions': '세션',
  'card.stats.cacheHit': '캐시 히트',

  // Tokens card
  'card.tokens.title': '토큰',
  'card.tokens.input': '입력',
  'card.tokens.output': '출력',
  'card.tokens.cacheRead': '캐시 읽기',
  'card.tokens.cacheWrite': '캐시 쓰기',

  // Other card titles
  'card.models.title': '모델',
  'card.projects.title': '프로젝트',
  'card.daily.title': '일별',
  'card.limits.title': '리밋',
  'card.activity.title': '작업 유형',

  // Task categories
  'category.coding': '코딩',
  'category.debugging': '디버깅',
  'category.feature': '기능 개발',
  'category.refactoring': '리팩토링',
  'category.testing': '테스트',
  'category.exploration': '탐색/학습',
  'category.planning': '계획/설계',
  'category.delegation': '에이전트 위임',
  'category.git': 'Git 작업',
  'category.build': '빌드/배포',
  'category.conversation': '대화',
  'category.brainstorming': '브레인스토밍',
  'category.continuation': '이어가기',
  'category.general': '기타',
  'card.limits.5h': '5시간 세션',
  'card.limits.week': '주간',
  'card.limits.resetMins': '{m}분 후 리셋',
  'card.limits.resetHours': '{h}시간 {m}분 후 리셋',
  'card.limits.resetDays': '{d}일 {h}시간 후 리셋',

  // Common
  'common.noData': '데이터 없음',
  'mini.today': '오늘',
  'mini.loading': '로딩 중...',
  'mini.apiUnavailable': 'electronAPI\n사용 불가\n(preload 오류)',

  // Layout editor
  'editor.title': '레이아웃 편집',
  'editor.size': '위젯 크기',
  'editor.size.small': '작게',
  'editor.size.medium': '보통',
  'editor.size.large': '크게',
  'editor.opacity': '투명도',
  'editor.reset': '기본값',
  'editor.done': '완료',

  // Card labels (in editor)
  'cards.cost': '총 비용',
  'cards.limits': '5시간 / 주간 리밋',
  'cards.stats': '기본 통계',
  'cards.tokens': '토큰 상세',
  'cards.models': '모델별 비용',
  'cards.projects': '프로젝트별 비용',
  'cards.daily': '일별 차트',
  'cards.activity': '작업 유형별',

  // Tray menu
  'tray.title': 'CodeBurn 모니터',
  'tray.mode': '위젯 모드',
  'tray.mode.circle': '미니 서클',
  'tray.mode.panel': '상세 패널',
  'tray.period': '기간',
  'tray.period.today': '오늘',
  'tray.period.7d': '7일',
  'tray.period.30d': '30일',
  'tray.period.all': '전체',
  'tray.currency': '통화',
  'tray.plan': '플랜',
  'tray.language': '언어',
  'tray.editLayout': '레이아웃 편집...',
  'tray.autoStart': '자동 시작',
  'tray.quit': '종료',

  // DetailPanel buttons
  'panel.quit': '앱 종료',
  'panel.minimize': '미니 서클로 축소',
  'panel.hide': '위젯 숨기기',
  'panel.editLayout': '레이아웃 편집',
}

const dictionaries: Record<Language, Dict> = { en, ko }

export function t(lang: Language, key: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[lang] ?? en
  let str = dict[key] ?? en[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v))
    }
  }
  return str
}
