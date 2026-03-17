import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamesAPI } from '../lib/services'
import Layout from '../components/Layout'
import './Games.css'

function Games() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingGame, setEditingGame] = useState(null)
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
                  <h3>{game.name}</h3>
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
