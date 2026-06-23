/**
 * Public Settings page — accessible without login.
 *
 * Stores API keys and model preferences in localStorage so judges/users
 * can configure the demo and live AI paths without requiring server-side
 * auth (JWT_SECRET not needed for this page).
 */

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Check, Cpu, Cloud, Wifi, WifiOff, Trash2, Save } from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────────── */

type ProviderKey = {
  provider: 'anthropic' | 'openai'
  key: string
  savedAt: string
}

type ModelConfig = {
  useOllama: boolean
  ollamaHost: string
  ollamaModel: string
  preferredCloud: 'anthropic' | 'openai'
}

const DEFAULT_CONFIG: ModelConfig = {
  useOllama: false,
  ollamaHost: 'http://localhost:11434',
  ollamaModel: 'llama3:8b',
  preferredCloud: 'anthropic',
}

const LS_KEYS_KEY = 'agentforge:api-keys'
const LS_CONFIG_KEY = 'agentforge:model-config'

const OLLAMA_MODELS = [
  { value: 'llama3:8b',       label: 'Llama 3 8B  (fast, general)' },
  { value: 'llama3:70b',      label: 'Llama 3 70B (best quality)' },
  { value: 'codellama:7b',    label: 'CodeLlama 7B (code-optimised)' },
  { value: 'codellama:13b',   label: 'CodeLlama 13B (code, larger)' },
  { value: 'mistral:7b',      label: 'Mistral 7B (fast)' },
  { value: 'deepseek-coder:6.7b', label: 'DeepSeek Coder 6.7B' },
]

/* ── localStorage helpers ────────────────────────────────────────────────── */

function loadKeys(): ProviderKey[] {
  try { return JSON.parse(localStorage.getItem(LS_KEYS_KEY) ?? '[]') } catch { return [] }
}
function saveKeys(keys: ProviderKey[]) {
  localStorage.setItem(LS_KEYS_KEY, JSON.stringify(keys))
}
function loadConfig(): ModelConfig {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(LS_CONFIG_KEY) ?? '{}') } }
  catch { return DEFAULT_CONFIG }
}
function saveConfig(cfg: ModelConfig) {
  localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(cfg))
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-[15px] font-semibold" style={{ color: '#f0f4f8', letterSpacing: '-0.01em' }}>
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-[12.5px]" style={{ color: '#64748b' }}>{subtitle}</p>
      )}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-mono text-[10.5px] uppercase tracking-widest mb-1.5"
      style={{ color: '#475569' }}>
      {children}
    </label>
  )
}

function TextInput({
  value, onChange, placeholder, type = 'text', mono = false,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  mono?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg px-3 py-2 text-[12.5px] transition-colors"
      style={{
        background: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.09)',
        color: '#e2e8f0',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        outline: 'none',
      }}
      onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.2)' }}
      onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.09)' }}
    />
  )
}

function PrimaryButton({
  onClick, disabled, children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 font-mono text-[11.5px] font-medium transition-all"
      style={{
        background: disabled ? 'rgba(255,255,255,0.04)' : 'rgba(56,189,248,0.12)',
        border: disabled ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(56,189,248,0.28)',
        color: disabled ? '#334155' : '#38bdf8',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = 'rgba(56,189,248,0.2)' }}
      onMouseLeave={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = 'rgba(56,189,248,0.12)' }}
    >
      {children}
    </button>
  )
}

/* ── API Keys section ────────────────────────────────────────────────────── */

const PROVIDERS: { id: 'anthropic' | 'openai'; label: string; placeholder: string; color: string }[] = [
  { id: 'anthropic', label: 'Anthropic (Claude)',  placeholder: 'sk-ant-api03-…', color: '#f87171' },
  { id: 'openai',    label: 'OpenAI (GPT)',         placeholder: 'sk-proj-…',      color: '#34d399' },
]

