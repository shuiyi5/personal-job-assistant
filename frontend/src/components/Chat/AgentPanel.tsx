import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Loader2, CheckCircle2, XCircle, Terminal, ChevronDown, ChevronRight, Paperclip, Bot, Plus, X, PanelRightClose, Square } from 'lucide-react'
import { useChatStore, type ToolCall, type PageContext } from '../../stores/chatStore'
import { useNavigate } from 'react-router-dom'

const TOOL_LABELS: Record<string, string> = {
  search_knowledge_base: '搜索知识库', list_documents: '列出文档', delete_document: '删除文档',
  web_search: '联网搜索', fetch_webpage: '读取网页', get_current_time: '获取时间',
  generate_section: '生成简历段落', format_resume: '格式化简历', export_resume: '导出简历',
  generate_questions: '生成面试题', evaluate_answer: '评估回答', provide_feedback: '生成反馈',
}

const PAGE_QUICK_ACTIONS: Record<PageContext, string[]> = {
  chat: ['查看知识库文档', '现在几点', '搜索最新面经'],
  documents: ['帮我归类这些文档', '总结知识库内容', '哪些文档可以删除'],
  resume: ['优化当前简历', '补充项目经验段', '调整为技术风格'],
  interview: ['基于我的项目出 5 道题', '评估一下这个回答', '出系统设计题'],
  mock_interview: ['开始模拟面试', '出一道行为题', '总结面试表现'],
}

function MiniToolBlock({ call }: { call: ToolCall }) {
  const [open, setOpen] = useState(false)
  const label = TOOL_LABELS[call.tool] || call.tool
  const icon = call.status === 'running'
    ? <Loader2 size={11} className="animate-spin text-blue-500" />
    : call.status === 'done'
    ? <CheckCircle2 size={11} className="text-green-500" />
    : <XCircle size={11} className="text-red-500" />

  return (
    <div className="border border-gray-200 rounded text-[11px] bg-white">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 w-full px-2 py-1 hover:bg-gray-50">
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {icon}
        <Terminal size={10} className="text-gray-400" />
        <span className="font-mono text-gray-600">{label}</span>
      </button>
      {open && call.input && (
        <pre className="border-t bg-gray-900 text-green-400 px-2 py-1 text-[10px] font-mono overflow-x-auto max-h-20 overflow-y-auto">
          {JSON.stringify(call.input, null, 2)}
        </pre>
      )}
    </div>
  )
}

