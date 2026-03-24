import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../components/Layout'
import './AvatarReview.css'

function AvatarReview() {
  const navigate = useNavigate()
  const [pendingAvatars, setPendingAvatars] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null) // 正在处理的头像 ID
  const [message, setMessage] = useState({ type: '', text: '' })
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState(null)

  // 加载待审核头像列表
  const loadPendingAvatars = async () => {
    try {
      const token = localStorage.getItem('token')
      const { data } = await axios.get('/api/admin/avatars/pending', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setPendingAvatars(data.avatars || [])
    } catch (err) {
      console.error('Failed to load pending avatars:', err)
      showMessage('error', '加载待审核头像列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPendingAvatars()
  }, [])

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  // 审核通过
  const handleApprove = async (userId) => {
    if (!window.confirm('确认通过该用户的头像审核？')) return

    try {
      setProcessing(userId)
      const token = localStorage.getItem('token')
      await axios.put(
        `/api/admin/avatar/${userId}/review`,
        { status: 'approved' },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      showMessage('success', '头像审核已通过')
      await loadPendingAvatars()
    } catch (err) {
      console.error('Approve error:', err)
      showMessage('error', '审核失败：' + (err.response?.data?.message || '未知错误'))
    } finally {
      setProcessing(null)
    }
  }

  // 打开拒绝弹窗
  const handleRejectClick = (userId) => {
    setSelectedUserId(userId)
    setRejectReason('')
    setShowRejectModal(true)
  }

  // 确认拒绝
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showMessage('error', '请填写拒绝原因')
      return
    }

    try {
      setProcessing(selectedUserId)
      setShowRejectModal(false)
      const token = localStorage.getItem('token')
      await axios.put(
        `/api/admin/avatar/${selectedUserId}/review`,
        { status: 'rejected', rejectReason },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      showMessage('success', '头像已拒绝')
      await loadPendingAvatars()
    } catch (err) {
      console.error('Reject error:', err)
      showMessage('error', '拒绝失败：' + (err.response?.data?.message || '未知错误'))
    } finally {
      setProcessing(null)
      setSelectedUserId(null)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="avatar-review-loading">加载中...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="avatar-review-page">
        <div className="page-header">
          <h1>头像审核</h1>
          <p className="page-hint">审核用户上传的头像，确保符合社区规范</p>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}

        {pendingAvatars.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <h3>暂无待审核头像</h3>
            <p>所有头像都已审核完成</p>
          </div>
        ) : (
          <div className="avatar-review-list">
            {pendingAvatars.map((user) => (
              <div key={user.id} className="avatar-review-card">
                <div className="avatar-card-header">
                  <div className="user-info">
                    <img
                      src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=667eea&color=fff&size=200`}
                      alt={user.username}
                      className="user-avatar"
                    />
                    <div className="user-details">
                      <h3>{user.username}</h3>
                      <p className="user-email">{user.email}</p>
                      <p className="upload-time">
                        上传时间：{new Date(user.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="avatar-preview-large">
                  <img
                    src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=667eea&color=fff&size=400`}
                    alt="待审核头像"
                  />
                </div>

                <div className="avatar-actions">
                  <button
                    className="btn-approve"
                    onClick={() => handleApprove(user.id)}
                    disabled={processing === user.id}
                  >
                    {processing === user.id ? '处理中...' : '✓ 通过'}
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleRejectClick(user.id)}
                    disabled={processing === user.id}
                  >
                    {processing === user.id ? '处理中...' : '✕ 拒绝'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 拒绝原因弹窗 */}
        {showRejectModal && (
          <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>拒绝原因</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请填写拒绝原因（必填）"
                rows={4}
                autoFocus
              />
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowRejectModal(false)}>
                  取消
                </button>
                <button className="btn-confirm" onClick={handleReject}>
                  确认拒绝
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default AvatarReview
