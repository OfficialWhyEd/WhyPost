import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Dashboard } from './components/Dashboard'
import { ChatSidebar } from './components/ChatSidebar'
import { VideoPreviewModal } from './components/VideoPreviewModal'
import { Sidebar, type Page } from './components/Sidebar'
import { QueuePage } from './pages/QueuePage'
import { CalendarPage } from './pages/CalendarPage'
import { AgentsPage } from './pages/AgentsPage'
import { MemoryPage } from './pages/MemoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { useStore } from './hooks/useStore'
import type { VideoItem } from './types'

type Theme = 'dark' | 'light'

export default function App() {
  const { state, queue, memory, serverOk, sendToClaudeChat, refresh, lastRefresh, runPipeline, pipelineRunning } = useStore()
  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null)
  const [page, setPage] = useState<Page>('home')
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('wp-theme') as Theme) ?? 'dark'
  )

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem('wp-theme', theme)
  }, [theme])

  function toggleTheme() { setTheme(t => t === 'dark' ? 'light' : 'dark') }

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      <Sidebar page={page} onNavigate={setPage} queueCount={queue.length} theme={theme} onToggleTheme={toggleTheme} />

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait">
          {page === 'home' && (
            <Dashboard
              key="home"
              state={state}
              queue={queue}
              memory={memory}
              serverOk={serverOk}
              onVideoClick={setPreviewVideo}
              lastRefresh={lastRefresh}
              onRefresh={refresh}
              onRunPipeline={runPipeline}
              pipelineRunning={pipelineRunning}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          )}
          {page === 'queue' && (
            <QueuePage key="queue" queue={queue} onVideoClick={setPreviewVideo} />
          )}
          {page === 'calendar' && (
            <CalendarPage key="calendar" queue={queue} onVideoClick={setPreviewVideo} />
          )}
          {page === 'agents' && (
            <AgentsPage key="agents" state={state} />
          )}
          {page === 'memory' && (
            <MemoryPage key="memory" memory={memory} />
          )}
          {page === 'settings' && (
            <SettingsPage key="settings" />
          )}
        </AnimatePresence>
      </div>

      <ChatSidebar
        onSend={sendToClaudeChat}
        collapsed={chatCollapsed}
        onCollapse={() => setChatCollapsed(v => !v)}
      />

      {previewVideo && (
        <VideoPreviewModal
          video={previewVideo}
          onClose={() => setPreviewVideo(null)}
          onRefresh={refresh}
        />
      )}
    </div>
  )
}
