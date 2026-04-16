# CodeBurn Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Windows 데스크톱 위젯으로 Claude Code API 사용량/비용을 실시간 모니터링하는 Electron 앱 구현

**Architecture:** Electron main process가 chokidar로 `~/.claude/projects/` JSONL 파일을 감시하고, 파싱 결과를 IPC로 React renderer에 전달. renderer는 Mini Circle(Mode C)과 Detailed Panel(Mode B) 두 가지 모드를 제공하며, Layout Editor로 카드 배치 커스터마이즈 가능.

**Tech Stack:** Electron 33, React 19, TypeScript 5.6, Vite 6, chokidar 4, electron-store 10, @dnd-kit/core, Tailwind CSS 4, electron-builder

---

## File Structure

```
codeburn-monitor/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── electron-builder.yml
├── src/
│   ├── main/
│   │   ├── index.ts             # Electron app entry, BrowserWindow
│   │   ├── tray.ts              # System tray menu
│   │   ├── store.ts             # electron-store settings
│   │   ├── watcher.ts           # chokidar file watcher + cooldown
│   │   ├── auto-launch.ts       # Windows auto-start registry
│   │   └── ipc.ts               # IPC handler registration
│   ├── preload.ts               # contextBridge API
│   ├── renderer/
│   │   ├── index.html
│   │   ├── main.tsx             # React entry
│   │   ├── App.tsx              # Root: mode switch, drag, data subscription
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
│   │   │       └── DailyCard.tsx
│   │   ├── hooks/
│   │   │   ├── useUsageData.ts
│   │   │   └── useSettings.ts
│   │   └── styles/
│   │       └── globals.css
│   └── shared/
│       ├── types.ts
│       ├── constants.ts
│       ├── parser.ts
│       ├── pricing.ts
│       └── currency.ts
└── resources/
    └── icon.png
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `electron-builder.yml`
- Create: `src/renderer/index.html`
- Create: `tailwind.config.ts`
- Create: `src/renderer/styles/globals.css`
- Create: `resources/icon.png` (placeholder)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "codeburn-monitor",
  "version": "0.1.0",
  "description": "Desktop widget for monitoring Claude Code API usage and costs",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.node.json && vite build",
    "electron:dev": "concurrently \"vite\" \"tsc -p tsconfig.node.json --watch\" \"electron .\"",
    "start": "electron .",
    "pack": "electron-builder --dir",
    "dist": "electron-builder"
  },
  "dependencies": {
    "chokidar": "^4.0.0",
    "electron-store": "^10.0.0",
    "auto-launch": "^5.0.6"
  },
  "devDependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@types/auto-launch": "^5.0.5",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "concurrently": "^9.0.0",
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "postcss": "^8.4.47",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json (renderer)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "paths": {
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": ["src/renderer", "src/shared"]
}
```

- [ ] **Step 3: Create tsconfig.node.json (main process)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "rootDir": "src",
    "paths": {
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": ["src/main", "src/preload.ts", "src/shared"]
}
```

- [ ] **Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    port: 5173,
  },
})
```

- [ ] **Step 5: Create tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/renderer/**/*.{tsx,ts,html}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1a1a2e',
          light: '#16213e',
          dark: '#0f0f23',
        },
        accent: {
          DEFAULT: '#f0a030',
          dim: 'rgba(240, 160, 48, 0.2)',
        },
        model: {
          opus: '#e74c3c',
          sonnet: '#3498db',
          haiku: '#2ecc71',
        },
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 6: Create src/renderer/styles/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: transparent;
  overflow: hidden;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  color: #e0e0e0;
  user-select: none;
}

::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}
```

- [ ] **Step 7: Create src/renderer/index.html**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CodeBurn Monitor</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

- [ ] **Step 8: Create electron-builder.yml**

```yaml
appId: com.codeburn.monitor
productName: CodeBurn Monitor
directories:
  output: release
files:
  - dist/**/*
  - resources/**/*
win:
  target: nsis
  icon: resources/icon.png
nsis:
  oneClick: true
  perMachine: false
  allowToChangeInstallationDirectory: false
```

- [ ] **Step 9: Create placeholder icon**

Run: `mkdir -p resources && node -e "const {createCanvas}=require('canvas');const c=createCanvas(256,256);const g=c.getContext('2d');g.fillStyle='#f0a030';g.beginPath();g.arc(128,128,120,0,Math.PI*2);g.fill();require('fs').writeFileSync('resources/icon.png',c.toBuffer('image/png'))"`

If `canvas` not available, manually place any 256x256 PNG named `resources/icon.png`.

- [ ] **Step 10: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, no errors

- [ ] **Step 11: Commit**

```bash
git init
git add package.json tsconfig.json tsconfig.node.json vite.config.ts tailwind.config.ts electron-builder.yml src/renderer/index.html src/renderer/styles/globals.css
git commit -m "chore: scaffold Electron + React + Vite + Tailwind project"
```

---

### Task 2: Shared Types

**Files:**
- Create: `src/shared/types.ts`

- [ ] **Step 1: Create types.ts**

```typescript
// Token usage for a single API call
export type TokenUsage = {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly cacheCreationInputTokens: number
  readonly cacheReadInputTokens: number
}

// Raw JSONL entry from Claude Code session files
export type JournalEntry = {
  readonly type: string
  readonly uuid?: string
  readonly timestamp?: string
  readonly message?: {
    readonly id?: string
    readonly role: 'user' | 'assistant'
    readonly model?: string
    readonly content?: ReadonlyArray<ContentBlock> | string
    readonly usage?: {
      readonly input_tokens: number
      readonly output_tokens: number
      readonly cache_creation_input_tokens?: number
      readonly cache_read_input_tokens?: number
      readonly server_tool_use?: {
        readonly web_search_requests?: number
      }
      readonly speed?: 'standard' | 'fast'
    }
  }
  readonly [key: string]: unknown
}

export type ContentBlock =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'tool_use'; readonly name: string; readonly input: Record<string, unknown> }
  | { readonly type: string; readonly [key: string]: unknown }

// Parsed result for one API call
export type ParsedApiCall = {
  readonly model: string
  readonly usage: TokenUsage
  readonly costUSD: number
  readonly speed: 'standard' | 'fast'
  readonly timestamp: string
  readonly deduplicationKey: string
}

// Aggregated per-model stats
export type ModelBreakdown = {
  readonly model: string
  readonly displayName: string
  readonly calls: number
  readonly costUSD: number
  readonly tokens: TokenUsage
}

// Aggregated per-project stats
export type ProjectBreakdown = {
  readonly project: string
  readonly projectPath: string
  readonly costUSD: number
  readonly apiCalls: number
}

// Aggregated per-day stats
export type DailyBreakdown = {
  readonly date: string // YYYY-MM-DD
  readonly costUSD: number
  readonly apiCalls: number
}

// Full usage data sent from main to renderer
export type UsageData = {
  readonly totalCostUSD: number
  readonly totalApiCalls: number
  readonly totalSessions: number
  readonly cacheHitPercent: number
  readonly tokens: TokenUsage
  readonly models: ReadonlyArray<ModelBreakdown>
  readonly projects: ReadonlyArray<ProjectBreakdown>
  readonly daily: ReadonlyArray<DailyBreakdown>
}

// Card IDs for layout editor
export type CardId = 'cost' | 'stats' | 'tokens' | 'models' | 'projects' | 'daily'

export type CardConfig = {
  readonly id: CardId
  readonly enabled: boolean
  readonly order: number
}

export type LayoutSettings = {
  readonly cards: ReadonlyArray<CardConfig>
  readonly widgetSize: 'small' | 'medium' | 'large'
  readonly opacity: number
}

