#!/usr/bin/env node

/**
 * 将七牛云上现有的 JPG 封面图转换为 WebP 格式
 * 使用七牛云的图片处理接口，无需下载再上传
 * 直接使用 SQL 查询，避免 Prisma 客户端缓存问题
 */

import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../prisma/dev.db');
const QINIU_DOMAIN = process.env.QINIU_DOMAIN || 'https://video.jiangmeijixie.com';

/**
 * 使用七牛云图片处理 API 转换 JPG 为 WebP
 */
function getWebpUrl(jpgUrl) {
  return jpgUrl.replace('.jpg', '.webp?imageMogr2/format/webp/quality/75');
}

async function main() {
  console.log('🚀 开始将封面图转换为 WebP 格式\n');
  
  const db = new sqlite3.Database(DB_PATH);
  const dbAll = promisify(db.all).bind(db);
  const dbRun = promisify(db.run).bind(db);
  
  // 查询所有有 coverUrl 但没有 coverUrlWebp 的视频
  const videos = await dbAll(`
    SELECT id, title, coverUrl, qiniuKey 
    FROM videos 
    WHERE coverUrl IS NOT NULL 
      AND coverUrl != '' 
      AND (coverUrlWebp IS NULL OR coverUrlWebp = '')
  `);
  
  console.log(`📊 找到 ${videos.length} 个视频需要转换封面为 WebP\n`);
  
  if (videos.length === 0) {
    console.log('✅ 所有视频已有 WebP 封面图');
    db.close();
    return;
  }
  
  let successCount = 0;
  let failCount = 0;
  
  for (const video of videos) {
    console.log(`处理视频 #${video.id}: ${video.title}`);
    
    try {
      // 生成 WebP URL
      const webpUrl = getWebpUrl(video.coverUrl);
      
      console.log(`  JPG: ${video.coverUrl}`);
      console.log(`  WebP: ${webpUrl}`);
      
      // 更新数据库
      await dbRun(
        'UPDATE videos SET coverUrlWebp = ? WHERE id = ?',
        [webpUrl, video.id]
      );
      
      console.log(`  ✅ 更新成功\n`);
      successCount++;
      
    } catch (error) {
      console.error(`  ❌ 更新失败：${error.message}\n`);
      failCount++;
    }
  }
  
  console.log('='.repeat(60));
  console.log('📊 处理结果统计');
  console.log('='.repeat(60));
  console.log(`✅ 成功：${successCount} 个`);
  console.log(`❌ 失败：${failCount} 个`);
  console.log(`📝 总计：${videos.length} 个`);
  
  db.close();
}

main().catch((err) => {
  console.error('💥 程序异常退出:', err);
  process.exit(1);
});
