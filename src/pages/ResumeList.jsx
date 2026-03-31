import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ResumeList.css';

// 本地存储 key
const STORAGE_KEY = 'ckanim_resumes';

// 默认模板配置
const DEFAULT_TEMPLATES = [
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

function ResumeList() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name }
  const [importError, setImportError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadResumes();
  }, []);

  // 从 localStorage 加载简历列表
  const loadResumes = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const data = stored ? JSON.parse(stored) : [];
      // 按更新时间排序
      data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setResumes(data);
    } catch (error) {
      console.error('Failed to load resumes:', error);
      setResumes([]);
    } finally {
      setLoading(false);
    }
  };

  // 保存到 localStorage
  const saveResumes = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setResumes(data);
  };

  // 创建新简历
  const handleCreate = () => {
    const newResume = {
      id: Date.now(), // 用时间戳作为唯一 ID
      name: `我的简历 ${new Date().toLocaleDateString()}`,
      template: 'modern',
      content: {
        personal: { name: '', phone: '', email: '', avatar: '', location: '', website: '', summary: '' },
        education: [],
        experience: [],
        skills: [],
        projects: [],
        certifications: [],
        languages: [],
        interests: [],
      },
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updated = [...resumes, newResume];
    saveResumes(updated);
    navigate(`/resume/edit/${newResume.id}`);
  };

  // 删除简历 - 显示确认弹窗
  const handleDeleteClick = (id, name) => {
    setDeleteConfirm({ id, name });
  };

  // 确认删除
  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    const updated = resumes.filter(r => r.id !== deleteConfirm.id);
    saveResumes(updated);
    setDeleteConfirm(null);
  };

  // 取消删除
  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  // 复制简历
  const handleDuplicate = (resume) => {
    const newResume = {
      ...resume,
      id: Date.now(),
      name: `${resume.name} (副本)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...resumes, newResume];
    saveResumes(updated);
  };

  // 导出 JSON
  const handleExport = (resume) => {
    const dataStr = JSON.stringify(resume, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${resume.name}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 导入 JSON
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        // 验证数据结构
        if (!imported.content || !imported.template) {
          setImportError('无效的简历文件格式');
          return;
        }
        const newResume = {
          ...imported,
          id: Date.now(),
          name: imported.name ? `${imported.name} (导入)` : `导入的简历 ${new Date().toLocaleDateString()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const updated = [...resumes, newResume];
        saveResumes(updated);
        setImportError('');
      } catch (error) {
        setImportError('文件解析失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // 清空 input
  };

  // 导出所有简历
  const handleExportAll = () => {
    const dataStr = JSON.stringify(resumes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ckanim_resumes_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 获取模板颜色
  const getTemplateColor = (templateId) => {
    const template = DEFAULT_TEMPLATES.find(t => t.id === templateId);
    return template?.color || '#3182ce';
  };

  // 获取模板名称
  const getTemplateName = (templateId) => {
    const template = DEFAULT_TEMPLATES.find(t => t.id === templateId);
    return template?.name || 'Modern';
  };

  if (loading) {
    return (
      <div className="resume-list-page">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="resume-list-page">
      <div className="resume-list-header">
        <h1>📄 我的简历</h1>
        <p className="storage-tip">💡 简历数据存储在本地浏览器，清除浏览器数据会丢失</p>
        <div className="header-actions">
          <button className="create-btn" onClick={handleCreate}>
            ➕ 创建新简历
          </button>
          {resumes.length > 0 && (
            <button className="export-all-btn" onClick={handleExportAll}>
              📥 导出全部
            </button>
          )}
          <label className="import-btn">
            📤 导入简历
            <input type="file" accept=".json" onChange={handleImport} hidden />
          </label>
        </div>
        {importError && <p className="import-error">⚠️ {importError}</p>}
      </div>

      {resumes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <p>还没有简历，点击上方按钮创建你的第一份简历</p>
          <button className="create-btn-large" onClick={handleCreate}>
            开始创建
          </button>
        </div>
      ) : (
        <div className="resume-grid">
          {resumes.map(resume => (
            <div key={resume.id} className="resume-card">
              <div className="resume-preview">
                <div 
                  className="preview-placeholder" 
                  style={{ backgroundColor: getTemplateColor(resume.template) }}
                >
                  <span>{resume.name.charAt(0)}</span>
                </div>
              </div>
              <div className="resume-info">
                <h3>{resume.name}</h3>
                <p 
                  className="template-badge" 
                  style={{ backgroundColor: getTemplateColor(resume.template) }}
                >
                  {getTemplateName(resume.template)}
                </p>
                <p className="update-time">
                  更新于 {new Date(resume.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="resume-actions">
                <button className="edit-btn" onClick={() => navigate(`/resume/edit/${resume.id}`)}>
                  ✏️ 编辑
                </button>
                <button className="duplicate-btn" onClick={() => handleDuplicate(resume)}>
                  📋 复制
                </button>
                <button className="export-btn" onClick={() => handleExport(resume)}>
                  💾 导出
                </button>
                <button className="delete-btn" onClick={() => handleDeleteClick(resume.id, resume.name)}>
                  🗑️ 删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="delete-confirm-overlay" onClick={handleDeleteCancel}>
          <div className="delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="delete-confirm-icon">🗑️</div>
            <h3>确认删除</h3>
            <p>确定要删除简历「{deleteConfirm.name}」吗？</p>
            <p className="delete-confirm-warning">⚠️ 此操作无法撤销</p>
            <div className="delete-confirm-buttons">
              <button className="cancel-btn" onClick={handleDeleteCancel}>取消</button>
              <button className="delete-btn" onClick={handleDeleteConfirm}>确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumeList;