/**
 * Shared types for the direct AI API service layer.
 */

export type AgentRole =
  | 'architect'
  | 'tech-lead'
  | 'security'
  | 'performance'
  | 'correctness'
  | 'devil-advocate'
  | 'debate'
  | 'synthesis'

export type ReviewAgentConfig = {
  model?: string
  provider?: 'anthropic' | 'openai'
  repo_url?: string
  branch?: string
  pr_number?: number
  requirements?: string
  reviewers?: AgentRole[]
}

export type ReviewStreamEvent =
  | { type: 'review_start'; total_phases: number }
  | { type: 'phase_start'; phase: AgentRole | string }
  | { type: 'phase_complete'; phase: AgentRole | string; findings_count: number }
  | { type: 'token'; phase: AgentRole | string; text: string }
  | { type: 'debate_start'; participants: string[] }
  | { type: 'debate_turn'; agent: string; text: string }
  | { type: 'parse_error'; phase: AgentRole | string; text: string }
  | { type: 'review_complete'; verdict: string; findings_count: number }
  | { type: 'error'; message: string }
