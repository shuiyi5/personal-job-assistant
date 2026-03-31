import { useState, useRef, type KeyboardEvent } from 'react'
import { Send, Paperclip, X, FileText, Image } from 'lucide-react'

interface Props {
  onSend: (text: string, files?: File[]) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    const trimmed = text.trim()
    if ((!trimmed && files.length === 0) || disabled) return
    onSend(trimmed || '请分析上传的文件', files.length > 0 ? files : undefined)
    setText('')
    setFiles([])
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (selected) {
      setFiles(prev => [...prev, ...Array.from(selected)])
    }
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const isImage = (file: File) => file.type.startsWith('image/')

  return (
    <div className="border-t bg-white p-4">
      {/* 已选文件预览 */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {files.map((file, i) => (
            <div key={`${file.name}_${i}`} className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5 text-xs text-gray-600">
              {isImage(file) ? <Image size={14} className="text-blue-500" /> : <FileText size={14} className="text-orange-500" />}
              <span className="max-w-[120px] truncate">{file.name}</span>
              <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-end">
        {/* 文件上传按钮 */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="text-gray-400 hover:text-gray-600 p-2.5 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-colors"
          title="上传文件/图片"
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.gif,.webp"
          onChange={handleFileChange}
          className="hidden"
        />
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={files.length > 0 ? '描述你要对文件做什么...' : '输入消息...'}
          rows={1}
          className="flex-1 resize-none border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={disabled}
        />
        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && files.length === 0)}
          className="bg-primary-500 text-white p-2.5 rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