export type WidgetMode = 'circle' | 'panel'
export type Period = 'today' | '7d' | '30d' | 'all'
export type CurrencyCode = 'USD' | 'KRW' | 'EUR' | 'JPY' | 'GBP' | 'CNY'

// Full settings stored in electron-store
export type Settings = {
  readonly mode: WidgetMode
  readonly position: { readonly x: number; readonly y: number }
  readonly period: Period
  readonly currency: CurrencyCode
  readonly autoStart: boolean
  readonly layout: LayoutSettings
}

// IPC API exposed via contextBridge
export type ElectronAPI = {
  readonly onUsageData: (callback: (data: UsageData) => void) => () => void
  readonly onSettingsChanged: (callback: (settings: Settings) => void) => () => void
  readonly changeMode: (mode: WidgetMode) => void
  readonly changePeriod: (period: Period) => void
  readonly updateLayout: (layout: LayoutSettings) => void
  readonly windowDrag: (deltaX: number, deltaY: number) => void
  readonly savePosition: (x: number, y: number) => void
  readonly resizeWindow: (width: number, height: number) => void
  readonly getSettings: () => Promise<Settings>
  readonly getUsageData: () => Promise<UsageData>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add shared TypeScript type definitions"
```

---

### Task 3: Shared Constants & Pricing

**Files:**
- Create: `src/shared/constants.ts`
- Create: `src/shared/pricing.ts`

- [ ] **Step 1: Create constants.ts**

```typescript
import type { CardConfig, CurrencyCode, LayoutSettings, Settings } from './types'

export const CLAUDE_PROJECTS_DIR = (() => {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  return `${home}/.claude/projects`
})()

export const CACHE_DIR = (() => {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  return `${home}/.cache/codeburn-monitor`
})()

export const LITELLM_PRICING_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json'

export const PRICING_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export const FILE_WATCH_COOLDOWN_MS = 10_000 // 10 seconds

export const WIDGET_SIZES = {
  small: 260,
  medium: 300,
  large: 360,
} as const

export const DEFAULT_CARDS: ReadonlyArray<CardConfig> = [
  { id: 'cost', enabled: true, order: 0 },
  { id: 'stats', enabled: true, order: 1 },
  { id: 'tokens', enabled: true, order: 2 },
  { id: 'models', enabled: true, order: 3 },
  { id: 'projects', enabled: true, order: 4 },
  { id: 'daily', enabled: true, order: 5 },
]

export const DEFAULT_LAYOUT: LayoutSettings = {
  cards: DEFAULT_CARDS,
  widgetSize: 'medium',
  opacity: 0.85,
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'circle',
  position: { x: -1, y: -1 }, // -1 = auto (bottom-right)
  period: 'today',
  currency: 'USD',
  autoStart: true,
  layout: DEFAULT_LAYOUT,
}

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  KRW: '₩',
  EUR: '€',
  JPY: '¥',
  GBP: '£',
  CNY: '¥',
}

export type ModelCosts = {
  readonly inputCostPerToken: number
  readonly outputCostPerToken: number
  readonly cacheWriteCostPerToken: number
  readonly cacheReadCostPerToken: number
  readonly webSearchCostPerRequest: number
  readonly fastMultiplier: number
}

export const FALLBACK_PRICING: Record<string, ModelCosts> = {
  'claude-opus-4-6':   { inputCostPerToken: 5e-6,   outputCostPerToken: 25e-6,  cacheWriteCostPerToken: 6.25e-6,  cacheReadCostPerToken: 0.5e-6,  webSearchCostPerRequest: 0.01, fastMultiplier: 6 },
  'claude-opus-4-5':   { inputCostPerToken: 5e-6,   outputCostPerToken: 25e-6,  cacheWriteCostPerToken: 6.25e-6,  cacheReadCostPerToken: 0.5e-6,  webSearchCostPerRequest: 0.01, fastMultiplier: 1 },
  'claude-sonnet-4-6': { inputCostPerToken: 3e-6,   outputCostPerToken: 15e-6,  cacheWriteCostPerToken: 3.75e-6,  cacheReadCostPerToken: 0.3e-6,  webSearchCostPerRequest: 0.01, fastMultiplier: 5 },
  'claude-sonnet-4-5': { inputCostPerToken: 3e-6,   outputCostPerToken: 15e-6,  cacheWriteCostPerToken: 3.75e-6,  cacheReadCostPerToken: 0.3e-6,  webSearchCostPerRequest: 0.01, fastMultiplier: 1 },
  'claude-haiku-4-5':  { inputCostPerToken: 1e-6,   outputCostPerToken: 5e-6,   cacheWriteCostPerToken: 1.25e-6,  cacheReadCostPerToken: 0.1e-6,  webSearchCostPerRequest: 0.01, fastMultiplier: 5 },
  'claude-3-5-haiku':  { inputCostPerToken: 0.8e-6, outputCostPerToken: 4e-6,   cacheWriteCostPerToken: 1e-6,     cacheReadCostPerToken: 0.08e-6, webSearchCostPerRequest: 0.01, fastMultiplier: 1 },
}

export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'claude-opus-4-6': 'Opus 4.6',
  'claude-opus-4-5': 'Opus 4.5',
  'claude-sonnet-4-6': 'Sonnet 4.6',
  'claude-sonnet-4-5': 'Sonnet 4.5',
  'claude-haiku-4-5': 'Haiku 4.5',
  'claude-3-5-haiku': 'Haiku 3.5',
}
```

- [ ] **Step 2: Create pricing.ts**

```typescript
import * as fs from 'fs'
import * as path from 'path'
import { CACHE_DIR, FALLBACK_PRICING, LITELLM_PRICING_URL, PRICING_CACHE_TTL_MS } from './constants'
import type { ModelCosts } from './constants'

let pricingCache: Record<string, ModelCosts> | null = null

function getCanonicalName(model: string): string {
  return model.replace(/@.*$/, '').replace(/-\d{8}$/, '')
}

function getCachePath(): string {
  return path.join(CACHE_DIR, 'litellm-pricing.json')
}

async function fetchAndCachePricing(): Promise<Record<string, ModelCosts>> {
  const cachePath = getCachePath()

  // Check cache
  try {
    const stat = fs.statSync(cachePath)
    if (Date.now() - stat.mtimeMs < PRICING_CACHE_TTL_MS) {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
      return cached
    }
  } catch {
    // No cache or expired
  }

  // Fetch from LiteLLM
  try {
    const response = await fetch(LITELLM_PRICING_URL)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json() as Record<string, {
      input_cost_per_token?: number
      output_cost_per_token?: number
      cache_creation_input_token_cost?: number
      cache_read_input_token_cost?: number
    }>

    const pricing: Record<string, ModelCosts> = {}
    for (const [model, info] of Object.entries(data)) {
      if (info.input_cost_per_token != null && info.output_cost_per_token != null) {
        pricing[model] = {
          inputCostPerToken: info.input_cost_per_token,
          outputCostPerToken: info.output_cost_per_token,
          cacheWriteCostPerToken: info.cache_creation_input_token_cost ?? info.input_cost_per_token * 1.25,
          cacheReadCostPerToken: info.cache_read_input_token_cost ?? info.input_cost_per_token * 0.1,
          webSearchCostPerRequest: 0.01,
          fastMultiplier: 1,
        }
      }
    }

    // Write cache
    fs.mkdirSync(CACHE_DIR, { recursive: true })
    fs.writeFileSync(cachePath, JSON.stringify(pricing))
    return pricing
  } catch {
    return {}
  }
}

export async function initPricing(): Promise<void> {
  const fetched = await fetchAndCachePricing()
  pricingCache = { ...fetched }
}

