import { prisma } from './src/lib/db.js';

async function updateActionName() {
  try {
    await prisma.action.update({
      where: { id: 13 },
      data: { name: '潘森 Q 技能测试' }
    });
    console.log('✅ 动作名称已修改为：潘森 Q 技能测试');
  } catch (error) {
    console.error('❌ 修改失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateActionName();
