import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { games, characters, characterRoles, actionTypes } from '../data/mockData';
import './Games.css';

function Games() {
  const [searchParams] = useSearchParams();
  const [selectedLetter, setSelectedLetter] = useState(searchParams.get('letter') || 'A');
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedRole, setSelectedRole] = useState('所有角色');
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [showGamePanel, setShowGamePanel] = useState(false);
  const [showCharacterPanel, setShowCharacterPanel] = useState(false);

  // 按字母分组游戏
  const gamesByLetter = games.reduce((acc, game) => {
    if (!acc[game.letter]) acc[game.letter] = [];
    acc[game.letter].push(game);
    return acc;
  }, {});

  const letters = Object.keys(gamesByLetter).sort();

  // 获取当前字母的游戏
  const currentGames = gamesByLetter[selectedLetter] || [];

  // 获取选中游戏的角色
  const currentCharacters = selectedGame 
    ? (characters[selectedGame.id] || []).filter(
        c => selectedRole === '所有角色' || c.role === selectedRole
      )
    : [];

  // 处理游戏选择
  const handleGameSelect = (game) => {
    setSelectedGame(game);
    setSelectedCharacter(null);
    setSelectedAction(null);
    setShowCharacterPanel(true);
  };

  return (
    <div className="games-page">
      <div className="games-content">
        {/* 左侧游戏选择面板 */}
        <div 
          className="game-panel"
          onMouseEnter={() => setShowGamePanel(true)}
          onMouseLeave={() => !selectedGame && setShowGamePanel(false)}
        >
          <div className={`game-list ${showGamePanel || selectedGame ? 'show' : ''}`}>
            {letters.map(letter => (
              <div key={letter} className="letter-group">
                <div className="letter">{letter}</div>
                <div className="game-items">
                  {gamesByLetter[letter].map(game => (
                    <div
                      key={game.id}
                      className={`game-item ${selectedGame?.id === game.id ? 'selected' : ''}`}
                      onClick={() => handleGameSelect(game)}
                    >
                      <img src={game.cover} alt={game.name} />
                      <span className="game-name">{game.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="panel-toggle">
            {showGamePanel || selectedGame ? '◀' : '▶'}
          </div>
        </div>

        {/* 中间视频播放区域 */}
        <div className="video-section">
          <div className="video-player">
            {selectedCharacter ? (
              <div className="video-placeholder">
                <div className="play-button-large">▶</div>
                <div className="video-info-text">
                  播放：{selectedGame?.name} - {selectedCharacter.name}
                </div>
              </div>
            ) : (
              <div className="video-placeholder empty">
                <div className="play-button-large">▶</div>
                <div className="empty-text">
                  {selectedGame 
                    ? '请选择角色' 
                    : '请先选择游戏'}
                </div>
              </div>
            )}
          </div>

          {/* 动作选择区域 */}
          <div className="action-section">
            <div className="action-grid">
              {actionTypes.map((action, index) => (
                <button
                  key={index}
                  className={`action-btn ${selectedAction === action ? 'selected' : ''}`}
                  onClick={() => setSelectedAction(action)}
                  disabled={!selectedCharacter}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧角色选择面板 */}
        <div 
          className={`character-panel ${showCharacterPanel || selectedGame ? 'show' : ''}`}
        >
          {selectedGame ? (
            <>
              <div className="character-search">
                <input 
                  type="text" 
                  placeholder="输入您要搜索的角色名"
                  className="character-search-input"
                />
                <span className="search-icon">🔍</span>
              </div>

              <div className="role-tabs">
                {characterRoles.map(role => (
                  <button
                    key={role}
                    className={`role-tab ${selectedRole === role ? 'active' : ''}`}
                    onClick={() => setSelectedRole(role)}
                  >
                    {role}
                  </button>
                ))}
              </div>

              <div className="character-grid">
                {currentCharacters.map(char => (
                  <div
                    key={char.id}
                    className={`character-item ${selectedCharacter?.id === char.id ? 'selected' : ''}`}
                    onClick={() => setSelectedCharacter(char)}
                  >
                    <img src={char.cover} alt={char.name} />
                    <span className="character-name">{char.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-character-panel">
              先选择游戏后，在此区域选择角色
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Games;
