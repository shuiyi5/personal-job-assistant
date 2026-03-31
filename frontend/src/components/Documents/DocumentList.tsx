import { useEffect } from 'react'
import { FileText, Trash2 } from 'lucide-react'
import { useDocumentStore } from '../../stores/documentStore'

export default function DocumentList() {
  const { documents, fetchDocuments, deleteDocument } = useDocumentStore()

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <FileText size={48} className="mx-auto mb-2 opacity-50" />
        <p>知识库为空，请上传文档</p>
      </div>
    )
  }

  const typeLabels: Record<string, string> = {
    general: '通用', resume: '简历', project: '项目', certificate: '证书',
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map(doc => (
        <div
          key={doc.doc_id}
          className="border rounded-xl p-4 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={20} className="text-primary-500 flex-shrink-0" />
              <span className="text-sm font-medium truncate">{doc.filename}</span>
            </div>
            <button
              onClick={() => deleteDocument(doc.doc_id)}
              className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="bg-gray-100 px-2 py-0.5 rounded">
              {typeLabels[doc.doc_type] || doc.doc_type}
            </span>
            {doc.chunk_count > 0 && (
              <span className="text-gray-400">{doc.chunk_count} 个文本块</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
