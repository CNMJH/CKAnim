import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userAdminAPI } from '../lib/services'
import Layout from '../components/Layout'
import { useAuthStore } from '../store/auth'
import './Users.css'

function Users() {
  const { user: currentUser } = useAuthStore()
  const queryClient = useQueryClient()
  
  // 分页和搜索状态
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [search, setSearch] = useState('')
  const [vipFilter, setVipFilter] = useState('all')
  
  // 编辑弹窗状态
  const [editingUser, setEditingUser] = useState(null)
  const [editVipLevel, setEditVipLevel] = useState('')
  const [editVipExpires, setEditVipExpires] = useState('')
  const [editRole, setEditRole] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  // 获取用户列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adminUsers', page, limit, search, vipFilter],
    queryFn: async () => {
      const params = { page, limit, search, vipFilter }
      const res = await userAdminAPI.getUsers(params)
      return res.data
    },
  })

  // 更新用户 VIP
  const updateVipMutation = useMutation({
    mutationFn: async ({ userId, vipLevel, vipExpires }) => {
      await userAdminAPI.updateUserVip(userId, { vipLevel, vipExpires })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers'])
      setEditingUser(null)
      alert('VIP 设置已更新！')
    },
    onError: (err) => {
      alert('更新失败：' + err.message)
    },
  })

  // 重置密码
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }) => {
      await userAdminAPI.resetUserPassword(userId, { newPassword })
    },
    onSuccess: () => {
      setShowPasswordModal(false)
      setNewPassword('')
      alert('密码已重置！')
    },
    onError: (err) => {
      alert('重置失败：' + err.message)
    },
  })

  // 更新角色
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      await userAdminAPI.updateUserRole(userId, { role })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers'])
      setEditingUser(null)
      alert('角色已更新！')
    },
    onError: (err) => {
      alert('更新失败：' + err.message)
    },
  })

  // 删除用户
  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      await userAdminAPI.deleteUser(userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers'])
      alert('用户已删除！')
    },
    onError: (err) => {
      alert('删除失败：' + err.message)
    },
  })

  // 打开编辑弹窗
  const handleEdit = (user) => {
    setEditingUser(user)
    setEditVipLevel(user.vipLevel)
    setEditVipExpires(user.vipExpires ? new Date(user.vipExpires).toISOString().slice(0, 16) : '')
    setEditRole(user.role)
  }

  // 保存 VIP 设置
  const handleSaveVip = () => {
    if (!editingUser) return
    updateVipMutation.mutate({
      userId: editingUser.id,
      vipLevel: editVipLevel,
      vipExpires: editVipExpires || undefined,
    })
  }

  // 保存角色
  const handleSaveRole = () => {
    if (!editingUser) return
    updateRoleMutation.mutate({
      userId: editingUser.id,
      role: editRole,
    })
  }

  // 处理重置密码
  const handleResetPassword = () => {
    if (!editingUser || newPassword.length < 6) {
      alert('密码长度至少为 6 位')
      return
    }
    if (confirm(`确定要重置用户 "${editingUser.username}" 的密码吗？`)) {
      resetPasswordMutation.mutate({
        userId: editingUser.id,
        newPassword,
      })
    }
  }

  // 处理删除
  const handleDelete = (user) => {
    if (!confirm(`确定要删除用户 "${user.username}" 吗？此操作不可恢复！`)) return
    deleteUserMutation.mutate(user.id)
  }

  // VIP 等级名称映射
  const vipLevelNames = {
    none: '普通用户',
    vip_monthly: 'VIP 月卡',
    vip_yearly: 'VIP 年卡',
    vip_lifetime: '永久 SVIP',
  }

  // 角色名称映射
  const roleNames = {
    user: '普通用户',
    content_admin: '内容管理员',
    system_admin: '系统管理员',
  }

  // 检查是否是系统管理员
  const isSystemAdmin = currentUser?.role === 'system_admin'

  return (
    <Layout>
      <div className="users-page">
        <div className="page-header">
          <h2>👥 用户管理</h2>
        </div>

        {/* 搜索和筛选 */}
        <div className="users-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="搜索用户名或邮箱..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && setPage(1)}
            />
          </div>
          
          <div className="filter-box">
            <select value={vipFilter} onChange={(e) => { setVipFilter(e.target.value); setPage(1) }}>
              <option value="all">所有 VIP 等级</option>
              <option value="none">普通用户</option>
              <option value="vip_monthly">VIP 月卡</option>
              <option value="vip_yearly">VIP 年卡</option>
              <option value="vip_lifetime">永久 SVIP</option>
            </select>
          </div>
        </div>

        {/* 用户列表 */}
        <div className="users-table-container">
          {isLoading ? (
            <div className="loading">加载中...</div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>用户</th>
                  <th>邮箱</th>
                  <th>角色</th>
                  <th>VIP 等级</th>
                  <th>VIP 过期时间</th>
                  <th>收藏</th>
                  <th>个人库</th>
                  <th>注册时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {data?.users?.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>
                      <div className="user-info">
                        {user.avatar && (
                          <img src={user.avatar} alt={user.username} className="user-avatar" />
                        )}
                        <span>{user.username}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>
                        {roleNames[user.role] || user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`vip-badge vip-${user.vipLevel}`}>
                        {vipLevelNames[user.vipLevel] || '普通用户'}
                      </span>
                    </td>
                    <td>
                      {user.vipExpires ? (
                        new Date(user.vipExpires).toLocaleString('zh-CN')
                      ) : (
                        <span className="no-expire">永久</span>
                      )}
                    </td>
                    <td>{user._count?.favorites || 0}</td>
                    <td>{user._count?.libraryVideos || 0}</td>
                    <td>{new Date(user.createdAt).toLocaleString('zh-CN')}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-edit"
                          onClick={() => handleEdit(user)}
                        >
                          编辑
                        </button>
                        {isSystemAdmin && (
                          <button 
                            className="btn-delete"
                            onClick={() => handleDelete(user)}
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 分页 */}
        {data && data.totalPages > 1 && (
          <div className="pagination">
            <button 
              disabled={page <= 1} 
              onClick={() => setPage(page - 1)}
            >
              上一页
            </button>
            <span className="page-info">
              第 {page} / {data.totalPages} 页（共 {data.total} 条）
            </span>
            <button 
              disabled={page >= data.totalPages} 
              onClick={() => setPage(page + 1)}
            >
              下一页
            </button>
          </div>
        )}

        {/* 编辑弹窗 */}
        {editingUser && (
          <div className="modal-overlay" onClick={() => setEditingUser(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>编辑用户：{editingUser.username}</h3>
                <button className="close-btn" onClick={() => setEditingUser(null)}>×</button>
              </div>
              
              <div className="modal-body">
                {/* VIP 设置 */}
                <div className="form-section">
                  <h4>VIP 设置</h4>
                  <div className="form-group">
                    <label>VIP 等级</label>
                    <select value={editVipLevel} onChange={(e) => setEditVipLevel(e.target.value)}>
                      <option value="none">普通用户</option>
                      <option value="vip_monthly">VIP 月卡</option>
                      <option value="vip_yearly">VIP 年卡</option>
                      <option value="vip_lifetime">永久 SVIP</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>VIP 过期时间</label>
                    <input
                      type="datetime-local"
                      value={editVipExpires}
                      onChange={(e) => setEditVipExpires(e.target.value)}
                      disabled={editVipLevel === 'none' || editVipLevel === 'vip_lifetime'}
                    />
                    <small>留空则自动设置（月卡 30 天，年卡 365 天）</small>
                  </div>
                  <button 
                    className="btn-primary"
                    onClick={handleSaveVip}
                    disabled={updateVipMutation.isPending}
                  >
                    {updateVipMutation.isPending ? '保存中...' : '💾 保存 VIP 设置'}
                  </button>
                </div>

                {/* 角色设置（仅系统管理员） */}
                {isSystemAdmin && (
                  <div className="form-section">
                    <h4>角色设置</h4>
                    <div className="form-group">
                      <label>用户角色</label>
                      <select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                        <option value="user">普通用户</option>
                        <option value="content_admin">内容管理员</option>
                        <option value="system_admin">系统管理员</option>
                      </select>
                    </div>
                    <button 
                      className="btn-primary"
                      onClick={handleSaveRole}
                      disabled={updateRoleMutation.isPending}
                    >
                      {updateRoleMutation.isPending ? '保存中...' : '🔐 保存角色'}
                    </button>
                  </div>
                )}

                {/* 重置密码 */}
                <div className="form-section">
                  <h4>账户安全</h4>
                  <button 
                    className="btn-warning"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    🔑 重置密码
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 重置密码弹窗 */}
        {showPasswordModal && (
          <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
            <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>重置密码</h3>
                <button className="close-btn" onClick={() => setShowPasswordModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <p className="warning-text">
                  ⚠️ 确定要重置用户 <strong>{editingUser?.username}</strong> 的密码吗？
                </p>
                <div className="form-group">
                  <label>新密码</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="至少 6 位字符"
                    autoFocus
                  />
                </div>
                <div className="form-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => setShowPasswordModal(false)}
                  >
                    取消
                  </button>
                  <button 
                    className="btn-warning"
                    onClick={handleResetPassword}
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending ? '重置中...' : '确认重置'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Users
