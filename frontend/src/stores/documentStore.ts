import { create } from 'zustand'
import api from '../services/api'

export interface DocInfo {
  doc_id: string
  filename: string
  doc_type: string
  chunk_count: number
  upload_date: string
  is_ocr?: boolean
}

interface DocumentState {
  documents: DocInfo[]
  isUploading: boolean
  fetchDocuments: (docType?: string) => Promise<void>
  uploadDocument: (file: File, docType: string) => Promise<void>
  deleteDocument: (docId: string) => Promise<void>
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  isUploading: false,

  fetchDocuments: async (docType?: string) => {
    const params = docType ? { doc_type: docType } : {}
    const res = await api.get('/documents', { params })
    set({ documents: res.data.documents })
  },

  uploadDocument: async (file: File, docType: string) => {
    set({ isUploading: true })
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('doc_type', docType)
      await api.post('/documents/upload', form)
      // 刷新列表
      const res = await api.get('/documents')
      set({ documents: res.data.documents })
    } finally {
      set({ isUploading: false })
    }
  },

  deleteDocument: async (docId: string) => {
    await api.delete(`/documents/${docId}`)
    set(s => ({ documents: s.documents.filter(d => d.doc_id !== docId) }))
  },
}))
