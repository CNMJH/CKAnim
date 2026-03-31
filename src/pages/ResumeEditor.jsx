import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ResumeEditor.css';

const STORAGE_KEY = 'ckanim_resumes';
const AUTO_SAVE_DELAY = 2000; // 2秒后自动保存

// 简历模板配置 - 3 种独特布局风格
const TEMPLATES = [
  { id: 'professional', name: 'Professional', category: '专业商务', color: '#1e3a5f', description: '左右分栏，左侧深色 Sidebar，技能进度条' },
  { id: 'modern', name: 'Modern', category: '现代简约', color: '#3182ce', description: '经典上下结构，居中标题，双栏内容' },
  { id: 'creative', name: 'Creative', category: '创意设计', color: '#dd6b20', description: '顶部彩色 Header，头像，时间轴设计' },
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
  const [saveStatus, setSaveStatus] = useState(''); // 'saving' | 'saved' | ''
  const [editingName, setEditingName] = useState(false);
  const [resumeName, setResumeName] = useState('');
  
  const autoSaveTimer = useRef(null);

  useEffect(() => {
    loadResume();
  }, [id]);

  // 自动保存 - 监听 content 和 template 变化
  useEffect(() => {
    if (loading || !resume) return;
    
    // 清除之前的定时器
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    
    // 设置新的自动保存定时器
    setSaveStatus('');
    autoSaveTimer.current = setTimeout(() => {
      performSave(content, template);
    }, AUTO_SAVE_DELAY);
    
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [content, template, loading, resume]);

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
      setResumeName(found.name);
      setTemplate(found.template || 'modern');
      setContent(found.content || DEFAULT_CONTENT);
    } catch (error) {
      console.error('Load error:', error);
      navigate('/resume');
    } finally {
      setLoading(false);
    }
  };

  // 执行保存操作
  const performSave = useCallback((newContent, newTemplate, newName) => {
    setSaveStatus('saving');
    
    const stored = localStorage.getItem(STORAGE_KEY);
    const resumes = stored ? JSON.parse(stored) : [];
    const index = resumes.findIndex(r => r.id === parseInt(id));
    if (index === -1) {
      setSaveStatus('');
      return;
    }
    
    resumes[index] = {
      ...resumes[index],
      name: newName || resumeName || resume?.name,
      template: newTemplate || template,
      content: newContent || content,
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
    setResume(resumes[index]);
    if (newName) setResumeName(newName);
    
    // 显示保存成功提示，3秒后消失
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus(''), 3000);
  }, [id, resumeName, resume, template, content]);

  // 手动保存
  const handleSave = () => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    performSave(content, template);
    alert('保存成功！');
  };

  // 更新简历名称
  const handleNameChange = (newName) => {
    setResumeName(newName);
    performSave(content, template, newName);
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
          {editingName ? (
            <input 
              className="resume-name-input" 
              value={resumeName} 
              onChange={e => setResumeName(e.target.value)}
              onBlur={() => { handleNameChange(resumeName); setEditingName(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { handleNameChange(resumeName); setEditingName(false); }}}
              autoFocus
            />
          ) : (
            <span className="resume-name" onClick={() => setEditingName(true)} title="点击编辑名称">
              {resumeName || resume?.name} ✏️
            </span>
          )}
        </div>
        <div className="toolbar-center">
          <button className="template-btn" onClick={() => setShowTemplatePicker(true)}>
            <span className="template-preview" style={{ backgroundColor: currentTemplate.color }}></span>
            {currentTemplate.name}
          </button>
          {saveStatus && (
            <span className={`save-status ${saveStatus}`}>
              {saveStatus === 'saving' ? '⏳ 保存中...' : '✅ 已保存'}
            </span>
          )}
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

// 简历预览组件 - 支持多种专业模板
function ResumePreview({ content, template }) {
  const renderProfessional = () => (
    <div className="template-professional">
      <div className="prof-sidebar">
        <div className="prof-avatar">{content.personal.name ? content.personal.name.charAt(0) : '我'}</div>
        <div className="prof-contact">
          {content.personal.phone && <div className="prof-contact-item">📱 {content.personal.phone}</div>}
          {content.personal.email && <div className="prof-contact-item">📧 {content.personal.email}</div>}
          {content.personal.location && <div className="prof-contact-item">📍 {content.personal.location}</div>}
          {content.personal.website && <div className="prof-contact-item">🔗 {content.personal.website}</div>}
        </div>
        {content.skills.length > 0 && (
          <div className="prof-section">
            <div className="prof-section-title">专业技能</div>
            {content.skills.map((s, i) => (
              <div key={i} className="prof-skill">
                <span className="prof-skill-name">{s.name}</span>
                <div className="prof-skill-bar"><div className="prof-skill-fill" style={{ width: s.level === '精通' ? '100%' : s.level === '高级' ? '80%' : s.level === '中级' ? '60%' : '40%' }} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="prof-main">
        <div className="prof-header">
          <div className="prof-name">{content.personal.name || '您的姓名'}</div>
          {content.personal.summary && <div className="prof-summary">{content.personal.summary}</div>}
        </div>
        {content.experience.length > 0 && (
          <div className="prof-section">
            <div className="prof-section-title">工作经历</div>
            {content.experience.map((exp, i) => (
              <div key={i} className="prof-item">
                <div className="prof-item-header">
                  <span className="prof-item-title">{exp.company}</span>
                  <span className="prof-item-date">{exp.startDate} - {exp.endDate}</span>
                </div>
                <div className="prof-item-sub">{exp.position}</div>
                {exp.description && <div className="prof-item-desc">{exp.description}</div>}
              </div>
            ))}
          </div>
        )}
        {content.education.length > 0 && (
          <div className="prof-section">
            <div className="prof-section-title">教育经历</div>
            {content.education.map((edu, i) => (
              <div key={i} className="prof-item">
                <div className="prof-item-header">
                  <span className="prof-item-title">{edu.school}</span>
                  <span className="prof-item-date">{edu.startDate} - {edu.endDate}</span>
                </div>
                <div className="prof-item-sub">{edu.degree} · {edu.major}</div>
              </div>
            ))}
          </div>
        )}
        {content.projects.length > 0 && (
          <div className="prof-section">
            <div className="prof-section-title">项目经历</div>
            {content.projects.map((proj, i) => (
              <div key={i} className="prof-item">
                <div className="prof-item-header">
                  <span className="prof-item-title">{proj.name}</span>
                  <span className="prof-item-date">{proj.startDate} - {proj.endDate}</span>
                </div>
                <div className="prof-item-sub">{proj.role}</div>
                {proj.description && <div className="prof-item-desc">{proj.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderModern = () => (
    <div className="template-modern">
      <div className="modern-header">
        <div className="modern-name">{content.personal.name || '您的姓名'}</div>
        <div className="modern-contact">
          {content.personal.phone && <span>{content.personal.phone}</span>}
          {content.personal.email && <span>{content.personal.email}</span>}
          {content.personal.location && <span>{content.personal.location}</span>}
        </div>
        {content.personal.summary && <div className="modern-summary">{content.personal.summary}</div>}
      </div>
      <div className="modern-content">
        {content.experience.length > 0 && (
          <div className="modern-section">
            <div className="modern-section-title">工作经历</div>
            {content.experience.map((exp, i) => (
              <div key={i} className="modern-item">
                <div className="modern-item-header">
                  <span className="modern-item-company">{exp.company}</span>
                  <span className="modern-item-date">{exp.startDate} - {exp.endDate}</span>
                </div>
                <div className="modern-item-position">{exp.position}</div>
                {exp.description && <div className="modern-item-desc">{exp.description}</div>}
              </div>
            ))}
          </div>
        )}
        {content.education.length > 0 && (
          <div className="modern-section">
            <div className="modern-section-title">教育经历</div>
            {content.education.map((edu, i) => (
              <div key={i} className="modern-item">
                <div className="modern-item-header">
                  <span className="modern-item-company">{edu.school}</span>
                  <span className="modern-item-date">{edu.startDate} - {edu.endDate}</span>
                </div>
                <div className="modern-item-position">{edu.degree} · {edu.major}</div>
              </div>
            ))}
          </div>
        )}
        {content.skills.length > 0 && (
          <div className="modern-section">
            <div className="modern-section-title">专业技能</div>
            <div className="modern-skills">
              {content.skills.map((s, i) => <span key={i} className="modern-skill-tag">{s.name}</span>)}
            </div>
          </div>
        )}
        {content.projects.length > 0 && (
          <div className="modern-section">
            <div className="modern-section-title">项目经历</div>
            {content.projects.map((proj, i) => (
              <div key={i} className="modern-item">
                <div className="modern-item-header">
                  <span className="modern-item-company">{proj.name}</span>
                  <span className="modern-item-date">{proj.startDate} - {proj.endDate}</span>
                </div>
                <div className="modern-item-position">{proj.role}</div>
                {proj.description && <div className="modern-item-desc">{proj.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCreative = () => (
    <div className="template-creative">
      <div className="creative-header">
        <div className="creative-avatar">{content.personal.name ? content.personal.name.charAt(0) : '我'}</div>
        <div className="creative-header-info">
          <div className="creative-name">{content.personal.name || '您的姓名'}</div>
          <div className="creative-contact">
            {content.personal.phone && <span>📱 {content.personal.phone}</span>}
            {content.personal.email && <span>📧 {content.personal.email}</span>}
            {content.personal.location && <span>📍 {content.personal.location}</span>}
          </div>
        </div>
      </div>
      {content.personal.summary && <div className="creative-summary">{content.personal.summary}</div>}
      <div className="creative-content">
        {content.experience.length > 0 && (
          <div className="creative-section">
            <div className="creative-section-title">💼 工作经历</div>
            {content.experience.map((exp, i) => (
              <div key={i} className="creative-item">
                <div className="creative-item-header">
                  <span className="creative-item-company">{exp.company}</span>
                  <span className="creative-item-date">{exp.startDate} - {exp.endDate}</span>
                </div>
                <div className="creative-item-position">{exp.position}</div>
                {exp.description && <div className="creative-item-desc">{exp.description}</div>}
              </div>
            ))}
          </div>
        )}
        {content.education.length > 0 && (
          <div className="creative-section">
            <div className="creative-section-title">🎓 教育经历</div>
            {content.education.map((edu, i) => (
              <div key={i} className="creative-item">
                <div className="creative-item-header">
                  <span className="creative-item-company">{edu.school}</span>
                  <span className="creative-item-date">{edu.startDate} - {edu.endDate}</span>
                </div>
                <div className="creative-item-position">{edu.degree} · {edu.major}</div>
              </div>
            ))}
          </div>
        )}
        {content.skills.length > 0 && (
          <div className="creative-section">
            <div className="creative-section-title">⚡ 专业技能</div>
            <div className="creative-skills">
              {content.skills.map((s, i) => <span key={i} className="creative-skill-tag">{s.name}</span>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // 根据模板选择渲染方式
  if (template === 'professional') {
    return <div className="resume-preview-document template-professional">{renderProfessional()}</div>;
  }
  if (template === 'creative') {
    return <div className="resume-preview-document template-creative">{renderCreative()}</div>;
  }
  return <div className="resume-preview-document template-modern">{renderModern()}</div>;
}

export default ResumeEditor;