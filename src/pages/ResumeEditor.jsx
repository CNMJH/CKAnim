import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authUtils } from '../lib/api';
import './ResumeEditor.css';

// 模板配置
const TEMPLATES = [
  { id: 'classic', name: 'Classic', category: '传统经典', color: '#333333' },
  { id: 'formal', name: 'Formal', category: '传统经典', color: '#1a365d' },
  { id: 'academic', name: 'Academic', category: '传统经典', color: '#2d3748' },
  { id: 'modern', name: 'Modern', category: '现代简约', color: '#3182ce' },
  { id: 'minimalist', name: 'Minimalist', category: '现代简约', color: '#000000' },
  { id: 'clean', name: 'Clean', category: '现代简约', color: '#48bb78' },
  { id: 'creative', name: 'Creative', category: '创意设计', color: '#ed8936' },
  { id: 'colorful', name: 'Colorful', category: '创意设计', color: '#9f7aea' },
  { id: 'bold', name: 'Bold', category: '创意设计', color: '#e53e3e' },
  { id: 'developer', name: 'Developer', category: '技术专业', color: '#667eea' },
  { id: 'techblue', name: 'TechBlue', category: '技术专业', color: '#2563eb' },
  { id: 'onepage', name: 'OnePage', category: '特殊用途', color: '#374151' },
  { id: 'english', name: 'English', category: '特殊用途', color: '#1e40af' },
];

function ResumeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const previewRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resume, setResume] = useState(null);
  const [content, setContent] = useState({
    personal: { name: '', phone: '', email: '', avatar: '', location: '', website: '', summary: '' },
    education: [],
    experience: [],
    skills: [],
    projects: [],
    certifications: [],
    languages: [],
    interests: [],
  });
  const [template, setTemplate] = useState('modern');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');

  useEffect(() => {
    fetchResume();
  }, [id]);

  const fetchResume = async () => {
    try {
      const { data } = await authUtils.authFetch(`/api/resume/${id}`);
      setResume(data);
      setTemplate(data.template || 'modern');
      if (data.content) {
        setContent(JSON.parse(data.content));
      }
    } catch (error) {
      console.error('Failed to fetch resume:', error);
      alert('加载失败');
      navigate('/resume');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await authUtils.authFetch(`/api/resume/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          template,
          content: JSON.stringify(content),
        }),
      });
      alert('保存成功');
    } catch (error) {
      console.error('Failed to save resume:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const updatePersonal = (field, value) => {
    setContent(prev => ({
      ...prev,
      personal: { ...prev.personal, [field]: value },
    }));
  };

  const addEducation = () => {
    setContent(prev => ({
      ...prev,
      education: [...prev.education, { school: '', degree: '', major: '', startDate: '', endDate: '' }],
    }));
  };

  const updateEducation = (index, field, value) => {
    setContent(prev => ({
      ...prev,
      education: prev.education.map((e, i) => i === index ? { ...e, [field]: value } : e),
    }));
  };

  const removeEducation = (index) => {
    setContent(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  const addExperience = () => {
    setContent(prev => ({
      ...prev,
      experience: [...prev.experience, { company: '', position: '', startDate: '', endDate: '', description: '' }],
    }));
  };

  const updateExperience = (index, field, value) => {
    setContent(prev => ({
      ...prev,
      experience: prev.experience.map((e, i) => i === index ? { ...e, [field]: value } : e),
    }));
  };

  const removeExperience = (index) => {
    setContent(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
  };

  const addSkill = () => {
    setContent(prev => ({
      ...prev,
      skills: [...prev.skills, { name: '', level: '中级' }],
    }));
  };

  const updateSkill = (index, field, value) => {
    setContent(prev => ({
      ...prev,
      skills: prev.skills.map((s, i) => i === index ? { ...s, [field]: value } : s),
    }));
  };

  const removeSkill = (index) => {
    setContent(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  const addProject = () => {
    setContent(prev => ({
      ...prev,
      projects: [...prev.projects, { name: '', role: '', startDate: '', endDate: '', description: '' }],
    }));
  };

  const updateProject = (index, field, value) => {
    setContent(prev => ({
      ...prev,
      projects: prev.projects.map((p, i) => i === index ? { ...p, [field]: value } : p),
    }));
  };

  const removeProject = (index) => {
    setContent(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  };

  // 导出 PDF
  const exportPDF = async () => {
    try {
      // 动态加载 html2pdf.js
      const html2pdf = await import('html2pdf.js');
      const element = previewRef.current;
      const opt = {
        margin: 0,
        filename: `${content.personal.name || '简历'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      html2pdf.default().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('导出 PDF 失败，请安装 html2pdf.js');
    }
  };

  // 导出图片
  const exportImage = async () => {
    try {
      // 动态加载 html-to-image
      const { toPng } = await import('html-to-image');
      const element = previewRef.current;
      const dataUrl = await toPng(element, { quality: 1, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${content.personal.name || '简历'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Image export failed:', error);
      alert('导出图片失败，请安装 html-to-image');
    }
  };

  if (loading) {
    return (
      <div className="resume-editor-page">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  const currentTemplate = TEMPLATES.find(t => t.id === template) || TEMPLATES[3];

  return (
    <div className="resume-editor-page">
      {/* 顶部工具栏 */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <button className="back-btn" onClick={() => navigate('/resume')}>
            ← 返回
          </button>
          <span className="resume-name">{resume?.name}</span>
        </div>
        <div className="toolbar-center">
          <button className="template-btn" onClick={() => setShowTemplatePicker(true)}>
            <span className="template-preview" style={{ backgroundColor: currentTemplate.color }}></span>
            {currentTemplate.name}
          </button>
        </div>
        <div className="toolbar-right">
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '💾 保存'}
          </button>
          <button className="export-btn" onClick={exportPDF}>
            📄 PDF
          </button>
          <button className="export-btn" onClick={exportImage}>
            🖼️ 图片
          </button>
        </div>
      </div>

      {/* 主体区域 */}
      <div className="editor-main">
        {/* 左侧编辑区 */}
        <div className="editor-left">
          <div className="section-tabs">
            {['personal', 'education', 'experience', 'skills', 'projects', 'more'].map(section => (
              <button
                key={section}
                className={`section-tab ${activeSection === section ? 'active' : ''}`}
                onClick={() => setActiveSection(section)}
              >
                {section === 'personal' && '👤 基本信息'}
                {section === 'education' && '🎓 教育经历'}
                {section === 'experience' && '💼 工作经历'}
                {section === 'skills' && '⚡ 专业技能'}
                {section === 'projects' && '🚀 项目经历'}
                {section === 'more' && '📝 更多'}
              </button>
            ))}
          </div>

          <div className="section-content">
            {/* 基本信息 */}
            {activeSection === 'personal' && (
              <div className="form-section">
                <h3>基本信息</h3>
                <div className="form-grid">
                  <div className="form-item">
                    <label>姓名</label>
                    <input
                      type="text"
                      value={content.personal.name}
                      onChange={(e) => updatePersonal('name', e.target.value)}
                      placeholder="请输入姓名"
                    />
                  </div>
                  <div className="form-item">
                    <label>电话</label>
                    <input
                      type="tel"
                      value={content.personal.phone}
                      onChange={(e) => updatePersonal('phone', e.target.value)}
                      placeholder="请输入电话"
                    />
                  </div>
                  <div className="form-item">
                    <label>邮箱</label>
                    <input
                      type="email"
                      value={content.personal.email}
                      onChange={(e) => updatePersonal('email', e.target.value)}
                      placeholder="请输入邮箱"
                    />
                  </div>
                  <div className="form-item">
                    <label>所在地</label>
                    <input
                      type="text"
                      value={content.personal.location}
                      onChange={(e) => updatePersonal('location', e.target.value)}
                      placeholder="请输入城市"
                    />
                  </div>
                  <div className="form-item full-width">
                    <label>个人网站</label>
                    <input
                      type="url"
                      value={content.personal.website}
                      onChange={(e) => updatePersonal('website', e.target.value)}
                      placeholder="https://"
                    />
                  </div>
                  <div className="form-item full-width">
                    <label>个人简介</label>
                    <textarea
                      value={content.personal.summary}
                      onChange={(e) => updatePersonal('summary', e.target.value)}
                      placeholder="简短介绍自己..."
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 教育经历 */}
            {activeSection === 'education' && (
              <div className="form-section">
                <h3>教育经历</h3>
                <button className="add-btn" onClick={addEducation}>➕ 添加教育经历</button>
                {content.education.map((edu, index) => (
                  <div key={index} className="item-card">
                    <div className="item-header">
                      <span>教育经历 {index + 1}</span>
                      <button className="remove-btn" onClick={() => removeEducation(index)}>🗑️</button>
                    </div>
                    <div className="form-grid">
                      <div className="form-item">
                        <label>学校</label>
                        <input
                          type="text"
                          value={edu.school}
                          onChange={(e) => updateEducation(index, 'school', e.target.value)}
                          placeholder="学校名称"
                        />
                      </div>
                      <div className="form-item">
                        <label>学位</label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                          placeholder="本科/硕士/博士"
                        />
                      </div>
                      <div className="form-item">
                        <label>专业</label>
                        <input
                          type="text"
                          value={edu.major}
                          onChange={(e) => updateEducation(index, 'major', e.target.value)}
                          placeholder="专业名称"
                        />
                      </div>
                      <div className="form-item">
                        <label>时间</label>
                        <input
                          type="text"
                          value={edu.startDate}
                          onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                          placeholder="2019.09"
                        />
                        <span className="date-separator">-</span>
                        <input
                          type="text"
                          value={edu.endDate}
                          onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                          placeholder="2023.06"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 工作经历 */}
            {activeSection === 'experience' && (
              <div className="form-section">
                <h3>工作经历</h3>
                <button className="add-btn" onClick={addExperience}>➕ 添加工作经历</button>
                {content.experience.map((exp, index) => (
                  <div key={index} className="item-card">
                    <div className="item-header">
                      <span>工作经历 {index + 1}</span>
                      <button className="remove-btn" onClick={() => removeExperience(index)}>🗑️</button>
                    </div>
                    <div className="form-grid">
                      <div className="form-item">
                        <label>公司</label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => updateExperience(index, 'company', e.target.value)}
                          placeholder="公司名称"
                        />
                      </div>
                      <div className="form-item">
                        <label>职位</label>
                        <input
                          type="text"
                          value={exp.position}
                          onChange={(e) => updateExperience(index, 'position', e.target.value)}
                          placeholder="职位名称"
                        />
                      </div>
                      <div className="form-item">
                        <label>时间</label>
                        <input
                          type="text"
                          value={exp.startDate}
                          onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                          placeholder="2023.07"
                        />
                        <span className="date-separator">-</span>
                        <input
                          type="text"
                          value={exp.endDate}
                          onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                          placeholder="至今"
                        />
                      </div>
                      <div className="form-item full-width">
                        <label>工作描述</label>
                        <textarea
                          value={exp.description}
                          onChange={(e) => updateExperience(index, 'description', e.target.value)}
                          placeholder="描述你的工作内容和成就..."
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 专业技能 */}
            {activeSection === 'skills' && (
              <div className="form-section">
                <h3>专业技能</h3>
                <button className="add-btn" onClick={addSkill}>➕ 添加技能</button>
                <div className="skills-grid">
                  {content.skills.map((skill, index) => (
                    <div key={index} className="skill-item">
                      <input
                        type="text"
                        value={skill.name}
                        onChange={(e) => updateSkill(index, 'name', e.target.value)}
                        placeholder="技能名称"
                      />
                      <select
                        value={skill.level}
                        onChange={(e) => updateSkill(index, 'level', e.target.value)}
                      >
                        <option value="初级">初级</option>
                        <option value="中级">中级</option>
                        <option value="高级">高级</option>
                        <option value="精通">精通</option>
                      </select>
                      <button className="remove-btn-small" onClick={() => removeSkill(index)}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 项目经历 */}
            {activeSection === 'projects' && (
              <div className="form-section">
                <h3>项目经历</h3>
                <button className="add-btn" onClick={addProject}>➕ 添加项目</button>
                {content.projects.map((proj, index) => (
                  <div key={index} className="item-card">
                    <div className="item-header">
                      <span>项目 {index + 1}</span>
                      <button className="remove-btn" onClick={() => removeProject(index)}>🗑️</button>
                    </div>
                    <div className="form-grid">
                      <div className="form-item">
                        <label>项目名称</label>
                        <input
                          type="text"
                          value={proj.name}
                          onChange={(e) => updateProject(index, 'name', e.target.value)}
                          placeholder="项目名称"
                        />
                      </div>
                      <div className="form-item">
                        <label>角色</label>
                        <input
                          type="text"
                          value={proj.role}
                          onChange={(e) => updateProject(index, 'role', e.target.value)}
                          placeholder="你的角色"
                        />
                      </div>
                      <div className="form-item">
                        <label>时间</label>
                        <input
                          type="text"
                          value={proj.startDate}
                          onChange={(e) => updateProject(index, 'startDate', e.target.value)}
                          placeholder="2023.01"
                        />
                        <span className="date-separator">-</span>
                        <input
                          type="text"
                          value={proj.endDate}
                          onChange={(e) => updateProject(index, 'endDate', e.target.value)}
                          placeholder="2023.06"
                        />
                      </div>
                      <div className="form-item full-width">
                        <label>项目描述</label>
                        <textarea
                          value={proj.description}
                          onChange={(e) => updateProject(index, 'description', e.target.value)}
                          placeholder="描述项目内容、技术栈、成果..."
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 更多 */}
            {activeSection === 'more' && (
              <div className="form-section">
                <h3>更多内容</h3>
                <p className="coming-soon">证书认证、语言能力、兴趣爱好等功能即将上线...</p>
              </div>
            )}
          </div>
        </div>

        {/* 右侧预览区 */}
        <div className="editor-right">
          <div className="preview-container" ref={previewRef}>
            <ResumePreview content={content} template={template} />
          </div>
        </div>
      </div>

      {/* 模板选择弹窗 */}
      {showTemplatePicker && (
        <div className="template-picker-overlay" onClick={() => setShowTemplatePicker(false)}>
          <div className="template-picker" onClick={(e) => e.stopPropagation()}>
            <h2>选择模板</h2>
            <div className="template-grid">
              {TEMPLATES.map(t => (
                <div
                  key={t.id}
                  className={`template-card ${template === t.id ? 'selected' : ''}`}
                  onClick={() => {
                    setTemplate(t.id);
                    setShowTemplatePicker(false);
                  }}
                >
                  <div className="template-preview-box" style={{ backgroundColor: t.color }}></div>
                  <div className="template-info">
                    <span className="template-name">{t.name}</span>
                    <span className="template-category">{t.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 简历预览组件
function ResumePreview({ content, template }) {
  const templateStyle = getTemplateStyle(template);

  return (
    <div className="resume-preview-document" style={templateStyle.document}>
      {/* 头部 */}
      <div className="preview-header" style={templateStyle.header}>
        <div className="preview-name" style={templateStyle.name}>
          {content.personal.name || '您的姓名'}
        </div>
        <div className="preview-contact" style={templateStyle.contact}>
          {content.personal.phone && <span>📱 {content.personal.phone}</span>}
          {content.personal.email && <span>📧 {content.personal.email}</span>}
          {content.personal.location && <span>📍 {content.personal.location}</span>}
        </div>
        {content.personal.summary && (
          <div className="preview-summary" style={templateStyle.summary}>
            {content.personal.summary}
          </div>
        )}
      </div>

      {/* 教育经历 */}
      {content.education.length > 0 && (
        <div className="preview-section">
          <div className="preview-section-title" style={templateStyle.sectionTitle}>
            🎓 教育经历
          </div>
          {content.education.map((edu, index) => (
            <div key={index} className="preview-item">
              <div className="preview-item-header">
                <span className="preview-item-title">{edu.school || '学校名称'}</span>
                <span className="preview-item-date">{edu.startDate} - {edu.endDate}</span>
              </div>
              <div className="preview-item-sub">{edu.degree} · {edu.major}</div>
            </div>
          ))}
        </div>
      )}

      {/* 工作经历 */}
      {content.experience.length > 0 && (
        <div className="preview-section">
          <div className="preview-section-title" style={templateStyle.sectionTitle}>
            💼 工作经历
          </div>
          {content.experience.map((exp, index) => (
            <div key={index} className="preview-item">
              <div className="preview-item-header">
                <span className="preview-item-title">{exp.company || '公司名称'}</span>
                <span className="preview-item-date">{exp.startDate} - {exp.endDate}</span>
              </div>
              <div className="preview-item-sub">{exp.position}</div>
              {exp.description && (
                <div className="preview-item-desc">{exp.description}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 专业技能 */}
      {content.skills.length > 0 && (
        <div className="preview-section">
          <div className="preview-section-title" style={templateStyle.sectionTitle}>
            ⚡ 专业技能
          </div>
          <div className="preview-skills">
            {content.skills.map((skill, index) => (
              <span key={index} className="preview-skill-tag" style={templateStyle.skillTag}>
                {skill.name} · {skill.level}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 项目经历 */}
      {content.projects.length > 0 && (
        <div className="preview-section">
          <div className="preview-section-title" style={templateStyle.sectionTitle}>
            🚀 项目经历
          </div>
          {content.projects.map((proj, index) => (
            <div key={index} className="preview-item">
              <div className="preview-item-header">
                <span className="preview-item-title">{proj.name || '项目名称'}</span>
                <span className="preview-item-date">{proj.startDate} - {proj.endDate}</span>
              </div>
              <div className="preview-item-sub">{proj.role}</div>
              {proj.description && (
                <div className="preview-item-desc">{proj.description}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getTemplateStyle(template) {
  const baseStyle = {
    document: {
      backgroundColor: '#fff',
      padding: '40px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    header: {
      marginBottom: '24px',
      borderBottom: '2px solid #e2e8f0',
      paddingBottom: '16px',
    },
    name: {
      fontSize: '28px',
      fontWeight: 'bold',
      marginBottom: '8px',
    },
    contact: {
      fontSize: '14px',
      color: '#718096',
      display: 'flex',
      gap: '16px',
    },
    summary: {
      fontSize: '14px',
      color: '#4a5568',
      marginTop: '12px',
      lineHeight: '1.6',
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '12px',
      borderBottom: '1px solid #e2e8f0',
      paddingBottom: '4px',
    },
    skillTag: {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '4px',
      fontSize: '13px',
    },
  };

  const templateOverrides = {
    classic: {
      document: { ...baseStyle.document, fontFamily: 'Georgia, serif' },
      header: { ...baseStyle.header, borderBottom: '2px solid #333' },
      name: { ...baseStyle.name, color: '#333' },
      sectionTitle: { ...baseStyle.sectionTitle, color: '#333', borderBottom: '1px solid #333' },
      skillTag: { ...baseStyle.skillTag, backgroundColor: '#333', color: '#fff' },
    },
    modern: {
      document: { ...baseStyle.document },
      header: { ...baseStyle.header, borderBottom: '2px solid #3182ce' },
      name: { ...baseStyle.name, color: '#2c5282' },
      sectionTitle: { ...baseStyle.sectionTitle, color: '#3182ce', borderBottom: '2px solid #bee3f8' },
      skillTag: { ...baseStyle.skillTag, backgroundColor: '#bee3f8', color: '#2c5282' },
    },
    developer: {
      document: { ...baseStyle.document, backgroundColor: '#f7fafc' },
      header: { ...baseStyle.header, borderBottom: '2px solid #667eea' },
      name: { ...baseStyle.name, color: '#553c9a' },
      sectionTitle: { ...baseStyle.sectionTitle, color: '#667eea' },
      skillTag: { ...baseStyle.skillTag, backgroundColor: '#e9d8fd', color: '#553c9a' },
    },
    creative: {
      document: { ...baseStyle.document },
      header: { ...baseStyle.header, borderBottom: 'none', backgroundColor: '#ed8936', padding: '16px', borderRadius: '8px' },
      name: { ...baseStyle.name, color: '#fff' },
      contact: { ...baseStyle.contact, color: '#fff' },
      summary: { ...baseStyle.summary, color: '#fff' },
      sectionTitle: { ...baseStyle.sectionTitle, color: '#c05621' },
      skillTag: { ...baseStyle.skillTag, backgroundColor: '#feebc8', color: '#c05621' },
    },
  };

  return templateOverrides[template] || baseStyle;
}

export default ResumeEditor;