import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authAPI } from '../lib/services'
import { useAuthStore } from '../store/auth'
import './Login.css'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await authAPI.login(username, password)
      return response.data
    },
    onSuccess: (data) => {
      login(data.token, data.user)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate('/')
    },
    onError: (err) => {
      setError(err.response?.data?.message || '登录失败')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    mutation.mutate()
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>CKAnim 管理员后台</h1>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="login-btn" disabled={mutation.isPending}>
            {mutation.isPending ? '登录中...' : '登录'}
          </button>
        </form>
        <div className="login-hint">
          <p>默认账户：</p>
          <p>用户名：admin</p>
          <p>密码：admin123</p>
        </div>
      </div>
    </div>
  )
}

export default Login
