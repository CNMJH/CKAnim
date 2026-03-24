import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 检查并修复用户收藏夹...')

  // 获取所有用户
  const users = await prisma.user.findMany({
    include: {
      favoriteCollections: true
    }
  })

  console.log(`\n📊 共有 ${users.length} 个用户\n`)

  for (const user of users) {
    const defaultCollection = user.favoriteCollections.find(c => c.isDefault)
    
    if (!defaultCollection) {
      console.log(`⚠️  用户 ${user.username} (ID: ${user.id}) 没有默认收藏夹，正在创建...`)
      
      // 创建默认收藏夹
      const newCollection = await prisma.favoriteCollection.create({
        data: {
          userId: user.id,
          name: '默认收藏夹',
          description: '系统自动创建的默认收藏夹',
          isDefault: true,
          order: 0,
        }
      })
      
      console.log(`✅ 已为用户 ${user.username} 创建默认收藏夹 (ID: ${newCollection.id})`)
    } else {
      console.log(`✅ 用户 ${user.username} 已有默认收藏夹 (ID: ${defaultCollection.id})`)
    }
  }

  console.log('\n✨ 所有用户收藏夹检查完成！')
}

main()
  .catch((e) => {
    console.error('❌ 执行失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
