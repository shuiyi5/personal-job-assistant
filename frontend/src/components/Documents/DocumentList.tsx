import { useEffect, useState } from 'react'
import { FileText, Trash2 } from 'lucide-react'
import { useDocumentStore } from '../../stores/documentStore'

const DOC_TYPE_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'general', label: '通用' },
  { value: 'resume', label: '简历' },
  { value: 'project', label: '项目' },
  { value: 'certificate', label: '证书' },
]

const TYPE_LABELS: Record<string, string> = {
  general: '通用',
  resume: '简历',
  project: '项目',
  certificate: '证书',
}

export default function DocumentList() {
  const { documents, fetchDocuments, deleteDocument } = useDocumentStore()
  const [selectedType, setSelectedType] = useState('')

  useEffect(() => {
    fetchDocuments(selectedType || undefined)
  }, [fetchDocuments, selectedType])

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(e.target.value)
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-gray-500">筛选类型:</span>
        <select
          value={selectedType}
          onChange={handleTypeChange}
          className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {DOC_TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
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
                {TYPE_LABELS[doc.doc_type] || doc.doc_type}
              </span>
              {doc.chunk_count > 0 && (
                <span className="text-gray-400">{doc.chunk_count} 个文本块</span>
              )}
              {doc.is_ocr && (
                <span className="bg-blue-50 text-blue-500 px-2 py-0.5 rounded">OCR</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
