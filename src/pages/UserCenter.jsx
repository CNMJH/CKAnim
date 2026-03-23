import { useState, useEffect } from 'react'
import { userAPI, authUtils } from '../lib/api'
import './UserCenter.css'

function UserCenter() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile') // profile, favorites, security, vip
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    avatar: '',
    phone: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadUserInfo()
  }, [])

  const loadUserInfo = async () => {
    try {
      const { data } = await userAPI.getMe()
      setUser(data.user)
      setFormData({
        avatar: data.user.avatar || '',
        phone: data.user.phone || '',
      })
    } catch (err) {
      console.error('Failed to load user info:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async () => {
    try {
      const { data } = await userAPI.updateMe(formData)
      setUser(data.user)
      setEditing(false)
      showMessage('success', '个人信息更新成功')
    } catch (err) {
      showMessage('error', '更新失败：' + (err.response?.data?.message || '未知错误'))
    }
  }

  const handleUpdatePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage('error', '两次输入的新密码不一致')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      showMessage('error', '新密码长度至少为 6 位')
      return
    }
    try {
      await userAPI.updatePassword(passwordForm.currentPassword, passwordForm.newPassword)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      showMessage('success', '密码修改成功')
    } catch (err) {
      showMessage('error', '修改失败：' + (err.response?.data?.message || '未知错误'))
    }
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const getVipLevelText = (level) => {
    const map = {
      none: '普通用户',
      vip1: '月卡会员',
      vip2: '年卡会员',
      vip3: '永久会员',
    }
    return map[level] || '普通用户'
  }

  const getRoleText = (role) => {
    const map = {
      user: '普通用户',
      content_admin: '内容管理员',
      system_admin: '系统管理员',
    }
    return map[role] || '普通用户'
  }

  if (loading) {
    return <div className="user-center-loading">加载中...</div>
  }

  if (!user) {
    return (
      <div className="user-center-error">
        <h2>请先登录</h2>
        <p>登录后即可访问用户中心</p>
      </div>
    )
  }

  return (
    <div className="user-center">
      <div className="user-center-sidebar">
        <div className="user-avatar-section">
          <img
            src={user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username)}
            alt={user.username}
            className="user-avatar"
          />
          <h3 className="user-username">{user.username}</h3>
          <p className="user-role">{getRoleText(user.role)}</p>
        </div>
        <nav className="user-nav">
          <button
            className={activeTab === 'profile' ? 'active' : ''}
            onClick={() => setActiveTab('profile')}
          >
            个人信息
          </button>
          <button
            className={activeTab === 'favorites' ? 'active' : ''}
            onClick={() => setActiveTab('favorites')}
          >
            我的收藏
          </button>
          <button
            className={activeTab === 'security' ? 'active' : ''}
            onClick={() => setActiveTab('security')}
          >
            账号安全
          </button>
          <button
            className={activeTab === 'vip' ? 'active' : ''}
            onClick={() => setActiveTab('vip')}
          >
            会员开通
          </button>
          {authUtils.isAdmin() && (
            <button
              className={activeTab === 'admin' ? 'active' : ''}
              onClick={() => window.open('/admin', '_blank')}
            >
              管理后台
            </button>
          )}
        </nav>
      </div>

      <div className="user-center-content">
        {message.text && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}

        {activeTab === 'profile' && (
          <div className="profile-section">
            <h2>个人信息</h2>
            <div className="form-group">
              <label>用户名</label>
              <input type="text" value={user.username} disabled />
            </div>
            <div className="form-group">
              <label>邮箱</label>
              <input type="email" value={user.email} disabled />
            </div>
            <div className="form-group">
              <label>手机号</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="请输入手机号"
                />
              ) : (
                <input type="text" value={user.phone || '未设置'} disabled />
              )}
            </div>
            <div className="form-actions">
              {editing ? (
                <>
                  <button className="btn-primary" onClick={handleUpdateProfile}>
                    保存
                  </button>
                  <button className="btn-secondary" onClick={() => setEditing(false)}>
                    取消
                  </button>
                </>
              ) : (
                <button className="btn-primary" onClick={() => setEditing(true)}>
                  编辑
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="favorites-section">
            <h2>我的收藏</h2>
            <p className="empty-hint">收藏夹功能开发中...</p>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="security-section">
            <h2>账号安全</h2>
            <div className="form-group">
              <label>当前密码</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="请输入当前密码"
              />
            </div>
            <div className="form-group">
              <label>新密码</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="请输入新密码（至少 6 位）"
              />
            </div>
            <div className="form-group">
              <label>确认新密码</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="请再次输入新密码"
              />
            </div>
            <div className="form-actions">
              <button className="btn-primary" onClick={handleUpdatePassword}>
                修改密码
              </button>
            </div>
          </div>
        )}

        {activeTab === 'vip' && (
          <div className="vip-section">
            <h2>会员开通</h2>
            <div className="vip-cards">
              <div className="vip-card">
                <h3>VIP1 月卡</h3>
                <p className="vip-price">¥15/月</p>
                <ul className="vip-features">
                  <li>✓ 高清画质</li>
                  <li>✓ 去广告</li>
                  <li>✓ 专属标识</li>
                </ul>
                <button className="btn-vip">立即开通</button>
              </div>
              <div className="vip-card featured">
                <h3>VIP2 年卡</h3>
                <p className="vip-price">¥158/年</p>
                <ul className="vip-features">
                  <li>✓ 高清画质</li>
                  <li>✓ 去广告</li>
                  <li>✓ 专属标识</li>
                  <li>✓ 离线下载</li>
                </ul>
                <button className="btn-vip">立即开通</button>
              </div>
              <div className="vip-card">
                <h3>VIP3 永久</h3>
                <p className="vip-price">¥398/永久</p>
                <ul className="vip-features">
                  <li>✓ 所有 VIP 权益</li>
                  <li>✓ 优先客服</li>
                  <li>✓ 终身有效</li>
                </ul>
                <button className="btn-vip">立即开通</button>
              </div>
            </div>
            <p className="vip-hint">会员功能开发中，敬请期待...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserCenter
