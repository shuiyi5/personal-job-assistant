/* JD Store - 公司/岗位/JD/简历状态管理 */

import { create } from 'zustand'
import api from '../services/api'

// ── 类型定义 ──────────────────────────────────────

export interface Company {
  id: string
  name: string
  city?: string
  industry?: string
  description?: string
  website?: string
  position_count: number
  job_count: number
  resume_count: number
}

export interface Position {
  id: string
  company_id: string
  name: string
  job_count: number
  resume_count: number
}

export interface JDData {
  id: string
  position_id: string
  raw_text: string
  salary_range?: string
  location?: string
  skills: string[]
  requirements: string[]
  plus_points: string[]
  parsed_at?: string
}

export interface JdResume {
  id: string
  jd_id: string
  resume_data: ResumeData
  created_at: string
  updated_at: string
}

export interface FitAnalysis {
  overall_score: number
  overall_comment: string
  matched: string[]
  missing: string[]
  suggestions: string[]
}

export interface GenerateStep {
  step: number
  status: 'thinking' | 'searching' | 'done'
  message: string
}

// ── Store ──────────────────────────────────────

interface JDState {
  // 数据
  companies: Company[]
  positions: Position[]
  jobs: JDData[]
  resumes: JdResume[]

  // 选中状态
  selectedCompanyId: string | null
  selectedPositionId: string | null
  selectedJobId: string | null

  // 编辑模式
  resumeEditMode: 'panel' | 'newtab'

  // 加载状态
  loading: boolean

  // Actions - 公司
  fetchCompanies: () => Promise<void>
  createCompany: (data: Partial<Company>) => Promise<Company>
  updateCompany: (id: string, data: Partial<Company>) => Promise<void>
  deleteCompany: (id: string) => Promise<void>

  // Actions - 岗位
  fetchPositions: (companyId?: string) => Promise<void>
  createPosition: (companyId: string, name: string) => Promise<Position>
  updatePosition: (id: string, data: Partial<Position>) => Promise<void>
  deletePosition: (id: string) => Promise<void>

  // Actions - JD
  fetchJobs: (positionId?: string) => Promise<void>
  createJob: (positionId: string, data: Partial<JDData>) => Promise<JDData>
  createJobFull: (data: {
    company_name: string
    company_city?: string
    company_industry?: string
    position_name: string
    raw_text: string
    salary_range?: string
    location?: string
    skills?: string[]
    requirements?: string[]
    plus_points?: string[]
  }) => Promise<JDData>
  updateJob: (id: string, data: Partial<JDData>) => Promise<void>
  deleteJob: (id: string) => Promise<void>
  parseJD: (rawText: string) => Promise<JDData>
  selectJob: (jobId: string) => void

  // Actions - 简历
  fetchResumes: (jdId: string) => Promise<void>
  createResume: (jdId: string, resumeData: ResumeData) => Promise<JdResume>
  updateResume: (id: string, resumeData: ResumeData) => Promise<void>
  deleteResume: (id: string) => Promise<void>
  analyzeFit: (jdId: string, resumeData: ResumeData) => Promise<FitAnalysis>
  generateResume: (
    jdId: string,
    resumeData?: ResumeData,
    onStep?: (step: GenerateStep) => void,
    onThinking?: (content: string) => void,
    onResumeData?: (data: ResumeData) => void,
  ) => Promise<void>

  // 设置
  fetchSettings: () => Promise<void>
}

interface ResumeData {
  personal: {
    name: string
    phone?: string
    email?: string
    location?: string
    website?: string
    linkedin?: string
    github?: string
    avatar_url?: string
    title?: string
  }
  summary?: string
  work_experience: Array<{
    company: string
    title: string
    location?: string
    start_date: string
    end_date: string
    highlights: string[]
  }>
  education: Array<{
    institution: string
    degree: string
    field: string
    start_date: string
    end_date: string
    gpa?: string
    highlights: string[]
  }>
  skills: Array<{ category: string; items: string[] }>
  projects: Array<{
    name: string
    role?: string
    start_date?: string
    end_date?: string
    description: string
    highlights: string[]
    tech_stack: string[]
  }>
  certifications: Array<{
    name: string
    issuer?: string
    date?: string
    url?: string
  }>
  module_order?: string[]
}

