import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { lotteryAPI } from '../lib/services'
import { useAuthStore } from '../store/auth'
import './Lottery.css'

function Lottery() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [showResult, setShowResult] = useState(false)

  // 获取活跃抽奖配置
  const { data: activeData } = useQuery({
    queryKey: ['activeLottery'],
    queryFn: async () => {
      const res = await lotteryAPI.getActive()
      return res.data
    },
    refetchInterval: 60000, // 每分钟刷新
  })

  // 获取每日剩余次数
  const { data: countData, refetch: refetchCount } = useQuery({
    queryKey: ['dailyDrawCount'],
    queryFn: async () => {
      const res = await lotteryAPI.getDailyCount()
      return res.data
    },
    enabled: !!user,
  })

  // 获取用户抽奖记录
  const { data: recordsData } = useQuery({
    queryKey: ['userLotteryRecords'],
    queryFn: async () => {
      const res = await lotteryAPI.getUserRecords()
      return res.data
    },
    enabled: !!user,
  })

  // 抽奖 mutation
  const drawMutation = useMutation({
    mutationFn: async () => {
      const res = await lotteryAPI.draw(activeData?.config?.id)
      return res.data
    },
    onMutate: () => {
      setSpinning(true)
      setResult(null)
    },
    onSuccess: (data) => {
      setTimeout(() => {
        setSpinning(false)
        setResult(data.prize)
        setShowResult(true)
        queryClient.invalidateQueries(['dailyDrawCount'])
        queryClient.invalidateQueries(['userLotteryRecords'])
      }, 2000) // 2 秒后显示结果
    },
    onError: (error) => {
      setSpinning(false)
      alert(error.response?.data?.message || '抽奖失败，请稍后重试')
    },
  })

  const handleDraw = () => {
    if (!user) {
      alert('请先登录')
      return
    }
    if (!countData || countData.remaining <= 0) {
      alert('今日抽奖次数已用完，明天再来吧！')
      return
    }
    drawMutation.mutate()
  }

  const config = activeData?.config
  const prizes = activeData?.prizes || []
  const records = recordsData?.records || []
  const remaining = countData?.remaining || 0

  return (
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
              <span>📅 {config.startDate.split('T')[0]} ~ {config.endDate.split('T')[0]}</span>
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
          <div className="records-section">
            <h3>📊 我的抽奖记录</h3>
            {records.length === 0 ? (
              <p className="no-records">暂无抽奖记录</p>
            ) : (
              <div className="records-list">
                {records.map((record) => (
                  <div key={record.id} className="record-item">
                    <span className="record-date">{record.drawDate}</span>
                    <span className="record-prize">
                      {record.prizeName || '未中奖'}
                      {record.prizeType === 'points' && ` (+${record.prizeValue}积分)`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

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
  )
}

export default Lottery
