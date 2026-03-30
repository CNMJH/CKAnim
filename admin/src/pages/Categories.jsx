import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamesAPI, categoriesAPI } from '../lib/services'
import { useAuthStore } from '../store/auth'
import './Categories.css'

function Categories() {
  const [selectedGame, setSelectedGame] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [expandedNodes, setExpandedNodes] = useState({})
  const [error, setError] = useState('')
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [selectedParentId, setSelectedParentId] = useState(null)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const iconInputRef = useRef(null)
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  // 检查是否是管理员（content_admin 或 system_admin）
  const isAdmin = user?.role === 'content_admin' || user?.role === 'system_admin'
  
  // 检查是否是系统管理员（仅 system_admin）
  const isSystemAdmin = user?.role === 'system_admin'

  // 获取游戏列表
  const { data: games = [] } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const response = await gamesAPI.getAll()
      return response.data.games || []
    },
  })

  // 获取分类树
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', selectedGame?.id],
    queryFn: async () => {
      if (!selectedGame) return []
      const response = await categoriesAPI.getByGame(selectedGame.id)
      return response.data.categories || []
    },
    enabled: !!selectedGame,
  })

  // 获取所有分类（用于父分类选择）
  const { data: allCategories = [] } = useQuery({
    queryKey: ['all-categories', selectedGame?.id],
    queryFn: async () => {
      if (!selectedGame) return []
      const response = await categoriesAPI.getByGame(selectedGame.id)
      return response.data.categories || []
    },
    enabled: !!selectedGame && showModal && !editingCategory,
  })

  // 扁平化分类树
  const flattenCategories = (nodes, result = []) => {
    if (!nodes) return result
    nodes.forEach(node => {
      result.push(node)
      if (node.children && node.children.length > 0) {
        flattenCategories(node.children, result)
      }
    })
    return result
  }

  // 创建分类
  const createMutation = useMutation({
    mutationFn: async (data) => {
      await categoriesAPI.create(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['categories'])
      setShowModal(false)
    },
  })

  // 更新分类
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await categoriesAPI.update(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['categories'])
      setEditingCategory(null)
    },
  })

  // 删除分类
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      if (confirm('确定要删除这个分类吗？（如果有子分类或视频则无法删除）')) {
        await categoriesAPI.delete(id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['categories'])
    },
  })

  // 上传分类图标
  const handleIconUpload = async (e, categoryId) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingIcon(true)
    try {
      // 1. 获取上传凭证
      const { data: { token, key, url } } = await categoriesAPI.getIconToken(file.name, categoryId)

      // 2. 上传到七牛云
      const formData = new FormData()
      formData.append('token', token)
      formData.append('key', key)
      formData.append('file', file)

      const response = await fetch('https://up-z2.qiniup.com/', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('上传失败')
      }

      // 3. 更新分类
      if (categoryId) {
        updateMutation.mutate({ id: categoryId, data: { iconUrl: url } })
      }
    } catch (error) {
      console.error('图标上传失败:', error)
      alert('图标上传失败，请重试')
    } finally {
      setUploadingIcon(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = {
      name: formData.get('name'),
      level: selectedLevel,
      gameId: selectedGame?.id,
      parentId: selectedLevel > 1 ? selectedParentId : null,
      order: parseInt(formData.get('order')) || 0,
    }

    // 2 级及以上必须有 parentId
    if (data.level > 1 && !data.parentId) {
      setError('请选择父分类')
      return
    }

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: { name: data.name, order: data.order } })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditingCategory(null)
    setError('')
    setSelectedLevel(1)
    setSelectedParentId(null)
  }

  const toggleNode = (id) => {
    setExpandedNodes(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const renderTree = (nodes, level = 1) => {
    if (!nodes) return null

    return nodes.map(node => (
      <div key={node.id} className="tree-node" style={{ paddingLeft: `${(level - 1) * 24}px` }}>
        <div className="node-content">
          <button
            className="expand-btn"
            onClick={() => toggleNode(node.id)}
            disabled={!node.children || node.children.length === 0}
          >
            {node.children && node.children.length > 0 ? (expandedNodes[node.id] ? '▼' : '▶') : '•'}
          </button>
          {node.iconUrl && (
            <img src={node.iconUrl} alt={node.name} className="node-icon" />
          )}
          <span className="node-name">{node.name}</span>
          <span className="node-level">L{node.level}</span>
          {isAdmin && (
          <div className="node-actions">
            <button className="btn-sm" onClick={() => setEditingCategory(node)}>编辑</button>
            <label className="btn-sm btn-icon">
              图标
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleIconUpload(e, node.id)}
                disabled={uploadingIcon}
                style={{ display: 'none' }}
              />
            </label>
            <button className="btn-sm btn-danger" onClick={() => deleteMutation.mutate(node.id)}>删除</button>
          </div>
          )}
        </div>
        {node.children && node.children.length > 0 && expandedNodes[node.id] && (
          <div className="tree-children">
            {renderTree(node.children, level + 1)}
          </div>
        )}
      </div>
    ))
  }

  const getLevelOptions = (maxLevel = 7) => {
    const options = []
    const currentLevel = editingCategory?.level || 1
    for (let i = currentLevel; i <= maxLevel; i++) {
      options.push(i)
    }
    return options
  }

  return (
    <div className="categories-page">
        <div className="page-header">
          <h2>分类管理</h2>
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#999', display: 'block' }}>分类下无角色时，前台默认不显示。</p>
          {isAdmin && (
          <button 
            className="btn-primary" 
            onClick={() => setShowModal(true)}
            disabled={!selectedGame}
          >
            + 新建分类
          </button>
          )}
        </div>

        {/* 游戏选择 */}
        <div className="game-selector">
          <label>选择游戏：</label>
          <select
            value={selectedGame?.id || ''}
            onChange={(e) => {
              const game = games?.find(g => g.id === parseInt(e.target.value))
              setSelectedGame(game || null)
              setExpandedNodes({})
            }}
          >
            <option value="">请选择游戏</option>
            {games?.map(game => (
              <option key={game.id} value={game.id}>{game.name}</option>
            ))}
          </select>
        </div>

        {/* 分类树 */}
        {!selectedGame ? (
          <div className="empty-state">
            <p>请先选择一个游戏</p>
          </div>
        ) : isLoading ? (
          <div className="loading">加载中...</div>
        ) : categories && categories.length > 0 ? (
          <div className="category-tree">
            {renderTree(categories)}
          </div>
        ) : (
          <div className="empty-state">
            <p>暂无分类，点击右上角添加第一个分类</p>
          </div>
        )}

        {/* 新建/编辑分类弹窗 */}
        {showModal || editingCategory ? (
          <div className="modal-overlay" onClick={handleModalClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>{editingCategory ? '编辑分类' : '新建分类'}</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>分类名称 *</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingCategory?.name}
                    required
                    placeholder="请输入分类名称"
                  />
                </div>
                {!editingCategory && (
                  <div className="form-group">
                    <label>层级</label>
                    <select
                      value={selectedLevel}
                      onChange={(e) => {
                        setSelectedLevel(parseInt(e.target.value))
                        setSelectedParentId(null)
                      }}
                      disabled={!!editingCategory}
                    >
                      {getLevelOptions().map(level => (
                        <option key={level} value={level}>第{level}级</option>
                      ))}
                    </select>
                    <small>注意：层级创建后不可修改</small>
                  </div>
                )}
                {/* 父分类选择（2 级及以上显示） */}
                {!editingCategory && selectedLevel > 1 && (
                  <div className="form-group">
                    <label>父分类 *</label>
                    <select
                      value={selectedParentId || ''}
                      onChange={(e) => setSelectedParentId(e.target.value ? parseInt(e.target.value) : null)}
                      required
                    >
                      <option value="">请选择父分类</option>
                      {flattenCategories(allCategories || [])
                        .filter(cat => cat.level === selectedLevel - 1)
                        .map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} (L{cat.level})
                          </option>
                        ))}
                    </select>
                    <small>选择上一级分类</small>
                  </div>
                )}
                {editingCategory && (
                  <div className="form-group">
                    <label>排序</label>
                    <input
                      type="number"
                      name="order"
                      defaultValue={editingCategory?.order || 0}
                      placeholder="0"
                    />
                  </div>
                )}
                {editingCategory?.iconUrl && (
                  <div className="form-group">
                    <label>当前图标</label>
                    <div className="icon-preview">
                      <img src={editingCategory.iconUrl} alt={editingCategory.name} />
                    </div>
                  </div>
                )}
                {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}
                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={handleModalClose}
                  >
                    取消
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? '保存中...' : '保存'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
    </div>
  )
}

export default Categories