export function getModelCosts(model: string): ModelCosts {
  const canonical = getCanonicalName(model)

  // 1. Exact match in fallback (these have correct fastMultiplier)
  if (FALLBACK_PRICING[canonical]) {
    // Merge with LiteLLM pricing if available (for updated token costs)
    // but keep fastMultiplier from fallback
    const fallback = FALLBACK_PRICING[canonical]
    if (pricingCache?.[canonical]) {
      return { ...pricingCache[canonical], fastMultiplier: fallback.fastMultiplier }
    }
    return fallback
  }

  // 2. Exact match in LiteLLM cache
  if (pricingCache?.[canonical]) {
    return pricingCache[canonical]
  }

  // 3. Prefix match in fallback
  for (const [key, costs] of Object.entries(FALLBACK_PRICING)) {
    if (canonical.startsWith(key)) return costs
  }

  // 4. Prefix match in LiteLLM
  if (pricingCache) {
    for (const [key, costs] of Object.entries(pricingCache)) {
      if (canonical.startsWith(key)) return costs
    }
  }

  // 5. Default to Sonnet pricing
  return FALLBACK_PRICING['claude-sonnet-4-6']
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens: number,
  cacheReadTokens: number,
  webSearchRequests: number,
  speed: 'standard' | 'fast' = 'standard',
): number {
  const costs = getModelCosts(model)
  const multiplier = speed === 'fast' ? costs.fastMultiplier : 1

  return multiplier * (
    inputTokens * costs.inputCostPerToken +
    outputTokens * costs.outputCostPerToken +
    cacheCreationTokens * costs.cacheWriteCostPerToken +
    cacheReadTokens * costs.cacheReadCostPerToken +
    webSearchRequests * costs.webSearchCostPerRequest
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/constants.ts src/shared/pricing.ts
git commit -m "feat: add pricing constants and cost calculation"
```

---

### Task 4: JSONL Parser

**Files:**
- Create: `src/shared/parser.ts`

- [ ] **Step 1: Create parser.ts**

```typescript
import * as fs from 'fs'
import * as path from 'path'
import { CLAUDE_PROJECTS_DIR, MODEL_DISPLAY_NAMES } from './constants'
import { calculateCost, initPricing, getModelCosts } from './pricing'
import type {
  JournalEntry,
  ParsedApiCall,
  TokenUsage,
  UsageData,
  ModelBreakdown,
  ProjectBreakdown,
  DailyBreakdown,
  Period,
} from './types'

function parseJsonlLine(line: string): JournalEntry | null {
  try {
    return JSON.parse(line)
  } catch {
    return null
  }
}

function getCanonicalName(model: string): string {
  return model.replace(/@.*$/, '').replace(/-\d{8}$/, '')
}

function getDisplayName(model: string): string {
  const canonical = getCanonicalName(model)
  return MODEL_DISPLAY_NAMES[canonical] ?? canonical
}

function getMessageId(entry: JournalEntry): string | undefined {
  if (entry.message?.role === 'assistant' && entry.message.id) {
    return entry.message.id
  }
  return undefined
}

function parseApiCall(entry: JournalEntry): ParsedApiCall | null {
  const msg = entry.message
  if (!msg || msg.role !== 'assistant' || !msg.model || !msg.usage) return null

  const usage = msg.usage
  const inputTokens = usage.input_tokens ?? 0
  const outputTokens = usage.output_tokens ?? 0
  const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0
  const webSearchRequests = usage.server_tool_use?.web_search_requests ?? 0
  const speed = usage.speed ?? 'standard'

  const costUSD = calculateCost(
    msg.model,
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    webSearchRequests,
    speed,
  )

  return {
    model: msg.model,
    usage: {
      inputTokens,
      outputTokens,
      cacheCreationInputTokens: cacheCreationTokens,
      cacheReadInputTokens: cacheReadTokens,
    },
    costUSD,
    speed,
    timestamp: entry.timestamp ?? new Date().toISOString(),
    deduplicationKey: msg.id ?? `${entry.uuid ?? ''}-${entry.timestamp ?? ''}`,
  }
}

function parseSessionFile(
  filePath: string,
  seenIds: Set<string>,
): ReadonlyArray<ParsedApiCall> {
  let content: string
  try {
    content = fs.readFileSync(filePath, 'utf-8')
  } catch {
    return []
  }

  const lines = content.split('\n')
  const calls: ParsedApiCall[] = []

  for (const line of lines) {
    if (!line.trim()) continue
    const entry = parseJsonlLine(line)
    if (!entry) continue

    if (entry.type === 'assistant' || entry.message?.role === 'assistant') {
      const msgId = getMessageId(entry)
      if (msgId && seenIds.has(msgId)) continue
      if (msgId) seenIds.add(msgId)

      const call = parseApiCall(entry)
      if (call) calls.push(call)
    }
  }

  return calls
}

function collectJsonlFiles(dirPath: string): string[] {
  const files: string[] = []
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        files.push(fullPath)
      } else if (entry.isDirectory() && entry.name === 'subagents') {
        // Scan subagent sessions too
        try {
          const subEntries = fs.readdirSync(fullPath)
          for (const sub of subEntries) {
            if (sub.endsWith('.jsonl')) {
              files.push(path.join(fullPath, sub))
            }
          }
        } catch {
          // skip
        }
      }
    }
  } catch {
    // directory doesn't exist
  }
  return files
}

function getDateRange(period: Period): { start: Date; end: Date } {
  const now = new Date()
  const end = now
  let start: Date

  switch (period) {
    case 'today': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    }
    case '7d': {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    }
    case '30d': {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    }
    case 'all': {
      start = new Date(0)
      break
    }
  }

  return { start, end }
}

function isInRange(timestamp: string, start: Date, end: Date): boolean {
  const ts = new Date(timestamp)
  return ts >= start && ts <= end
}

export async function parseAllSessions(period: Period): Promise<UsageData> {
  await initPricing()

  const seenIds = new Set<string>()
  const allCalls: ParsedApiCall[] = []
  const projectCalls = new Map<string, ParsedApiCall[]>()
  let sessionCount = 0

  const { start, end } = getDateRange(period)

  // Discover project directories
  let projectDirs: string[] = []
  try {
    const entries = fs.readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true })
    projectDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
  } catch {
    // ~/.claude/projects doesn't exist
    return emptyUsageData()
  }

  for (const projectName of projectDirs) {
    const projectDir = path.join(CLAUDE_PROJECTS_DIR, projectName)
    const jsonlFiles = collectJsonlFiles(projectDir)

    const projectCallList: ParsedApiCall[] = []
    for (const file of jsonlFiles) {
      const calls = parseSessionFile(file, seenIds)
      const filtered = calls.filter((c) => isInRange(c.timestamp, start, end))
      if (filtered.length > 0) {
        sessionCount++
        projectCallList.push(...filtered)
        allCalls.push(...filtered)
      }
    }

    if (projectCallList.length > 0) {
      projectCalls.set(projectName, projectCallList)
    }
  }

  return buildUsageData(allCalls, projectCalls, sessionCount)
}