export default function AgentPanel() {
  const {
    sessions, activeSessionId, isLoading, isPaused, pageContext, panelVisible,
    setPanelVisible, createSession, switchSession, deleteSession,
    sendMessage, currentMessages, abortMessage,
  } = useChatStore()

  const navigate = useNavigate()
  const messages = currentMessages()
  const [input, setInput] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const quickActions = PAGE_QUICK_ACTIONS[pageContext] || []

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // 监听 Agent 生成的简历事件，导航到简历编辑页
  useEffect(() => {
    const handler = (e: Event) => {
      const resumeData = (e as CustomEvent).detail
      // 设置到 resumeStore 并导航
      import('../../stores/resumeStore').then(({ useResumeStore }) => {
        useResumeStore.getState().setPendingResumeData(resumeData)
        useChatStore.getState().setPendingResumeData(resumeData)
      })
      navigate('/resume?from=agent&edit=true')
    }
    window.addEventListener('agent:resume-generated', handler)
    return () => window.removeEventListener('agent:resume-generated', handler)
  }, [navigate])

  const handleSend = () => {
    const text = input.trim()
    if ((!text && files.length === 0) || isLoading) return
    sendMessage(text || '请分析上传的文件', files.length > 0 ? files : undefined)
    setInput('')
    setFiles([])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)])
    e.target.value = ''
  }

  // 隐藏状态 — 只显示一个展开按钮
  if (!panelVisible) {
    return (
      <div className="h-full flex items-start pt-3 justify-center bg-gray-50 border-l border-gray-200 w-10">
        <button
          onClick={() => setPanelVisible(true)}
          className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition-colors"
          title="展开 Agent 面板"
        >
          <Bot size={18} />
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header + 会话标签 */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
              <Bot size={10} className="text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700">Agent</span>
            {isLoading && <Loader2 size={11} className="animate-spin text-blue-500" />}
          </div>
          <div className="flex items-center gap-1">
            {(isLoading || isPaused) && (
              <button
                onClick={abortMessage}
                className="text-orange-500 hover:text-orange-600 p-0.5 rounded hover:bg-orange-50"
                title={isPaused ? '已暂停，点击继续' : '暂停'}
              >
                {isPaused ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
              </button>
            )}
            <button onClick={() => createSession()} className="text-gray-400 hover:text-gray-600 p-0.5 rounded hover:bg-gray-100" title="新建对话">
              <Plus size={14} />
            </button>
            <button onClick={() => setPanelVisible(false)} className="text-gray-400 hover:text-gray-600 p-0.5 rounded hover:bg-gray-100" title="隐藏面板">
              <PanelRightClose size={14} />
            </button>
          </div>
        </div>
        {/* 会话标签栏 */}
        <div className="flex overflow-x-auto px-1 pb-1 gap-0.5 scrollbar-none">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => switchSession(s.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] whitespace-nowrap flex-shrink-0 transition-colors group ${
                s.id === activeSessionId
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <span className="max-w-[80px] truncate">{s.title}</span>
              {sessions.length > 1 && (
                <span
                  onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 cursor-pointer"
                >
                  <X size={10} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 对话区 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mx-auto mb-3">
              <Bot size={18} className="text-white" />
            </div>
            <p className="text-xs text-gray-500 font-medium">向 Agent 发送指令</p>
            <p className="text-[10px] text-gray-400 mt-1">根据当前页面上下文行动</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={msg.role === 'user' ? 'text-right' : ''}>
              {msg.role === 'user' ? (
                <div className="inline-block bg-primary-500 text-white rounded-xl rounded-tr-sm px-3 py-1.5 text-xs max-w-[90%] text-left whitespace-pre-wrap">
                  {msg.content}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="space-y-1">
                      {msg.toolCalls.map((tc, i) => (
                        <MiniToolBlock key={`${tc.tool}_${i}`} call={tc} />
                      ))}
                    </div>
                  )}
                  {msg.content && (
                    <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 text-xs text-gray-700 border border-gray-100 markdown-body">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                  {!msg.content && msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 px-1">
                      <Loader2 size={10} className="animate-spin" /> 处理中...
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 快捷指令 */}
      {quickActions.length > 0 && messages.length === 0 && (
        <div className="px-3 py-1.5 border-t border-gray-100 flex flex-wrap gap-1">
          {quickActions.map(q => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              disabled={isLoading}
              className="text-[10px] bg-white border border-gray-200 hover:border-primary-300 hover:text-primary-600 px-2 py-1 rounded-full transition-colors text-gray-500"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* 文件预览 */}
      {files.length > 0 && (
        <div className="px-3 flex flex-wrap gap-1">
          {files.map((f, i) => (
            <span key={i} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500 flex items-center gap-1">
              {f.name}
              <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">×</button>
            </span>
          ))}
        </div>
      )}

      {/* 输入区 */}
      <div className="px-3 py-2 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-1.5">
          <button onClick={() => fileRef.current?.click()} className="text-gray-300 hover:text-gray-500 p-1" title="上传文件">
            <Paperclip size={14} />
          </button>
          <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg" onChange={handleFileChange} className="hidden" />
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={isPaused ? '已暂停输入，继续对话...' : '输入指令...'}
            rows={1}
            className="flex-1 text-xs border rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary-500"
            disabled={isLoading && !isPaused}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && files.length === 0) || (isLoading && !isPaused)}
            className="bg-primary-500 text-white p-1.5 rounded-lg disabled:opacity-40"
          >
            {isPaused ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          </button>
        </div>
      </div>
    </div>
  )
}
