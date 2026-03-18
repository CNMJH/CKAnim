import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamesAPI, charactersAPI } from '../lib/services'
import Layout from '../components/Layout'
import './Characters.css'

function Characters() {
  const [selectedGame, setSelectedGame] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    avatar: '',
    description: '',
    order: 0,
    published: true,
  })

  const queryClient = useQueryClient()

  // 获取游戏列表
  const { data: gamesData } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const res = await gamesAPI.getAll()
      return res.data.games
    },
  })

  // 获取分类列表（按游戏）
  const { data: categories } = useQuery({
    queryKey: ['categories', selectedGame?.id],
    queryFn: async () => {
      if (!selectedGame) return []
      const res = await categoriesAPI.getByGame(selectedGame.id)
      return res.data.categories
    },
    enabled: !!selectedGame,
  })

  // 获取角色列表
  const { data: characters } = useQuery({
    queryKey: ['characters', selectedGame?.id],
    queryFn: async () => {
      if (!selectedGame) return []
      const res = await charactersAPI.getByGame(selectedGame.id)
      return res.data.characters
    },
    enabled: !!selectedGame,
  })

  // 创建角色
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await charactersAPI.create({ ...data, gameId: selectedGame.id })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['characters'])
      setShowModal(false)
      resetForm()
    },
  })

  // 更新角色
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await charactersAPI.update(id, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['characters'])
      setShowModal(false)
      setEditingCharacter(null)
      resetForm()
    },
  })

  // 删除角色
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await charactersAPI.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['characters'])
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      categoryId: '',
      avatar: '',
      description: '',
      order: 0,
      published: true,
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingCharacter) {
      updateMutation.mutate({ id: editingCharacter.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (character) => {
    setEditingCharacter(character)
    setFormData({
      name: character.name,
      categoryId: character.categoryId || '',
      avatar: character.avatar || '',
      description: character.description || '',
      order: character.order || 0,
      published: character.published,
    })
    setShowModal(true)
  }

  const handleNew = () => {
    setEditingCharacter(null)
    resetForm()
    setShowModal(true)
  }

  return (
    <Layout>
      <div className="characters-page">
      <div className="page-header">
        <h1>角色管理</h1>
        <button className="btn-primary" onClick={handleNew}>+ 新建角色</button>
      </div>

      {/* 选择游戏 */}
      <div className="game-selector">
        <label>选择游戏：</label>
        <select
          value={selectedGame?.id || ''}
          onChange={(e) => {
            const game = gamesData?.find(g => g.id === parseInt(e.target.value))
            setSelectedGame(game || null)
          }}
        >
          <option value="">请选择游戏</option>
          {gamesData?.map(game => (
            <option key={game.id} value={game.id}>{game.name}</option>
          ))}
        </select>
      </div>

      {/* 角色列表 */}
      {selectedGame && (
        <div className="characters-list">
          {characters?.length > 0 ? (
            characters.map(character => (
              <div key={character.id} className="character-item">
                <div className="character-info">
                  {character.avatar ? (
                    <img src={character.avatar} alt={character.name} className="character-avatar" />
                  ) : (
                    <div className="character-avatar-placeholder">{character.name.charAt(0)}</div>
                  )}
                  <div className="character-details">
                    <div className="character-name">{character.name}</div>
                    {character.category && <div className="character-role">分类：{character.category.name}</div>}
                    {character.description && <div className="character-description">{character.description}</div>}
                  </div>
                </div>
                <div className="character-actions">
                  <span className={`status-badge ${character.published ? 'published' : 'draft'}`}>
                    {character.published ? '已发布' : '未发布'}
                  </span>
                  <button className="btn-sm" onClick={() => handleEdit(character)}>编辑</button>
                  <button className="btn-sm btn-danger" onClick={() => deleteMutation.mutate(character.id)}>删除</button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">暂无角色，点击右上角创建</div>
          )}
        </div>
      )}

      {/* 新建/编辑弹窗 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingCharacter ? '编辑角色' : '新建角色'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>角色名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="如：亚索、阿狸"
                />
              </div>

              <div className="form-group">
                <label>角色分类</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value ? parseInt(e.target.value) : null })}
                >
                  <option value="">不分类</option>
                  {categories?.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} (L{cat.level})
                    </option>
                  ))}
                </select>
                <small style={{color: '#888', marginTop: '4px', display: 'block'}}>
                  分类用于前台网站筛选（如：战士、法师、刺客）
                </small>
              </div>

              <div className="form-group">
                <label>头像 URL</label>
                <input
                  type="text"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="七牛云图片地址"
                />
              </div>

              <div className="form-group">
                <label>描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="角色简介"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>排序</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  />
                  已发布（前台可见）
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </Layout>
  )
}

export default Characters
