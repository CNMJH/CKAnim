import { prisma } from '../lib/db.js';

async function fixVideoUrls() {
  try {
    const oldUrl = 'https://video.jiangmeijixie.com';
    const newUrl = 'http://video.jiangmeijixie.com';
    
    // 获取所有视频
    const videos = await prisma.video.findMany();
    
    let updatedQiniu = 0;
    let updatedCover = 0;
    
    for (const video of videos) {
      const updates: any = {};
      
      if (video.qiniuUrl && video.qiniuUrl.startsWith(oldUrl)) {
        updates.qiniuUrl = video.qiniuUrl.replace(oldUrl, newUrl);
      }
      
      if (video.coverUrl && video.coverUrl.startsWith(oldUrl)) {
        updates.coverUrl = video.coverUrl.replace(oldUrl, newUrl);
      }
      
      if (Object.keys(updates).length > 0) {
        await prisma.video.update({
          where: { id: video.id },
          data: updates,
        });
        if (updates.qiniuUrl) updatedQiniu++;
        if (updates.coverUrl) updatedCover++;
      }
    }
    
    console.log(`✅ 更新完成：qiniuUrl ${updatedQiniu} 条，coverUrl ${updatedCover} 条`);
    process.exit(0);
  } catch (error) {
    console.error('❌ 更新失败:', error);
    process.exit(1);
  }
}

fixVideoUrls();
