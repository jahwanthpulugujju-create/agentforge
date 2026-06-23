import { useState, useEffect } from 'react'
import { useAuthContext } from '../../hooks/use-auth'

type Job = {
  id: string
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  provider: string
  model: string
  phase: string
  progress_percent: number
  branch: string | null
  pr_number: number | null
  result: { verdict?: string; summary?: string; findings_count?: number } | null
  error_message: string | null
  tokens_used: number
  cost_usd: string
  created_at: string
  completed_at: string | null
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-zinc-400 bg-zinc-800',
  queued: 'text-yellow-400 bg-yellow-950',
  running: 'text-blue-400 bg-blue-950',
  completed: 'text-green-400 bg-green-950',
  failed: 'text-red-400 bg-red-950',
  cancelled: 'text-zinc-500 bg-zinc-800',
}

const VERDICT_COLORS: Record<string, string> = {
  APPROVE: 'text-green-400',
  REQUEST_CHANGES: 'text-red-400',
  NEEDS_DISCUSSION: 'text-yellow-400',
}

async function authFetch(path: string, token: string | null, init?: RequestInit) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  return fetch(path, { ...init, headers })
}

export function ReviewJobsPage() {
  const { getAccessToken } = useAuthContext()
  const token = getAccessToken()

  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [diff, setDiff] = useState('')
  const [branch, setBranch] = useState('')
  const [provider, setProvider] = useState('anthropic')
  const [model, setModel] = useState('claude-opus-4-5')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  async function loadJobs() {
    const res = await authFetch('/api/jobs?limit=20', token)
    const data = await res.json()
    setJobs(data.jobs ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadJobs()
    const interval = setInterval(loadJobs, 5000)
    return () => clearInterval(interval)
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)
    try {
      const res = await authFetch('/api/jobs', token, {
        method: 'POST',
        body: JSON.stringify({ diff_content: diff, branch: branch || undefined, provider, model }),
      })
      if (!res.ok) {
        const d = await res.json()
        setSubmitError(d.error ?? 'Failed to submit')
        return
      }
      setDiff('')
      setBranch('')
      setSubmitOpen(false)
      await loadJobs()
    } catch {
      setSubmitError('Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel(id: string) {
    await authFetch(`/api/jobs/${id}`, token, { method: 'DELETE' })
    await loadJobs()
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Review Jobs</h1>
          <p className="text-zinc-400 text-sm mt-0.5">AI-powered multi-agent code reviews</p>
        </div>
        <button
          onClick={() => setSubmitOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          New Review
        </button>
      </div>

      {/* Submit form */}
      {submitOpen && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium text-zinc-300 mb-4">Submit Code Review</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Git Diff *</label>
              <textarea
                value={diff}
                onChange={(e) => setDiff(e.target.value)}
                required
                rows={10}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paste your git diff here…"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Branch (optional)</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="feature/..."
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Provider</label>
                <select
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value)
                    setModel(e.target.value === 'anthropic' ? 'claude-opus-4-5' : 'gpt-4o')
                  }}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm"
                >
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm"
                >
                  {provider === 'anthropic' ? (
                    <>
                      <option value="claude-opus-4-5">Claude Opus</option>
                      <option value="claude-sonnet-4-5">Claude Sonnet</option>
                      <option value="claude-haiku-4-5">Claude Haiku</option>
                    </>
                  ) : (
                    <>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="o1-preview">o1 Preview</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            {submitError && <p className="text-sm text-red-400">{submitError}</p>}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {submitting ? 'Submitting…' : 'Submit Review'}
              </button>
              <button
                type="button"
                onClick={() => setSubmitOpen(false)}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-200 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Jobs list */}
      <div className="space-y-3">
        {loading && <p className="text-zinc-500 text-sm">Loading…</p>}
        {!loading && jobs.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <p className="text-sm">No reviews yet.</p>
            <button onClick={() => setSubmitOpen(true)} className="mt-2 text-blue-400 hover:text-blue-300 text-sm">
              Submit your first review →
            </button>
          </div>
        )}
        {jobs.map((job) => (
          <div key={job.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[job.status]}`}>
                    {job.status}
                  </span>
                  {job.result?.verdict && (
                    <span className={`text-xs font-semibold ${VERDICT_COLORS[job.result.verdict] ?? 'text-zinc-400'}`}>
                      {job.result.verdict}
                    </span>
                  )}
                  <span className="text-xs text-zinc-500 capitalize">{job.provider} · {job.model}</span>
                  {job.branch && <span className="text-xs text-zinc-500 font-mono">{job.branch}</span>}
                </div>

                {job.status === 'running' && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                      <span className="capitalize">{job.phase.replace(/-/g, ' ')}</span>
                      <span>{job.progress_percent}%</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                        style={{ width: `${job.progress_percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {job.result?.summary && (
                  <p className="text-sm text-zinc-300 mt-2 line-clamp-2">{job.result.summary}</p>
                )}

                {job.error_message && (
                  <p className="text-sm text-red-400 mt-2 line-clamp-2">{job.error_message}</p>
                )}

                <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                  {job.result?.findings_count !== undefined && (
                    <span>{job.result.findings_count} findings</span>
                  )}
                  {job.tokens_used > 0 && (
                    <span>{job.tokens_used.toLocaleString()} tokens · ${parseFloat(job.cost_usd).toFixed(4)}</span>
                  )}
                  <span>{new Date(job.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {(job.status === 'pending' || job.status === 'queued') && (
                <button
                  onClick={() => handleCancel(job.id)}
                  className="text-xs text-zinc-500 hover:text-red-400 px-2 py-1 rounded border border-zinc-700 hover:border-zinc-600 transition-colors shrink-0"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
