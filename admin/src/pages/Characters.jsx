import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamesAPI, charactersAPI, categoriesAPI } from '../lib/services'
import Layout from '../components/Layout'
import { useAuthStore } from '../store/auth'
import './Characters.css'

function Characters() {
  const [selectedGame, setSelectedGame] = useState(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    avatar: '',
    description: '',
    order: 0,
    published: true,
  })
  const { user } = useAuthStore()

  // 检查是否是管理员（content_admin 或 system_admin）
  const isAdmin = user?.role === 'content_admin' || user?.role === 'system_admin'
  
  // 检查是否是系统管理员（仅 system_admin）
  const isSystemAdmin = user?.role === 'system_admin'

  const queryClient = useQueryClient()

  // 获取游戏列表
  const { data: gamesData = [] } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const res = await gamesAPI.getAll()
      return res.data.games || []
    },
  })

  // 获取分类列表（按游戏）
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', selectedGame?.id],
    queryFn: async () => {
      if (!selectedGame) return []
      const res = await categoriesAPI.getByGame(selectedGame.id)
      return res.data.categories || []
    },
    enabled: !!selectedGame,
  })

  // 获取角色列表
  const { data: characters = [] } = useQuery({
    queryKey: ['characters', selectedGame?.id, selectedCategoryId],
    queryFn: async () => {
      if (!selectedGame) return []
      const res = await charactersAPI.getByGame(selectedGame.id)
      return res.data.characters || []
    },
    enabled: !!selectedGame,
  })

  // 游戏改变时重置分类筛选
  const handleGameChange = (gameId) => {
    const game = gamesData?.find(g => g.id === parseInt(gameId))
    setSelectedGame(game || null)
    setSelectedCategoryId('')
  }

  // 筛选后的角色列表
  const filteredCharacters = characters?.filter(char => {
    if (selectedCategoryId) {
      return char.categoryId === parseInt(selectedCategoryId)
    }
    return true
  }) || []

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
    
    // 处理 categoryId：空字符串转换为 null
    const submitData = {
      ...formData,
      categoryId: formData.categoryId === '' ? null : formData.categoryId,
    }
    
    if (editingCharacter) {
      updateMutation.mutate({ id: editingCharacter.id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingAvatar(true)
    try {
      // 1. 获取上传凭证
      const { data: { token, key, url } } = await charactersAPI.getAvatarToken(file.name, editingCharacter?.id)

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

      // 3. 更新表单中的 avatar URL
      setFormData(prev => ({ ...prev, avatar: url }))
    } catch (error) {
      console.error('头像上传失败:', error)
      alert('头像上传失败，请重试')
    } finally {
      setUploadingAvatar(false)
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
        {isAdmin && (
        <button className="btn-primary" onClick={handleNew}>+ 新建角色</button>
        )}
      </div>

      {/* 层级筛选器：游戏 > 分类 */}
      <div className="filter-bar">
        <select
          value={selectedGame?.id || ''}
          onChange={(e) => handleGameChange(e.target.value)}
          className="filter-select"
        >
          <option value="">请选择游戏</option>
          {gamesData?.map(game => (
            <option key={game.id} value={game.id}>{game.name}</option>
          ))}
        </select>

        {selectedGame && (
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="filter-select"
          >
            <option value="">所有分类</option>
            {categories?.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* 角色列表 */}
      {!selectedGame ? (
        <div className="empty-state">
          <p>请先选择一个游戏</p>
        </div>
      ) : filteredCharacters?.length > 0 ? (
        <div className="characters-list">
          {filteredCharacters.map(character => (
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
                {isAdmin && (
                <>
                <button className="btn-sm" onClick={() => handleEdit(character)}>编辑</button>
                <button className="btn-sm btn-danger" onClick={() => deleteMutation.mutate(character.id)}>删除</button>
                </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>
            {selectedCategoryId 
              ? `该分类下暂无角色` 
              : '暂无角色，点击右上角创建'}
          </p>
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
                <label>角色头像</label>
                {formData.avatar && (
                  <div className="avatar-preview">
                    <img src={formData.avatar} alt="头像预览" style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '8px', marginBottom: '8px' }} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>
                    {uploadingAvatar ? '上传中...' : '上传本地图片'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <input
                    type="text"
                    value={formData.avatar}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    placeholder="或输入七牛云图片地址"
                    style={{ flex: 1 }}
                  />
                </div>
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
