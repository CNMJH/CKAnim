import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAllHttpsUrls() {
  try {
    console.log('🔍 开始检查所有 HTTPS URL...\n');
    
    // 1. 修复游戏图标
    console.log('📁 游戏图标...');
    const games = await prisma.game.findMany({
      where: { iconUrl: { startsWith: 'https://' } }
    });
    for (const game of games) {
      await prisma.game.update({
        where: { id: game.id },
        data: { iconUrl: game.iconUrl.replace('https://', 'http://') }
      });
      console.log(`  ✓ ${game.name}: ${game.iconUrl}`);
    }
    console.log(`  已修复 ${games.length} 个\n`);
    
    // 2. 修复角色头像
    console.log('👤 角色头像...');
    const characters = await prisma.character.findMany({
      where: { avatar: { startsWith: 'https://' } }
    });
    for (const char of characters) {
      await prisma.character.update({
        where: { id: char.id },
        data: { avatar: char.avatar.replace('https://', 'http://') }
      });
      console.log(`  ✓ ${char.name}: ${char.avatar}`);
    }
    console.log(`  已修复 ${characters.length} 个\n`);
    
    // 3. 修复视频 URL
    console.log('🎬 视频 URL...');
    const videos = await prisma.video.findMany({
      where: { qiniuUrl: { startsWith: 'https://' } }
    });
    for (const video of videos) {
      await prisma.video.update({
        where: { id: video.id },
        data: { qiniuUrl: video.qiniuUrl.replace('https://', 'http://') }
      });
      console.log(`  ✓ ${video.title}: ${video.qiniuUrl}`);
    }
    console.log(`  已修复 ${videos.length} 个\n`);
    
    console.log('✅ 全部修复完成！');
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllHttpsUrls();
