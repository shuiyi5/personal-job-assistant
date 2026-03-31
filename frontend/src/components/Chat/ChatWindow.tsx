import { useRef, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'

export default function ChatWindow() {
  const { isLoading, sendMessage, clearCurrentSession, currentMessages } = useChatStore()
  const messages = currentMessages()
  const clearMessages = clearCurrentSession
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-gray-700">求职助手 Agent</span>
          {isLoading && <span className="text-xs text-blue-500 animate-pulse">处理中...</span>}
        </div>
        {messages.length > 0 && (
          <button onClick={clearMessages} className="text-gray-300 hover:text-gray-500 transition-colors" title="清空对话">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* 对话区 */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center max-w-md px-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center mx-auto mb-4 text-lg font-bold">A</div>
              <p className="text-base font-medium text-gray-600 mb-1">你好，我是你的求职助手</p>
              <p className="text-sm text-gray-400 mb-5">我可以搜索知识库、联网查询、生成简历、出面试题</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  '查看知识库中的文档',
                  '帮我生成后端工程师简历',
                  '根据我的项目出面试题',
                  '搜索字节跳动最新面经',
                  '现在几点了',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors text-gray-600"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-4 space-y-1">
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="max-w-3xl mx-auto w-full">
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  )
}
