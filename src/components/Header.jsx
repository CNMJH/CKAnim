import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { siteSettingsAPI } from '../lib/api';
import './Header.css';

function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [siteName, setSiteName] = useState('CKAnim');
  const navigate = useNavigate();

  // 加载网站名称
  useEffect(() => {
    const loadSiteName = async () => {
      try {
        const response = await siteSettingsAPI.getOne('siteName');
        setSiteName(response.data.value || 'CKAnim');
      } catch (error) {
        console.error('加载网站名称失败:', error);
      }
    };
    loadSiteName();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        {/* 左侧导航 */}
        <nav className="nav">
          <Link to="/" className="nav-link logo">
            {siteName}
          </Link>
          <Link to="/" className="nav-link active">
            首页
          </Link>
          <Link to="/games" className="nav-link">
            游戏参考
          </Link>
          <Link to="/lottery" className="nav-link lottery-link">
            🎰 每日抽奖
          </Link>
        </nav>

        {/* 中间搜索框 */}
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            className="search-input"
            placeholder="输入您要搜索的内容"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="search-btn">
            🔍
          </button>
        </form>

        {/* 右侧占位 */}
        <div className="header-spacer" />
      </div>
    </header>
  );
}

export default Header;
