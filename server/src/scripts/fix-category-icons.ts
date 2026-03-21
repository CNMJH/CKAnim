import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCategoryIcons() {
  try {
    console.log('🔍 检查游戏分类图标...');
    
    const categories = await prisma.gameCategory.findMany({
      where: { iconUrl: { startsWith: 'https://' } }
    });
    
    console.log(`📊 发现 ${categories.length} 个分类图标使用 HTTPS`);
    
    if (categories.length === 0) {
      console.log('✅ 无需修复');
      return;
    }
    
    for (const cat of categories) {
      const newUrl = cat.iconUrl.replace('https://', 'http://');
      await prisma.gameCategory.update({
        where: { id: cat.id },
        data: { iconUrl: newUrl }
      });
      console.log(`  ✓ ID ${cat.id}: ${newUrl}`);
    }
    
    console.log(`\n✅ 完成！已修复 ${categories.length} 个分类图标`);
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixCategoryIcons();
