import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamesAPI, categoriesAPI } from '../lib/services'
import Layout from '../components/Layout'
import './Categories.css'

function Categories() {
  const [selectedGame, setSelectedGame] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [expandedNodes, setExpandedNodes] = useState({})
  const queryClient = useQueryClient()

  // 获取游戏列表
  const { data: games } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const response = await gamesAPI.getAll()
      return response.data
    },
  })

  // 获取分类树
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', selectedGame?.id],
    queryFn: async () => {
      if (!selectedGame) return []
      const response = await categoriesAPI.getByGame(selectedGame.id)
      return response.data
    },
    enabled: !!selectedGame,
  })

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

  const handleSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = {
      name: formData.get('name'),
      level: parseInt(formData.get('level')),
      gameId: selectedGame?.id,
      parentId: formData.get('parentId') ? parseInt(formData.get('parentId')) : null,
      order: parseInt(formData.get('order')) || 0,
    }

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: { name: data.name, order: data.order } })
    } else {
      createMutation.mutate(data)
    }
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
          <span className="node-name">{node.name}</span>
          <span className="node-level">L{node.level}</span>
          <div className="node-actions">
            <button className="btn-sm" onClick={() => setEditingCategory(node)}>编辑</button>
            <button className="btn-sm btn-danger" onClick={() => deleteMutation.mutate(node.id)}>删除</button>
          </div>
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
    <Layout>
      <div className="categories-page">
        <div className="page-header">
          <h2>分类管理</h2>
          <button 
            className="btn-primary" 
            onClick={() => setShowModal(true)}
            disabled={!selectedGame}
          >
            + 新建分类
          </button>
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
          <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingCategory(null) }}>
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
                <div className="form-group">
                  <label>层级</label>
                  <select
                    name="level"
                    defaultValue={editingCategory?.level || 1}
                    disabled={!!editingCategory}
                  >
                    {getLevelOptions().map(level => (
                      <option key={level} value={level}>第{level}级</option>
                    ))}
                  </select>
                  <small>注意：层级创建后不可修改</small>
                </div>
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
                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => { setShowModal(false); setEditingCategory(null) }}
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
    </Layout>
  )
}

export default Categories
