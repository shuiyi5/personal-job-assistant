import type { ResumeData } from '../types/resume'

export interface TemplateProps {
  data: ResumeData
  scale?: number
}

const DEFAULT_MODULE_ORDER = ['summary', 'work_experience', 'education', 'skills', 'projects', 'certifications', 'custom_sections']

const SectionLabels: Record<string, string> = {
  summary: '个人简介',
  work_experience: '工作经历',
  education: '教育背景',
  skills: '专业技能',
  projects: '项目经验',
  certifications: '证书与奖项',
  custom_sections: '自定义章节',
}

const MinimalistTemplate = ({ data, scale = 1 }: TemplateProps) => {
  const { personal, summary, work_experience, education, skills, projects, certifications, custom_sections, module_order } = data

  const sections: string[] = module_order && module_order.length > 0
    ? module_order.filter(s => DEFAULT_MODULE_ORDER.includes(s))
    : DEFAULT_MODULE_ORDER

  const contactParts: string[] = []
  if (personal.email) contactParts.push(personal.email)
  if (personal.phone) contactParts.push(personal.phone)
  if (personal.location) contactParts.push(personal.location)
  if (personal.website) contactParts.push(personal.website)
  if (personal.linkedin) contactParts.push(personal.linkedin)
  if (personal.github) contactParts.push(personal.github)

  return (
    <div
      className="tpl-minimalist"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      <style>{`
        .tpl-minimalist {
          width: 794px;
          min-height: 1123px;
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', 'PingFang SC', sans-serif;
          color: #2c2c2c;
          line-height: 1.65;
          box-sizing: border-box;
          padding: 56px 60px 48px;
        }
        .tpl-minimalist *, .tpl-minimalist *::before, .tpl-minimalist *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        .tpl-minimalist .mini-top-line {
          width: 100%;
          height: 1px;
          background: #d0d0d0;
          margin-bottom: 36px;
        }
        .tpl-minimalist .mini-header {
          text-align: center;
          margin-bottom: 8px;
        }
        .tpl-minimalist .mini-name {
          font-size: 28px;
          font-weight: 300;
          letter-spacing: 4px;
          color: #1a1a1a;
          text-transform: uppercase;
        }
        .tpl-minimalist .mini-title {
          font-size: 13px;
          font-weight: 400;
          color: #888888;
          letter-spacing: 2px;
          margin-top: 6px;
        }
        .tpl-minimalist .mini-contact {
          text-align: center;
          margin-top: 12px;
          margin-bottom: 32px;
          font-size: 11px;
          color: #999999;
          letter-spacing: 0.5px;
        }
        .tpl-minimalist .mini-contact-divider {
          margin: 0 10px;
          color: #cccccc;
        }
        .tpl-minimalist .mini-section {
          margin-bottom: 26px;
        }
        .tpl-minimalist .mini-section-title {
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 3px;
          color: #aaaaaa;
          margin-bottom: 14px;
        }
        .tpl-minimalist .mini-summary {
          font-size: 12.5px;
          color: #444444;
          line-height: 1.8;
        }
        .tpl-minimalist .mini-entry {
          margin-bottom: 18px;
        }
        .tpl-minimalist .mini-entry:last-child {
          margin-bottom: 0;
        }
        .tpl-minimalist .mini-entry-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 1px;
        }
        .tpl-minimalist .mini-entry-main {
          font-size: 13.5px;
          font-weight: 600;
          color: #1a1a1a;
        }
        .tpl-minimalist .mini-entry-date {
          font-size: 11px;
          color: #aaaaaa;
          white-space: nowrap;
          flex-shrink: 0;
          margin-left: 12px;
        }
        .tpl-minimalist .mini-entry-sub {
          font-size: 12px;
          color: #777777;
          margin-bottom: 4px;
        }
        .tpl-minimalist .mini-highlights {
          list-style: none;
          padding-left: 0;
          margin-top: 6px;
        }
        .tpl-minimalist .mini-highlights li {
          font-size: 12px;
          color: #444444;
          line-height: 1.65;
          margin-bottom: 2px;
          padding-left: 14px;
          position: relative;
        }
        .tpl-minimalist .mini-highlights li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 8px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #cccccc;
        }
        .tpl-minimalist .mini-skills-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 20px;
        }
        .tpl-minimalist .mini-skill-group {
          font-size: 12px;
        }
        .tpl-minimalist .mini-skill-category {
          font-weight: 600;
          color: #555555;
        }
        .tpl-minimalist .mini-skill-items {
          color: #777777;
        }
        .tpl-minimalist .mini-cert-item {
          font-size: 12px;
          margin-bottom: 3px;
          color: #444444;
        }
        .tpl-minimalist .mini-cert-detail {
          color: #999999;
          font-size: 11px;
        }
        .tpl-minimalist .mini-tech-stack {
          font-size: 11px;
          color: #999999;
          margin-top: 4px;
        }
        .tpl-minimalist .mini-custom-content {
          font-size: 12.5px;
          color: #444444;
          line-height: 1.8;
          white-space: pre-wrap;
        }
      `}</style>

      <div className="mini-top-line" />

      {/* Header */}
      <div className="mini-header">
        <div className="mini-name">{personal.name}</div>
        {personal.title && <div className="mini-title">{personal.title}</div>}
      </div>

      {/* Contact */}
      {contactParts.length > 0 && (
        <div className="mini-contact">
          {contactParts.map((part, i) => (
            <span key={i}>
              {i > 0 && <span className="mini-contact-divider">|</span>}
              {part}
            </span>
          ))}
        </div>
      )}

      {/* Dynamic sections */}
      {sections.map(section => {
        if (section === 'summary' && summary) return (
          <div key="summary" className="mini-section">
            <div className="mini-section-title">{SectionLabels.summary}</div>
            <div className="mini-summary">{summary}</div>
          </div>
        )
        if (section === 'work_experience' && work_experience.length > 0) return (
          <div key="work_experience" className="mini-section">
            <div className="mini-section-title">{SectionLabels.work_experience}</div>
            {work_experience.map((exp, i) => (
              <div key={i} className="mini-entry">
                <div className="mini-entry-header">
                  <span className="mini-entry-main">{exp.company}</span>
                  <span className="mini-entry-date">{exp.start_date} - {exp.end_date}</span>
                </div>
                <div className="mini-entry-sub">
                  {exp.title}
                  {exp.location && ` / ${exp.location}`}
                </div>
                {exp.highlights.length > 0 && (
                  <ul className="mini-highlights">
                    {exp.highlights.map((h, j) => <li key={j}>{h}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )
        if (section === 'education' && education.length > 0) return (
          <div key="education" className="mini-section">
            <div className="mini-section-title">{SectionLabels.education}</div>
            {education.map((edu, i) => (
              <div key={i} className="mini-entry">
                <div className="mini-entry-header">
                  <span className="mini-entry-main">{edu.institution}</span>
                  <span className="mini-entry-date">{edu.start_date} - {edu.end_date}</span>
                </div>
                <div className="mini-entry-sub">
                  {edu.degree} - {edu.field}
                  {edu.gpa && ` | GPA: ${edu.gpa}`}
                </div>
                {edu.highlights && edu.highlights.length > 0 && (
                  <ul className="mini-highlights">
                    {edu.highlights.map((h, j) => <li key={j}>{h}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )
        if (section === 'skills' && skills.length > 0) return (
          <div key="skills" className="mini-section">
            <div className="mini-section-title">{SectionLabels.skills}</div>
            <div className="mini-skills-list">
              {skills.map((group, i) => (
                <div key={i} className="mini-skill-group">
                  <span className="mini-skill-category">{group.category}: </span>
                  <span className="mini-skill-items">{group.items.join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        )
        if (section === 'projects' && projects.length > 0) return (
          <div key="projects" className="mini-section">
            <div className="mini-section-title">{SectionLabels.projects}</div>
            {projects.map((proj, i) => (
              <div key={i} className="mini-entry">
                <div className="mini-entry-header">
                  <span className="mini-entry-main">
                    {proj.name}
                    {proj.role && <span style={{ fontWeight: 400, color: '#777' }}> - {proj.role}</span>}
                  </span>
                  {(proj.start_date || proj.end_date) && (
                    <span className="mini-entry-date">
                      {proj.start_date}{proj.start_date && proj.end_date && ' - '}{proj.end_date}
                    </span>
                  )}
                </div>
                <div className="mini-entry-sub">{proj.description}</div>
                {proj.highlights.length > 0 && (
                  <ul className="mini-highlights">
                    {proj.highlights.map((h, j) => <li key={j}>{h}</li>)}
                  </ul>
                )}
                {proj.tech_stack && proj.tech_stack.length > 0 && (
                  <div className="mini-tech-stack">{proj.tech_stack.join(' / ')}</div>
                )}
              </div>
            ))}
          </div>
        )
        if (section === 'certifications' && certifications.length > 0) return (
          <div key="certifications" className="mini-section">
            <div className="mini-section-title">{SectionLabels.certifications}</div>
            {certifications.map((cert, i) => (
              <div key={i} className="mini-cert-item">
                {cert.name}
                {(cert.issuer || cert.date) && (
                  <span className="mini-cert-detail">
                    {cert.issuer && ` - ${cert.issuer}`}
                    {cert.date && ` (${cert.date})`}
                  </span>
                )}
              </div>
            ))}
          </div>
        )
        if (section === 'custom_sections' && custom_sections && custom_sections.length > 0) return (
          <div key="custom_sections">
            {custom_sections.map((sec, i) => (
              <div key={i} className="mini-section">
                <div className="mini-section-title">{sec.title}</div>
                <div className="mini-custom-content">{sec.content}</div>
              </div>
            ))}
          </div>
        )
        return null
      })}
    </div>
  )
}

export default MinimalistTemplate
