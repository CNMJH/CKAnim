#!/usr/bin/env node
/**
 * 清理七牛云孤文件 - 数据库无记录的文件
 * 
 * 用途：
 * - 清理七牛云中数据库无记录的文件
 * - 保持七牛云与数据库同步
 * 
 * 使用：node scripts/cleanup-qiniu-orphans.js [--dry-run]
 */

import { PrismaClient } from '@prisma/client';
import qiniu from 'qiniu';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// 七牛云配置
const QINIU_CONFIG = {
  accessKey: process.env.QINIU_ACCESS_KEY || 'DwLK5ft-Zx0XgxiI8HaIyeUh0wyaHddssczs2s0c',
  secretKey: process.env.QINIU_SECRET_KEY || '14ykOp2Q-nkbLmSfZdd2aHmoEnZUHqWxk1BeFN2-',
  bucket: process.env.QINIU_BUCKET || 'zhuque-guangdong',
  domain: process.env.QINIU_DOMAIN || 'https://video.jiangmeijixie.com',
};

// 创建七牛云管理器
const mac = new qiniu.auth.digest.Mac(QINIU_CONFIG.accessKey, QINIU_CONFIG.secretKey);
const config = new qiniu.conf.Config();
config.zone = qiniu.zone.Zone_z2;
const bucketManager = new qiniu.rs.BucketManager(mac, config);

async function getDatabaseKeys() {
  const allActions = await prisma.action.findMany({
    include: { video: true },
  });
  
  const actionsWithVideo = allActions.filter(a => a.video !== null);
  const dbKeys = actionsWithVideo.map(a => a.video.qiniuKey);
  
  // 也获取所有视频的封面图
  const coverKeys = actionsWithVideo
    .filter(a => a.video?.coverUrl)
    .map(a => {
      const url = a.video.coverUrl;
      return url.replace(QINIU_CONFIG.domain + '/', '');
    });
  
  return [...dbKeys, ...coverKeys];
}

async function getQiniuKeys() {
  return new Promise((resolve, reject) => {
    bucketManager.listPrefix(QINIU_CONFIG.bucket, { prefix: '参考网站 2026/' }, (err, resp) => {
      if (err) reject(err);
      else resolve(resp.items.map(item => item.key));
    });
  });
}

async function cleanupQiniu(orphanKeys, dryRun = true) {
  console.log(`\n🗑️  清理 ${orphanKeys.length} 个七牛云孤文件...\n`);
  
  if (dryRun) {
    console.log(' 预览模式（未实际删除）:\n');
    orphanKeys.forEach(key => {
      console.log(`  - ${key}`);
    });
    console.log('\n💡 使用 --no-dry-run 参数实际删除\n');
    return;
  }
  
  // 逐个删除（批量 API 有问题）
  let successCount = 0;
  let failCount = 0;
  
  for (const key of orphanKeys) {
    try {
      await new Promise((resolve, reject) => {
        bucketManager.delete(QINIU_CONFIG.bucket, key, (err, resp) => {
          if (err) reject(err);
          else resolve(resp);
        });
      });
      console.log(`  ✅ ${key}`);
      successCount++;
    } catch (err) {
      console.error(`  ❌ ${key}: ${err.message}`);
      failCount++;
    }
  }
  
  console.log(`\n✅ 成功删除 ${successCount} 个文件`);
  if (failCount > 0) {
    console.log(`⚠️  失败 ${failCount} 个文件`);
  }
  console.log();
}

async function main() {
  try {
    const dryRun = !process.argv.includes('--no-dry-run');
    
    console.log('🔍 开始清理七牛云孤文件...\n');
    console.log('=' .repeat(60));
    
    // 获取数据库记录
    const dbKeys = await getDatabaseKeys();
    console.log(`📊 数据库中有 ${dbKeys.length} 个文件记录\n`);
    
    // 获取七牛云文件
    const qiniuKeys = await getQiniuKeys();
    console.log(`☁️  七牛云中有 ${qiniuKeys.length} 个文件\n`);
    
    // 找出孤文件
    const orphanKeys = qiniuKeys.filter(key => !dbKeys.includes(key));
    
    if (orphanKeys.length === 0) {
      console.log('\n✅ 七牛云与数据库完全同步！\n');
      await prisma.$disconnect();
      process.exit(0);
    }
    
    console.log(`⚠️  发现 ${orphanKeys.length} 个孤文件:\n`);
    
    // 清理
    await cleanupQiniu(orphanKeys, dryRun);
    
    console.log('=' .repeat(60));
    console.log('\n✨ 清理完成！\n');
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 清理失败:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
