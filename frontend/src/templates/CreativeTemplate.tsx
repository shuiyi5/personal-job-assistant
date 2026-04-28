import type { ResumeData } from '../types/resume'

export interface TemplateProps {
  data: ResumeData
  scale?: number
}

const DEFAULT_MODULE_ORDER = ['summary', 'work_experience', 'education', 'projects', 'certifications', 'skills', 'custom_sections']

const SectionLabels: Record<string, string> = {
  summary: '个人简介',
  work_experience: '工作经历',
  education: '教育背景',
  skills: '专业技能',
  projects: '项目经验',
  certifications: '证书与奖项',
  custom_sections: '自定义章节',
}

// CreativeTemplate: sidebar shows skills + certs always; main body follows module_order
const CreativeTemplate = ({ data, scale = 1 }: TemplateProps) => {
  const { personal, summary, work_experience, education, skills, projects, certifications, custom_sections, module_order } = data

  const sections: string[] = module_order && module_order.length > 0
    ? module_order.filter(s => DEFAULT_MODULE_ORDER.includes(s))
    : DEFAULT_MODULE_ORDER

  const mainContactItems: { label: string; value: string }[] = []
  if (personal.email) mainContactItems.push({ label: 'Email', value: personal.email })
  if (personal.phone) mainContactItems.push({ label: 'Phone', value: personal.phone })
  if (personal.location) mainContactItems.push({ label: 'Location', value: personal.location })
  if (personal.website) mainContactItems.push({ label: 'Website', value: personal.website })
  if (personal.linkedin) mainContactItems.push({ label: 'LinkedIn', value: personal.linkedin })
  if (personal.github) mainContactItems.push({ label: 'GitHub', value: personal.github })

  return (
    <div
      className="tpl-creative"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      <style>{`
        .tpl-creative {
          width: 794px;
          min-height: 1123px;
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', 'PingFang SC', sans-serif;
          color: #2c2c2c;
          line-height: 1.6;
          box-sizing: border-box;
          display: flex;
        }
        .tpl-creative *, .tpl-creative *::before, .tpl-creative *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        /* Sidebar */
        .tpl-creative .crv-sidebar {
          width: 30%;
          min-height: 1123px;
          background: linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%);
          color: #ffffff;
          padding: 40px 22px 32px;
          flex-shrink: 0;
        }
        .tpl-creative .crv-avatar-wrapper {
          text-align: center;
          margin-bottom: 20px;
        }
        .tpl-creative .crv-avatar {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.5);
          object-fit: cover;
        }
        .tpl-creative .crv-sidebar-name {
          font-size: 20px;
          font-weight: 700;
          text-align: center;
          margin-bottom: 4px;
          letter-spacing: 1px;
        }
        .tpl-creative .crv-sidebar-title {
          font-size: 11.5px;
          text-align: center;
          opacity: 0.85;
          margin-bottom: 24px;
          letter-spacing: 0.5px;
        }
        .tpl-creative .crv-sidebar-section {
          margin-bottom: 22px;
        }
        .tpl-creative .crv-sidebar-section-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          opacity: 0.7;
          margin-bottom: 10px;
          border-bottom: 1px solid rgba(255,255,255,0.25);
          padding-bottom: 5px;
        }
        .tpl-creative .crv-contact-item {
          font-size: 11px;
          margin-bottom: 7px;
          line-height: 1.4;
          word-break: break-all;
        }
        .tpl-creative .crv-contact-label {
          font-weight: 600;
          font-size: 9.5px;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.7;
          display: block;
          margin-bottom: 1px;
        }
        .tpl-creative .crv-skill-group {
          margin-bottom: 10px;
        }
        .tpl-creative .crv-skill-category {
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .tpl-creative .crv-skill-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .tpl-creative .crv-skill-tag {
          font-size: 9.5px;
          background: rgba(255,255,255,0.18);
          padding: 2px 8px;
          border-radius: 10px;
          white-space: nowrap;
        }
        .tpl-creative .crv-sidebar-certs {
          font-size: 11px;
        }
        .tpl-creative .crv-sidebar-cert {
          margin-bottom: 6px;
          line-height: 1.4;
        }
        .tpl-creative .crv-sidebar-cert-detail {
          font-size: 9.5px;
          opacity: 0.7;
        }

        /* Main content */
        .tpl-creative .crv-main {
          width: 70%;
          padding: 36px 36px 40px 32px;
        }
        .tpl-creative .crv-section {
          margin-bottom: 22px;
        }
        .tpl-creative .crv-section-title {
          font-size: 14px;
          font-weight: 700;
          color: #6366f1;
          letter-spacing: 1.5px;
          margin-bottom: 12px;
          text-transform: uppercase;
        }
        .tpl-creative .crv-summary {
          font-size: 12.5px;
          color: #444444;
          line-height: 1.75;
        }
        .tpl-creative .crv-entry {
          margin-bottom: 16px;
          padding-left: 14px;
          border-left: 3px solid #8b5cf6;
        }
        .tpl-creative .crv-entry:last-child {
          margin-bottom: 0;
        }
        .tpl-creative .crv-entry-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .tpl-creative .crv-entry-main {
          font-size: 13.5px;
          font-weight: 700;
          color: #1a1a1a;
        }
        .tpl-creative .crv-entry-date {
          font-size: 11px;
          color: #999999;
          white-space: nowrap;
          flex-shrink: 0;
          margin-left: 10px;
        }
        .tpl-creative .crv-entry-sub {
          font-size: 12px;
          color: #6366f1;
          font-weight: 500;
          margin-bottom: 4px;
        }
        .tpl-creative .crv-entry-desc {
          font-size: 12px;
          color: #555555;
          margin-bottom: 4px;
        }
        .tpl-creative .crv-highlights {
          list-style: none;
          padding-left: 0;
          margin-top: 4px;
        }
        .tpl-creative .crv-highlights li {
          font-size: 11.5px;
          color: #444444;
          line-height: 1.6;
          margin-bottom: 2px;
          padding-left: 12px;
          position: relative;
        }
        .tpl-creative .crv-highlights li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 7px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #8b5cf6;
        }
        .tpl-creative .crv-tech-stack {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 6px;
        }
        .tpl-creative .crv-tech-tag {
          font-size: 9.5px;
          color: #6366f1;
          border: 1px solid #c7d2fe;
          padding: 1px 7px;
          border-radius: 8px;
          background: #eef2ff;
        }
        .tpl-creative .crv-custom-content {
          font-size: 12.5px;
          color: #444444;
          line-height: 1.75;
          white-space: pre-wrap;
        }
      `}</style>

      {/* Sidebar */}
      <div className="crv-sidebar">
        {personal.avatar_url && (
          <div className="crv-avatar-wrapper">
            <img className="crv-avatar" src={personal.avatar_url} alt={personal.name} />
          </div>
        )}
        <div className="crv-sidebar-name">{personal.name}</div>
        {personal.title && <div className="crv-sidebar-title">{personal.title}</div>}

        {/* Contact */}
        {mainContactItems.length > 0 && (
          <div className="crv-sidebar-section">
            <div className="crv-sidebar-section-title">联系方式</div>
            {mainContactItems.map((item, i) => (
              <div key={i} className="crv-contact-item">
                <span className="crv-contact-label">{item.label}</span>
                {item.value}
              </div>
            ))}
          </div>
        )}

        {/* Skills in sidebar */}
        {skills.length > 0 && (
          <div className="crv-sidebar-section">
            <div className="crv-sidebar-section-title">专业技能</div>
            {skills.map((group, i) => (
              <div key={i} className="crv-skill-group">
                <div className="crv-skill-category">{group.category}</div>
                <div className="crv-skill-tags">
                  {group.items.map((item, j) => (
                    <span key={j} className="crv-skill-tag">{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Certifications in sidebar */}
        {certifications.length > 0 && (
          <div className="crv-sidebar-section">
            <div className="crv-sidebar-section-title">证书与奖项</div>
            <div className="crv-sidebar-certs">
              {certifications.map((cert, i) => (
                <div key={i} className="crv-sidebar-cert">
                  {cert.name}
                  {(cert.issuer || cert.date) && (
                    <div className="crv-sidebar-cert-detail">
                      {cert.issuer}{cert.issuer && cert.date && ' | '}{cert.date}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content — follows module_order; skills/certs are in sidebar so skip them here */}
      <div className="crv-main">
        {sections.map(section => {
          // skills + certs are always in sidebar — skip in main body
          if (section === 'skills' || section === 'certifications') return null
          if (section === 'summary' && summary) return (
            <div key="summary" className="crv-section">
              <div className="crv-section-title">{SectionLabels.summary}</div>
              <div className="crv-summary">{summary}</div>
            </div>
          )
          if (section === 'work_experience' && work_experience.length > 0) return (
            <div key="work_experience" className="crv-section">
              <div className="crv-section-title">{SectionLabels.work_experience}</div>
              {work_experience.map((exp, i) => (
                <div key={i} className="crv-entry">
                  <div className="crv-entry-header">
                    <span className="crv-entry-main">{exp.company}</span>
                    <span className="crv-entry-date">{exp.start_date} - {exp.end_date}</span>
                  </div>
                  <div className="crv-entry-sub">{exp.title}{exp.location && ` | ${exp.location}`}</div>
                  {exp.highlights.length > 0 && (
                    <ul className="crv-highlights">{exp.highlights.map((h, j) => <li key={j}>{h}</li>)}</ul>
                  )}
                </div>
              ))}
            </div>
          )
          if (section === 'education' && education.length > 0) return (
            <div key="education" className="crv-section">
              <div className="crv-section-title">{SectionLabels.education}</div>
              {education.map((edu, i) => (
                <div key={i} className="crv-entry">
                  <div className="crv-entry-header">
                    <span className="crv-entry-main">{edu.institution}</span>
                    <span className="crv-entry-date">{edu.start_date} - {edu.end_date}</span>
                  </div>
                  <div className="crv-entry-sub">{edu.degree} - {edu.field}{edu.gpa && ` | GPA: ${edu.gpa}`}</div>
                  {edu.highlights && edu.highlights.length > 0 && (
                    <ul className="crv-highlights">{edu.highlights.map((h, j) => <li key={j}>{h}</li>)}</ul>
                  )}
                </div>
              ))}
            </div>
          )
          if (section === 'projects' && projects.length > 0) return (
            <div key="projects" className="crv-section">
              <div className="crv-section-title">{SectionLabels.projects}</div>
              {projects.map((proj, i) => (
                <div key={i} className="crv-entry">
                  <div className="crv-entry-header">
                    <span className="crv-entry-main">{proj.name}{proj.role && <span style={{ fontWeight: 400 }}> - {proj.role}</span>}</span>
                    {(proj.start_date || proj.end_date) && (
                      <span className="crv-entry-date">{proj.start_date}{proj.start_date && proj.end_date && ' - '}{proj.end_date}</span>
                    )}
                  </div>
                  <div className="crv-entry-desc">{proj.description}</div>
                  {proj.highlights.length > 0 && (
                    <ul className="crv-highlights">{proj.highlights.map((h, j) => <li key={j}>{h}</li>)}</ul>
                  )}
                  {proj.tech_stack && proj.tech_stack.length > 0 && (
                    <div className="crv-tech-stack">{proj.tech_stack.map((t, j) => <span key={j} className="crv-tech-tag">{t}</span>)}</div>
                  )}
                </div>
              ))}
            </div>
          )
          if (section === 'custom_sections' && custom_sections && custom_sections.length > 0) return (
            <div key="custom_sections">
              {custom_sections.map((sec, i) => (
                <div key={i} className="crv-section">
                  <div className="crv-section-title">{sec.title}</div>
                  <div className="crv-custom-content">{sec.content}</div>
                </div>
              ))}
            </div>
          )
          return null
        })}
      </div>
    </div>
  )
}

export default CreativeTemplate
