import { useNavigate, useLocation } from 'react-router-dom'
import { authUtils } from '../lib/api'
import { useEffect, useState } from 'react'
import './UserCenterLayout.css'

export default function UserCenterLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setCurrentUser({
          username: payload.username,
          role: payload.role,
        })
      } catch (e) {
        console.error('Failed to parse token:', e)
      }
    }
  }, [])

  const navItems = [
    { label: '个人信息', path: '/user' },
    { label: '我的收藏', path: '/user/favorites' },
    { label: '账号安全', path: '/user/security' },
    { label: '会员开通', path: '/user/vip' },
  ]

  const isActive = (path) => {
    if (path === '/user') {
      return location.pathname === '/user'
    }
    return location.pathname.startsWith(path)
  }

  const handleLogout = () => {
    // 清除本地存储
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    
    // 清除所有收藏夹相关状态
    localStorage.removeItem('selectedCollectionId')
    
    // 退出登录成功提示
    alert('已退出登录')
    
    // 跳转到首页
    window.location.href = '/'
  }

  return (
    <div className="user-center-layout">
      <div className="user-center-sidebar">
        <div className="user-avatar-section">
          <div className="user-avatar">
            {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <h3 className="user-username">{currentUser?.username || '用户'}</h3>
          <p className="user-role">
            {currentUser?.role === 'admin' ? '管理员' : '普通用户'}
          </p>
        </div>
        <nav className="user-nav">
          {navItems.map(item => (
            <button
              key={item.path}
              className={isActive(item.path) ? 'active' : ''}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="user-logout-section">
          <button className="user-logout-btn" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            退出登录
          </button>
        </div>
      </div>
      <div className="user-center-main">
        {children}
      </div>
    </div>
  )
}
