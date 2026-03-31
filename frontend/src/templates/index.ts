import type { ComponentType } from 'react'
import type { ResumeData, TemplateId } from '../types/resume'

import ProfessionalTemplate from './ProfessionalTemplate'
import MinimalistTemplate from './MinimalistTemplate'
import CreativeTemplate from './CreativeTemplate'
import TechTemplate from './TechTemplate'
import AcademicTemplate from './AcademicTemplate'
import ExecutiveTemplate from './ExecutiveTemplate'

export interface TemplateMeta {
  id: TemplateId
  name: string
  description: string
  primaryColor: string
}

export interface TemplateProps {
  data: ResumeData
  scale?: number
}

export interface TemplateEntry {
  meta: TemplateMeta
  component: ComponentType<TemplateProps>
}

export const TEMPLATES: Record<TemplateId, TemplateEntry> = {
  professional: {
    meta: {
      id: 'professional',
      name: '专业商务',
      description: '经典商务风格，深蓝色调，适合传统行业与管理岗位',
      primaryColor: '#1e3a5f',
    },
    component: ProfessionalTemplate,
  },
  minimalist: {
    meta: {
      id: 'minimalist',
      name: '简约现代',
      description: '极简设计，大量留白，适合设计师与内容创作者',
      primaryColor: '#2c2c2c',
    },
    component: MinimalistTemplate,
  },
  creative: {
    meta: {
      id: 'creative',
      name: '创意设计',
      description: '紫色渐变侧栏双栏布局，视觉冲击力强，适合创意与市场岗位',
      primaryColor: '#6366f1',
    },
    component: CreativeTemplate,
  },
  tech: {
    meta: {
      id: 'tech',
      name: '技术极客',
      description: '暗色主题搭配青色高亮，终端风格标签，适合工程师与开发者',
      primaryColor: '#22d3ee',
    },
    component: TechTemplate,
  },
  academic: {
    meta: {
      id: 'academic',
      name: '学术研究',
      description: '传统学术简历样式，小型大写字母标题，适合科研与教育领域',
      primaryColor: '#1a1a1a',
    },
    component: AcademicTemplate,
  },
  executive: {
    meta: {
      id: 'executive',
      name: '高管精英',
      description: '金色装饰线条与宽松排版，高端优雅，适合高级管理与咨询岗位',
      primaryColor: '#b8860b',
    },
    component: ExecutiveTemplate,
  },
}

/** All template IDs in display order */
export const TEMPLATE_IDS: TemplateId[] = [
  'professional',
  'minimalist',
  'creative',
  'tech',
  'academic',
  'executive',
]

/** All template meta entries in display order */
export const TEMPLATE_LIST: TemplateMeta[] = TEMPLATE_IDS.map(
  (id) => TEMPLATES[id].meta
)

export {
  ProfessionalTemplate,
  MinimalistTemplate,
  CreativeTemplate,
  TechTemplate,
  AcademicTemplate,
  ExecutiveTemplate,
}