export const useJDStore = create<JDState>((set, get) => ({
  companies: [],
  positions: [],
  jobs: [],
  resumes: [],
  selectedCompanyId: null,
  selectedPositionId: null,
  selectedJobId: null,
  resumeEditMode: 'panel',
  loading: false,

  // ── 公司 ──────────────────────────────────────

  fetchCompanies: async () => {
    set({ loading: true })
    try {
      const res = await api.get('/jd/companies')
      set({ companies: res.data })
    } finally {
      set({ loading: false })
    }
  },

  createCompany: async (data) => {
    const res = await api.post('/jd/companies', data)
    const company = res.data
    set(st => ({ companies: [...st.companies, company] }))
    return company
  },

  updateCompany: async (id, data) => {
    await api.put(`/jd/companies/${id}`, data)
    set(st => ({
      companies: st.companies.map(c => c.id === id ? { ...c, ...data } : c),
    }))
  },

  deleteCompany: async (id) => {
    await api.delete(`/jd/companies/${id}`)
    set(st => ({
      companies: st.companies.filter(c => c.id !== id),
      positions: st.positions.filter(p => p.company_id !== id),
      selectedCompanyId: st.selectedCompanyId === id ? null : st.selectedCompanyId,
    }))
    get().fetchCompanies()
  },

  // ── 岗位 ──────────────────────────────────────

  fetchPositions: async (companyId) => {
    const params = companyId ? { params: { company_id: companyId } } : {}
    const res = await api.get('/jd/positions', params)
    set({ positions: res.data })
  },

  createPosition: async (companyId, name) => {
    const res = await api.post('/jd/positions', { company_id: companyId, name })
    const position = res.data
    set(st => ({ positions: [...st.positions, position] }))
    get().fetchCompanies()
    return position
  },

  updatePosition: async (id, data) => {
    await api.put(`/jd/positions/${id}`, data)
    set(st => ({
      positions: st.positions.map(p => p.id === id ? { ...p, ...data } : p),
    }))
  },

  deletePosition: async (id) => {
    await api.delete(`/jd/positions/${id}`)
    set(st => ({
      positions: st.positions.filter(p => p.id !== id),
      selectedPositionId: st.selectedPositionId === id ? null : st.selectedPositionId,
    }))
    get().fetchCompanies()
  },

  // ── JD ──────────────────────────────────────

  fetchJobs: async (positionId) => {
    const params = positionId ? { params: { position_id: positionId } } : {}
    const res = await api.get('/jd/jobs', params)
    set({ jobs: res.data })
    return res.data
  },

  createJob: async (positionId, data) => {
    const res = await api.post('/jd/jobs', { position_id: positionId, ...data })
    const job = res.data
    set(st => ({ jobs: [...st.jobs, job] }))
    get().fetchCompanies()
    return job
  },

  createJobFull: async (data: {
    company_name: string
    company_city?: string
    company_industry?: string
    position_name: string
    raw_text: string
    salary_range?: string
    location?: string
    skills?: string[]
    requirements?: string[]
    plus_points?: string[]
  }) => {
    const res = await api.post('/jd/jobs/full', data)
    const job = res.data
    set(st => ({ jobs: [...st.jobs, job] }))
    // 刷新数据确保一致性
    await get().fetchCompanies()
    await get().fetchPositions()
    await get().fetchJobs()
    // 确保新 job 在列表中
    const state = get()
    if (!state.jobs.find(j => j.id === job.id)) {
      set(st => ({ jobs: [...st.jobs, job] }))
    }
    return job
  },

  updateJob: async (id, data) => {
    await api.put(`/jd/jobs/${id}`, data)
    set(st => ({
      jobs: st.jobs.map(j => j.id === id ? { ...j, ...data } : j),
    }))
  },

  deleteJob: async (id) => {
    await api.delete(`/jd/jobs/${id}`)
    set(st => ({
      jobs: st.jobs.filter(j => j.id !== id),
      resumes: st.resumes.filter(r => r.jd_id !== id),
      selectedJobId: st.selectedJobId === id ? null : st.selectedJobId,
    }))
    get().fetchCompanies()
  },

  parseJD: async (rawText) => {
    const res = await api.post('/jd/jobs/parse', { raw_text: rawText })
    return res.data
  },

  selectJob: (jobId) => {
    set({ selectedJobId: jobId, selectedPositionId: null })
    get().fetchResumes(jobId)
  },

  // ── 简历 ──────────────────────────────────────

  fetchResumes: async (jdId) => {
    const res = await api.get(`/jd/jobs/${jdId}/resumes`)
    set(st => ({
      resumes: [...st.resumes.filter(r => r.jd_id !== jdId), ...res.data],
    }))
  },

  createResume: async (jdId, resumeData) => {
    console.log('createResume called:', { jdId, resumeData })
    const res = await api.post(`/jd/jobs/${jdId}/resumes`, { resume_data: resumeData })
    console.log('createResume response:', res.data)
    const resume = res.data
    set(st => ({ resumes: [...st.resumes, resume] }))
    get().fetchCompanies()
    return resume
  },

  updateResume: async (id, resumeData) => {
    await api.put(`/jd/resumes/${id}`, { resume_data: resumeData })
    set(st => ({
      resumes: st.resumes.map(r => r.id === id ? { ...r, resume_data: resumeData, updated_at: new Date().toISOString() } : r),
    }))
  },

  deleteResume: async (id) => {
    await api.delete(`/jd/resumes/${id}`)
    set(st => ({ resumes: st.resumes.filter(r => r.id !== id) }))
    get().fetchCompanies()
  },

  analyzeFit: async (jdId, resumeData) => {
    const res = await api.post(`/jd/jobs/${jdId}/analyze`, { resume_data: resumeData })
    return res.data
  },

  generateResume: async (jdId, resumeData, onStep, onThinking, onResumeData) => {
    let lastError = null

    const response = await fetch('/api/jd/jobs/' + jdId + '/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_data: resumeData }),
      signal: AbortSignal.timeout(120000), // 2分钟超时
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status}: ${text}`)
    }

    if (!response.body) throw new Error('No response body')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const event = JSON.parse(line.slice(6))
          if (event.type === 'step' && onStep) {
            onStep(event)
          } else if (event.type === 'thinking' && onThinking) {
            onThinking(event.content)
          } else if (event.type === 'resume_data' && onResumeData && event.data) {
            onResumeData(event.data)
          } else if (event.type === 'error' && event.message) {
            lastError = event.message
          }
        } catch { /* skip invalid JSON */ }
      }
    }

    if (lastError) {
      throw new Error(lastError)
    }
  },

  // ── 设置 ──────────────────────────────────────

  fetchSettings: async () => {
    const res = await api.get('/settings')
    set({ resumeEditMode: res.data.resume_edit_mode || 'panel' })
  },
}))