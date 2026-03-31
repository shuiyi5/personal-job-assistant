import type { ResumeData } from '../types/resume'

export interface TemplateProps {
  data: ResumeData
  scale?: number
}

const ExecutiveTemplate = ({ data, scale = 1 }: TemplateProps) => {
  const { personal, summary, work_experience, education, skills, projects, certifications, custom_sections } = data

  const contactParts: string[] = []
  if (personal.phone) contactParts.push(personal.phone)
  if (personal.email) contactParts.push(personal.email)
  if (personal.location) contactParts.push(personal.location)
  if (personal.website) contactParts.push(personal.website)
  if (personal.linkedin) contactParts.push(personal.linkedin)
  if (personal.github) contactParts.push(personal.github)

  return (
    <div
      className="tpl-executive"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      <style>{`
        .tpl-executive {
          width: 794px;
          min-height: 1123px;
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', 'PingFang SC', sans-serif;
          color: #2a2a2a;
          line-height: 1.65;
          box-sizing: border-box;
          padding: 52px 56px 44px;
        }
        .tpl-executive *, .tpl-executive *::before, .tpl-executive *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        /* Header */
        .tpl-executive .exec-header {
          text-align: center;
          margin-bottom: 10px;
        }
        .tpl-executive .exec-name {
          font-size: 26px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 5px;
          color: #1a1a1a;
        }
        .tpl-executive .exec-title {
          font-size: 13px;
          font-weight: 400;
          color: #b8860b;
          letter-spacing: 2px;
          margin-top: 6px;
          text-transform: uppercase;
        }
        .tpl-executive .exec-contact {
          text-align: center;
          margin-top: 14px;
          font-size: 11px;
          color: #777777;
        }
        .tpl-executive .exec-contact-divider {
          margin: 0 12px;
          color: #b8860b;
        }
        .tpl-executive .exec-gold-line {
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, #b8860b 20%, #b8860b 80%, transparent 100%);
          margin-top: 18px;
          margin-bottom: 28px;
        }

        /* Sections */
        .tpl-executive .exec-section {
          margin-bottom: 26px;
        }
        .tpl-executive .exec-section-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 3px;
          color: #b8860b;
          margin-bottom: 14px;
          padding-bottom: 6px;
          border-bottom: 1px solid #e8dcc8;
        }

        /* Summary with gold left border */
        .tpl-executive .exec-summary {
          font-size: 12.5px;
          color: #444444;
          line-height: 1.8;
          padding: 12px 0 12px 18px;
          border-left: 3px solid #b8860b;
          background: #fdfcfa;
        }

        /* Entries */
        .tpl-executive .exec-entry {
          margin-bottom: 20px;
        }
        .tpl-executive .exec-entry:last-child {
          margin-bottom: 0;
        }
        .tpl-executive .exec-entry-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 2px;
        }
        .tpl-executive .exec-entry-main {
          font-size: 14px;
          font-weight: 700;
          color: #1a1a1a;
        }
        .tpl-executive .exec-entry-date {
          font-size: 11px;
          color: #999999;
          white-space: nowrap;
          flex-shrink: 0;
          margin-left: 12px;
          letter-spacing: 0.5px;
        }
        .tpl-executive .exec-entry-sub {
          font-size: 12.5px;
          color: #b8860b;
          font-weight: 500;
          margin-bottom: 4px;
        }
        .tpl-executive .exec-entry-desc {
          font-size: 12px;
          color: #555555;
          margin-bottom: 4px;
        }
        .tpl-executive .exec-highlights {
          list-style: none;
          padding-left: 0;
          margin-top: 6px;
        }
        .tpl-executive .exec-highlights li {
          font-size: 12px;
          color: #444444;
          line-height: 1.7;
          margin-bottom: 3px;
          padding-left: 18px;
          position: relative;
        }
        .tpl-executive .exec-highlights li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 8px;
          width: 8px;
          height: 1px;
          background: #b8860b;
        }

        /* Skills */
        .tpl-executive .exec-skills-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 28px;
        }
        .tpl-executive .exec-skill-group {
          font-size: 12px;
        }
        .tpl-executive .exec-skill-category {
          font-weight: 700;
          color: #1a1a1a;
          display: block;
          margin-bottom: 2px;
        }
        .tpl-executive .exec-skill-items {
          color: #555555;
          display: block;
        }

        /* Certs */
        .tpl-executive .exec-cert-item {
          font-size: 12px;
          margin-bottom: 5px;
          color: #333333;
          padding-left: 18px;
          position: relative;
        }
        .tpl-executive .exec-cert-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 7px;
          width: 6px;
          height: 6px;
          border: 1px solid #b8860b;
          border-radius: 1px;
          transform: rotate(45deg);
        }
        .tpl-executive .exec-cert-name {
          font-weight: 600;
        }
        .tpl-executive .exec-cert-detail {
          color: #888888;
          font-size: 11.5px;
        }

        /* Tech stack */
        .tpl-executive .exec-tech-stack {
          font-size: 11px;
          color: #888888;
          margin-top: 4px;
        }

        /* Custom */
        .tpl-executive .exec-custom-content {
          font-size: 12.5px;
          color: #444444;
          line-height: 1.8;
          white-space: pre-wrap;
        }
      `}</style>

      {/* Header */}
      <div className="exec-header">
        <div className="exec-name">{personal.name}</div>
        {personal.title && <div className="exec-title">{personal.title}</div>}
        {contactParts.length > 0 && (
          <div className="exec-contact">
            {contactParts.map((part, i) => (
              <span key={i}>
                {i > 0 && <span className="exec-contact-divider">|</span>}
                {part}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="exec-gold-line" />

      {/* Summary */}
      {summary && (
        <div className="exec-section">
          <div className="exec-section-title">个人简介</div>
          <div className="exec-summary">{summary}</div>
        </div>
      )}

      {/* Work Experience */}
      {work_experience.length > 0 && (
        <div className="exec-section">
          <div className="exec-section-title">工作经历</div>
          {work_experience.map((exp, i) => (
            <div key={i} className="exec-entry">
              <div className="exec-entry-header">
                <span className="exec-entry-main">{exp.company}</span>
                <span className="exec-entry-date">{exp.start_date} - {exp.end_date}</span>
              </div>
              <div className="exec-entry-sub">
                {exp.title}
                {exp.location && ` | ${exp.location}`}
              </div>
              {exp.highlights.length > 0 && (
                <ul className="exec-highlights">
                  {exp.highlights.map((h, j) => <li key={j}>{h}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <div className="exec-section">
          <div className="exec-section-title">教育背景</div>
          {education.map((edu, i) => (
            <div key={i} className="exec-entry">
              <div className="exec-entry-header">
                <span className="exec-entry-main">{edu.institution}</span>
                <span className="exec-entry-date">{edu.start_date} - {edu.end_date}</span>
              </div>
              <div className="exec-entry-sub">
                {edu.degree} - {edu.field}
                {edu.gpa && ` | GPA: ${edu.gpa}`}
              </div>
              {edu.highlights && edu.highlights.length > 0 && (
                <ul className="exec-highlights">
                  {edu.highlights.map((h, j) => <li key={j}>{h}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="exec-section">
          <div className="exec-section-title">专业技能</div>
          <div className="exec-skills-grid">
            {skills.map((group, i) => (
              <div key={i} className="exec-skill-group">
                <span className="exec-skill-category">{group.category}</span>
                <span className="exec-skill-items">{group.items.join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div className="exec-section">
          <div className="exec-section-title">项目经验</div>
          {projects.map((proj, i) => (
            <div key={i} className="exec-entry">
              <div className="exec-entry-header">
                <span className="exec-entry-main">
                  {proj.name}
                  {proj.role && <span style={{ fontWeight: 400, color: '#888' }}> - {proj.role}</span>}
                </span>
                {(proj.start_date || proj.end_date) && (
                  <span className="exec-entry-date">
                    {proj.start_date}{proj.start_date && proj.end_date && ' - '}{proj.end_date}
                  </span>
                )}
              </div>
              <div className="exec-entry-desc">{proj.description}</div>
              {proj.highlights.length > 0 && (
                <ul className="exec-highlights">
                  {proj.highlights.map((h, j) => <li key={j}>{h}</li>)}
                </ul>
              )}
              {proj.tech_stack && proj.tech_stack.length > 0 && (
                <div className="exec-tech-stack">{proj.tech_stack.join(' / ')}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <div className="exec-section">
          <div className="exec-section-title">证书与奖项</div>
          {certifications.map((cert, i) => (
            <div key={i} className="exec-cert-item">
              <span className="exec-cert-name">{cert.name}</span>
              {(cert.issuer || cert.date) && (
                <span className="exec-cert-detail">
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
        <div key={i} className="exec-section">
          <div className="exec-section-title">{section.title}</div>
          <div className="exec-custom-content">{section.content}</div>
        </div>
      ))}
    </div>
  )
}

export default ExecutiveTemplate
