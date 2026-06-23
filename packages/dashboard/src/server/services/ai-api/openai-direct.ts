/**
 * Direct OpenAI SDK adapter — 6-agent War Room + debate round.
 */

import OpenAI from 'openai'
import type { ReviewAgentConfig, ReviewStreamEvent, AgentRole } from './types.js'
import type { ReviewFinding, ReviewPhase, ReviewResult } from './anthropic-direct.js'
import { AGENT_META } from './anthropic-direct.js'

const DEFAULT_MODEL = 'gpt-4o'

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  'architect':       'You are a Staff-level Software Architect. Analyze system design impact, coupling, API stability, and scalability. Return JSON only.',
  'tech-lead':       'You are a seasoned Tech Lead. Identify architectural risks, design issues, and blockers. Return JSON only.',
  'security':        'You are "The Paranoid" — a Principal Security Engineer. Find all vulnerabilities, auth issues, injection risks, secrets, CVEs. Trust nothing. Return JSON only.',
  'performance':     'You are "The Speed Demon" — a Performance Engineer. Find N+1 queries, blocking I/O, algorithmic inefficiencies. Return JSON only.',
  'correctness':     'You are "The Pedant" — find logic errors, missing error handling, race conditions. Return JSON only.',
  'devil-advocate':  "You are the Devil's Advocate. Challenge assumptions, question if the PR solves the RIGHT problem, probe for over-engineering. Return JSON only.",
  'synthesis':       'You are the Consensus Engine synthesizing all War Room findings. Deduplicate, prioritize (BLOCKER>CRITICAL>HIGH>MEDIUM>LOW>INFO), write verdict. Return JSON only.',
}

function estimateOpenAICost(inputTokens: number, outputTokens: number, model: string): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o':      { input: 5,    output: 15 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'o1-preview':  { input: 15,   output: 60 },
    'o1-mini':     { input: 3,    output: 12 },
  }
  const p = pricing[model] ?? pricing['gpt-4o']!
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000
}

function buildPrompt(diff: string, config: ReviewAgentConfig, role: string): string {
  return `Review this code diff as ${role}. Return JSON with {summary, findings[{title, severity, file_path, line_start, line_end, summary, suggestion, is_blocker}]}.

Diff:
\`\`\`diff
${diff.slice(0, 12000)}
\`\`\`
${config.requirements ? `\nRequirements:\n${config.requirements}` : ''}

Only return valid JSON.`
}

function buildDebatePrompt(myRole: string, myFindings: ReviewFinding[], allPhases: ReviewPhase[], diff: string): string {
  const otherFindings = allPhases
    .filter((p) => p.role !== myRole)
    .flatMap((p) =>
      p.findings.filter((f) => f.severity === 'critical' || f.severity === 'high' || f.is_blocker).slice(0, 3)
    )

  return `You are ${AGENT_META[myRole]?.label ?? myRole} in the War Room debate.

Other agents flagged: ${JSON.stringify(otherFindings, null, 2).slice(0, 3000)}
Your findings: ${JSON.stringify(myFindings.slice(0, 3), null, 2)}

Code: \`\`\`diff\n${diff.slice(0, 3000)}\n\`\`\`

Respond to the other agents' critical findings in 2-4 short paragraphs. Agree or disagree with their points. Be direct and use your personality. Plain text, no JSON.`
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

export class OpenAIDirectAdapter {
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async runReviewPhase(
    diff: string,
    config: ReviewAgentConfig,
    role: string,
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
      stream_options: { include_usage: true },
      messages: [
        { role: 'system', content: AGENT_SYSTEM_PROMPTS[role] ?? '' },
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
    try { parsed = parseJsonResponse(fullText) } catch {
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
      const stream = await this.client.chat.completions.create({
        model,
        max_tokens: 1024,
        stream: true,
        stream_options: { include_usage: true },
        messages: [
          { role: 'system', content: AGENT_SYSTEM_PROMPTS[debater.role] ?? '' },
          { role: 'user', content: prompt },
        ],
      })

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        if (delta) {
          text += delta
          onEvent({ type: 'debate_turn', agent: debater.role, text: delta })
        }
        if (chunk.usage) {
          totalTokens += chunk.usage.prompt_tokens + chunk.usage.completion_tokens
          totalCost += estimateOpenAICost(chunk.usage.prompt_tokens, chunk.usage.completion_tokens, model)
        }
      }

      debateTexts.push(`[${AGENT_META[debater.role]?.label ?? debater.role}]: ${text}`)
    }

    return { summary: debateTexts.join('\n\n'), tokensUsed: totalTokens, costUsd: totalCost }
  }

  async runFullReview(
    diff: string,
    config: ReviewAgentConfig,
    onEvent: (event: ReviewStreamEvent) => void
  ): Promise<ReviewResult> {
    const REVIEW_AGENTS = ['architect', 'tech-lead', 'security', 'performance', 'correctness', 'devil-advocate']
    const model = config.model ?? DEFAULT_MODEL

    onEvent({ type: 'review_start', total_phases: REVIEW_AGENTS.length + 2 })

    const phases: ReviewPhase[] = []
    for (const role of REVIEW_AGENTS) {
      const phase = await this.runReviewPhase(diff, config, role, onEvent)
      phases.push(phase)
    }

    const debate = await this.runDebateRound(phases, diff, model, onEvent)

    onEvent({ type: 'phase_start', phase: 'synthesis' })

    const allFindings = phases.flatMap((p) => p.findings)
    const synthPrompt = `Synthesize these War Room findings and debate into a final report.
Findings: ${JSON.stringify(allFindings, null, 2).slice(0, 6000)}
Debate: ${debate.summary.slice(0, 2000)}
Return JSON: {verdict: "APPROVE|REQUEST_CHANGES|NEEDS_DISCUSSION", summary, findings}`

    let synthText = ''
    let synthInput = 0
    let synthOutput = 0

    const synthStream = await this.client.chat.completions.create({
      model,
      max_tokens: 4096,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: 'system', content: AGENT_SYSTEM_PROMPTS['synthesis']! },
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
    try { synthesis = parseJsonResponse(synthText) } catch { synthesis = {} }

    const finalFindings = mapFindings((synthesis['findings'] as unknown[]) ?? allFindings, 'synthesis')

    phases.push({
      role: 'synthesis',
      findings: finalFindings,
      summary: String(synthesis['summary'] ?? ''),
      tokensUsed: synthInput + synthOutput,
      costUsd: estimateOpenAICost(synthInput, synthOutput, model),
    })

    const totalTokens = phases.reduce((s, p) => s + p.tokensUsed, 0) + debate.tokensUsed
    const totalCost = phases.reduce((s, p) => s + p.costUsd, 0) + debate.costUsd

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
