import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixGameIconUrls() {
  try {
    console.log('🔍 开始检查游戏图标 URL...');
    
    // 查询所有游戏
    const games = await prisma.game.findMany({
      where: {
        iconUrl: {
          startsWith: 'https://video.jiangmeijixie.com'
        }
      }
    });
    
    console.log(`📊 发现 ${games.length} 个游戏的图标使用 HTTPS`);
    
    if (games.length === 0) {
      console.log('✅ 无需修复，所有图标 URL 已是 HTTP');
      return;
    }
    
    // 批量更新为 HTTP
    let updated = 0;
    for (const game of games) {
      const newUrl = game.iconUrl.replace('https://', 'http://');
      await prisma.game.update({
        where: { id: game.id },
        data: { iconUrl: newUrl }
      });
      updated++;
      console.log(`  ✓ ${game.name}: ${game.iconUrl} → ${newUrl}`);
    }
    
    console.log(`\n✅ 完成！已修复 ${updated} 个游戏图标 URL`);
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixGameIconUrls();
