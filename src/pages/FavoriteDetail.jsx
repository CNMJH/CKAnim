import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { favoritesAPI, authUtils } from '../lib/api'
import './FavoriteDetail.css'

function FavoriteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [collection, setCollection] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [allCollections, setAllCollections] = useState([]) // 所有收藏夹（用于移动）
  const [loading, setLoading] = useState(true)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedVideos, setSelectedVideos] = useState(new Set())
  const [showMoveMenu, setShowMoveMenu] = useState(false) // 移动菜单显示
  const [targetCollectionId, setTargetCollectionId] = useState(null) // 目标收藏夹 ID

  // 加载收藏夹和视频列表
  const loadData = async () => {
    try {
      // 获取所有收藏夹列表
      const { data: collectionsData } = await favoritesAPI.getCollections()
      setAllCollections(collectionsData.collections || [])
      
      const currentCollection = collectionsData.collections.find(c => c.id === parseInt(id))
      setCollection(currentCollection)

      // 获取视频列表
      const { data } = await favoritesAPI.getFavorites(id)
      setFavorites(data.favorites || [])
    } catch (err) {
      console.error('Failed to load data:', err)
      if (err.response?.status === 401) {
        navigate('/user')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  // 切换选择模式
  const toggleSelectMode = () => {
    setSelectMode(!selectMode)
    setSelectedVideos(new Set())
  }

  // 切换视频选择
  const toggleVideoSelection = (videoId) => {
    const newSelected = new Set(selectedVideos)
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId)
    } else {
      newSelected.add(videoId)
    }
    setSelectedVideos(newSelected)
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedVideos.size === favorites.length) {
      setSelectedVideos(new Set())
    } else {
      setSelectedVideos(new Set(favorites.map(f => f.videoId)))
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedVideos.size === 0) return

    if (!confirm(`确定要删除选中的 ${selectedVideos.size} 个视频吗？`)) {
      return
    }

    try {
      await favoritesAPI.batchRemove(Array.from(selectedVideos), parseInt(id))
      setSelectedVideos(new Set())
      setSelectMode(false)
      loadData()
    } catch (err) {
      alert(err.response?.data?.message || '删除失败')
    }
  }

  // 批量移动
  const handleBatchMove = async () => {
    if (selectedVideos.size === 0) return
    if (!targetCollectionId) {
      alert('请选择目标收藏夹')
      return
    }

    if (!confirm(`确定要将选中的 ${selectedVideos.size} 个视频移动到"${allCollections.find(c => c.id === targetCollectionId)?.name}"吗？`)) {
      return
    }

    try {
      await favoritesAPI.batchMove(
        Array.from(selectedVideos),
        parseInt(id),
        parseInt(targetCollectionId)
      )
      setSelectedVideos(new Set())
      setSelectMode(false)
      setShowMoveMenu(false)
      setTargetCollectionId(null)
      loadData()
      alert('移动成功！')
    } catch (err) {
      alert(err.response?.data?.message || '移动失败')
    }
  }

  // 删除单个视频
  const handleDeleteVideo = async (videoId) => {
    if (!confirm('确定要取消收藏这个视频吗？')) {
      return
    }

    try {
      await favoritesAPI.removeFavorite(videoId, parseInt(id))
      loadData()
    } catch (err) {
      alert(err.response?.data?.message || '删除失败')
    }
  }

  // 点击视频卡片
  const handleVideoClick = (videoId) => {
    if (selectMode) {
      toggleVideoSelection(videoId)
    } else {
      // TODO: 跳转到视频播放页面
      console.log('播放视频:', videoId)
    }
  }

  if (loading) {
    return <div className="favorite-detail-loading">加载中...</div>
  }

  if (!collection) {
    return (
      <div className="favorite-detail-not-found">
        <h2>收藏夹不存在</h2>
        <button onClick={() => navigate('/user/favorites')}>返回收藏夹列表</button>
      </div>
    )
  }

  return (
    <div className="favorite-detail-page">
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/user/favorites')}>
          ← 返回
        </button>
        <div className="header-info">
          <h1>{collection.name}</h1>
          {collection.description && <p>{collection.description}</p>}
          <div className="header-meta">
            <span>{favorites.length} 个视频</span>
          </div>
        </div>
        <div className="header-actions">
          {selectMode && (
            <>
              <div className="move-dropdown">
                <button
                  className="action-btn move-btn"
                  onClick={() => setShowMoveMenu(!showMoveMenu)}
                  disabled={selectedVideos.size === 0}
                >
                  批量移动
                </button>
                {showMoveMenu && (
                  <div className="move-dropdown-menu">
                    <div className="move-dropdown-header">选择目标收藏夹</div>
                    {allCollections
                      .filter(c => c.id !== parseInt(id)) // 排除当前收藏夹
                      .map(c => (
                        <button
                          key={c.id}
                          className="move-option"
                          onClick={() => {
                            setTargetCollectionId(c.id)
                            setShowMoveMenu(false)
                            handleBatchMove()
                          }}
                        >
                          {c.name}
                          {c.isDefault && <span className="default-badge">默认</span>}
                        </button>
                      ))}
                    {allCollections.filter(c => c.id !== parseInt(id)).length === 0 && (
                      <div className="move-dropdown-empty">暂无其他收藏夹</div>
                    )}
                  </div>
                )}
              </div>
              <button
                className="action-btn delete-btn"
                onClick={handleBatchDelete}
                disabled={selectedVideos.size === 0}
              >
                批量删除
              </button>
            </>
          )}
          <button
            className={`action-btn ${selectMode ? 'active' : ''}`}
            onClick={toggleSelectMode}
          >
            {selectMode ? '取消选择' : '批量管理'}
          </button>
        </div>
      </div>

      {selectMode && (
        <div className="select-toolbar">
          <label className="select-all">
            <input
              type="checkbox"
              checked={selectedVideos.size === favorites.length && favorites.length > 0}
              onChange={toggleSelectAll}
            />
            全选
          </label>
          <span className="selected-count">已选择 {selectedVideos.size} 个</span>
        </div>
      )}

      <div className="video-list">
        {favorites.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <p>这个收藏夹还是空的</p>
            <button onClick={() => navigate('/games')}>去添加视频</button>
          </div>
        ) : (
          favorites.map((favorite) => (
            <div
              key={favorite.id}
              className={`video-card ${selectedVideos.has(favorite.videoId) ? 'selected' : ''}`}
              onClick={() => handleVideoClick(favorite.videoId)}
            >
              {selectMode && (
                <div className="video-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedVideos.has(favorite.videoId)}
                    onChange={() => toggleVideoSelection(favorite.videoId)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              <div className="video-cover">
                <img src={favorite.video.coverUrl} alt={favorite.video.title} />
                {favorite.video.duration && (
                  <div className="video-duration">
                    {formatDuration(favorite.video.duration)}
                  </div>
                )}
              </div>

              <div className="video-info">
                <div className="video-title">{favorite.video.title}</div>
                <div className="video-meta">
                  {favorite.video.characterName && (
                    <span className="character-name">{favorite.video.characterName}</span>
                  )}
                  {favorite.video.actionName && (
                    <span className="action-name">{favorite.video.actionName}</span>
                  )}
                </div>
                <div className="video-date">
                  收藏于 {new Date(favorite.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>

              {!selectMode && (
                <button
                  className="delete-single-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteVideo(favorite.videoId)
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// 格式化时长
function formatDuration(seconds) {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default FavoriteDetail
