import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 添加 VIP0 普通用户套餐...')

  // 检查是否已存在 VIP0
  const existing = await prisma.vipPlan.findFirst({
    where: { level: 'vip0' }
  })

  if (existing) {
    console.log('⚠️  VIP0 套餐已存在，跳过')
    return
  }

  // 创建 VIP0 套餐
  await prisma.vipPlan.create({
    data: {
      name: '普通用户',
      level: 'vip0',
      price: '免费',
      originalPrice: '',
      features: JSON.stringify(['基础画质', '收藏功能', '评论互动']),
      badge: '',
      order: 0,
      enabled: true,
    }
  })

  console.log('✅ 成功创建 VIP0 普通用户套餐')
  console.log('  - 普通用户 (免费)')
  console.log('  权益：基础画质、收藏功能、评论互动')
}

main()
  .catch((e) => {
    console.error('❌ 添加失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
