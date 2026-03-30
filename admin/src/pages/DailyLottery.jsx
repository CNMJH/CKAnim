import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { lotteryAPI } from '../lib/services'
import './ActivityManagement.css'

function DailyLottery() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('configs') // configs, prizes, records
  const [selectedConfig, setSelectedConfig] = useState(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showPrizeModal, setShowPrizeModal] = useState(false)
  const [editingConfig, setEditingConfig] = useState(null)
  const [editingPrize, setEditingPrize] = useState(null)

  // 表单状态
  const [configForm, setConfigForm] = useState({
    name: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dailyLimit: 3,
    totalBudget: 100000,
    enabled: true,
  })

  const [prizeForm, setPrizeForm] = useState({
    name: '',
    type: 'points',
    value: 10,
    displayName: '',
    description: '',
    image: '',
    probability: 10,
    totalStock: '',
    enabled: true,
  })

  // 获取配置列表
  const { data: configsData } = useQuery({
    queryKey: ['lotteryConfigs'],
    queryFn: async () => {
      const res = await lotteryAPI.getConfigs()
      return res.data
    },
  })

  // 获取选中配置的奖品
  const { data: prizesData } = useQuery({
    queryKey: ['lotteryPrizes', selectedConfig?.id],
    queryFn: async () => {
      if (!selectedConfig?.id) return { prizes: [], totalProbability: 0 }
      const res = await lotteryAPI.getPrizes(selectedConfig.id)
      return res.data
    },
    enabled: !!selectedConfig?.id,
  })

  // 获取抽奖记录
  const { data: recordsData } = useQuery({
    queryKey: ['lotteryRecords', selectedConfig?.id],
    queryFn: async () => {
      if (!selectedConfig?.id) return { records: [], total: 0 }
      const res = await lotteryAPI.getRecords({ configId: selectedConfig.id })
      return res.data
    },
    enabled: !!selectedConfig?.id,
  })

  // 创建/更新配置
  const createConfigMutation = useMutation({
    mutationFn: () => lotteryAPI.createConfig(configForm),
    onSuccess: () => {
      queryClient.invalidateQueries(['lotteryConfigs'])
      setShowConfigModal(false)
      resetConfigForm()
      alert('创建成功！')
    },
    onError: (err) => alert('创建失败：' + err.message),
  })

  const updateConfigMutation = useMutation({
    mutationFn: () => lotteryAPI.updateConfig(editingConfig.id, configForm),
    onSuccess: () => {
      queryClient.invalidateQueries(['lotteryConfigs'])
      setShowConfigModal(false)
      setEditingConfig(null)
      resetConfigForm()
      alert('更新成功！')
    },
    onError: (err) => alert('更新失败：' + err.message),
  })

  const deleteConfigMutation = useMutation({
    mutationFn: (id) => lotteryAPI.deleteConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['lotteryConfigs'])
      setSelectedConfig(null)
      alert('删除成功！')
    },
    onError: (err) => alert('删除失败：' + err.message),
  })

  // 创建/更新奖品
  const createPrizeMutation = useMutation({
    mutationFn: () => lotteryAPI.createPrize(selectedConfig.id, prizeForm),
    onSuccess: () => {
      queryClient.invalidateQueries(['lotteryPrizes'])
      setShowPrizeModal(false)
      resetPrizeForm()
      alert('创建成功！')
    },
    onError: (err) => alert('创建失败：' + err.message),
  })

  const updatePrizeMutation = useMutation({
    mutationFn: () => lotteryAPI.updatePrize(editingPrize.id, prizeForm),
    onSuccess: () => {
      queryClient.invalidateQueries(['lotteryPrizes'])
      setShowPrizeModal(false)
      setEditingPrize(null)
      resetPrizeForm()
      alert('更新成功！')
    },
    onError: (err) => alert('更新失败：' + err.message),
  })

  const deletePrizeMutation = useMutation({
    mutationFn: (id) => lotteryAPI.deletePrize(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['lotteryPrizes'])
      alert('删除成功！')
    },
    onError: (err) => alert('删除失败：' + err.message),
  })

  const resetConfigForm = () => {
    setConfigForm({
      name: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dailyLimit: 3,
      totalBudget: 100000,
      enabled: true,
    })
  }

  const resetPrizeForm = () => {
    setPrizeForm({
      name: '',
      type: 'points',
      value: 10,
      displayName: '',
      description: '',
      image: '',
      probability: 10,
      totalStock: '',
      enabled: true,
    })
  }

  const handleEditConfig = (config) => {
    setEditingConfig(config)
    setConfigForm({
      name: config.name,
      description: config.description || '',
      startDate: config.startDate.split('T')[0],
      endDate: config.endDate.split('T')[0],
      dailyLimit: config.dailyLimit,
      totalBudget: config.totalBudget || 100000,
      enabled: config.enabled,
    })
    setShowConfigModal(true)
  }

  const handleEditPrize = (prize) => {
    setEditingPrize(prize)
    setPrizeForm({
      name: prize.name,
      type: prize.type,
      value: prize.value,
      displayName: prize.displayName,
      description: prize.description || '',
      image: prize.image || '',
      probability: prize.probability,
      totalStock: prize.totalStock || '',
      enabled: prize.enabled,
    })
    setShowPrizeModal(true)
  }

  const handleSubmitConfig = (e) => {
    e.preventDefault()
    if (editingConfig) {
      updateConfigMutation.mutate()
    } else {
      createConfigMutation.mutate()
    }
  }

  const handleSubmitPrize = (e) => {
    e.preventDefault()
    if (editingPrize) {
      updatePrizeMutation.mutate()
    } else {
      createPrizeMutation.mutate()
    }
  }

  const configs = configsData?.configs || []
  const prizes = prizesData?.prizes || []
  const totalProbability = prizesData?.totalProbability || 0
  const records = recordsData?.records || []

  return (
    <div className="daily-lottery-page">
        <div className="page-header">
          <h1>🎰 每日抽奖配置</h1>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setEditingConfig(null)
              resetConfigForm()
              setShowConfigModal(true)
            }}
          >
            ➕ 新建活动
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'configs' ? 'active' : ''}`}
            onClick={() => setActiveTab('configs')}
          >
            活动配置
          </button>
          <button 
            className={`tab ${activeTab === 'prizes' ? 'active' : ''}`}
            onClick={() => {
              if (!selectedConfig) {
                alert('请先选择一个活动配置')
                return
              }
              setActiveTab('prizes')
            }}
          >
            奖品管理
          </button>
          <button 
            className={`tab ${activeTab === 'records' ? 'active' : ''}`}
            onClick={() => {
              if (!selectedConfig) {
                alert('请先选择一个活动配置')
                return
              }
              setActiveTab('records')
            }}
          >
            抽奖记录
          </button>
        </div>

        {/* 活动配置列表 */}
        {activeTab === 'configs' && (
          <div className="configs-list">
            {configs.length === 0 ? (
              <div className="empty-state">
                <p>暂无抽奖活动</p>
                <button className="btn btn-primary" onClick={() => setShowConfigModal(true)}>
                  创建第一个活动
                </button>
              </div>
            ) : (
              <div className="cards-grid">
                {configs.map((config) => (
                  <div 
                    key={config.id} 
                    className={`config-card ${selectedConfig?.id === config.id ? 'selected' : ''}`}
                    onClick={() => setSelectedConfig(config)}
                  >
                    <div className="card-header">
                      <h3>{config.name}</h3>
                      <span className={`status ${config.enabled ? 'enabled' : 'disabled'}`}>
                        {config.enabled ? '✓ 启用' : '✗ 停用'}
                      </span>
                    </div>
                    <p className="description">{config.description || '无描述'}</p>
                    <div className="card-info">
                      <span>📅 {config.startDate.split('T')[0]} ~ {config.endDate.split('T')[0]}</span>
                      <span>🎫 每日{config.dailyLimit}次</span>
                    </div>
                    <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-sm" onClick={() => handleEditConfig(config)}>
                        ✏️ 编辑
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => {
                        if (confirm('确定删除此活动？将同时删除所有奖品和记录。')) {
                          deleteConfigMutation.mutate(config.id)
                        }
                      }}>
                        🗑️ 删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 奖品管理 */}
        {activeTab === 'prizes' && selectedConfig && (
          <div className="prizes-management">
            <div className="section-header">
              <h2>🎁 {selectedConfig.name} - 奖品列表</h2>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setEditingPrize(null)
                  resetPrizeForm()
                  setShowPrizeModal(true)
                }}
              >
                ➕ 添加奖品
              </button>
            </div>

            <div className={`probability-indicator ${totalProbability === 100 ? 'valid' : 'invalid'}`}>
              <span>总概率：{totalProbability}%</span>
              {totalProbability === 100 ? (
                <span className="valid-icon">✓ 正确</span>
              ) : (
                <span className="invalid-icon">✗ 需调整为 100%</span>
              )}
            </div>

            {prizes.length === 0 ? (
              <div className="empty-state">
                <p>暂无奖品</p>
              </div>
            ) : (
              <table className="prizes-table">
                <thead>
                  <tr>
                    <th>奖品名称</th>
                    <th>类型</th>
                    <th>数值</th>
                    <th>概率</th>
                    <th>库存</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {prizes.map((prize) => (
                    <tr key={prize.id}>
                      <td>
                        <div className="prize-name">
                          {prize.image && <img src={prize.image} alt={prize.displayName} className="prize-image" />}
                          <span>{prize.displayName}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`type-badge type-${prize.type}`}>
                          {prize.type === 'points' && '🪙 积分'}
                          {prize.type === 'item' && '🎫 道具'}
                          {prize.type === 'physical' && '📦 实物'}
                        </span>
                      </td>
                      <td>{prize.value}</td>
                      <td className="probability">{prize.probability}%</td>
                      <td>
                        {prize.totalStock ? (
                          <span>{prize.remainingStock} / {prize.totalStock}</span>
                        ) : (
                          <span>∞</span>
                        )}
                      </td>
                      <td>
                        <span className={`status ${prize.enabled ? 'enabled' : 'disabled'}`}>
                          {prize.enabled ? '启用' : '停用'}
                        </span>
                      </td>
                      <td>
                        <div className="actions">
                          <button className="btn btn-sm" onClick={() => handleEditPrize(prize)}>
                            ✏️
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => {
                            if (confirm('确定删除此奖品？')) {
                              deletePrizeMutation.mutate(prize.id)
                            }
                          }}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 抽奖记录 */}
        {activeTab === 'records' && selectedConfig && (
          <div className="records-management">
            <h2>📊 {selectedConfig.name} - 抽奖记录</h2>
            {records.length === 0 ? (
              <div className="empty-state">
                <p>暂无抽奖记录</p>
              </div>
            ) : (
              <table className="records-table">
                <thead>
                  <tr>
                    <th>用户</th>
                    <th>奖品</th>
                    <th>类型</th>
                    <th>数值</th>
                    <th>抽奖时间</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>{record.nickname || record.username || `用户${record.userId}`}</td>
                      <td>{record.prizeName || '未中奖'}</td>
                      <td>
                        {record.prizeType === 'points' && '🪙 积分'}
                        {record.prizeType === 'item' && '🎫 道具'}
                        {record.prizeType === 'physical' && '📦 实物'}
                        {!record.prizeType && '-'}
                      </td>
                      <td>{record.prizeValue || '-'}</td>
                      <td>{record.drawDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 配置弹窗 */}
        {showConfigModal && (
          <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{editingConfig ? '编辑活动' : '新建活动'}</h2>
              <form onSubmit={handleSubmitConfig}>
                <div className="form-group">
                  <label>活动名称</label>
                  <input
                    type="text"
                    value={configForm.name}
                    onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>活动描述</label>
                  <textarea
                    value={configForm.description}
                    onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>开始日期</label>
                    <input
                      type="date"
                      value={configForm.startDate}
                      onChange={(e) => setConfigForm({ ...configForm, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>结束日期</label>
                    <input
                      type="date"
                      value={configForm.endDate}
                      onChange={(e) => setConfigForm({ ...configForm, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>每日抽奖次数</label>
                    <input
                      type="number"
                      min="1"
                      value={configForm.dailyLimit}
                      onChange={(e) => setConfigForm({ ...configForm, dailyLimit: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>总预算（积分）</label>
                    <input
                      type="number"
                      min="0"
                      value={configForm.totalBudget}
                      onChange={(e) => setConfigForm({ ...configForm, totalBudget: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="form-group checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={configForm.enabled}
                      onChange={(e) => setConfigForm({ ...configForm, enabled: e.target.checked })}
                    />
                    启用活动
                  </label>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowConfigModal(false)}>
                    取消
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingConfig ? '保存' : '创建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 奖品弹窗 */}
        {showPrizeModal && (
          <div className="modal-overlay" onClick={() => setShowPrizeModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{editingPrize ? '编辑奖品' : '添加奖品'}</h2>
              <form onSubmit={handleSubmitPrize}>
                <div className="form-group">
                  <label>奖品名称（内部标识）</label>
                  <input
                    type="text"
                    value={prizeForm.name}
                    onChange={(e) => setPrizeForm({ ...prizeForm, name: e.target.value })}
                    placeholder="如：points_10"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>显示名称</label>
                  <input
                    type="text"
                    value={prizeForm.displayName}
                    onChange={(e) => setPrizeForm({ ...prizeForm, displayName: e.target.value })}
                    placeholder="如：10 积分"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>奖品类型</label>
                    <select
                      value={prizeForm.type}
                      onChange={(e) => setPrizeForm({ ...prizeForm, type: e.target.value })}
                    >
                      <option value="points">🪙 积分</option>
                      <option value="item">🎫 道具</option>
                      <option value="physical">📦 实物</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>数值</label>
                    <input
                      type="number"
                      min="1"
                      value={prizeForm.value}
                      onChange={(e) => setPrizeForm({ ...prizeForm, value: parseInt(e.target.value) })}
                      placeholder={prizeForm.type === 'points' ? '积分数量' : '道具/实物 ID'}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>奖品描述</label>
                  <textarea
                    value={prizeForm.description}
                    onChange={(e) => setPrizeForm({ ...prizeForm, description: e.target.value })}
                    rows={2}
                    placeholder="奖品详细说明"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>中奖概率 (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={prizeForm.probability}
                      onChange={(e) => setPrizeForm({ ...prizeForm, probability: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  {prizeForm.type !== 'points' && (
                    <div className="form-group">
                      <label>总库存（留空为无限）</label>
                      <input
                        type="number"
                        min="1"
                        value={prizeForm.totalStock}
                        onChange={(e) => setPrizeForm({ ...prizeForm, totalStock: e.target.value ? parseInt(e.target.value) : '' })}
                      />
                    </div>
                  )}
                </div>
                <div className="form-group checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={prizeForm.enabled}
                      onChange={(e) => setPrizeForm({ ...prizeForm, enabled: e.target.checked })}
                    />
                    启用奖品
                  </label>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPrizeModal(false)}>
                    取消
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingPrize ? '保存' : '添加'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  )
}

export default DailyLottery
