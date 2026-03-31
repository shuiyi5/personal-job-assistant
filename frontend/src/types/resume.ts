/** 模板标识 */
export type TemplateId =
  | 'professional'   // 专业商务
  | 'minimalist'     // 简约现代
  | 'creative'       // 创意设计
  | 'tech'           // 技术极客
  | 'academic'       // 学术研究
  | 'executive'      // 高管精英

/** 工作经历 */
export interface WorkExperience {
  company: string
  title: string
  location?: string
  start_date: string
  end_date: string
  highlights: string[]
}

/** 教育经历 */
export interface Education {
  institution: string
  degree: string
  field: string
  start_date: string
  end_date: string
  gpa?: string
  highlights?: string[]
}

/** 项目经验 */
export interface Project {
  name: string
  role?: string
  start_date?: string
  end_date?: string
  description: string
  highlights: string[]
  tech_stack?: string[]
}

/** 技能分组 */
export interface SkillGroup {
  category: string
  items: string[]
}

/** 证书/奖项 */
export interface Certification {
  name: string
  issuer?: string
  date?: string
  url?: string
}

/** 自定义分节 */
export interface CustomSection {
  title: string
  content: string
}

/** 完整结构化简历数据 */
export interface ResumeData {
  personal: {
    name: string
    phone?: string
    email?: string
    location?: string
    website?: string
    linkedin?: string
    github?: string
    avatar_url?: string
    title?: string
  }
  summary?: string
  work_experience: WorkExperience[]
  education: Education[]
  skills: SkillGroup[]
  projects: Project[]
  certifications: Certification[]
  custom_sections?: CustomSection[]
}

/** Agent 思考消息 */
export interface ThinkingMessage {
  id: string
  content: string
  timestamp: number
}
