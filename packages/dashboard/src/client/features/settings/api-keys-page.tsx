import { useState, useEffect } from 'react'
import { useAuthContext } from '../../hooks/use-auth'

type ApiKey = {
  id: string
  provider: 'anthropic' | 'openai'
  name: string
  key_prefix: string
  is_active: boolean
  last_used_at: string | null
  created_at: string
}

const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic (Claude)', placeholder: 'sk-ant-...' },
  { id: 'openai', label: 'OpenAI (GPT)', placeholder: 'sk-...' },
]

async function authFetch(path: string, token: string | null, init?: RequestInit) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  return fetch(path, { ...init, headers })
}

export function ApiKeysPage() {
  const { getAccessToken } = useAuthContext()
  const token = getAccessToken()

  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ provider: 'anthropic', name: 'default', key: '' })
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { valid: boolean; error?: string; model?: string }>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    authFetch('/api/keys', token)
      .then((r) => r.json())
      .then((data) => setKeys(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setAdding(true)
    try {
      const res = await authFetch('/api/keys', token, {
        method: 'POST',
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to add key')
        return
      }
      const newKey = await res.json()
      setKeys((prev) => [newKey, ...prev.filter((k) => !(k.provider === newKey.provider && k.name === newKey.name))])
      setForm({ provider: 'anthropic', name: 'default', key: '' })
    } catch {
      setError('Failed to add key')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: string) {
    await authFetch(`/api/keys/${id}`, token, { method: 'DELETE' })
    setKeys((prev) => prev.filter((k) => k.id !== id))
  }

  async function handleTest(id: string) {
    setTesting(id)
    try {
      const res = await authFetch(`/api/keys/${id}/test`, token, { method: 'POST' })
      const data = await res.json()
      setTestResult((prev) => ({ ...prev, [id]: data }))
    } catch {
      setTestResult((prev) => ({ ...prev, [id]: { valid: false, error: 'Test failed' } }))
    } finally {
      setTesting(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-xl font-semibold text-zinc-100 mb-1">API Keys</h1>
      <p className="text-zinc-400 text-sm mb-6">
        Store your own AI provider keys. They're encrypted at rest and only used for your reviews.
      </p>

      {/* Add key form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">Add a key</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Provider</label>
              <select
                value={form.provider}
                onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Name (optional)</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="default"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">API Key</label>
            <input
              type="password"
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              placeholder={PROVIDERS.find((p) => p.id === form.provider)?.placeholder}
              required
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm font-mono"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={adding}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {adding ? 'Saving…' : 'Save key'}
          </button>
        </form>
      </div>

      {/* Keys list */}
      <div className="space-y-3">
        {loading && <p className="text-zinc-500 text-sm">Loading…</p>}
        {!loading && keys.length === 0 && (
          <p className="text-zinc-500 text-sm">No keys stored yet.</p>
        )}
        {keys.map((key) => (
          <div key={key.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-100 capitalize">{key.provider}</span>
                {key.name !== 'default' && (
                  <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{key.name}</span>
                )}
              </div>
              <p className="text-xs font-mono text-zinc-500 mt-0.5">{key.key_prefix}</p>
              {testResult[key.id] && (
                <p className={`text-xs mt-1 ${testResult[key.id]?.valid ? 'text-green-400' : 'text-red-400'}`}>
                  {testResult[key.id]?.valid
                    ? `✓ Valid — ${testResult[key.id]?.model}`
                    : `✗ ${testResult[key.id]?.error}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleTest(key.id)}
                disabled={testing === key.id}
                className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                {testing === key.id ? 'Testing…' : 'Test'}
              </button>
              <button
                onClick={() => handleDelete(key.id)}
                className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
