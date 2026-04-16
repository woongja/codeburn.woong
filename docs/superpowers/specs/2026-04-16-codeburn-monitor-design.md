# CodeBurn Monitor - Design Spec

## Overview

Windows 데스크톱 위젯으로 Claude Code API 사용량과 비용을 실시간 모니터링하는 Electron 앱.
항상 최상위(always-on-top) frameless 윈도우로 화면 오른쪽 아래에 표시되며, 시스템 트레이에 상주한다.

## Widget Modes

두 가지 위젯 모드를 제공하며 전환 가능:

### Mode C: Mini Circle (기본)
- 140x140px 원형 위젯
- 오늘 총 비용만 표시 ($12.47)
- 외곽 링에 예산 대비 사용률 표시 (선택적)
- 클릭하면 Mode B로 확장

### Mode B: Detailed Panel (커스터마이즈 가능)
- 기본 300x auto 세로형 패널, 레이아웃 편집 모드에서 크기/배치 변경 가능
- **카드(블록) 기반 UI**: 각 정보가 독립적인 카드로 구성
- 사용자가 설정에서 카드를 on/off 하고 순서를 변경할 수 있음
- 닫기/축소 버튼으로 Mode C로 복귀

### 사용 가능한 카드 목록

| 카드 ID | 이름 | 기본 표시 | 내용 |
|---------|------|:---------:|------|
| `cost` | 총 비용 | ON | 선택 기간 총 비용 (큰 글씨), 기간 탭 (Today/7D/30D/All) |
| `stats` | 기본 통계 | ON | API Calls, Sessions, Cache Hit % |
| `tokens` | 토큰 상세 | ON | Input, Output, Cache Read, Cache Write 토큰 수 |
| `models` | 모델별 비용 | ON | Opus/Sonnet/Haiku 비용 + bar chart |
| `projects` | 프로젝트별 비용 | ON | 상위 5개 프로젝트 비용 + bar chart |
| `daily` | 일별 차트 | ON | 최근 7~14일 미니 bar chart (기간에 따라 조정) |

### 전환 방식
- 위젯 클릭으로 C <-> B 토글
- 시스템 트레이 우클릭 메뉴에서도 전환 가능

## Layout Edit Mode (레이아웃 편집 모드)

### 진입 방법
- 트레이 메뉴 > "Edit Layout" 클릭
- 또는 Mode B 위젯 상단의 기어(⚙) 아이콘 클릭

### 편집 모드 UI
편집 모드 진입 시 위젯이 확장되며 설정 오버레이가 표시:

```
┌──────────────────────────────┐
│  ⚙ Layout Editor        [✕] │
├──────────────────────────────┤
│                              │
│  ☰ [ON]  총 비용        ━━━  │  ← 드래그 핸들(☰)로 순서 변경
│  ☰ [ON]  기본 통계      ━━━  │  ← 토글로 on/off
│  ☰ [ON]  토큰 상세      ━━━  │
│  ☰ [ON]  모델별 비용    ━━━  │
│  ☰ [ON]  프로젝트별     ━━━  │
│  ☰ [ON]  일별 차트      ━━━  │
│                              │
│  Widget Size                 │
│  [Small] [Medium] [Large]    │
│                              │
│  Widget Opacity              │
│  ──●────────── 85%           │
│                              │
│  [Reset to Default]  [Done]  │
└──────────────────────────────┘
```

### 편집 가능 항목
- **카드 표시 on/off**: 각 카드를 토글로 켜고 끌 수 있음
- **카드 순서**: 드래그로 순서 변경
- **위젯 크기 프리셋**: Small (260px) / Medium (300px) / Large (360px)
- **위젯 투명도**: 30% ~ 100% 슬라이더
- **Reset to Default**: 기본 레이아웃으로 복원

### 저장
- 모든 레이아웃 설정은 electron-store에 자동 저장
- 다음 실행 시 복원

## Position & Dragging

