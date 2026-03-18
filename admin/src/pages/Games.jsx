import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamesAPI } from '../lib/services'
import Layout from '../components/Layout'
import './Games.css'

function Games() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingGame, setEditingGame] = useState(null)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const iconInputRef = useRef(null)
  const queryClient = useQueryClient()

  const { data: games, isLoading } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const response = await gamesAPI.getAll()
      return response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      await gamesAPI.create(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['games'])
      setShowCreateModal(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await gamesAPI.update(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['games'])
      setEditingGame(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      if (confirm('确定要删除这个游戏吗？')) {
        await gamesAPI.delete(id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['games'])
    },
  })

  const handleIconUpload = async (e, gameId) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingIcon(true)
    try {
      // 1. 获取上传凭证
      const { data: { token, key, url } } = await gamesAPI.getIconToken(file.name, gameId)

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

      // 3. 更新游戏
      if (gameId) {
        updateMutation.mutate({ id: gameId, data: { iconUrl: url } })
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
      description: formData.get('description'),
      order: parseInt(formData.get('order')) || 0,
      published: formData.get('published') === 'on',
    }

    if (editingGame) {
      updateMutation.mutate({ id: editingGame.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  return (
    <Layout>
      <div className="games-page">
        <div className="page-header">
          <h2>游戏管理</h2>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            + 新建游戏
          </button>
        </div>

        {isLoading ? (
          <div className="loading">加载中...</div>
        ) : (
          <div className="games-grid">
            {games?.map((game) => (
              <div key={game.id} className="game-card">
                <div className="game-header">
                  <div className="game-title-row">
                    {game.iconUrl && (
                      <img src={game.iconUrl} alt={game.name} className="game-icon" />
                    )}
                    <h3>{game.name}</h3>
                  </div>
                  <span className={`status ${game.published ? 'published' : 'draft'}`}>
                    {game.published ? '已发布' : '未发布'}
                  </span>
                </div>
                <p className="game-description">{game.description || '暂无描述'}</p>
                <div className="game-stats">
                  <span>📁 {game._count.categories} 个分类</span>
                  <span>🎬 {game._count.videos} 个视频</span>
                </div>
                <div className="game-actions">
                  <button className="btn-secondary" onClick={() => setEditingGame(game)}>
                    编辑
                  </button>
                  <label className="btn-secondary">
                    上传图标
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleIconUpload(e, game.id)}
                      disabled={uploadingIcon}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button className="btn-danger" onClick={() => deleteMutation.mutate(game.id)}>
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {(showCreateModal || editingGame) && (
          <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setEditingGame(null) }}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>{editingGame ? '编辑游戏' : '新建游戏'}</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>游戏名称 *</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingGame?.name}
                    required
                    placeholder="请输入游戏名称"
                  />
                </div>
                <div className="form-group">
                  <label>描述</label>
                  <textarea
                    name="description"
                    defaultValue={editingGame?.description}
                    placeholder="请输入游戏描述"
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>排序</label>
                  <input
                    type="number"
                    name="order"
                    defaultValue={editingGame?.order || 0}
                    placeholder="0"
                  />
                </div>
                {editingGame?.iconUrl && (
                  <div className="form-group">
                    <label>当前图标</label>
                    <div className="icon-preview">
                      <img src={editingGame.iconUrl} alt={editingGame.name} />
                    </div>
                  </div>
                )}
                <div className="form-group checkbox">
                  <label>
                    <input type="checkbox" name="published" defaultChecked={editingGame?.published} />
                    已发布
                  </label>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => { setShowCreateModal(false); setEditingGame(null) }}>
                    取消
                  </button>
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

export default Games
