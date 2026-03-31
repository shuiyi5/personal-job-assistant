import { useState, useEffect, useCallback } from 'react'
import {
  ChevronDown, ChevronRight, Plus, Trash2, User, Briefcase,
  GraduationCap, Wrench, FolderOpen, Award, Code2
} from 'lucide-react'
import { useResumeStore } from '../../stores/resumeStore'
import { produce } from 'immer'
import type { ResumeData } from '../../types/resume'

// ── Section wrapper ─────────────────────────────────
function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Icon size={14} className="text-gray-400" />
        {title}
      </button>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  )
}

// ── Field with local state, commits on blur/enter ───
function Field({ label, value, onCommit, placeholder, multiline = false }: {
  label: string
  value: string
  onCommit: (v: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  const [local, setLocal] = useState(value)

  // Sync from external data when it changes (e.g. Agent updates)
  useEffect(() => { setLocal(value) }, [value])

  const commit = useCallback(() => {
    if (local !== value) onCommit(local)
  }, [local, value, onCommit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      commit();
      (e.target as HTMLElement).blur()
    }
  }, [commit, multiline])

  const cls = "w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
  return (
    <div>
      <label className="text-[10px] text-gray-400 mb-0.5 block">{label}</label>
      {multiline ? (
        <textarea
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={commit}
          placeholder={placeholder}
          rows={3}
          className={cls + " resize-none"}
        />
      ) : (
        <input
          type="text"
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  )
}

function HighlightsEditor({ items, onChange }: {
  items: string[]
  onChange: (items: string[]) => void
}) {
  return (
    <div>
      <label className="text-[10px] text-gray-400 mb-0.5 block">亮点/成就</label>
      {items.map((item, i) => (
        <HighlightItem
          key={i}
          value={item}
          onCommit={v => {
            const next = [...items]
            next[i] = v
            onChange(next)
          }}
          onRemove={() => onChange(items.filter((_, j) => j !== i))}
        />
      ))}
      <button
        onClick={() => onChange([...items, ''])}
        className="text-[10px] text-blue-500 hover:text-blue-600 flex items-center gap-1 mt-1"
      >
        <Plus size={10} /> 添加亮点
      </button>
    </div>
  )
}

function HighlightItem({ value, onCommit, onRemove }: {
  value: string
  onCommit: (v: string) => void
  onRemove: () => void
}) {
  const [local, setLocal] = useState(value)
  useEffect(() => { setLocal(value) }, [value])
  const commit = useCallback(() => {
    if (local !== value) onCommit(local)
  }, [local, value, onCommit])

  return (
    <div className="flex gap-1 mb-1">
      <span className="text-[10px] text-gray-300 mt-1.5">•</span>
      <input
        type="text"
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') { commit(); (e.target as HTMLElement).blur() } }}
        className="flex-1 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
        placeholder="使用 STAR 法则描述成就..."
      />
      <button
        onClick={onRemove}
        className="text-gray-300 hover:text-red-400 p-0.5"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

function TagsEditor({ label, items, onChange }: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
}) {
  const [input, setInput] = useState('')
  return (
    <div>
      <label className="text-[10px] text-gray-400 mb-0.5 block">{label}</label>
      <div className="flex flex-wrap gap-1 mb-1">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-0.5 bg-gray-100 text-xs px-1.5 py-0.5 rounded">
            {item}
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-gray-400 hover:text-red-400"
            >×</button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && input.trim()) {
            onChange([...items, input.trim()])
            setInput('')
          }
        }}
        placeholder="输入后回车添加..."
        className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    </div>
  )
}

const EMPTY_DATA: ResumeData = {
  personal: { name: '' },
  work_experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
}

// ── Main Editor ─────────────────────────────────────
export default function ResumeEditor() {
  const resumeData = useResumeStore(s => s.resumeData)
  const pendingResumeData = useResumeStore(s => s.pendingResumeData)
  const setResumeData = useResumeStore(s => s.setResumeData)
  const setPendingResumeData = useResumeStore(s => s.setPendingResumeData)
  const [jsonMode, setJsonMode] = useState(false)
  const [jsonText, setJsonText] = useState('')

  // Show pending data when available, otherwise current data
  const hasPending = pendingResumeData !== null
  const data: ResumeData = pendingResumeData || resumeData || EMPTY_DATA

  // When editing: update pending data if in pending mode, otherwise update resumeData
  const commitUpdate = useCallback((updater: (draft: ResumeData) => void) => {
    const updated = produce(data, updater)
    if (hasPending) {
      setPendingResumeData(updated)
    } else {
      setResumeData(updated)
    }
  }, [data, hasPending, setPendingResumeData, setResumeData])

  if (jsonMode) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-3 py-1.5 border-b bg-gray-50">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Code2 size={12} /> JSON 编辑模式
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => {
                try {
                  const parsed = JSON.parse(jsonText)
                  if (hasPending) {
                    setPendingResumeData(parsed)
                  } else {
                    setResumeData(parsed)
                  }
                  setJsonMode(false)
                } catch {
                  alert('JSON 格式错误')
                }
              }}
              className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded hover:bg-blue-600"
            >
              应用
            </button>
            <button
              onClick={() => setJsonMode(false)}
              className="text-[10px] text-gray-500 px-2 py-0.5 rounded hover:bg-gray-200"
            >
              取消
            </button>
          </div>
        </div>
        <textarea
          value={jsonText}
          onChange={e => setJsonText(e.target.value)}
          className="flex-1 p-3 text-xs font-mono resize-none focus:outline-none bg-gray-900 text-green-300"
          spellCheck={false}
        />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header with JSON toggle */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-gray-50 sticky top-0 z-10">
        <span className="text-xs text-gray-500">结构化编辑</span>
        <button
          onClick={() => {
            setJsonText(JSON.stringify(data, null, 2))
            setJsonMode(true)
          }}
          className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          <Code2 size={10} /> JSON
        </button>
      </div>

      {/* Personal Info */}
      <Section title="个人信息" icon={User}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="姓名" value={data.personal.name} onCommit={v => commitUpdate(d => { d.personal.name = v })} placeholder="张三" />
          <Field label="职位头衔" value={data.personal.title || ''} onCommit={v => commitUpdate(d => { d.personal.title = v })} placeholder="高级前端工程师" />
          <Field label="手机" value={data.personal.phone || ''} onCommit={v => commitUpdate(d => { d.personal.phone = v })} placeholder="138-xxxx-xxxx" />
          <Field label="邮箱" value={data.personal.email || ''} onCommit={v => commitUpdate(d => { d.personal.email = v })} placeholder="email@example.com" />
          <Field label="所在地" value={data.personal.location || ''} onCommit={v => commitUpdate(d => { d.personal.location = v })} placeholder="北京" />
          <Field label="个人网站" value={data.personal.website || ''} onCommit={v => commitUpdate(d => { d.personal.website = v })} placeholder="https://..." />
          <Field label="GitHub" value={data.personal.github || ''} onCommit={v => commitUpdate(d => { d.personal.github = v })} placeholder="github.com/username" />
          <Field label="LinkedIn" value={data.personal.linkedin || ''} onCommit={v => commitUpdate(d => { d.personal.linkedin = v })} placeholder="linkedin.com/in/..." />
        </div>
      </Section>

      {/* Summary */}
      <Section title="个人简介" icon={User} defaultOpen={false}>
        <Field
          label="专业摘要"
          value={data.summary || ''}
          onCommit={v => commitUpdate(d => { d.summary = v })}
          placeholder="简要描述你的专业背景、核心能力和职业目标..."
          multiline
        />
      </Section>

      {/* Work Experience */}
      <Section title="工作经历" icon={Briefcase}>
        {data.work_experience.map((exp, i) => (
          <div key={i} className="border rounded-lg p-2 mb-2 bg-white relative group">
            <button
              onClick={() => commitUpdate(d => { d.work_experience.splice(i, 1) })}
              className="absolute top-2 right-2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
            >
              <Trash2 size={13} />
            </button>
            <div className="grid grid-cols-2 gap-2">
              <Field label="公司" value={exp.company} onCommit={v => commitUpdate(d => { d.work_experience[i].company = v })} />
              <Field label="职位" value={exp.title} onCommit={v => commitUpdate(d => { d.work_experience[i].title = v })} />
              <Field label="开始日期" value={exp.start_date} onCommit={v => commitUpdate(d => { d.work_experience[i].start_date = v })} placeholder="2022.06" />
              <Field label="结束日期" value={exp.end_date} onCommit={v => commitUpdate(d => { d.work_experience[i].end_date = v })} placeholder="至今" />
              <div className="col-span-2">
                <Field label="地点" value={exp.location || ''} onCommit={v => commitUpdate(d => { d.work_experience[i].location = v })} placeholder="北京" />
              </div>
            </div>
            <div className="mt-2">
              <HighlightsEditor
                items={exp.highlights}
                onChange={v => commitUpdate(d => { d.work_experience[i].highlights = v })}
              />
            </div>
          </div>
        ))}
        <button
          onClick={() => commitUpdate(d => {
            d.work_experience.push({ company: '', title: '', start_date: '', end_date: '', highlights: [] })
          })}
          className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
        >
          <Plus size={12} /> 添加工作经历
        </button>
      </Section>

      {/* Education */}
      <Section title="教育背景" icon={GraduationCap} defaultOpen={false}>
        {data.education.map((edu, i) => (
          <div key={i} className="border rounded-lg p-2 mb-2 bg-white relative group">
            <button
              onClick={() => commitUpdate(d => { d.education.splice(i, 1) })}
              className="absolute top-2 right-2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
            >
              <Trash2 size={13} />
            </button>
            <div className="grid grid-cols-2 gap-2">
              <Field label="学校" value={edu.institution} onCommit={v => commitUpdate(d => { d.education[i].institution = v })} />
              <Field label="学位" value={edu.degree} onCommit={v => commitUpdate(d => { d.education[i].degree = v })} placeholder="本科/硕士/博士" />
              <Field label="专业" value={edu.field} onCommit={v => commitUpdate(d => { d.education[i].field = v })} />
              <Field label="GPA" value={edu.gpa || ''} onCommit={v => commitUpdate(d => { d.education[i].gpa = v })} placeholder="3.8/4.0" />
              <Field label="开始日期" value={edu.start_date} onCommit={v => commitUpdate(d => { d.education[i].start_date = v })} placeholder="2018.09" />
              <Field label="结束日期" value={edu.end_date} onCommit={v => commitUpdate(d => { d.education[i].end_date = v })} placeholder="2022.06" />
            </div>
          </div>
        ))}
        <button
          onClick={() => commitUpdate(d => {
            d.education.push({ institution: '', degree: '', field: '', start_date: '', end_date: '' })
          })}
          className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
        >
          <Plus size={12} /> 添加教育经历
        </button>
      </Section>

      {/* Skills */}
      <Section title="专业技能" icon={Wrench} defaultOpen={false}>
        {data.skills.map((sg, i) => (
          <div key={i} className="border rounded-lg p-2 mb-2 bg-white relative group">
            <button
              onClick={() => commitUpdate(d => { d.skills.splice(i, 1) })}
              className="absolute top-2 right-2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
            >
              <Trash2 size={13} />
            </button>
            <Field label="分类名称" value={sg.category} onCommit={v => commitUpdate(d => { d.skills[i].category = v })} placeholder="编程语言" />
            <div className="mt-1">
              <TagsEditor
                label="技能项"
                items={sg.items}
                onChange={v => commitUpdate(d => { d.skills[i].items = v })}
              />
            </div>
          </div>
        ))}
        <button
          onClick={() => commitUpdate(d => {
            d.skills.push({ category: '', items: [] })
          })}
          className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
        >
          <Plus size={12} /> 添加技能分组
        </button>
      </Section>

      {/* Projects */}
      <Section title="项目经验" icon={FolderOpen} defaultOpen={false}>
        {data.projects.map((proj, i) => (
          <div key={i} className="border rounded-lg p-2 mb-2 bg-white relative group">
            <button
              onClick={() => commitUpdate(d => { d.projects.splice(i, 1) })}
              className="absolute top-2 right-2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
            >
              <Trash2 size={13} />
            </button>
            <div className="grid grid-cols-2 gap-2">
              <Field label="项目名称" value={proj.name} onCommit={v => commitUpdate(d => { d.projects[i].name = v })} />
              <Field label="角色" value={proj.role || ''} onCommit={v => commitUpdate(d => { d.projects[i].role = v })} placeholder="项目负责人" />
            </div>
            <div className="mt-2">
              <Field label="项目描述" value={proj.description} onCommit={v => commitUpdate(d => { d.projects[i].description = v })} multiline placeholder="简要描述项目背景和目标..." />
            </div>
            <div className="mt-2">
              <TagsEditor
                label="技术栈"
                items={proj.tech_stack || []}
                onChange={v => commitUpdate(d => { d.projects[i].tech_stack = v })}
              />
            </div>
            <div className="mt-2">
              <HighlightsEditor
                items={proj.highlights}
                onChange={v => commitUpdate(d => { d.projects[i].highlights = v })}
              />
            </div>
          </div>
        ))}
        <button
          onClick={() => commitUpdate(d => {
            d.projects.push({ name: '', description: '', highlights: [], tech_stack: [] })
          })}
          className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
        >
          <Plus size={12} /> 添加项目
        </button>
      </Section>

      {/* Certifications */}
      <Section title="证书与奖项" icon={Award} defaultOpen={false}>
        {data.certifications.map((cert, i) => (
          <div key={i} className="border rounded-lg p-2 mb-2 bg-white relative group">
            <button
              onClick={() => commitUpdate(d => { d.certifications.splice(i, 1) })}
              className="absolute top-2 right-2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
            >
              <Trash2 size={13} />
            </button>
            <div className="grid grid-cols-2 gap-2">
              <Field label="证书名称" value={cert.name} onCommit={v => commitUpdate(d => { d.certifications[i].name = v })} />
              <Field label="颁发机构" value={cert.issuer || ''} onCommit={v => commitUpdate(d => { d.certifications[i].issuer = v })} />
              <Field label="获得日期" value={cert.date || ''} onCommit={v => commitUpdate(d => { d.certifications[i].date = v })} placeholder="2023.12" />
            </div>
          </div>
        ))}
        <button
          onClick={() => commitUpdate(d => {
            d.certifications.push({ name: '' })
          })}
          className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
        >
          <Plus size={12} /> 添加证书
        </button>
      </Section>
    </div>
  )
}