- 기본 위치: 화면 오른쪽 아래 (taskbar 위)
- 드래그로 자유 이동 가능
- 위치는 electron-store에 저장, 다음 실행 시 복원
- 화면 밖으로 나가지 않도록 boundary 처리

## Data Source

### Session Files
- 경로: `~/.claude/projects/<sanitized-path>/<session-id>.jsonl`
- 각 줄은 JSON 객체 (role, model, usage, costUSD, tool_use 등)

### Parsing Logic (codeburn 참고)
- assistant 역할 메시지에서 `model`, `usage` (input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens) 추출
- `costUSD` 필드가 있으면 직접 사용
- 없으면 LiteLLM 가격표로 계산:
  ```
  cost = input * inputCostPerToken
       + output * outputCostPerToken
       + cacheWrite * cacheWriteCostPerToken
       + cacheRead * cacheReadCostPerToken
  ```
- **Fast mode 배율**: `speed` 필드가 `'fast'`인 경우 모델별 멀티플라이어 적용
  - Opus 4.6 fast: 6x
  - Sonnet 4.6 fast: 5x
  - Haiku 4.5 fast: 5x
- API message ID 기반 중복 제거

### Pricing
- LiteLLM model_prices JSON 파일에서 가격 fetch
- 24시간 캐시 (로컬 파일)
- 네트워크 실패 시 하드코딩 fallback 가격 사용:
  - Opus 4.6: $15/$75 per 1M tokens (input/output)
  - Sonnet 4.6: $3/$15
  - Haiku 4.5: $0.80/$4

### Project Grouping
- JSONL 파일 경로에서 프로젝트명 추출: `~/.claude/projects/<project-name>/`
- project-name의 `-`를 `/`로 변환하여 사람이 읽을 수 있는 경로로 표시
- 프로젝트별 총 비용, API calls 집계

### Daily Aggregation
- 각 API call의 timestamp에서 날짜(YYYY-MM-DD) 추출
- 일별 총 비용, API calls 집계
- 선택 기간에 맞춰 표시 (Today=1일, 7D=7일, 30D=30일)

### Refresh Strategy
- chokidar로 `~/.claude/projects/` 하위 `.jsonl` 파일 변경 감지
- 10초 쿨다운: 파일 변경 이벤트 후 최소 10초 대기 후 재파싱
- 쿨다운 내 추가 변경은 무시하되, 쿨다운 만료 시 한 번 더 파싱

## Period Filtering

- **Today**: 오늘 00:00 ~ 현재
- **7D**: 최근 7일
- **30D**: 최근 30일
- **All**: 전체 기간

기간은 위젯 내 탭 클릭 또는 트레이 메뉴에서 전환.

## Currency

- 기본: USD ($)
- 트레이 설정에서 변경 가능
- 환율: Frankfurter API (ECB, 무료, API 키 불필요)
- 환율 24시간 캐시
- 지원 통화: USD, KRW, EUR, JPY, GBP, CNY (6개로 시작)

## System Tray

우클릭 메뉴 구성:
```
CodeBurn Monitor
─────────────────
Widget Mode    ▶  [ ] Mini Circle
                  [ ] Detailed Panel
Period         ▶  [ ] Today
                  [ ] 7 Days
                  [ ] 30 Days
                  [ ] All
Currency       ▶  [ ] USD ($)
                  [ ] KRW (₩)
                  [ ] EUR
                  [ ] JPY
                  [ ] GBP
                  [ ] CNY
─────────────────
Edit Layout...
─────────────────
Auto Start        [v]
─────────────────
Quit
```

좌클릭: 위젯 표시/숨김 토글

## Auto Start

- Windows Registry를 통한 자동 시작 (electron-builder의 auto-launch 기능)
- 트레이 메뉴에서 on/off 토글
- 설정은 electron-store에 저장

## Settings Schema

electron-store에 저장되는 전체 설정:

