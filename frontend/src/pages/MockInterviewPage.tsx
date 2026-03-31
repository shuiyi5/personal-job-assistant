import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from 'lucide-react'
import { useChatStore } from '../stores/chatStore'

interface TranscriptEntry {
  role: 'user' | 'interviewer'
  text: string
}

export default function MockInterviewPage() {
  const setPageContext = useChatStore(s => s.setPageContext)
  useEffect(() => { setPageContext('mock_interview') }, [setPageContext])
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [status, setStatus] = useState('未连接')
  const wsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  const playAudio = useCallback(async (audioData: ArrayBuffer) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 16000 })
    }
    const ctx = audioContextRef.current
    // PCM 16-bit → Float32
    const int16 = new Int16Array(audioData)
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768
    }
    const buffer = ctx.createBuffer(1, float32.length, 16000)
    buffer.copyToChannel(float32, 0)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start()
  }, [])

  const startInterview = async () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/voice/interview`)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      setStatus('已连接，等待面试官...')
      ws.send(JSON.stringify({ type: 'start', config: { language: 'zh_cn' } }))
    }

    ws.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        const data = JSON.parse(event.data)
        if (data.type === 'agent_response') {
          setTranscript(t => [...t, { role: 'interviewer', text: data.text }])
          setStatus('面试官发言中...')
        } else if (data.type === 'transcript') {
          if (data.is_final) {
            setTranscript(t => [...t, { role: 'user', text: data.text }])
          }
        } else if (data.type === 'done') {
          setStatus('面试结束')
          setIsConnected(false)
        } else if (data.type === 'error') {
          setStatus(`错误: ${data.message}`)
        }
      } else {
        // 二进制音频数据 → 播放
        const arrayBuffer = await event.data.arrayBuffer()
        playAudio(arrayBuffer)
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      setIsRecording(false)
      setStatus('连接已断开')
    }

    ws.onerror = () => {
      setStatus('连接失败')
    }
  }

  const stopInterview = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }))
    }
    stopRecording()
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = recorder

      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (chunks.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          const blob = new Blob(chunks)
          const buffer = await blob.arrayBuffer()
          wsRef.current.send(buffer)
          setStatus('处理中...')
        }
      }

      recorder.start()
      setIsRecording(true)
      setStatus('录音中... 说完后点击停止')
    } catch {
      setStatus('无法访问麦克风')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }

  // 文字输入备选
  const [textInput, setTextInput] = useState('')
  const sendText = () => {
    if (!textInput.trim() || !wsRef.current) return
    wsRef.current.send(JSON.stringify({ type: 'text_input', text: textInput }))
    setTranscript(t => [...t, { role: 'user', text: textInput }])
    setTextInput('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部状态栏 */}
      <div className="border-b bg-white p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">模拟面试</h2>
          <p className="text-sm text-gray-500">{status}</p>
        </div>
        <div className="flex gap-2">
          {!isConnected ? (
            <button onClick={startInterview}
              className="bg-accent-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-600 flex items-center gap-2">
              <Phone size={16} /> 开始面试
            </button>
          ) : (
            <button onClick={stopInterview}
              className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 flex items-center gap-2">
              <PhoneOff size={16} /> 结束面试
            </button>
          )}
        </div>
      </div>

      {/* 对话记录 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {transcript.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Mic size={48} className="mx-auto mb-3 opacity-50" />
            <p>点击「开始面试」，AI 面试官将与你进行模拟面试</p>
            <p className="text-xs mt-2">支持语音和文字两种输入方式</p>
          </div>
        )}
        {transcript.map((entry, i) => (
          <div key={i} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
              entry.role === 'user'
                ? 'bg-primary-500 text-white'
                : 'bg-white border text-gray-800 shadow-sm'
            }`}>
              <div className="flex items-center gap-2 mb-1 text-xs opacity-70">
                {entry.role === 'interviewer' ? <Volume2 size={12} /> : null}
                {entry.role === 'interviewer' ? '面试官' : '我'}
              </div>
              {entry.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 底部控制 */}
      {isConnected && (
        <div className="border-t bg-white p-4">
          <div className="flex gap-2 items-center">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 rounded-full transition-colors ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <input
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendText()}
              placeholder="或者输入文字回答..."
              className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={sendText}
              disabled={!textInput.trim()}
              className="bg-primary-500 text-white px-4 py-2.5 rounded-xl text-sm hover:bg-primary-600 disabled:opacity-50"
            >
              发送
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
