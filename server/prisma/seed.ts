import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始创建测试数据...');

  // 1. 创建管理员账户
  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: '$2b$10$rH9zqX8FQJN7jKZVqGzQYO8vL5K3xN2mP4wR6tY8uI0oP2sA4cD6e', // admin123
      email: 'admin@example.com',
      role: 'admin',
    },
  });
  console.log('✅ 管理员账户：admin / admin123');

  // 2. 创建游戏
  const game1 = await prisma.game.upsert({
    where: { name: '英雄联盟' },
    update: {},
    create: {
      name: '英雄联盟',
      description: '英雄联盟游戏动画参考',
      order: 1,
      published: true,
    },
  });
  console.log(`✅ 游戏：${game1.name} (ID: ${game1.id})`);

  // 3. 创建动作
  const action1 = await prisma.action.create({
    data: {
      name: '攻击',
      code: 'attack',
      description: '普通攻击动作',
      order: 1,
      published: true,
    },
  });
  const action2 = await prisma.action.create({
    data: {
      name: '走位',
      code: 'walk',
      description: '移动走位动作',
      order: 2,
      published: true,
    },
  });
  const action3 = await prisma.action.create({
    data: {
      name: '技能',
      code: 'skill',
      description: '技能释放动作',
      order: 3,
      published: true,
    },
  });
  const action4 = await prisma.action.create({
    data: {
      name: '大招',
      code: 'ult',
      description: '终极技能',
      order: 4,
      published: true,
    },
  });
  const actions = [action1, action2, action3, action4];
  console.log(`✅ 动作：${actions.map(a => a.name).join(', ')}`);

  console.log('\n 测试数据创建完成！');
  console.log('\n📋 下一步操作：');
  console.log('1. 访问 http://localhost:3003 登录管理后台');
  console.log('2. 创建角色（角色管理页面）');
  console.log('3. 上传视频时选择角色和动作');
  console.log('4. 访问 http://localhost:5173/games 查看前台效果');
}

main()
  .catch((e) => {
    console.error('❌ 创建测试数据失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
