import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { authAPI } from '../lib/services'
import Layout from '../components/Layout'
import { useAuthStore } from '../store/auth'
import './Settings.css'

function Settings() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { logout } = useAuthStore()

  const mutation = useMutation({
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
      
      // 3 秒后退出登录
      setTimeout(() => {
        logout()
      }, 3000)
    },
    onError: (err) => {
      setError(err.message || '修改失败')
      setSuccess('')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    mutation.mutate()
  }

  return (
    <Layout>
      <div className="settings-page">
        <h2>设置</h2>

        {/* 修改密码 */}
        <div className="settings-section">
          <h3>修改密码</h3>
          <form onSubmit={handleSubmit}>
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
              disabled={mutation.isPending}
            >
              {mutation.isPending ? '修改中...' : '修改密码'}
            </button>
          </form>
        </div>

        {/* 账户信息 */}
        <div className="settings-section">
          <h3>账户信息</h3>
          <div className="info-row">
            <span className="label">用户名：</span>
            <span className="value">admin</span>
          </div>
          <div className="info-row">
            <span className="label">角色：</span>
            <span className="value">管理员</span>
          </div>
        </div>

        {/* 系统信息 */}
        <div className="settings-section">
          <h3>系统信息</h3>
          <div className="info-row">
            <span className="label">版本：</span>
            <span className="value">v1.0.0</span>
          </div>
          <div className="info-row">
            <span className="label">最后更新：</span>
            <span className="value">2026-03-17</span>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Settings
