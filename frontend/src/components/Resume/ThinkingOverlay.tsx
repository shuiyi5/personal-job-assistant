import { useEffect, useRef, useState } from 'react'
import { Brain, ChevronDown, ChevronUp } from 'lucide-react'
import { useResumeStore } from '../../stores/resumeStore'

export default function ThinkingOverlay() {
  const thinkingMessages = useResumeStore(s => s.thinkingMessages)
  const isGenerating = useResumeStore(s => s.isGenerating)
  const [collapsed, setCollapsed] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [thinkingMessages])

  if (thinkingMessages.length === 0 && !isGenerating) return null

  return (
    <div className="border-t bg-gray-50">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-gray-100 select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Brain size={13} className={isGenerating ? 'text-blue-500 animate-pulse' : 'text-gray-400'} />
          <span>{isGenerating ? 'Agent 正在思考...' : 'Agent 思考过程'}</span>
          <span className="text-gray-300">({thinkingMessages.length})</span>
        </div>
        <button className="text-gray-400 p-0.5">
          {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>
      </div>

      {/* Messages */}
      {!collapsed && (
        <div
          ref={scrollRef}
          className="max-h-[120px] overflow-y-auto px-3 pb-2 space-y-1"
        >
          {thinkingMessages.map(msg => (
            <div key={msg.id} className="text-xs text-gray-500 leading-relaxed">
              <span className="text-gray-300 mr-1">›</span>
              {msg.content}
            </div>
          ))}
          {isGenerating && thinkingMessages.length === 0 && (
            <div className="text-xs text-gray-400 italic">等待 Agent 响应...</div>
          )}
        </div>
      )}
    </div>
  )
}
