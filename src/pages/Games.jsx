import { useState, useRef, useCallback, useEffect } from 'react';
import { gamesAPI, charactersAPI, actionsAPI, characterRolesAPI } from '../lib/api';
import VideoPlayerEnhanced from '../components/VideoPlayerEnhanced';
import './Games.css';

function Games() {
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [activeRole, setActiveRole] = useState('全部');
  const [characterSearch, setCharacterSearch] = useState('');
  
  // 数据状态
  const [games, setGames] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [actions, setActions] = useState([]);
  const [characterActions, setCharacterActions] = useState([]);
  const [characterRoles, setCharacterRoles] = useState([]); // 角色分类列表
  
  // 加载状态
  const [gamesLoading, setGamesLoading] = useState(true);
  const [charactersLoading, setCharactersLoading] = useState(false);
  const [actionsLoading, setActionsLoading] = useState(false);
  
  // 播放器状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null);
  const [autoPlayVideo, setAutoPlayVideo] = useState(false); // 控制自动播放
  const videoRef = useRef(null);

  // 获取中文字符首字母（简化版）
  const getFirstChar = (str) => {
    if (!str) return '#';
    const firstChar = str.charAt(0);
    // 如果是英文字母，转大写
    if (/[a-zA-Z]/.test(firstChar)) {
      return firstChar.toUpperCase();
    }
    // 中文统一归为 "#"
    return '#';
  };

  // 按首字母分组游戏
  const gamesByLetter = games.reduce((acc, game) => {
    const letter = getFirstChar(game.name);
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(game);
    return acc;
  }, {});

  // 按分类筛选角色
  const filteredCharacters = characters.filter(char => {
    const matchesRole = activeRole === '全部' || char.category?.name === activeRole;
    const matchesSearch = char.name.toLowerCase().includes(characterSearch.toLowerCase());
    return matchesRole && matchesSearch;
  });

  // 加载游戏列表
  useEffect(() => {
    const loadGames = async () => {
      try {
        const response = await gamesAPI.getAll();
        setGames(response.data.games || []);
      } catch (error) {
        console.error('Failed to load games:', error);
        // 使用默认游戏列表
        setGames([
          { id: 1, name: '英雄联盟', letter: 'Y' },
          { id: 2, name: '原神', letter: 'Y' },
          { id: 3, name: '阿尔比恩', letter: 'A' },
        ]);
      } finally {
        setGamesLoading(false);
      }
    };
    loadGames();
  }, []);

  // 不需要加载所有动作列表，每个角色有自己的动作
  // 动作列表从 characterActions 动态获取

  // 加载角色列表（当选择游戏时）
  useEffect(() => {
    if (!selectedGame) {
      setCharacters([]);
      setCharacterRoles([]);
      return;
    }

    const loadCharacters = async () => {
      try {
        setCharactersLoading(true);
        
        // 并行加载角色列表和角色分类
        const [charactersResponse, rolesResponse] = await Promise.all([
          charactersAPI.getByGame(selectedGame.id),
          characterRolesAPI.getAll(selectedGame.id),
        ]);
        
        setCharacters(charactersResponse.data.characters || []);
        // ⭐ 后端返回 categories 数组，提取分类名称
        const categories = rolesResponse.data.categories || [];
        setCharacterRoles(categories.map(c => c.name));
      } catch (error) {
        console.error('Failed to load characters:', error);
        setCharacters([]);
        setCharacterRoles([]);
      } finally {
        setCharactersLoading(false);
      }
    };
    loadCharacters();
  }, [selectedGame]);

  // 加载角色的动作列表（当选择角色时）
  useEffect(() => {
    if (!selectedCharacter) {
      setCharacterActions([]);
      setSelectedAction(null);
      return;
    }

    const loadCharacterActions = async () => {
      try {
        setActionsLoading(true);
        const response = await charactersAPI.getActions(selectedCharacter.id);
        // API 返回：{ characterId, characterName, actions: [...] }
        setCharacterActions(response.data.actions || []);
      } catch (error) {
        console.error('Failed to load character actions:', error);
        setCharacterActions([]);
      } finally {
        setActionsLoading(false);
      }
    };
    loadCharacterActions();
  }, [selectedCharacter]);

  // 获取当前视频 URL
  const getCurrentVideoUrl = useCallback(() => {
    if (!selectedCharacter || selectedAction === null) return null;
    
    // 从角色动作列表中查找（selectedAction 现在是 action id）
    const charAction = characterActions.find(ca => ca.id === selectedAction);
    
    if (charAction && charAction.video?.qiniuUrl) {
      return charAction.video.qiniuUrl;
    }
    
    return null;
  }, [selectedCharacter, selectedAction, characterActions]);

  // 播放视频
  const playVideo = useCallback(() => {
    if (videoRef.current) {
      const newUrl = getCurrentVideoUrl();
      if (newUrl) {
        if (videoRef.current.src !== newUrl) {
          videoRef.current.src = newUrl;
          videoRef.current.load();
        }
        videoRef.current.play().catch(err => {
          console.log('Play prevented:', err);
        });
        setIsPlaying(true);
        setCurrentVideoUrl(newUrl);
      }
    }
  }, [getCurrentVideoUrl]);

  // 暂停视频
  const pauseVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // 切换播放/暂停
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  }, [isPlaying, playVideo, pauseVideo]);

  // 进度更新
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const { currentTime, duration } = videoRef.current;
      setCurrentTime(currentTime);
      setDuration(duration);
      if (duration > 0) {
        setProgress((currentTime / duration) * 100);
      }
    }
  }, []);

  // 视频结束 - 循环
  const handleEnded = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  }, []);

  // 进度条拖动
  const handleProgressChange = useCallback((e) => {
    if (videoRef.current) {
      const newTime = (e.target.value / 100) * duration;
      videoRef.current.currentTime = newTime;
      setProgress(e.target.value);
      setCurrentTime(newTime);
    }
  }, [duration]);

  // 格式化时间
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 选择角色时重置播放器
  useEffect(() => {
    if (selectedCharacter) {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
      setCurrentVideoUrl(null);
      if (videoRef.current) {
        videoRef.current.src = '';
      }
    }
  }, [selectedCharacter]);

  // 选择动作时自动播放
  useEffect(() => {
    if (selectedCharacter && selectedAction !== null) {
      playVideo();
    }
  }, [selectedAction, selectedCharacter, playVideo]);

  const handleGameSelect = (game) => {
    setSelectedGame(game);
    setSelectedCharacter(null);
    setSelectedAction(null);
    setActiveRole('全部');
    setCharacterSearch('');
    setIsPlaying(false);
    setProgress(0);
  };

  const handleCharacterSelect = (char) => {
    setSelectedCharacter(char);
    setSelectedAction(null);
    setIsPlaying(false);
    setProgress(0);
  };

  const handleActionSelect = (actionId) => {
    setSelectedAction(actionId);
    // 设置自动播放标志
    setAutoPlayVideo(true);
  };

  return (
    <div className="games-page">
      <div className="games-content">
        {/* 左侧游戏选择 - 悬停浮窗 */}
        <div className="game-panel-wrapper">
          {/* 窄条 - 始终显示 */}
          <div className="game-panel-narrow">
            <div className="letter-index">
              {Object.keys(gamesByLetter).map(letter => (
                <div key={letter} className="letter-item">
                  <span className="letter">{letter}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* 浮窗 - 鼠标悬停时显示 */}
          <div className="game-panel-popup">
            <div className="game-list">
              {Object.entries(gamesByLetter).map(([letter, gameList]) => (
                <div key={letter} className="letter-group">
                  <span className="letter">{letter}</span>
                  <div className="game-items">
                    {gameList.map(game => (
                      <div
                        key={game.id}
                        className={`game-item ${selectedGame?.id === game.id ? 'selected' : ''}`}
                        onClick={() => handleGameSelect(game)}
                      >
                        {game.iconUrl ? (
                          <img src={game.iconUrl} alt={game.name} className="game-icon-img" />
                        ) : (
                          <div className="game-icon-placeholder">
                            <span>{game.name.charAt(0)}</span>
                          </div>
                        )}
                        <span className="game-name">{game.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 中间视频区域 */}
        <div className="video-section">
          {selectedCharacter && selectedAction ? (
            <VideoPlayerEnhanced
              videoUrl={getCurrentVideoUrl()}
              videoTitle={`${selectedCharacter.name} - ${characterActions.find(ca => ca.id === selectedAction)?.name || '未命名'}`}
              autoPlay={autoPlayVideo}
            />
          ) : (
            <div className="video-player video-placeholder empty">
              <div className="empty-text">
                {selectedGame 
                  ? '请选择角色和动作' 
                  : '请选择游戏'}
              </div>
            </div>
          )}

          <div className="action-section">
            {actionsLoading ? (
              <div className="loading">加载动作列表...</div>
            ) : selectedCharacter ? (
              characterActions.length > 0 ? (
                <div className="action-grid">
                  {characterActions
                    .filter(charAction => charAction.video) // ⭐ 只显示有视频的动作
                    .map((charAction) => (
                      <button
                        key={charAction.id}
                        className={`action-btn ${selectedAction === charAction.id ? 'selected' : ''}`}
                        onClick={() => handleActionSelect(charAction.id)}
                      >
                        {charAction.name}
                      </button>
                    ))}
                </div>
              ) : (
                <div className="empty-actions">
                  该角色暂无动作
                  <p>请联系管理员上传视频</p>
                </div>
              )
            ) : (
              <div className="empty-actions">
                请先选择角色
              </div>
            )}
          </div>
        </div>

        {/* 右侧角色选择 */}
        <div className={`character-panel ${selectedGame ? 'show' : ''}`}>
          {selectedGame ? (
            <>
              <div className="character-search">
                <input
                  type="text"
                  className="character-search-input"
                  placeholder="搜索角色"
                  value={characterSearch}
                  onChange={(e) => setCharacterSearch(e.target.value)}
                />
                <span className="search-icon">🔍</span>
              </div>

              <div className="role-tabs">
                <button
                  className={`role-tab ${activeRole === '全部' ? 'active' : ''}`}
                  onClick={() => setActiveRole('全部')}
                >
                  全部
                </button>
                {characterRoles.map(role => (
                  <button
                    key={role}
                    className={`role-tab ${activeRole === role ? 'active' : ''}`}
                    onClick={() => setActiveRole(role)}
                  >
                    {role}
                  </button>
                ))}
              </div>

              <div className="character-grid">
                {charactersLoading ? (
                  <div className="loading">加载角色...</div>
                ) : filteredCharacters.length > 0 ? (
                  filteredCharacters.map(char => (
                    <div
                      key={char.id}
                      className={`character-item ${selectedCharacter?.id === char.id ? 'selected' : ''}`}
                      onClick={() => handleCharacterSelect(char)}
                    >
                      <img
                        src={char.avatar || `https://placehold.co/80x80/e0e0e0/999999?text=${char.name.charAt(0)}`}
                        alt={char.name}
                      />
                      <span className="character-name">{char.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty-characters">暂无角色</div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-character-panel">
              请先选择游戏
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Games;
