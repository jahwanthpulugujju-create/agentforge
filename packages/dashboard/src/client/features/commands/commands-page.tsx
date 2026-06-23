import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSocket, useSocketEvent } from '../../providers/socket-provider'
import { useCommandState } from '../../providers/command-state-provider'
import { useAiCli } from '../../hooks/use-ai-cli'
import { CommandPalette, parseCommandString, type ParsedCommand } from './components/command-palette'
import { WorkflowOutput } from './components/workflow-output'
import { CommandHistory } from './components/command-history'
import { TabBar } from './components/tab-bar'
import { DemoPanel } from './components/demo-panel'

const CLI_DISPLAY_NAMES: Record<string, string> = {
  claude: 'Claude Code',
  opencode: 'OpenCode',
}

export function CommandsPage() {
  const { socket } = useSocket()
  const queryClient = useQueryClient()
  const { isAvailable, activeCli, isDisabledByConfig } = useAiCli()
  const {
    tabs,
    activeTabId,
    runningCount,
    setActiveTabId,
    dismissTab,
    cancelCommand,
  } = useCommandState()

  const activeTab = tabs.find((t) => t.executionId === activeTabId) ?? null
  const [prefill, setPrefill] = useState<ParsedCommand | null>(null)
  const paletteRef = useRef<HTMLDivElement>(null)

  useSocketEvent('command:finished', () => {
    queryClient.invalidateQueries({ queryKey: ['command-history'] })
  })

  const handleRunCommand = useCallback(
    (command: string) => {
      if (!socket) return
      socket.emit('command:run', { command })
    },
    [socket],
  )

  const handleCancel = useCallback(() => {
    if (activeTab && activeTab.status === 'running') {
      cancelCommand(activeTab.executionId)
    }
  }, [activeTab, cancelCommand])

  const handleRerun = useCallback(
    (commandStr: string) => {
      const parsed = parseCommandString(commandStr)
      if (parsed) {
        setPrefill(parsed)
        paletteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    },
    [],
  )

  const handlePrefillConsumed = useCallback(() => {
    setPrefill(null)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Command Center</h1>
        <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
          Launch AI-powered code review workflows.
          {activeCli && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px]"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
              using {CLI_DISPLAY_NAMES[activeCli] ?? activeCli}
            </span>
          )}
        </p>
      </div>

      {/* ── Demo panel — hero when CLI is absent, collapsed section when available ── */}
      {!isAvailable ? (
        /* CLI not installed: demo is the primary action */
        <div className="space-y-4">
          <DemoPanel hero />

          {/* Explain the real path */}
          <div className="rounded-lg px-5 py-4"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[12px] font-medium mb-1" style={{ color: '#64748b' }}>
              {isDisabledByConfig ? 'AI commands disabled by config' : 'To run live reviews'}
            </p>
            <p className="text-[11.5px]" style={{ color: '#475569' }}>
              {isDisabledByConfig
                ? 'Set ai_cli to auto, claude, or opencode in .ocr/config.yaml to enable live workflows.'
                : 'Install Claude Code or OpenCode, then restart the server. Until then, use Demo Mode above.'}
            </p>
          </div>
        </div>
      ) : (
        /* CLI available: palette first, demo as secondary collapsible */
        <>
          <div ref={paletteRef}>
            <CommandPalette
              isRunning={false}
              runningCount={runningCount}
              onRunCommand={handleRunCommand}
              prefill={prefill}
              onPrefillConsumed={handlePrefillConsumed}
            />
          </div>
          <DemoPanel />
        </>
      )}

      {/* ── Tabbed output area (shared by real runs and demo) ── */}
      {tabs.length > 0 && (
        <div className="overflow-hidden rounded-lg"
          style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onDismissTab={dismissTab}
          />
          {activeTab && (
            <WorkflowOutput
              bare
              output={activeTab.output}
              events={activeTab.events}
              isRunning={activeTab.status === 'running'}
              exitCode={activeTab.exitCode}
              status={activeTab.status}
              commandName={activeTab.command}
              onCancel={handleCancel}
            />
          )}
        </div>
      )}

      <CommandHistory isRunning={false} onRerun={handleRerun} />
    </div>
  )
}
