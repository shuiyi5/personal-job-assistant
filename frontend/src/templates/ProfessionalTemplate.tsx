import type { ResumeData } from '../types/resume'

export interface TemplateProps {
  data: ResumeData
  scale?: number
}

const ProfessionalTemplate = ({ data, scale = 1 }: TemplateProps) => {
  const { personal, summary, work_experience, education, skills, projects, certifications, custom_sections } = data

  const contactItems: string[] = []
  if (personal.phone) contactItems.push(personal.phone)
  if (personal.email) contactItems.push(personal.email)
  if (personal.location) contactItems.push(personal.location)
  if (personal.website) contactItems.push(personal.website)
  if (personal.linkedin) contactItems.push(personal.linkedin)
  if (personal.github) contactItems.push(personal.github)

  return (
    <div
      className="tpl-professional"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      <style>{`
        .tpl-professional {
          width: 794px;
          min-height: 1123px;
          background: #ffffff;
          font-family: 'Georgia', 'Times New Roman', 'Songti SC', serif;
          color: #1a1a1a;
          line-height: 1.6;
          box-sizing: border-box;
        }
        .tpl-professional *, .tpl-professional *::before, .tpl-professional *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        .tpl-professional .prof-header {
          background: #1e3a5f;
          padding: 36px 48px 28px;
          color: #ffffff;
        }
        .tpl-professional .prof-header-name {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 2px;
          margin-bottom: 4px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        }
        .tpl-professional .prof-header-title {
          font-size: 14px;
          font-weight: 400;
          opacity: 0.9;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }
        .tpl-professional .prof-contact-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 18px;
          font-size: 11px;
          opacity: 0.85;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        }
        .tpl-professional .prof-contact-item {
          white-space: nowrap;
        }
        .tpl-professional .prof-body {
          padding: 28px 48px 40px;
        }
        .tpl-professional .prof-section {
          margin-bottom: 22px;
        }
        .tpl-professional .prof-section-title {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #1e3a5f;
          border-bottom: 2px solid #1e3a5f;
          padding-bottom: 5px;
          margin-bottom: 14px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        }
        .tpl-professional .prof-summary {
          font-size: 12.5px;
          color: #333333;
          line-height: 1.7;
          text-align: justify;
        }
        .tpl-professional .prof-entry {
          margin-bottom: 16px;
        }
        .tpl-professional .prof-entry:last-child {
          margin-bottom: 0;
        }
        .tpl-professional .prof-entry-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 2px;
        }
        .tpl-professional .prof-entry-main {
          font-size: 13.5px;
          font-weight: 700;
          color: #1a1a1a;
        }
        .tpl-professional .prof-entry-sub {
          font-size: 12.5px;
          color: #444444;
          font-style: italic;
        }
        .tpl-professional .prof-entry-date {
          font-size: 11.5px;
          color: #666666;
          white-space: nowrap;
          flex-shrink: 0;
          margin-left: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        }
        .tpl-professional .prof-entry-location {
          font-size: 11.5px;
          color: #666666;
        }
        .tpl-professional .prof-highlights {
          list-style: disc;
          padding-left: 20px;
          margin-top: 6px;
        }
        .tpl-professional .prof-highlights li {
          font-size: 12px;
          color: #333333;
          line-height: 1.6;
          margin-bottom: 2px;
        }
        .tpl-professional .prof-skills-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 24px;
        }
        .tpl-professional .prof-skill-group {
          font-size: 12px;
        }
        .tpl-professional .prof-skill-category {
          font-weight: 700;
          color: #1e3a5f;
          display: inline;
        }
        .tpl-professional .prof-skill-items {
          color: #333333;
          display: inline;
        }
        .tpl-professional .prof-cert-item {
          font-size: 12px;
          margin-bottom: 4px;
          color: #333333;
        }
        .tpl-professional .prof-cert-name {
          font-weight: 600;
        }
        .tpl-professional .prof-cert-detail {
          color: #666666;
          font-size: 11.5px;
        }
        .tpl-professional .prof-tech-stack {
          font-size: 11px;
          color: #1e3a5f;
          margin-top: 4px;
        }
        .tpl-professional .prof-custom-content {
          font-size: 12.5px;
          color: #333333;
          line-height: 1.7;
          white-space: pre-wrap;
        }
      `}</style>

      {/* Header */}
      <div className="prof-header">
        <div className="prof-header-name">{personal.name}</div>
        {personal.title && <div className="prof-header-title">{personal.title}</div>}
        {contactItems.length > 0 && (
          <div className="prof-contact-row">
            {contactItems.map((item, i) => (
              <span key={i} className="prof-contact-item">{item}</span>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="prof-body">
        {/* Summary */}
        {summary && (
          <div className="prof-section">
            <div className="prof-section-title">个人简介</div>
            <div className="prof-summary">{summary}</div>
          </div>
        )}

        {/* Work Experience */}
        {work_experience.length > 0 && (
          <div className="prof-section">
            <div className="prof-section-title">工作经历</div>
            {work_experience.map((exp, i) => (
              <div key={i} className="prof-entry">
                <div className="prof-entry-header">
                  <span className="prof-entry-main">{exp.company}</span>
                  <span className="prof-entry-date">{exp.start_date} - {exp.end_date}</span>
                </div>
                <div className="prof-entry-sub">
                  {exp.title}
                  {exp.location && <span className="prof-entry-location"> | {exp.location}</span>}
                </div>
                {exp.highlights.length > 0 && (
                  <ul className="prof-highlights">
                    {exp.highlights.map((h, j) => <li key={j}>{h}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Education */}
        {education.length > 0 && (
          <div className="prof-section">
            <div className="prof-section-title">教育背景</div>
            {education.map((edu, i) => (
              <div key={i} className="prof-entry">
                <div className="prof-entry-header">
                  <span className="prof-entry-main">{edu.institution}</span>
                  <span className="prof-entry-date">{edu.start_date} - {edu.end_date}</span>
                </div>
                <div className="prof-entry-sub">
                  {edu.degree} - {edu.field}
                  {edu.gpa && <span> | GPA: {edu.gpa}</span>}
                </div>
                {edu.highlights && edu.highlights.length > 0 && (
                  <ul className="prof-highlights">
                    {edu.highlights.map((h, j) => <li key={j}>{h}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="prof-section">
            <div className="prof-section-title">专业技能</div>
            <div className="prof-skills-grid">
              {skills.map((group, i) => (
                <div key={i} className="prof-skill-group">
                  <span className="prof-skill-category">{group.category}: </span>
                  <span className="prof-skill-items">{group.items.join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <div className="prof-section">
            <div className="prof-section-title">项目经验</div>
            {projects.map((proj, i) => (
              <div key={i} className="prof-entry">
                <div className="prof-entry-header">
                  <span className="prof-entry-main">
                    {proj.name}
                    {proj.role && <span style={{ fontWeight: 400, color: '#444' }}> - {proj.role}</span>}
                  </span>
                  {(proj.start_date || proj.end_date) && (
                    <span className="prof-entry-date">
                      {proj.start_date}{proj.start_date && proj.end_date && ' - '}{proj.end_date}
                    </span>
                  )}
                </div>
                <div className="prof-entry-sub">{proj.description}</div>
                {proj.highlights.length > 0 && (
                  <ul className="prof-highlights">
                    {proj.highlights.map((h, j) => <li key={j}>{h}</li>)}
                  </ul>
                )}
                {proj.tech_stack && proj.tech_stack.length > 0 && (
                  <div className="prof-tech-stack">Tech: {proj.tech_stack.join(' / ')}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Certifications */}
        {certifications.length > 0 && (
          <div className="prof-section">
            <div className="prof-section-title">证书与奖项</div>
            {certifications.map((cert, i) => (
              <div key={i} className="prof-cert-item">
                <span className="prof-cert-name">{cert.name}</span>
                {(cert.issuer || cert.date) && (
                  <span className="prof-cert-detail">
                    {cert.issuer && ` - ${cert.issuer}`}
                    {cert.date && ` (${cert.date})`}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Custom Sections */}
        {custom_sections && custom_sections.length > 0 && custom_sections.map((section, i) => (
          <div key={i} className="prof-section">
            <div className="prof-section-title">{section.title}</div>
            <div className="prof-custom-content">{section.content}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProfessionalTemplate
