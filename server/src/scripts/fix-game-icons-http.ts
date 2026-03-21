import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixGameIconUrls() {
  try {
    console.log('🔍 查询所有使用 HTTPS 的游戏图标...');
    
    const games = await prisma.game.findMany({
      where: {
        iconUrl: {
          startsWith: 'https://video.jiangmeijixie.com'
        }
      }
    });
    
    console.log(`找到 ${games.length} 个游戏图标使用 HTTPS`);
    
    if (games.length === 0) {
      console.log('✅ 无需修复，所有游戏图标已经是 HTTP');
      return;
    }
    
    console.log('\n📝 待修复的游戏:');
    games.forEach(game => {
      console.log(`  - ${game.name}: ${game.iconUrl}`);
    });
    
    console.log('\n🔧 开始修复...\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const game of games) {
      try {
        const newUrl = game.iconUrl.replace('https://', 'http://');
        
        await prisma.game.update({
          where: { id: game.id },
          data: { iconUrl: newUrl }
        });
        
        console.log(`✅ ${game.name}: ${game.iconUrl} → ${newUrl}`);
        successCount++;
      } catch (err) {
        console.error(`❌ ${game.name} 修复失败:`, err);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 修复完成统计:');
    console.log(`  ✅ 成功：${successCount} 个`);
    console.log(`  ❌ 失败：${errorCount} 个`);
    console.log(`  📦 总计：${games.length} 个`);
    console.log('='.repeat(50));
    
  } catch (err) {
    console.error('❌ 修复过程出错:', err);
  } finally {
    await prisma.$disconnect();
  }
}

fixGameIconUrls();
