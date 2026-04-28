import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '../stores/chatStore'
import { useJDStore, JdResume } from '../stores/jdStore'

// ResumeData type - mirrors jdStore ResumeData
type ResumeData = {
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
import CompanyTree from '../components/JD/CompanyTree'
import JDDetail from '../components/JD/JDDetail'
import JDResumeList from '../components/JD/JDResumeList'
import { Plus, X, Sparkles, Loader2 } from 'lucide-react'

export default function JDManagerPage() {
  const setPageContext = useChatStore(s => s.setPageContext as (ctx: string) => void)
  const {
    jobs,
    selectedJobId,
    resumeEditMode,
    fetchCompanies,
    fetchPositions,
    createJobFull,
    updateJob,
    deleteJob,
    parseJD,
    fetchSettings,
  } = useJDStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingResume, setEditingResume] = useState<JdResume | null>(null)
  const [editForm, setEditForm] = useState<ResumeData | null>(null)
  const [isSavingResume, setIsSavingResume] = useState(false)
  const navigate = useNavigate()

  // 当选中简历时，初始化编辑表单
  useEffect(() => {
    if (editingResume) {
      setEditForm(JSON.parse(JSON.stringify(editingResume.resume_data)))
    } else {
      setEditForm(null)
    }
  }, [editingResume])

  // 在面板中编辑 → 直接跳转到简历编辑页
  const handleEditResumeInPage = (resume: JdResume) => {
    // 将简历数据设置到 resumeStore 的待确认数据
    import('../stores/resumeStore').then(({ useResumeStore }) => {
      useResumeStore.getState().setPendingResumeData(resume.resume_data as any)
    })
    // 导航到简历编辑页
    navigate(`/resume?from=jd&jd_id=${resume.jd_id}&resume_id=${resume.id}`)
  }

  const handleSaveResume = async () => {
    if (!editingResume || !editForm) return
    setIsSavingResume(true)
    try {
      await useJDStore.getState().updateResume(editingResume.id, editForm)
      setEditingResume(null)
    } finally {
      setIsSavingResume(false)
    }
  }

  const handleCancelResume = () => {
    setEditingResume(null)
    setEditForm(null)
  }

  // Create JD form state
  const [formData, setFormData] = useState({
    company_name: '',
    company_city: '',
    company_industry: '',
    position_name: '',
    raw_text: '',
    salary_range: '',
    location: '',
  })
  const [isParsing, setIsParsing] = useState(false)
  const [parsedFields, setParsedFields] = useState<{
    skills: string[]
    requirements: string[]
    plus_points: string[]
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setPageContext('jd' as never)
    fetchCompanies()
    fetchPositions()
    fetchSettings()
  }, [])

  const selectedJob = jobs.find(j => j.id === selectedJobId)

  const handleParse = async () => {
    if (!formData.raw_text.trim()) return
    setIsParsing(true)
    try {
      const parsed = await parseJD(formData.raw_text)
      setParsedFields({
        skills: parsed.skills || [],
        requirements: parsed.requirements || [],
        plus_points: parsed.plus_points || [],
      })
      setFormData(prev => ({
        ...prev,
        salary_range: parsed.salary_range || prev.salary_range,
        location: parsed.location || prev.location,
      }))
    } finally {
      setIsParsing(false)
    }
  }

  const handleSave = async () => {
    if (!formData.company_name.trim() || !formData.position_name.trim()) {
      alert('请填写公司和岗位名称')
      return
    }
    setIsSaving(true)
    try {
      await createJobFull({
        company_name: formData.company_name,
        company_city: formData.company_city || undefined,
        company_industry: formData.company_industry || undefined,
        position_name: formData.position_name,
        raw_text: formData.raw_text,
        salary_range: formData.salary_range || undefined,
        location: formData.location || undefined,
        skills: parsedFields?.skills,
        requirements: parsedFields?.requirements,
        plus_points: parsedFields?.plus_points,
      })
      setShowCreateModal(false)
      setFormData({
        company_name: '',
        company_city: '',
        company_industry: '',
        position_name: '',
        raw_text: '',
        salary_range: '',
        location: '',
      })
      setParsedFields(null)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditResume = (resume: JdResume) => {
    if (resumeEditMode === 'panel') {
      // 在面板中编辑 → 跳转到简历编辑页
      handleEditResumeInPage(resume)
    } else {
      // 在新标签页打开 → 保持原有逻辑
      setEditingResume(resume)
    }
  }

  return (
    <div className="h-full flex">
      {/* 左侧：公司/岗位树形列表 */}
      <div className="w-60 border-r bg-white flex flex-col">
        <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">JD 管理</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
            title="新建 JD"
          >
            <Plus size={18} />
          </button>
        </div>
        <CompanyTree
          onEditCompany={() => {}}
          onEditPosition={() => {}}
        />
      </div>

      {/* 中间：JD 内容 */}
      <div className="flex-1 bg-white">
        {selectedJob ? (
          <JDDetail
            key={selectedJob.id}
            job={selectedJob}
            onUpdate={updateJob}
            onDelete={deleteJob}
            onParse={parseJD}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-sm">请从左侧选择一个 JD</p>
              <p className="text-xs">或点击左上角 + 新建 JD</p>
            </div>
          </div>
        )}
      </div>

      {/* 右侧：简历列表 */}
      <div className="w-96 border-l bg-white">
        {selectedJob ? (
          <JDResumeList
            key={selectedJob.id}
            job={selectedJob}
            onEditResume={handleEditResume}
            editMode={resumeEditMode}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-sm">选中 JD 后</p>
              <p className="text-xs">可查看和管理简历</p>
            </div>
          </div>
        )}
      </div>

      {/* 简历编辑面板 */}
      {editingResume && editForm && (
        <div className="fixed inset-y-0 right-0 w-[600px] bg-white shadow-xl border-l z-50 flex flex-col">
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="font-medium text-gray-800">编辑简历</h3>
            <button
              onClick={handleCancelResume}
              className="p-1.5 text-gray-500 hover:bg-gray-200 rounded"
            >
              <X size={18} />
            </button>
          </div>

          {/* 内容 */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-6">

              {/* 基本信息 */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">基本信息</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">姓名</label>
                    <input
                      type="text"
                      value={editForm.personal?.name || ''}
                      onChange={e => setEditForm(prev => prev ? {
                        ...prev,
                        personal: { ...prev.personal, name: e.target.value }
                      } : prev)}
                      className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">职位标题</label>
                    <input
                      type="text"
                      value={editForm.personal?.title || ''}
                      onChange={e => setEditForm(prev => prev ? {
                        ...prev,
                        personal: { ...prev.personal, title: e.target.value }
                      } : prev)}
                      className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">邮箱</label>
                    <input
                      type="email"
                      value={editForm.personal?.email || ''}
                      onChange={e => setEditForm(prev => prev ? {
                        ...prev,
                        personal: { ...prev.personal, email: e.target.value }
                      } : prev)}
                      className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">电话</label>
                    <input
                      type="tel"
                      value={editForm.personal?.phone || ''}
                      onChange={e => setEditForm(prev => prev ? {
                        ...prev,
                        personal: { ...prev.personal, phone: e.target.value }
                      } : prev)}
                      className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">地点</label>
                    <input
                      type="text"
                      value={editForm.personal?.location || ''}
                      onChange={e => setEditForm(prev => prev ? {
                        ...prev,
                        personal: { ...prev.personal, location: e.target.value }
                      } : prev)}
                      className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 摘要 */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">摘要</h4>
                <textarea
                  value={editForm.summary || ''}
                  onChange={e => setEditForm(prev => prev ? { ...prev, summary: e.target.value } : prev)}
                  rows={3}
                  className="w-full px-3 py-1.5 text-sm border rounded-lg resize-none focus:ring-1 focus:ring-blue-500"
                  placeholder="个人简介摘要..."
                />
              </div>

              {/* 工作经历 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700 border-b pb-1 flex-1">工作经历</h4>
                  <button
                    onClick={() => setEditForm(prev => prev ? {
                      ...prev,
                      work_experience: [...prev.work_experience, { company: '', title: '', start_date: '', end_date: '', highlights: [''] }]
                    } : prev)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    + 添加
                  </button>
                </div>
                {editForm.work_experience.map((exp, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">#{i + 1}</span>
                      {editForm.work_experience.length > 1 && (
                        <button
                          onClick={() => setEditForm(prev => prev ? {
                            ...prev,
                            work_experience: prev.work_experience.filter((_, idx) => idx !== i)
                          } : prev)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          删除
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">公司</label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={e => setEditForm(prev => prev ? {
                            ...prev,
                            work_experience: prev.work_experience.map((item, idx) =>
                              idx === i ? { ...item, company: e.target.value } : item
                            )
                          } : prev)}
                          className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">职位</label>
                        <input
                          type="text"
                          value={exp.title}
                          onChange={e => setEditForm(prev => prev ? {
                            ...prev,
                            work_experience: prev.work_experience.map((item, idx) =>
                              idx === i ? { ...item, title: e.target.value } : item
                            )
                          } : prev)}
                          className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">开始时间</label>
                        <input
                          type="text"
                          value={exp.start_date}
                          onChange={e => setEditForm(prev => prev ? {
                            ...prev,
                            work_experience: prev.work_experience.map((item, idx) =>
                              idx === i ? { ...item, start_date: e.target.value } : item
                            )
                          } : prev)}
                          className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="2020-01"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">结束时间</label>
                        <input
                          type="text"
                          value={exp.end_date}
                          onChange={e => setEditForm(prev => prev ? {
                            ...prev,
                            work_experience: prev.work_experience.map((item, idx) =>
                              idx === i ? { ...item, end_date: e.target.value } : item
                            )
                          } : prev)}
                          className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="2024-01 或 至今"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">工作描述</label>
                      <div className="space-y-1">
                        {exp.highlights.map((highlight, hIdx) => (
                          <div key={hIdx} className="flex gap-1">
                            <span className="text-xs text-gray-400 mt-1.5">•</span>
                            <input
                              type="text"
                              value={highlight}
                              onChange={e => setEditForm(prev => prev ? {
                                ...prev,
                                work_experience: prev.work_experience.map((item, idx) =>
                                  idx === i ? {
                                    ...item,
                                    highlights: item.highlights.map((h, hId) => hId === hIdx ? e.target.value : h)
                                  } : item
                                )
                              } : prev)}
                              className="flex-1 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                            />
                            {exp.highlights.length > 1 && (
                              <button
                                onClick={() => setEditForm(prev => prev ? {
                                  ...prev,
                                  work_experience: prev.work_experience.map((item, idx) =>
                                    idx === i ? {
                                      ...item,
                                      highlights: item.highlights.filter((_, hId) => hId !== hIdx)
                                    } : item
                                  )
                                } : prev)}
                                className="text-xs text-red-400 hover:text-red-600 px-1"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => setEditForm(prev => prev ? {
                            ...prev,
                            work_experience: prev.work_experience.map((item, idx) =>
                              idx === i ? { ...item, highlights: [...item.highlights, ''] } : item
                            )
                          } : prev)}
                          className="text-xs text-blue-500 hover:text-blue-700 mt-1"
                        >
                          + 添加要点
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 教育背景 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700 border-b pb-1 flex-1">教育背景</h4>
                  <button
                    onClick={() => setEditForm(prev => prev ? {
                      ...prev,
                      education: [...prev.education, { institution: '', degree: '', field: '', start_date: '', end_date: '', highlights: [''] }]
                    } : prev)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    + 添加
                  </button>
                </div>
                {editForm.education.map((edu, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">#{i + 1}</span>
                      {editForm.education.length > 1 && (
                        <button
                          onClick={() => setEditForm(prev => prev ? {
                            ...prev,
                            education: prev.education.filter((_, idx) => idx !== i)
                          } : prev)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          删除
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">学校</label>
                        <input
                          type="text"
                          value={edu.institution}
                          onChange={e => setEditForm(prev => prev ? {
                            ...prev,
                            education: prev.education.map((item, idx) =>
                              idx === i ? { ...item, institution: e.target.value } : item
                            )
                          } : prev)}
                          className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">学位</label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={e => setEditForm(prev => prev ? {
                            ...prev,
                            education: prev.education.map((item, idx) =>
                              idx === i ? { ...item, degree: e.target.value } : item
                            )
                          } : prev)}
                          className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="本科、硕士等"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">专业</label>
                        <input
                          type="text"
                          value={edu.field}
                          onChange={e => setEditForm(prev => prev ? {
                            ...prev,
                            education: prev.education.map((item, idx) =>
                              idx === i ? { ...item, field: e.target.value } : item
                            )
                          } : prev)}
                          className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">GPA</label>
                        <input
                          type="text"
                          value={edu.gpa || ''}
                          onChange={e => setEditForm(prev => prev ? {
                            ...prev,
                            education: prev.education.map((item, idx) =>
                              idx === i ? { ...item, gpa: e.target.value } : item
                            )
                          } : prev)}
                          className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">开始时间</label>
                        <input
                          type="text"
                          value={edu.start_date}
                          onChange={e => setEditForm(prev => prev ? {
                            ...prev,
                            education: prev.education.map((item, idx) =>
                              idx === i ? { ...item, start_date: e.target.value } : item
                            )
                          } : prev)}
                          className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="2016-09"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">结束时间</label>
                        <input
                          type="text"
                          value={edu.end_date}
                          onChange={e => setEditForm(prev => prev ? {
                            ...prev,
                            education: prev.education.map((item, idx) =>
                              idx === i ? { ...item, end_date: e.target.value } : item
                            )
                          } : prev)}
                          className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="2020-06"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 技能 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700 border-b pb-1 flex-1">技能</h4>
                  <button
                    onClick={() => setEditForm(prev => prev ? {
                      ...prev,
                      skills: [...prev.skills, { category: '', items: [''] }]
                    } : prev)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    + 添加分类
                  </button>
                </div>
                {editForm.skills.map((skill, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={skill.category}
                        onChange={e => setEditForm(prev => prev ? {
                          ...prev,
                          skills: prev.skills.map((item, idx) =>
                            idx === i ? { ...item, category: e.target.value } : item
                          )
                        } : prev)}
                        className="px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                        placeholder="技能分类（如：编程语言）"
                      />
                      {editForm.skills.length > 1 && (
                        <button
                          onClick={() => setEditForm(prev => prev ? {
                            ...prev,
                            skills: prev.skills.filter((_, idx) => idx !== i)
                          } : prev)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          删除
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {skill.items.map((item, hIdx) => (
                        <div key={hIdx} className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border">
                          <input
                            type="text"
                            value={item}
                            onChange={e => setEditForm(prev => prev ? {
                              ...prev,
                              skills: prev.skills.map((s, sIdx) =>
                                sIdx === i ? {
                                  ...s,
                                  items: s.items.map((it, itIdx) => itIdx === hIdx ? e.target.value : it)
                                } : s
                              )
                            } : prev)}
                            className="w-20 text-xs border-0 focus:ring-0 p-0"
                          />
                          {skill.items.length > 1 && (
                            <button
                              onClick={() => setEditForm(prev => prev ? {
                                ...prev,
                                skills: prev.skills.map((s, sIdx) =>
                                  sIdx === i ? {
                                    ...s,
                                    items: s.items.filter((_, itIdx) => itIdx !== hIdx)
                                  } : s
                                )
                              } : prev)}
                              className="text-gray-400 hover:text-red-500 text-xs"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => setEditForm(prev => prev ? {
                          ...prev,
                          skills: prev.skills.map((s, sIdx) =>
                            sIdx === i ? { ...s, items: [...s.items, ''] } : s
                          )
                        } : prev)}
                        className="text-xs text-blue-500 hover:text-blue-700 px-1"
                      >
                        + 添加
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 项目 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700 border-b pb-1 flex-1">项目经历</h4>
                  <button
                    onClick={() => setEditForm(prev => prev ? {
                      ...prev,
                      projects: [...(prev.projects || []), { name: '', description: '', highlights: [''], tech_stack: [''] }]
                    } : prev)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    + 添加
                  </button>
                </div>
                {(editForm.projects || []).map((proj, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">#{i + 1}</span>
                      {editForm.projects && editForm.projects.length > 1 && (
                        <button
                          onClick={() => setEditForm(prev => prev ? {
                            ...prev,
                            projects: prev.projects?.filter((_, idx) => idx !== i)
                          } : prev)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          删除
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">项目名称</label>
                        <input
                          type="text"
                          value={proj.name}
                          onChange={e => setEditForm(prev => prev ? {
                            ...prev,
                            projects: prev.projects?.map((item, idx) =>
                              idx === i ? { ...item, name: e.target.value } : item
                            )
                          } : prev)}
                          className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">角色</label>
                        <input
                          type="text"
                          value={proj.role || ''}
                          onChange={e => setEditForm(prev => prev ? {
                            ...prev,
                            projects: prev.projects?.map((item, idx) =>
                              idx === i ? { ...item, role: e.target.value } : item
                            )
                          } : prev)}
                          className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">描述</label>
                      <textarea
                        value={proj.description}
                        onChange={e => setEditForm(prev => prev ? {
                          ...prev,
                          projects: prev.projects?.map((item, idx) =>
                            idx === i ? { ...item, description: e.target.value } : item
                          )
                        } : prev)}
                        rows={2}
                        className="w-full px-2 py-1 text-xs border rounded resize-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">技术栈</label>
                      <div className="flex flex-wrap gap-1">
                        {proj.tech_stack.map((tech, tIdx) => (
                          <div key={tIdx} className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border">
                            <input
                              type="text"
                              value={tech}
                              onChange={e => setEditForm(prev => prev ? {
                                ...prev,
                                projects: prev.projects?.map((p, pIdx) =>
                                  pIdx === i ? {
                                    ...p,
                                    tech_stack: p.tech_stack.map((t, tIdx) => tIdx === tIdx ? e.target.value : t)
                                  } : p
                                )
                              } : prev)}
                              className="w-16 text-xs border-0 focus:ring-0 p-0"
                            />
                            {proj.tech_stack.length > 1 && (
                              <button
                                onClick={() => setEditForm(prev => prev ? {
                                  ...prev,
                                  projects: prev.projects?.map((p, pIdx) =>
                                    pIdx === i ? {
                                      ...p,
                                      tech_stack: p.tech_stack.filter((_, tIdx) => tIdx !== tIdx)
                                    } : p
                                  )
                                } : prev)}
                                className="text-gray-400 hover:text-red-500 text-xs"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => setEditForm(prev => prev ? {
                            ...prev,
                            projects: prev.projects?.map((p, pIdx) =>
                              pIdx === i ? { ...p, tech_stack: [...p.tech_stack, ''] } : p
                            )
                          } : prev)}
                          className="text-xs text-blue-500 hover:text-blue-700 px-1"
                        >
                          + 添加
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 证书 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700 border-b pb-1 flex-1">证书</h4>
                  <button
                    onClick={() => setEditForm(prev => prev ? {
                      ...prev,
                      certifications: [...(prev.certifications || []), { name: '', issuer: '', date: '' }]
                    } : prev)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    + 添加
                  </button>
                </div>
                {(editForm.certifications || []).map((cert, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">#{i + 1}</span>
                      {editForm.certifications && editForm.certifications.length > 1 && (
                        <button
                          onClick={() => setEditForm(prev => prev ? {
                            ...prev,
                            certifications: prev.certifications?.filter((_, idx) => idx !== i)
                          } : prev)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          删除
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">证书名称</label>
                        <input
                          type="text"
                          value={cert.name}
                          onChange={e => setEditForm(prev => prev ? {
                            ...prev,
                            certifications: prev.certifications?.map((item, idx) =>
                              idx === i ? { ...item, name: e.target.value } : item
                            )
                          } : prev)}
                          className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">颁发日期</label>
                        <input
                          type="text"
                          value={cert.date || ''}
                          onChange={e => setEditForm(prev => prev ? {
                            ...prev,
                            certifications: prev.certifications?.map((item, idx) =>
                              idx === i ? { ...item, date: e.target.value } : item
                            )
                          } : prev)}
                          className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="2023-01"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-xs text-gray-500 mb-1 block">颁发机构</label>
                        <input
                          type="text"
                          value={cert.issuer || ''}
                          onChange={e => setEditForm(prev => prev ? {
                            ...prev,
                            certifications: prev.certifications?.map((item, idx) =>
                              idx === i ? { ...item, issuer: e.target.value } : item
                            )
                          } : prev)}
                          className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-end gap-3">
            <button
              onClick={handleCancelResume}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100"
            >
              取消
            </button>
            <button
              onClick={handleSaveResume}
              disabled={isSavingResume}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
            >
              {isSavingResume && <Loader2 size={14} className="animate-spin" />}
              保存
            </button>
          </div>
        </div>
      )}

      {/* 新建 JD 弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">新建 JD</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 公司信息 */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">公司信息</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">公司名称 *</label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={e => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="输入公司名称"
                      className="w-full px-3 py-2 text-sm border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">城市</label>
                    <input
                      type="text"
                      value={formData.company_city}
                      onChange={e => setFormData(prev => ({ ...prev, company_city: e.target.value }))}
                      placeholder="如：北京"
                      className="w-full px-3 py-2 text-sm border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">行业</label>
                    <input
                      type="text"
                      value={formData.company_industry}
                      onChange={e => setFormData(prev => ({ ...prev, company_industry: e.target.value }))}
                      placeholder="如：互联网"
                      className="w-full px-3 py-2 text-sm border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* 岗位信息 */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">岗位信息</label>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">岗位名称 *</label>
                  <input
                    type="text"
                    value={formData.position_name}
                    onChange={e => setFormData(prev => ({ ...prev, position_name: e.target.value }))}
                    placeholder="如：高级前端工程师"
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  />
                </div>
              </div>

              {/* JD 内容 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">职位描述</label>
                  <button
                    onClick={handleParse}
                    disabled={!formData.raw_text.trim() || isParsing}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 disabled:opacity-50"
                  >
                    {isParsing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    AI 解析
                  </button>
                </div>
                <textarea
                  value={formData.raw_text}
                  onChange={e => setFormData(prev => ({ ...prev, raw_text: e.target.value }))}
                  placeholder="粘贴职位描述内容..."
                  className="w-full px-3 py-2 text-sm border rounded-lg h-40 resize-none"
                />

                {/* 解析后的结构化数据 */}
                {parsedFields && (
                  <div className="bg-purple-50 rounded-lg p-4 space-y-3">
                    <div className="text-xs font-medium text-purple-600">AI 解析结果</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">薪资范围</label>
                        <input
                          type="text"
                          value={formData.salary_range}
                          onChange={e => setFormData(prev => ({ ...prev, salary_range: e.target.value }))}
                          placeholder="如：30k-50k"
                          className="w-full px-3 py-1.5 text-sm border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">工作地点</label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="如：北京"
                          className="w-full px-3 py-1.5 text-sm border rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">关键技能</label>
                      <div className="flex flex-wrap gap-1">
                        {parsedFields.skills.map((skill, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">{skill}</span>
                        ))}
                        {parsedFields.skills.length === 0 && <span className="text-xs text-gray-400">无</span>}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">任职要求</label>
                      <ul className="space-y-1">
                        {parsedFields.requirements.map((req, i) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                            <span className="text-gray-400">{i + 1}.</span>
                            {req}
                          </li>
                        ))}
                        {parsedFields.requirements.length === 0 && <li className="text-xs text-gray-400">无</li>}
                      </ul>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">加分项</label>
                      <div className="flex flex-wrap gap-1">
                        {parsedFields.plus_points.map((plus, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">+ {plus}</span>
                        ))}
                        {parsedFields.plus_points.length === 0 && <span className="text-xs text-gray-400">无</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !formData.company_name.trim() || !formData.position_name.trim()}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}