import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import './styles/App.css'

function App() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'running' | 'stopped' | 'error'>('checking')
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    // Get app version
    invoke('get_version').then(setVersion).catch(console.error)
      
    let unlistenReady: () => void
    let unlistenStopped: () => void
    let unlistenError: () => void
      
    // Check backend status
    const init = async () => {
      try {
        const status = await invoke('get_backend_status')
        setBackendStatus(status.running ? 'running' : 'stopped')
      } catch {
        setBackendStatus('error')
      }
        
      // Listen for backend events (only in Tauri environment)
      const tauri = (window as any).__TAURI__
      if (tauri?.event) {
        unlistenReady = await tauri.event.listen('backend:ready', () => setBackendStatus('running'))
        unlistenStopped = await tauri.event.listen('backend:stopped', () => setBackendStatus('stopped'))
        unlistenError = await tauri.event.listen('backend:error', () => setBackendStatus('error'))
      }
    }
    init()
      
    return () => {
      unlistenReady?.()
      unlistenStopped?.()
      unlistenError?.()
    }
  }, [])

  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <div className="header-left">
            <h1>AI Workplace</h1>
            <span className={`status-indicator ${backendStatus}`} title={`Backend: ${backendStatus}`} />
          </div>
          <div className="header-right">
            <span className="version">v{version}</span>
          </div>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/files" element={<Files />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

function Dashboard() {
  return (
    <div className="page dashboard">
      <h2>Dashboard</h2>
      <div className="dashboard-grid">
        <div className="card">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button className="btn primary">New Chat</button>
            <button className="btn secondary">Browse Files</button>
            <button className="btn secondary">Settings</button>
          </div>
        </div>
        <div className="card">
          <h3>Recent Conversations</h3>
          <p className="placeholder">No conversations yet</p>
        </div>
        <div className="card">
          <h3>System Status</h3>
          <div className="status-item">
            <span>Backend</span>
            <span className={`status ${backendStatus}`}>{backendStatus}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Chat() {
  return (
    <div className="page chat">
      <h2>Chat</h2>
      <div className="chat-container">
        <aside className="chat-sidebar">
          <h3>Conversations</h3>
          <button className="btn primary">New Conversation</button>
          <ul className="conversation-list">
            <li className="placeholder">No conversations</li>
          </ul>
        </aside>
        <div className="chat-main">
          <div className="messages">
            <div className="placeholder">Select a conversation or start a new one</div>
          </div>
          <form className="message-form">
            <textarea placeholder="Type a message..." rows={3} />
            <button type="submit" className="btn primary">Send</button>
          </form>
        </div>
      </div>
    </div>
  )
}

function Files() {
  return (
    <div className="page files">
      <h2>Files</h2>
      <div className="files-container">
        <aside className="files-sidebar">
          <h3>Directories</h3>
          <button className="btn secondary" onClick={async () => {
            try {
              const files = await invoke('list_directory', { path: '/home' })
              console.log(files)
            } catch (e) {
              console.error(e)
            }
          }}>Browse Home</button>
        </aside>
        <div className="files-main">
          <div className="placeholder">Select a directory to browse</div>
        </div>
      </div>
    </div>
  )
}

function Settings() {
  return (
    <div className="page settings">
      <h2>Settings</h2>
      <div className="settings-sections">
        <section className="settings-section">
          <h3>General</h3>
          <div className="setting-item">
            <label>Theme</label>
            <select>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="setting-item">
            <label>Language</label>
            <select>
              <option value="en">English</option>
            </select>
          </div>
        </section>
        <section className="settings-section">
          <h3>Backend</h3>
          <div className="setting-item">
            <label>Backend URL</label>
            <input type="text" defaultValue="http://localhost:8080" />
          </div>
          <div className="setting-item">
            <label>Auto-start Backend</label>
            <input type="checkbox" defaultChecked />
          </div>
        </section>
      </div>
    </div>
  )
}

export default App