import { create } from 'zustand'
import { produce } from 'immer'
import { fetchSSE } from '../services/api'
import api from '../services/api'
import type { ResumeData, TemplateId, ThinkingMessage } from '../types/resume'

interface ResumeState {
  resumeData: ResumeData | null
  pendingResumeData: ResumeData | null  // Agent 提议的修改，待用户确认
  selectedTemplate: TemplateId
  isGenerating: boolean
  thinkingMessages: ThinkingMessage[]
  moduleOrder: string[]  // 简历模块顺序，Agent 修改后通过 SSE 实时更新

  setResumeData: (data: ResumeData) => void
  setPendingResumeData: (data: ResumeData | null) => void
  applyPendingData: () => void
  rejectPendingData: () => void
  updateResumeField: (path: string, value: unknown) => void
  setTemplate: (id: TemplateId) => void
  setModuleOrder: (order: string[]) => void
  updateModuleOrderInData: (order: string[]) => void  // 同时更新 moduleOrder 和 resumeData.module_order，触发预览刷新
  generateResume: (jobTitle: string, style: string) => Promise<void>
  exportResume: (format: string) => Promise<void>
  clearThinking: () => void
}

function setByPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split('.')
  let current: Record<string, unknown> = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    const idx = Number(key)
    if (!isNaN(idx)) {
      current = (current as unknown as unknown[])[idx] as Record<string, unknown>
    } else {
      current = current[key] as Record<string, unknown>
    }
  }
  const lastKey = keys[keys.length - 1]
  const lastIdx = Number(lastKey)
  if (!isNaN(lastIdx)) {
    (current as unknown as unknown[])[lastIdx] = value
  } else {
    current[lastKey] = value
  }
}

export const useResumeStore = create<ResumeState>((set, get) => ({
  resumeData: null,
  pendingResumeData: null,
  selectedTemplate: 'professional',
  isGenerating: false,
  thinkingMessages: [],
  moduleOrder: ['personal', 'summary', 'work_experience', 'education', 'projects', 'skills', 'certifications'],

  setResumeData: (data: ResumeData) => set({ resumeData: data }),

  setPendingResumeData: (data: ResumeData | null) => set({ pendingResumeData: data }),

  applyPendingData: () => {
    const pending = get().pendingResumeData
    if (pending) {
      set({ resumeData: pending, pendingResumeData: null })
    }
  },

  rejectPendingData: () => set({ pendingResumeData: null }),

  updateResumeField: (path: string, value: unknown) => set(
    produce((state: ResumeState) => {
      if (state.resumeData) {
        setByPath(state.resumeData as unknown as Record<string, unknown>, path, value)
      }
    })
  ),

  setTemplate: (id: TemplateId) => set({ selectedTemplate: id }),

  setModuleOrder: (order: string[]) => set({ moduleOrder: order }),

  updateModuleOrderInData: (order: string[]) => set(produce((state: ResumeState) => {
    state.moduleOrder = order
    // 同步写入 resumeData 中的 module_order，让模板能够感知顺序变化
    if (state.resumeData) {
      state.resumeData.module_order = order
    }
    if (state.pendingResumeData) {
      state.pendingResumeData.module_order = order
    }
  })),

  generateResume: async (jobTitle: string, style: string) => {
    set({ isGenerating: true, resumeData: null, pendingResumeData: null, thinkingMessages: [] })
    try {
      await fetchSSE('/resume/generate', { job_title: jobTitle, style }, (event) => {
        if (event.type === 'thinking' && typeof event.content === 'string') {
          set(s => ({
            thinkingMessages: [...s.thinkingMessages, {
              id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              content: event.content as string,
              timestamp: Date.now(),
            }],
          }))
        } else if (event.type === 'resume_data' && (event as unknown as { data?: ResumeData }).data) {
          // 从「AI 生成简历」按钮触发的生成直接应用（不需要确认）
          set({ resumeData: (event as unknown as { data: ResumeData }).data })
        }
      })
    } finally {
      set({ isGenerating: false })
    }
  },

  exportResume: async (format: string) => {
    const { resumeData, selectedTemplate } = get()
    if (!resumeData) return

    const res = await api.post('/resume/export', {
      format,
      template: selectedTemplate,
      resume_data: resumeData,
    }, { responseType: 'blob' })

    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `resume.${format}`
    a.click()
    URL.revokeObjectURL(url)
  },

  clearThinking: () => set({ thinkingMessages: [] }),
}))
