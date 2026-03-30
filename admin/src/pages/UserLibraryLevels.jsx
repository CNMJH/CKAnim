import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useAuthStore } from '../store/auth'
import './UserLibraryLevels.css'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function UserLibraryLevels() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({})

  // 获取所有参考库等级配置
  const { data, isLoading, error } = useQuery({
    queryKey: ['userLibraryLevels'],
    queryFn: async () => {
      const { data } = await api.get('/user-library-levels')
      return data.levels
    },
  })

  // 更新配置
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data } = await api.put(`/user-library-levels/${id}`, updates)
      return data.level
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userLibraryLevels'])
      setEditingId(null)
      alert('✅ 保存成功')
    },
    onError: (error) => {
      alert('❌ 保存失败：' + (error.response?.data?.message || error.message))
    },
  })

  // 批量保存
  const batchSaveMutation = useMutation({
    mutationFn: async (levels) => {
      const { data } = await api.put('/user-library-levels/batch', { levels })
      return data.levels
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userLibraryLevels'])
      alert('✅ 批量保存成功')
    },
    onError: (error) => {
      alert('❌ 批量保存失败：' + (error.response?.data?.message || error.message))
    },
  })

  const handleEdit = (level) => {
    setEditingId(level.id)
    setFormData({
      maxStorage: level.maxStorage,
      maxFileSize: level.maxFileSize,
      maxDailyUploads: level.maxDailyUploads,
      enabled: level.enabled,
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    setFormData({})
  }

  const handleSave = (level) => {
    updateMutation.mutate({
      id: level.id,
      ...formData,
    })
  }

  const handleBatchSave = () => {
    if (!data) return
    batchSaveMutation.mutate(data.map(level => ({
      id: level.id,
      maxStorage: level.maxStorage,
      maxFileSize: level.maxFileSize,
      maxDailyUploads: level.maxDailyUploads,
      enabled: level.enabled,
    })))
  }

  const formatSize = (mb) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`
    }
    return `${mb} MB`
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'enabled' ? value : parseInt(value) || 0,
    }))
  }

  if (isLoading) return <div className="loading">加载中...</div>
  if (error) return <div className="error">加载失败：{error.message}</div>

  return (
    <div className="user-library-levels-page">
      <div className="user-library-levels">
        <div className="page-header">
          <h1>📚 用户参考库等级管理</h1>
          <button 
            className="btn-batch-save"
            onClick={handleBatchSave}
            disabled={batchSaveMutation.isPending}
          >
            {batchSaveMutation.isPending ? '保存中...' : '💾 批量保存'}
          </button>
        </div>

        <div className="levels-grid">
          {data?.map((level) => (
            <div key={level.id} className={`level-card ${!level.enabled ? 'disabled' : ''}`}>
              <div className="level-header">
                <h3>{level.name}</h3>
                <span className="vip-level-badge">{level.vipLevel}</span>
                {editingId === level.id && (
                  <label className="enabled-toggle">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => handleInputChange('enabled', e.target.checked)}
                    />
                    启用
                  </label>
                )}
              </div>

              {editingId === level.id ? (
                <div className="level-form">
                  <div className="form-group">
                    <label>最大存储容量 (MB)</label>
                    <input
                      type="number"
                      value={formData.maxStorage}
                      onChange={(e) => handleInputChange('maxStorage', e.target.value)}
                      min="0"
                      step="100"
                    />
                    <span className="hint">{formatSize(formData.maxStorage)}</span>
                  </div>

                  <div className="form-group">
                    <label>单文件最大大小 (MB)</label>
                    <input
                      type="number"
                      value={formData.maxFileSize}
                      onChange={(e) => handleInputChange('maxFileSize', e.target.value)}
                      min="0"
                      step="10"
                    />
                    <span className="hint">{formatSize(formData.maxFileSize)}</span>
                  </div>

                  <div className="form-group">
                    <label>每日最大上传次数</label>
                    <input
                      type="number"
                      value={formData.maxDailyUploads}
                      onChange={(e) => handleInputChange('maxDailyUploads', e.target.value)}
                      min="0"
                      step="1"
                    />
                  </div>

                  <div className="form-actions">
                    <button className="btn-cancel" onClick={handleCancel}>取消</button>
                    <button 
                      className="btn-save" 
                      onClick={() => handleSave(level)}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="level-info">
                  <div className="info-row">
                    <span className="label">📦 最大存储:</span>
                    <span className="value">{formatSize(level.maxStorage)}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">📄 单文件最大:</span>
                    <span className="value">{formatSize(level.maxFileSize)}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">📤 每日上传:</span>
                    <span className="value">{level.maxDailyUploads} 次/天</span>
                  </div>
                  <div className="info-row">
                    <span className="label">状态:</span>
                    <span className={`value ${level.enabled ? 'enabled' : 'disabled'}`}>
                      {level.enabled ? '✓ 启用' : '✗ 禁用'}
                    </span>
                  </div>

                  <button className="btn-edit" onClick={() => handleEdit(level)}>
                    ✏️ 编辑
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default UserLibraryLevels
