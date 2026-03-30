import { useState, useEffect } from 'react'
import { lotteryAPI, authUtils } from '../lib/api'
import UserCenterLayout from '../components/UserCenterLayout'
import './Lottery.css'

function Lottery() {
  const [user, setUser] = useState(null)
  const [config, setConfig] = useState(null)
  const [prizes, setPrizes] = useState([])
  const [remaining, setRemaining] = useState(0)
  const [records, setRecords] = useState([])
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [loading, setLoading] = useState(true)

  // 加载用户信息
  useEffect(() => {
    const token = authUtils.getToken()
    if (token) {
      loadUserInfo()
    }
    loadLotteryData()
  }, [])

  const loadUserInfo = async () => {
    try {
      const { data } = await lotteryAPI.getDailyCount()
      setRemaining(data.remaining || 0)
      setUser({ loggedIn: true })
      
      // 加载用户抽奖记录
      const { data: recordsData } = await lotteryAPI.getUserRecords()
      setRecords(recordsData.records || [])
    } catch (err) {
      console.error('加载用户信息失败:', err)
    }
  }

  const loadLotteryData = async () => {
    try {
      const { data } = await lotteryAPI.getActive()
      setConfig(data.config)
      setPrizes(data.prizes || [])
    } catch (err) {
      console.error('加载抽奖数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDraw = async () => {
    if (!user) {
      alert('请先登录')
      return
    }
    if (remaining <= 0) {
      alert('今日抽奖次数已用完，明天再来吧！')
      return
    }

    setSpinning(true)
    setResult(null)

    try {
      const { data } = await lotteryAPI.draw()
      setTimeout(() => {
        setSpinning(false)
        setResult(data.prize)
        setShowResult(true)
        // 更新剩余次数和记录
        loadUserInfo()
      }, 2000)
    } catch (err) {
      setSpinning(false)
      alert(err.response?.data?.message || '抽奖失败，请稍后重试')
    }
  }

  if (loading) {
    return (
      <UserCenterLayout>
        <div className="lottery-page loading">
          <p>加载中...</p>
        </div>
      </UserCenterLayout>
    )
  }

  return (
    <UserCenterLayout>
      <div className="lottery-page">
      {!config ? (
        <div className="no-activity">
          <h1>🎰 暂无抽奖活动</h1>
          <p>敬请期待后续活动...</p>
        </div>
      ) : (
        <>
          <div className="lottery-header">
            <h1>{config.name}</h1>
            <p className="description">{config.description}</p>
            <div className="activity-info">
              <span>📅 {config.startDate?.split('T')[0]} ~ {config.endDate?.split('T')[0]}</span>
              <span>🎫 剩余次数：{remaining}/{config.dailyLimit}</span>
            </div>
          </div>

          {/* 抽奖转盘 */}
          <div className="lottery-container">
            <div className="wheel-wrapper">
              <div className={`wheel ${spinning ? 'spinning' : ''}`}>
                {prizes.slice(0, 8).map((prize, index) => (
                  <div key={prize.id} className={`wheel-segment segment-${index}`}>
                    <span className="segment-icon">
                      {prize.type === 'points' && '🪙'}
                      {prize.type === 'item' && '🎫'}
                      {prize.type === 'physical' && '📦'}
                    </span>
                    <span className="segment-name">{prize.displayName}</span>
                    <span className="segment-prob">{prize.probability}%</span>
                  </div>
                ))}
              </div>
              <button 
                className="draw-button"
                onClick={handleDraw}
                disabled={spinning || remaining <= 0}
              >
                {spinning ? '🎲 抽奖中...' : '🎰 立即抽奖'}
              </button>
            </div>

            {/* 奖品列表 */}
            <div className="prizes-preview">
              <h3>🎁 奖品列表</h3>
              <div className="prizes-grid">
                {prizes.map((prize) => (
                  <div key={prize.id} className={`prize-card prize-${prize.type}`}>
                    <div className="prize-icon">
                      {prize.type === 'points' && '🪙'}
                      {prize.type === 'item' && '🎫'}
                      {prize.type === 'physical' && '📦'}
                    </div>
                    <div className="prize-info">
                      <div className="prize-name">{prize.displayName}</div>
                      <div className="prize-prob">{prize.probability}%</div>
                      {prize.remainingStock !== null && (
                        <div className="prize-stock">剩余：{prize.remainingStock}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 抽奖记录 */}
          {user && records.length > 0 && (
            <div className="records-section">
              <h3>📊 我的抽奖记录</h3>
              <div className="records-list">
                {records.map((record) => (
                  <div key={record.id} className="record-item">
                    <span className="record-date">
                      {new Date(record.drawDate).toLocaleString('zh-CN')}
                    </span>
                    <span className="record-prize">
                      {record.prizeName || '未中奖'}
                      {record.prizeType === 'points' && ` (+${record.prizeValue}积分)`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 中奖结果弹窗 */}
          {showResult && result && (
            <div className="result-overlay" onClick={() => setShowResult(false)}>
              <div className="result-modal" onClick={(e) => e.stopPropagation()}>
                <div className="result-icon">
                  {result.type === 'points' && '🪙'}
                  {result.type === 'item' && '🎫'}
                  {result.type === 'physical' && '📦'}
                </div>
                <h2>🎉 恭喜中奖！</h2>
                <div className="result-prize">{result.name}</div>
                {result.description && (
                  <p className="result-description">{result.description}</p>
                )}
                {result.type === 'points' && (
                  <p className="result-points">+{result.value} 积分已到账</p>
                )}
                <button className="btn btn-primary" onClick={() => setShowResult(false)}>
                  开心收下
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </UserCenterLayout>
  )
}

export default Lottery