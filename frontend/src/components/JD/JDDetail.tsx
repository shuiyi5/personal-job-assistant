import { useState, useEffect } from 'react'
import { Sparkles, Loader2, Save, Trash2 } from 'lucide-react'
import { JDData } from '../../stores/jdStore'

interface JDDetailProps {
  job: JDData
  onUpdate: (id: string, data: Partial<JDData>) => void
  onDelete: (id: string) => void
  onParse: (rawText: string) => Promise<JDData>
}

export default function JDDetail({ job, onUpdate, onDelete, onParse }: JDDetailProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [rawText, setRawText] = useState(job.raw_text)
  const [skills, setSkills] = useState<string[]>(job.skills || [])
  const [requirements, setRequirements] = useState<string[]>(job.requirements || [])
  const [plusPoints, setPlusPoints] = useState<string[]>(job.plus_points || [])
  const [salaryRange, setSalaryRange] = useState(job.salary_range || '')
  const [location, setLocation] = useState(job.location || '')

  useEffect(() => {
    setRawText(job.raw_text)
    setSkills(job.skills || [])
    setRequirements(job.requirements || [])
    setPlusPoints(job.plus_points || [])
    setSalaryRange(job.salary_range || '')
    setLocation(job.location || '')
  }, [job])

  const handleParse = async () => {
    if (!rawText.trim()) return
    setIsParsing(true)
    try {
      const parsed = await onParse(rawText)
      setSkills(parsed.skills || [])
      setRequirements(parsed.requirements || [])
      setPlusPoints(parsed.plus_points || [])
      setSalaryRange(parsed.salary_range || '')
      setLocation(parsed.location || '')
      onUpdate(job.id, {
        raw_text: rawText,
        skills: parsed.skills || [],
        requirements: parsed.requirements || [],
        plus_points: parsed.plus_points || [],
        salary_range: parsed.salary_range || '',
        location: parsed.location || '',
      })
    } finally {
      setIsParsing(false)
    }
  }

  const handleSave = () => {
    onUpdate(job.id, {
      raw_text: rawText,
      skills,
      requirements,
      plus_points: plusPoints,
      salary_range: salaryRange,
      location,
    })
    setIsEditing(false)
  }

  const handleAddItem = (list: string[], setList: (v: string[]) => void, value: string) => {
    if (!value.trim()) return
    setList([...list, value.trim()])
  }

  const handleRemoveItem = (list: string[], setList: (v: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-medium">职位描述</h3>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
              >
                编辑
              </button>
              <button
                onClick={() => onDelete(job.id)}
                className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              >
                <Trash2 size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-1"
              >
                <Save size={14} /> 保存
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
            </>
          )}
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 基本信息 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">薪资范围</label>
            {isEditing ? (
              <input
                type="text"
                value={salaryRange}
                onChange={e => setSalaryRange(e.target.value)}
                placeholder="如 30k-50k"
                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg"
              />
            ) : (
              <p className="mt-1 text-sm">{job.salary_range || '-'}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500">工作地点</label>
            {isEditing ? (
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="如 北京"
                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg"
              />
            ) : (
              <p className="mt-1 text-sm">{job.location || '-'}</p>
            )}
          </div>
        </div>

        {/* JD 原始文本 */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-500">职位描述原文</label>
            {isEditing && (
              <button
                onClick={handleParse}
                disabled={isParsing || !rawText.trim()}
                className="flex items-center gap-1 px-2 py-1 text-xs text-purple-600 border border-purple-200 rounded hover:bg-purple-50 disabled:opacity-50"
              >
                {isParsing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                AI 解析
              </button>
            )}
          </div>
          {isEditing ? (
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="粘贴职位描述..."
              className="w-full mt-1 px-3 py-2 text-sm border rounded-lg h-40 resize-none"
            />
          ) : (
            <p className="mt-1 text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
              {job.raw_text || '暂无内容'}
            </p>
          )}
        </div>

        {/* 关键技能 */}
        <div>
          <label className="text-xs text-gray-500">关键技能</label>
          <div className="mt-1 flex flex-wrap gap-1">
            {skills.length > 0 ? (
              skills.map((skill, i) => (
                isEditing ? (
                  <span key={i} className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                    {skill}
                    <button onClick={() => handleRemoveItem(skills, setSkills, i)} className="hover:text-blue-900">×</button>
                  </span>
                ) : (
                  <span key={i} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">{skill}</span>
                )
              ))
            ) : (
              <span className="text-xs text-gray-400">暂无</span>
            )}
          </div>
          {isEditing && (
            <input
              type="text"
              placeholder="输入技能后回车添加"
              className="w-full mt-2 px-3 py-1.5 text-sm border rounded-lg"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddItem(skills, setSkills, (e.target as HTMLInputElement).value)
                  ;(e.target as HTMLInputElement).value = ''
                }
              }}
            />
          )}
        </div>

        {/* 任职要求 */}
        <div>
          <label className="text-xs text-gray-500">任职要求</label>
          <ul className="mt-1 space-y-1">
            {requirements.length > 0 ? (
              requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-2">
                  {isEditing ? (
                    <>
                      <span className="text-xs text-gray-400">{i + 1}.</span>
                      <input
                        type="text"
                        value={req}
                        onChange={e => {
                          const newReqs = [...requirements]
                          newReqs[i] = e.target.value
                          setRequirements(newReqs)
                        }}
                        className="flex-1 px-2 py-1 text-sm border rounded"
                      />
                      <button onClick={() => handleRemoveItem(requirements, setRequirements, i)} className="text-gray-400 hover:text-red-500">×</button>
                    </>
                  ) : (
                    <span className="text-sm flex items-start gap-2">
                      <span className="text-gray-400">{i + 1}.</span>
                      {req}
                    </span>
                  )}
                </li>
              ))
            ) : (
              <li className="text-xs text-gray-400">暂无</li>
            )}
          </ul>
          {isEditing && (
            <input
              type="text"
              placeholder="输入要求后回车添加"
              className="w-full mt-2 px-3 py-1.5 text-sm border rounded-lg"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddItem(requirements, setRequirements, (e.target as HTMLInputElement).value)
                  ;(e.target as HTMLInputElement).value = ''
                }
              }}
            />
          )}
        </div>

        {/* 加分项 */}
        <div>
          <label className="text-xs text-gray-500">加分项</label>
          <ul className="mt-1 space-y-1">
            {plusPoints.length > 0 ? (
              plusPoints.map((plus, i) => (
                <li key={i} className="flex items-start gap-2">
                  {isEditing ? (
                    <>
                      <span className="text-xs text-green-600">+</span>
                      <input
                        type="text"
                        value={plus}
                        onChange={e => {
                          const newPlus = [...plusPoints]
                          newPlus[i] = e.target.value
                          setPlusPoints(newPlus)
                        }}
                        className="flex-1 px-2 py-1 text-sm border rounded"
                      />
                      <button onClick={() => handleRemoveItem(plusPoints, setPlusPoints, i)} className="text-gray-400 hover:text-red-500">×</button>
                    </>
                  ) : (
                    <span className="text-sm flex items-start gap-2">
                      <span className="text-green-600">+</span>
                      {plus}
                    </span>
                  )}
                </li>
              ))
            ) : (
              <li className="text-xs text-gray-400">暂无</li>
            )}
          </ul>
          {isEditing && (
            <input
              type="text"
              placeholder="输入加分项后回车添加"
              className="w-full mt-2 px-3 py-1.5 text-sm border rounded-lg"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddItem(plusPoints, setPlusPoints, (e.target as HTMLInputElement).value)
                  ;(e.target as HTMLInputElement).value = ''
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}