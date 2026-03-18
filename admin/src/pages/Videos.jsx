import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamesAPI, videosAPI, categoriesAPI, tagsAPI } from '../lib/services'
import Layout from '../components/Layout'
import './Videos.css'

function Videos() {
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingVideo, setEditingVideo] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editTags, setEditTags] = useState([])
  const [editCategories, setEditCategories] = useState([])
  const [selectedGame, setSelectedGame] = useState(null)
  const [uploadingFile, setUploadingFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedTags, setSelectedTags] = useState([])
  const [newTagName, setNewTagName] = useState('')
  const [selectedCategories, setSelectedCategories] = useState([])
  const [pendingFile, setPendingFile] = useState(null) // 待上传的单个文件
  const [pendingFiles, setPendingFiles] = useState([]) // 待上传的批量文件
  const [batchProgress, setBatchProgress] = useState([]) // 批量上传进度
  const [isBatchMode, setIsBatchMode] = useState(false) // 是否批量模式
  const queryClient = useQueryClient()

  // 获取游戏列表
  const { data: games } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const response = await gamesAPI.getAll()
      return response.data
    },
  })

  // 获取视频列表
  const { data: videosData, isLoading } = useQuery({
    queryKey: ['videos', selectedGame?.id],
    queryFn: async () => {
      if (!selectedGame) return { videos: [], pagination: {} }
      const response = await videosAPI.getAll({ gameId: selectedGame.id })
      return response.data
    },
    enabled: !!selectedGame,
  })

  // 获取所有标签
  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await tagsAPI.getAll()
      return response.data
    },
  })

  // 获取所有分类（用于上传时选择）
  const { data: allCategories } = useQuery({
    queryKey: ['categories', selectedGame?.id],
    queryFn: async () => {
      if (!selectedGame) return []
      const response = await categoriesAPI.getByGame(selectedGame.id)
      return response.data
    },
    enabled: !!selectedGame,
  })

  // 删除视频
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      if (confirm('确定要删除这个视频吗？（同时会删除七牛云上的文件）')) {
        await videosAPI.delete(id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['videos'])
    },
  })

  // 更新视频发布状态
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, published }) => {
      await videosAPI.update(id, { published })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['videos'])
    },
  })

  // 更新视频信息（标题、标签、分类）
  const updateVideoMutation = useMutation({
    mutationFn: async ({ id, title, tagIds, categoryIds }) => {
      await videosAPI.update(id, { title, tagIds, categoryIds })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['videos'])
      setShowEditModal(false)
      alert('更新成功！')
    },
  })

  // 打开编辑弹窗
  const handleEditClick = (video) => {
    setEditingVideo(video)
    setEditTitle(video.title)
    setEditTags(video.tags?.map(t => t.id) || [])
    setEditCategories(video.categories?.map(c => c.id) || [])
    setShowEditModal(true)
  }

  // 保存编辑
  const handleSaveEdit = () => {
    updateVideoMutation.mutate({
      id: editingVideo.id,
      title: editTitle,
      tagIds: editTags,
      categoryIds: editCategories,
    })
  }

  // 创建标签
  const createTagMutation = useMutation({
    mutationFn: async (name) => {
      const response = await tagsAPI.create({ name })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tags'])
    },
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

  // 处理单个文件选择
  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPendingFile(file)
      setPendingFiles([])
      setIsBatchMode(false)
    }
  }

  // 处理批量文件选择
  const handleBatchFileSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      setPendingFiles(files)
      setPendingFile(null)
      setIsBatchMode(true)
    }
  }

  // 批量上传
  const handleBatchUpload = async () => {
    if (pendingFiles.length === 0) return

    setUploadingFile({ name: 'batch_uploading' })
    
    const results = []
    const totalFiles = pendingFiles.length

    for (let i = 0; i < totalFiles; i++) {
      const file = pendingFiles[i]
      try {
        setBatchProgress(prev => {
          const updated = [...prev]
          updated[i] = { name: file.name, progress: 0, status: 'uploading' }
          return updated
        })

        // 1. 获取上传凭证
        const tokenResponse = await videosAPI.getUploadToken({
          gameId: selectedGame.id,
          categoryIds: selectedCategories,
        })
        const { token, key, url } = tokenResponse.data

        // 2. 上传到七牛云
        const formData = new FormData()
        formData.append('token', token)
        formData.append('key', key)
        formData.append('file', file)

        const xhr = new XMLHttpRequest()

        await new Promise((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100)
              setBatchProgress(prev => {
                const updated = [...prev]
                updated[i] = { name: file.name, progress: percent, status: 'uploading' }
                return updated
              })
            }
          })

          xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
              resolve()
            } else {
              reject(new Error(`上传失败 (${xhr.status})`))
            }
          })

          xhr.addEventListener('error', () => {
            reject(new Error('网络错误'))
          })

          xhr.open('POST', 'https://up-z2.qiniup.com/')
          xhr.send(formData)
        })

        // 3. 创建视频记录
        await videosAPI.create({
          title: file.name.replace(/\.[^/.]+$/, ''),
          gameId: selectedGame.id,
          qiniuKey: key,
          qiniuUrl: url,
          published: false,
          tagIds: selectedTags,
          categoryIds: selectedCategories,
          generateCover: true,
        })

        setBatchProgress(prev => {
          const updated = [...prev]
          updated[i] = { name: file.name, progress: 100, status: 'success' }
          return updated
        })

        results.push({ name: file.name, success: true })
      } catch (error) {
        console.error(`Upload error for ${file.name}:`, error)
        setBatchProgress(prev => {
          const updated = [...prev]
          updated[i] = { name: file.name, progress: 0, status: 'error', error: error.message }
          return updated
        })
        results.push({ name: file.name, success: false, error: error.message })
      }
    }

    // 完成
    setUploadingFile(null)
    setBatchProgress([])
    setPendingFiles([])
    setShowModal(false)
    setSelectedTags([])
    setSelectedCategories([])
    queryClient.invalidateQueries(['videos'])

    const successCount = results.filter(r => r.success).length
    alert(`批量上传完成：成功 ${successCount}/${totalFiles} 个`)
  }

  const handleStartUpload = async (e) => {
    if (!pendingFile) return
    const file = pendingFile

    setUploadingFile(pendingFile)
    setUploadProgress(0)

    try {
      // 1. 获取上传凭证（传递分类 ID 用于生成文件夹路径）
      const tokenResponse = await videosAPI.getUploadToken(file.name, selectedGame.id, selectedCategories)
      const { token, key, url } = tokenResponse.data

      // 2. 上传到七牛云
      const formData = new FormData()
      formData.append('token', token)
      formData.append('key', key)
      formData.append('file', file)

      const xhr = new XMLHttpRequest()
      
      await new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100)
            setUploadProgress(percent)
          }
        })

        xhr.addEventListener('load', () => {
          console.log('Qiniu response status:', xhr.status)
          console.log('Qiniu response text:', xhr.responseText)
          
          if (xhr.status === 200) {
            resolve()
          } else {
            try {
              const error = JSON.parse(xhr.responseText)
              reject(new Error(error.error || '上传失败'))
            } catch(e) {
              reject(new Error(`上传失败 (${xhr.status})`))
            }
          }
        })

        xhr.addEventListener('error', (e) => {
          console.error('XHR error:', e)
          reject(new Error('网络错误'))
        })

        // 使用七牛云华南区域上传地址
        xhr.open('POST', 'https://up-z2.qiniup.com/')
        xhr.send(formData)
      })

      // 3. 创建视频记录（带标签和分类，自动生成封面）
      const videoData = {
        title: file.name.replace(/\.[^/.]+$/, ''),
        gameId: selectedGame.id,
        qiniuKey: key,
        qiniuUrl: url,
        published: false,
        tagIds: selectedTags,
        categoryIds: selectedCategories,
        generateCover: true, // 自动生成封面
      }

      await videosAPI.create(videoData)

      // 4. 重置状态
      setUploadingFile(null)
      setUploadProgress(0)
      setShowModal(false)
      setSelectedTags([])
      setSelectedCategories([])
      queryClient.invalidateQueries(['videos'])

      alert('上传成功！')
    } catch (error) {
      console.error('Upload error:', error)
      alert('上传失败：' + error.message)
      setUploadingFile(null)
      setUploadProgress(0)
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Layout>
      <div className="videos-page">
        <div className="page-header">
          <h2>视频管理</h2>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowModal(true)}
            disabled={!selectedGame}
          >
            📤 上传视频
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
            }}
          >
            <option value="">请选择游戏</option>
            {games?.map(game => (
              <option key={game.id} value={game.id}>{game.name}</option>
            ))}
          </select>
        </div>

        {/* 上传进度 */}
        {uploadingFile && (
          <div className="upload-progress">
            <p>正在上传：{uploadingFile.name}</p>
            <div className="progress-bar">
              <div className="progress" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p>{uploadProgress}%</p>
          </div>
        )}

        {/* 视频列表 */}
        {!selectedGame ? (
          <div className="empty-state">
            <p>请先选择一个游戏</p>
          </div>
        ) : isLoading ? (
          <div className="loading">加载中...</div>
        ) : videosData?.videos?.length > 0 ? (
          <div className="videos-grid">
            {videosData.videos.map(video => (
              <div key={video.id} className="video-card">
                <div className="video-thumbnail">
                  {video.coverUrl ? (
                    <img src={video.coverUrl} alt={video.title} />
                  ) : (
                    <video src={video.qiniuUrl} />
                  )}
                  <div className="video-overlay">
                    <video src={video.qiniuUrl} controls />
                  </div>
                </div>
                <div className="video-info">
                  <h3>{video.title}</h3>
                  <div className="video-meta">
                    <span>⏱ {formatDuration(video.duration)}</span>
                    <span className={`status ${video.published ? 'published' : 'draft'}`}>
                      {video.published ? '已发布' : '未发布'}
                    </span>
                  </div>
                  <div className="video-actions">
                    <button
                      className="btn-sm btn-secondary"
                      onClick={() => handleEditClick(video)}
                    >
                      编辑
                    </button>
                    <button
                      className={`btn-sm ${video.published ? 'btn-warning' : 'btn-success'}`}
                      onClick={() => togglePublishMutation.mutate({ 
                        id: video.id, 
                        published: !video.published 
                      })}
                    >
                      {video.published ? '取消发布' : '发布'}
                    </button>
                    <button
                      className="btn-sm btn-danger"
                      onClick={() => deleteMutation.mutate(video.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>暂无视频，点击上方按钮上传第一个视频</p>
          </div>
        )}

        {/* 分页 */}
        {videosData?.pagination?.totalPages > 1 && (
          <div className="pagination">
            <span>第 {videosData.pagination.page} / {videosData.pagination.totalPages} 页</span>
            <span>共 {videosData.pagination.total} 个视频</span>
          </div>
        )}

        {/* 上传弹窗 */}
        {showModal && (
          <div className="modal-overlay" onClick={() => { setShowModal(false); setSelectedTags([]); setSelectedCategories([]) }}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>上传视频</h3>
              
              {/* 上传模式切换 */}
              <div className="upload-mode-switch">
                <button
                  type="button"
                  className={`mode-btn ${!isBatchMode ? 'active' : ''}`}
                  onClick={() => { setIsBatchMode(false); setPendingFile(null); setPendingFiles([]); }}
                >
                  单个上传
                </button>
                <button
                  type="button"
                  className={`mode-btn ${isBatchMode ? 'active' : ''}`}
                  onClick={() => { setIsBatchMode(true); setPendingFile(null); setPendingFiles([]); }}
                >
                  批量上传
                </button>
              </div>

              <div className="upload-area">
                {!isBatchMode ? (
                  <>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      disabled={uploadingFile}
                      id="video-upload"
                    />
                    <label htmlFor="video-upload" className="upload-label">
                      📤 选择视频文件
                    </label>
                    <p className="upload-hint">支持 MP4、WebM 等格式，最大 500MB</p>
                  </>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="video/*"
                      multiple
                      onChange={handleBatchFileSelect}
                      disabled={uploadingFile}
                      id="video-batch-upload"
                    />
                    <label htmlFor="video-batch-upload" className="upload-label">
                      📤 选择多个视频文件
                    </label>
                    <p className="upload-hint">支持 MP4、WebM 等格式，最多选择 20 个文件</p>
                  </>
                )}
              </div>

              {/* 分类选择 */}
              <div className="categories-section">
                <label>视频分类（可选，支持多级）</label>
                <div className="categories-list">
                  {flattenCategories(allCategories || []).map(cat => (
                    <button
                      key={cat.id}
                      className={`category-btn ${selectedCategories.includes(cat.id) ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedCategories(prev =>
                          prev.includes(cat.id)
                            ? prev.filter(id => id !== cat.id)
                            : [...prev, cat.id]
                        )
                      }}
                    >
                      {'\u00A0'.repeat((cat.level - 1) * 2)}
                      {cat.name}
                      <span className="level-tag">L{cat.level}</span>
                    </button>
                  ))}
                </div>
                <p className="category-hint">可选择多个分类，用于前台网站分类筛选</p>
              </div>

              {/* 标签选择 */}
              <div className="tags-section">
                <label>视频标签（可选）</label>
                <div className="tags-list">
                  {tags?.map(tag => (
                    <button
                      key={tag.id}
                      className={`tag-btn ${selectedTags.includes(tag.id) ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedTags(prev =>
                          prev.includes(tag.id)
                            ? prev.filter(id => id !== tag.id)
                            : [...prev, tag.id]
                        )
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>

                {/* 新建标签 */}
                <div className="new-tag-input">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="输入新标签名称"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTagName.trim()) {
                        createTagMutation.mutate(newTagName.trim())
                        setNewTagName('')
                      }
                    }}
                  />
                  <button
                    className="btn-sm"
                    onClick={() => {
                      if (newTagName.trim()) {
                        createTagMutation.mutate(newTagName.trim())
                        setNewTagName('')
                      }
                    }}
                    disabled={!newTagName.trim() || createTagMutation.isPending}
                  >
                    添加
                  </button>
                </div>
                <p className="tag-hint">标签仅用于搜索，不会在前台展示</p>
              </div>

              {/* 已选择的文件 */}
              {!isBatchMode ? (
                pendingFile && (
                  <div className="selected-file">
                    <span className="file-icon">📄</span>
                    <span className="file-name">{pendingFile.name}</span>
                    <span className="file-size">({(pendingFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )
              ) : (
                pendingFiles.length > 0 && (
                  <div className="batch-file-list">
                    <div className="file-list-header">
                      <span className="file-icon">📁</span>
                      <span>已选择 {pendingFiles.length} 个文件</span>
                    </div>
                    <div className="file-list">
                      {pendingFiles.slice(0, 5).map((file, index) => (
                        <div key={index} className="file-item">
                          <span className="file-name">{file.name}</span>
                          <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                      ))}
                      {pendingFiles.length > 5 && (
                        <div className="file-item more">
                          <span>还有 {pendingFiles.length - 5} 个文件...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* 批量上传进度 */}
              {batchProgress.length > 0 && (
                <div className="batch-progress">
                  <h4>上传进度</h4>
                  {batchProgress.map((item, index) => (
                    <div key={index} className={`progress-item ${item.status}`}>
                      <span className="progress-name">{item.name}</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="progress-status">
                        {item.status === 'uploading' && `${item.progress}%`}
                        {item.status === 'success' && '✅'}
                        {item.status === 'error' && `❌ ${item.error}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setShowModal(false); setSelectedTags([]); setSelectedCategories([]); setPendingFile(null); setPendingFiles([]); setBatchProgress([]); }}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={isBatchMode ? handleBatchUpload : handleStartUpload}
                  disabled={(isBatchMode ? pendingFiles.length === 0 : !pendingFile) || uploadingFile}
                >
                  {uploadingFile ? '上传中...' : (isBatchMode ? `📤 开始上传 (${pendingFiles.length}个)` : '📤 开始上传')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 编辑弹窗 */}
        {showEditModal && editingVideo && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>编辑视频信息</h3>
              
              {/* 标题编辑 */}
              <div className="form-group">
                <label>视频标题</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="form-input"
                  placeholder="输入视频标题"
                />
              </div>

              {/* 分类选择 */}
              <div className="form-group">
                <label>视频分类（可选）</label>
                <div className="categories-list">
                  {flattenCategories(allCategories || []).map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`category-btn ${editCategories.includes(cat.id) ? 'selected' : ''}`}
                      onClick={() => {
                        setEditCategories(prev =>
                          prev.includes(cat.id)
                            ? prev.filter(id => id !== cat.id)
                            : [...prev, cat.id]
                        )
                      }}
                    >
                      {'\u00A0'.repeat((cat.level - 1) * 2)}
                      {cat.name}
                      <span className="level-tag">L{cat.level}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 标签选择 */}
              <div className="form-group">
                <label>视频标签（可选）</label>
                <div className="tags-list">
                  {tags?.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      className={`tag-btn ${editTags.includes(tag.id) ? 'selected' : ''}`}
                      onClick={() => {
                        setEditTags(prev =>
                          prev.includes(tag.id)
                            ? prev.filter(id => id !== tag.id)
                            : [...prev, tag.id]
                        )
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>

                {/* 新建标签 */}
                <div className="new-tag-input">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="输入新标签名称"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTagName.trim()) {
                        createTagMutation.mutate(newTagName.trim())
                        setNewTagName('')
                      }
                    }}
                  />
                  <button
                    className="btn-sm"
                    onClick={() => {
                      if (newTagName.trim()) {
                        createTagMutation.mutate(newTagName.trim())
                        setNewTagName('')
                      }
                    }}
                    disabled={!newTagName.trim() || createTagMutation.isPending}
                  >
                    添加
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSaveEdit}
                  disabled={updateVideoMutation.isPending}
                >
                  {updateVideoMutation.isPending ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Videos