function buildUsageData(
  allCalls: ReadonlyArray<ParsedApiCall>,
  projectCalls: Map<string, ParsedApiCall[]>,
  sessionCount: number,
): UsageData {
  if (allCalls.length === 0) return emptyUsageData()

  // Aggregate totals
  let totalCost = 0
  let totalInput = 0
  let totalOutput = 0
  let totalCacheRead = 0
  let totalCacheWrite = 0

  const modelMap = new Map<string, { calls: number; costUSD: number; tokens: TokenUsage }>()
  const dailyMap = new Map<string, { costUSD: number; apiCalls: number }>()

  for (const call of allCalls) {
    totalCost += call.costUSD
    totalInput += call.usage.inputTokens
    totalOutput += call.usage.outputTokens
    totalCacheRead += call.usage.cacheReadInputTokens
    totalCacheWrite += call.usage.cacheCreationInputTokens

    // Model breakdown
    const canonical = getCanonicalName(call.model)
    const existing = modelMap.get(canonical)
    if (existing) {
      modelMap.set(canonical, {
        calls: existing.calls + 1,
        costUSD: existing.costUSD + call.costUSD,
        tokens: {
          inputTokens: existing.tokens.inputTokens + call.usage.inputTokens,
          outputTokens: existing.tokens.outputTokens + call.usage.outputTokens,
          cacheCreationInputTokens: existing.tokens.cacheCreationInputTokens + call.usage.cacheCreationInputTokens,
          cacheReadInputTokens: existing.tokens.cacheReadInputTokens + call.usage.cacheReadInputTokens,
        },
      })
    } else {
      modelMap.set(canonical, {
        calls: 1,
        costUSD: call.costUSD,
        tokens: { ...call.usage },
      })
    }

    // Daily breakdown
    const date = call.timestamp.slice(0, 10) // YYYY-MM-DD
    const dayEntry = dailyMap.get(date)
    if (dayEntry) {
      dailyMap.set(date, {
        costUSD: dayEntry.costUSD + call.costUSD,
        apiCalls: dayEntry.apiCalls + 1,
      })
    } else {
      dailyMap.set(date, { costUSD: call.costUSD, apiCalls: 1 })
    }
  }

  const totalInputForCache = totalInput + totalCacheRead
  const cacheHitPercent = totalInputForCache > 0
    ? (totalCacheRead / totalInputForCache) * 100
    : 0

  // Models sorted by cost desc
  const models: ModelBreakdown[] = Array.from(modelMap.entries())
    .map(([model, data]) => ({
      model,
      displayName: getDisplayName(model),
      ...data,
    }))
    .sort((a, b) => b.costUSD - a.costUSD)

  // Projects sorted by cost desc
  const projects: ProjectBreakdown[] = Array.from(projectCalls.entries())
    .map(([project, calls]) => ({
      project,
      projectPath: project.replace(/-/g, '/'),
      costUSD: calls.reduce((sum, c) => sum + c.costUSD, 0),
      apiCalls: calls.length,
    }))
    .sort((a, b) => b.costUSD - a.costUSD)
    .slice(0, 5)

  // Daily sorted by date
  const daily: DailyBreakdown[] = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    totalCostUSD: totalCost,
    totalApiCalls: allCalls.length,
    totalSessions: sessionCount,
    cacheHitPercent,
    tokens: {
      inputTokens: totalInput,
      outputTokens: totalOutput,
      cacheCreationInputTokens: totalCacheWrite,
      cacheReadInputTokens: totalCacheRead,
    },
    models,
    projects,
    daily,
  }
}

