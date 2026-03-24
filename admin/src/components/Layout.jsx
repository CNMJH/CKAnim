import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import './Layout.css'

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const menuItems = [
    { path: '/', label: '游戏管理', icon: '🎮' },
    { path: '/categories', label: '分类管理', icon: '📁' },
    { path: '/characters', label: '角色管理', icon: '👤' },
    { path: '/actions', label: '动作管理', icon: '🎯' },
    { path: '/vip-plans', label: 'VIP 套餐', icon: '💎' },
    { path: '/avatar-review', label: '头像审核', icon: '🖼️' },
    { path: '/settings', label: '设置', icon: '⚙️' },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>CKAnim</h2>
          {sidebarOpen && <span>管理员后台</span>}
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-avatar">👤</span>
            {sidebarOpen && (
              <div className="user-details">
                <div className="user-name">{user?.username}</div>
                <div className="user-role">{user?.role}</div>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button onClick={handleLogout} className="logout-btn">
              退出登录
            </button>
          )}
        </div>
      </aside>
      <main className="main-content">
        <header className="main-header">
          <button
            className="toggle-sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <h1>{menuItems.find((item) => item.path === location.pathname)?.label || '管理后台'}</h1>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  )
}

export default Layout
