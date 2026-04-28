import { useState, useEffect } from 'react'
import { Loader2, Sparkles, FileText, Trash2, ExternalLink, ArrowRight } from 'lucide-react'
import { useJDStore, JdResume, JDData, GenerateStep } from '../../stores/jdStore'

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

interface JDResumeListProps {
  job: JDData
  onEditResume: (resume: JdResume) => void
  editMode: 'panel' | 'newtab'
}

export default function JDResumeList({ job, onEditResume, editMode }: JDResumeListProps) {
  const {
    resumes,
    fetchResumes,
    createResume,
    deleteResume,
    generateResume,
    analyzeFit,
  } = useJDStore()

  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingStep, setGeneratingStep] = useState<GenerateStep | null>(null)
  const [thinkingContent, setThinkingContent] = useState('')
  const [selectedResume, setSelectedResume] = useState<JdResume | null>(null)
  const [fitAnalysis, setFitAnalysis] = useState<{ overall_score: number; overall_comment: string; matched: string[]; missing: string[]; suggestions: string[] } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const jobResumes = resumes.filter(r => r.jd_id === job.id)

  useEffect(() => {
    fetchResumes(job.id)
  }, [job.id])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setGeneratingStep(null)
    setThinkingContent('')
    setFitAnalysis(null)
    setErrorMessage(null)

    try {
      await generateResume(
        job.id,
        undefined,
        (step) => setGeneratingStep(step),
        (content) => setThinkingContent(prev => prev + content),
        async (data: ResumeData) => {
          console.log('onResumeData called with data:', JSON.stringify(data).slice(0, 200))
          try {
            const newResume = await createResume(job.id, data)
            console.log('Resume created:', newResume)
            setSelectedResume(newResume)
          } catch (err) {
            console.error('创建简历失败:', err)
            const msg = err instanceof Error ? err.message : String(err)
            setErrorMessage('创建简历失败: ' + msg)
          }
        },
      )
    } catch (error) {
      console.error('生成简历失败:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      setErrorMessage(errorMsg || '生成简历失败，请检查 LLM 配置是否正确')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAnalyze = async (resume: JdResume) => {
    setFitAnalysis(null)
    try {
      const result = await analyzeFit(job.id, resume.resume_data)
      setFitAnalysis(result)
    } catch (error) {
      console.error('分析失败:', error)
      const msg = error instanceof Error ? error.message : String(error)
      // 直接在 fitAnalysis 中显示错误
      setFitAnalysis({
        overall_score: 0,
        overall_comment: `分析失败: ${msg}`,
        matched: [],
        missing: [],
        suggestions: ['请检查后端日志获取详细信息'],
      })
    }
  }

  const handleDelete = async (resumeId: string) => {
    if (confirm('确定删除该简历？')) {
      await deleteResume(resumeId)
      if (selectedResume?.id === resumeId) {
        setSelectedResume(null)
        setFitAnalysis(null)
      }
    }
  }

  const openResumeEditor = (resume: JdResume) => {
    if (editMode === 'newtab') {
      // 打开新标签页
      const resumeJson = encodeURIComponent(JSON.stringify(resume.resume_data))
      window.open(`/resume?from=jd&jd_id=${job.id}&resume_id=${resume.id}&data=${resumeJson}`, '_blank')
    } else {
      // 右侧面板切换
      onEditResume(resume)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">简历列表</h3>
          <span className="text-xs text-gray-400">({jobResumes.length})</span>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          AI 生成简历
        </button>
      </div>

      {/* 错误信息 */}
      {errorMessage && (
        <div className="px-4 py-3 bg-red-50 border-b text-red-600 text-xs">
          {errorMessage}
        </div>
      )}

      {/* 生成进度 */}
      {isGenerating && (
        <div className="px-4 py-3 bg-purple-50 border-b">
          <div className="text-xs text-purple-600 font-medium mb-2">生成进度</div>
          {[1, 2, 3].map(step => {
            const stepData = generatingStep?.step === step ? generatingStep : null
            return (
              <div key={step} className="flex items-center gap-2 text-xs mb-1">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  stepData?.status === 'done' ? 'bg-green-500 text-white' :
                  stepData?.status === 'thinking' || stepData?.status === 'searching' ? 'bg-purple-500 text-white animate-pulse' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {stepData?.status === 'done' ? '✓' : step}
                </span>
                <span className={stepData?.status === 'done' ? 'text-green-600' : stepData ? 'text-purple-600' : 'text-gray-400'}>
                  {stepData?.message || (
                    step === 1 ? '分析职位要求' :
                    step === 2 ? '生成简历内容' :
                    '格式化数据'
                  )}
                </span>
              </div>
            )
          })}
          {thinkingContent && (
            <div className="mt-2 text-xs text-gray-500 max-h-16 overflow-y-auto">
              <div className="font-medium text-gray-400">AI 思考过程：</div>
              <div className="whitespace-pre-wrap">{thinkingContent.slice(-500)}</div>
            </div>
          )}
        </div>
      )}

      {/* 简历列表 */}
      <div className="flex-1 overflow-y-auto">
        {jobResumes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <FileText size={32} className="mb-2" />
            <p className="text-sm">暂无简历</p>
            <p className="text-xs">点击「AI 生成简历」开始</p>
          </div>
        ) : (
          <div className="divide-y">
            {jobResumes.map(resume => (
              <div
                key={resume.id}
                className={`p-3 hover:bg-gray-50 cursor-pointer ${selectedResume?.id === resume.id ? 'bg-blue-50' : ''}`}
                onClick={() => setSelectedResume(resume)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">
                    简历 {resume.id.slice(-6)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); handleAnalyze(resume) }}
                      className="p-1 text-gray-400 hover:text-purple-600"
                      title="分析适配度"
                    >
                      <Sparkles size={12} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); openResumeEditor(resume) }}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title={editMode === 'newtab' ? '新标签页打开' : '在面板中编辑'}
                    >
                      {editMode === 'newtab' ? <ExternalLink size={12} /> : <ArrowRight size={12} />}
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(resume.id) }}
                      className="p-1 text-gray-400 hover:text-red-500"
                      title="删除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  创建于 {new Date(resume.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 选中简历预览 */}
      {selectedResume && (
        <div className="border-t">
          {/* 适配度分析结果 */}
          {fitAnalysis && (
            <div className="p-3 bg-green-50 border-b">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700">适配度分析</span>
                <span className="text-lg font-bold text-green-600">{fitAnalysis.overall_score}分</span>
              </div>
              <p className="text-xs text-green-600 mb-2">{fitAnalysis.overall_comment}</p>
              {fitAnalysis.matched.length > 0 && (
                <div className="mb-1">
                  <span className="text-xs text-green-600">匹配：</span>
                  {fitAnalysis.matched.slice(0, 3).map((m, i) => (
                    <span key={i} className="text-xs text-green-700 ml-1">✓{m}</span>
                  ))}
                </div>
              )}
              {fitAnalysis.missing.length > 0 && (
                <div className="mb-1">
                  <span className="text-xs text-red-600">缺失：</span>
                  {fitAnalysis.missing.slice(0, 3).map((m, i) => (
                    <span key={i} className="text-xs text-red-700 ml-1">✗{m}</span>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* 简历预览 */}
          <div className="p-3 max-h-64 overflow-y-auto">
            <div className="text-xs space-y-2">
              <div className="font-medium">{selectedResume.resume_data.personal?.name || '未命名'}</div>
              <div className="text-gray-500">{selectedResume.resume_data.personal?.title || ''}</div>
              {selectedResume.resume_data.summary && (
                <div className="text-gray-600 line-clamp-2">{selectedResume.resume_data.summary}</div>
              )}
              <div className="text-gray-400 text-[10px]">
                {selectedResume.resume_data.work_experience?.length || 0} 段工作经历，{selectedResume.resume_data.projects?.length || 0} 个项目
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}