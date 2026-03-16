import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
          <Link to="/" className="nav-link active">
            首页
          </Link>
          <Link to="/games" className="nav-link">
            游戏参考
          </Link>
          <div 
            className="nav-link dropdown"
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            更多
            {dropdownOpen && (
              <div className="dropdown-menu">
                <a href="#" className="dropdown-item">我的收藏</a>
                <a href="#" className="dropdown-item">观看历史</a>
                <a href="#" className="dropdown-item">设置</a>
              </div>
            )}
          </div>
        </nav>

        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            className="search-input"
            placeholder="搜索视频"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="search-btn">
            🔍
          </button>
        </form>

        <div style={{ width: 100 }} /> {/* 占位，保持搜索框居中 */}
      </div>
    </header>
  );
}

export default Header;
