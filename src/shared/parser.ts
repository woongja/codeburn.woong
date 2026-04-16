import * as fs from 'fs'
import * as path from 'path'
import { CLAUDE_PROJECTS_DIR, MODEL_DISPLAY_NAMES } from './constants'
import { calculateCost, initPricing } from './pricing'
import { classifyTurn } from './classifier'
import type {
  JournalEntry,
  ContentBlock,
  ParsedApiCall,
  TokenUsage,
  UsageData,
  ModelBreakdown,
  ProjectBreakdown,
  DailyBreakdown,
  CategoryBreakdown,
  TaskCategory,
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

function getUserText(entry: JournalEntry): string {
  const msg = entry.message
  if (!msg || msg.role !== 'user') return ''
  const content = msg.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((b): b is { type: 'text'; text: string } =>
        typeof b === 'object' && b !== null && b.type === 'text' && typeof (b as { text?: unknown }).text === 'string',
      )
      .map((b) => b.text)
      .join(' ')
  }
  return ''
}

function extractToolsFromContent(content: ReadonlyArray<ContentBlock> | undefined): string[] {
  if (!content) return []
  const tools: string[] = []
  for (const block of content) {
    if (block && typeof block === 'object' && block.type === 'tool_use') {
      const name = (block as { name?: unknown }).name
      if (typeof name === 'string') tools.push(name)
    }
  }
  return tools
}

const BASH_TOOL_NAMES = new Set(['Bash', 'BashTool', 'Shell'])

function extractBashCommands(content: ReadonlyArray<ContentBlock> | undefined): string[] {
  if (!content) return []
  const cmds: string[] = []
  for (const block of content) {
    if (block && typeof block === 'object' && block.type === 'tool_use') {
      const name = (block as { name?: unknown }).name
      if (typeof name === 'string' && BASH_TOOL_NAMES.has(name)) {
        const input = (block as { input?: unknown }).input
        if (input && typeof input === 'object') {
          const cmd = (input as { command?: unknown }).command
          if (typeof cmd === 'string') cmds.push(cmd)
        }
      }
    }
  }
  return cmds
}

type ParsedTurn = {
  userMessage: string
  tools: string[]
  bashCommands: string[]
  calls: ParsedApiCall[]
  category: TaskCategory
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

function parseSessionFileIntoTurns(
  filePath: string,
  seenIds: Set<string>,
): ReadonlyArray<ParsedTurn> {
  let content: string
  try {
    content = fs.readFileSync(filePath, 'utf-8')
  } catch {
    return []
  }

  const lines = content.split('\n')
  const turns: ParsedTurn[] = []

  let currentUserMsg = ''
  let currentTools: string[] = []
  let currentBash: string[] = []
  let currentCalls: ParsedApiCall[] = []

  const flushTurn = () => {
    if (currentCalls.length > 0) {
      const category = classifyTurn(currentUserMsg, currentTools, currentBash)
      turns.push({
        userMessage: currentUserMsg,
        tools: currentTools,
        bashCommands: currentBash,
        calls: currentCalls,
        category,
      })
    }
    currentTools = []
    currentBash = []
    currentCalls = []
  }

  for (const line of lines) {
    if (!line.trim()) continue
    const entry = parseJsonlLine(line)
    if (!entry) continue

    // User entry starts a new turn
    if (entry.message?.role === 'user') {
      flushTurn()
      currentUserMsg = getUserText(entry)
      continue
    }

    // Assistant entry contributes tools/bash/calls to current turn
    if (entry.type === 'assistant' || entry.message?.role === 'assistant') {
      const msgId = getMessageId(entry)
      if (msgId && seenIds.has(msgId)) continue
      if (msgId) seenIds.add(msgId)

      const msg = entry.message
      if (msg?.role === 'assistant') {
        const contentArr = Array.isArray(msg.content) ? msg.content : undefined
        currentTools.push(...extractToolsFromContent(contentArr))
        currentBash.push(...extractBashCommands(contentArr))
      }

      const call = parseApiCall(entry)
      if (call) currentCalls.push(call)
    }
  }

  // Flush the last turn
  flushTurn()

  return turns
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

// A turn is "in range" if ANY of its calls is in range. Returns the filtered calls.
function filterTurnInRange(turn: ParsedTurn, start: Date, end: Date): ParsedTurn | null {
  const filteredCalls = turn.calls.filter((c) => isInRange(c.timestamp, start, end))
  if (filteredCalls.length === 0) return null
  return { ...turn, calls: filteredCalls }
}

export async function parseAllSessions(period: Period): Promise<UsageData> {
  await initPricing()

  const seenIds = new Set<string>()
  const periodTurns: ParsedTurn[] = []
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
      const turns = parseSessionFileIntoTurns(file, seenIds)
      // Flatten all turns' calls for all-time window aggregation
      for (const turn of turns) allTimeCalls.push(...turn.calls)

      // Filter turns to the selected period
      let hadTurnsInRange = false
      for (const turn of turns) {
        const filtered = filterTurnInRange(turn, start, end)
        if (filtered) {
          hadTurnsInRange = true
          periodTurns.push(filtered)
          projectCallList.push(...filtered.calls)
        }
      }
      if (hadTurnsInRange) sessionCount++
    }

    if (projectCallList.length > 0) {
      projectCalls.set(projectName, projectCallList)
    }
  }

  // Always-current windows (independent of selected period)
  const last5h = aggregateWindow(allTimeCalls, 5 * 60 * 60 * 1000)
  const last7d = aggregateWindow(allTimeCalls, 7 * 24 * 60 * 60 * 1000)

  return buildUsageData(periodTurns, projectCalls, sessionCount, last5h, last7d)
}

function buildUsageData(
  turns: ReadonlyArray<ParsedTurn>,
  projectCalls: Map<string, ParsedApiCall[]>,
  sessionCount: number,
  last5h: WindowStats,
  last7d: WindowStats,
): UsageData {
  const allCalls = turns.flatMap((t) => t.calls)
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

  // Categories: aggregate cost and turn count per category, sorted by cost desc
  const categoryMap = new Map<TaskCategory, { turns: number; costUSD: number }>()
  for (const turn of turns) {
    const turnCost = turn.calls.reduce((sum, c) => sum + c.costUSD, 0)
    const existing = categoryMap.get(turn.category)
    if (existing) {
      categoryMap.set(turn.category, {
        turns: existing.turns + 1,
        costUSD: existing.costUSD + turnCost,
      })
    } else {
      categoryMap.set(turn.category, { turns: 1, costUSD: turnCost })
    }
  }
  const categories: CategoryBreakdown[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.costUSD - a.costUSD)

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
    categories,
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
    categories: [],
    last5h: { costUSD: 0, apiCalls: 0, oldestTimestamp: null },
    last7d: { costUSD: 0, apiCalls: 0, oldestTimestamp: null },
  }
}
