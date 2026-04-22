import { useState, useEffect } from 'react'
import { Download, Wand2, Loader2, Printer } from 'lucide-react'
import { useResumeStore } from '../stores/resumeStore'
import { useChatStore } from '../stores/chatStore'
import TemplateSelector from '../components/Resume/TemplateSelector'
import ResumeEditor from '../components/Resume/ResumeEditor'
import ResumePreview from '../components/Resume/ResumePreview'
import ThinkingOverlay from '../components/Resume/ThinkingOverlay'

export default function ResumePage() {
  const { resumeData, isGenerating, generateResume, exportResume } = useResumeStore()
  const setPageContext = useChatStore(s => s.setPageContext)
  useEffect(() => { setPageContext('resume') }, [setPageContext])
  const [jobTitle, setJobTitle] = useState('')

  const handlePrintPDF = () => {
    if (!resumeData) return

    // 触发浏览器打印对话框
    // 用户可以选择"另存为 PDF"
    window.print()
  }

  return (
    <div className="flex flex-col h-full">
      <style>{`
        @media print {
          [data-print-hide] { display: none !important; }
          [data-print-preview] {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            overflow: visible !important;
            z-index: 9999 !important;
          }
          @page { margin: 0; size: A4 portrait; }
          body { margin: 0; }
        }
      `}</style>
      {/* 模板选择器 (可收起) */}
      <div data-print-hide><TemplateSelector /></div>

      {/* 顶部控制栏 */}
      <div data-print-hide className="border-b bg-white px-4 py-2 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={jobTitle}
          onChange={e => setJobTitle(e.target.value)}
          placeholder="目标职位 (如: 后端工程师)"
          className="border rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={() => generateResume(jobTitle, 'professional')}
          disabled={isGenerating}
          className="bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
        >
          {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
          AI 生成简历
        </button>
        <div className="flex gap-1 ml-auto">
          <button
            onClick={handlePrintPDF}
            disabled={!resumeData}
            className="border px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-30 flex items-center gap-1"
          >
            <Printer size={13} />
            PDF
          </button>
          {(['docx', 'markdown'] as const).map(fmt => (
            <button
              key={fmt}
              onClick={() => exportResume(fmt)}
              disabled={!resumeData}
              className="border px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-30 flex items-center gap-1"
            >
              <Download size={13} />
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 编辑器 + 预览 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧: 结构化表单编辑器 + 思考面板 */}
        <div data-print-hide className="w-[380px] flex-shrink-0 border-r flex flex-col bg-gray-50/50">
          <div className="flex-1 overflow-hidden">
            <ResumeEditor />
          </div>
          <ThinkingOverlay />
        </div>

        {/* 右侧: 模板 HTML 实时预览 */}
        <div data-print-preview className="flex-1 overflow-hidden">
          <ResumePreview />
        </div>
      </div>
    </div>
  )
}
