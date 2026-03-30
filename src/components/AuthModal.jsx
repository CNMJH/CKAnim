import { useState } from 'react'
import { userAPI, authUtils } from '../lib/api'
import './AuthModal.css'

function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        // 登录
        const { data } = await userAPI.login({
          username: formData.username,
          password: formData.password,
        })
        authUtils.setToken(data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        onLoginSuccess?.(data.user)
        onClose()
      } else {
        // 注册
        if (formData.password !== formData.confirmPassword) {
          setError('两次输入的密码不一致')
          setLoading(false)
          return
        }
        const { data } = await userAPI.register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        })
        authUtils.setToken(data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        onLoginSuccess?.(data.user)
        onClose()
      }
    } catch (err) {
      setError(err.response?.data?.message || '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose}>×</button>
        
        <div className="auth-modal-header">
          <h2>{isLogin ? '会员登录' : '用户注册'}</h2>
          <p>{isLogin ? '登录账号，享受更多功能' : '注册账号，开启精彩旅程'}</p>
        </div>

        <form className="auth-modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{isLogin ? '用户名/邮箱' : '用户名'}</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder={isLogin ? '请输入用户名或邮箱' : '请输入用户名'}
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>邮箱</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="请输入邮箱"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="请输入密码"
              required
              minLength={6}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>确认密码</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="请再次输入密码"
                required
                minLength={6}
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </button>
        </form>

        <div className="auth-modal-footer">
          {isLogin ? (
            <p>
              还没有账号？{' '}
              <button type="button" onClick={() => setIsLogin(false)}>
                立即注册
              </button>
            </p>
          ) : (
            <p>
              已有账号？{' '}
              <button type="button" onClick={() => setIsLogin(true)}>
                立即登录
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthModal
