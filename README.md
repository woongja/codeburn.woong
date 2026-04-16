# CodeBurn Monitor

Windows 데스크톱 위젯으로 **Claude Code API 사용량/비용을 실시간 모니터링**하는 Electron 앱.
항상 최상위(always-on-top) frameless 윈도우로 화면 모서리에 상주하며, Mac 스타일 UI로 깔끔하게 표시됩니다.

<img width="2558" height="1392" alt="image" src="https://github.com/user-attachments/assets/2645db1a-e021-4e26-9ae6-914de3139e44" />


## Features

- ✅ Claude Code JSONL 세션 파일 실시간 파싱 (chokidar + 10초 쿨다운)
- ✅ 두 가지 위젯 모드: **Mini Circle** (140x140 원형) / **Detailed Panel** (카드 기반)
- ✅ 카드 단위 레이아웃 커스터마이즈 (드래그 재배치, 토글 on/off)
- ✅ 3가지 위젯 크기 프리셋 (Small 260px / Medium 300px / Large 360px)
- ✅ 투명도 조절 (30%~100%)
- ✅ 위젯 자유 드래그 이동 + 위치 저장
- ✅ 한국어/영어 즉시 전환 (KO/EN 토글)
- ✅ 6개 통화 지원 (USD / KRW / EUR / JPY / GBP / CNY)
- ✅ 구독 플랜별 5시간/주간 리밋 진행률 표시 (Free / Pro / Max 5x / Max 20x)
- ✅ Windows 자동 시작 (on/off 가능)
- ✅ 시스템 트레이 상주

---

## 표시 가능한 정보 한눈에 보기

### 현재 표시 지원 항목 (카드 단위)

| 카드 | 내용 | 기본 표시 | 레이아웃 편집에서 on/off |
|------|------|:---------:|:-----------:|
| **프로젝트** (Projects) | 상위 5개 프로젝트별 비용 + 바 차트 | ✅ ON | ✅ |
| **작업 유형별** (Activity) | 코딩/디버깅/탐색 등 13종 카테고리별 비용 | ✅ ON | ✅ |
| **통계** (Statistics) | API 호출 수, 세션 수 | ✅ ON | ✅ |
| **토큰** (Tokens) | Input / Output / Cache Read / Cache Write 토큰 수 | ✅ ON | ✅ |
| **리밋** (Limits) | 5시간 / 주간 세션 사용률 + 예상 리셋 시간 | ✅ ON | ✅ |
| **총 비용** (Total Cost) | 선택 기간 총 비용 + 기간 탭 (Today/7D/30D/All) | ❌ OFF | ✅ |
| **모델별 비용** (Models) | Opus / Sonnet / Haiku 별 비용 + 바 차트 | ❌ OFF | ✅ |
| **일별 차트** (Daily) | 최근 14일 비용 미니 바 차트 | ❌ OFF | ✅ |

### 작업 유형(Activity) 14종 자동 분류

사용자 메시지와 사용된 도구를 보고 각 턴을 아래 중 하나로 분류합니다:

| 카테고리 | 감지 기준 |
|---------|-----------|
| **코딩** | Edit / Write / MultiEdit 도구 사용 |
| **디버깅** | "debug / fix / error / bug / 문제" 등 키워드 |
| **기능 개발** | "feature / add / create / implement" 키워드 |
| **리팩토링** | "refactor / cleanup / simplify / rename" 키워드 |
| **테스트** | "test / coverage" 또는 pytest/jest 등 실행 |
| **탐색/학습** | "explore / research / how / what / explain" 또는 WebSearch |
| **계획/설계** | "plan / design / architect" 또는 ExitPlanMode |
| **에이전트 위임** | Task / Agent 도구 사용 |
| **Git 작업** | git commit/push 등 실행 또는 "commit/PR" 키워드 |
| **빌드/배포** | npm build / docker / deploy 등 |
| **대화** | 단순 인사, 확인 응답 |
| **브레인스토밍** | "brainstorm / idea / what if" 키워드 |
| **이어가기** | "계속 / 진행해 / 고고 / continue / keep going" 같은 짧은 지시 |
| **기타** | 위 어느 것에도 안 맞는 경우 |

**분류 우선순위**: 도구 기반 규칙 → 메시지 키워드 → 이어가기 감지 → 기타(fallback)

> 기본으로 꺼진 3개 카드도 **Layout Editor에서 토글 한 번**으로 켤 수 있습니다.

