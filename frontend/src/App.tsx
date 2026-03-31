import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Common/Sidebar'
import ResizablePanel from './components/Common/ResizablePanel'
import AgentPanel from './components/Chat/AgentPanel'
import ChatPage from './pages/ChatPage'
import DocumentsPage from './pages/DocumentsPage'
import ResumePage from './pages/ResumePage'
import InterviewPage from './pages/InterviewPage'
import MockInterviewPage from './pages/MockInterviewPage'
import SettingsPage from './pages/SettingsPage'
import { useChatStore } from './stores/chatStore'

function MainContent() {
  return (
    <Routes>
      <Route path="/" element={<ChatPage />} />
      <Route path="/documents" element={<DocumentsPage />} />
      <Route path="/resume" element={<ResumePage />} />
      <Route path="/interview" element={<InterviewPage />} />
      <Route path="/mock-interview" element={<MockInterviewPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  )
}

function ContentWithAgent() {
  const panelVisible = useChatStore(s => s.panelVisible)

  if (!panelVisible) {
    // 面板隐藏: 内容撑满 + 右侧只有一个展开按钮
    return (
      <div className="flex h-full">
        <main className="flex-1 overflow-hidden">
          <MainContent />
        </main>
        <AgentPanel />
      </div>
    )
  }

  // 面板展开: 可拖拽分割
  return (
    <ResizablePanel
      left={
        <main className="h-full overflow-hidden">
          <MainContent />
        </main>
      }
      right={<AgentPanel />}
      defaultLeftWidth={typeof window !== 'undefined' ? Math.max(window.innerWidth - 220 - 340, 500) : 700}
      minLeft={400}
      minRight={280}
    />
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="h-screen bg-gray-50">
        <ResizablePanel
          left={<Sidebar />}
          right={<ContentWithAgent />}
          defaultLeftWidth={220}
          minLeft={180}
          minRight={500}
        />
      </div>
    </BrowserRouter>
  )
}
