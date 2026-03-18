import { useState, useRef, useCallback, useEffect } from 'react';
import { gamesAPI, charactersAPI, actionsAPI } from '../lib/api';
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

  // 按职业筛选角色
  const filteredCharacters = characters.filter(char => {
    const matchesRole = activeRole === '全部' || char.role === activeRole;
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

  // 加载动作列表
  useEffect(() => {
    const loadActions = async () => {
      try {
        setActionsLoading(true);
        const response = await actionsAPI.getAll();
        setActions(response.data.actions || []);
      } catch (error) {
        console.error('Failed to load actions:', error);
        // 使用默认动作列表
        setActions([
          { id: 1, name: '攻击', code: 'attack' },
          { id: 2, name: '走位', code: 'walk' },
          { id: 3, name: '技能', code: 'skill' },
          { id: 4, name: '普攻', code: 'basic' },
          { id: 5, name: '连招', code: 'combo' },
          { id: 6, name: '闪避', code: 'dodge' },
          { id: 7, name: '格挡', code: 'block' },
          { id: 8, name: '嘲讽', code: 'taunt' },
          { id: 9, name: '治疗', code: 'heal' },
          { id: 10, name: '爆发', code: 'burst' },
          { id: 11, name: '控制', code: 'control' },
          { id: 12, name: '位移', code: 'dash' },
          { id: 13, name: '隐身', code: 'stealth' },
          { id: 14, name: '变身', code: 'transform' },
          { id: 15, name: '大招', code: 'ultimate' },
          { id: 16, name: '被动', code: 'passive' },
          { id: 17, name: '回城', code: 'recall' },
          { id: 18, name: '表情', code: 'emote' },
        ]);
      } finally {
        setActionsLoading(false);
      }
    };
    loadActions();
  }, []);

  // 加载角色列表（当选择游戏时）
  useEffect(() => {
    if (!selectedGame) {
      setCharacters([]);
      return;
    }

    const loadCharacters = async () => {
      try {
        setCharactersLoading(true);
        const response = await charactersAPI.getByGame(selectedGame.id);
        setCharacters(response.data.characters || []);
      } catch (error) {
        console.error('Failed to load characters:', error);
        setCharacters([]);
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
        const response = await charactersAPI.getActions(selectedCharacter.id);
        setCharacterActions(response.data.actions || []);
      } catch (error) {
        console.error('Failed to load character actions:', error);
        setCharacterActions([]);
      }
    };
    loadCharacterActions();
  }, [selectedCharacter]);

  // 获取当前视频 URL
  const getCurrentVideoUrl = useCallback(() => {
    if (!selectedCharacter || selectedAction === null) return null;
    
    // 从角色动作列表中查找
    const charAction = characterActions.find(ca => {
      // selectedAction 可能是动作 ID 或索引
      if (typeof selectedAction === 'number') {
        return ca.actionId === selectedAction || ca.id === selectedAction;
      }
      return false;
    });
    
    if (charAction) {
      // 优先使用关联的视频 URL
      if (charAction.video?.qiniuUrl) {
        return charAction.video.qiniuUrl;
      }
      if (charAction.videoUrl) {
        return charAction.videoUrl;
      }
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
          <div className="video-player">
            {selectedCharacter ? (
              <>
                {/* 视频元素 */}
                <video
                  ref={videoRef}
                  className="video-element"
                  loop
                  playsInline
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleEnded}
                  onClick={togglePlay}
                />
                
                {/* 播放/暂停按钮 */}
                <button
                  className="play-pause-btn"
                  onClick={togglePlay}
                  style={{ opacity: isPlaying ? 0 : 1 }}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                
                {/* 控制栏 */}
                <div className="video-controls">
                  {/* 进度条 */}
                  <input
                    type="range"
                    className="progress-slider"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={handleProgressChange}
                  />
                  
                  {/* 时间显示 */}
                  <div className="time-display">
                    <span>{formatTime(currentTime)}</span>
                    <span>/</span>
                    <span>{formatTime(duration || 0)}</span>
                  </div>
                  
                  {/* 视频信息 */}
                  <div className="video-info-text">
                    {selectedCharacter.name} - {
                      actions.find(a => a.id === selectedAction)?.name || 
                      actions.find(a => a.code === selectedAction)?.name ||
                      '选择动作'
                    }
                  </div>
                </div>
              </>
            ) : (
              <div className="video-placeholder empty">
                <div className="empty-text">
                  {selectedGame 
                    ? '请选择角色' 
                    : '请选择游戏'}
                </div>
              </div>
            )}
          </div>

          <div className="action-section">
            {actionsLoading ? (
              <div className="loading">加载动作列表...</div>
            ) : (
              <div className="action-grid">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    className={`action-btn ${selectedAction === action.id ? 'selected' : ''}`}
                    onClick={() => handleActionSelect(action.id)}
                    disabled={!selectedCharacter}
                  >
                    {action.name}
                  </button>
                ))}
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
                {['战士', '法师', '刺客', '坦克', '射手', '辅助'].map(role => (
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