### Mini Circle 모드 표시 항목

| 항목 | 표시 |
|------|:----:|
| 오늘 총 비용 ($X.XX) | ✅ |
| 5시간 리밋 진행률 링 | ✅ |
| "today" 라벨 | ✅ |

### 개별 카드별 상세

| 카드 | 표시 항목 |
|------|----------|
| **통계** | API 호출 수 ✅ · 세션 수 ✅ · 캐시 히트율 ❌ (기본 숨김) |
| **토큰** | 입력 토큰 ✅ · 출력 토큰 ✅ · 캐시 읽기 ✅ · 캐시 쓰기 ✅ |
| **모델별** | 모델명 ✅ · 비용 ✅ · 가로 바 차트 ✅ · 호출 횟수 ❌ |
| **프로젝트** | 프로젝트명 (최근 2 단계 경로) ✅ · 비용 ✅ · 바 차트 ✅ · 호출 횟수 ❌ |
| **일별** | 일별 비용 바 차트 ✅ (최근 14일) · 날짜 라벨 ✅ |
| **리밋** | 5시간 사용률 + 진행바 ✅ · 주간 사용률 + 진행바 ✅ · 리셋 예상 시간 ✅ · 색상 자동 변경 (녹색/노랑/빨강) ✅ |

### 현재 미지원 / 미표시 항목

codeburn 원본 CLI와 달리 **일부러 빼둔** 항목들:

| 항목 | 상태 | 이유 |
|------|:----:|------|
| Reasoning tokens (확장사고) | ❌ | 간소화 |
| Web search 건당 비용 | ❌ | 간소화 |
| One-shot 성공률 | ❌ | 위젯 공간 한정 |
| Tool 사용 통계 (Read/Edit/Bash...) | ❌ | 위젯 공간 한정 |
| Shell command 통계 | ❌ | 위젯 공간 한정 |
| MCP server 통계 | ❌ | 위젯 공간 한정 |
| Retry 횟수 (edit-bash-edit 사이클) | ❌ | 위젯 공간 한정 |
| Codex / Cursor / OpenCode 지원 | ❌ | v1에서는 Claude Code만 |
| 다크/라이트 테마 전환 | ❌ | 다크 모드 고정 |
| 멀티 모니터 배치 최적화 | ❌ | primary monitor 기준 |

필요하시면 issue 열어주세요. 공간 확장하거나 별도 카드로 추가 가능합니다.

---

## 설정 방법

### 1. 위젯 헤더 버튼 (패널 모드에서)

```
┌────────────────────────────────┐
│ ● ● ●   CODEBURN    [KO|EN]   │
├────────────────────────────────┤
```

| 버튼 | 기능 |
|------|------|
| 🔴 빨간 원 (×) | Mini Circle 모드로 축소 |
| 🟡 노란 원 (−) | Mini Circle로 축소 |
| 🟢 초록 원 (⚙) | **Layout Editor 열기** |
| KO / EN | 언어 즉시 전환 |

### 2. Layout Editor

초록 원(⚙) 클릭하면 나오는 설정 창:

| 설정 | 동작 |
|------|------|
| **카드 토글** | 각 카드를 on/off |
| **드래그 핸들 (☰)** | 카드 순서 변경 |
| **Widget Size** | Small (260px) / Medium (300px) / Large (360px) |
| **Opacity** | 30% ~ 100% 투명도 슬라이더 |
| **Reset Default** | 기본 레이아웃으로 복원 |
| **Done** | 편집 종료 |

모든 변경은 **자동 저장**되어 다음 실행 시 복원됩니다.

### 3. 시스템 트레이 메뉴 (우클릭)

트레이 아이콘 우클릭:

```
CodeBurn Monitor
─────────────
위젯 모드     ▶ Mini Circle / Detailed Panel
기간          ▶ Today / 7 Days / 30 Days / All
통화          ▶ USD / KRW / EUR / JPY / GBP / CNY
플랜          ▶ Free / Pro / Max 5x / Max 20x
언어          ▶ 한국어 / English
─────────────
레이아웃 편집...
─────────────
자동 시작     [✓]
─────────────
종료
```

**좌클릭**: 위젯 보이기/숨기기 토글

### 4. 플랜 설정 (중요!)

리밋 카드가 정확한 정보를 주려면 본인의 Claude 구독 플랜을 선택해야 합니다.
트레이 우클릭 → **플랜** 메뉴에서:

