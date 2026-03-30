import { useNavigate, useLocation } from 'react-router-dom'
import { authUtils } from '../lib/api'
import { useEffect, useState } from 'react'
import './UserCenterLayout.css'

export default function UserCenterLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const loadUserFromStorage = async () => {
      const token = localStorage.getItem('token')
      const userStr = localStorage.getItem('user')
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          const localUser = userStr ? JSON.parse(userStr) : null
          
          // 如果有 user 对象，使用其中的 vipLevel
          let vipLevel = localUser?.vipLevel || 'none'
          let vipExpires = localUser?.vipExpires
          
          // 如果 localUser 没有 vipLevel，尝试从 API 获取
          if (!localUser?.vipLevel) {
            try {
              const api = await import('../lib/api')
              const { data } = await api.userAPI.getMe()
              if (data.user) {
                vipLevel = data.user.vipLevel || 'none'
                vipExpires = data.user.vipExpires
                // 更新 localStorage
                localStorage.setItem('user', JSON.stringify(data.user))
              }
            } catch (e) {
              console.error('Failed to fetch user info:', e)
            }
          }
          
          // VIP 等级名称映射
          const vipLevelNames = {
            none: '普通用户',
            vip_monthly: 'VIP 月卡',
            vip_yearly: 'VIP 年卡',
            vip_lifetime: '永久 SVIP',
          }
          
          setCurrentUser({
            username: payload.username,
            role: payload.role,
            avatar: localUser?.avatar || payload.avatar || '',
            vipLevel: vipLevel,
            vipLevelName: vipLevelNames[vipLevel] || '普通用户',
            vipExpires: vipExpires,
          })
        } catch (e) {
          console.error('Failed to parse token:', e)
        }
      }
    }
    
    loadUserFromStorage()
    
    // 监听 storage 变化（其他标签页更新）
    window.addEventListener('storage', loadUserFromStorage)
    
    // 定时刷新用户信息（每 5 秒检查一次）
    const interval = setInterval(loadUserFromStorage, 5000)
    
    return () => {
      window.removeEventListener('storage', loadUserFromStorage)
      clearInterval(interval)
    }
  }, [])

  const navItems = [
    { label: '个人信息', path: '/user' },
    { label: '我的收藏', path: '/user/favorites' },
    { label: '📚 个人参考库', path: '/user/library' },
    { label: '⚙️ 参考库管理', path: '/user/library/manage' },
    { label: '🎰 每日抽奖', path: '/user/lottery' },
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
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt={currentUser.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              currentUser?.username?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
          <h3 className="user-username">{currentUser?.username || '用户'}</h3>
          <p className="user-role">
            {currentUser?.vipLevelName || '普通用户'}
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