function ApiKeysSection() {
  const [keys, setKeys] = useState<ProviderKey[]>([])
  const [form, setForm] = useState<{ provider: 'anthropic' | 'openai'; key: string }>({
    provider: 'anthropic',
    key: '',
  })
  const [visible, setVisible] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setKeys(loadKeys()) }, [])

  function handleSave() {
    if (!form.key.trim()) return
    const next: ProviderKey[] = [
      ...keys.filter((k) => k.provider !== form.provider),
      { provider: form.provider, key: form.key.trim(), savedAt: new Date().toISOString() },
    ]
    setKeys(next)
    saveKeys(next)
    setForm((f) => ({ ...f, key: '' }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleDelete(provider: 'anthropic' | 'openai') {
    const next = keys.filter((k) => k.provider !== provider)
    setKeys(next)
    saveKeys(next)
  }

  const existing = (provider: 'anthropic' | 'openai') => keys.find((k) => k.provider === provider)

  return (
    <section className="space-y-4">
      <SectionHeader
        title="API Keys"
        subtitle="Keys are stored in your browser's localStorage — never sent to any server. Used to route live AI reviews."
      />

      <Card>
        {/* Existing keys */}
        <div className="space-y-3 mb-5">
          {PROVIDERS.map((p) => {
            const saved = existing(p.id)
            return (
              <div key={p.id} className="flex items-center justify-between gap-4 rounded-lg px-3 py-2.5"
                style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${saved ? p.color + '28' : 'rgba(255,255,255,0.06)'}` }}>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ background: saved ? p.color : '#334155' }} />
                  <div>
                    <p className="text-[12.5px] font-medium" style={{ color: '#e2e8f0' }}>{p.label}</p>
                    {saved ? (
                      <p className="font-mono text-[10px]" style={{ color: '#475569' }}>
                        {saved.key.slice(0, 12)}{'•'.repeat(12)} · saved {new Date(saved.savedAt).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-[10px]" style={{ color: '#334155' }}>Not configured</p>
                    )}
                  </div>
                </div>
                {saved && (
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="shrink-0 rounded p-1.5 transition-colors"
                    style={{ color: '#475569' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f87171' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#475569' }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Add / update key */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: '#475569' }}>
            Add or update a key
          </p>
          <div className="space-y-3">
            <div>
              <Label>Provider</Label>
              <select
                value={form.provider}
                onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as 'anthropic' | 'openai' }))}
                className="w-full rounded-lg px-3 py-2 text-[12.5px]"
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: '#e2e8f0',
                  outline: 'none',
                }}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>API Key</Label>
              <div className="relative">
                <TextInput
                  value={form.key}
                  onChange={(v) => setForm((f) => ({ ...f, key: v }))}
                  placeholder={PROVIDERS.find((p) => p.id === form.provider)?.placeholder}
                  type={visible ? 'text' : 'password'}
                  mono
                />
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: '#475569' }}
                >
                  {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <PrimaryButton onClick={handleSave} disabled={!form.key.trim()}>
              {saved ? <><Check className="h-3.5 w-3.5" /> Saved</> : <><Save className="h-3.5 w-3.5" /> Save key</>}
            </PrimaryButton>
          </div>
        </div>
      </Card>
    </section>
  )
}

/* ── Model config section ────────────────────────────────────────────────── */

function ModelConfigSection() {
  const [cfg, setCfg] = useState<ModelConfig>(loadConfig)
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [saved, setSaved] = useState(false)

  // Check Ollama availability
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${cfg.ollamaHost}/api/tags`, { signal: AbortSignal.timeout(2000) })
        setOllamaStatus(res.ok ? 'online' : 'offline')
      } catch {
        setOllamaStatus('offline')
      }
    }
    void check()
  }, [cfg.ollamaHost])

  function update(patch: Partial<ModelConfig>) {
    setCfg((c) => ({ ...c, ...patch }))
  }

  function handleSave() {
    saveConfig(cfg)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Model Configuration"
        subtitle="Choose between local Ollama models (zero API cost, full privacy) or cloud AI providers."
      />

      <Card>
        {/* Cloud vs Local toggle */}
        <div className="flex gap-3 mb-6">
          {[
            { val: false, icon: Cloud,  label: 'Cloud API',  sub: 'Anthropic / OpenAI' },
            { val: true,  icon: Cpu,    label: 'Local (Ollama)', sub: 'Runs on your machine' },
          ].map(({ val, icon: Icon, label, sub }) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => update({ useOllama: val })}
              className="flex-1 flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-all"
              style={{
                background: cfg.useOllama === val ? 'rgba(56,189,248,0.08)' : 'rgba(0,0,0,0.2)',
                border: cfg.useOllama === val ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <Icon className="h-4 w-4 shrink-0" style={{ color: cfg.useOllama === val ? '#38bdf8' : '#475569' }} />
              <div>
                <p className="text-[12.5px] font-medium" style={{ color: cfg.useOllama === val ? '#e2e8f0' : '#94a3b8' }}>
                  {label}
                </p>
                <p className="text-[10.5px]" style={{ color: '#475569' }}>{sub}</p>
              </div>
            </button>
          ))}
        </div>

        {cfg.useOllama ? (
          /* ── Ollama settings ── */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#475569' }}>
                Ollama connection
              </p>
              <div className="flex items-center gap-1.5">
                {ollamaStatus === 'checking' && (
                  <span className="font-mono text-[10px]" style={{ color: '#475569' }}>checking…</span>
                )}
                {ollamaStatus === 'online' && (
                  <>
                    <Wifi className="h-3 w-3" style={{ color: '#34d399' }} />
                    <span className="font-mono text-[10px]" style={{ color: '#34d399' }}>online</span>
                  </>
                )}
                {ollamaStatus === 'offline' && (
                  <>
                    <WifiOff className="h-3 w-3" style={{ color: '#f87171' }} />
                    <span className="font-mono text-[10px]" style={{ color: '#f87171' }}>not reachable</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <Label>Ollama Host URL</Label>
              <TextInput
                value={cfg.ollamaHost}
                onChange={(v) => update({ ollamaHost: v })}
                placeholder="http://localhost:11434"
                mono
              />
              <p className="mt-1 text-[10.5px]" style={{ color: '#334155' }}>
                Default is http://localhost:11434 — change if Ollama runs on a remote host
              </p>
            </div>

            <div>
              <Label>Model</Label>
              <select
                value={cfg.ollamaModel}
                onChange={(e) => update({ ollamaModel: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-[12.5px]"
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: '#e2e8f0',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
              >
                {OLLAMA_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {ollamaStatus === 'offline' && (
              <div className="rounded-lg px-4 py-3 space-y-1"
                style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)' }}>
                <p className="text-[12px] font-medium" style={{ color: '#f87171' }}>Ollama not detected</p>
                <p className="text-[11px]" style={{ color: '#64748b' }}>
                  Install from <span className="font-mono" style={{ color: '#94a3b8' }}>ollama.ai</span>, then run{' '}
                  <span className="font-mono rounded px-1" style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                    ollama pull {cfg.ollamaModel}
                  </span>
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ── Cloud settings ── */
          <div className="space-y-4">
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#475569' }}>
              Cloud provider preference
            </p>
            <div className="flex gap-3">
              {(['anthropic', 'openai'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => update({ preferredCloud: p })}
                  className="flex-1 rounded-lg px-4 py-2.5 text-[12.5px] font-medium transition-all"
                  style={{
                    background: cfg.preferredCloud === p ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.2)',
                    border: cfg.preferredCloud === p ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.07)',
                    color: cfg.preferredCloud === p ? '#e2e8f0' : '#64748b',
                  }}
                >
                  {p === 'anthropic' ? 'Anthropic Claude' : 'OpenAI GPT'}
                </button>
              ))}
            </div>
            <p className="text-[11px]" style={{ color: '#334155' }}>
              Add your API key in the section above. The preferred provider is used for live reviews
              when both keys are present.
            </p>
          </div>
        )}

        <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <PrimaryButton onClick={handleSave}>
            {saved ? <><Check className="h-3.5 w-3.5" /> Saved</> : <><Save className="h-3.5 w-3.5" /> Save configuration</>}
          </PrimaryButton>
        </div>
      </Card>
    </section>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-12 pb-20">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#f0f4f8', letterSpacing: '-0.02em' }}>
          Settings
        </h1>
        <p className="mt-1.5 text-[13px]" style={{ color: '#64748b' }}>
          Configure AI providers and model preferences. All values are stored locally in your browser.
        </p>
      </div>

      <ApiKeysSection />
      <ModelConfigSection />
    </div>
  )
}
