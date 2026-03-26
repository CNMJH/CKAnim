import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../components/Layout'
import { useAuthStore } from '../store/auth'
import api from '../lib/api'
import './Carousels.css'

const API_BASE = 'https://admin.anick.cn/api/admin'

function Carousels() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    targetUrl: '',
    duration: 24,
    order: 0,
    isDefault: false,
  })
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadPreview, setUploadPreview] = useState(null)

  // 获取轮播图列表
  const { data: carousels = [], isLoading } = useQuery({
    queryKey: ['carousels'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const res = await api.get(`${API_BASE}/carousels`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.data.carousels || []
    },
  })

  // 创建轮播图
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const token = localStorage.getItem('token')
      const res = await api.post(`${API_BASE}/carousels`, data, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['carousels'])
      resetForm()
    },
  })

  // 更新轮播图
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const token = localStorage.getItem('token')
      const res = await api.put(`${API_BASE}/carousels/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['carousels'])
      resetForm()
    },
  })

  // 删除轮播图
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const token = localStorage.getItem('token')
      await api.delete(`${API_BASE}/carousels/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['carousels'])
    },
  })

  // 续期轮播图
  const renewMutation = useMutation({
    mutationFn: async ({ id, duration }) => {
      const token = localStorage.getItem('token')
      const res = await api.post(`${API_BASE}/carousels/${id}/renew`, { duration }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['carousels'])
    },
  })

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      title: '',
      imageUrl: '',
      targetUrl: '',
      duration: 24,
      order: 0,
      isDefault: false,
    })
    setUploadFile(null)
    setUploadPreview(null)
  }

  const handleEdit = (carousel) => {
    setEditingId(carousel.id)
    setFormData({
      title: carousel.title,
      imageUrl: carousel.imageUrl,
      targetUrl: carousel.targetUrl || '',
      duration: carousel.duration,
      order: carousel.order,
      isDefault: carousel.isDefault,
    })
    setShowForm(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('确定要删除这个轮播图吗？')) {
      deleteMutation.mutate(id)
    }
  }

  const handleRenew = (id, currentDuration) => {
    const newDuration = prompt('请输入新的展示时长（小时）:', currentDuration)
    if (newDuration && !isNaN(newDuration) && newDuration > 0) {
      renewMutation.mutate({ id, duration: parseInt(newDuration) })
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadFile(file)
    
    // 生成预览
    const reader = new FileReader()
    reader.onload = (e) => {
      setUploadPreview(e.target.result)
    }
    reader.readAsDataURL(file)

    // 上传图片到服务器
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)
    uploadFormData.append('type', 'carousel')

    try {
      const token = localStorage.getItem('token')
      const res = await api.post(`${API_BASE}/upload`, uploadFormData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      })
      
      if (res.data.url) {
        setFormData(prev => ({ ...prev, imageUrl: res.data.url }))
      }
    } catch (error) {
      console.error('上传失败:', error)
      alert('图片上传失败，请重试')
    }
  }

  const isExpired = (carousel) => {
    return new Date(carousel.endTime) < new Date()
  }

  const getTimeRemaining = (carousel) => {
    const end = new Date(carousel.endTime)
    const now = new Date()
    const diff = end - now
    
    if (diff <= 0) return '已过期'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}天${hours % 24}小时`
    }
    return `${hours}小时${minutes}分钟`
  }

  return (
    <Layout>
      <div className="carousels-page">
        <div className="page-header">
          <h1>🖼️ 轮播图管理</h1>
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '取消' : '+ 新建轮播图'}
          </button>
        </div>

        {showForm && (
          <div className="form-modal">
            <div className="form-content">
              <h2>{editingId ? '编辑轮播图' : '新建轮播图'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>标题 *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    placeholder="轮播图标题"
                  />
                </div>

                <div className="form-group">
                  <label>图片 URL *</label>
                  <div className="image-upload">
                    <input
                      type="text"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                      required
                      placeholder="图片 URL 或上传本地图片"
                    />
                    <label className="upload-btn">
                      上传图片
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                  {(uploadPreview || formData.imageUrl) && (
                    <div className="image-preview">
                      <img src={uploadPreview || formData.imageUrl} alt="预览" />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>跳转链接（可选）</label>
                  <input
                    type="url"
                    value={formData.targetUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>展示时长（小时）</label>
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 24 }))}
                      min="1"
                      max="720"
                    />
                  </div>

                  <div className="form-group">
                    <label>排序</label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                    />
                    设为默认轮播图（常驻展示）
                  </label>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>
                    取消
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? '保存中...' : '保存'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="loading">加载中...</div>
        ) : carousels.length === 0 ? (
          <div className="empty-state">
            <p>暂无轮播图</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              创建第一个轮播图
            </button>
          </div>
        ) : (
          <div className="carousels-grid">
            {carousels.map((carousel) => (
              <div 
                key={carousel.id} 
                className={`carousel-card ${isExpired(carousel) ? 'expired' : ''} ${carousel.isDefault ? 'default' : ''}`}
              >
                <div className="carousel-image">
                  <img src={carousel.imageUrl} alt={carousel.title} />
                  {carousel.isDefault && <span className="badge badge-default">默认</span>}
                  {isExpired(carousel) && <span className="badge badge-expired">已过期</span>}
                  {!carousel.active && <span className="badge badge-inactive">未激活</span>}
                </div>
                
                <div className="carousel-info">
                  <h3>{carousel.title}</h3>
                  <p className="carousel-meta">
                    <span>时长：{carousel.duration}小时</span>
                    <span>排序：{carousel.order}</span>
                  </p>
                  <p className="carousel-time">
                    剩余：{getTimeRemaining(carousel)}
                  </p>
                  {carousel.targetUrl && (
                    <p className="carousel-link">
                      链接：<a href={carousel.targetUrl} target="_blank" rel="noopener noreferrer">
                        {carousel.targetUrl}
                      </a>
                    </p>
                  )}
                </div>

                <div className="carousel-actions">
                  {!isExpired(carousel) && carousel.active && (
                    <button 
                      className="btn btn-small btn-renew"
                      onClick={() => handleRenew(carousel.id, carousel.duration)}
                    >
                      续期
                    </button>
                  )}
                  <button 
                    className="btn btn-small btn-edit"
                    onClick={() => handleEdit(carousel)}
                  >
                    编辑
                  </button>
                  {!carousel.isDefault && (
                    <button 
                      className="btn btn-small btn-delete"
                      onClick={() => handleDelete(carousel.id)}
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Carousels
