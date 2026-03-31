import { create } from 'zustand'
import api from '../services/api'

export interface DocInfo {
  doc_id: string
  filename: string
  doc_type: string
  chunk_count: number
  upload_date: string
}

interface DocumentState {
  documents: DocInfo[]
  isUploading: boolean
  fetchDocuments: () => Promise<void>
  uploadDocument: (file: File, docType: string) => Promise<void>
  deleteDocument: (docId: string) => Promise<void>
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  isUploading: false,

  fetchDocuments: async () => {
    const res = await api.get('/documents')
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
