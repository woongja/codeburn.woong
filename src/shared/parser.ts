import * as fs from 'fs'
import * as path from 'path'
import { CLAUDE_PROJECTS_DIR, MODEL_DISPLAY_NAMES } from './constants'
import { calculateCost, initPricing } from './pricing'
import type {
  JournalEntry,
  ParsedApiCall,
  TokenUsage,
  UsageData,
  ModelBreakdown,
  ProjectBreakdown,
  DailyBreakdown,
  Period,
  WindowStats,
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

function aggregateWindow(calls: ReadonlyArray<ParsedApiCall>, windowMs: number): WindowStats {
  const now = Date.now()
  const cutoff = now - windowMs
  let cost = 0
  let count = 0
  let oldest: string | null = null
  let oldestTs = Infinity

  for (const call of calls) {
    const ts = new Date(call.timestamp).getTime()
    if (ts >= cutoff && ts <= now) {
      cost += call.costUSD
      count += 1
      if (ts < oldestTs) {
        oldestTs = ts
        oldest = call.timestamp
      }
    }
  }

  return { costUSD: cost, apiCalls: count, oldestTimestamp: oldest }
}

export async function parseAllSessions(period: Period): Promise<UsageData> {
  await initPricing()

  const seenIds = new Set<string>()
  const periodCalls: ParsedApiCall[] = []
  const allTimeCalls: ParsedApiCall[] = []
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
      allTimeCalls.push(...calls)
      const filtered = calls.filter((c) => isInRange(c.timestamp, start, end))
      if (filtered.length > 0) {
        sessionCount++
        projectCallList.push(...filtered)
        periodCalls.push(...filtered)
      }
    }

    if (projectCallList.length > 0) {
      projectCalls.set(projectName, projectCallList)
    }
  }

  // Always-current windows (independent of selected period)
  const last5h = aggregateWindow(allTimeCalls, 5 * 60 * 60 * 1000)
  const last7d = aggregateWindow(allTimeCalls, 7 * 24 * 60 * 60 * 1000)

  return buildUsageData(periodCalls, projectCalls, sessionCount, last5h, last7d)
}

function buildUsageData(
  allCalls: ReadonlyArray<ParsedApiCall>,
  projectCalls: Map<string, ParsedApiCall[]>,
  sessionCount: number,
  last5h: WindowStats,
  last7d: WindowStats,
): UsageData {
  if (allCalls.length === 0) return { ...emptyUsageData(), last5h, last7d }

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
    last5h,
    last7d,
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
    last5h: { costUSD: 0, apiCalls: 0, oldestTimestamp: null },
    last7d: { costUSD: 0, apiCalls: 0, oldestTimestamp: null },
  }
}
