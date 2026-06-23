/**
 * Direct AI API service.
 *
 * Routes review requests to the appropriate provider (Anthropic or OpenAI)
 * based on user config and available API keys.
 */

import { AnthropicDirectAdapter } from './anthropic-direct.js'
import { OpenAIDirectAdapter } from './openai-direct.js'
import type { ReviewAgentConfig, ReviewStreamEvent } from './types.js'
import type { ReviewResult } from './anthropic-direct.js'
import { env } from '../../config/env.js'
import { pgOne, decryptApiKey, isPostgresAvailable } from '../../db-postgres.js'

export type { ReviewAgentConfig, ReviewStreamEvent, ReviewResult }
export type { ReviewFinding, ReviewPhase } from './anthropic-direct.js'
export type { AgentRole } from './types.js'

async function resolveApiKey(
  userId: string,
  provider: 'anthropic' | 'openai'
): Promise<string | null> {
  // Prefer user's own key
  if (isPostgresAvailable()) {
    const keyRow = await pgOne<{ key_encrypted: string }>(
      `SELECT key_encrypted FROM user_api_keys
       WHERE user_id = $1 AND provider = $2 AND is_active = TRUE
       ORDER BY created_at DESC LIMIT 1`,
      [userId, provider]
    )
    if (keyRow) {
      await pgOne(
        'UPDATE user_api_keys SET last_used_at = NOW() WHERE user_id = $1 AND provider = $2 AND is_active = TRUE',
        [userId, provider]
      )
      return decryptApiKey(keyRow.key_encrypted)
    }
  }

  // Fall back to system key
  if (provider === 'anthropic' && env.ANTHROPIC_API_KEY) return env.ANTHROPIC_API_KEY
  if (provider === 'openai' && env.OPENAI_API_KEY) return env.OPENAI_API_KEY

  return null
}

export async function runDirectReview(
  diff: string,
  config: ReviewAgentConfig,
  userId: string,
  onEvent: (event: ReviewStreamEvent) => void
): Promise<ReviewResult> {
  const provider = config.provider ?? 'anthropic'
  const apiKey = await resolveApiKey(userId, provider)

  if (!apiKey) {
    throw new Error(
      `No ${provider} API key available. Add your API key in Settings → API Keys, ` +
        `or set ${provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'} env var.`
    )
  }

  if (provider === 'anthropic') {
    const adapter = new AnthropicDirectAdapter(apiKey)
    return adapter.runFullReview(diff, config, onEvent)
  } else {
    const adapter = new OpenAIDirectAdapter(apiKey)
    return adapter.runFullReview(diff, config, onEvent)
  }
}

export async function getAvailableProviders(userId: string): Promise<{
  anthropic: boolean
  openai: boolean
  systemAnthropicAvailable: boolean
  systemOpenaiAvailable: boolean
}> {
  let userAnthropicKey = false
  let userOpenaiKey = false

  if (isPostgresAvailable()) {
    const keys = await pgOne<{ anthropic_count: string; openai_count: string }>(
      `SELECT
        COUNT(*) FILTER (WHERE provider = 'anthropic' AND is_active = TRUE) AS anthropic_count,
        COUNT(*) FILTER (WHERE provider = 'openai' AND is_active = TRUE) AS openai_count
       FROM user_api_keys WHERE user_id = $1`,
      [userId]
    )
    userAnthropicKey = parseInt(keys?.anthropic_count ?? '0') > 0
    userOpenaiKey = parseInt(keys?.openai_count ?? '0') > 0
  }

  return {
    anthropic: userAnthropicKey || !!env.ANTHROPIC_API_KEY,
    openai: userOpenaiKey || !!env.OPENAI_API_KEY,
    systemAnthropicAvailable: !!env.ANTHROPIC_API_KEY,
    systemOpenaiAvailable: !!env.OPENAI_API_KEY,
  }
}
