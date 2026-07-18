import { FormEvent, useEffect, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  Command,
  Database,
  FileSearch,
  Fingerprint,
  HeartPulse,
  Home,
  Layers3,
  LockKeyhole,
  MessageSquare,
  Network,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
} from 'lucide-react'
import './styles/App.css'

type RuntimeStatus = 'checking' | 'running' | 'offline' | 'showcase'
type WorkspaceId = 'home' | 'raven' | 'clinical' | 'hermes'
type SectionId = 'overview' | 'conversations' | 'knowledge' | 'workflows' | 'settings'

type Workspace = {
  id: WorkspaceId
  name: string
  purpose: string
  signal: string
  icon: typeof BrainCircuit
}

type ChatMessage = {
  id: number
  role: 'operator' | 'system'
  text: string
}

type BackendStatusResponse = {
  running: boolean
}

const workspaces: Workspace[] = [
  {
    id: 'home',
    name: 'Home for AI',
    purpose: 'Local-first command surface',
    signal: '12 active traces',
    icon: Home,
  },
  {
    id: 'raven',
    name: 'Raven AI',
    purpose: 'Evidence-linked scientific reasoning',
    signal: 'Knowledge mesh ready',
    icon: BrainCircuit,
  },
  {
    id: 'clinical',
    name: 'OpenClinical',
    purpose: 'Consent-aware clinical intelligence',
    signal: 'Guardrails engaged',
    icon: HeartPulse,
  },
  {
    id: 'hermes',
    name: 'Hermes Edge',
    purpose: 'Distributed agent orchestration',
    signal: '4 nodes synchronized',
    icon: Network,
  },
]

const sections: Array<{ id: SectionId; label: string; icon: typeof Home }> = [
  { id: 'overview', label: 'Overview', icon: Layers3 },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  { id: 'knowledge', label: 'Knowledge vault', icon: Database },
  { id: 'workflows', label: 'Workflows', icon: Workflow },
  { id: 'settings', label: 'System settings', icon: Settings },
]

const quickCommands = [
  'Audit the latest evidence trace',
  'Route this task through Raven and Hermes',
  'Summarize the clinical safety boundary',
]

const isTauriRuntime = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

