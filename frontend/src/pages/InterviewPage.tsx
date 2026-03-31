import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Loader2, Sparkles, CheckCircle } from 'lucide-react'
import { useInterviewStore } from '../stores/interviewStore'
import { useChatStore } from '../stores/chatStore'

export default function InterviewPage() {
  const { questions, evaluation, isLoading, generateQuestions, evaluateAnswer } = useInterviewStore()
  const setPageContext = useChatStore(s => s.setPageContext)
  useEffect(() => { setPageContext('interview') }, [setPageContext])
  const [category, setCategory] = useState('mixed')
  const [difficulty, setDifficulty] = useState('mid')
  const [count, setCount] = useState(5)
  const [topic, setTopic] = useState('')
  const [currentQ, setCurrentQ] = useState('')
  const [answer, setAnswer] = useState('')

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">面试准备</h2>
        <p className="text-sm text-gray-500 mt-1">基于你的项目经历，智能生成面试题并评估回答</p>
      </div>

      {/* 出题控制 */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-gray-700">生成面试题</h3>
        <div className="flex flex-wrap gap-3">
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="mixed">综合</option>
            <option value="technical">技术题</option>
            <option value="behavioral">行为题</option>
            <option value="system_design">系统设计</option>
          </select>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="junior">初级</option>
            <option value="mid">中级</option>
            <option value="senior">高级</option>
          </select>
          <input type="number" value={count} onChange={e => setCount(Number(e.target.value))}
            min={1} max={20}
            className="border rounded-lg px-3 py-2 text-sm w-20" />
          <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="指定主题/项目 (可选)"
            className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]" />
          <button
            onClick={() => generateQuestions(category, difficulty, count, topic)}
            disabled={isLoading}
            className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-600 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            生成面试题
          </button>
        </div>
      </div>

      {/* 面试题展示 */}
      {questions && (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-semibold text-gray-700 mb-3">面试题目</h3>
          <div className="markdown-body text-sm">
            <ReactMarkdown>{questions}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* 回答评估 */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-gray-700">回答评估</h3>
        <input
          type="text"
          value={currentQ}
          onChange={e => setCurrentQ(e.target.value)}
          placeholder="输入或粘贴面试题目"
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="输入你的回答..."
          rows={4}
          className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
        />
        <button
          onClick={() => evaluateAnswer(currentQ, answer)}
          disabled={isLoading || !currentQ.trim() || !answer.trim()}
          className="bg-accent-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-600 disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
          评估回答
        </button>
      </div>

      {/* 评估结果 */}
      {evaluation && (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-semibold text-gray-700 mb-3">评估反馈</h3>
          <div className="markdown-body text-sm">
            <ReactMarkdown>{evaluation}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
