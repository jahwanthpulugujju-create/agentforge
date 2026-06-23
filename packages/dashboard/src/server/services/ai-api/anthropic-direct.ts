/**
 * Direct Anthropic SDK adapter for the review pipeline.
 *
 * Replaces CLI subprocess spawning with direct Anthropic API calls.
 * Supports streaming, multiple models, and structured output.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ReviewAgentConfig, ReviewStreamEvent, AgentRole } from './types.js'

const DEFAULT_MODEL = 'claude-opus-4-5'

// Agent persona prompts — these drive the multi-agent review pipeline
const AGENT_PROMPTS: Record<AgentRole, string> = {
  'tech-lead': `You are a seasoned Tech Lead performing a code review. Your role:
- Identify architectural risks and design decisions that will affect the system long-term
- Evaluate code for correctness, security, and maintainability
- Assess whether the implementation aligns with the PR description and requirements
- Flag blockers — issues that MUST be fixed before merge
- Be direct, specific, and actionable. Reference file paths and line numbers.`,

  'security': `You are a Principal Security Engineer reviewing code for vulnerabilities. Your role:
- Identify security vulnerabilities: injection attacks, auth bypasses, data leaks, SSRF, XXE, etc.
- Evaluate input validation, output encoding, and cryptographic practices
- Check for secrets, credentials, or PII hardcoded in source
- Assess dependency risks (outdated packages, known CVEs)
- Flag CRITICAL and HIGH severity issues that could lead to breaches.`,

  'performance': `You are a Performance Engineer reviewing code. Your role:
- Identify algorithmic inefficiencies (N+1 queries, nested loops on large data sets)
- Spot unnecessary allocations, blocking I/O in async contexts, or cache misses
- Review database queries for missing indexes, full table scans, or excessive joins
- Flag performance regressions that would affect production workloads.`,

  'correctness': `You are a Principal Engineer focused on correctness and robustness. Your role:
- Find logic errors, edge cases not handled, and incorrect assumptions
- Check error handling: are all error paths covered? Are errors propagated correctly?
- Verify test coverage adequacy for the changed code
- Flag race conditions, concurrency issues, and state management bugs.`,

  'synthesis': `You are the Lead Reviewer synthesizing findings from multiple reviewers. Your role:
- Aggregate all findings and remove duplicates
- Prioritize: BLOCKER > HIGH > MEDIUM > LOW > INFO
- Write a clear executive summary: overall verdict (APPROVE / REQUEST_CHANGES / NEEDS_DISCUSSION)
- Group findings by file for readability
- Ensure the final report is actionable and concise.`,
}

export type ReviewPhase = {
  role: AgentRole
  findings: ReviewFinding[]
  summary: string
  tokensUsed: number
  costUsd: number
}

export type ReviewFinding = {
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  file_path?: string
  line_start?: number
  line_end?: number
  summary: string
  suggestion?: string
  is_blocker: boolean
  reviewer_persona: AgentRole
}

export type ReviewResult = {
  verdict: 'APPROVE' | 'REQUEST_CHANGES' | 'NEEDS_DISCUSSION'
  summary: string
  findings: ReviewFinding[]
  phases: ReviewPhase[]
  total_tokens: number
  total_cost_usd: number
}

function buildReviewPrompt(diff: string, config: ReviewAgentConfig, role: AgentRole): string {
  const repoContext = config.repo_url ? `Repository: ${config.repo_url}` : ''
  const branchContext = config.branch ? `Branch: ${config.branch}` : ''
  const prContext = config.pr_number ? `PR #${config.pr_number}` : ''
  const requirements = config.requirements
    ? `\n\nRequirements / Acceptance Criteria:\n${config.requirements}`
    : ''

  return `${repoContext}
${branchContext}
${prContext}
${requirements}

## Code Diff to Review

\`\`\`diff
${diff}
\`\`\`

## Your Task

${AGENT_PROMPTS[role]}

Respond with a structured JSON object:
{
  "summary": "2-3 sentence overview of your findings",
  "findings": [
    {
      "title": "Brief title of finding",
      "severity": "critical|high|medium|low|info",
      "file_path": "path/to/file.ts",
      "line_start": 42,
      "line_end": 45,
      "summary": "Detailed explanation of the issue",
      "suggestion": "How to fix it",
      "is_blocker": true
    }
  ]
}

Only return valid JSON. No markdown fences.`
}

function buildSynthesisPrompt(phases: ReviewPhase[], diff: string): string {
  const allFindings = phases.flatMap((p) => p.findings)
  const findingsJson = JSON.stringify(allFindings, null, 2)

  return `You are synthesizing a multi-agent code review. Here are all findings from the review team:

${findingsJson}

## Code Diff

\`\`\`diff
${diff.slice(0, 8000)}
\`\`\`

${AGENT_PROMPTS['synthesis']}

Respond with:
{
  "verdict": "APPROVE|REQUEST_CHANGES|NEEDS_DISCUSSION",
  "summary": "Executive summary (3-5 sentences)",
  "findings": [deduplicated, prioritized findings array]
}

Only return valid JSON. No markdown fences.`
}

function estimateCost(inputTokens: number, outputTokens: number, model: string): number {
  // Pricing per million tokens (approximate, as of 2025)
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-opus-4-5': { input: 15, output: 75 },
    'claude-sonnet-4-5': { input: 3, output: 15 },
    'claude-haiku-4-5': { input: 0.25, output: 1.25 },
  }
  const p = pricing[model] ?? pricing['claude-opus-4-5']!
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000
}

function parseJsonResponse(text: string): Record<string, unknown> {
  // Strip markdown fences if model adds them despite instructions
  const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(cleaned)
}

export class AnthropicDirectAdapter {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async runReviewPhase(
    diff: string,
    config: ReviewAgentConfig,
    role: AgentRole,
    onEvent: (event: ReviewStreamEvent) => void
  ): Promise<ReviewPhase> {
    const model = config.model ?? DEFAULT_MODEL
    const prompt = buildReviewPrompt(diff, config, role)

    onEvent({ type: 'phase_start', phase: role })

    let fullText = ''
    let inputTokens = 0
    let outputTokens = 0

    const stream = this.client.messages.stream({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
      system: AGENT_PROMPTS[role],
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullText += event.delta.text
        onEvent({ type: 'token', phase: role, text: event.delta.text })
      }
    }

    const finalMsg = await stream.finalMessage()
    inputTokens = finalMsg.usage.input_tokens
    outputTokens = finalMsg.usage.output_tokens
    const costUsd = estimateCost(inputTokens, outputTokens, model)

    let parsed: Record<string, unknown> = {}
    try {
      parsed = parseJsonResponse(fullText)
    } catch {
      onEvent({ type: 'parse_error', phase: role, text: fullText })
    }

    const findings: ReviewFinding[] = ((parsed['findings'] as unknown[]) ?? []).map((f) => ({
      title: String((f as Record<string, unknown>)['title'] ?? 'Finding'),
      severity: ((f as Record<string, unknown>)['severity'] as ReviewFinding['severity']) ?? 'info',
      file_path: (f as Record<string, unknown>)['file_path'] as string | undefined,
      line_start: (f as Record<string, unknown>)['line_start'] as number | undefined,
      line_end: (f as Record<string, unknown>)['line_end'] as number | undefined,
      summary: String((f as Record<string, unknown>)['summary'] ?? ''),
      suggestion: (f as Record<string, unknown>)['suggestion'] as string | undefined,
      is_blocker: Boolean((f as Record<string, unknown>)['is_blocker']),
      reviewer_persona: role,
    }))

    onEvent({ type: 'phase_complete', phase: role, findings_count: findings.length })

    return {
      role,
      findings,
      summary: String(parsed['summary'] ?? ''),
      tokensUsed: inputTokens + outputTokens,
      costUsd,
    }
  }

  async runFullReview(
    diff: string,
    config: ReviewAgentConfig,
    onEvent: (event: ReviewStreamEvent) => void
  ): Promise<ReviewResult> {
    const REVIEW_PHASES: AgentRole[] = ['tech-lead', 'security', 'performance', 'correctness']
    const model = config.model ?? DEFAULT_MODEL

    onEvent({ type: 'review_start', total_phases: REVIEW_PHASES.length + 1 })

    const phases: ReviewPhase[] = []

    for (const role of REVIEW_PHASES) {
      const phase = await this.runReviewPhase(diff, config, role, onEvent)
      phases.push(phase)
    }

    onEvent({ type: 'phase_start', phase: 'synthesis' })

    const synthesisPrompt = buildSynthesisPrompt(phases, diff)
    let synthesisText = ''
    let synthInputTokens = 0
    let synthOutputTokens = 0

    const synthStream = this.client.messages.stream({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: synthesisPrompt }],
    })

    for await (const event of synthStream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        synthesisText += event.delta.text
        onEvent({ type: 'token', phase: 'synthesis', text: event.delta.text })
      }
    }

    const synthFinal = await synthStream.finalMessage()
    synthInputTokens = synthFinal.usage.input_tokens
    synthOutputTokens = synthFinal.usage.output_tokens

    let synthesis: Record<string, unknown> = {}
    try {
      synthesis = parseJsonResponse(synthesisText)
    } catch {
      onEvent({ type: 'parse_error', phase: 'synthesis', text: synthesisText })
    }

    const allFindings: ReviewFinding[] = (
      (synthesis['findings'] as unknown[]) ?? phases.flatMap((p) => p.findings)
    ).map((f) => ({
      title: String((f as Record<string, unknown>)['title'] ?? 'Finding'),
      severity: ((f as Record<string, unknown>)['severity'] as ReviewFinding['severity']) ?? 'info',
      file_path: (f as Record<string, unknown>)['file_path'] as string | undefined,
      line_start: (f as Record<string, unknown>)['line_start'] as number | undefined,
      line_end: (f as Record<string, unknown>)['line_end'] as number | undefined,
      summary: String((f as Record<string, unknown>)['summary'] ?? ''),
      suggestion: (f as Record<string, unknown>)['suggestion'] as string | undefined,
      is_blocker: Boolean((f as Record<string, unknown>)['is_blocker']),
      reviewer_persona: 'synthesis' as AgentRole,
    }))

    const totalTokens = phases.reduce((s, p) => s + p.tokensUsed, 0) + synthInputTokens + synthOutputTokens
    const totalCost = phases.reduce((s, p) => s + p.costUsd, 0) + estimateCost(synthInputTokens, synthOutputTokens, model)

    const synthPhase: ReviewPhase = {
      role: 'synthesis',
      findings: allFindings,
      summary: String(synthesis['summary'] ?? ''),
      tokensUsed: synthInputTokens + synthOutputTokens,
      costUsd: estimateCost(synthInputTokens, synthOutputTokens, model),
    }
    phases.push(synthPhase)

    const result: ReviewResult = {
      verdict: (synthesis['verdict'] as ReviewResult['verdict']) ?? 'NEEDS_DISCUSSION',
      summary: String(synthesis['summary'] ?? ''),
      findings: allFindings,
      phases,
      total_tokens: totalTokens,
      total_cost_usd: totalCost,
    }

    onEvent({ type: 'review_complete', verdict: result.verdict, findings_count: result.findings.length })

    return result
  }

  async streamChat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    apiKey: string,
    model: string,
    onToken: (token: string) => void
  ): Promise<{ total_tokens: number; cost_usd: number }> {
    const client = new Anthropic({ apiKey })

    const stream = client.messages.stream({
      model,
      max_tokens: 2048,
      messages,
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        onToken(event.delta.text)
      }
    }

    const final = await stream.finalMessage()
    const total = final.usage.input_tokens + final.usage.output_tokens
    return {
      total_tokens: total,
      cost_usd: estimateCost(final.usage.input_tokens, final.usage.output_tokens, model),
    }
  }
}
