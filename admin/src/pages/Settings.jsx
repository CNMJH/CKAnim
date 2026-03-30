import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authAPI, settingsAPI } from '../lib/services'
import Layout from '../components/Layout'
import { useAuthStore } from '../store/auth'
import './Settings.css'

function Settings() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { logout, user } = useAuthStore()
  const queryClient = useQueryClient()

  // 检查是否是系统管理员
  const isSystemAdmin = user?.role === 'system_admin'

  // 网站设置状态
  const [siteName, setSiteName] = useState('CKAnim')
  const [siteNamePosition, setSiteNamePosition] = useState('header')
  const [footerText, setFooterText] = useState('')
  const [footerLinks, setFooterLinks] = useState([])
  const [announcementText, setAnnouncementText] = useState('')
  const [announcementEnabled, setAnnouncementEnabled] = useState(true)
  const [announcementColor, setAnnouncementColor] = useState('#666')
  
  // 会员登录按钮显示开关
  const [showVipLoginButton, setShowVipLoginButton] = useState(true)

  // 获取设置
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const res = await settingsAPI.getAll()
      return res.data.settings || {}
    },
  })

  // 加载设置数据
  useEffect(() => {
    if (settingsData) {
      // 加载网站名称
      if (settingsData.siteName?.value) {
        setSiteName(settingsData.siteName.value)
      }
      // 加载网站名称位置
      if (settingsData.siteNamePosition?.value) {
        setSiteNamePosition(settingsData.siteNamePosition.value)
      }
      // 加载页脚信息
      if (settingsData.siteFooter?.value) {
        try {
          const footer = JSON.parse(settingsData.siteFooter.value)
          setFooterText(footer.text || '')
          setFooterLinks(footer.links || [])
        } catch (e) {
          console.error('解析页脚信息失败:', e)
        }
      }
      // 加载公告信息
      if (settingsData.siteAnnouncement?.value) {
        try {
          const announcement = JSON.parse(settingsData.siteAnnouncement.value)
          setAnnouncementText(announcement.text || '')
          setAnnouncementEnabled(announcement.enabled ?? true)
          setAnnouncementColor(announcement.color || '#666')
        } catch (e) {
          console.error('解析公告信息失败:', e)
        }
      }
      // 加载会员登录按钮设置
      if (settingsData.showVipLoginButton?.value !== undefined) {
        setShowVipLoginButton(settingsData.showVipLoginButton.value === 'true')
      }
    }
  }, [settingsData])

  // 保存网站设置
  const saveMutation = useMutation({
    mutationFn: async () => {
      const settings = [
        {
          key: 'siteName',
          value: siteName,
          description: '网站名称',
        },
        {
          key: 'siteNamePosition',
          value: siteNamePosition,
          description: '网站名称显示位置',
        },
        {
          key: 'siteFooter',
          value: JSON.stringify({
            text: footerText,
            links: footerLinks,
          }),
          description: '网站页脚信息',
        },
        {
          key: 'siteAnnouncement',
          value: JSON.stringify({
            text: announcementText,
            enabled: announcementEnabled,
            color: announcementColor,
          }),
          description: '全站公告',
        },
        {
          key: 'showVipLoginButton',
          value: showVipLoginButton ? 'true' : 'false',
          description: '是否显示视频播放器会员登录按钮',
        },
      ]
      await settingsAPI.batchUpdate(settings)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['siteSettings'])
      alert('设置保存成功！')
    },
    onError: (err) => {
      alert('保存失败：' + err.message)
    },
  })

  // 修改密码
  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error('两次输入的新密码不一致')
      }
      if (newPassword.length < 6) {
        throw new Error('新密码长度至少为 6 位')
      }
      await authAPI.changePassword(currentPassword, newPassword)
    },
    onSuccess: () => {
      alert('密码修改成功！请重新登录')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      logout()
    },
    onError: (err) => {
      setError(err.message || '密码修改失败')
    },
  })

  const handleSave = () => {
    saveMutation.mutate()
  }

  const handlePasswordChange = () => {
    setError('')
    passwordMutation.mutate()
  }

  const handleAddLink = () => {
    setFooterLinks([...footerLinks, { text: '', url: '' }])
  }

  const handleUpdateLink = (index, field, value) => {
    const newLinks = [...footerLinks]
    newLinks[index][field] = value
    setFooterLinks(newLinks)
  }

  const handleRemoveLink = (index) => {
    setFooterLinks(footerLinks.filter((_, i) => i !== index))
  }

  if (settingsLoading) {
    return <Layout><div className="loading">加载中...</div></Layout>
  }

  return (
    <Layout>
      <div className="settings-page">
        <div className="settings-header">
          <h1>⚙️ 设置</h1>
        </div>

        {/* 网站配置 */}
        <div className="settings-section">
          <h2>🌐 网站配置</h2>
          <p className="section-description">配置网站基本信息和显示内容</p>
          
          <div className="form-group">
            <label>网站名称</label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="请输入网站名称"
            />
          </div>

          <div className="form-group">
            <label>网站名称显示位置</label>
            <select
              value={siteNamePosition}
              onChange={(e) => setSiteNamePosition(e.target.value)}
              style={{ padding: '10px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ddd', width: '200px' }}
            >
              <option value="header">仅页眉</option>
              <option value="footer">仅页脚</option>
              <option value="both">页眉和页脚都显示</option>
            </select>
          </div>

          <div className="form-group">
            <label>页脚文字</label>
            <textarea
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="请输入页脚文字"
              rows={3}
              style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ddd', resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label>页脚链接</label>
            {footerLinks.map((link, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={link.text}
                  onChange={(e) => handleUpdateLink(index, 'text', e.target.value)}
                  placeholder="链接文字"
                  style={{ flex: 1, padding: '8px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <input
                  type="text"
                  value={link.url}
                  onChange={(e) => handleUpdateLink(index, 'url', e.target.value)}
                  placeholder="链接地址"
                  style={{ flex: 2, padding: '8px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <button
                  onClick={() => handleRemoveLink(index)}
                  style={{ padding: '8px 12px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  删除
                </button>
              </div>
            ))}
            <button
              onClick={handleAddLink}
              style={{ marginTop: '8px', padding: '8px 16px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              + 添加链接
            </button>
          </div>

          <div className="form-group">
            <label>全站公告文字</label>
            <input
              type="text"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="请输入公告文字"
            />
          </div>

          <div className="form-group">
            <label>公告显示</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={announcementEnabled}
                onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>显示公告</span>
            </label>
          </div>

          <div className="form-group">
            <label>公告文字颜色</label>
            <input
              type="color"
              value={announcementColor}
              onChange={(e) => setAnnouncementColor(e.target.value)}
              style={{ width: '100px', height: '40px', padding: '2px', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* 视频播放器设置 */}
        <div className="settings-section">
          <h2>🎬 视频播放器设置</h2>
          <p className="section-description">控制视频播放器中会员登录按钮的显示与隐藏，便于备案审查</p>
          
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showVipLoginButton}
                onChange={(e) => setShowVipLoginButton(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#333' }}>显示会员登录按钮</span>
            </label>
            <span style={{ fontSize: '12px', color: showVipLoginButton ? '#52c41a' : '#ff4d4f', marginLeft: '12px' }}>
              {showVipLoginButton ? '✓ 开启' : '✗ 关闭'}
            </span>
          </div>
        </div>

        {/* 修改密码 */}
        <div className="settings-section">
          <h2>🔒 修改密码</h2>
          <p className="section-description">定期修改密码可以提高账户安全性</p>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-group">
            <label>当前密码</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="请输入当前密码"
            />
          </div>

          <div className="form-group">
            <label>新密码</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="请输入新密码"
            />
          </div>

          <div className="form-group">
            <label>确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入新密码"
            />
          </div>

          <div className="form-actions">
            <button 
              className="btn btn-primary" 
              onClick={handlePasswordChange}
              disabled={passwordMutation.isPending}
            >
              {passwordMutation.isPending ? '修改中...' : '🔑 修改密码'}
            </button>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="form-actions" style={{ marginTop: '24px' }}>
          <button 
            className="btn btn-primary btn-large" 
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? '保存中...' : '💾 保存设置'}
          </button>
        </div>
      </div>
    </Layout>
  )
}

export default Settings
