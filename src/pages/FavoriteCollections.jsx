import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { favoritesAPI, authUtils } from '../lib/api'
import UserCenterLayout from '../components/UserCenterLayout'
import './FavoriteCollections.css'

function FavoriteCollections() {
  const navigate = useNavigate()
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCollection, setEditingCollection] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  // 加载收藏夹列表
  const loadCollections = async () => {
    try {
      const { data } = await favoritesAPI.getCollections()
      setCollections(data.collections || [])
    } catch (err) {
      console.error('Failed to load collections:', err)
      if (err.response?.status === 401) {
        navigate('/user')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCollections()
  }, [])

  // 创建收藏夹
  const handleCreate = async () => {
    try {
      await favoritesAPI.createCollection(formData)
      setShowCreateModal(false)
      setFormData({ name: '', description: '' })
      loadCollections()
    } catch (err) {
      alert(err.response?.data?.message || '创建失败')
    }
  }

  // 编辑收藏夹
  const handleEdit = (collection) => {
    setEditingCollection(collection)
    setFormData({
      name: collection.name,
      description: collection.description || '',
    })
  }

  // 更新收藏夹
  const handleUpdate = async () => {
    try {
      await favoritesAPI.updateCollection(editingCollection.id, formData)
      setEditingCollection(null)
      setFormData({ name: '', description: '' })
      loadCollections()
    } catch (err) {
      alert(err.response?.data?.message || '更新失败')
    }
  }

  // 删除收藏夹
  const handleDelete = async (collection) => {
    if (collection.isDefault) {
      alert('默认收藏夹不可删除')
      return
    }

    if (!confirm(`确定要删除收藏夹"${collection.name}"吗？\n收藏夹内的视频将移动到默认收藏夹。`)) {
      return
    }

    try {
      await favoritesAPI.deleteCollection(collection.id)
      loadCollections()
    } catch (err) {
      alert(err.response?.data?.message || '删除失败')
    }
  }

  // 取消编辑
  const handleCancel = () => {
    setShowCreateModal(false)
    setEditingCollection(null)
    setFormData({ name: '', description: '' })
  }

  // 拖拽排序
  const handleDragStart = (e, id) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    // 设置拖拽预览
    const dragImage = e.target.querySelector('.collection-card')
    if (dragImage) {
      e.dataTransfer.setDragImage(dragImage, 0, 0)
    }
  }

  const handleDragOver = (e, id) => {
    e.preventDefault()
    if (id !== draggedId) {
      setDragOverId(id)
    }
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = async (e, targetId) => {
    e.preventDefault()
    setDragOverId(null)
    
    if (draggedId && draggedId !== targetId) {
      try {
        // 获取拖拽前后的收藏夹信息
        const draggedCollection = collections.find(c => c.id === draggedId)
        const targetCollection = collections.find(c => c.id === targetId)
        
        if (draggedCollection && targetCollection) {
          // 交换排序值
          const tempOrder = draggedCollection.order
          await favoritesAPI.updateCollectionOrder(draggedId, targetCollection.order)
          await favoritesAPI.updateCollectionOrder(targetId, tempOrder)
          
          // 重新加载列表
          await loadCollections()
        }
      } catch (err) {
        console.error('Failed to reorder:', err)
        alert('排序失败：' + (err.response?.data?.message || '未知错误'))
      } finally {
        setDraggedId(null)
      }
    }
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  if (loading) {
    return <div className="favorite-collections-loading">加载中...</div>
  }

  return (
    <UserCenterLayout>
      <div className="favorite-collections-page">
        <div className="page-header">
          <h2>我的收藏夹</h2>
          <button className="create-btn" onClick={() => setShowCreateModal(true)}>
            + 新建收藏夹
          </button>
        </div>

      {collections.length > 1 && (
        <p className="drag-hint">💡 拖动收藏夹可调整排序（默认收藏夹不可拖动）</p>
      )}

      <div className="collections-grid">
        {collections.map((collection) => (
          <div
            key={collection.id}
            className={`collection-card ${collection.isDefault ? 'default' : ''} ${dragOverId === collection.id ? 'drag-over' : ''}`}
            draggable={!collection.isDefault}
            onDragStart={(e) => handleDragStart(e, collection.id)}
            onDragOver={(e) => handleDragOver(e, collection.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, collection.id)}
            onDragEnd={handleDragEnd}
          >
            <div className="collection-cover">
              {collection.cover ? (
                <img src={collection.cover} alt={collection.name} />
              ) : (
                <div className="empty-cover">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                </div>
              )}
              <div className="collection-count">
                {collection.count} 个视频
              </div>
            </div>

            <div className="collection-info">
              <div className="collection-name">
                {collection.name}
                {collection.isDefault && (
                  <span className="default-badge">默认</span>
                )}
              </div>
              {collection.description && (
                <div className="collection-description">
                  {collection.description}
                </div>
              )}
            </div>

            <div className="collection-actions">
              <button
                className="action-btn view-btn"
                onClick={() => navigate(`/user/favorites/${collection.id}`)}
              >
                查看
              </button>
              {!collection.isDefault && (
                <>
                  <button
                    className="action-btn edit-btn"
                    onClick={() => handleEdit(collection)}
                  >
                    编辑
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={() => handleDelete(collection)}
                  >
                    删除
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 创建/编辑弹窗 */}
      {(showCreateModal || editingCollection) && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingCollection ? '编辑收藏夹' : '新建收藏夹'}</h3>

            <div className="form-group">
              <label>名称 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入收藏夹名称"
                disabled={editingCollection?.isDefault}
              />
            </div>

            <div className="form-group">
              <label>描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入描述（可选）"
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={handleCancel}>
                取消
              </button>
              <button
                className="submit-btn"
                onClick={editingCollection ? handleUpdate : handleCreate}
                disabled={!formData.name.trim()}
              >
                {editingCollection ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </UserCenterLayout>
  )
}

export default FavoriteCollections
