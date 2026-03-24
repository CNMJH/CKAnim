import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { userAPI, authUtils, favoritesAPI } from '../lib/api'
import axios from 'axios'
import UserCenterLayout from '../components/UserCenterLayout'
import './UserCenter.css'

function UserCenter() {
  const navigate = useNavigate()
  const location = useLocation()
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
  const [vipPlans, setVipPlans] = useState([]) // VIP 套餐列表
  const [collections, setCollections] = useState([]) // 收藏夹列表
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false) // 头像上传中
  const [avatarPreview, setAvatarPreview] = useState(null) // 头像预览 URL

  // 根据 URL 路径设置 activeTab
  useEffect(() => {
    const path = location.pathname
    if (path === '/user/security') {
      setActiveTab('security')
    } else if (path === '/user/vip') {
      setActiveTab('vip')
    } else if (path === '/user/favorites') {
      setActiveTab('favorites')
    } else {
      setActiveTab('profile')
    }
  }, [location.pathname])

  useEffect(() => {
    loadUserInfo()
    loadVipPlans()
  }, [])

  // 加载收藏夹列表
  const loadCollections = async () => {
    if (!authUtils.isAuthenticated()) return
    setCollectionsLoading(true)
    try {
      const { data } = await favoritesAPI.getCollections()
      setCollections(data.collections || [])
    } catch (err) {
      console.error('Failed to load collections:', err)
    } finally {
      setCollectionsLoading(false)
    }
  }

  // 切换到收藏夹标签页时加载数据
  useEffect(() => {
    if (activeTab === 'favorites') {
      loadCollections()
    }
  }, [activeTab])

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

  const loadVipPlans = async () => {
    try {
      const { data } = await axios.get('/api/vip-plans')
      setVipPlans(data.plans || [])
    } catch (err) {
      console.error('Failed to load VIP plans:', err)
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

  // 处理头像上传
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      showMessage('error', '请上传图片文件')
      return
    }

    // 验证文件大小（最大 5MB）
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', '头像大小不能超过 5MB')
      return
    }

    try {
      setUploadingAvatar(true)

      // 1. 获取上传凭证
      const { data: tokenData } = await userAPI.getAvatarUploadToken(file.name)
      const { token, key, uploadUrl } = tokenData

      // 2. 上传到七牛云
      const formData = new FormData()
      formData.append('token', token)
      formData.append('file', file)
      formData.append('key', key)

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('上传失败')
      }

      const uploadResult = await uploadResponse.json()
      const avatarUrl = `http://video.jiangmeijixie.com/${key}`

      // 3. 提交头像审核
      await userAPI.submitAvatar(avatarUrl, key)

      // 4. 更新本地显示
      setAvatarPreview(avatarUrl)
      setFormData(prev => ({ ...prev, avatar: avatarUrl }))
      
      showMessage('success', '头像已上传，等待审核通过后显示')
    } catch (err) {
      console.error('Avatar upload error:', err)
      showMessage('error', '上传失败：' + (err.message || '未知错误'))
    } finally {
      setUploadingAvatar(false)
    }
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const getVipLevelText = (level) => {
    const map = {
      vip0: '普通用户',
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
    <UserCenterLayout>
      <div className="user-center-content">
        {message.text && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}

        {activeTab === 'profile' && (
          <div className="profile-section">
            <h2>个人信息</h2>
            
            {/* 头像上传区域 */}
            <div className="avatar-upload-section">
              <div className="avatar-preview">
                <img
                  src={avatarPreview || user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=667eea&color=fff&size=200`}
                  alt="头像"
                />
                {user.avatarStatus === 'pending' && (
                  <div className="avatar-status pending">
                    <span>审核中</span>
                  </div>
                )}
                {user.avatarStatus === 'rejected' && (
                  <div className="avatar-status rejected">
                    <span>已拒绝</span>
                  </div>
                )}
              </div>
              <div className="avatar-upload-info">
                <label className="avatar-upload-btn">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    style={{ display: 'none' }}
                  />
                  {uploadingAvatar ? '上传中...' : '更换头像'}
                </label>
                <p className="avatar-hint">支持 JPG、PNG 格式，大小不超过 5MB</p>
                {user.avatarStatus === 'pending' && (
                  <p className="avatar-status-hint">头像正在审核中，审核通过前不会显示</p>
                )}
                {user.avatarStatus === 'rejected' && (
                  <p className="avatar-reject-reason">
                    拒绝原因：{user.avatarRejectReason || '不符合规范'}
                  </p>
                )}
              </div>
            </div>

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
            
            {collectionsLoading ? (
              <div className="collections-loading">加载中...</div>
            ) : collections.length === 0 ? (
              <div className="favorites-hint">
                <p>管理你的收藏夹，创建多个分类收藏喜欢的视频</p>
                <button 
                  className="btn-primary"
                  onClick={() => navigate('/user/favorites')}
                >
                  管理收藏夹
                </button>
              </div>
            ) : (
              <div className="user-collections-list">
                {collections.map((collection) => (
                  <div
                    key={collection.id}
                    className="user-collection-item"
                    onClick={() => navigate(`/user/favorites/${collection.id}`)}
                  >
                    <div className="collection-cover">
                      {collection.cover ? (
                        <img src={collection.cover} alt={collection.name} />
                      ) : (
                        <div className="empty-cover">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="collection-info">
                      <div className="collection-name">
                        {collection.name}
                        {collection.isDefault && (
                          <span className="default-badge">默认</span>
                        )}
                      </div>
                      <div className="collection-count">
                        {collection.count} 个视频
                      </div>
                    </div>
                    <div className="collection-arrow">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            {vipPlans.length === 0 ? (
              <p className="empty-hint">会员套餐加载中...</p>
            ) : (
              <div className="vip-cards">
                {vipPlans.map((plan, index) => (
                  <div 
                    key={plan.id} 
                    className={`vip-card ${plan.badge ? 'featured' : ''}`}
                  >
                    {plan.badge && <span className="vip-badge">{plan.badge}</span>}
                    <h3>{plan.name}</h3>
                    <p className="vip-price">{plan.price}</p>
                    {plan.originalPrice && (
                      <p className="vip-original-price">{plan.originalPrice}</p>
                    )}
                    <ul className="vip-features">
                      {plan.features.map((feature, idx) => (
                        <li key={idx}>✓ {feature}</li>
                      ))}
                    </ul>
                    <button className="btn-vip">立即开通</button>
                  </div>
                ))}
              </div>
            )}
            <p className="vip-hint">会员功能开发中，敬请期待...</p>
          </div>
        )}
      </div>
    </UserCenterLayout>
  )
}

export default UserCenter
