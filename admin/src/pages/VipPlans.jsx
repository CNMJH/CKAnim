import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import './VipPlans.css'

// API 请求（使用拦截器动态添加 Token）
const api = axios.create({
  baseURL: '/api/admin',
})

// 添加请求拦截器，每次请求时动态获取 Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function VipPlans() {
  const [editingPlan, setEditingPlan] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    level: 'vip1',
    price: '',
    originalPrice: '',
    features: '',
    badge: '',
    order: 0,
    enabled: true,
  })

  const queryClient = useQueryClient()

  // 获取 VIP 套餐列表
  const { data, isLoading, error } = useQuery({
    queryKey: ['vipPlans'],
    queryFn: async () => {
      const { data } = await api.get('/vip-plans')
      return data.plans
    },
  })

  // 创建套餐
  const createMutation = useMutation({
    mutationFn: async (newPlan) => {
      const { data } = await api.post('/vip-plans', newPlan)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vipPlans'])
      setShowForm(false)
      resetForm()
      alert('创建成功')
    },
    onError: (err) => {
      alert('创建失败：' + (err.response?.data?.message || '未知错误'))
    },
  })

  // 更新套餐
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updatedPlan }) => {
      const { data } = await api.put(`/vip-plans/${id}`, updatedPlan)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vipPlans'])
      setEditingPlan(null)
      resetForm()
      alert('更新成功')
    },
    onError: (err) => {
      alert('更新失败：' + (err.response?.data?.message || '未知错误'))
    },
  })

  // 删除套餐
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/vip-plans/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vipPlans'])
      alert('删除成功')
    },
    onError: (err) => {
      alert('删除失败：' + (err.response?.data?.message || '未知错误'))
    },
  })

  // 初始化默认套餐
  const initMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/vip-plans/init')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vipPlans'])
      alert('初始化成功')
    },
    onError: (err) => {
      alert('初始化失败：' + (err.response?.data?.message || '未知错误'))
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      level: 'vip1',
      price: '',
      originalPrice: '',
      features: '',
      badge: '',
      order: 0,
      enabled: true,
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const planData = {
      ...formData,
      features: formData.features.split('\n').filter(f => f.trim()),
      order: parseInt(formData.order),
    }

    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, ...planData })
    } else {
      createMutation.mutate(planData)
    }
  }

  const handleEdit = (plan) => {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      level: plan.level,
      price: plan.price,
      originalPrice: plan.originalPrice || '',
      features: plan.features.join('\n'),
      badge: plan.badge || '',
      order: plan.order,
      enabled: plan.enabled,
    })
    setShowForm(true)
  }

  const handleDelete = (plan) => {
    if (confirm(`确定要删除套餐"${plan.name}"吗？`)) {
      deleteMutation.mutate(plan.id)
    }
  }

  const handleInit = () => {
    if (confirm('确定要初始化默认 VIP 套餐吗？（如果已有数据会失败）')) {
      initMutation.mutate()
    }
  }

  if (isLoading) return <div className="loading">加载中...</div>
  if (error) return <div className="error">加载失败：{error.message}</div>

  return (
    <div className="vip-plans-page">
      <div className="page-header">
        <h1>VIP 套餐管理</h1>
        <div className="header-actions">
          <button className="btn-init" onClick={handleInit}>
            初始化默认套餐
          </button>
          <button 
            className="btn-add" 
            onClick={() => {
              resetForm()
              setEditingPlan(null)
              setShowForm(!showForm)
            }}
          >
            {showForm ? '取消' : '+ 添加套餐'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="form-modal">
          <div className="form-content">
            <h2>{editingPlan ? '编辑套餐' : '添加套餐'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>套餐名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如：VIP1 月卡"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>套餐等级 *</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    required
                  >
                    <option value="vip0">VIP0（普通用户）</option>
                    <option value="vip1">VIP1</option>
                    <option value="vip2">VIP2</option>
                    <option value="vip3">VIP3</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>排序</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                    placeholder="数字越小越靠前"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>价格显示 *</label>
                  <input
                    type="text"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="如：¥15/月"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>原价</label>
                  <input
                    type="text"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                    placeholder="如：¥180/年"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>权益列表 *（每行一个）</label>
                <textarea
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  placeholder="如：&#10;高清画质&#10;去广告&#10;专属标识"
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label>徽章标识</label>
                <input
                  type="text"
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  placeholder="如：热销、推荐（可选）"
                />
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  />
                  启用
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-submit">
                  {editingPlan ? '保存更新' : '创建套餐'}
                </button>
                <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="vip-plans-list">
        {data && data.length === 0 ? (
          <div className="empty-state">
            <p>暂无 VIP 套餐</p>
            <button className="btn-init" onClick={handleInit}>
              初始化默认套餐
            </button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>排序</th>
                <th>名称</th>
                <th>等级</th>
                <th>价格</th>
                <th>原价</th>
                <th>徽章</th>
                <th>权益</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {data?.map(plan => (
                <tr key={plan.id}>
                  <td>{plan.order}</td>
                  <td>{plan.name}</td>
                  <td><code>{plan.level}</code></td>
                  <td>{plan.price}</td>
                  <td>{plan.originalPrice || '-'}</td>
                  <td>{plan.badge || '-'}</td>
                  <td>
                    <div className="features-list">
                      {plan.features.slice(0, 3).map((f, i) => (
                        <span key={i} className="feature-tag">{f}</span>
                      ))}
                      {plan.features.length > 3 && (
                        <span className="feature-more">+{plan.features.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`status ${plan.enabled ? 'enabled' : 'disabled'}`}>
                      {plan.enabled ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="actions">
                    <button onClick={() => handleEdit(plan)}>编辑</button>
                    <button className="danger" onClick={() => handleDelete(plan)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default VipPlans
