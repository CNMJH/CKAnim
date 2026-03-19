#!/usr/bin/env node
/**
 * 清理没有视频的动作
 * 
 * 用途：
 * - 删除所有没有关联视频的动作
 * - 保持数据库整洁
 * - 前台只显示有视频的动作
 * 
 * 使用：node scripts/cleanup-actions-without-video.js
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanupActionsWithoutVideo() {
  try {
    console.log('🔍 查找没有视频的动作...\n');
    
    // 查找没有视频的动作
    const actionsWithoutVideo = await prisma.action.findMany({
      where: {
        video: null,
      },
      include: {
        character: {
          select: {
            name: true,
            game: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    
    if (actionsWithoutVideo.length === 0) {
      console.log('✅ 数据库整洁，没有需要清理的动作');
      return 0;
    }
    
    console.log(`📋 找到 ${actionsWithoutVideo.length} 个没有视频的动作:\n`);
    
    // 按角色分组显示
    const grouped = {};
    actionsWithoutVideo.forEach(action => {
      const key = `${action.character.game.name} > ${action.character.name}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(action.name);
    });
    
    Object.entries(grouped).forEach(([path, names]) => {
      console.log(`  ${path}:`);
      names.forEach(name => {
        console.log(`    - ${name}`);
      });
    });
    
    console.log('\n🗑️  正在删除...\n');
    
    // 删除没有视频的动作
    const result = await prisma.action.deleteMany({
      where: {
        video: null,
      },
    });
    
    console.log(`✅ 已删除 ${result.count} 个动作\n`);
    console.log('✨ 清理完成！\n');
    
    return result.count;
  } catch (error) {
    console.error('❌ 清理失败:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupActionsWithoutVideo()
    .then(count => {
      console.log(`清理了 ${count} 个动作`);
      process.exit(0);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { cleanupActionsWithoutVideo };