| 플랜 | 5시간 한계 (추정) | 주간 한계 (추정) |
|------|------------------|-----------------|
| Free | $1 | $5 |
| **Pro** (기본) | $15 | $60 |
| Max 5x | $75 | $300 |
| Max 20x | $250 | $1,200 |

> ⚠️ 이 한계치는 커뮤니티 추정치이며 Anthropic 공식 수치가 아닙니다.
> Anthropic이 정확한 리밋을 공개하지 않아 경험적 추정치를 사용합니다.

---

## 데이터 소스

- 경로: `~/.claude/projects/<project>/<session>.jsonl`
- Windows: `C:\Users\<username>\.claude\projects\...`
- Claude Code가 저장하는 원본 JSONL 파일을 직접 파싱 (API 호출 없음, 키 불필요)
- 변경 감지: chokidar로 파일 감시 + 10초 쿨다운 (불필요한 재파싱 방지)
- 가격 정보: [LiteLLM model_prices](https://github.com/BerriAI/litellm) JSON 캐시 24시간
- 환율: [Frankfurter API](https://www.frankfurter.app/) (ECB, 무료, API 키 불필요)

### Fast mode 배율 지원

Claude Code "Fast mode" 사용 시 비용 배율 자동 적용:

| 모델 | Fast 배율 |
|------|:---------:|
| Claude Opus 4.6 | 6x |
| Claude Sonnet 4.6 | 5x |
| Claude Haiku 4.5 | 5x |

---

## 설치 및 실행

### 필요사항

- Node.js 20+
- npm
- Windows 10/11

### 설치

```bash
git clone https://github.com/<your-fork>/codeburn-monitor.git
cd codeburn-monitor
npm install
```

### 개발 모드 실행

```bash
npm run electron:dev
```

Vite dev server + TypeScript watch + Electron이 동시에 실행됩니다.
DevTools도 자동으로 열립니다.

### 프로덕션 빌드 (Unpacked .exe)

```bash
npm run build   # dist/ 생성 (renderer + main 컴파일)
npm run pack    # release/win-unpacked/ 에 실행 파일 생성
```

#### 빌드 결과물 위치

```
release/
└── win-unpacked/
    ├── CodeBurn Monitor.exe   ← 더블클릭하면 앱 실행 (181 MB)
    ├── *.dll                   (Chromium, V8 등 런타임)
    ├── locales/                (다국어 리소스)
    ├── resources/app.asar      (앱 코드)
    └── ...
```

전체 폴더 크기: 약 230 MB (Electron + Chromium 포함)

#### 실행 방법

**파일 탐색기에서:**
1. `release/win-unpacked` 폴더 열기
2. `CodeBurn Monitor.exe` 더블클릭

**터미널에서:**
```bash
"release/win-unpacked/CodeBurn Monitor.exe"
```

> ⚠️ **주의**: `win-unpacked` 폴더 내 모든 파일이 함께 있어야 실행됩니다.
> `.exe` 하나만 따로 옮기면 동작하지 않습니다 (DLL, locales, resources 등 필요).

#### 다른 사용자와 공유

폴더를 통째로 ZIP으로 묶어 공유하면 됩니다.

**Git Bash / PowerShell:**
```bash
cd release
tar -a -c -f CodeBurn-Monitor-v0.1.0-win-x64.zip win-unpacked
```

**파일 탐색기:**
- `win-unpacked` 폴더 우클릭 → "ZIP으로 압축"

받은 사람은 압축 풀고 `CodeBurn Monitor.exe`를 더블클릭하면 바로 사용 가능합니다.
별도 설치 절차가 필요 없는 **portable** 형태입니다.

### NSIS 설치 파일 (.exe installer) 생성

자동 설치 파일을 만들려면:

1. **Windows 개발자 모드 활성화** (설정 → 개인정보/보안 → 개발자용)
   - electron-builder가 캐시 추출 시 symbolic link를 사용하기 때문
2. `electron-builder.yml`의 `win.target`을 `nsis`로 변경:
   ```yaml
   win:
     target: nsis
   ```
3. 다음 실행:
   ```bash
   npm run dist
   ```

설치 파일은 `release/CodeBurn Monitor Setup X.X.X.exe` 에 생성됩니다.

### 단일 파일 (.exe) Portable 빌드

폴더 통째로가 아니라 **단일 .exe 파일**로 만들려면:

1. **Windows 개발자 모드 활성화** (위와 동일)
2. `electron-builder.yml`의 `win.target`을 `portable`로 변경:
   ```yaml
   win:
     target: portable
   ```
3. ```bash
   npm run dist
   ```

결과: `release/CodeBurn Monitor X.X.X.exe` 단일 파일.
실행 시 임시 폴더에 압축 해제 후 동작합니다 (첫 실행 약간 느림).

### 빌드 결과물 직접 실행 (개발 중)

```bash
npm run build
npm start
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 33 |
| UI | React 19 + TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Build | Vite 6 (renderer) + tsc (main) |
| File watch | chokidar 4 |
| Settings | electron-store 8 |
| Auto-start | auto-launch |
| Packaging | electron-builder 25 |

---

## Project Structure

```
codeburn-monitor/
├── src/
│   ├── main/                # Electron main process
│   │   ├── index.ts         # App entry, BrowserWindow
│   │   ├── tray.ts          # System tray menu (i18n)
│   │   ├── store.ts         # Settings persistence
│   │   ├── watcher.ts       # File watcher + cooldown
│   │   ├── ipc.ts           # IPC handlers
│   │   └── auto-launch.ts   # Windows auto-start
│   ├── preload.ts           # contextBridge IPC surface
│   ├── renderer/
│   │   ├── App.tsx          # Root: drag, mode switch
│   │   ├── main.tsx
│   │   ├── index.html
│   │   ├── components/
│   │   │   ├── MiniCircle.tsx
│   │   │   ├── DetailPanel.tsx
│   │   │   ├── LayoutEditor.tsx
│   │   │   └── cards/
│   │   │       ├── CostCard.tsx
│   │   │       ├── StatsCard.tsx
│   │   │       ├── TokensCard.tsx
│   │   │       ├── ModelsCard.tsx
│   │   │       ├── ProjectsCard.tsx
│   │   │       ├── DailyCard.tsx
│   │   │       └── LimitsCard.tsx
│   │   ├── hooks/
│   │   │   ├── useUsageData.ts
│   │   │   ├── useSettings.ts
│   │   │   └── useT.ts
│   │   └── styles/globals.css
│   └── shared/              # Main/Renderer 공유
│       ├── types.ts         # TypeScript 타입 정의
│       ├── constants.ts     # 기본값, 플랜 한계치
│       ├── parser.ts        # JSONL 파서 + 집계
│       ├── pricing.ts       # LiteLLM fetch + 비용 계산
│       ├── currency.ts      # Frankfurter API
│       └── i18n.ts          # 한국어/영어 번역
├── docs/superpowers/        # 설계 문서 및 구현 계획
├── mockup/                  # HTML 목업
├── package.json
├── electron-builder.yml
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json / tsconfig.node.json
```

---

## 설정값 저장 위치

모든 사용자 설정은 **electron-store**에 JSON으로 저장됩니다:

- Windows: `%APPDATA%\codeburn-monitor\config.json`

저장되는 항목:

```typescript
{
  mode: 'circle' | 'panel',
  position: { x, y },
  period: 'today' | '7d' | '30d' | 'all',
  currency: 'USD' | 'KRW' | 'EUR' | 'JPY' | 'GBP' | 'CNY',
  plan: 'free' | 'pro' | 'max5x' | 'max20x',
  language: 'ko' | 'en',
  autoStart: boolean,
  layout: {
    cards: [ { id, enabled, order }, ... ],
    widgetSize: 'small' | 'medium' | 'large',
    opacity: number  // 0.3 ~ 1.0
  }
}
```

---

## Credits & Inspiration

이 프로젝트는 [AgentSeal/codeburn](https://github.com/AgentSeal/codeburn) CLI에서 영감을 받아
**데스크톱 위젯 버전**으로 재구성했습니다. 파싱 로직과 가격 정보는 codeburn을 참고했습니다.

- **codeburn** by AgentSeal — CLI 터미널 대시보드
- **codeburn-monitor** (이 프로젝트) — Windows 데스크톱 위젯


## Roadmap

- [ ] macOS 지원
- [ ] Linux 지원
- [ ] Codex / Cursor / OpenCode 지원
- [ ] 커스텀 예산 알림 (Slack / 알림)
- [ ] 히스토리 그래프 (주/월 단위 트렌드)
- [ ] 다크/라이트 테마 전환
- [ ] 멀티 모니터 스마트 배치
- [ ] 카테고리 분류 및 One-shot 성공률 카드

Issue / PR 환영합니다.