function emptyUsageData(): UsageData {
  return {
    totalCostUSD: 0,
    totalApiCalls: 0,
    totalSessions: 0,
    cacheHitPercent: 0,
    tokens: { inputTokens: 0, outputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 },
    models: [],
    projects: [],
    daily: [],
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/parser.ts
git commit -m "feat: add JSONL session parser with project/daily aggregation"
```

---

### Task 5: Currency Module

**Files:**
- Create: `src/shared/currency.ts`

- [ ] **Step 1: Create currency.ts**

```typescript
import * as fs from 'fs'
import * as path from 'path'
import { CACHE_DIR, CURRENCY_SYMBOLS } from './constants'
import type { CurrencyCode } from './types'

type CurrencyCache = {
  code: CurrencyCode
  rate: number
  fetchedAt: number
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
let activeRate: { code: CurrencyCode; rate: number } = { code: 'USD', rate: 1 }

function getCachePath(): string {
  return path.join(CACHE_DIR, 'exchange-rate.json')
}

function loadCachedRate(code: CurrencyCode): number | null {
  try {
    const raw = fs.readFileSync(getCachePath(), 'utf-8')
    const cache: CurrencyCache = JSON.parse(raw)
    if (cache.code === code && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      return cache.rate
    }
  } catch {
    // no cache
  }
  return null
}

function saveCachedRate(code: CurrencyCode, rate: number): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
    const cache: CurrencyCache = { code, rate, fetchedAt: Date.now() }
    fs.writeFileSync(getCachePath(), JSON.stringify(cache))
  } catch {
    // ignore write errors
  }
}

export async function setCurrency(code: CurrencyCode): Promise<void> {
  if (code === 'USD') {
    activeRate = { code: 'USD', rate: 1 }
    return
  }

  // Try cache first
  const cached = loadCachedRate(code)
  if (cached !== null) {
    activeRate = { code, rate: cached }
    return
  }

  // Fetch from Frankfurter API
  try {
    const response = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${code}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json() as { rates: Record<string, number> }
    const rate = data.rates[code]
    if (rate) {
      activeRate = { code, rate }
      saveCachedRate(code, rate)
    }
  } catch {
    // Keep current rate on failure
  }
}

export function formatCost(costUSD: number): string {
  const symbol = CURRENCY_SYMBOLS[activeRate.code] ?? '$'
  const converted = costUSD * activeRate.rate

  if (activeRate.code === 'KRW' || activeRate.code === 'JPY') {
    return `${symbol}${Math.round(converted).toLocaleString()}`
  }

  if (converted >= 1) return `${symbol}${converted.toFixed(2)}`
  if (converted >= 0.01) return `${symbol}${converted.toFixed(3)}`
  return `${symbol}${converted.toFixed(4)}`
}

export function convertCost(costUSD: number): number {
  return costUSD * activeRate.rate
}

export function getCurrencySymbol(): string {
  return CURRENCY_SYMBOLS[activeRate.code] ?? '$'
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/currency.ts
git commit -m "feat: add currency conversion with Frankfurter API"
```

---

### Task 6: Electron Main Process - Store & Window

**Files:**
- Create: `src/main/store.ts`
- Create: `src/main/index.ts`

- [ ] **Step 1: Create store.ts**

```typescript
import Store from 'electron-store'
import { DEFAULT_SETTINGS } from '../shared/constants'
import type { Settings, WidgetMode, Period, CurrencyCode, LayoutSettings } from '../shared/types'

const store = new Store<Settings>({
  defaults: DEFAULT_SETTINGS,
})

export function getSettings(): Settings {
  return {
    mode: store.get('mode'),
    position: store.get('position'),
    period: store.get('period'),
    currency: store.get('currency'),
    autoStart: store.get('autoStart'),
    layout: store.get('layout'),
  }
}

export function setMode(mode: WidgetMode): void {
  store.set('mode', mode)
}

export function setPeriod(period: Period): void {
  store.set('period', period)
}

export function setCurrencySetting(currency: CurrencyCode): void {
  store.set('currency', currency)
}

export function setAutoStart(enabled: boolean): void {
  store.set('autoStart', enabled)
}

export function setPosition(x: number, y: number): void {
  store.set('position', { x, y })
}

export function setLayout(layout: LayoutSettings): void {
  store.set('layout', layout)
}

export { store }
```

- [ ] **Step 2: Create index.ts**

```typescript
import { app, BrowserWindow, screen } from 'electron'
import * as path from 'path'
import { getSettings, setPosition } from './store'
import { setupTray } from './tray'
import { setupIpc } from './ipc'
import { startWatcher, stopWatcher } from './watcher'
import { setupAutoLaunch } from './auto-launch'
import { WIDGET_SIZES } from '../shared/constants'

let mainWindow: BrowserWindow | null = null

function getInitialPosition(): { x: number; y: number } {
  const settings = getSettings()
  if (settings.position.x !== -1 && settings.position.y !== -1) {
    return settings.position
  }
  // Default: bottom-right, above taskbar
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  const widgetWidth = WIDGET_SIZES[settings.layout.widgetSize]
  const widgetHeight = settings.mode === 'circle' ? 160 : 500
  return {
    x: width - widgetWidth - 20,
    y: height - widgetHeight - 20,
  }
}

function createWindow(): BrowserWindow {
  const settings = getSettings()
  const pos = getInitialPosition()
  const widgetWidth = settings.mode === 'circle'
    ? 160
    : WIDGET_SIZES[settings.layout.widgetSize]

  const win = new BrowserWindow({
    width: widgetWidth,
    height: settings.mode === 'circle' ? 160 : 600,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Load renderer
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
  }

  // Save position on move
  win.on('moved', () => {
    const [x, y] = win.getPosition()
    setPosition(x, y)
  })

  return win
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function resizeMainWindow(width: number, height: number): void {
  if (mainWindow) {
    mainWindow.setSize(width, height)
  }
}

export function moveWindow(deltaX: number, deltaY: number): void {
  if (!mainWindow) return
  const [x, y] = mainWindow.getPosition()
  mainWindow.setPosition(x + deltaX, y + deltaY)
}

app.whenReady().then(async () => {
  mainWindow = createWindow()
  setupIpc()
  setupTray()
  startWatcher()

  const settings = getSettings()
  await setupAutoLaunch(settings.autoStart)
})

app.on('window-all-closed', () => {
  // Don't quit, keep in tray
})

app.on('before-quit', () => {
  stopWatcher()
})
```

- [ ] **Step 3: Commit**

```bash
git add src/main/store.ts src/main/index.ts
git commit -m "feat: add Electron main process with window and store"
```

---

### Task 7: File Watcher

**Files:**
- Create: `src/main/watcher.ts`

- [ ] **Step 1: Create watcher.ts**

```typescript
import { watch, type FSWatcher } from 'chokidar'
import { CLAUDE_PROJECTS_DIR, FILE_WATCH_COOLDOWN_MS } from '../shared/constants'
import { parseAllSessions } from '../shared/parser'
import { getSettings } from './store'
import { getMainWindow } from './index'

let watcher: FSWatcher | null = null
let cooldownTimer: ReturnType<typeof setTimeout> | null = null
let pendingRefresh = false

async function refreshData(): Promise<void> {
  const settings = getSettings()
  const data = await parseAllSessions(settings.period)
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('usage-data', data)
  }
}

function scheduledRefresh(): void {
  if (cooldownTimer) {
    // Already in cooldown, mark pending
    pendingRefresh = true
    return
  }

  // Execute refresh
  refreshData().catch(console.error)

  // Start cooldown
  cooldownTimer = setTimeout(() => {
    cooldownTimer = null
    if (pendingRefresh) {
      pendingRefresh = false
      scheduledRefresh()
    }
  }, FILE_WATCH_COOLDOWN_MS)
}

export function startWatcher(): void {
  // Initial data load
  refreshData().catch(console.error)

  // Watch for JSONL changes
  watcher = watch(`${CLAUDE_PROJECTS_DIR}/**/*.jsonl`, {
    ignoreInitial: true,
    persistent: true,
    depth: 3,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 200,
    },
  })

  watcher.on('add', scheduledRefresh)
  watcher.on('change', scheduledRefresh)
}

export function stopWatcher(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
  if (cooldownTimer) {
    clearTimeout(cooldownTimer)
    cooldownTimer = null
  }
}

// Force refresh (called when period/currency changes)
export function forceRefresh(): void {
  pendingRefresh = false
  if (cooldownTimer) {
    clearTimeout(cooldownTimer)
    cooldownTimer = null
  }
  refreshData().catch(console.error)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/watcher.ts
git commit -m "feat: add file watcher with 10s cooldown"
```

---

### Task 8: IPC Handlers & Preload

**Files:**
- Create: `src/main/ipc.ts`
- Create: `src/preload.ts`

- [ ] **Step 1: Create ipc.ts**

```typescript
import { ipcMain } from 'electron'
import { getSettings, setMode, setPeriod, setCurrencySetting, setLayout } from './store'
import { getMainWindow, resizeMainWindow, moveWindow } from './index'
import { forceRefresh } from './watcher'
import { parseAllSessions } from '../shared/parser'
import { setCurrency } from '../shared/currency'
import type { WidgetMode, Period, CurrencyCode, LayoutSettings } from '../shared/types'
import { WIDGET_SIZES } from '../shared/constants'

export function setupIpc(): void {
  ipcMain.handle('get-settings', () => {
    return getSettings()
  })

  ipcMain.handle('get-usage-data', async () => {
    const settings = getSettings()
    return parseAllSessions(settings.period)
  })

  ipcMain.on('change-mode', (_event, mode: WidgetMode) => {
    setMode(mode)
    const settings = getSettings()
    const width = mode === 'circle' ? 160 : WIDGET_SIZES[settings.layout.widgetSize]
    const height = mode === 'circle' ? 160 : 600
    resizeMainWindow(width, height)
    broadcastSettings()
  })

  ipcMain.on('change-period', async (_event, period: Period) => {
    setPeriod(period)
    broadcastSettings()
    forceRefresh()
  })

  ipcMain.on('change-currency', async (_event, currency: CurrencyCode) => {
    setCurrencySetting(currency)
    await setCurrency(currency)
    broadcastSettings()
    forceRefresh()
  })

  ipcMain.on('update-layout', (_event, layout: LayoutSettings) => {
    setLayout(layout)
    const settings = getSettings()
    if (settings.mode === 'panel') {
      resizeMainWindow(WIDGET_SIZES[layout.widgetSize], 600)
    }
    broadcastSettings()
  })

  ipcMain.on('window-drag', (_event, deltaX: number, deltaY: number) => {
    moveWindow(deltaX, deltaY)
  })

  ipcMain.on('save-position', (_event, x: number, y: number) => {
    // Already handled by window 'moved' event
  })

  ipcMain.on('resize-window', (_event, width: number, height: number) => {
    resizeMainWindow(width, height)
  })
}

function broadcastSettings(): void {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('settings-changed', getSettings())
  }
}

export { broadcastSettings }
```

- [ ] **Step 2: Create preload.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from './shared/types'

const api: ElectronAPI = {
  onUsageData: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data as any)
    ipcRenderer.on('usage-data', handler)
    return () => ipcRenderer.removeListener('usage-data', handler)
  },

  onSettingsChanged: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, settings: unknown) => callback(settings as any)
    ipcRenderer.on('settings-changed', handler)
    return () => ipcRenderer.removeListener('settings-changed', handler)
  },

  changeMode: (mode) => ipcRenderer.send('change-mode', mode),
  changePeriod: (period) => ipcRenderer.send('change-period', period),
  updateLayout: (layout) => ipcRenderer.send('update-layout', layout),
  windowDrag: (deltaX, deltaY) => ipcRenderer.send('window-drag', deltaX, deltaY),
  savePosition: (x, y) => ipcRenderer.send('save-position', x, y),
  resizeWindow: (width, height) => ipcRenderer.send('resize-window', width, height),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  getUsageData: () => ipcRenderer.invoke('get-usage-data'),
}

contextBridge.exposeInMainWorld('electronAPI', api)
```

- [ ] **Step 3: Commit**

```bash
git add src/main/ipc.ts src/preload.ts
git commit -m "feat: add IPC handlers and preload bridge"
```

---

### Task 9: System Tray

**Files:**
- Create: `src/main/tray.ts`

- [ ] **Step 1: Create tray.ts**

```typescript
import { Tray, Menu, nativeImage } from 'electron'
import * as path from 'path'
import {
  getSettings,
  setMode,
  setPeriod,
  setCurrencySetting,
  setAutoStart,
} from './store'
import { getMainWindow, resizeMainWindow } from './index'
import { broadcastSettings } from './ipc'
import { forceRefresh } from './watcher'
import { setCurrency } from '../shared/currency'
import { setupAutoLaunch } from './auto-launch'
import { WIDGET_SIZES } from '../shared/constants'
import type { WidgetMode, Period, CurrencyCode } from '../shared/types'

let tray: Tray | null = null

function buildMenu(): Menu {
  const settings = getSettings()

  return Menu.buildFromTemplate([
    { label: 'CodeBurn Monitor', enabled: false },
    { type: 'separator' },
    {
      label: 'Widget Mode',
      submenu: [
        {
          label: 'Mini Circle',
          type: 'radio',
          checked: settings.mode === 'circle',
          click: () => applyMode('circle'),
        },
        {
          label: 'Detailed Panel',
          type: 'radio',
          checked: settings.mode === 'panel',
          click: () => applyMode('panel'),
        },
      ],
    },
    {
      label: 'Period',
      submenu: [
        { label: 'Today', type: 'radio', checked: settings.period === 'today', click: () => applyPeriod('today') },
        { label: '7 Days', type: 'radio', checked: settings.period === '7d', click: () => applyPeriod('7d') },
        { label: '30 Days', type: 'radio', checked: settings.period === '30d', click: () => applyPeriod('30d') },
        { label: 'All', type: 'radio', checked: settings.period === 'all', click: () => applyPeriod('all') },
      ],
    },
    {
      label: 'Currency',
      submenu: [
        { label: 'USD ($)', type: 'radio', checked: settings.currency === 'USD', click: () => applyCurrency('USD') },
        { label: 'KRW (₩)', type: 'radio', checked: settings.currency === 'KRW', click: () => applyCurrency('KRW') },
        { label: 'EUR (€)', type: 'radio', checked: settings.currency === 'EUR', click: () => applyCurrency('EUR') },
        { label: 'JPY (¥)', type: 'radio', checked: settings.currency === 'JPY', click: () => applyCurrency('JPY') },
        { label: 'GBP (£)', type: 'radio', checked: settings.currency === 'GBP', click: () => applyCurrency('GBP') },
        { label: 'CNY (¥)', type: 'radio', checked: settings.currency === 'CNY', click: () => applyCurrency('CNY') },
      ],
    },
    { type: 'separator' },
    {
      label: 'Edit Layout...',
      click: () => {
        // Switch to panel mode and open layout editor
        applyMode('panel')
        const win = getMainWindow()
        if (win) win.webContents.send('open-layout-editor')
      },
    },
    { type: 'separator' },
    {
      label: 'Auto Start',
      type: 'checkbox',
      checked: settings.autoStart,
      click: async (menuItem) => {
        setAutoStart(menuItem.checked)
        await setupAutoLaunch(menuItem.checked)
        broadcastSettings()
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        const { app } = require('electron')
        app.quit()
      },
    },
  ])
}

function applyMode(mode: WidgetMode): void {
  setMode(mode)
  const settings = getSettings()
  const width = mode === 'circle' ? 160 : WIDGET_SIZES[settings.layout.widgetSize]
  const height = mode === 'circle' ? 160 : 600
  resizeMainWindow(width, height)
  broadcastSettings()
  rebuildMenu()
}

function applyPeriod(period: Period): void {
  setPeriod(period)
  broadcastSettings()
  forceRefresh()
  rebuildMenu()
}

async function applyCurrency(currency: CurrencyCode): Promise<void> {
  setCurrencySetting(currency)
  await setCurrency(currency)
  broadcastSettings()
  forceRefresh()
  rebuildMenu()
}

function rebuildMenu(): void {
  if (tray) tray.setContextMenu(buildMenu())
}

export function setupTray(): void {
  const iconPath = path.join(__dirname, '..', 'resources', 'icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('CodeBurn Monitor')
  tray.setContextMenu(buildMenu())

  // Left click: toggle widget visibility
  tray.on('click', () => {
    const win = getMainWindow()
    if (!win) return
    if (win.isVisible()) {
      win.hide()
    } else {
      win.show()
    }
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/tray.ts
git commit -m "feat: add system tray with full menu"
```

---

### Task 10: Auto Launch

**Files:**
- Create: `src/main/auto-launch.ts`

- [ ] **Step 1: Create auto-launch.ts**

```typescript
import AutoLaunch from 'auto-launch'

const autoLauncher = new AutoLaunch({
  name: 'CodeBurn Monitor',
  isHidden: true,
})

export async function setupAutoLaunch(enabled: boolean): Promise<void> {
  try {
    const isEnabled = await autoLauncher.isEnabled()
    if (enabled && !isEnabled) {
      await autoLauncher.enable()
    } else if (!enabled && isEnabled) {
      await autoLauncher.disable()
    }
  } catch (error) {
    console.error('Auto-launch setup failed:', error)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/auto-launch.ts
git commit -m "feat: add Windows auto-start support"
```

---

### Task 11: React Entry & App Shell

**Files:**
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/hooks/useUsageData.ts`
- Create: `src/renderer/hooks/useSettings.ts`

- [ ] **Step 1: Create hooks/useUsageData.ts**

```typescript
import { useState, useEffect } from 'react'
import type { UsageData } from '@shared/types'

const emptyData: UsageData = {
  totalCostUSD: 0,
  totalApiCalls: 0,
  totalSessions: 0,
  cacheHitPercent: 0,
  tokens: { inputTokens: 0, outputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 },
  models: [],
  projects: [],
  daily: [],
}

export function useUsageData(): UsageData {
  const [data, setData] = useState<UsageData>(emptyData)

  useEffect(() => {
    // Initial fetch
    window.electronAPI.getUsageData().then(setData)

    // Subscribe to updates
    const unsubscribe = window.electronAPI.onUsageData(setData)
    return unsubscribe
  }, [])

  return data
}
```

- [ ] **Step 2: Create hooks/useSettings.ts**

```typescript
import { useState, useEffect } from 'react'
import type { Settings } from '@shared/types'

export function useSettings(): Settings | null {
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    // Initial fetch
    window.electronAPI.getSettings().then(setSettings)

    // Subscribe to changes
    const unsubscribe = window.electronAPI.onSettingsChanged(setSettings)
    return unsubscribe
  }, [])

  return settings
}
```

- [ ] **Step 3: Create App.tsx**

```tsx
import { useState, useCallback, useRef } from 'react'
import { useUsageData } from './hooks/useUsageData'
import { useSettings } from './hooks/useSettings'
import { MiniCircle } from './components/MiniCircle'
import { DetailPanel } from './components/DetailPanel'

