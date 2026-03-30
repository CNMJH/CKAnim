import { useState, useRef, useEffect } from 'react';
import { userLibraryAPI } from '../lib/api';
import VideoPlayerEnhanced from '../components/VideoPlayerEnhanced';
import UserCenterLayout from '../components/UserCenterLayout';
import './UserLibrary.css';

function UserLibrary() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  
  // 数据状态
  const [categories, setCategories] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [actions, setActions] = useState([]);
  
  // 加载状态
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [charactersLoading, setCharactersLoading] = useState(false);
  const [actionsLoading, setActionsLoading] = useState(false);
  
  // 播放器状态
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null);
  const videoRef = useRef(null);

  // 加载分类列表
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data } = await userLibraryAPI.getCategories();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // 加载角色列表（当选择分类时）
  useEffect(() => {
    if (!selectedCategory) {
      setCharacters([]);
      setSelectedCharacter(null);
      return;
    }

    const loadCharacters = async () => {
      try {
        setCharactersLoading(true);
        const { data } = await userLibraryAPI.getCharacters(selectedCategory.id);
        setCharacters(data.characters || []);
      } catch (error) {
        console.error('Failed to load characters:', error);
      } finally {
        setCharactersLoading(false);
      }
    };

    loadCharacters();
  }, [selectedCategory]);

  // 加载动作列表（当选择角色时）
  useEffect(() => {
    if (!selectedCharacter) {
      setActions([]);
      setSelectedAction(null);
      return;
    }

    const loadActions = async () => {
      try {
        setActionsLoading(true);
        const { data } = await userLibraryAPI.getActions(selectedCharacter.id);
        setActions(data.actions || []);
      } catch (error) {
        console.error('Failed to load actions:', error);
      } finally {
        setActionsLoading(false);
      }
    };

    loadActions();
  }, [selectedCharacter]);

  // 播放视频
  const handlePlayVideo = (action) => {
    if (action.video) {
      setSelectedAction(action);
      setCurrentVideoUrl(action.video.qiniuUrl);
    }
  };

  return (
    <UserCenterLayout>
      <div className="user-library-page">
        <div className="library-header">
          <h2>📚 个人参考库</h2>
          <p className="library-subtitle">管理您的私人动作参考视频</p>
        </div>

        {/* 播放器区域 */}
        {currentVideoUrl && selectedAction && (
          <div className="library-player-section">
            <VideoPlayerEnhanced
              ref={videoRef}
              videoUrl={currentVideoUrl}
              coverUrl={selectedAction.video.coverUrl}
              title={selectedAction.video.title || selectedAction.name}
              autoplay={true}
            />
            <div className="player-info">
              <h3>{selectedAction.video.title || selectedAction.name}</h3>
              {selectedAction.video.description && (
                <p className="video-description">{selectedAction.video.description}</p>
              )}
            </div>
          </div>
        )}

        {/* 筛选区域 */}
        <div className="library-filter-section">
          {/* 分类选择 */}
          <div className="filter-section">
            <h4>分类</h4>
            {categoriesLoading ? (
              <div className="loading">加载中...</div>
            ) : categories.length === 0 ? (
              <div className="empty-hint">
                暂无分类
                <p>请先在"参考库管理"中创建分类</p>
              </div>
            ) : (
              <div className="category-list">
                <button
                  className={`category-item ${!selectedCategory ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedCharacter(null);
                    setSelectedAction(null);
                    setCurrentVideoUrl(null);
                  }}
                >
                  全部
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    className={`category-item ${selectedCategory?.id === category.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCategory(category);
                      setSelectedCharacter(null);
                      setSelectedAction(null);
                      setCurrentVideoUrl(null);
                    }}
                  >
                    {category.icon && <span className="category-icon">{category.icon}</span>}
                    {category.name}
                    {category._count?.characters > 0 && (
                      <span className="category-count">{category._count.characters}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 角色选择 */}
          <div className="filter-section">
            <h4>角色</h4>
            {charactersLoading ? (
              <div className="loading">加载中...</div>
            ) : characters.length === 0 ? (
              <div className="empty-hint">
                {selectedCategory ? '该分类下暂无角色' : '请先选择分类'}
              </div>
            ) : (
              <div className="character-grid">
                {characters.map(character => (
                  <button
                    key={character.id}
                    className={`character-card ${selectedCharacter?.id === character.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCharacter(character);
                      setSelectedAction(null);
                      setCurrentVideoUrl(null);
                    }}
                  >
                    {character.avatar ? (
                      <img src={character.avatar} alt={character.name} className="character-avatar" />
                    ) : (
                      <div className="character-avatar-placeholder">
                        {character.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="character-name">{character.name}</span>
                    {character._count?.actions > 0 && (
                      <span className="character-count">{character._count.actions}个动作</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 动作选择 */}
          {selectedCharacter && (
            <div className="filter-section">
              <h4>动作</h4>
              {actionsLoading ? (
                <div className="loading">加载中...</div>
              ) : actions.length === 0 ? (
                <div className="empty-hint">该角色暂无动作</div>
              ) : (
                <div className="action-buttons">
                  {actions.map(action => (
                    <button
                      key={action.id}
                      className={`action-btn ${selectedAction?.id === action.id ? 'active' : ''} ${action.video ? 'has-video' : ''}`}
                      onClick={() => handlePlayVideo(action)}
                      disabled={!action.video}
                    >
                      {action.name}
                      {action.video && <span className="play-icon">▶</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 空状态提示 */}
        {!currentVideoUrl && categories.length === 0 && (
          <div className="library-empty-state">
            <div className="empty-icon">📚</div>
            <h3>个人参考库为空</h3>
            <p>请先在"参考库管理"中创建分类、角色和动作，然后上传视频</p>
          </div>
        )}
      </div>
    </UserCenterLayout>
  );
}

export default UserLibrary;
