import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userLibraryAdminAPI } from '../lib/services'
import Layout from '../components/Layout'
import { useAuthStore } from '../store/auth'
import './UserLibrary.css'

function UserLibrary() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('vip-limits') // vip-limits, categories, characters, actions
  
  // 检查是否是系统管理员
  const isSystemAdmin = user?.role === 'system_admin'

  // VIP 限制配置状态
  const [vipLimits, setVipLimits] = useState({
    free: { maxFileSize: 0, maxTotalSize: 0 },
    vip_monthly: { maxFileSize: 30 * 1024 * 1024, maxTotalSize: 500 * 1024 * 1024 },
    vip_yearly: { maxFileSize: 100 * 1024 * 1024, maxTotalSize: 10 * 1024 * 1024 * 1024 },
    vip_lifetime: { maxFileSize: 200 * 1024 * 1024, maxTotalSize: 50 * 1024 * 1024 * 1024 },
  })

  // 获取 VIP 限制配置
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['userLibrarySettings'],
    queryFn: async () => {
      const res = await userLibraryAdminAPI.getSettings()
      return res.data.settings || {}
    },
    enabled: isSystemAdmin,
  })

  // 加载 VIP 限制数据
  useEffect(() => {
    if (settingsData) {
      const limits = { ...vipLimits }
      
      if (settingsData.vip_limits_free?.value) {
        limits.free = JSON.parse(settingsData.vip_limits_free.value)
      }
      if (settingsData.vip_limits_vip_monthly?.value) {
        limits.vip_monthly = JSON.parse(settingsData.vip_limits_vip_monthly.value)
      }
      if (settingsData.vip_limits_vip_yearly?.value) {
        limits.vip_yearly = JSON.parse(settingsData.vip_limits_vip_yearly.value)
      }
      if (settingsData.vip_limits_vip_lifetime?.value) {
        limits.vip_lifetime = JSON.parse(settingsData.vip_limits_vip_lifetime.value)
      }
      
      setVipLimits(limits)
    }
  }, [settingsData])

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 MB'
    const mb = bytes / (1024 * 1024)
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
    return `${mb.toFixed(1)} MB`
  }

  // 解析文件大小
  const parseFileSize = (sizeStr) => {
    const str = sizeStr.trim().toUpperCase()
    if (str === '0' || str === '0 MB') return 0
    
    const match = str.match(/^([\d.]+)\s*(MB|GB)$/i)
    if (!match) return 0
    
    const value = parseFloat(match[1])
    const unit = match[2].toUpperCase()
    
    if (unit === 'GB') return value * 1024 * 1024 * 1024
    return value * 1024 * 1024
  }

  // 更新 VIP 限制
  const updateLimitsMutation = useMutation({
    mutationFn: async () => {
      const updates = [
        {
          key: 'vip_limits_free',
          value: JSON.stringify({
            maxFileSize: vipLimits.free.maxFileSize,
            maxTotalSize: vipLimits.free.maxTotalSize,
            description: '普通用户：不支持上传'
          }),
          description: '普通用户上传限制'
        },
        {
          key: 'vip_limits_vip_monthly',
          value: JSON.stringify({
            maxFileSize: vipLimits.vip_monthly.maxFileSize,
            maxTotalSize: vipLimits.vip_monthly.maxTotalSize,
            description: 'VIP 月卡：单文件 30MB，总空间 500MB'
          }),
          description: 'VIP 月卡上传限制'
        },
        {
          key: 'vip_limits_vip_yearly',
          value: JSON.stringify({
            maxFileSize: vipLimits.vip_yearly.maxFileSize,
            maxTotalSize: vipLimits.vip_yearly.maxTotalSize,
            description: 'VIP 年卡：单文件 100MB，总空间 10GB'
          }),
          description: 'VIP 年卡上传限制'
        },
        {
          key: 'vip_limits_vip_lifetime',
          value: JSON.stringify({
            maxFileSize: vipLimits.vip_lifetime.maxFileSize,
            maxTotalSize: vipLimits.vip_lifetime.maxTotalSize,
            description: '永久 SVIP：单文件 200MB，总空间 50GB'
          }),
          description: '永久 SVIP 上传限制'
        },
      ]
      await userLibraryAdminAPI.batchUpdateSettings(updates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userLibrarySettings'])
      alert('VIP 限制配置保存成功！')
    },
    onError: (err) => {
      alert('保存失败：' + err.message)
    },
  })

  // 处理 VIP 限制输入
  const handleVipLimitChange = (plan, field, value) => {
    const bytes = parseFileSize(value)
    setVipLimits(prev => ({
      ...prev,
      [plan]: {
        ...prev[plan],
        [field]: bytes
      }
    }))
  }

  if (!isSystemAdmin) {
    return (
      <Layout>
        <div className="user-library-page">
          <div className="permission-denied">
            <h2>⛔ 权限不足</h2>
            <p>只有系统管理员可以访问个人参考库管理</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="user-library-page">
        <div className="page-header">
          <h2>📚 个人参考库管理</h2>
        </div>

        {/* 标签页 */}
        <div className="manage-tabs">
          <button
            className={`tab ${activeTab === 'vip-limits' ? 'active' : ''}`}
            onClick={() => setActiveTab('vip-limits')}
          >
            💎 VIP 限制配置
          </button>
          <button
            className={`tab ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
            disabled
          >
            📁 分类管理（开发中）
          </button>
          <button
            className={`tab ${activeTab === 'characters' ? 'active' : ''}`}
            onClick={() => setActiveTab('characters')}
            disabled
          >
            👤 角色管理（开发中）
          </button>
          <button
            className={`tab ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions')}
            disabled
          >
            🎬 动作管理（开发中）
          </button>
        </div>

        {/* VIP 限制配置 */}
        {activeTab === 'vip-limits' && (
          <div className="settings-section">
            <h3>🎯 用户上传限制配置</h3>
            <p className="section-desc">
              设置不同 VIP 等级用户的上传限制（单文件大小和总空间）
            </p>

            <div className="vip-limits-grid">
              {/* 普通用户 */}
              <div className="vip-card free">
                <div className="vip-header">
                  <h4>普通用户</h4>
                  <span className="vip-badge">免费</span>
                </div>
                <div className="vip-content">
                  <div className="form-group">
                    <label>单文件限制</label>
                    <input
                      type="text"
                      value="0 MB"
                      disabled
                      placeholder="0 MB"
                    />
                    <small>不支持上传</small>
                  </div>
                  <div className="form-group">
                    <label>总空间限制</label>
                    <input
                      type="text"
                      value="0 MB"
                      disabled
                      placeholder="0 MB"
                    />
                    <small>无存储空间</small>
                  </div>
                </div>
              </div>

              {/* VIP 月卡 */}
              <div className="vip-card monthly">
                <div className="vip-header">
                  <h4>VIP 月卡</h4>
                  <span className="vip-badge">月费</span>
                </div>
                <div className="vip-content">
                  <div className="form-group">
                    <label>单文件限制</label>
                    <input
                      type="text"
                      value={formatFileSize(vipLimits.vip_monthly.maxFileSize)}
                      onChange={(e) => handleVipLimitChange('vip_monthly', 'maxFileSize', e.target.value)}
                      placeholder="30 MB"
                    />
                  </div>
                  <div className="form-group">
                    <label>总空间限制</label>
                    <input
                      type="text"
                      value={formatFileSize(vipLimits.vip_monthly.maxTotalSize)}
                      onChange={(e) => handleVipLimitChange('vip_monthly', 'maxTotalSize', e.target.value)}
                      placeholder="500 MB"
                    />
                  </div>
                </div>
              </div>

              {/* VIP 年卡 */}
              <div className="vip-card yearly">
                <div className="vip-header">
                  <h4>VIP 年卡</h4>
                  <span className="vip-badge">年费</span>
                </div>
                <div className="vip-content">
                  <div className="form-group">
                    <label>单文件限制</label>
                    <input
                      type="text"
                      value={formatFileSize(vipLimits.vip_yearly.maxFileSize)}
                      onChange={(e) => handleVipLimitChange('vip_yearly', 'maxFileSize', e.target.value)}
                      placeholder="100 MB"
                    />
                  </div>
                  <div className="form-group">
                    <label>总空间限制</label>
                    <input
                      type="text"
                      value={formatFileSize(vipLimits.vip_yearly.maxTotalSize)}
                      onChange={(e) => handleVipLimitChange('vip_yearly', 'maxTotalSize', e.target.value)}
                      placeholder="10 GB"
                    />
                  </div>
                </div>
              </div>

              {/* 永久 SVIP */}
              <div className="vip-card lifetime">
                <div className="vip-header">
                  <h4>永久 SVIP</h4>
                  <span className="vip-badge">永久</span>
                </div>
                <div className="vip-content">
                  <div className="form-group">
                    <label>单文件限制</label>
                    <input
                      type="text"
                      value={formatFileSize(vipLimits.vip_lifetime.maxFileSize)}
                      onChange={(e) => handleVipLimitChange('vip_lifetime', 'maxFileSize', e.target.value)}
                      placeholder="200 MB"
                    />
                  </div>
                  <div className="form-group">
                    <label>总空间限制</label>
                    <input
                      type="text"
                      value={formatFileSize(vipLimits.vip_lifetime.maxTotalSize)}
                      onChange={(e) => handleVipLimitChange('vip_lifetime', 'maxTotalSize', e.target.value)}
                      placeholder="50 GB"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                className="btn-primary"
                onClick={() => updateLimitsMutation.mutate()}
                disabled={updateLimitsMutation.isPending}
              >
                {updateLimitsMutation.isPending ? '保存中...' : '💾 保存配置'}
              </button>
            </div>
          </div>
        )}

        {/* 其他标签页占位 */}
        {activeTab !== 'vip-limits' && (
          <div className="coming-soon">
            <h2>🚧 功能开发中</h2>
            <p>分类、角色、动作管理功能即将上线</p>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default UserLibrary
