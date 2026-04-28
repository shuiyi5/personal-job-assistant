import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export default api

// SSE 流式请求
export async function fetchSSE(
  url: string,
  body: Record<string, unknown>,
  onEvent: (event: Record<string, unknown>) => void,
): Promise<void> {
  const response = await fetch(`/api${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  if (!response.body) throw new Error('No response body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // 切割 SSE 行（兼容 \n 和 \r\n）
    const lines = buffer.split(/\r?\n/)
    // 最后一行可能不完整，留到下次处理
    buffer = lines.pop() || ''

    for (const rawLine of lines) {
      // 去除可能的 \r（某些 HTTP 实现会残留）
      const line = rawLine.replace(/\r$/, '')
      if (!line.startsWith('data: ')) continue
      const jsonStr = line.slice(6).trim()
      if (!jsonStr) continue
      try {
        const data = JSON.parse(jsonStr)
        onEvent(data)
      } catch {
        // skip malformed JSON
      }
    }
  }
}
