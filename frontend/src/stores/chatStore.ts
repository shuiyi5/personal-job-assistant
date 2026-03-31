import { create } from 'zustand'
import { fetchSSE } from '../services/api'
import api from '../services/api'
import type { ResumeData } from '../types/resume'

export interface ToolCall {
  tool: string
  status: 'running' | 'done' | 'error'
  input?: Record<string, unknown>
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  toolCalls?: ToolCall[]
  files?: { name: string; type: string }[]
}

export type PageContext = 'chat' | 'documents' | 'resume' | 'interview' | 'mock_interview'

const PAGE_CONTEXT_HINTS: Record<PageContext, string> = {
  chat: '',
  documents: '[用户当前在文档管理页] ',
  resume: '[用户当前在简历编辑页] ',
  interview: '[用户当前在面试准备页] ',
  mock_interview: '[用户当前在模拟面试页] ',
}

export interface Session {
  id: string
  title: string
  messages: Message[]
  createdAt: number
}

interface ChatState {
  sessions: Session[]
  activeSessionId: string
  isLoading: boolean
  pageContext: PageContext
  panelVisible: boolean

  // Actions
  setPageContext: (ctx: PageContext) => void
  setPanelVisible: (v: boolean) => void
  createSession: () => string
  switchSession: (id: string) => void
  deleteSession: (id: string) => void
  renameSession: (id: string, title: string) => void
  sendMessage: (text: string, files?: File[]) => Promise<void>
  clearCurrentSession: () => void

  // Getters
  currentMessages: () => Message[]
}

let sessionCounter = 1

function makeSession(): Session {
  const id = `s_${Date.now()}_${sessionCounter++}`
  return { id, title: `对话 ${sessionCounter - 1}`, messages: [], createdAt: Date.now() }
}

const initialSession = makeSession()

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [initialSession],
  activeSessionId: initialSession.id,
  isLoading: false,
  pageContext: 'chat',
  panelVisible: true,

  setPageContext: (ctx) => set({ pageContext: ctx }),
  setPanelVisible: (v) => set({ panelVisible: v }),

  createSession: () => {
    const s = makeSession()
    set(st => ({ sessions: [...st.sessions, s], activeSessionId: s.id }))
    return s.id
  },

  switchSession: (id) => {
    if (get().sessions.some(s => s.id === id)) {
      set({ activeSessionId: id })
    }
  },

  deleteSession: (id) => {
    const { sessions, activeSessionId } = get()
    if (sessions.length <= 1) return // 至少保留一个
    const next = sessions.filter(s => s.id !== id)
    const newActive = id === activeSessionId ? next[next.length - 1].id : activeSessionId
    set({ sessions: next, activeSessionId: newActive })
  },

  renameSession: (id, title) => {
    set(st => ({
      sessions: st.sessions.map(s => s.id === id ? { ...s, title } : s),
    }))
  },

  currentMessages: () => {
    const { sessions, activeSessionId } = get()
    return sessions.find(s => s.id === activeSessionId)?.messages || []
  },

  clearCurrentSession: () => {
    set(st => ({
      sessions: st.sessions.map(s =>
        s.id === st.activeSessionId ? { ...s, messages: [] } : s
      ),
    }))
  },

  sendMessage: async (text: string, files?: File[]) => {
    const uploadedFiles: { name: string; type: string }[] = []
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const form = new FormData()
          form.append('file', file)
          form.append('doc_type', 'general')
          await api.post('/documents/upload', form)
          uploadedFiles.push({ name: file.name, type: file.type })
        } catch { /* skip */ }
      }
    }

    const displayText = uploadedFiles.length > 0
      ? `${text}\n\n[已上传 ${uploadedFiles.map(f => f.name).join(', ')}]`
      : text

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: displayText,
      timestamp: Date.now(),
      files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    }

    const assistantMsg: Message = {
      id: `a_${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      toolCalls: [],
    }

    // 更新会话 + 自动命名
    set(st => ({
      isLoading: true,
      sessions: st.sessions.map(s => {
        if (s.id !== st.activeSessionId) return s
        const updated = { ...s, messages: [...s.messages, userMsg, assistantMsg] }
        if (s.messages.length === 0) {
          updated.title = text.slice(0, 20) + (text.length > 20 ? '...' : '')
        }
        return updated
      }),
    }))

    const ctx = get().pageContext
    const hint = PAGE_CONTEXT_HINTS[ctx] || ''
    const messageWithContext = hint + text

    const currentSession = get().sessions.find(s => s.id === get().activeSessionId)
    const history = (currentSession?.messages || []).slice(0, -1).filter(m => !m.files).map(m => ({
      role: m.role,
      content: m.content,
    }))

    // 在简历页面时附带当前简历数据供 Agent 修改
    let extraBody: Record<string, unknown> = {}
    if (ctx === 'resume') {
      try {
        const { useResumeStore } = await import('./resumeStore')
        const resumeData = useResumeStore.getState().resumeData
        if (resumeData) {
          extraBody = { resume_data: resumeData }
        }
      } catch { /* ignore */ }
    }

    const sessionId = get().activeSessionId

    try {
      await fetchSSE('/chat', { message: messageWithContext, history, ...extraBody }, (event) => {
        // 跨 store 更新: Agent 返回 resume_data 事件时设为待确认数据（预览 → 确认）
        if (event.type === 'resume_data' && (event as unknown as { data?: ResumeData }).data) {
          import('./resumeStore').then(({ useResumeStore }) => {
            useResumeStore.getState().setPendingResumeData((event as unknown as { data: ResumeData }).data)
          }).catch(() => {})
        }
        set(st => ({
          sessions: st.sessions.map(s => {
            if (s.id !== sessionId) return s
            const msgs = [...s.messages]
            const last = msgs[msgs.length - 1]
            if (!last || last.role !== 'assistant') return s

            if (event.type === 'text' && event.content) {
              msgs[msgs.length - 1] = { ...last, content: last.content + event.content }
            } else if (event.type === 'tool_start') {
              const calls = [...(last.toolCalls || [])]
              calls.push({ tool: event.tool || '', status: 'running', input: event.input as Record<string, unknown> })
              msgs[msgs.length - 1] = { ...last, toolCalls: calls }
            } else if (event.type === 'tool_result') {
              const calls = [...(last.toolCalls || [])]
              const idx = calls.findLastIndex(c => c.tool === event.tool && c.status === 'running')
              if (idx >= 0) calls[idx] = { ...calls[idx], status: 'done' }
              msgs[msgs.length - 1] = { ...last, toolCalls: calls }
            } else if (event.type === 'tool_error') {
              const calls = [...(last.toolCalls || [])]
              const idx = calls.findLastIndex(c => c.tool === event.tool && c.status === 'running')
              if (idx >= 0) calls[idx] = { ...calls[idx], status: 'error' }
              msgs[msgs.length - 1] = { ...last, toolCalls: calls }
            }
            return { ...s, messages: msgs }
          }),
        }))
      })
    } catch {
      set(st => ({
        sessions: st.sessions.map(s => {
          if (s.id !== sessionId) return s
          const msgs = [...s.messages]
          const last = msgs[msgs.length - 1]
          if (last?.role === 'assistant' && !last.content) {
            msgs[msgs.length - 1] = { ...last, content: '请求失败，请重试。' }
          }
          return { ...s, messages: msgs }
        }),
      }))
    } finally {
      set({ isLoading: false })
    }
  },
}))