export function App() {
  const data = useUsageData()
  const settings = useSettings()
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    setIsDragging(true)
    dragStart.current = { x: e.screenX, y: e.screenY }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    const deltaX = e.screenX - dragStart.current.x
    const deltaY = e.screenY - dragStart.current.y
    dragStart.current = { x: e.screenX, y: e.screenY }
    window.electronAPI.windowDrag(deltaX, deltaY)
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleToggleMode = useCallback(() => {
    if (!settings) return
    const newMode = settings.mode === 'circle' ? 'panel' : 'circle'
    window.electronAPI.changeMode(newMode)
  }, [settings])

  if (!settings) return null

  const opacity = settings.mode === 'panel' ? settings.layout.opacity : 1

  return (
    <div
      style={{ opacity, cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {settings.mode === 'circle' ? (
        <MiniCircle data={data} onClick={handleToggleMode} />
      ) : (
        <DetailPanel data={data} settings={settings} onMinimize={handleToggleMode} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create main.tsx**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/globals.css'

const root = document.getElementById('root')!
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/main.tsx src/renderer/App.tsx src/renderer/hooks/useUsageData.ts src/renderer/hooks/useSettings.ts
git commit -m "feat: add React entry, App shell with drag support"
```

---

### Task 12: MiniCircle Component (Mode C)

**Files:**
- Create: `src/renderer/components/MiniCircle.tsx`

- [ ] **Step 1: Create MiniCircle.tsx**

```tsx
import type { UsageData } from '@shared/types'

type Props = {
  data: UsageData
  onClick: () => void
}

export function MiniCircle({ data, onClick }: Props) {
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
      {/* Progress ring */}
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

      {/* Cost display */}
      <div className="text-[24px] font-bold text-white leading-none z-10">
        <span className="text-[14px] text-accent">$</span>
        {cost.toFixed(2)}
      </div>
      <div className="text-[10px] text-gray-500 mt-1 z-10">today</div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/MiniCircle.tsx
git commit -m "feat: add MiniCircle widget component"
```

---

### Task 13: Card Components

**Files:**
- Create: `src/renderer/components/cards/CostCard.tsx`
- Create: `src/renderer/components/cards/StatsCard.tsx`
- Create: `src/renderer/components/cards/TokensCard.tsx`
- Create: `src/renderer/components/cards/ModelsCard.tsx`
- Create: `src/renderer/components/cards/ProjectsCard.tsx`
- Create: `src/renderer/components/cards/DailyCard.tsx`

- [ ] **Step 1: Create CostCard.tsx**

```tsx
import type { UsageData, Period } from '@shared/types'

type Props = { data: UsageData; period: Period }

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  '7d': '7D',
  '30d': '30D',
  all: 'All',
}

export function CostCard({ data, period }: Props) {
  return (
    <div className="p-3 rounded-[10px] bg-white/[0.03] border border-white/[0.06]">
      <div className="text-center text-[32px] font-bold text-white leading-none">
        <span className="text-[20px] text-accent">$</span>
        {data.totalCostUSD.toFixed(2)}
      </div>
      <div className="flex gap-1 justify-center mt-2" data-no-drag>
        {(['today', '7d', '30d', 'all'] as const).map((p) => (
          <button
            key={p}
            onClick={() => window.electronAPI.changePeriod(p)}
            className={`text-[10px] px-2.5 py-0.5 rounded-full cursor-pointer transition-colors ${
              p === period
                ? 'bg-accent/20 text-accent'
                : 'bg-white/5 text-gray-500 hover:bg-white/10'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create StatsCard.tsx**

```tsx
import type { UsageData } from '@shared/types'

type Props = { data: UsageData }

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[12px] py-1">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300 font-semibold">{value}</span>
    </div>
  )
}

export function StatsCard({ data }: Props) {
  return (
    <div className="p-3 rounded-[10px] bg-white/[0.03] border border-white/[0.06]">
      <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Statistics</div>
      <StatRow label="API Calls" value={data.totalApiCalls.toLocaleString()} />
      <StatRow label="Sessions" value={data.totalSessions.toLocaleString()} />
      <StatRow label="Cache Hit" value={`${data.cacheHitPercent.toFixed(0)}%`} />
    </div>
  )
}
```

- [ ] **Step 3: Create TokensCard.tsx**

```tsx
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
```

- [ ] **Step 4: Create ModelsCard.tsx**

```tsx
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
```

- [ ] **Step 5: Create ProjectsCard.tsx**

```tsx
import type { UsageData } from '@shared/types'

type Props = { data: UsageData }

export function ProjectsCard({ data }: Props) {
  const maxCost = Math.max(...data.projects.map((p) => p.costUSD), 0.01)

  return (
    <div className="p-3 rounded-[10px] bg-white/[0.03] border border-white/[0.06]">
      <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Projects</div>
      {data.projects.map((p) => {
        const widthPercent = (p.costUSD / maxCost) * 100
        // Show last segment of path
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
```

- [ ] **Step 6: Create DailyCard.tsx**

```tsx
import type { UsageData } from '@shared/types'

type Props = { data: UsageData }

export function DailyCard({ data }: Props) {
  const days = data.daily.slice(-14) // Show up to 14 days
  const maxCost = Math.max(...days.map((d) => d.costUSD), 0.01)

  return (
    <div className="p-3 rounded-[10px] bg-white/[0.03] border border-white/[0.06]">
      <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Daily</div>
      <div className="flex gap-[3px] items-end h-[40px]">
        {days.map((d) => {
          const heightPercent = Math.max((d.costUSD / maxCost) * 100, 5)
          return (
            <div
              key={d.date}
              className="flex-1 rounded-sm min-h-[3px] opacity-80"
              style={{
                height: `${heightPercent}%`,
                background: 'linear-gradient(to top, #f0a030, #e74c3c)',
              }}
              title={`${d.date}: $${d.costUSD.toFixed(2)}`}
            />
          )
        })}
      </div>
      <div className="flex gap-[3px] mt-1">
        {days.map((d) => (
          <span key={d.date} className="flex-1 text-[8px] text-gray-600 text-center">
            {d.date.slice(8)} {/* DD */}
          </span>
        ))}
      </div>
      {days.length === 0 && (
        <div className="text-[11px] text-gray-600 text-center py-2">No data</div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/renderer/components/cards/
git commit -m "feat: add all card components (cost, stats, tokens, models, projects, daily)"
```

---

### Task 14: DetailPanel Component (Mode B)

**Files:**
- Create: `src/renderer/components/DetailPanel.tsx`

- [ ] **Step 1: Create DetailPanel.tsx**

```tsx
import { useState, useEffect } from 'react'
import type { UsageData, Settings, CardId } from '@shared/types'
import { CostCard } from './cards/CostCard'
import { StatsCard } from './cards/StatsCard'
import { TokensCard } from './cards/TokensCard'
import { ModelsCard } from './cards/ModelsCard'
import { ProjectsCard } from './cards/ProjectsCard'
import { DailyCard } from './cards/DailyCard'
import { LayoutEditor } from './LayoutEditor'

type Props = {
  data: UsageData
  settings: Settings
  onMinimize: () => void
}

const CARD_COMPONENTS: Record<CardId, React.FC<{ data: UsageData; period?: any }>> = {
  cost: CostCard as any,
  stats: StatsCard,
  tokens: TokensCard,
  models: ModelsCard,
  projects: ProjectsCard,
  daily: DailyCard,
}

export function DetailPanel({ data, settings, onMinimize }: Props) {
  const [showEditor, setShowEditor] = useState(false)

  useEffect(() => {
    const handler = () => setShowEditor(true)
    window.electronAPI.onSettingsChanged(() => {}) // keep subscription alive
    // Listen for layout editor open from tray
    const el = window as any
    el.__openLayoutEditor = handler
    return () => { el.__openLayoutEditor = undefined }
  }, [])

  // Listen for open-layout-editor IPC (via preload if needed)
  // For now, triggered via gear button

  const enabledCards = [...settings.layout.cards]
    .filter((c) => c.enabled)
    .sort((a, b) => a.order - b.order)

  if (showEditor) {
    return <LayoutEditor settings={settings} onClose={() => setShowEditor(false)} />
  }

  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #16213e 0%, #1a1a2e 100%)',
        border: '1px solid rgba(240, 160, 48, 0.2)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-white/[0.06]">
        <span className="text-[13px] font-bold text-accent">CODEBURN</span>
        <div className="flex gap-2" data-no-drag>
          <button
            onClick={() => setShowEditor(true)}
            className="w-6 h-6 rounded-md bg-white/[0.08] flex items-center justify-center text-[12px] text-gray-500 hover:bg-white/[0.15] hover:text-white transition-colors"
            title="Edit Layout"
          >
            ⚙
          </button>
          <button
            onClick={onMinimize}
            className="w-6 h-6 rounded-md bg-white/[0.08] flex items-center justify-center text-[12px] text-gray-500 hover:bg-white/[0.15] hover:text-white transition-colors"
            title="Minimize"
          >
            −
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="p-2 flex flex-col gap-2 max-h-[540px] overflow-y-auto">
        {enabledCards.map((cardConfig) => {
          const Component = CARD_COMPONENTS[cardConfig.id]
          if (!Component) return null
          return (
            <Component
              key={cardConfig.id}
              data={data}
              period={settings.period}
            />
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/DetailPanel.tsx
git commit -m "feat: add DetailPanel with configurable card rendering"
```

---

### Task 15: Layout Editor

**Files:**
- Create: `src/renderer/components/LayoutEditor.tsx`

- [ ] **Step 1: Create LayoutEditor.tsx**

```tsx
import { useState, useCallback } from 'react'
import type { Settings, CardConfig, CardId, LayoutSettings } from '@shared/types'
import { DEFAULT_LAYOUT } from '@shared/constants'

type Props = {
  settings: Settings
  onClose: () => void
}

const CARD_LABELS: Record<CardId, string> = {
  cost: '총 비용',
  stats: '기본 통계',
  tokens: '토큰 상세',
  models: '모델별 비용',
  projects: '프로젝트별 비용',
  daily: '일별 차트',
}

export function LayoutEditor({ settings, onClose }: Props) {
  const [cards, setCards] = useState<CardConfig[]>(
    [...settings.layout.cards].sort((a, b) => a.order - b.order),
  )
  const [widgetSize, setWidgetSize] = useState(settings.layout.widgetSize)
  const [opacity, setOpacity] = useState(settings.layout.opacity)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const save = useCallback((updated: Partial<LayoutSettings>) => {
    const layout: LayoutSettings = {
      cards: updated.cards ?? cards,
      widgetSize: updated.widgetSize ?? widgetSize,
      opacity: updated.opacity ?? opacity,
    }
    window.electronAPI.updateLayout(layout)
  }, [cards, widgetSize, opacity])

  const toggleCard = (id: CardId) => {
    const updated = cards.map((c) =>
      c.id === id ? { ...c, enabled: !c.enabled } : c,
    )
    setCards(updated)
    save({ cards: updated })
  }

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    const reordered = [...cards]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(index, 0, moved)
    const withOrder = reordered.map((c, i) => ({ ...c, order: i }))
    setCards(withOrder)
    setDragIndex(index)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    save({ cards })
  }

  const handleSizeChange = (size: typeof widgetSize) => {
    setWidgetSize(size)
    save({ widgetSize: size })
  }

  const handleOpacityChange = (value: number) => {
    setOpacity(value)
    save({ opacity: value })
  }

  const handleReset = () => {
    setCards([...DEFAULT_LAYOUT.cards].sort((a, b) => a.order - b.order))
    setWidgetSize(DEFAULT_LAYOUT.widgetSize)
    setOpacity(DEFAULT_LAYOUT.opacity)
    window.electronAPI.updateLayout(DEFAULT_LAYOUT)
  }

  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #16213e 0%, #1a1a2e 100%)',
        border: '1px solid rgba(240, 160, 48, 0.4)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 40px rgba(240,160,48,0.08)',
      }}
    >
      {/* Header */}
      <div
        className="flex justify-between items-center px-4 py-3"
        style={{ background: 'rgba(240,160,48,0.08)', borderBottom: '1px solid rgba(240,160,48,0.2)' }}
      >
        <span className="text-[14px] font-bold text-accent">⚙ Layout Editor</span>
        <button
          onClick={onClose}
          className="w-[22px] h-[22px] rounded-full bg-white/10 flex items-center justify-center text-[12px] text-gray-500 hover:text-white"
          data-no-drag
        >
          ✕
        </button>
      </div>

      {/* Card toggles */}
      <div className="p-3" data-no-drag>
        {cards.map((card, index) => (
          <div
            key={card.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2.5 px-3 py-2.5 mb-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] cursor-grab hover:bg-white/[0.06] transition-colors ${
              dragIndex === index ? 'opacity-50' : ''
            }`}
          >
            <span className="text-gray-600 text-[14px]">☰</span>
            <span className="flex-1 text-[12px] text-gray-300">{CARD_LABELS[card.id]}</span>
            <button
              onClick={() => toggleCard(card.id)}
              className={`w-9 h-5 rounded-full relative transition-colors ${
                card.enabled ? 'bg-accent/60' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-[left] ${
                  card.enabled ? 'left-[18px]' : 'left-[2px]'
                }`}
              />
            </button>
          </div>
        ))}

        {/* Widget Size */}
        <div className="text-[10px] uppercase tracking-widest text-gray-600 mt-4 mb-2">Widget Size</div>
        <div className="flex gap-1.5">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              onClick={() => handleSizeChange(size)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] text-center transition-colors ${
                size === widgetSize
                  ? 'bg-accent/15 border border-accent/40 text-accent'
                  : 'bg-white/5 border border-white/[0.08] text-gray-500 hover:bg-white/10'
              }`}
            >
              {size.charAt(0).toUpperCase() + size.slice(1)}
            </button>
          ))}
        </div>

        {/* Opacity */}
        <div className="text-[10px] uppercase tracking-widest text-gray-600 mt-4 mb-2">Opacity</div>
        <div className="flex items-center gap-2.5">
          <input
            type="range"
            min={30}
            max={100}
            value={opacity * 100}
            onChange={(e) => handleOpacityChange(Number(e.target.value) / 100)}
            className="flex-1 accent-accent h-1"
          />
          <span className="text-[12px] text-gray-300 min-w-[32px]">{Math.round(opacity * 100)}%</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-2 p-3 border-t border-white/[0.06]">
        <button
          onClick={handleReset}
          className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-500 text-[11px] hover:bg-white/10 transition-colors"
        >
          Reset Default
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2 rounded-lg bg-accent/30 border border-accent/50 text-accent text-[11px] font-semibold hover:bg-accent/40 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/LayoutEditor.tsx
git commit -m "feat: add Layout Editor with drag reorder, toggle, size, opacity"
```

---

### Task 16: Build & Test

**Files:**
- Modify: `package.json` (if needed)

- [ ] **Step 1: Verify TypeScript compilation**

Run: `npx tsc -p tsconfig.node.json --noEmit`
Expected: No errors

- [ ] **Step 2: Verify Vite build**

Run: `npm run build`
Expected: Build succeeds, `dist/` directory created

- [ ] **Step 3: Test dev mode**

Run: `npm run electron:dev`
Expected: Electron window appears at bottom-right, shows $0.00 (or actual data if Claude sessions exist)

- [ ] **Step 4: Test widget interactions**

Manual checks:
- Click mini circle -> expands to detail panel
- Click minimize -> shrinks to circle
- Drag widget to new position
- Right-click tray icon -> menu appears
- Change period via tray -> data refreshes
- Open layout editor -> toggle cards on/off, reorder, change size
- Close and reopen -> position and layout preserved

- [ ] **Step 5: Fix any issues found**

Address any build errors or runtime issues.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix: resolve build and integration issues"
```

---

### Task 17: Packaging

- [ ] **Step 1: Build distributable**

Run: `npm run dist`
Expected: `release/` directory with `.exe` installer

- [ ] **Step 2: Test installer**

Run the generated `.exe`, verify:
- App installs and launches
- Widget appears at bottom-right
- Tray icon shows
- Auto-start option works

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: finalize build configuration for Windows distribution"
```
