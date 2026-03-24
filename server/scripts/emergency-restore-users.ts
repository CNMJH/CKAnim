/**
 * 紧急恢复用户数据脚本
 * 原因：数据库被意外覆盖，需要重建用户和收藏夹
 * 
 * 恢复内容：
 * 1. 管理员账户：admin_new / admin123
 * 2. 测试账户：test_prod / test@prod.com / 123456
 * 3. 为每个用户创建默认收藏夹
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 开始恢复用户数据...\n')

  // 1. 创建管理员账户
  console.log('📝 创建管理员账户：admin_new')
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { username: 'admin_new' },
    update: {},
    create: {
      username: 'admin_new',
      email: 'admin@ckanim.com',
      password: adminPassword,
      role: 'admin',
      vipLevel: 'none',
    },
  })
  console.log(`✅ 管理员创建成功，ID: ${admin.id}\n`)

  // 2. 创建测试账户
  console.log('📝 创建测试账户：test_prod')
  const testPassword = await bcrypt.hash('123456', 10)
  const testUser = await prisma.user.upsert({
    where: { username: 'test_prod' },
    update: {},
    create: {
      username: 'test_prod',
      email: 'test@prod.com',
      password: testPassword,
      role: 'user',
      vipLevel: 'none',
    },
  })
  console.log(`✅ 测试用户创建成功，ID: ${testUser.id}\n`)

  // 3. 为所有用户创建默认收藏夹
  console.log('📁 为用户创建默认收藏夹...')
  const allUsers = await prisma.user.findMany()
  
  for (const user of allUsers) {
    const defaultCollection = await prisma.favoriteCollection.findFirst({
      where: {
        userId: user.id,
        isDefault: true,
      },
    })

    if (!defaultCollection) {
      await prisma.favoriteCollection.create({
        data: {
          userId: user.id,
          name: '默认收藏夹',
          description: '系统自动创建的默认收藏夹',
          isDefault: true,
          order: 0,
        },
      })
      console.log(`  ✅ 为用户 ${user.username} (ID: ${user.id}) 创建默认收藏夹`)
    } else {
      console.log(`  ⏭️  用户 ${user.username} 已有默认收藏夹，跳过`)
    }
  }

  console.log('\n✅ 用户数据恢复完成！\n')
  console.log('📋 恢复的账户信息：')
  console.log('  管理员：admin_new / admin123')
  console.log('  测试用户：test_prod / 123456')
  console.log('\n⚠️  注意：')
  console.log('  - 用户头像、收藏夹内容等数据无法恢复')
  console.log('  - 建议尽快备份数据库')
  console.log('  - 以后数据库操作前必须先备份！\n')
}

main()
  .catch((e) => {
    console.error('❌ 恢复失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
