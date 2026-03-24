import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 初始化 VIP 套餐...')

  // 检查是否已有数据
  const existing = await prisma.vipPlan.count()
  if (existing > 0) {
    console.log('⚠️  已有 VIP 套餐数据，跳过初始化')
    return
  }

  // 创建默认套餐
  const defaultPlans = [
    {
      name: '普通用户',
      level: 'vip0',
      price: '免费',
      originalPrice: '',
      features: JSON.stringify(['基础画质', '收藏功能', '评论互动']),
      badge: '',
      order: 0,
      enabled: true,
    },
    {
      name: 'VIP1 月卡',
      level: 'vip1',
      price: '¥15/月',
      originalPrice: '¥180/年',
      features: JSON.stringify(['高清画质', '去广告', '专属标识']),
      badge: '',
      order: 1,
      enabled: true,
    },
    {
      name: 'VIP2 年卡',
      level: 'vip2',
      price: '¥158/年',
      originalPrice: '¥180/年',
      features: JSON.stringify(['高清画质', '去广告', '专属标识', '离线下载']),
      badge: '热销',
      order: 2,
      enabled: true,
    },
    {
      name: 'VIP3 永久',
      level: 'vip3',
      price: '¥398/永久',
      originalPrice: '',
      features: JSON.stringify(['所有 VIP 权益', '优先客服', '终身有效']),
      badge: '推荐',
      order: 3,
      enabled: true,
    },
  ]

  await prisma.vipPlan.createMany({
    data: defaultPlans,
  })

  console.log('✅ 成功创建 4 个 VIP 套餐')
  console.log('  - 普通用户 (免费)')
  console.log('  - VIP1 月卡 (¥15/月)')
  console.log('  - VIP2 年卡 (¥158/年) [热销]')
  console.log('  - VIP3 永久 (¥398/永久) [推荐]')
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