```typescript
interface Settings {
  // Widget
  mode: 'circle' | 'panel';
  position: { x: number; y: number };
  period: 'today' | '7d' | '30d' | 'all';
  currency: 'USD' | 'KRW' | 'EUR' | 'JPY' | 'GBP' | 'CNY';
  autoStart: boolean;

  // Layout (Mode B)
  layout: {
    cards: Array<{
      id: 'cost' | 'stats' | 'tokens' | 'models' | 'projects' | 'daily';
      enabled: boolean;
      order: number;
    }>;
    widgetSize: 'small' | 'medium' | 'large';  // 260/300/360px
    opacity: number;  // 0.3 ~ 1.0
  };
}
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 33 |
| UI | React 19 + TypeScript |
| Build | Vite (renderer) + tsc (main) |
| File Watch | chokidar 4 |
| Settings | electron-store 10 |
| Drag & Sort | @dnd-kit/core (카드 순서 변경) |
| Packaging | electron-builder |
| Styling | Tailwind CSS 4 |

## Project Structure

```
codeburn-monitor/
├── package.json
├── electron-builder.yml
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # App entry, window creation
│   │   ├── tray.ts              # System tray setup
│   │   ├── store.ts             # electron-store config + defaults
│   │   ├── watcher.ts           # File watcher + cooldown logic
│   │   └── auto-launch.ts       # Windows auto-start
│   ├── renderer/                # React UI
│   │   ├── index.html
│   │   ├── main.tsx             # React entry
│   │   ├── App.tsx              # Root component, mode switching
│   │   ├── components/
│   │   │   ├── MiniCircle.tsx   # Mode C widget
│   │   │   ├── DetailPanel.tsx  # Mode B container, renders card list
│   │   │   ├── LayoutEditor.tsx # Layout edit mode overlay
│   │   │   ├── DragHandle.tsx   # Window drag behavior
│   │   │   └── cards/           # Individual card components
│   │   │       ├── CostCard.tsx
│   │   │       ├── StatsCard.tsx
│   │   │       ├── TokensCard.tsx
│   │   │       ├── ModelsCard.tsx
│   │   │       ├── ProjectsCard.tsx
│   │   │       └── DailyCard.tsx
│   │   ├── hooks/
│   │   │   ├── useUsageData.ts  # IPC subscription for usage data
│   │   │   └── useSettings.ts   # IPC subscription for settings
│   │   └── styles/
│   │       └── globals.css
│   ├── shared/                  # Shared between main & renderer
│   │   ├── types.ts             # TypeScript types
│   │   ├── parser.ts            # JSONL session parser
│   │   ├── pricing.ts           # Cost calculation + LiteLLM + fast mode
│   │   ├── currency.ts          # Exchange rate fetcher
│   │   └── constants.ts         # Fallback prices, paths, defaults
│   └── preload.ts               # Electron preload script (contextBridge)
├── docs/
├── mockup/
└── resources/                   # App icons (tray icon, app icon)
```

## IPC Communication

Main <-> Renderer 간 통신:

| Channel | Direction | Payload |
|---------|-----------|---------|
| `usage-data` | main -> renderer | `UsageData` (parsed summary with projects, daily) |
| `settings-changed` | main -> renderer | `Settings` |
| `change-mode` | renderer -> main | `'circle' \| 'panel'` |
| `change-period` | renderer -> main | `'today' \| '7d' \| '30d' \| 'all'` |
| `update-layout` | renderer -> main | `LayoutSettings` (cards, size, opacity) |
| `window-drag` | renderer -> main | `{ deltaX, deltaY }` |
| `save-position` | renderer -> main | `{ x, y }` |
| `open-layout-editor` | renderer -> main | (no payload) |
| `resize-window` | renderer -> main | `{ width, height }` |

## Non-Goals (v1 scope out)

- Codex, Cursor, OpenCode 지원 (Claude Code만)
- 예산 설정 및 알림
- 다크/라이트 테마 전환 (다크 모드 고정)
- 멀티 모니터 지원 (primary monitor만)
- 카테고리 분류 (coding/debugging 등)
- Tool/Shell/MCP 통계
