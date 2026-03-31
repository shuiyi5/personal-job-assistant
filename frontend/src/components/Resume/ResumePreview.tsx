import { useRef, useState, useEffect, useCallback } from 'react'
import { FileText, Check, X, Eye } from 'lucide-react'
import { useResumeStore } from '../../stores/resumeStore'
import { TEMPLATES } from '../../templates'

const A4_WIDTH = 794

export default function ResumePreview() {
  const resumeData = useResumeStore(s => s.resumeData)
  const pendingResumeData = useResumeStore(s => s.pendingResumeData)
  const applyPendingData = useResumeStore(s => s.applyPendingData)
  const rejectPendingData = useResumeStore(s => s.rejectPendingData)
  const selectedTemplate = useResumeStore(s => s.selectedTemplate)
  const isGenerating = useResumeStore(s => s.isGenerating)
  const [showPending, setShowPending] = useState(true)
  const [scale, setScale] = useState(1)
  const [contentHeight, setContentHeight] = useState(1123)
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  const entry = TEMPLATES[selectedTemplate]
  const TemplateComponent = entry.component

  // Auto-fit: calculate scale so A4_WIDTH fills the container width (with small padding)
  const recalcScale = useCallback(() => {
    if (!containerRef.current) return
    const padding = 32
    const availableWidth = containerRef.current.clientWidth - padding
    if (availableWidth > 0) {
      setScale(Math.min(1, availableWidth / A4_WIDTH))
    }
  }, [])

  useEffect(() => {
    recalcScale()
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(recalcScale)
    ro.observe(el)
    return () => ro.disconnect()
  }, [recalcScale])

  // Track actual content height so the outer wrapper can size correctly for scrolling
  useEffect(() => {
    if (!innerRef.current) return
    const ro = new ResizeObserver(() => {
      if (innerRef.current) {
        setContentHeight(innerRef.current.scrollHeight)
      }
    })
    ro.observe(innerRef.current)
    return () => ro.disconnect()
  }, [])

  const displayData = pendingResumeData && showPending ? pendingResumeData : resumeData

  if (!displayData && !isGenerating) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center text-gray-300">
          <FileText size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">简历预览区域</p>
          <p className="text-xs mt-1">点击「AI 生成简历」或手动填写信息</p>
        </div>
      </div>
    )
  }

  if (!displayData && isGenerating) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">正在生成简历...</p>
        </div>
      </div>
    )
  }

  const scaledWidth = A4_WIDTH * scale
  const scaledHeight = contentHeight * scale

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Pending confirmation banner */}
      {pendingResumeData && (
        <div className="border-b bg-amber-50 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
          <div className="flex-1 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm text-amber-800 font-medium">
              Agent 提议了简历修改
            </span>
            <button
              onClick={() => setShowPending(p => !p)}
              className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1 ml-2"
            >
              <Eye size={12} />
              {showPending ? '查看原版' : '查看修改'}
            </button>
          </div>
          <button
            onClick={() => { applyPendingData(); setShowPending(true) }}
            className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600 flex items-center gap-1"
          >
            <Check size={13} />
            应用
          </button>
          <button
            onClick={() => { rejectPendingData(); setShowPending(true) }}
            className="bg-gray-200 text-gray-600 px-3 py-1 rounded-md text-sm hover:bg-gray-300 flex items-center gap-1"
          >
            <X size={13} />
            取消
          </button>
        </div>
      )}

      {/* Resume preview area — scrollable vertically, width auto-fit */}
      <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex justify-center">
        {/* Wrapper with explicit scaled dimensions so scrolling works correctly */}
        <div
          className="bg-white shadow-lg flex-shrink-0 relative"
          style={{ width: scaledWidth, height: scaledHeight, overflow: 'hidden' }}
        >
          <div
            ref={innerRef}
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: A4_WIDTH }}
          >
            <TemplateComponent data={displayData!} />
          </div>
        </div>
      </div>

      {/* Scale indicator */}
      <div className="border-t px-4 py-1 flex items-center bg-white flex-shrink-0">
        <span className="text-xs text-gray-400">{Math.round(scale * 100)}%</span>
      </div>
    </div>
  )
}
