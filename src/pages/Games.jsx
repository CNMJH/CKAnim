import { useState } from 'react';
import { games, characters, videos } from '../data/mockData';
import './Games.css';

function Games() {
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [activeRole, setActiveRole] = useState('全部');
  const [characterSearch, setCharacterSearch] = useState('');

  // 按字母分组游戏
  const gamesByLetter = games.reduce((acc, game) => {
    if (!acc[game.letter]) acc[game.letter] = [];
    acc[game.letter].push(game);
    return acc;
  }, {});

  // 按职业筛选角色
  const filteredCharacters = characters.filter(char => {
    const matchesRole = activeRole === '全部' || char.role === activeRole;
    const matchesSearch = char.name.toLowerCase().includes(characterSearch.toLowerCase());
    const matchesGame = !selectedGame || char.game === selectedGame.id;
    return matchesRole && matchesSearch && matchesGame;
  });

  // 动作列表
  const actions = [
    '攻击', '走位', '技能', '普攻', '连招', '闪避', '格挡',
    '嘲讽', '治疗', '爆发', '控制', '位移', '隐身', '变身',
    '大招', '被动', '回城', '表情'
  ];

  const handleGameSelect = (game) => {
    setSelectedGame(game);
    setSelectedCharacter(null);
    setSelectedAction(null);
    setActiveRole('全部');
    setCharacterSearch('');
  };

  const handleCharacterSelect = (char) => {
    setSelectedCharacter(char);
  };

  return (
    <div className="games-page">
      <div className="games-content">
        {/* 左侧游戏选择 */}
        <div className="game-panel">
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
                      <img 
                        src={`https://placehold.co/80x80/e0e0e0/999999?text=${game.name.charAt(0)}`}
                        alt={game.name}
                      />
                      <span className="game-name">{game.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 中间视频区域 */}
        <div className="video-section">
          <div className="video-player">
            {selectedCharacter ? (
              <>
                <div className="play-button-large">▶</div>
                <div className="video-info-text">
                  {selectedCharacter.name} - {actions[selectedAction] || '选择动作'}
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
            <div className="action-grid">
              {actions.map((action, index) => (
                <button
                  key={action}
                  className={`action-btn ${selectedAction === index ? 'selected' : ''}`}
                  onClick={() => setSelectedAction(index)}
                  disabled={!selectedCharacter}
                >
                  {action}
                </button>
              ))}
            </div>
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
                {filteredCharacters.map(char => (
                  <div
                    key={char.id}
                    className={`character-item ${selectedCharacter?.id === char.id ? 'selected' : ''}`}
                    onClick={() => handleCharacterSelect(char)}
                  >
                    <img
                      src={`https://placehold.co/80x80/e0e0e0/999999?text=${char.name.charAt(0)}`}
                      alt={char.name}
                    />
                    <span className="character-name">{char.name}</span>
                  </div>
                ))}
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
