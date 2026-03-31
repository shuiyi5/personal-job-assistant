import type { ResumeData } from '../types/resume'

export interface TemplateProps {
  data: ResumeData
  scale?: number
}

const TechTemplate = ({ data, scale = 1 }: TemplateProps) => {
  const { personal, summary, work_experience, education, skills, projects, certifications, custom_sections } = data

  const contactItems: { icon: string; value: string }[] = []
  if (personal.email) contactItems.push({ icon: '@', value: personal.email })
  if (personal.phone) contactItems.push({ icon: '#', value: personal.phone })
  if (personal.location) contactItems.push({ icon: '>', value: personal.location })
  if (personal.github) contactItems.push({ icon: '$', value: personal.github })
  if (personal.website) contactItems.push({ icon: '~', value: personal.website })
  if (personal.linkedin) contactItems.push({ icon: '&', value: personal.linkedin })

  return (
    <div
      className="tpl-tech"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      <style>{`
        .tpl-tech {
          width: 794px;
          min-height: 1123px;
          background: #0f172a;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', 'PingFang SC', sans-serif;
          color: #cbd5e1;
          line-height: 1.6;
          box-sizing: border-box;
          padding: 0;
        }
        .tpl-tech *, .tpl-tech *::before, .tpl-tech *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        /* Header card */
        .tpl-tech .tech-header {
          background: #1e293b;
          padding: 32px 40px 24px;
          border-bottom: 1px solid #334155;
        }
        .tpl-tech .tech-name {
          font-size: 28px;
          font-weight: 700;
          color: #22d3ee;
          font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
          letter-spacing: 1px;
        }
        .tpl-tech .tech-title {
          font-size: 13px;
          color: #94a3b8;
          font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
          margin-top: 4px;
        }
        .tpl-tech .tech-contact-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 18px;
          margin-top: 14px;
        }
        .tpl-tech .tech-contact-item {
          font-size: 11px;
          color: #94a3b8;
          font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
        }
        .tpl-tech .tech-contact-icon {
          color: #22d3ee;
          margin-right: 4px;
        }

        /* Body */
        .tpl-tech .tech-body {
          padding: 28px 40px 40px;
        }
        .tpl-tech .tech-section {
          margin-bottom: 24px;
        }
        .tpl-tech .tech-section-title {
          font-size: 13px;
          font-weight: 700;
          color: #22d3ee;
          font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
          letter-spacing: 1px;
          margin-bottom: 12px;
          padding-bottom: 6px;
          border-bottom: 1px solid #1e293b;
        }
        .tpl-tech .tech-comment {
          color: #475569;
        }
        .tpl-tech .tech-summary {
          font-size: 12.5px;
          color: #94a3b8;
          line-height: 1.75;
          padding: 12px 16px;
          background: #1e293b;
          border-radius: 6px;
          border: 1px solid #334155;
        }

        /* Entry cards */
        .tpl-tech .tech-entry {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 6px;
          padding: 14px 16px;
          margin-bottom: 10px;
        }
        .tpl-tech .tech-entry:last-child {
          margin-bottom: 0;
        }
        .tpl-tech .tech-entry-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 2px;
        }
        .tpl-tech .tech-entry-main {
          font-size: 13.5px;
          font-weight: 700;
          color: #e2e8f0;
        }
        .tpl-tech .tech-entry-date {
          font-size: 10.5px;
          color: #64748b;
          white-space: nowrap;
          flex-shrink: 0;
          margin-left: 10px;
          font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
        }
        .tpl-tech .tech-entry-sub {
          font-size: 12px;
          color: #22d3ee;
          margin-bottom: 6px;
        }
        .tpl-tech .tech-entry-desc {
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 6px;
        }
        .tpl-tech .tech-highlights {
          list-style: none;
          padding-left: 0;
          margin-top: 6px;
        }
        .tpl-tech .tech-highlights li {
          font-size: 11.5px;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 3px;
          padding-left: 16px;
          position: relative;
        }
        .tpl-tech .tech-highlights li::before {
          content: '-';
          position: absolute;
          left: 4px;
          top: 0;
          color: #22d3ee;
          font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
        }

        /* Skills as terminal tags */
        .tpl-tech .tech-skills-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .tpl-tech .tech-skill-group {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 6px;
          padding: 10px 14px;
        }
        .tpl-tech .tech-skill-category {
          font-size: 11px;
          color: #64748b;
          font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .tpl-tech .tech-skill-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .tpl-tech .tech-skill-tag {
          font-size: 10.5px;
          color: #22d3ee;
          border: 1px solid #22d3ee;
          padding: 2px 10px;
          border-radius: 3px;
          font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
          background: rgba(34, 211, 238, 0.05);
        }

        /* Tech stack inline */
        .tpl-tech .tech-stack-row {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 8px;
        }
        .tpl-tech .tech-stack-tag {
          font-size: 9.5px;
          color: #a78bfa;
          border: 1px solid #4c1d95;
          padding: 1px 7px;
          border-radius: 3px;
          font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
          background: rgba(167, 139, 250, 0.06);
        }

        /* Certs */
        .tpl-tech .tech-cert-item {
          font-size: 12px;
          color: #e2e8f0;
          margin-bottom: 5px;
        }
        .tpl-tech .tech-cert-detail {
          color: #64748b;
          font-size: 11px;
          font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
        }
        .tpl-tech .tech-custom-content {
          font-size: 12.5px;
          color: #94a3b8;
          line-height: 1.75;
          white-space: pre-wrap;
        }
      `}</style>

      {/* Header */}
      <div className="tech-header">
        <div className="tech-name">{personal.name}</div>
        {personal.title && <div className="tech-title">{personal.title}</div>}
        {contactItems.length > 0 && (
          <div className="tech-contact-row">
            {contactItems.map((item, i) => (
              <span key={i} className="tech-contact-item">
                <span className="tech-contact-icon">{item.icon}</span>
                {item.value}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="tech-body">
        {/* Summary */}
        {summary && (
          <div className="tech-section">
            <div className="tech-section-title">
              <span className="tech-comment">// </span>个人简介
            </div>
            <div className="tech-summary">{summary}</div>
          </div>
        )}

        {/* Work Experience */}
        {work_experience.length > 0 && (
          <div className="tech-section">
            <div className="tech-section-title">
              <span className="tech-comment">// </span>工作经历
            </div>
            {work_experience.map((exp, i) => (
              <div key={i} className="tech-entry">
                <div className="tech-entry-header">
                  <span className="tech-entry-main">{exp.company}</span>
                  <span className="tech-entry-date">{exp.start_date} - {exp.end_date}</span>
                </div>
                <div className="tech-entry-sub">
                  {exp.title}
                  {exp.location && ` @ ${exp.location}`}
                </div>
                {exp.highlights.length > 0 && (
                  <ul className="tech-highlights">
                    {exp.highlights.map((h, j) => <li key={j}>{h}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Education */}
        {education.length > 0 && (
          <div className="tech-section">
            <div className="tech-section-title">
              <span className="tech-comment">// </span>教育背景
            </div>
            {education.map((edu, i) => (
              <div key={i} className="tech-entry">
                <div className="tech-entry-header">
                  <span className="tech-entry-main">{edu.institution}</span>
                  <span className="tech-entry-date">{edu.start_date} - {edu.end_date}</span>
                </div>
                <div className="tech-entry-sub">
                  {edu.degree} - {edu.field}
                  {edu.gpa && ` | GPA: ${edu.gpa}`}
                </div>
                {edu.highlights && edu.highlights.length > 0 && (
                  <ul className="tech-highlights">
                    {edu.highlights.map((h, j) => <li key={j}>{h}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="tech-section">
            <div className="tech-section-title">
              <span className="tech-comment">// </span>专业技能
            </div>
            <div className="tech-skills-grid">
              {skills.map((group, i) => (
                <div key={i} className="tech-skill-group">
                  <div className="tech-skill-category">{group.category}</div>
                  <div className="tech-skill-tags">
                    {group.items.map((item, j) => (
                      <span key={j} className="tech-skill-tag">{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <div className="tech-section">
            <div className="tech-section-title">
              <span className="tech-comment">// </span>项目经验
            </div>
            {projects.map((proj, i) => (
              <div key={i} className="tech-entry">
                <div className="tech-entry-header">
                  <span className="tech-entry-main">
                    {proj.name}
                    {proj.role && <span style={{ fontWeight: 400, color: '#94a3b8' }}> - {proj.role}</span>}
                  </span>
                  {(proj.start_date || proj.end_date) && (
                    <span className="tech-entry-date">
                      {proj.start_date}{proj.start_date && proj.end_date && ' - '}{proj.end_date}
                    </span>
                  )}
                </div>
                <div className="tech-entry-desc">{proj.description}</div>
                {proj.highlights.length > 0 && (
                  <ul className="tech-highlights">
                    {proj.highlights.map((h, j) => <li key={j}>{h}</li>)}
                  </ul>
                )}
                {proj.tech_stack && proj.tech_stack.length > 0 && (
                  <div className="tech-stack-row">
                    {proj.tech_stack.map((t, j) => (
                      <span key={j} className="tech-stack-tag">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Certifications */}
        {certifications.length > 0 && (
          <div className="tech-section">
            <div className="tech-section-title">
              <span className="tech-comment">// </span>证书与奖项
            </div>
            {certifications.map((cert, i) => (
              <div key={i} className="tech-cert-item">
                {cert.name}
                {(cert.issuer || cert.date) && (
                  <span className="tech-cert-detail">
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
          <div key={i} className="tech-section">
            <div className="tech-section-title">
              <span className="tech-comment">// </span>{section.title}
            </div>
            <div className="tech-custom-content">{section.content}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TechTemplate
