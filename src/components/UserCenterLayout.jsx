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
      </div>
      <div className="user-center-main">
        {children}
      </div>
    </div>
  )
}
