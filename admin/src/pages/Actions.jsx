import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { actionsAPI, charactersAPI, categoriesAPI, gamesAPI, videosAPI } from '../lib/services'
import { generateVideoCover } from '../lib/cover-generator'
import Layout from '../components/Layout'
import { useAuthStore } from '../store/auth'
import './Actions.css'

function Actions() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  // 检查是否是管理员（content_admin 或 system_admin）
  const isAdmin = user?.role === 'content_admin' || user?.role === 'system_admin'
  
  // 检查是否是系统管理员（仅 system_admin）
  const isSystemAdmin = user?.role === 'system_admin'
  
  // 层级筛选状态
  const [selectedGameId, setSelectedGameId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedCharacterId, setSelectedCharacterId] = useState('')
  
  // 批量上传状态
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [pendingFiles, setPendingFiles] = useState([])
  const [uploadingFiles, setUploadingFiles] = useState([])
  
  // 编辑状态
  const [editingVideo, setEditingVideo] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    title: '',
    tags: [],
    actionId: null,
    characterId: null,
  })
  const [replaceVideoFile, setReplaceVideoFile] = useState(null)
  const [isReplacing, setIsReplacing] = useState(false)

  // 获取游戏列表
  const { data: gamesData = [] } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const response = await gamesAPI.getAll()
      return response.data.games || []
    },
  })

  // 获取分类列表（按游戏）
  const { data: categoriesData = [] } = useQuery({
    queryKey: ['categories', selectedGameId],
    queryFn: async () => {
      if (!selectedGameId) return []
      const response = await categoriesAPI.getByGame(Number(selectedGameId))
      return response.data.categories || []
    },
    enabled: !!selectedGameId,
  })

  // 获取角色列表（按游戏）
  const { data: charactersData = [] } = useQuery({
    queryKey: ['characters', selectedGameId],
    queryFn: async () => {
      if (!selectedGameId) return []
      const response = await charactersAPI.getByGame(Number(selectedGameId))
      return response.data.characters || []
    },
    enabled: !!selectedGameId,
  })

  // 获取视频列表（按角色筛选）
  const { data: videosData = [], isLoading } = useQuery({
    queryKey: ['videos', selectedCharacterId],
    queryFn: async () => {
      const params = {}
      if (selectedCharacterId) params.characterId = selectedCharacterId
      const response = await videosAPI.getAll(params)
      return response.data.videos || []
    },
    enabled: !selectedCharacterId || !!selectedCharacterId,
  })

  // 筛选后的视频
  const filteredVideos = videosData.filter(video => {
    // 通过 action 关联检查 gameId
    if (selectedGameId && video.action?.character?.gameId !== Number(selectedGameId)) return false
    if (selectedCategoryId) {
      const videoCategories = video.categories || []
      const hasCategory = videoCategories.some(cat => cat.id === Number(selectedCategoryId))
      if (!hasCategory) return false
    }
    if (selectedCharacterId) {
      const videoCharacterId = video.action?.characterId
      if (videoCharacterId !== Number(selectedCharacterId)) return false
    }
    return true
  })

  // 游戏改变时重置下级筛选
  const handleGameChange = (gameId) => {
    setSelectedGameId(gameId ? String(gameId) : '')
    setSelectedCategoryId('')
    setSelectedCharacterId('')
  }

  // 分类改变时重置角色筛选
  const handleCategoryChange = (categoryId) => {
    setSelectedCategoryId(categoryId ? String(categoryId) : '')
    setSelectedCharacterId('')
  }

  // 筛选后的角色列表
  const filteredCharacters = charactersData?.filter(char => {
    if (selectedCategoryId) {
      return char.categoryId === Number(selectedCategoryId)
    }
    return true
  }) || []

  // 打开批量上传弹窗
  const handleOpenUpload = () => {
    if (!selectedCharacterId) {
      alert('请先选择角色！')
      return
    }
    setPendingFiles([])
    setUploadingFiles([])
    setShowUploadModal(true)
  }

  // 处理文件选择
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 20) {
      alert('最多只能选择 20 个文件')
      return
    }
    setPendingFiles(files)
  }

  // 批量上传视频
  const handleBatchUpload = async () => {
    if (pendingFiles.length === 0) {
      alert('请选择视频文件')
      return
    }

    setUploadingFiles(pendingFiles.map(f => ({ name: f.name, status: 'pending', progress: 0 })))

    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i]
      const fileName = file.name.replace(/\.[^/.]+$/, '')

      try {
        setUploadingFiles(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'uploading' } : item
        ))

        // 1. 获取角色信息
        const character = await charactersAPI.getById(selectedCharacterId)
        const gameId = character.data.gameId
        const categoryId = character.data.categoryId

        // 2. 创建动作
        const actionData = {
          name: fileName,
          code: fileName.toLowerCase().replace(/\s+/g, '_'),
          characterId: Number(selectedCharacterId),
          published: true,
        }

        let actionId
        try {
          const actionResponse = await actionsAPI.create(actionData)
          actionId = actionResponse.data.id
        } catch (err) {
          const actionsResponse = await actionsAPI.getAll({ characterId: selectedCharacterId })
          const existingAction = actionsResponse.data.actions?.find(
            a => a.name === fileName || a.code === actionData.code
          )
          if (existingAction) {
            actionId = existingAction.id
          } else {
            throw new Error('无法创建或找到动作')
          }
        }

        // 3. 获取上传凭证
        const tokenResponse = await videosAPI.getUploadToken(file.name, gameId, [categoryId], actionId)
        const { token, key, url } = tokenResponse.data

        // 4. 上传到七牛云
        const formData = new FormData()
        formData.append('token', token)
        formData.append('key', key)
        formData.append('file', file)

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100)
              setUploadingFiles(prev => prev.map((item, idx) => 
                idx === i ? { ...item, progress: percent } : item
              ))
            }
          })
          xhr.addEventListener('load', () => {
            if (xhr.status === 200) resolve()
            else reject(new Error(`上传失败 (${xhr.status})`))
          })
          xhr.addEventListener('error', () => reject(new Error('网络错误')))
          xhr.open('POST', 'https://up-z2.qiniup.com/')
          xhr.send(formData)
        })

        // 5. ⭐ 生成封面图（前端）
        let coverUrl = null
        try {
          setUploadingFiles(prev => prev.map((item, idx) => 
            idx === i ? { ...item, progress: 0, status: 'generating_cover' } : item
          ))
          
          // 生成封面（截取第 1 秒，80% 质量）
          const { blob: coverBlob, width, height } = await generateVideoCover(file, 1, 0.8)
          
          console.log(`[封面生成] 成功：${width}x${height}, 大小：${(coverBlob.size / 1024).toFixed(2)} KB`)
          
          // 获取封面上传凭证
          const coverKey = key.replace('.mp4', '-thumbnail.jpg')
          const coverTokenResponse = await videosAPI.getCoverUploadToken(coverKey)
          const coverToken = coverTokenResponse.data.token
          
          // 上传封面到七牛云
          const coverFormData = new FormData()
          coverFormData.append('token', coverToken)
          coverFormData.append('key', coverKey)
          coverFormData.append('file', coverBlob)
          
          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100)
                setUploadingFiles(prev => prev.map((item, idx) => 
                  idx === i ? { ...item, progress: percent } : item
                ))
              }
            })
            xhr.addEventListener('load', () => {
              if (xhr.status === 200) resolve()
              else reject(new Error(`封面上传失败 (${xhr.status})`))
            })
            xhr.addEventListener('error', () => reject(new Error('封面上传网络错误')))
            xhr.open('POST', 'https://up-z2.qiniup.com/')
            xhr.send(coverFormData)
          })
          
          // 生成封面 URL
          coverUrl = `http://video.jiangmeijixie.com/${coverKey}`
          console.log(`[封面上传] 成功：${coverUrl}`)
          
        } catch (err) {
          console.warn('[封面生成] 失败，继续上传视频:', err.message)
          // 封面生成失败不影响视频上传
        }

        // 6. 创建视频记录
        const videoResponse = await videosAPI.create({
          title: fileName,
          gameId: gameId,
          characterId: Number(selectedCharacterId),
          actionId: actionId,
          qiniuKey: key,
          qiniuUrl: url,
          coverUrl: coverUrl, // ⭐ 封面图 URL
          published: true,
          generateCover: false, // ⭐ 前端已生成，不需要后端生成
        })

        setUploadingFiles(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'success' } : item
        ))

      } catch (error) {
        console.error('[上传] 失败:', error)
        setUploadingFiles(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'error', error: error.message } : item
        ))
      }
    }

    queryClient.invalidateQueries(['videos'])
    setPendingFiles([])
    // 上传完成后保留进度显示 3 秒，然后自动关闭弹窗
    setTimeout(() => {
      setUploadingFiles([])
      setShowUploadModal(false)
      alert('上传完成！')
    }, 3000)
  }

  // 打开编辑弹窗
  const handleEdit = (video) => {
    setEditingVideo(video)
    setEditFormData({
      title: video.title,
      tags: video.tags?.map(t => t.id) || [],
      actionId: video.actionId,
      characterId: video.action?.characterId,
    })
    setShowEditModal(true)
  }

  // 保存编辑
  const handleSaveEdit = () => {
    videosAPI.update(editingVideo.id, {
      title: editFormData.title,
      tagIds: editFormData.tags,
    }).then(() => {
      queryClient.invalidateQueries(['videos'])
      setShowEditModal(false)
      alert('更新成功！')
    }).catch(err => {
      alert('更新失败：' + err.message)
    })
  }

  // 处理视频文件选择
  const handleReplaceVideoSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('video/')) {
        alert('请选择视频文件')
        return
      }
      setReplaceVideoFile(file)
    }
  }

  // 执行视频替换
  const handleReplaceVideo = async () => {
    if (!replaceVideoFile) {
      alert('请选择要替换的视频文件')
      return
    }

    if (!confirm(`确定要替换视频 "${editingVideo.title}" 吗？\n\n注意：\n1. 旧视频文件将被删除\n2. 将自动生成新的封面图\n3. 此操作不可恢复`)) {
      return
    }

    setIsReplacing(true)

    try {
      // 1. 获取上传凭证
      const categoryIds = editingVideo.categories?.map(c => c.id) || []
      const tokenResponse = await videosAPI.getUploadToken(
        replaceVideoFile.name,
        editingVideo.gameId,
        categoryIds,
        editingVideo.actionId || undefined
      )

      const { token, key, url } = tokenResponse.data

      // 2. 上传视频到七牛云（华南区域）- 使用 XMLHttpRequest 与批量上传保持一致
      await new Promise((resolve, reject) => {
        const formData = new FormData()
        formData.append('token', token)
        formData.append('key', key)
        formData.append('file', replaceVideoFile)

        const xhr = new XMLHttpRequest()
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const uploadResult = JSON.parse(xhr.responseText)
            console.log('[Video Replace] Upload success:', uploadResult)
            resolve(uploadResult)
          } else {
            console.error('[Video Replace] Upload failed:', xhr.status, xhr.responseText)
            reject(new Error(`上传失败 (${xhr.status})`))
          }
        })
        xhr.addEventListener('error', () => {
          console.error('[Video Replace] Upload network error')
          reject(new Error('网络错误'))
        })
        xhr.open('POST', 'https://up-z2.qiniup.com/')
        xhr.send(formData)
      })

      // 3. 调用替换 API
      await videosAPI.replace(editingVideo.id, {
        qiniuKey: key,
        qiniuUrl: url,
        generateCover: true,
      })

      // 4. 刷新列表
      queryClient.invalidateQueries(['videos'])
      setShowEditModal(false)
      setReplaceVideoFile(null)
      alert('视频替换成功！')
    } catch (err) {
      console.error('替换视频失败:', err)
      alert('替换失败：' + (err.message || '请稍后重试'))
    } finally {
      setIsReplacing(false)
    }
  }

  // 删除视频
  const handleDelete = (video) => {
    if (confirm(`确定要删除 "${video.title}" 吗？（同时会删除关联的动作）`)) {
      videosAPI.delete(video.id).then(() => {
        queryClient.invalidateQueries(['videos'])
        alert('删除成功！')
      }).catch(err => {
        alert('删除失败：' + err.message)
      })
    }
  }

  return (
    <Layout>
      <div className="actions-page">
        <div className="page-header">
          <h2>动作管理</h2>
          <div className="header-actions">
            <div className="filter-bar" style={{ marginBottom: '0', flex: 1 }}>
              <select
                value={selectedGameId}
                onChange={(e) => handleGameChange(e.target.value)}
                className="filter-select"
              >
                <option value="">选择游戏</option>
                {gamesData?.map(game => (
                  <option key={game.id} value={game.id}>
                    {game.name}
                  </option>
                ))}
              </select>

              {selectedGameId && (
                <select
                  value={selectedCategoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="filter-select"
                >
                  <option value="">所有分类</option>
                  {categoriesData?.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}

              {selectedGameId && (
                <select
                  value={selectedCharacterId}
                  onChange={(e) => setSelectedCharacterId(e.target.value)}
                  className="filter-select"
                >
                  <option value="">选择角色</option>
                  {filteredCharacters?.map(char => (
                    <option key={char.id} value={char.id}>
                      {char.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              className="btn-primary"
              onClick={handleOpenUpload}
              disabled={!selectedCharacterId || !isAdmin}
            >
              📤 批量上传
            </button>
          </div>
        </div>

        <div className="video-section">
          {isLoading ? (
            <div className="loading">加载中...</div>
          ) : filteredVideos.length === 0 ? (
            <div className="empty-state">
              暂无视频
              {selectedCharacterId && (
                <p>点击上方"📤 批量上传"按钮上传视频</p>
              )}
            </div>
          ) : (
            <div className="video-grid">
              {filteredVideos.map(video => (
                <div key={video.id} className="video-card">
                  <div className="video-thumbnail">
                    <img src={video.coverUrl || 'https://placehold.co/280x157?text=No+Cover'} alt={video.title} />
                  </div>
                  <div className="video-info">
                    <h4>{video.title}</h4>
                    <p className="video-meta">
                      {video.action?.character?.name} · {video.action?.name}
                    </p>
                  </div>
                  {isAdmin && (
                  <div className="video-actions">
                    <button onClick={() => handleEdit(video)} className="btn-secondary">编辑</button>
                    <button onClick={() => handleDelete(video)} className="btn-danger">删除</button>
                  </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 批量上传弹窗 */}
        {showUploadModal && (
          <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
              <h3>📤 批量上传视频</h3>
              
              <div className="upload-info" style={{
                padding: '12px',
                background: '#f0f7ff',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>
                  上传到角色：{filteredCharacters.find(c => c.id === Number(selectedCharacterId))?.name}
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                  每个视频将自动创建对应的动作，动作名称 = 文件名
                </p>
              </div>

              <div className="form-group">
                <label>选择视频文件（最多 20 个）</label>
                <input
                  type="file"
                  accept="video/mp4,video/webm"
                  multiple
                  onChange={handleFileSelect}
                  className="form-control"
                />
                <small className="hint">支持 MP4、WebM 格式</small>
              </div>

              {pendingFiles.length > 0 && (
                <div className="file-list" style={{
                  marginTop: '15px',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  {pendingFiles.map((file, idx) => (
                    <div key={idx} style={{
                      padding: '8px',
                      background: '#f5f5f5',
                      borderRadius: '4px',
                      marginBottom: '8px',
                      fontSize: '13px'
                    }}>
                      📁 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  ))}
                </div>
              )}

              {uploadingFiles.length > 0 && (
                <div className="upload-progress-list" style={{
                  marginTop: '15px',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  {uploadingFiles.map((item, idx) => (
                    <div key={idx} className="upload-progress-item">
                      <div className="file-name">{item.name}</div>
                      
                      {item.status === 'uploading' || item.status === 'generating_cover' ? (
                        <>
                          <div className="upload-progress-bar">
                            <div className="progress" style={{ width: `${item.progress}%` }} />
                          </div>
                          <div className={`status ${item.status}`}>
                            {item.status === 'generating_cover' && '🎨 '}
                            {item.status === 'uploading' && '📤 '}
                            {item.status === 'generating_cover' ? '正在生成封面...' : `上传中 ${item.progress}%`}
                          </div>
                        </>
                      ) : item.status === 'success' ? (
                        <div className="status success">✅ 上传成功</div>
                      ) : item.status === 'error' ? (
                        <div className="status error">❌ {item.error}</div>
                      ) : (
                        <div className="status">⏳ 等待上传</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowUploadModal(false)
                    setPendingFiles([])
                    setUploadingFiles([])
                  }}
                  disabled={uploadingFiles.length > 0 && uploadingFiles.some(f => f.status === 'uploading')}
                >
                  {uploadingFiles.length > 0 && uploadingFiles.every(f => f.status === 'success' || f.status === 'error') ? '关闭' : '取消'}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleBatchUpload}
                  disabled={pendingFiles.length === 0 || (uploadingFiles.length > 0 && uploadingFiles.some(f => f.status === 'uploading'))}
                >
                  {uploadingFiles.length > 0 
                    ? (uploadingFiles.every(f => f.status === 'success') ? '✅ 上传完成' : '上传中...')
                    : `📤 开始上传 (${pendingFiles.length}个)`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 编辑弹窗 */}
        {showEditModal && editingVideo && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
              <h3>编辑视频信息</h3>
              
              <div className="form-group">
                <label>视频标题</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="form-control"
                />
              </div>

              <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #eee' }} />

              <div className="form-group">
                <label style={{ fontWeight: 'bold', color: '#d32f2f' }}>🔄 替换视频文件</label>
                <p style={{ fontSize: '13px', color: '#666', margin: '8px 0' }}>
                  上传新视频后将自动：删除旧视频、生成新封面图、更新数据库
                </p>
                
                <div style={{ marginTop: '10px' }}>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleReplaceVideoSelect}
                    disabled={isReplacing}
                    style={{ marginBottom: '10px' }}
                  />
                  
                  {replaceVideoFile && (
                    <div style={{ 
                      padding: '10px', 
                      background: '#f5f5f5', 
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}>
                      <div>📁 {replaceVideoFile.name}</div>
                      <div style={{ color: '#666' }}>
                        {(replaceVideoFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  )}
                  
                  {isReplacing && (
                    <div style={{ 
                      padding: '10px', 
                      background: '#e3f2fd', 
                      borderRadius: '4px',
                      marginTop: '10px',
                      textAlign: 'center'
                    }}>
                      ⏳ 正在替换视频，请稍候...
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowEditModal(false)
                    setReplaceVideoFile(null)
                  }}
                  disabled={isReplacing}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSaveEdit}
                  disabled={isReplacing}
                >
                  💾 保存标题
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleReplaceVideo}
                  disabled={!replaceVideoFile || isReplacing}
                  style={{ marginLeft: '10px', background: '#d32f2f' }}
                >
                  {isReplacing ? '⏳ 替换中...' : '🔄 替换视频'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Actions
