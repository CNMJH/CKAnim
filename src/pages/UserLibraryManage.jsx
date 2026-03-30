import { useState, useEffect } from 'react';
import { userLibraryAPI } from '../lib/api';
import { generateVideoCover } from '../lib/cover-generator';
import UserCenterLayout from '../components/UserCenterLayout';
import './UserLibraryManage.css';

function UserLibraryManage() {
  const [activeTab, setActiveTab] = useState('categories'); // categories, characters, actions, videos
  
  // VIP 空间统计
  const [stats, setStats] = useState(null);
  
  // 分类状态
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', icon: '', iconUrl: '' });
  const [editingCategory, setEditingCategory] = useState(null);

  // 角色状态
  const [characters, setCharacters] = useState([]);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [characterForm, setCharacterForm] = useState({ name: '', avatar: '', description: '', categoryId: null });
  const [editingCharacter, setEditingCharacter] = useState(null);

  // 动作状态
  const [actions, setActions] = useState([]);
  const [selectedCharacterForAction, setSelectedCharacterForAction] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionForm, setActionForm] = useState({ name: '', code: '', description: '' });
  const [editingAction, setEditingAction] = useState(null);

  // 视频上传状态
  const [uploadingVideo, setUploadingVideo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 加载数据和统计
  useEffect(() => {
    loadData();
    loadStats();
  }, [activeTab]);

  const loadStats = async () => {
    try {
      const { data } = await userLibraryAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadData = async () => {
    try {
      if (activeTab === 'categories') {
        const { data } = await userLibraryAPI.getCategories();
        setCategories(data.categories || []);
      } else if (activeTab === 'characters') {
        const { data } = await userLibraryAPI.getCharacters();
        setCharacters(data.characters || []);
      } else if (activeTab === 'actions') {
        // 动作需要先选择角色
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('加载失败：' + error.message);
    }
  };

  // ===== 分类管理 =====
  const handleSaveCategory = async () => {
    try {
      if (!categoryForm.name) {
        alert('请输入分类名称');
        return;
      }

      if (editingCategory) {
        await userLibraryAPI.updateCategory(editingCategory.id, categoryForm);
      } else {
        await userLibraryAPI.createCategory(categoryForm);
      }

      setShowCategoryModal(false);
      setCategoryForm({ name: '', icon: '', iconUrl: '' });
      setEditingCategory(null);
      loadData();
      alert('保存成功！');
    } catch (error) {
      console.error('Failed to save category:', error);
      alert('保存失败：' + error.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('确定要删除此分类吗？（同时会删除该分类下的所有角色）')) return;
    
    try {
      await userLibraryAPI.deleteCategory(id);
      loadData();
      alert('删除成功！');
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('删除失败：' + error.message);
    }
  };

  // ===== 角色管理 =====
  const handleSaveCharacter = async () => {
    try {
      if (!characterForm.name) {
        alert('请输入角色名称');
        return;
      }

      if (editingCharacter) {
        await userLibraryAPI.updateCharacter(editingCharacter.id, characterForm);
      } else {
        await userLibraryAPI.createCharacter(characterForm);
      }

      setShowCharacterModal(false);
      setCharacterForm({ name: '', avatar: '', description: '', categoryId: null });
      setEditingCharacter(null);
      loadData();
      alert('保存成功！');
    } catch (error) {
      console.error('Failed to save character:', error);
      alert('保存失败：' + error.message);
    }
  };

  const handleDeleteCharacter = async (id) => {
    if (!confirm('确定要删除此角色吗？（同时会删除该角色的所有动作和视频）')) return;
    
    try {
      await userLibraryAPI.deleteCharacter(id);
      loadData();
      alert('删除成功！');
    } catch (error) {
      console.error('Failed to delete character:', error);
      alert('删除失败：' + error.message);
    }
  };

  // ===== 动作管理 =====
  const handleLoadActions = async (character) => {
    setSelectedCharacterForAction(character);
    try {
      const { data } = await userLibraryAPI.getActions(character.id);
      setActions(data.actions || []);
    } catch (error) {
      console.error('Failed to load actions:', error);
      alert('加载动作失败：' + error.message);
    }
  };

  const handleSaveAction = async () => {
    try {
      if (!actionForm.name) {
        alert('请输入动作名称');
        return;
      }

      if (!selectedCharacterForAction) {
        alert('请先选择角色');
        return;
      }

      if (editingAction) {
        await userLibraryAPI.updateAction(editingAction.id, actionForm);
      } else {
        await userLibraryAPI.createAction(selectedCharacterForAction.id, actionForm);
      }

      setShowActionModal(false);
      setActionForm({ name: '', code: '', description: '' });
      setEditingAction(null);
      handleLoadActions(selectedCharacterForAction);
      alert('保存成功！');
    } catch (error) {
      console.error('Failed to save action:', error);
      alert('保存失败：' + error.message);
    }
  };

  const handleDeleteAction = async (id) => {
    if (!confirm('确定要删除此动作吗？（同时会删除关联的视频）')) return;
    
    try {
      await userLibraryAPI.deleteAction(id);
      handleLoadActions(selectedCharacterForAction);
      alert('删除成功！');
    } catch (error) {
      console.error('Failed to delete action:', error);
      alert('删除失败：' + error.message);
    }
  };

  // ===== 视频上传 =====
  const handleUploadVideo = async (action, file) => {
    try {
      setUploadingVideo(action.id);
      setUploadProgress(0);

      // 1. 获取上传凭证（包含 VIP 限制信息）
      const { data: tokenData } = await userLibraryAPI.getUploadToken(
        file.name,
        action.characterId,
        action.id
      );

      // 检查 VIP 限制
      if (tokenData.limits) {
        const { limits } = tokenData;
        
        // 检查是否允许上传
        if (limits.maxFileSize === 0) {
          setUploadingVideo(null);
          setUploadProgress(0);
          alert(`当前 VIP 等级不支持上传视频。\n\n当前等级：${limits.vipPlan}\n请升级 VIP 以解锁上传功能。`);
          return;
        }

        // 检查文件大小
        if (file.size > limits.maxFileSize) {
          setUploadingVideo(null);
          setUploadProgress(0);
          alert(`文件大小超出限制！\n\n当前 VIP 等级最大支持：${limits.maxFileSizeFormatted}\n当前文件大小：${(file.size / 1024 / 1024).toFixed(2)} MB\n\n请升级 VIP 以获取更大空间。`);
          return;
        }

        // 检查剩余空间
        if (file.size > limits.remainingSize) {
          setUploadingVideo(null);
          setUploadProgress(0);
          alert(`剩余空间不足！\n\n剩余空间：${limits.remainingSizeFormatted}\n需要空间：${(file.size / 1024 / 1024).toFixed(2)} MB\n\n请清理空间或升级 VIP。`);
          return;
        }
      }

      // 2. 上传视频
      const formData = new FormData();
      formData.append('token', tokenData.token);
      formData.append('key', tokenData.key);
      formData.append('file', file);

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percent);
          }
        });
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) resolve();
          else reject(new Error(`上传失败 (${xhr.status})`));
        });
        xhr.addEventListener('error', () => reject(new Error('网络错误')));
        xhr.open('POST', 'https://up-z2.qiniup.com/');
        xhr.send(formData);
      });

      // 3. 生成封面
      const { blob: coverBlob } = await generateVideoCover(file, 1, 0.8);
      const coverKey = tokenData.key.replace('.mp4', '-thumbnail.jpg');

      // 4. 上传封面
      const { data: coverTokenData } = await userLibraryAPI.getCoverUploadToken(coverKey);
      const coverFormData = new FormData();
      coverFormData.append('token', coverTokenData.token);
      coverFormData.append('key', coverKey);
      coverFormData.append('file', coverBlob);

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(50 + percent / 2);
          }
        });
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) resolve();
          else reject(new Error(`封面上传失败 (${xhr.status})`));
        });
        xhr.addEventListener('error', () => reject(new Error('封面上传网络错误')));
        xhr.open('POST', 'https://up-z2.qiniup.com/');
        xhr.send(coverFormData);
      });

      const coverUrl = `https://video.jiangmeijixie.com/${coverKey}`;

      // 5. 保存视频记录
      await userLibraryAPI.saveVideo({
        actionId: action.id,
        qiniuKey: tokenData.key,
        qiniuUrl: tokenData.url,
        coverUrl: coverUrl,
        title: action.name,
        fileSize: file.size,
      });

      setUploadingVideo(null);
      setUploadProgress(0);
      handleLoadActions(selectedCharacterForAction);
      loadStats(); // 更新统计信息
      alert('视频上传成功！');
    } catch (error) {
      console.error('Failed to upload video:', error);
      setUploadingVideo(null);
      setUploadProgress(0);
      alert('上传失败：' + error.message);
    }
  };

  return (
    <UserCenterLayout>
      <div className="user-library-manage-page">
        <div className="library-manage-header">
          <h2>⚙️ 参考库管理</h2>
          <p className="library-manage-subtitle">管理您的私人分类、角色、动作和视频</p>
        </div>

        {/* VIP 空间统计 */}
        {stats && (
          <div className="vip-stats-card">
            <div className="stats-header">
              <h3>📊 空间使用情况</h3>
              <span className={`vip-badge vip-${stats.vipPlan}`}>
                {stats.vipPlan === 'free' ? '普通用户' : 
                 stats.vipPlan === 'vip_monthly' ? 'VIP 月卡' :
                 stats.vipPlan === 'vip_yearly' ? 'VIP 年卡' : 'SVIP'}
              </span>
            </div>
            <div className="stats-content">
              <div className="stat-item">
                <div className="stat-label">已用空间</div>
                <div className="stat-value">{stats.totalSizeFormatted}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">总容量</div>
                <div className="stat-value">{stats.maxTotalSizeFormatted}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">剩余空间</div>
                <div className="stat-value">{stats.remainingSizeFormatted}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">单文件限制</div>
                <div className="stat-value">{stats.maxFileSizeFormatted}</div>
              </div>
            </div>
            <div className="stats-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${stats.usagePercent}%` }}
                ></div>
              </div>
              <div className="progress-text">{stats.usagePercent}% 已使用</div>
            </div>
            {stats.vipPlan === 'free' && (
              <div className="upgrade-hint">
                💡 升级 VIP 解锁视频上传功能，最高 50GB 空间
              </div>
            )}
          </div>
        )}

        {/* 标签页 */}
        <div className="manage-tabs">
          <button
            className={`manage-tab ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            📁 分类管理
          </button>
          <button
            className={`manage-tab ${activeTab === 'characters' ? 'active' : ''}`}
            onClick={() => setActiveTab('characters')}
          >
            👤 角色管理
          </button>
          <button
            className={`manage-tab ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions')}
          >
            🎬 动作管理
          </button>
        </div>

        {/* 分类管理 */}
        {activeTab === 'categories' && (
          <div className="manage-section">
            <div className="section-header">
              <h3>分类列表</h3>
              <button className="btn-primary" onClick={() => setShowCategoryModal(true)}>
                ➕ 新建分类
              </button>
            </div>

            {categories.length === 0 ? (
              <div className="empty-state">暂无分类</div>
            ) : (
              <div className="manage-list">
                {categories.map(category => (
                  <div key={category.id} className="manage-item">
                    <div className="item-info">
                      {category.icon && <span className="item-icon">{category.icon}</span>}
                      <span className="item-name">{category.name}</span>
                      <span className="item-count">{category._count?.characters || 0}个角色</span>
                    </div>
                    <div className="item-actions">
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setEditingCategory(category);
                          setCategoryForm({ name: category.name, icon: category.icon || '', iconUrl: category.iconUrl || '' });
                          setShowCategoryModal(true);
                        }}
                      >
                        编辑
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 角色管理 */}
        {activeTab === 'characters' && (
          <div className="manage-section">
            <div className="section-header">
              <h3>角色列表</h3>
              <button className="btn-primary" onClick={() => setShowCharacterModal(true)}>
                ➕ 新建角色
              </button>
            </div>

            {characters.length === 0 ? (
              <div className="empty-state">暂无角色</div>
            ) : (
              <div className="manage-list">
                {characters.map(character => (
                  <div key={character.id} className="manage-item">
                    <div className="item-info">
                      {character.avatar ? (
                        <img src={character.avatar} alt={character.name} className="item-avatar" />
                      ) : (
                        <div className="item-avatar-placeholder">{character.name.charAt(0).toUpperCase()}</div>
                      )}
                      <span className="item-name">{character.name}</span>
                      {character.category && (
                        <span className="item-category">{character.category.name}</span>
                      )}
                      <span className="item-count">{character._count?.actions || 0}个动作</span>
                    </div>
                    <div className="item-actions">
                      <button
                        className="btn-primary"
                        onClick={() => {
                          setSelectedCharacterForAction(character);
                          setActiveTab('actions');
                        }}
                      >
                        管理动作
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setEditingCharacter(character);
                          setCharacterForm({
                            name: character.name,
                            avatar: character.avatar || '',
                            description: character.description || '',
                            categoryId: character.categoryId,
                          });
                          setShowCharacterModal(true);
                        }}
                      >
                        编辑
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => handleDeleteCharacter(character.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 动作管理 */}
        {activeTab === 'actions' && (
          <div className="manage-section">
            <div className="section-header">
              <h3>动作管理</h3>
            </div>

            {!selectedCharacterForAction ? (
              <div className="character-select-hint">
                <p>请先选择一个角色来管理动作</p>
                <button className="btn-primary" onClick={() => setActiveTab('characters')}>
                  前往角色管理
                </button>
              </div>
            ) : (
              <>
                <div className="section-header">
                  <h4>
                    {selectedCharacterForAction.name} 的动作
                    <button
                      className="btn-primary"
                      onClick={() => {
                        setEditingAction(null);
                        setActionForm({ name: '', code: '', description: '' });
                        setShowActionModal(true);
                      }}
                    >
                      ➕ 新建动作
                    </button>
                  </h4>
                </div>

                {actions.length === 0 ? (
                  <div className="empty-state">该角色暂无动作</div>
                ) : (
                  <div className="manage-list">
                    {actions.map(action => (
                      <div key={action.id} className="manage-item">
                        <div className="item-info">
                          <span className="item-name">{action.name}</span>
                          {action.code && <span className="item-code">{action.code}</span>}
                          {action.video ? (
                            <span className="item-status has-video">✅ 已有视频</span>
                          ) : (
                            <span className="item-status no-video">❌ 无视频</span>
                          )}
                        </div>
                        <div className="item-actions">
                          <label className="btn-upload">
                            上传视频
                            <input
                              type="file"
                              accept="video/mp4,video/webm"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) handleUploadVideo(action, file);
                              }}
                              disabled={uploadingVideo === action.id}
                              style={{ display: 'none' }}
                            />
                          </label>
                          {uploadingVideo === action.id && (
                            <span className="upload-progress">上传中 {uploadProgress}%</span>
                          )}
                          <button
                            className="btn-secondary"
                            onClick={() => {
                              setEditingAction(action);
                              setActionForm({ name: action.name, code: action.code || '', description: action.description || '' });
                              setShowActionModal(true);
                            }}
                          >
                            编辑
                          </button>
                          <button
                            className="btn-danger"
                            onClick={() => handleDeleteAction(action.id)}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 分类弹窗 */}
        {showCategoryModal && (
          <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>{editingCategory ? '编辑分类' : '新建分类'}</h3>
              <div className="form-group">
                <label>分类名称</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="form-control"
                  placeholder="如：战士、法师、射手"
                />
              </div>
              <div className="form-group">
                <label>图标（可选）</label>
                <input
                  type="text"
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  className="form-control"
                  placeholder="如：⚔️"
                />
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowCategoryModal(false)}>取消</button>
                <button className="btn-primary" onClick={handleSaveCategory}>保存</button>
              </div>
            </div>
          </div>
        )}

        {/* 角色弹窗 */}
        {showCharacterModal && (
          <div className="modal-overlay" onClick={() => setShowCharacterModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>{editingCharacter ? '编辑角色' : '新建角色'}</h3>
              <div className="form-group">
                <label>角色名称</label>
                <input
                  type="text"
                  value={characterForm.name}
                  onChange={(e) => setCharacterForm({ ...characterForm, name: e.target.value })}
                  className="form-control"
                  placeholder="如：亚瑟、妲己"
                />
              </div>
              <div className="form-group">
                <label>头像 URL（可选）</label>
                <input
                  type="text"
                  value={characterForm.avatar}
                  onChange={(e) => setCharacterForm({ ...characterForm, avatar: e.target.value })}
                  className="form-control"
                  placeholder="https://..."
                />
              </div>
              <div className="form-group">
                <label>描述（可选）</label>
                <textarea
                  value={characterForm.description}
                  onChange={(e) => setCharacterForm({ ...characterForm, description: e.target.value })}
                  className="form-control"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>所属分类（可选）</label>
                <select
                  value={characterForm.categoryId || ''}
                  onChange={(e) => setCharacterForm({ ...characterForm, categoryId: e.target.value ? parseInt(e.target.value) : null })}
                  className="form-control"
                >
                  <option value="">无分类</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowCharacterModal(false)}>取消</button>
                <button className="btn-primary" onClick={handleSaveCharacter}>保存</button>
              </div>
            </div>
          </div>
        )}

        {/* 动作弹窗 */}
        {showActionModal && (
          <div className="modal-overlay" onClick={() => setShowActionModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>{editingAction ? '编辑动作' : '新建动作'}</h3>
              <div className="form-group">
                <label>动作名称</label>
                <input
                  type="text"
                  value={actionForm.name}
                  onChange={(e) => setActionForm({ ...actionForm, name: e.target.value })}
                  className="form-control"
                  placeholder="如：普通攻击、技能 1"
                />
              </div>
              <div className="form-group">
                <label>动作代码（可选）</label>
                <input
                  type="text"
                  value={actionForm.code}
                  onChange={(e) => setActionForm({ ...actionForm, code: e.target.value })}
                  className="form-control"
                  placeholder="如：attack_01"
                />
              </div>
              <div className="form-group">
                <label>描述（可选）</label>
                <textarea
                  value={actionForm.description}
                  onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                  className="form-control"
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowActionModal(false)}>取消</button>
                <button className="btn-primary" onClick={handleSaveAction}>保存</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserCenterLayout>
  );
}

export default UserLibraryManage;
