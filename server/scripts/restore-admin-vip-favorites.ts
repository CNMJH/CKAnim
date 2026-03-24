/**
 * 恢复管理员账户、VIP 套餐和收藏夹
 * 用于数据库恢复后的数据重建
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 开始恢复管理员账户、VIP 套餐和收藏夹...\n')
  
  // ========== 1. 恢复管理员账户 ==========
  console.log('📋 步骤 1: 恢复管理员账户...')
  
  const adminPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin_new' },
    update: {
      password: adminPassword,
      role: 'admin',
      email: 'admin@ckanim.com',
    },
    create: {
      username: 'admin_new',
      password: adminPassword,
      email: 'admin@ckanim.com',
      role: 'admin',
      vipLevel: 'none',
    },
  })
  
  console.log(`  ✅ 管理员账户已创建：admin_new / admin123 (ID: ${admin.id})\n`)
  
  // ========== 2. 恢复 VIP 套餐 ==========
  console.log('📋 步骤 2: 恢复 VIP 套餐...')
  
  const vipPlans = [
    {
      name: '普通用户',
      level: 'vip0',
      price: '免费',
      originalPrice: '¥0',
      features: JSON.stringify(['基础画质', '收藏功能', '评论互动']),
      badge: null,
      order: 0,
      enabled: true,
    },
    {
      name: 'VIP1 月卡',
      level: 'vip1',
      price: '¥15',
      originalPrice: '¥180/年',
      features: JSON.stringify(['高清画质', '去广告', '专属标识']),
      badge: null,
      order: 1,
      enabled: true,
    },
    {
      name: 'VIP2 年卡',
      level: 'vip2',
      price: '¥158',
      originalPrice: '¥180/年',
      features: JSON.stringify(['高清画质', '去广告', '专属标识', '离线下载']),
      badge: '热销',
      order: 2,
      enabled: true,
    },
    {
      name: 'VIP3 永久',
      level: 'vip3',
      price: '¥398',
      originalPrice: '¥398/永久',
      features: JSON.stringify(['所有 VIP 权益', '优先客服', '终身有效']),
      badge: '推荐',
      order: 3,
      enabled: true,
    },
  ]
  
  for (const plan of vipPlans) {
    await prisma.vipPlan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    })
    console.log(`  ✅ VIP 套餐：${plan.name}`)
  }
  
  const vipCount = await prisma.vipPlan.count()
  console.log(`  📊 共恢复 ${vipCount} 个 VIP 套餐\n`)
  
  // ========== 3. 恢复收藏夹 ==========
  console.log('📋 步骤 3: 恢复收藏夹...')
  
  // 获取所有用户
  const users = await prisma.user.findMany()
  console.log(`  找到 ${users.length} 个用户`)
  
  let collectionsCreated = 0
  
  for (const user of users) {
    // 检查是否已有默认收藏夹
    const existingDefault = await prisma.favoriteCollection.findFirst({
      where: {
        userId: user.id,
        isDefault: true,
      },
    })
    
    if (!existingDefault) {
      await prisma.favoriteCollection.create({
        data: {
          userId: user.id,
          name: '默认收藏夹',
          description: '系统自动创建的默认收藏夹',
          isDefault: true,
          cover: null,
          count: 0,
          order: 0,
        },
      })
      console.log(`  ✅ 为用户 ${user.username} 创建默认收藏夹`)
      collectionsCreated++
    } else {
      console.log(`  ⏭️ 用户 ${user.username} 已有默认收藏夹`)
    }
  }
  
  console.log(`  📊 共创建 ${collectionsCreated} 个收藏夹\n`)
  
  // ========== 4. 统计结果 ==========
  console.log('📊 恢复完成统计：')
  console.log(`  管理员账户：1 个 (admin_new)`)
  console.log(`  VIP 套餐：${vipCount} 个`)
  console.log(`  收藏夹：${collectionsCreated} 个`)
  console.log(`  总用户数：${users.length} 个`)
  console.log('')
  console.log('✅ 所有数据恢复完成！\n')
  
  console.log('📋 下一步操作：')
  console.log('  1. 管理员登录：http://39.102.115.79:3003')
  console.log('     账号：admin_new')
  console.log('     密码：admin123')
  console.log('  2. 检查 VIP 套餐：后台 → VIP 套餐管理')
  console.log('  3. 检查收藏夹：用户中心 → 我的收藏')
}

main()
  .catch((e) => {
    console.error('❌ 恢复失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
