import { useEffect } from 'react'
import DocumentUpload from '../components/Documents/DocumentUpload'
import DocumentList from '../components/Documents/DocumentList'
import { useChatStore } from '../stores/chatStore'

export default function DocumentsPage() {
  const setPageContext = useChatStore(s => s.setPageContext)
  useEffect(() => { setPageContext('documents') }, [setPageContext])

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div>
        <h2 className="text-xl font-bold text-gray-800">文档管理</h2>
        <p className="text-sm text-gray-500 mt-1">上传个人文档到知识库，Agent 将基于这些文档帮你完成简历和面试准备</p>
      </div>
      <DocumentUpload />
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3">已上传文档</h3>
        <DocumentList />
      </div>
    </div>
  )
}
