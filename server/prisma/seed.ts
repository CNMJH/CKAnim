import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 创建管理员账户
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      email: 'admin@ckanim.com',
      role: 'admin',
    },
  });

  console.log('✅ Created admin user:', admin.username);

  // 创建示例游戏
  const lol = await prisma.game.upsert({
    where: { name: '英雄联盟' },
    update: {},
    create: {
      name: '英雄联盟',
      description: '英雄联盟游戏动画参考',
      order: 1,
      published: true,
    },
  });

  const genshin = await prisma.game.upsert({
    where: { name: '原神' },
    update: {},
    create: {
      name: '原神',
      description: '原神游戏动画参考',
      order: 2,
      published: true,
    },
  });

  console.log('✅ Created games:', lol.name, genshin.name);

  // 创建英雄联盟分类
  const lolRole = await prisma.gameCategory.create({
    data: {
      name: '职业',
      level: 2,
      gameId: lol.id,
      order: 1,
    },
  });

  await prisma.gameCategory.create({
    data: {
      name: '战士',
      level: 3,
      parentId: lolRole.id,
      order: 1,
    },
  });

  await prisma.gameCategory.create({
    data: {
      name: '法师',
      level: 3,
      parentId: lolRole.id,
      order: 2,
    },
  });

  await prisma.gameCategory.create({
    data: {
      name: '刺客',
      level: 3,
      parentId: lolRole.id,
      order: 3,
    },
  });

  console.log('✅ Created LOL categories');

  // 创建原神分类
  const genshinCombat = await prisma.gameCategory.create({
    data: {
      name: '战斗',
      level: 2,
      gameId: genshin.id,
      order: 1,
    },
  });

  const genshinElement = await prisma.gameCategory.create({
    data: {
      name: '元素职业',
      level: 3,
      parentId: genshinCombat.id,
      order: 1,
    },
  });

  await prisma.gameCategory.create({
    data: {
      name: '火',
      level: 4,
      parentId: genshinElement.id,
      order: 1,
    },
  });

  await prisma.gameCategory.create({
    data: {
      name: '冰',
      level: 4,
      parentId: genshinElement.id,
      order: 2,
    },
  });

  await prisma.gameCategory.create({
    data: {
      name: '风',
      level: 4,
      parentId: genshinElement.id,
      order: 3,
    },
  });

  console.log('✅ Created Genshin categories');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
