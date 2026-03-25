#!/usr/bin/env node

/**
 * 使用七牛云视频截帧 API 生成封面图
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const QINIU_DOMAIN = process.env.QINIU_DOMAIN || 'https://video.jiangmeijixie.com';

/**
 * 七牛云视频截帧 URL 生成
 * 使用 videoSample 接口截取第 1 秒的帧作为封面
 * 格式：https://domain/videoKey?videoSample/offset/1s/imageMogr2/thumbnail/640x360
 */
function generateCoverUrl(videoKey) {
  // 将 .mp4 替换为 -thumbnail.jpg，并添加截帧参数
  const baseKey = videoKey.replace('.mp4', '-thumbnail.jpg');
  
  // 使用七牛云的视频截帧 + 图片处理
  // videoSample/offset/1s - 截取第 1 秒
  // imageMogr2/thumbnail/640x360 - 缩放到 640x360
  return `${QINIU_DOMAIN}/${videoKey}?videoSample/offset/1s/imageMogr2/thumbnail/640x360/format/jpg`;
}

async function main() {
  console.log('🚀 开始生成缺失的封面图 URL\n');
  
  // 查询没有封面的视频
  const videosWithoutCover = await prisma.video.findMany({
    where: {
      OR: [
        { coverUrl: null },
        { coverUrl: '' },
      ],
    },
    select: {
      id: true,
      title: true,
      qiniuKey: true,
      qiniuUrl: true,
    },
  });
  
  console.log(`📊 找到 ${videosWithoutCover.length} 个视频需要生成封面\n`);
  
  if (videosWithoutCover.length === 0) {
    console.log('✅ 所有视频已有封面图');
    return;
  }
  
  let successCount = 0;
  
  for (const video of videosWithoutCover) {
    console.log(`处理视频 #${video.id}: ${video.title}`);
    
    try {
      // 生成封面图 URL
      const coverUrl = generateCoverUrl(video.qiniuKey);
      
      console.log(`  视频 URL: ${video.qiniuUrl}`);
      console.log(`  封面 URL: ${coverUrl}`);
      
      // 更新数据库
      await prisma.video.update({
        where: { id: video.id },
        data: { coverUrl },
      });
      
      console.log(`  ✅ 更新成功\n`);
      successCount++;
      
    } catch (error) {
      console.error(`  ❌ 更新失败：${error.message}\n`);
    }
  }
  
  console.log('='.repeat(60));
  console.log('📊 处理结果统计');
  console.log('='.repeat(60));
  console.log(`✅ 成功：${successCount} 个`);
  console.log(`📝 总计：${videosWithoutCover.length} 个`);
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('💥 程序异常退出:', err);
  process.exit(1);
});
