import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 初始化用户默认收藏夹...')

  // 获取所有用户
  const users = await prisma.user.findMany({
    include: {
      favoriteCollections: true
    }
  })

  console.log(`📊 找到 ${users.length} 个用户`)

  let created = 0
  let skipped = 0

  for (const user of users) {
    // 检查是否已有默认收藏夹
    const hasDefault = user.favoriteCollections.some(fc => fc.isDefault)

    if (hasDefault) {
      skipped++
      continue
    }

    // 创建默认收藏夹
    await prisma.favoriteCollection.create({
      data: {
        userId: user.id,
        name: '默认收藏夹',
        description: '默认收藏夹，不可删除',
        isPublic: false,
        isDefault: true,
        cover: null,
        count: 0,
        order: 0
      }
    })

    created++
    console.log(`✅ 为用户 ${user.username} 创建默认收藏夹`)
  }

  console.log(`\n✨ 初始化完成！`)
  console.log(`   新建：${created} 个默认收藏夹`)
  console.log(`   跳过：${skipped} 个用户（已有默认收藏夹）`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
