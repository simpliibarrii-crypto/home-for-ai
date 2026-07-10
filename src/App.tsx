import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  Activity,
  Bot,
  BrainCircuit,
  ChevronRight,
  CircleUserRound,
  Database,
  FileText,
  FolderKanban,
  Home,
  MessageSquare,
  Microscope,
  Orbit,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from 'lucide-react'
import { BrowserRouter, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import './styles/App.css'

type BackendStatus = 'checking' | 'running' | 'stopped' | 'error'

type NavItem = {
  label: string
  path: string
  icon: ReactNode
}

const navigation: NavItem[] = [
  { label: 'Overview', path: '/', icon: <Home size={18} /> },
  { label: 'AI Workspace', path: '/chat', icon: <MessageSquare size={18} /> },
  { label: 'Knowledge Vault', path: '/files', icon: <Database size={18} /> },
  { label: 'Settings', path: '/settings', icon: <Settings2 size={18} /> },
]

function App() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking')
  const [version, setVersion] = useState('0.2.0')

  useEffect(() => {
    invoke<string>('get_version').then(setVersion).catch(() => undefined)

    let unlistenReady: (() => void) | undefined
    let unlistenStopped: (() => void) | undefined
    let unlistenError: (() => void) | undefined

    const init = async () => {
      try {
        const status = await invoke<{ running: boolean }>('get_backend_status')
        setBackendStatus(status.running ? 'running' : 'stopped')
      } catch {
        setBackendStatus('error')
      }

      const tauri = (window as Window & {
        __TAURI__?: {
          event?: {
            listen: (event: string, callback: () => void) => Promise<() => void>
          }
        }
      }).__TAURI__

      if (tauri?.event) {
        unlistenReady = await tauri.event.listen('backend:ready', () => setBackendStatus('running'))
        unlistenStopped = await tauri.event.listen('backend:stopped', () => setBackendStatus('stopped'))
        unlistenError = await tauri.event.listen('backend:error', () => setBackendStatus('error'))
      }
    }

    void init()

    return () => {
      unlistenReady?.()
      unlistenStopped?.()
      unlistenError?.()
    }
  }, [])

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar version={version} />
        <div className="workspace-shell">
          <Topbar backendStatus={backendStatus} />
          <main className="workspace-main">
            <Routes>
              <Route path="/" element={<Dashboard backendStatus={backendStatus} />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/files" element={<Files />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}

function Sidebar({ version }: { version: string }) {
  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">
          <Orbit size={23} />
        </div>
        <div>
          <strong>Home for AI</strong>
          <span>Local intelligence layer</span>
        </div>
      </div>

      <nav className="primary-nav" aria-label="Primary navigation">
        <span className="nav-eyebrow">Workspace</span>
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-card">
        <div className="sidebar-card-icon">
          <ShieldCheck size={18} />
        </div>
        <div>
          <strong>Local-first by design</strong>
          <p>Your workflows stay inspectable, portable, and under your control.</p>
        </div>
      </div>

      <div className="sidebar-footer">
        <span className="version-pill">v{version}</span>
        <span>Desktop preview</span>
      </div>
    </aside>
  )
}

function Topbar({ backendStatus }: { backendStatus: BackendStatus }) {
  return (
    <header className="topbar">
      <div>
        <p className="topbar-kicker">Command center</p>
        <h1>Build, research, and publish from one place.</h1>
      </div>
      <div className="topbar-actions">
        <button className="icon-button search-button" type="button" aria-label="Search workspace">
          <Search size={18} />
          <span>Search</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className={`runtime-chip ${backendStatus}`}>
          <span className="runtime-dot" />
          {formatStatus(backendStatus)}
        </div>
        <button className="profile-button" type="button" aria-label="Open profile">
          <CircleUserRound size={21} />
        </button>
      </div>
    </header>
  )
}

function Dashboard({ backendStatus }: { backendStatus: BackendStatus }) {
  const navigate = useNavigate()

  const projects = [
    {
      name: 'Raven AI',
      category: 'Scientific intelligence',
      description: 'Evidence-linked workflows for biology, healthcare, and reproducible research.',
      icon: <BrainCircuit size={21} />,
      status: 'Core platform',
    },
    {
      name: 'OpenClinical AI',
      category: 'Clinical runtime',
      description: 'Consent-aware, auditable infrastructure for clinical AI experiments.',
      icon: <Microscope size={21} />,
      status: 'MVP',
    },
    {
      name: 'Hermes Edge',
      category: 'Edge inference',
      description: 'Tool-first local model routing for phones, laptops, and edge hardware.',
      icon: <Zap size={21} />,
      status: 'Preview',
    },
  ]

  return (
    <div className="page dashboard-page">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={15} /> Flagship workspace</span>
          <h2>Your AI ecosystem, finally under one roof.</h2>
          <p>
            Coordinate agents, inspect evidence, manage local files, and move ideas from experiment to publication without losing the thread.
          </p>
          <div className="hero-actions">
            <button className="button button-primary" type="button" onClick={() => navigate('/chat')}>
              Open AI Workspace <ChevronRight size={17} />
            </button>
            <button className="button button-secondary" type="button" onClick={() => navigate('/files')}>
              Browse Knowledge Vault
            </button>
          </div>
        </div>
        <div className="hero-orbit" aria-label="Home for AI ecosystem visualization">
          <div className="orbit-core"><Orbit size={34} /></div>
          <span className="orbit-node orbit-node-one"><Bot size={18} /></span>
          <span className="orbit-node orbit-node-two"><FileText size={18} /></span>
          <span className="orbit-node orbit-node-three"><Workflow size={18} /></span>
          <span className="orbit-ring orbit-ring-one" />
          <span className="orbit-ring orbit-ring-two" />
        </div>
      </section>

      <section className="metric-grid" aria-label="Workspace summary">
        <MetricCard icon={<Activity size={19} />} label="Runtime" value={formatStatus(backendStatus)} detail="Local FastAPI service" tone={backendStatus === 'running' ? 'success' : 'neutral'} />
        <MetricCard icon={<FolderKanban size={19} />} label="Active projects" value="4" detail="Connected ecosystem repos" />
        <MetricCard icon={<ShieldCheck size={19} />} label="Evidence mode" value="Ready" detail="Traceable run records" tone="success" />
        <MetricCard icon={<Zap size={19} />} label="Execution" value="Local-first" detail="Cloud remains optional" />
      </section>

      <section className="content-grid">
        <div className="panel projects-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Ecosystem</span>
              <h3>Connected projects</h3>
            </div>
            <button className="text-button" type="button">View roadmap <ChevronRight size={15} /></button>
          </div>
          <div className="project-list">
            {projects.map((project) => (
              <article className="project-row" key={project.name}>
                <div className="project-icon">{project.icon}</div>
                <div className="project-copy">
                  <div className="project-title-line">
                    <strong>{project.name}</strong>
                    <span>{project.status}</span>
                  </div>
                  <p className="project-category">{project.category}</p>
                  <p>{project.description}</p>
                </div>
                <button className="row-action" type="button" aria-label={`Open ${project.name}`}><ChevronRight size={18} /></button>
              </article>
            ))}
          </div>
        </div>

        <div className="panel workflow-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Publishing pipeline</span>
              <h3>From signal to release</h3>
            </div>
          </div>
          <div className="workflow-list">
            {[
              ['01', 'Research', 'Collect papers, datasets, and source evidence.'],
              ['02', 'Build', 'Prototype agents, APIs, and local workflows.'],
              ['03', 'Verify', 'Run tests, safety gates, and evidence checks.'],
              ['04', 'Publish', 'Ship code, papers, demos, and release notes.'],
            ].map(([number, title, description], index) => (
              <div className="workflow-step" key={title}>
                <span className="step-number">{number}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{description}</p>
                </div>
                {index < 3 && <span className="step-line" />}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  icon: ReactNode
  label: string
  value: string
  detail: string
  tone?: 'neutral' | 'success'
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  )
}

function Chat() {
  const [message, setMessage] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!message.trim()) return
    setMessage('')
  }

  return (
    <div className="page workspace-page">
      <div className="page-heading">
        <div><span className="section-kicker">Agent console</span><h2>AI Workspace</h2></div>
        <button className="button button-secondary" type="button"><Sparkles size={16} /> New session</button>
      </div>
      <div className="chat-layout">
        <aside className="session-panel panel">
          <label className="mini-search"><Search size={15} /><input placeholder="Search sessions" /></label>
          <button className="session-item active" type="button"><span>Flagship repository audit</span><small>Current session</small></button>
          <button className="session-item" type="button"><span>Scientific paper pipeline</span><small>Research workspace</small></button>
          <button className="session-item" type="button"><span>Raven benchmark review</span><small>Engineering</small></button>
        </aside>
        <section className="conversation-panel panel">
          <div className="conversation-empty">
            <div className="empty-icon"><Bot size={28} /></div>
            <h3>What are we building next?</h3>
            <p>Ask the workspace to inspect code, organize research, plan a release, or prepare a scientific draft.</p>
            <div className="prompt-grid">
              <button type="button">Review the next repository</button>
              <button type="button">Plan a reproducible experiment</button>
              <button type="button">Draft release documentation</button>
            </div>
          </div>
          <form className="composer" onSubmit={handleSubmit}>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe the task, goal, or research question…" rows={3} />
            <div className="composer-footer">
              <span><ShieldCheck size={14} /> Local workspace context</span>
              <button className="button button-primary" type="submit">Send <ChevronRight size={16} /></button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

function Files() {
  const [status, setStatus] = useState('Choose a trusted directory to begin.')

  const browseHome = async () => {
    try {
      await invoke('list_directory', { path: '/home' })
      setStatus('Home directory loaded successfully.')
    } catch {
      setStatus('Directory access is unavailable in this environment.')
    }
  }

  return (
    <div className="page workspace-page">
      <div className="page-heading">
        <div><span className="section-kicker">Local knowledge</span><h2>Knowledge Vault</h2></div>
        <button className="button button-primary" type="button" onClick={browseHome}>Browse directory</button>
      </div>
      <div className="vault-grid">
        <aside className="panel vault-sidebar">
          <span className="nav-eyebrow">Pinned locations</span>
          <button className="vault-location active" type="button"><Database size={17} /> AI Repo Vault</button>
          <button className="vault-location" type="button"><FileText size={17} /> Research Papers</button>
          <button className="vault-location" type="button"><FolderKanban size={17} /> Project Documents</button>
        </aside>
        <section className="panel vault-main">
          <div className="vault-empty">
            <Database size={30} />
            <h3>Your local knowledge layer</h3>
            <p>{status}</p>
            <button className="button button-secondary" type="button" onClick={browseHome}>Connect a folder</button>
          </div>
        </section>
      </div>
    </div>
  )
}

function Settings() {
  return (
    <div className="page workspace-page settings-page">
      <div className="page-heading"><div><span className="section-kicker">Configuration</span><h2>Settings</h2></div></div>
      <section className="panel settings-panel">
        <div className="settings-group">
          <div><h3>Appearance</h3><p>Choose how the desktop workspace presents itself.</p></div>
          <label className="field"><span>Theme</span><select defaultValue="system"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
        </div>
        <div className="settings-group">
          <div><h3>Runtime</h3><p>Manage the local backend used by Home for AI.</p></div>
          <div className="field-stack">
            <label className="field"><span>Backend URL</span><input type="text" defaultValue="http://localhost:8080" /></label>
            <label className="toggle-field"><span><strong>Auto-start backend</strong><small>Launch the local service with the desktop app.</small></span><input type="checkbox" defaultChecked /></label>
          </div>
        </div>
      </section>
    </div>
  )
}

function formatStatus(status: BackendStatus) {
  if (status === 'running') return 'Online'
  if (status === 'checking') return 'Checking'
  if (status === 'stopped') return 'Offline'
  return 'Attention'
}

export default App
