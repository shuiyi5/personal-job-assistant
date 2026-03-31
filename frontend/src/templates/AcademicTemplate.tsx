import type { ResumeData } from '../types/resume'

export interface TemplateProps {
  data: ResumeData
  scale?: number
}

const AcademicTemplate = ({ data, scale = 1 }: TemplateProps) => {
  const { personal, summary, work_experience, education, skills, projects, certifications, custom_sections } = data

  const contactParts: string[] = []
  if (personal.email) contactParts.push(personal.email)
  if (personal.phone) contactParts.push(personal.phone)
  if (personal.location) contactParts.push(personal.location)
  if (personal.website) contactParts.push(personal.website)
  if (personal.linkedin) contactParts.push(personal.linkedin)
  if (personal.github) contactParts.push(personal.github)

  return (
    <div
      className="tpl-academic"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      <style>{`
        .tpl-academic {
          width: 794px;
          min-height: 1123px;
          background: #ffffff;
          font-family: 'Georgia', 'Times New Roman', 'Songti SC', serif;
          color: #1a1a1a;
          line-height: 1.65;
          box-sizing: border-box;
          padding: 48px 56px 44px;
        }
        .tpl-academic *, .tpl-academic *::before, .tpl-academic *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        /* Header */
        .tpl-academic .acad-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .tpl-academic .acad-name {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 3px;
          color: #1a1a1a;
        }
        .tpl-academic .acad-title {
          font-size: 13px;
          color: #555555;
          margin-top: 4px;
          font-style: italic;
        }
        .tpl-academic .acad-contact {
          text-align: center;
          font-size: 11px;
          color: #666666;
          margin-top: 10px;
          margin-bottom: 6px;
        }
        .tpl-academic .acad-contact-divider {
          margin: 0 8px;
          color: #aaaaaa;
        }
        .tpl-academic .acad-header-line {
          width: 100%;
          height: 1px;
          background: #333333;
          margin-top: 14px;
        }

        /* Sections */
        .tpl-academic .acad-section {
          margin-bottom: 18px;
        }
        .tpl-academic .acad-section-title {
          font-size: 14px;
          font-weight: 700;
          font-variant: small-caps;
          letter-spacing: 1.5px;
          color: #1a1a1a;
          border-bottom: 1px solid #333333;
          padding-bottom: 4px;
          margin-bottom: 12px;
        }
        .tpl-academic .acad-summary {
          font-size: 12.5px;
          color: #333333;
          line-height: 1.75;
          text-indent: 2em;
          text-align: justify;
        }

        /* Entries */
        .tpl-academic .acad-entry {
          margin-bottom: 14px;
          padding-left: 0;
        }
        .tpl-academic .acad-entry:last-child {
          margin-bottom: 0;
        }
        .tpl-academic .acad-entry-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .tpl-academic .acad-entry-main {
          font-size: 13px;
          font-weight: 700;
          color: #1a1a1a;
        }
        .tpl-academic .acad-entry-date {
          font-size: 11.5px;
          color: #555555;
          white-space: nowrap;
          flex-shrink: 0;
          margin-left: 12px;
          font-style: italic;
        }
        .tpl-academic .acad-entry-sub {
          font-size: 12px;
          color: #444444;
          font-style: italic;
          margin-bottom: 3px;
        }
        .tpl-academic .acad-entry-desc {
          font-size: 12px;
          color: #444444;
          margin-bottom: 4px;
        }
        .tpl-academic .acad-highlights {
          list-style: disc;
          padding-left: 28px;
          margin-top: 4px;
        }
        .tpl-academic .acad-highlights li {
          font-size: 12px;
          color: #333333;
          line-height: 1.65;
          margin-bottom: 2px;
        }

        /* Skills */
        .tpl-academic .acad-skills-list {
          padding-left: 28px;
        }
        .tpl-academic .acad-skill-group {
          font-size: 12px;
          margin-bottom: 4px;
        }
        .tpl-academic .acad-skill-category {
          font-weight: 700;
          color: #1a1a1a;
        }
        .tpl-academic .acad-skill-items {
          color: #333333;
        }

        /* Certs */
        .tpl-academic .acad-cert-list {
          padding-left: 28px;
        }
        .tpl-academic .acad-cert-item {
          font-size: 12px;
          margin-bottom: 3px;
          color: #333333;
        }
        .tpl-academic .acad-cert-detail {
          font-style: italic;
          color: #666666;
          font-size: 11.5px;
        }

        /* Tech stack */
        .tpl-academic .acad-tech-stack {
          font-size: 11px;
          color: #555555;
          font-style: italic;
          margin-top: 4px;
          padding-left: 28px;
        }

        /* Custom */
        .tpl-academic .acad-custom-content {
          font-size: 12.5px;
          color: #333333;
          line-height: 1.75;
          text-indent: 2em;
          text-align: justify;
          white-space: pre-wrap;
        }
      `}</style>

      {/* Header */}
      <div className="acad-header">
        <div className="acad-name">{personal.name}</div>
        {personal.title && <div className="acad-title">{personal.title}</div>}
        {contactParts.length > 0 && (
          <div className="acad-contact">
            {contactParts.map((part, i) => (
              <span key={i}>
                {i > 0 && <span className="acad-contact-divider">|</span>}
                {part}
              </span>
            ))}
          </div>
        )}
        <div className="acad-header-line" />
      </div>

      {/* Summary */}
      {summary && (
        <div className="acad-section">
          <div className="acad-section-title">个人简介</div>
          <div className="acad-summary">{summary}</div>
        </div>
      )}

      {/* Education (first for academic CV) */}
      {education.length > 0 && (
        <div className="acad-section">
          <div className="acad-section-title">教育背景</div>
          {education.map((edu, i) => (
            <div key={i} className="acad-entry">
              <div className="acad-entry-header">
                <span className="acad-entry-main">{edu.institution}</span>
                <span className="acad-entry-date">{edu.start_date} - {edu.end_date}</span>
              </div>
              <div className="acad-entry-sub">
                {edu.degree}, {edu.field}
                {edu.gpa && ` — GPA: ${edu.gpa}`}
              </div>
              {edu.highlights && edu.highlights.length > 0 && (
                <ul className="acad-highlights">
                  {edu.highlights.map((h, j) => <li key={j}>{h}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Work Experience */}
      {work_experience.length > 0 && (
        <div className="acad-section">
          <div className="acad-section-title">工作经历</div>
          {work_experience.map((exp, i) => (
            <div key={i} className="acad-entry">
              <div className="acad-entry-header">
                <span className="acad-entry-main">{exp.company}</span>
                <span className="acad-entry-date">{exp.start_date} - {exp.end_date}</span>
              </div>
              <div className="acad-entry-sub">
                {exp.title}
                {exp.location && `, ${exp.location}`}
              </div>
              {exp.highlights.length > 0 && (
                <ul className="acad-highlights">
                  {exp.highlights.map((h, j) => <li key={j}>{h}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div className="acad-section">
          <div className="acad-section-title">项目经验</div>
          {projects.map((proj, i) => (
            <div key={i} className="acad-entry">
              <div className="acad-entry-header">
                <span className="acad-entry-main">
                  {proj.name}
                  {proj.role && <span style={{ fontWeight: 400, fontStyle: 'italic' }}> ({proj.role})</span>}
                </span>
                {(proj.start_date || proj.end_date) && (
                  <span className="acad-entry-date">
                    {proj.start_date}{proj.start_date && proj.end_date && ' - '}{proj.end_date}
                  </span>
                )}
              </div>
              <div className="acad-entry-desc">{proj.description}</div>
              {proj.highlights.length > 0 && (
                <ul className="acad-highlights">
                  {proj.highlights.map((h, j) => <li key={j}>{h}</li>)}
                </ul>
              )}
              {proj.tech_stack && proj.tech_stack.length > 0 && (
                <div className="acad-tech-stack">Technologies: {proj.tech_stack.join(', ')}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="acad-section">
          <div className="acad-section-title">专业技能</div>
          <div className="acad-skills-list">
            {skills.map((group, i) => (
              <div key={i} className="acad-skill-group">
                <span className="acad-skill-category">{group.category}: </span>
                <span className="acad-skill-items">{group.items.join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <div className="acad-section">
          <div className="acad-section-title">证书与奖项</div>
          <div className="acad-cert-list">
            {certifications.map((cert, i) => (
              <div key={i} className="acad-cert-item">
                {cert.name}
                {(cert.issuer || cert.date) && (
                  <span className="acad-cert-detail">
                    {cert.issuer && ` — ${cert.issuer}`}
                    {cert.date && `, ${cert.date}`}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Sections */}
      {custom_sections && custom_sections.length > 0 && custom_sections.map((section, i) => (
        <div key={i} className="acad-section">
          <div className="acad-section-title">{section.title}</div>
          <div className="acad-custom-content">{section.content}</div>
        </div>
      ))}
    </div>
  )
}

export default AcademicTemplate
