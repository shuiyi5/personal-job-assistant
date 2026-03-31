import { create } from 'zustand'
import { fetchSSE } from '../services/api'

interface InterviewState {
  questions: string
  evaluation: string
  isLoading: boolean
  generateQuestions: (category: string, difficulty: string, count: number, topic: string) => Promise<void>
  evaluateAnswer: (question: string, answer: string) => Promise<void>
}

export const useInterviewStore = create<InterviewState>((set) => ({
  questions: '',
  evaluation: '',
  isLoading: false,

  generateQuestions: async (category, difficulty, count, topic) => {
    set({ isLoading: true, questions: '' })
    try {
      await fetchSSE('/interview/questions', { category, difficulty, count, topic }, (event) => {
        if (event.type === 'text' && event.content) {
          set(s => ({ questions: s.questions + event.content }))
        }
      })
    } finally {
      set({ isLoading: false })
    }
  },

  evaluateAnswer: async (question, answer) => {
    set({ isLoading: true, evaluation: '' })
    try {
      await fetchSSE('/interview/evaluate', { question, answer }, (event) => {
        if (event.type === 'text' && event.content) {
          set(s => ({ evaluation: s.evaluation + event.content }))
        }
      })
    } finally {
      set({ isLoading: false })
    }
  },
}))
