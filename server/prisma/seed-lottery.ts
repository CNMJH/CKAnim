import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始插入抽奖示例数据...')

  // 创建抽奖配置
  const config = await prisma.lotteryConfig.create({
    data: {
      name: '每日幸运抽奖',
      description: '每日登录即可参与抽奖，赢取积分、道具和实物大奖！',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 天后
      dailyLimit: 3,
      totalBudget: 100000,
      enabled: true,
    },
  })

  console.log(`✅ 创建抽奖配置：${config.name} (ID: ${config.id})`)

  // 创建奖品
  const prizes = [
    { name: '10 积分', type: 'points', value: 10, displayName: '10 积分', probability: 50 },
    { name: '50 积分', type: 'points', value: 50, displayName: '50 积分', probability: 25 },
    { name: '100 积分', type: 'points', value: 100, displayName: '100 积分', probability: 10 },
    { name: '抽奖券', type: 'item', value: 1, displayName: '额外抽奖券', description: '可获得一次额外抽奖机会', probability: 8 },
    { name: 'VIP 体验卡', type: 'item', value: 7, displayName: '7 天 VIP 体验卡', description: 'VIP 会员体验 7 天', probability: 5 },
    { name: '定制周边', type: 'physical', value: 1, displayName: 'CKAnim 定制鼠标垫', description: '高品质游戏鼠标垫', probability: 1.5, totalStock: 100 },
    { name: '机械键盘', type: 'physical', value: 2, displayName: 'CKAnim 定制机械键盘', description: 'RGB 背光机械键盘', probability: 0.5, totalStock: 200 },
  ]

  for (const prize of prizes) {
    await prisma.lotteryPrize.create({
      data: {
        configId: config.id,
        ...prize,
        remainingStock: prize.totalStock || null,
        enabled: true,
      },
    })
    console.log(`  ✅ 创建奖品：${prize.displayName} (${prize.probability}%)`)
  }

  console.log('\n🎉 抽奖示例数据插入完成！')
  console.log(`📊 总概率：${prizes.reduce((sum, p) => sum + p.probability, 0)}%`)
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
