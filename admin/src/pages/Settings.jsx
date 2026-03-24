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
  const [footerLinks, setFooterLinks] = useState([]) // 改为数组
  const [announcementText, setAnnouncementText] = useState('')
  const [announcementEnabled, setAnnouncementEnabled] = useState(true)
  const [announcementColor, setAnnouncementColor] = useState('#666')

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
      if (settingsData.siteName?.value) {
        setSiteName(settingsData.siteName.value)
      }
      if (settingsData.siteNamePosition?.value) {
        setSiteNamePosition(settingsData.siteNamePosition.value)
      }
      if (settingsData.siteFooter?.value) {
        try {
          const footer = JSON.parse(settingsData.siteFooter.value)
          setFooterText(footer.text || '')
          setFooterLinks(footer.links || []) // 直接存储数组
        } catch (e) {
          console.error('解析页脚失败:', e)
        }
      }
      if (settingsData.siteAnnouncement?.value) {
        try {
          const announcement = JSON.parse(settingsData.siteAnnouncement.value)
          setAnnouncementText(announcement.text || '')
          setAnnouncementEnabled(announcement.enabled !== false)
          setAnnouncementColor(announcement.color || '#666')
        } catch (e) {
          console.error('解析公告失败:', e)
        }
      }
    }
  }, [settingsData])

  // 初始化默认设置
  const initMutation = useMutation({
    mutationFn: () => settingsAPI.init(),
    onSuccess: () => {
      queryClient.invalidateQueries(['siteSettings'])
      alert('默认设置已初始化！')
    },
    onError: (err) => {
      alert('初始化失败：' + err.message)
    },
  })

  // 保存设置
  const saveMutation = useMutation({
    mutationFn: async () => {
      const settings = [
        { key: 'siteName', value: siteName, description: '网站名称' },
        { key: 'siteNamePosition', value: siteNamePosition, description: '网站名称显示位置' },
        {
          key: 'siteFooter',
          value: JSON.stringify({ text: footerText, links: footerLinks }),
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
      await authAPI.updatePassword(currentPassword, newPassword)
    },
    onSuccess: () => {
      setSuccess('密码修改成功！请重新登录')
      setError('')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => logout(), 3000)
    },
    onError: (err) => {
      setError(err.message || '修改失败')
      setSuccess('')
    },
  })

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    passwordMutation.mutate()
  }

  // 添加链接
  const handleAddLink = () => {
    setFooterLinks([...footerLinks, { text: '', url: '' }])
  }

  // 删除链接
  const handleRemoveLink = (index) => {
    setFooterLinks(footerLinks.filter((_, i) => i !== index))
  }

  // 更新链接
  const handleUpdateLink = (index, field, value) => {
    const newLinks = [...footerLinks]
    newLinks[index][field] = value
    setFooterLinks(newLinks)
  }

  return (
    <Layout>
      <div className="settings-page">
        <div className="settings-header">
          <h2>⚙️ 设置</h2>
          {isSystemAdmin && (
            <button
              className="btn-secondary"
              onClick={() => initMutation.mutate()}
              disabled={initMutation.isPending}
            >
              {initMutation.isPending ? '初始化中...' : '🔄 初始化默认设置'}
            </button>
          )}
        </div>

        {/* 网站配置 - 仅系统管理员可见 */}
        {isSystemAdmin && (
        <div className="settings-section">
          <h3>🌐 网站配置</h3>
          
          <div className="form-group">
            <label>网站名称</label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="例如：CKAnim"
            />
            <small className="hint">显示在浏览器标题栏和导航栏</small>
          </div>

          <div className="form-group">
            <label>网站名称显示位置</label>
            <select
              value={siteNamePosition}
              onChange={(e) => setSiteNamePosition(e.target.value)}
            >
              <option value="header">仅页眉</option>
              <option value="footer">仅页脚</option>
              <option value="both">页眉和页脚</option>
            </select>
          </div>

          <div className="form-group">
            <label>页脚文字</label>
            <input
              type="text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="© 2026 CKAnim. All rights reserved."
            />
            <small className="hint">显示在网站底部的版权信息</small>
          </div>

          <div className="form-group">
            <label>页脚链接</label>
            <div style={{ marginBottom: '12px' }}>
              {footerLinks.map((link, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="链接文字"
                    value={link.text}
                    onChange={(e) => handleUpdateLink(index, 'text', e.target.value)}
                    style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                  <input
                    type="text"
                    placeholder="链接地址"
                    value={link.url}
                    onChange={(e) => handleUpdateLink(index, 'url', e.target.value)}
                    style={{ flex: 2, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                  <button
                    onClick={() => handleRemoveLink(index)}
                    style={{ padding: '8px 12px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddLink}
              style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
            >
              + 添加链接
            </button>
            <small className="hint" style={{ display: 'block', marginTop: '8px' }}>
              添加显示在网站底部的友情链接
            </small>
          </div>

          <div className="form-group">
            <label>全站公告文字</label>
            <input
              type="text"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="随机参考，每日一看"
            />
            <small className="hint">显示在首页搜索框下方的提醒文字</small>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={announcementEnabled}
                onChange={(e) => setAnnouncementEnabled(e.target.checked)}
              />
              启用公告
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

          <button
            className="btn-primary"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? '保存中...' : '💾 保存设置'}
          </button>
        </div>
        )}

        {/* 修改密码 */}
        <div className="settings-section">
          <h3>🔐 修改密码</h3>
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label>当前密码</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="请输入当前密码"
              />
            </div>
            <div className="form-group">
              <label>新密码</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="请输入新密码（至少 6 位）"
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label>确认新密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="请再次输入新密码"
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button 
              type="submit" 
              className="btn-primary"
              disabled={passwordMutation.isPending}
            >
              {passwordMutation.isPending ? '修改中...' : '修改密码'}
            </button>
          </form>
        </div>

        {/* 账户信息 */}
        <div className="settings-section">
          <h3>👤 账户信息</h3>
          <div className="info-row">
            <span className="label">用户名：</span>
            <span className="value">{user?.username || '-'}</span>
          </div>
          <div className="info-row">
            <span className="label">角色：</span>
            <span className="value">
              {user?.role === 'system_admin' ? '系统管理员' : 
               user?.role === 'content_admin' ? '内容管理员' : 
               user?.role || '-'}
            </span>
          </div>
        </div>

        {/* 系统信息 */}
        <div className="settings-section">
          <h3>ℹ️ 系统信息</h3>
          <div className="info-row">
            <span className="label">版本：</span>
            <span className="value">v1.0.0</span>
          </div>
          <div className="info-row">
            <span className="label">最后更新：</span>
            <span className="value">2026-03-19</span>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Settings
