import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showGameDropdown, setShowGameDropdown] = useState(false);
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
        <nav className="nav">
          <Link to="/" className="nav-link">首页</Link>
          <div 
            className="nav-link dropdown"
            onMouseEnter={() => setShowGameDropdown(true)}
            onMouseLeave={() => setShowGameDropdown(false)}
          >
            游戏参考
            {showGameDropdown && (
              <div className="dropdown-menu">
                <Link to="/games" className="dropdown-item">全部游戏</Link>
                <Link to="/games?letter=A" className="dropdown-item">A 开头</Link>
                <Link to="/games?letter=B" className="dropdown-item">B 开头</Link>
                <Link to="/games?letter=C" className="dropdown-item">C 开头</Link>
              </div>
            )}
          </div>
        </nav>

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
      </div>
    </header>
  );
}

export default Header;
