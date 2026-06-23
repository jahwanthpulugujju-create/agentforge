/**
 * Direct Anthropic SDK adapter — 6-agent War Room + debate round.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ReviewAgentConfig, ReviewStreamEvent, AgentRole } from './types.js'

const DEFAULT_MODEL = 'claude-opus-4-5'

export const AGENT_META: Record<string, { label: string; icon: string; color: string }> = {
  'architect':       { label: 'The Visionary',   icon: '🏛️',  color: '#818cf8' },
  'tech-lead':       { label: 'The Lead',         icon: '👑',  color: '#a78bfa' },
  'security':        { label: 'The Paranoid',     icon: '🛡️',  color: '#f87171' },
  'performance':     { label: 'The Speed Demon',  icon: '⚡',  color: '#fb923c' },
  'correctness':     { label: 'The Pedant',       icon: '🔬',  color: '#34d399' },
  'devil-advocate':  { label: "The Devil's Advocate", icon: '😈', color: '#f472b6' },
  'debate':          { label: 'War Room Debate',  icon: '⚔️',  color: '#fbbf24' },
  'synthesis':       { label: 'Consensus Engine', icon: '🧠',  color: '#60a5fa' },
}

const AGENT_PROMPTS: Record<string, string> = {
  'architect': `You are a Staff-level Software Architect reviewing system design impact. Your role:
- Analyze how this change affects the overall system architecture and module boundaries
- Identify coupling, cohesion, and dependency issues
- Evaluate API contracts, data contracts, and interface stability
- Assess scalability: will this hold at 10x, 100x the current load?
- Flag architectural debt and design decisions that will be hard to reverse later.`,

  'tech-lead': `You are a seasoned Tech Lead performing a code review. Your role:
- Identify architectural risks and design decisions that affect the system long-term
- Evaluate code for correctness, security, and maintainability
- Assess whether the implementation aligns with the PR description and requirements
- Flag blockers — issues that MUST be fixed before merge
- Be direct, specific, and actionable. Reference file paths and line numbers.`,

  'security': `You are a Principal Security Engineer — "The Paranoid." Your role:
- Identify security vulnerabilities: injection attacks, auth bypasses, data leaks, SSRF, XXE, etc.
- Evaluate input validation, output encoding, and cryptographic practices
- Check for secrets, credentials, or PII hardcoded in source
- Assess dependency risks (outdated packages, known CVEs)
- Trust nothing. Assume all user input is malicious until proven otherwise.
- Flag CRITICAL and HIGH severity issues that could lead to breaches.`,

  'performance': `You are a Performance Engineer — "The Speed Demon." Your role:
- Identify algorithmic inefficiencies (N+1 queries, nested loops on large data sets)
- Spot unnecessary allocations, blocking I/O in async contexts, or cache misses
- Review database queries for missing indexes, full table scans, or excessive joins
- Benchmark mentally: estimate the latency impact of each change
- Flag performance regressions that would affect production workloads.`,

  'correctness': `You are a Principal Engineer — "The Pedant," focused on correctness and robustness. Your role:
- Find logic errors, edge cases not handled, and incorrect assumptions
- Check error handling: are all error paths covered? Are errors propagated correctly?
- Verify test coverage adequacy for the changed code
- Flag race conditions, concurrency issues, and state management bugs.`,

  'devil-advocate': `You are the Devil's Advocate — you challenge every assumption and play contrarian. Your role:
- Question whether the PR solves the RIGHT problem at all
- Challenge design decisions even if they look "clean" at first glance
- Ask: "what happens 6 months from now when this needs to change?"
- Probe for over-engineering, premature optimization, or hidden complexity
- If the code is too simple, ask what corner cases it ignores
- Your job is to stress-test the thinking behind the code, not just the code itself.
- Be provocative but constructive.`,

  'synthesis': `You are the Consensus Engine synthesizing the War Room findings. Your role:
- Aggregate all findings and remove exact duplicates
- Prioritize: BLOCKER > CRITICAL > HIGH > MEDIUM > LOW > INFO
- Write a clear executive summary and overall verdict (APPROVE / REQUEST_CHANGES / NEEDS_DISCUSSION)
- Note where agents agreed vs disagreed (consensus vs minority view)
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

function buildReviewPrompt(diff: string, config: ReviewAgentConfig, role: string): string {
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
      "title": "Brief title",
      "severity": "critical|high|medium|low|info",
      "file_path": "path/to/file.ts",
      "line_start": 42,
      "line_end": 45,
      "summary": "Detailed explanation",
      "suggestion": "How to fix it",
      "is_blocker": true
    }
  ]
}

Only return valid JSON. No markdown fences.`
}

function buildDebatePrompt(
  myRole: string,
  myFindings: ReviewFinding[],
  allPhases: ReviewPhase[],
  diff: string
): string {
  const otherFindings = allPhases
    .filter((p) => p.role !== myRole)
    .flatMap((p) =>
      p.findings
        .filter((f) => f.severity === 'critical' || f.severity === 'high' || f.is_blocker)
        .slice(0, 3)
        .map((f) => ({ ...f, from_agent: p.role }))
    )

  return `You are ${AGENT_META[myRole]?.label ?? myRole} (${myRole}).

The other agents have flagged these critical/high findings:
${JSON.stringify(otherFindings, null, 2)}

Your own top findings were:
${JSON.stringify(myFindings.slice(0, 3), null, 2)}

Code context:
\`\`\`diff
${diff.slice(0, 4000)}
\`\`\`

In the War Room debate, respond to the other agents' findings. Be direct:
- Do you AGREE or DISAGREE with their most important points?
- What did they miss that you caught?
- Where do you think they are wrong or overstating the risk?
- Add any nuance from your perspective.

Respond in 2-4 short paragraphs. Be direct and use your personality.
Do NOT return JSON — this is free-form debate text.`
}

function buildSynthesisPrompt(phases: ReviewPhase[], debateSummary: string, diff: string): string {
  const allFindings = phases.flatMap((p) => p.findings)

  return `You are synthesizing a 6-agent War Room code review plus a debate round.

## Agent Findings
${JSON.stringify(allFindings, null, 2)}

## War Room Debate Summary
${debateSummary}

## Code Diff
\`\`\`diff
${diff.slice(0, 6000)}
\`\`\`

${AGENT_PROMPTS['synthesis']}

Respond with:
{
  "verdict": "APPROVE|REQUEST_CHANGES|NEEDS_DISCUSSION",
  "summary": "Executive summary (3-5 sentences, note key debate outcomes)",
  "findings": [deduplicated, prioritized findings array]
}

Only return valid JSON. No markdown fences.`
}

function estimateCost(inputTokens: number, outputTokens: number, model: string): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-opus-4-5':    { input: 15,   output: 75 },
    'claude-sonnet-4-5':  { input: 3,    output: 15 },
    'claude-haiku-4-5':   { input: 0.25, output: 1.25 },
  }
  const p = pricing[model] ?? pricing['claude-opus-4-5']!
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000
}

function parseJsonResponse(text: string): Record<string, unknown> {
  const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(cleaned)
}

function mapFindings(raw: unknown[], role: string): ReviewFinding[] {
  return (raw ?? []).map((f) => ({
    title:            String((f as Record<string, unknown>)['title'] ?? 'Finding'),
    severity:         ((f as Record<string, unknown>)['severity'] as ReviewFinding['severity']) ?? 'info',
    file_path:        (f as Record<string, unknown>)['file_path'] as string | undefined,
    line_start:       (f as Record<string, unknown>)['line_start'] as number | undefined,
    line_end:         (f as Record<string, unknown>)['line_end'] as number | undefined,
    summary:          String((f as Record<string, unknown>)['summary'] ?? ''),
    suggestion:       (f as Record<string, unknown>)['suggestion'] as string | undefined,
    is_blocker:       Boolean((f as Record<string, unknown>)['is_blocker']),
    reviewer_persona: role as AgentRole,
  }))
}

export class AnthropicDirectAdapter {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async runReviewPhase(
    diff: string,
    config: ReviewAgentConfig,
    role: string,
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
      system: AGENT_PROMPTS[role] ?? '',
      messages: [{ role: 'user', content: prompt }],
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

    const findings = mapFindings((parsed['findings'] as unknown[]) ?? [], role)
    onEvent({ type: 'phase_complete', phase: role, findings_count: findings.length })

    return {
      role: role as AgentRole,
      findings,
      summary: String(parsed['summary'] ?? ''),
      tokensUsed: inputTokens + outputTokens,
      costUsd,
    }
  }

  async runDebateRound(
    phases: ReviewPhase[],
    diff: string,
    model: string,
    onEvent: (event: ReviewStreamEvent) => void
  ): Promise<{ summary: string; tokensUsed: number; costUsd: number }> {
    // Pick the 2 agents with the most critical/high findings for the debate
    const debaters = [...phases]
      .sort((a, b) => {
        const score = (p: ReviewPhase) =>
          p.findings.filter((f) => f.severity === 'critical' || f.severity === 'high' || f.is_blocker).length
        return score(b) - score(a)
      })
      .slice(0, 2)

    onEvent({ type: 'debate_start', participants: debaters.map((d) => d.role) })

    let totalTokens = 0
    let totalCost = 0
    const debateTexts: string[] = []

    for (const debater of debaters) {
      const prompt = buildDebatePrompt(debater.role, debater.findings, phases, diff)

      onEvent({ type: 'phase_start', phase: 'debate' })

      let text = ''
      const stream = this.client.messages.stream({
        model,
        max_tokens: 1024,
        system: AGENT_PROMPTS[debater.role] ?? '',
        messages: [{ role: 'user', content: prompt }],
      })

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          text += event.delta.text
          onEvent({ type: 'debate_turn', agent: debater.role, text: event.delta.text })
        }
      }

      const final = await stream.finalMessage()
      totalTokens += final.usage.input_tokens + final.usage.output_tokens
      totalCost += estimateCost(final.usage.input_tokens, final.usage.output_tokens, model)
      debateTexts.push(`[${AGENT_META[debater.role]?.label ?? debater.role}]: ${text}`)
    }

    return {
      summary: debateTexts.join('\n\n'),
      tokensUsed: totalTokens,
      costUsd: totalCost,
    }
  }

  async runFullReview(
    diff: string,
    config: ReviewAgentConfig,
    onEvent: (event: ReviewStreamEvent) => void
  ): Promise<ReviewResult> {
    const REVIEW_AGENTS = ['architect', 'tech-lead', 'security', 'performance', 'correctness', 'devil-advocate']
    const model = config.model ?? DEFAULT_MODEL

    onEvent({ type: 'review_start', total_phases: REVIEW_AGENTS.length + 2 }) // +debate +synthesis

    const phases: ReviewPhase[] = []

    for (const role of REVIEW_AGENTS) {
      const phase = await this.runReviewPhase(diff, config, role, onEvent)
      phases.push(phase)
    }

    // Debate round
    const debate = await this.runDebateRound(phases, diff, model, onEvent)

    // Synthesis
    onEvent({ type: 'phase_start', phase: 'synthesis' })

    const synthesisPrompt = buildSynthesisPrompt(phases, debate.summary, diff)
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

    const allFindings = mapFindings(
      (synthesis['findings'] as unknown[]) ?? phases.flatMap((p) => p.findings),
      'synthesis'
    )

    const totalTokens =
      phases.reduce((s, p) => s + p.tokensUsed, 0) +
      debate.tokensUsed +
      synthInputTokens +
      synthOutputTokens

    const totalCost =
      phases.reduce((s, p) => s + p.costUsd, 0) +
      debate.costUsd +
      estimateCost(synthInputTokens, synthOutputTokens, model)

    phases.push({
      role: 'synthesis' as AgentRole,
      findings: allFindings,
      summary: String(synthesis['summary'] ?? ''),
      tokensUsed: synthInputTokens + synthOutputTokens,
      costUsd: estimateCost(synthInputTokens, synthOutputTokens, model),
    })

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
    const stream = client.messages.stream({ model, max_tokens: 2048, messages })

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
