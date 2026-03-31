import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { ChevronRight, ChevronDown, Terminal, CheckCircle2, XCircle, Loader2, User } from 'lucide-react'
import type { Message, ToolCall } from '../../stores/chatStore'

const TOOL_LABELS: Record<string, string> = {
  search_knowledge_base: '搜索知识库',
  list_documents: '列出文档',
  delete_document: '删除文档',
  generate_section: '生成简历段落',
  format_resume: '格式化简历',
  export_resume: '导出简历',
  generate_questions: '生成面试题',
  evaluate_answer: '评估回答',
  provide_feedback: '生成反馈',
  web_search: '联网搜索',
  fetch_webpage: '读取网页',
  get_current_time: '获取时间',
}

function ToolCallBlock({ call }: { call: ToolCall }) {
  const [expanded, setExpanded] = useState(call.status === 'running')
  const label = TOOL_LABELS[call.tool] || call.tool

  const statusIcon = call.status === 'running'
    ? <Loader2 size={14} className="animate-spin text-blue-500" />
    : call.status === 'done'
    ? <CheckCircle2 size={14} className="text-green-500" />
    : <XCircle size={14} className="text-red-500" />

  const inputStr = call.input ? JSON.stringify(call.input, null, 2) : null

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors"
      >
        {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        {statusIcon}
        <Terminal size={12} className="text-gray-400" />
        <span className="font-mono font-medium text-gray-700">{label}</span>
        {call.status === 'running' && <span className="text-gray-400 ml-auto">执行中...</span>}
      </button>
      {expanded && inputStr && (
        <div className="border-t border-gray-100 bg-gray-900 text-green-400 px-3 py-2 text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto">
          <pre className="whitespace-pre-wrap">{inputStr}</pre>
        </div>
      )}
    </div>
  )
}

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0

  if (isUser) {
    return (
      <div className="flex items-start gap-3 py-2">
        <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center flex-shrink-0">
          <User size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 mb-1">你</p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }

  // Assistant message — Claude Code style
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
        A
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-sm font-medium text-gray-500 mb-1">Agent</p>
        {/* 工具调用块 — 类似 Claude Code 的 tool_use 显示 */}
        {hasToolCalls && (
          <div className="space-y-1.5">
            {message.toolCalls!.map((tc, i) => (
              <ToolCallBlock key={`${tc.tool}_${i}`} call={tc} />
            ))}
          </div>
        )}
        {/* 文本回复 */}
        {message.content && (
          <div className="markdown-body text-sm text-gray-800 leading-relaxed">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        {!message.content && hasToolCalls && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 size={12} className="animate-spin" />
            <span>正在处理工具结果...</span>
          </div>
        )}
      </div>
    </div>
  )
}
