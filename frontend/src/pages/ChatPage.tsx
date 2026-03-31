import { useEffect } from 'react'
import ChatWindow from '../components/Chat/ChatWindow'
import { useChatStore } from '../stores/chatStore'

export default function ChatPage() {
  const setPageContext = useChatStore(s => s.setPageContext)
  useEffect(() => { setPageContext('chat') }, [setPageContext])

  return (
    <div className="h-full">
      <ChatWindow />
    </div>
  )
}
