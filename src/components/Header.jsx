import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

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
          <Link to="/" className="nav-link active">
            首页
          </Link>
          <Link to="/games" className="nav-link">
            游戏参考
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
