/**
 * Direct OpenAI SDK adapter for the review pipeline.
 */

import OpenAI from 'openai'
import type { ReviewAgentConfig, ReviewStreamEvent, AgentRole } from './types.js'
import type { ReviewFinding, ReviewPhase, ReviewResult } from './anthropic-direct.js'

const DEFAULT_MODEL = 'gpt-4o'

const AGENT_SYSTEM_PROMPTS: Record<AgentRole, string> = {
  'tech-lead': 'You are a seasoned Tech Lead performing a code review. Identify architectural risks, design issues, and blockers. Be specific and actionable. Return JSON only.',
  'security': 'You are a Principal Security Engineer. Find vulnerabilities, auth issues, injection risks, secrets. Return JSON only.',
  'performance': 'You are a Performance Engineer. Find algorithmic inefficiencies, N+1 queries, blocking I/O. Return JSON only.',
  'correctness': 'You are a Principal Engineer. Find logic errors, missing error handling, race conditions. Return JSON only.',
  'synthesis': 'You are the Lead Reviewer synthesizing all findings. Deduplicate, prioritize, write verdict and summary. Return JSON only.',
}

function estimateOpenAICost(inputTokens: number, outputTokens: number, model: string): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 5, output: 15 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4-turbo': { input: 10, output: 30 },
    'o1-preview': { input: 15, output: 60 },
    'o1-mini': { input: 3, output: 12 },
  }
  const p = pricing[model] ?? pricing['gpt-4o']!
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000
}

function buildPrompt(diff: string, config: ReviewAgentConfig, role: AgentRole): string {
  return `Review this code diff as a ${role}. Return JSON with {summary, findings[{title, severity, file_path, line_start, line_end, summary, suggestion, is_blocker}]}.

Diff:
\`\`\`diff
${diff.slice(0, 12000)}
\`\`\`
${config.requirements ? `\nRequirements:\n${config.requirements}` : ''}

Only return valid JSON.`
}

function parseJsonResponse(text: string): Record<string, unknown> {
  const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(cleaned)
}

export class OpenAIDirectAdapter {
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async runReviewPhase(
    diff: string,
    config: ReviewAgentConfig,
    role: AgentRole,
    onEvent: (event: ReviewStreamEvent) => void
  ): Promise<ReviewPhase> {
    const model = config.model ?? DEFAULT_MODEL

    onEvent({ type: 'phase_start', phase: role })

    let fullText = ''
    let inputTokens = 0
    let outputTokens = 0

    const stream = await this.client.chat.completions.create({
      model,
      max_tokens: 4096,
      stream: true,
      messages: [
        { role: 'system', content: AGENT_SYSTEM_PROMPTS[role] },
        { role: 'user', content: buildPrompt(diff, config, role) },
      ],
      response_format: { type: 'json_object' },
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? ''
      if (delta) {
        fullText += delta
        onEvent({ type: 'token', phase: role, text: delta })
      }
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens
        outputTokens = chunk.usage.completion_tokens
      }
    }

    const costUsd = estimateOpenAICost(inputTokens, outputTokens, model)

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
    const PHASES: AgentRole[] = ['tech-lead', 'security', 'performance', 'correctness']
    const model = config.model ?? DEFAULT_MODEL

    onEvent({ type: 'review_start', total_phases: PHASES.length + 1 })

    const phases: ReviewPhase[] = []

    for (const role of PHASES) {
      const phase = await this.runReviewPhase(diff, config, role, onEvent)
      phases.push(phase)
    }

    onEvent({ type: 'phase_start', phase: 'synthesis' })

    const allFindings = phases.flatMap((p) => p.findings)
    const synthPrompt = `Synthesize these code review findings into a final report.
Findings: ${JSON.stringify(allFindings, null, 2).slice(0, 8000)}
Return JSON: {verdict: "APPROVE|REQUEST_CHANGES|NEEDS_DISCUSSION", summary, findings}`

    let synthText = ''
    let synthInput = 0
    let synthOutput = 0

    const synthStream = await this.client.chat.completions.create({
      model,
      max_tokens: 4096,
      stream: true,
      messages: [
        { role: 'system', content: AGENT_SYSTEM_PROMPTS['synthesis'] },
        { role: 'user', content: synthPrompt },
      ],
      response_format: { type: 'json_object' },
    })

    for await (const chunk of synthStream) {
      const delta = chunk.choices[0]?.delta?.content ?? ''
      if (delta) {
        synthText += delta
        onEvent({ type: 'token', phase: 'synthesis', text: delta })
      }
      if (chunk.usage) {
        synthInput = chunk.usage.prompt_tokens
        synthOutput = chunk.usage.completion_tokens
      }
    }

    let synthesis: Record<string, unknown> = {}
    try {
      synthesis = parseJsonResponse(synthText)
    } catch {
      synthesis = {}
    }

    const finalFindings: ReviewFinding[] = (
      (synthesis['findings'] as unknown[]) ?? allFindings
    ).map((f) => ({
      ...(f as ReviewFinding),
      reviewer_persona: 'synthesis' as AgentRole,
    }))

    const synthPhase: ReviewPhase = {
      role: 'synthesis',
      findings: finalFindings,
      summary: String(synthesis['summary'] ?? ''),
      tokensUsed: synthInput + synthOutput,
      costUsd: estimateOpenAICost(synthInput, synthOutput, model),
    }
    phases.push(synthPhase)

    const totalTokens = phases.reduce((s, p) => s + p.tokensUsed, 0)
    const totalCost = phases.reduce((s, p) => s + p.costUsd, 0)

    const result: ReviewResult = {
      verdict: (synthesis['verdict'] as ReviewResult['verdict']) ?? 'NEEDS_DISCUSSION',
      summary: String(synthesis['summary'] ?? ''),
      findings: finalFindings,
      phases,
      total_tokens: totalTokens,
      total_cost_usd: totalCost,
    }

    onEvent({ type: 'review_complete', verdict: result.verdict, findings_count: result.findings.length })

    return result
  }
}
