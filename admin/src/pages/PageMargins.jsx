import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsAPI } from '../lib/services'
import Layout from '../components/Layout'
import './PageMargins.css'

function PageMargins() {
  const queryClient = useQueryClient()
  
  // 各页面独立边距状态
  const [pageMargins, setPageMargins] = useState({
    home: { top: 0, bottom: 0, left: 0, right: 0 },
    games: { top: 0, bottom: 0, left: 0, right: 0 },
    search: { top: 0, bottom: 0, left: 0, right: 0 },
    userCenter: { top: 0, bottom: 0, left: 0, right: 0 },
    favorites: { top: 0, bottom: 0, left: 0, right: 0 },
    userLibrary: { top: 0, bottom: 0, left: 0, right: 0 },
    userLibraryManage: { top: 0, bottom: 0, left: 0, right: 0 },
    userSecurity: { top: 0, bottom: 0, left: 0, right: 0 },
    userVip: { top: 0, bottom: 0, left: 0, right: 0 },
  })

  // 获取设置
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const res = await settingsAPI.getAll()
      return res.data.settings || {}
    },
  })

  // 加载设置数据
  useEffect(() => {
    if (settingsData) {
      const pageMarginKeys = ['home', 'games', 'search', 'userCenter', 'favorites', 'userLibrary', 'userLibraryManage', 'userSecurity', 'userVip']
      pageMarginKeys.forEach(key => {
        const settingKey = 'pageMargin_' + key
        const setting = settingsData[settingKey]
        if (setting?.value) {
          try {
            const margins = JSON.parse(setting.value)
            setPageMargins(prev => ({
              ...prev,
              [key]: {
                top: margins.top || 0,
                bottom: margins.bottom || 0,
                left: margins.left || 0,
                right: margins.right || 0,
              }
            }))
          } catch (e) {
            console.error('解析页面边距失败:', settingKey, e)
          }
        }
      })
    }
  }, [settingsData])

  // 保存设置
  const saveMutation = useMutation({
    mutationFn: async () => {
      const settings = [
        // 页面边距设置
        ...['home', 'games', 'search', 'userCenter', 'favorites', 'userLibrary', 'userLibraryManage', 'userSecurity', 'userVip'].map(key => ({
          key: 'pageMargin_' + key,
          value: JSON.stringify({
            top: parseInt(pageMargins[key]?.top) || 0,
            bottom: parseInt(pageMargins[key]?.bottom) || 0,
            left: parseInt(pageMargins[key]?.left) || 0,
            right: parseInt(pageMargins[key]?.right) || 0,
          }),
          description: key + '页面边距设置',
        })),
      ]
      await settingsAPI.batchUpdate(settings)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['siteSettings'])
      alert('页面边距设置保存成功！刷新前台页面生效')
    },
    onError: (err) => {
      alert('保存失败：' + err.message)
    },
  })

  const handleSave = () => {
    saveMutation.mutate()
  }

  // 页面配置
  const pageConfigs = [
    { key: 'home', name: '首页', path: '/' },
    { key: 'games', name: '游戏列表', path: '/games' },
    { key: 'search', name: '搜索结果', path: '/search' },
    { key: 'userCenter', name: '个人信息', path: '/user' },
    { key: 'favorites', name: '我的收藏', path: '/user/favorites' },
    { key: 'userLibrary', name: '个人参考库', path: '/user/library' },
    { key: 'userLibraryManage', name: '参考库管理', path: '/user/library/manage' },
    { key: 'userSecurity', name: '账号安全', path: '/user/security' },
    { key: 'userVip', name: '会员开通', path: '/user/vip' },
  ]

  if (settingsLoading) {
    return <Layout><div className="loading">加载中...</div></Layout>
  }

  return (
    <Layout>
      <div className="page-margins-page">
        <div className="page-header">
          <h1>📐 页面边距设置</h1>
          <p className="page-description">为每个页面单独设置上下左右边距，修改后保存，刷新前台页面生效</p>
        </div>

        <div className="page-margins-content">
          {pageConfigs.map(({ key, name, path }) => (
            <div key={key} className="page-margin-card">
              <div className="page-margin-header">
                <h3>
                  📄 {name}
                  <span className="page-path">{path}</span>
                </h3>
              </div>
              
              <div className="margin-inputs">
                <div className="margin-input-group">
                  <label>上边距 (px)</label>
                  <input
                    type="number"
                    value={pageMargins[key]?.top || 0}
                    onChange={(e) => setPageMargins(prev => ({ 
                      ...prev, 
                      [key]: { ...prev[key], top: parseInt(e.target.value) || 0 } 
                    }))}
                    min="0"
                    max="200"
                  />
                </div>
                
                <div className="margin-input-group">
                  <label>下边距 (px)</label>
                  <input
                    type="number"
                    value={pageMargins[key]?.bottom || 0}
                    onChange={(e) => setPageMargins(prev => ({ 
                      ...prev, 
                      [key]: { ...prev[key], bottom: parseInt(e.target.value) || 0 } 
                    }))}
                    min="0"
                    max="200"
                  />
                </div>
                
                <div className="margin-input-group">
                  <label>左边距 (px)</label>
                  <input
                    type="number"
                    value={pageMargins[key]?.left || 0}
                    onChange={(e) => setPageMargins(prev => ({ 
                      ...prev, 
                      [key]: { ...prev[key], left: parseInt(e.target.value) || 0 } 
                    }))}
                    min="0"
                    max="200"
                  />
                </div>
                
                <div className="margin-input-group">
                  <label>右边距 (px)</label>
                  <input
                    type="number"
                    value={pageMargins[key]?.right || 0}
                    onChange={(e) => setPageMargins(prev => ({ 
                      ...prev, 
                      [key]: { ...prev[key], right: parseInt(e.target.value) || 0 } 
                    }))}
                    min="0"
                    max="200"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? '保存中...' : '💾 保存设置'}
          </button>
        </div>
      </div>
    </Layout>
  )
}

export default PageMargins
