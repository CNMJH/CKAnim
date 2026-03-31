import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ResumeEditor.css';

const STORAGE_KEY = 'ckanim_resumes';

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

const DEFAULT_CONTENT = {
  personal: { name: '', phone: '', email: '', location: '', website: '', summary: '' },
  education: [],
  experience: [],
  skills: [],
  projects: [],
};

function ResumeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const previewRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState(null);
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [template, setTemplate] = useState('modern');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');

  useEffect(() => {
    loadResume();
  }, [id]);

  const loadResume = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const resumes = stored ? JSON.parse(stored) : [];
      const found = resumes.find(r => r.id === parseInt(id));
      if (!found) {
        alert('简历不存在');
        navigate('/resume');
        return;
      }
      setResume(found);
      setTemplate(found.template || 'modern');
      setContent(found.content || DEFAULT_CONTENT);
    } catch (error) {
      console.error('Load error:', error);
      navigate('/resume');
    } finally {
      setLoading(false);
    }
  };

  const saveToStorage = (newContent, newTemplate) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const resumes = stored ? JSON.parse(stored) : [];
    const index = resumes.findIndex(r => r.id === parseInt(id));
    if (index === -1) return;
    resumes[index] = {
      ...resumes[index],
      template: newTemplate || template,
      content: newContent || content,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
    setResume(resumes[index]);
  };

  const handleSave = () => {
    saveToStorage(content, template);
    alert('保存成功');
  };

  const exportPDF = async () => {
    try {
      const html2pdf = await import('html2pdf.js');
      html2pdf.default().set({
        margin: 0,
        filename: `${content.personal.name || '简历'}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(previewRef.current).save();
    } catch (error) {
      alert('导出失败');
    }
  };

  const exportImage = async () => {
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(previewRef.current, { quality: 1, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${content.personal.name || '简历'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      alert('导出失败');
    }
  };

  // 更新函数
  const updatePersonal = (field, value) => {
    setContent(prev => ({ ...prev, personal: { ...prev.personal, [field]: value } }));
  };

  const addEducation = () => {
    setContent(prev => ({ ...prev, education: [...prev.education, { school: '', degree: '', major: '', startDate: '', endDate: '' }] }));
  };
  const updateEducation = (i, f, v) => {
    setContent(prev => ({ ...prev, education: prev.education.map((e, idx) => idx === i ? { ...e, [f]: v } : e) }));
  };
  const removeEducation = (i) => {
    setContent(prev => ({ ...prev, education: prev.education.filter((_, idx) => idx !== i) }));
  };

  const addExperience = () => {
    setContent(prev => ({ ...prev, experience: [...prev.experience, { company: '', position: '', startDate: '', endDate: '', description: '' }] }));
  };
  const updateExperience = (i, f, v) => {
    setContent(prev => ({ ...prev, experience: prev.experience.map((e, idx) => idx === i ? { ...e, [f]: v } : e) }));
  };
  const removeExperience = (i) => {
    setContent(prev => ({ ...prev, experience: prev.experience.filter((_, idx) => idx !== i) }));
  };

  const addSkill = () => {
    setContent(prev => ({ ...prev, skills: [...prev.skills, { name: '', level: '中级' }] }));
  };
  const updateSkill = (i, f, v) => {
    setContent(prev => ({ ...prev, skills: prev.skills.map((s, idx) => idx === i ? { ...s, [f]: v } : s) }));
  };
  const removeSkill = (i) => {
    setContent(prev => ({ ...prev, skills: prev.skills.filter((_, idx) => idx !== i) }));
  };

  const addProject = () => {
    setContent(prev => ({ ...prev, projects: [...prev.projects, { name: '', role: '', startDate: '', endDate: '', description: '' }] }));
  };
  const updateProject = (i, f, v) => {
    setContent(prev => ({ ...prev, projects: prev.projects.map((p, idx) => idx === i ? { ...p, [f]: v } : p) }));
  };
  const removeProject = (i) => {
    setContent(prev => ({ ...prev, projects: prev.projects.filter((_, idx) => idx !== i) }));
  };

  if (loading) return <div className="resume-editor-page"><div className="loading">加载中...</div></div>;

  const currentTemplate = TEMPLATES.find(t => t.id === template) || TEMPLATES[3];

  return (
    <div className="resume-editor-page">
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <button className="back-btn" onClick={() => navigate('/resume')}>← 返回</button>
          <span className="resume-name">{resume?.name}</span>
        </div>
        <div className="toolbar-center">
          <button className="template-btn" onClick={() => setShowTemplatePicker(true)}>
            <span className="template-preview" style={{ backgroundColor: currentTemplate.color }}></span>
            {currentTemplate.name}
          </button>
        </div>
        <div className="toolbar-right">
          <button className="save-btn" onClick={handleSave}>💾 保存</button>
          <button className="export-btn" onClick={exportPDF}>📄 PDF</button>
          <button className="export-btn" onClick={exportImage}>🖼️ 图片</button>
        </div>
      </div>

      <div className="editor-main">
        <div className="editor-left">
          <div className="section-tabs">
            {['personal', 'education', 'experience', 'skills', 'projects'].map(s => (
              <button key={s} className={`section-tab ${activeSection === s ? 'active' : ''}`} onClick={() => setActiveSection(s)}>
                {s === 'personal' && '👤 基本信息'}
                {s === 'education' && '🎓 教育经历'}
                {s === 'experience' && '💼 工作经历'}
                {s === 'skills' && '⚡ 专业技能'}
                {s === 'projects' && '🚀 项目经历'}
              </button>
            ))}
          </div>

          <div className="section-content">
            {activeSection === 'personal' && (
              <div className="form-section">
                <h3>基本信息</h3>
                <div className="form-grid">
                  <div className="form-item"><label>姓名</label><input value={content.personal.name} onChange={e => updatePersonal('name', e.target.value)} placeholder="请输入姓名" /></div>
                  <div className="form-item"><label>电话</label><input value={content.personal.phone} onChange={e => updatePersonal('phone', e.target.value)} placeholder="请输入电话" /></div>
                  <div className="form-item"><label>邮箱</label><input value={content.personal.email} onChange={e => updatePersonal('email', e.target.value)} placeholder="请输入邮箱" /></div>
                  <div className="form-item"><label>所在地</label><input value={content.personal.location} onChange={e => updatePersonal('location', e.target.value)} placeholder="请输入城市" /></div>
                  <div className="form-item full-width"><label>个人网站</label><input value={content.personal.website} onChange={e => updatePersonal('website', e.target.value)} placeholder="https://" /></div>
                  <div className="form-item full-width"><label>个人简介</label><textarea value={content.personal.summary} onChange={e => updatePersonal('summary', e.target.value)} placeholder="简短介绍自己..." rows={4} /></div>
                </div>
              </div>
            )}

            {activeSection === 'education' && (
              <div className="form-section">
                <h3>教育经历</h3>
                <button className="add-btn" onClick={addEducation}>➕ 添加教育经历</button>
                {content.education.map((edu, i) => (
                  <div key={i} className="item-card">
                    <div className="item-header"><span>教育经历 {i + 1}</span><button className="remove-btn" onClick={() => removeEducation(i)}>🗑️</button></div>
                    <div className="form-grid">
                      <div className="form-item"><label>学校</label><input value={edu.school} onChange={e => updateEducation(i, 'school', e.target.value)} placeholder="学校名称" /></div>
                      <div className="form-item"><label>学位</label><input value={edu.degree} onChange={e => updateEducation(i, 'degree', e.target.value)} placeholder="本科/硕士/博士" /></div>
                      <div className="form-item"><label>专业</label><input value={edu.major} onChange={e => updateEducation(i, 'major', e.target.value)} placeholder="专业名称" /></div>
                      <div className="form-item"><label>时间</label><input value={edu.startDate} onChange={e => updateEducation(i, 'startDate', e.target.value)} placeholder="2019.09" /><span className="date-separator">-</span><input value={edu.endDate} onChange={e => updateEducation(i, 'endDate', e.target.value)} placeholder="2023.06" /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSection === 'experience' && (
              <div className="form-section">
                <h3>工作经历</h3>
                <button className="add-btn" onClick={addExperience}>➕ 添加工作经历</button>
                {content.experience.map((exp, i) => (
                  <div key={i} className="item-card">
                    <div className="item-header"><span>工作经历 {i + 1}</span><button className="remove-btn" onClick={() => removeExperience(i)}>🗑️</button></div>
                    <div className="form-grid">
                      <div className="form-item"><label>公司</label><input value={exp.company} onChange={e => updateExperience(i, 'company', e.target.value)} placeholder="公司名称" /></div>
                      <div className="form-item"><label>职位</label><input value={exp.position} onChange={e => updateExperience(i, 'position', e.target.value)} placeholder="职位名称" /></div>
                      <div className="form-item"><label>时间</label><input value={exp.startDate} onChange={e => updateExperience(i, 'startDate', e.target.value)} placeholder="2023.07" /><span className="date-separator">-</span><input value={exp.endDate} onChange={e => updateExperience(i, 'endDate', e.target.value)} placeholder="至今" /></div>
                      <div className="form-item full-width"><label>工作描述</label><textarea value={exp.description} onChange={e => updateExperience(i, 'description', e.target.value)} placeholder="描述你的工作内容和成就..." rows={4} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSection === 'skills' && (
              <div className="form-section">
                <h3>专业技能</h3>
                <button className="add-btn" onClick={addSkill}>➕ 添加技能</button>
                <div className="skills-grid">
                  {content.skills.map((skill, i) => (
                    <div key={i} className="skill-item">
                      <input value={skill.name} onChange={e => updateSkill(i, 'name', e.target.value)} placeholder="技能名称" />
                      <select value={skill.level} onChange={e => updateSkill(i, 'level', e.target.value)}><option value="初级">初级</option><option value="中级">中级</option><option value="高级">高级</option><option value="精通">精通</option></select>
                      <button className="remove-btn-small" onClick={() => removeSkill(i)}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'projects' && (
              <div className="form-section">
                <h3>项目经历</h3>
                <button className="add-btn" onClick={addProject}>➕ 添加项目</button>
                {content.projects.map((proj, i) => (
                  <div key={i} className="item-card">
                    <div className="item-header"><span>项目 {i + 1}</span><button className="remove-btn" onClick={() => removeProject(i)}>🗑️</button></div>
                    <div className="form-grid">
                      <div className="form-item"><label>项目名称</label><input value={proj.name} onChange={e => updateProject(i, 'name', e.target.value)} placeholder="项目名称" /></div>
                      <div className="form-item"><label>角色</label><input value={proj.role} onChange={e => updateProject(i, 'role', e.target.value)} placeholder="你的角色" /></div>
                      <div className="form-item"><label>时间</label><input value={proj.startDate} onChange={e => updateProject(i, 'startDate', e.target.value)} placeholder="2023.01" /><span className="date-separator">-</span><input value={proj.endDate} onChange={e => updateProject(i, 'endDate', e.target.value)} placeholder="2023.06" /></div>
                      <div className="form-item full-width"><label>项目描述</label><textarea value={proj.description} onChange={e => updateProject(i, 'description', e.target.value)} placeholder="描述项目内容、技术栈、成果..." rows={4} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="editor-right">
          <div className="preview-container" ref={previewRef}>
            <ResumePreview content={content} template={template} />
          </div>
        </div>
      </div>

      {showTemplatePicker && (
        <div className="template-picker-overlay" onClick={() => setShowTemplatePicker(false)}>
          <div className="template-picker" onClick={e => e.stopPropagation()}>
            <h2>选择模板</h2>
            <div className="template-grid">
              {TEMPLATES.map(t => (
                <div key={t.id} className={`template-card ${template === t.id ? 'selected' : ''}`} onClick={() => { setTemplate(t.id); setShowTemplatePicker(false); }}>
                  <div className="template-preview-box" style={{ backgroundColor: t.color }}></div>
                  <div className="template-info"><span className="template-name">{t.name}</span><span className="template-category">{t.category}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResumePreview({ content, template }) {
  const style = getTemplateStyle(template);
  return (
    <div className="resume-preview-document" style={style.document}>
      <div className="preview-header" style={style.header}>
        <div className="preview-name" style={style.name}>{content.personal.name || '您的姓名'}</div>
        <div className="preview-contact" style={style.contact}>
          {content.personal.phone && <span>📱 {content.personal.phone}</span>}
          {content.personal.email && <span>📧 {content.personal.email}</span>}
          {content.personal.location && <span>📍 {content.personal.location}</span>}
        </div>
        {content.personal.summary && <div className="preview-summary" style={style.summary}>{content.personal.summary}</div>}
      </div>
      {content.education.length > 0 && (
        <div className="preview-section">
          <div className="preview-section-title" style={style.sectionTitle}>🎓 教育经历</div>
          {content.education.map((edu, i) => (
            <div key={i} className="preview-item">
              <div className="preview-item-header"><span className="preview-item-title">{edu.school}</span><span className="preview-item-date">{edu.startDate} - {edu.endDate}</span></div>
              <div className="preview-item-sub">{edu.degree} · {edu.major}</div>
            </div>
          ))}
        </div>
      )}
      {content.experience.length > 0 && (
        <div className="preview-section">
          <div className="preview-section-title" style={style.sectionTitle}>💼 工作经历</div>
          {content.experience.map((exp, i) => (
            <div key={i} className="preview-item">
              <div className="preview-item-header"><span className="preview-item-title">{exp.company}</span><span className="preview-item-date">{exp.startDate} - {exp.endDate}</span></div>
              <div className="preview-item-sub">{exp.position}</div>
              {exp.description && <div className="preview-item-desc">{exp.description}</div>}
            </div>
          ))}
        </div>
      )}
      {content.skills.length > 0 && (
        <div className="preview-section">
          <div className="preview-section-title" style={style.sectionTitle}>⚡ 专业技能</div>
          <div className="preview-skills">{content.skills.map((s, i) => <span key={i} className="preview-skill-tag" style={style.skillTag}>{s.name} · {s.level}</span>)}</div>
        </div>
      )}
      {content.projects.length > 0 && (
        <div className="preview-section">
          <div className="preview-section-title" style={style.sectionTitle}>🚀 项目经历</div>
          {content.projects.map((proj, i) => (
            <div key={i} className="preview-item">
              <div className="preview-item-header"><span className="preview-item-title">{proj.name}</span><span className="preview-item-date">{proj.startDate} - {proj.endDate}</span></div>
              <div className="preview-item-sub">{proj.role}</div>
              {proj.description && <div className="preview-item-desc">{proj.description}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getTemplateStyle(template) {
  const base = {
    document: { backgroundColor: '#fff', padding: '40px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    header: { marginBottom: '24px', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px' },
    name: { fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' },
    contact: { fontSize: '14px', color: '#718096', display: 'flex', gap: '16px' },
    summary: { fontSize: '14px', color: '#4a5568', marginTop: '12px', lineHeight: '1.6' },
    sectionTitle: { fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' },
    skillTag: { display: 'inline-block', padding: '4px 12px', borderRadius: '4px', fontSize: '13px', backgroundColor: '#edf2f7', color: '#4a5568' },
  };
  const overrides = {
    classic: { document: { ...base.document, fontFamily: 'Georgia, serif' }, header: { ...base.header, borderBottom: '2px solid #333' }, name: { ...base.name, color: '#333' }, sectionTitle: { ...base.sectionTitle, color: '#333', borderBottom: '1px solid #333' }, skillTag: { ...base.skillTag, backgroundColor: '#333', color: '#fff' } },
    modern: { header: { ...base.header, borderBottom: '2px solid #3182ce' }, name: { ...base.name, color: '#2c5282' }, sectionTitle: { ...base.sectionTitle, color: '#3182ce', borderBottom: '2px solid #bee3f8' }, skillTag: { ...base.skillTag, backgroundColor: '#bee3f8', color: '#2c5282' } },
    developer: { document: { ...base.document, backgroundColor: '#f7fafc' }, header: { ...base.header, borderBottom: '2px solid #667eea' }, name: { ...base.name, color: '#553c9a' }, sectionTitle: { ...base.sectionTitle, color: '#667eea' }, skillTag: { ...base.skillTag, backgroundColor: '#e9d8fd', color: '#553c9a' } },
    creative: { header: { ...base.header, borderBottom: 'none', backgroundColor: '#ed8936', padding: '16px', borderRadius: '8px' }, name: { ...base.name, color: '#fff' }, contact: { ...base.contact, color: '#fff' }, summary: { ...base.summary, color: '#fff' }, sectionTitle: { ...base.sectionTitle, color: '#c05621' }, skillTag: { ...base.skillTag, backgroundColor: '#feebc8', color: '#c05621' } },
  };
  return overrides[template] || base;
}

export default ResumeEditor;