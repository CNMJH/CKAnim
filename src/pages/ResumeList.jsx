import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authUtils } from '../lib/api';
import './ResumeList.css';

const TEMPLATE_COLORS = {
  classic: '#333333',
  formal: '#1a365d',
  academic: '#2d3748',
  modern: '#3182ce',
  minimalist: '#000000',
  clean: '#48bb78',
  creative: '#ed8936',
  colorful: '#9f7aea',
  bold: '#e53e3e',
  developer: '#667eea',
  techblue: '#2563eb',
  onepage: '#374151',
  english: '#1e40af',
};

const TEMPLATE_NAMES = {
  classic: 'Classic',
  formal: 'Formal',
  academic: 'Academic',
  modern: 'Modern',
  minimalist: 'Minimalist',
  clean: 'Clean',
  creative: 'Creative',
  colorful: 'Colorful',
  bold: 'Bold',
  developer: 'Developer',
  techblue: 'TechBlue',
  onepage: 'OnePage',
  english: 'English',
};

function ResumeList() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const { data } = await authUtils.authFetch('/api/resume/list');
      setResumes(data || []);
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const name = `我的简历 ${new Date().toLocaleDateString()}`;
      const { data } = await authUtils.authFetch('/api/resume/create', {
        method: 'POST',
        body: JSON.stringify({ name, template: 'modern' }),
      });
      navigate(`/resume/edit/${data.id}`);
    } catch (error) {
      console.error('Failed to create resume:', error);
      alert('创建失败，请重试');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`确定删除 "${name}" 吗？`)) return;
    try {
      await authUtils.authFetch(`/api/resume/${id}`, { method: 'DELETE' });
      setResumes(resumes.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to delete resume:', error);
      alert('删除失败，请重试');
    }
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
        <button className="create-btn" onClick={handleCreate}>
          ➕ 创建新简历
        </button>
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
                  style={{ backgroundColor: TEMPLATE_COLORS[resume.template] || '#3182ce' }}
                >
                  <span>{resume.name.charAt(0)}</span>
                </div>
              </div>
              <div className="resume-info">
                <h3>{resume.name}</h3>
                <p 
                  className="template-badge" 
                  style={{ backgroundColor: TEMPLATE_COLORS[resume.template] || '#3182ce' }}
                >
                  {TEMPLATE_NAMES[resume.template] || 'Modern'}
                </p>
                <p className="update-time">
                  更新于 {new Date(resume.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="resume-actions">
                <button onClick={() => navigate(`/resume/edit/${resume.id}`)}>
                  ✏️ 编辑
                </button>
                <button onClick={() => handleDelete(resume.id, resume.name)}>
                  🗑️ 删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ResumeList;