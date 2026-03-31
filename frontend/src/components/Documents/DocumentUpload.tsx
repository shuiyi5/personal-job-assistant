import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Loader2 } from 'lucide-react'
import { useDocumentStore } from '../../stores/documentStore'

export default function DocumentUpload() {
  const { uploadDocument, isUploading } = useDocumentStore()
  const [docType, setDocType] = useState('general')

  const onDrop = useCallback(async (files: File[]) => {
    for (const file of files) {
      await uploadDocument(file, docType)
    }
  }, [uploadDocument, docType])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    disabled: isUploading,
  })

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <label className="text-sm text-gray-600">文档类型:</label>
        <select
          value={docType}
          onChange={e => setDocType(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="general">通用</option>
          <option value="resume">简历</option>
          <option value="project">项目描述</option>
          <option value="certificate">证书/证明</option>
        </select>
      </div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-primary-500" size={32} />
            <p className="text-sm text-gray-500">正在上传并索引...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="text-gray-400" size={32} />
            <p className="text-sm text-gray-600">
              {isDragActive ? '释放文件以上传' : '拖拽文件到此处，或点击选择'}
            </p>
            <p className="text-xs text-gray-400">支持 PDF, DOCX, TXT, MD</p>
          </div>
        )}
      </div>
    </div>
  )
}