function App() {
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>('checking')
  const [version, setVersion] = useState('')
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>('home')
  const [activeSection, setActiveSection] = useState<SectionId>('overview')
  const [commandText, setCommandText] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'system',
      text: 'The workspace is sealed, local-first, and ready. Select a system or issue a command.',
    },
  ])

  useEffect(() => {
    if (!isTauriRuntime()) {
      setRuntimeStatus('showcase')
      setVersion('web preview')
      return
    }

    const loadRuntime = async () => {
      try {
        const [appVersion, backend] = await Promise.all([
          invoke<string>('get_version'),
          invoke<BackendStatusResponse>('get_backend_status'),
        ])
        setVersion(appVersion)
        setRuntimeStatus(backend.running ? 'running' : 'offline')
      } catch {
        setVersion('desktop')
        setRuntimeStatus('offline')
      }
    }

    void loadRuntime()
  }, [])

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspace) ?? workspaces[0],
    [activeWorkspace],
  )

  const submitCommand = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanCommand = commandText.trim()
    if (!cleanCommand) return

    const messageId = Date.now()
    setMessages((current) => [
      ...current,
      { id: messageId, role: 'operator', text: cleanCommand },
      {
        id: messageId + 1,
        role: 'system',
        text: `${selectedWorkspace.name} accepted the request. A consent-gated trace has been created for review.`,
      },
    ])
    setCommandText('')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><Fingerprint size={22} /></div>
          <div>
            <span className="brand-kicker">PRIVATE AI ESTATE</span>
            <strong>HOME//AI</strong>
          </div>
        </div>

        <nav className="primary-nav" aria-label="Workspace sections">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              className={activeSection === id ? 'nav-item active' : 'nav-item'}
              key={id}
              type="button"
              onClick={() => setActiveSection(id)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-security">
          <LockKeyhole size={16} />
          <div>
            <strong>Local trust boundary</strong>
            <span>No public model has authority here.</span>
          </div>
        </div>
      </aside>

      <div className="workspace-frame">
        <header className="topbar">
          <div className="mobile-brand">HOME//AI</div>
          <div className="topbar-search">
            <Search size={16} />
            <input aria-label="Search workspace" placeholder="Search agents, files, traces..." />
            <kbd>⌘ K</kbd>
          </div>
          <div className="runtime-pill" data-status={runtimeStatus}>
            <span className="runtime-dot" />
            {runtimeStatus === 'showcase' ? 'Public showcase' : `Runtime ${runtimeStatus}`}
          </div>
        </header>

        <main className="main-canvas">
          <section className="hero-panel">
            <div className="hero-copy">
              <div className="eyebrow"><Sparkles size={14} /> SOVEREIGN AGENT WORKSPACE</div>
              <h1>Your intelligence should live somewhere worthy of it.</h1>
              <p>
                A private command environment for orchestrating Raven, OpenClinical, Hermes Edge,
                knowledge vaults, and local models without surrendering provenance or control.
              </p>
              <div className="hero-actions">
                <button className="button button-primary" type="button" onClick={() => setActiveSection('conversations')}>
                  Open command room <ArrowUpRight size={16} />
                </button>
                <a className="button button-ghost" href="https://github.com/simpliibarrii-crypto/home-for-ai" target="_blank" rel="noreferrer">
                  Inspect source
                </a>
              </div>
            </div>

            <div className="orbital-console" aria-label="System orchestration visualization">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="console-core"><Command size={30} /><span>ORCHESTRATOR</span></div>
              <span className="satellite satellite-raven">RAVEN</span>
              <span className="satellite satellite-clinical">CLINICAL</span>
              <span className="satellite satellite-hermes">HERMES</span>
            </div>
          </section>

          <section className="metric-grid" aria-label="System metrics">
            <article className="metric-card">
              <ShieldCheck size={19} />
              <span>Trust state</span>
              <strong>Verified</strong>
              <small>Every output carries provenance.</small>
            </article>
            <article className="metric-card">
              <Activity size={19} />
              <span>Active agents</span>
              <strong>08</strong>
              <small>Across four coordinated systems.</small>
            </article>
            <article className="metric-card">
              <FileSearch size={19} />
              <span>Evidence traces</span>
              <strong>247</strong>
              <small>Inspectable, replayable, exportable.</small>
            </article>
            <article className="metric-card">
              <Terminal size={19} />
              <span>Runtime</span>
              <strong>{version || 'checking'}</strong>
              <small>Desktop core with web showcase.</small>
            </article>
          </section>

          <section className="dashboard-grid">
            <article className="panel systems-panel">
              <div className="panel-heading">
                <div><span className="panel-kicker">THE HOUSE</span><h2>Connected intelligence</h2></div>
                <span className="live-label"><span /> live topology</span>
              </div>
              <div className="workspace-list">
                {workspaces.map((workspace) => {
                  const Icon = workspace.icon
                  return (
                    <button
                      className={activeWorkspace === workspace.id ? 'workspace-row active' : 'workspace-row'}
                      key={workspace.id}
                      type="button"
                      onClick={() => setActiveWorkspace(workspace.id)}
                    >
                      <span className="workspace-icon"><Icon size={20} /></span>
                      <span className="workspace-copy"><strong>{workspace.name}</strong><small>{workspace.purpose}</small></span>
                      <span className="workspace-signal">{workspace.signal}</span>
                      <ArrowUpRight size={16} />
                    </button>
                  )
                })}
              </div>
            </article>

            <article className="panel trace-panel">
              <div className="panel-heading">
                <div><span className="panel-kicker">RECENT TRACE</span><h2>Evidence before authority</h2></div>
                <ShieldCheck size={20} />
              </div>
              <div className="trace-line"><span>01</span><div><strong>Source classified</strong><small>3 papers · 1 local dataset</small></div></div>
              <div className="trace-line"><span>02</span><div><strong>Prompt injection scan</strong><small>No hostile instructions detected</small></div></div>
              <div className="trace-line"><span>03</span><div><strong>Human approval gate</strong><small>Awaiting operator signature</small></div></div>
              <button className="text-button" type="button">Review complete trace <ArrowUpRight size={15} /></button>
            </article>
          </section>

          <section className="command-panel">
            <div className="command-heading">
              <div>
                <span className="panel-kicker">COMMAND ROOM · {selectedWorkspace.name.toUpperCase()}</span>
                <h2>Issue an instruction</h2>
              </div>
              <span className="command-mode"><span /> consent gate enabled</span>
            </div>

            <div className="message-stream" aria-live="polite">
              {messages.slice(-4).map((message) => (
                <div className={`message ${message.role}`} key={message.id}>
                  <span>{message.role === 'operator' ? 'YOU' : 'SYSTEM'}</span>
                  <p>{message.text}</p>
                </div>
              ))}
            </div>

            <form className="command-form" onSubmit={submitCommand}>
              <textarea
                value={commandText}
                onChange={(event) => setCommandText(event.target.value)}
                placeholder={`Ask ${selectedWorkspace.name} to research, route, compare, or build...`}
                rows={3}
              />
              <button className="send-button" type="submit" aria-label="Send command"><Send size={18} /></button>
            </form>

            <div className="quick-commands">
              {quickCommands.map((quickCommand) => (
                <button key={quickCommand} type="button" onClick={() => setCommandText(quickCommand)}>{quickCommand}</button>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
