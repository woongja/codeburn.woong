import type { TaskCategory } from './types'

// Tools that indicate specific categories
const EDIT_TOOLS = new Set([
  'Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'FileEditTool', 'Replace',
])
const TASK_TOOLS = new Set(['Task', 'Agent', 'TaskCreate', 'TaskUpdate'])
const PLAN_TOOLS = new Set(['ExitPlanMode', 'EnterPlanMode'])
const WEB_TOOLS = new Set(['WebSearch', 'WebFetch', 'BrowseURL'])

const TEST_KEYWORDS = [
  'test', 'pytest', 'jest', 'mocha', 'rspec', 'phpunit', 'go test',
  'cargo test', 'ctest', 'vitest', 'junit',
]

const GIT_KEYWORDS = [
  'git commit', 'git push', 'git pull', 'git merge', 'git branch',
  'git rebase', 'git checkout', 'git log', 'git status', 'git diff',
  'git add', 'gh pr', 'gh issue',
]

const BUILD_KEYWORDS = [
  'npm run build', 'npm run dist', 'yarn build', 'pnpm build', 'make build',
  'docker build', 'cargo build', 'go build', 'gradle build', 'mvn package',
  'vite build', 'tsc', 'webpack', 'rollup', 'esbuild build',
]

function containsAny(text: string, keywords: ReadonlyArray<string>): boolean {
  const lower = text.toLowerCase()
  return keywords.some((k) => lower.includes(k))
}

function hasEditTool(tools: ReadonlyArray<string>): boolean {
  return tools.some((t) => EDIT_TOOLS.has(t))
}

function hasAnyTool(tools: ReadonlyArray<string>, set: Set<string>): boolean {
  return tools.some((t) => set.has(t))
}

/**
 * Classify a turn (one user message + following assistant actions) into a category.
 * Priority: tool patterns > keyword patterns > general fallback.
 */
export function classifyTurn(
  userMessage: string,
  tools: ReadonlyArray<string>,
  bashCommands: ReadonlyArray<string>,
): TaskCategory {
  const msg = (userMessage || '').toLowerCase().trim()

  // ===== Tool-based rules (highest priority) =====

  // Plan mode detected → planning
  if (hasAnyTool(tools, PLAN_TOOLS)) return 'planning'

  // Task/Agent tool → delegation (subagent dispatch)
  if (hasAnyTool(tools, TASK_TOOLS)) return 'delegation'

  // Web research tools → exploration
  if (hasAnyTool(tools, WEB_TOOLS)) return 'exploration'

  // Bash test runners → testing
  if (bashCommands.some((c) => containsAny(c, TEST_KEYWORDS))) return 'testing'

  // Bash git operations → git
  if (bashCommands.some((c) => containsAny(c, GIT_KEYWORDS))) return 'git'

  // Bash build/deploy commands → build
  if (bashCommands.some((c) => containsAny(c, BUILD_KEYWORDS))) return 'build'

  // ===== Keyword-based rules on user message =====

  if (/debug|fix|error|bug|issue|traceback|broken|not work|doesn't work|crash|fail/i.test(msg)) {
    return 'debugging'
  }

  if (/refactor|clean ?up|reorganize|restructure|simplify|rename|extract/i.test(msg)) {
    return 'refactoring'
  }

  if (/\btest\b|testing|coverage|unit test|integration test|e2e/i.test(msg)) {
    return 'testing'
  }

  if (/brainstorm|\bidea\b|what if|should (we|i)|thoughts|opinion/i.test(msg)) {
    return 'brainstorming'
  }

  if (/plan|architect|design|approach|strategy/i.test(msg)) {
    return 'planning'
  }

  if (/explore|investigate|research|understand|learn|how does|how do|what is|explain/i.test(msg)) {
    return 'exploration'
  }

  if (/commit|push|pull request|\bpr\b|merge|branch|github/i.test(msg)) {
    return 'git'
  }

  if (/deploy|release|ci\/cd|\bci\b|docker|kubernetes|\bk8s\b/i.test(msg)) {
    return 'build'
  }

  // If user message used edit tools → coding
  if (hasEditTool(tools)) return 'coding'

  if (/feature|\badd\b|create|implement|new|build/i.test(msg)) {
    return 'feature'
  }

  if (/^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|good)\b/i.test(msg)) {
    return 'conversation'
  }

  // Short continuation messages: "계속", "진행해", "continue", etc.
  // Only classified as continuation if message is short AND matches continuation keywords
  if (msg.length <= 30 && isContinuationMessage(msg)) {
    return 'continuation'
  }

  return 'general'
}

function isContinuationMessage(msg: string): boolean {
  // Korean
  const koPatterns = [
    /^(계속|계속해|계속 진행|진행|진행해|진행해줘|고고|ㄱㄱ|고)/,
    /^(다음|이어서|더 해|한 번 더|또 해|재시도)/,
    /^(예|응|넵|네|오케이|오케)[\s.!?]*$/,
  ]
  // English
  const enPatterns = [
    /^(continue|keep going|proceed|go on|go ahead|next|more|retry|again|resume)\b/i,
    /^(carry on|do it|let's go|one more)\b/i,
  ]
  return koPatterns.some((r) => r.test(msg)) || enPatterns.some((r) => r.test(msg))
}
