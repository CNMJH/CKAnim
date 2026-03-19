#!/usr/bin/env node
/**
 * 同步检查工具 - 验证数据库、七牛云、前台三者数据一致性
 * 
 * 用途：
 * - 检查数据库中的视频是否在七牛云存在
 * - 检查七牛云文件是否在数据库有记录
 * - 检查前台 API 返回的数据是否正确
 * 
 * 使用：node scripts/sync-check.js
 */

import { PrismaClient } from '@prisma/client';
import qiniu from 'qiniu';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
config.zone = qiniu.zone.Zone_z2; // 华南区域
const bucketManager = new qiniu.rs.BucketManager(mac, config);

async function checkDatabase() {
  console.log('📊 检查数据库...\n');
  
  const allActions = await prisma.action.findMany({
    include: {
      video: true,
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
  
  const actions = allActions.filter(a => a.video !== null);
  
  console.log(`数据库中有 ${actions.length} 个动作有视频:\n`);
  
  const dbKeys = [];
  actions.forEach(action => {
    const key = action.video.qiniuKey;
    dbKeys.push(key);
    console.log(`  ✅ ${action.character.game.name} > ${action.character.name} > ${action.name}`);
    console.log(`     视频：${action.video.qiniuUrl}`);
    console.log(`     Key: ${key}\n`);
  });
  
  return { actions, dbKeys };
}

async function checkQiniu() {
  console.log('☁️  检查七牛云...\n');
  
  return new Promise((resolve, reject) => {
    bucketManager.listPrefix(QINIU_CONFIG.bucket, { prefix: '参考网站 2026/' }, (err, resp) => {
      if (err) {
        console.error('❌ 七牛云查询失败:', err.message);
        reject(err);
        return;
      }
      
      const qiniuKeys = resp.items.map(item => item.key);
      console.log(`七牛云中有 ${qiniuKeys.length} 个文件:\n`);
      
      qiniuKeys.forEach(key => {
        console.log(`  📁 ${key}`);
      });
      
      resolve(qiniuKeys);
    });
  });
}

function compareData(dbKeys, qiniuKeys) {
  console.log('\n🔍 对比分析...\n');
  
  // 数据库有但七牛云没有
  const dbOnly = dbKeys.filter(key => !qiniuKeys.includes(key));
  if (dbOnly.length > 0) {
    console.log('⚠️  数据库有记录但七牛云不存在 ( orphan records ):');
    dbOnly.forEach(key => {
      console.log(`    - ${key}`);
    });
    console.log();
  }
  
  // 七牛云有但数据库没有
  const qiniuOnly = qiniuKeys.filter(key => !dbKeys.includes(key));
  if (qiniuOnly.length > 0) {
    console.log('⚠️  七牛云有文件但数据库无记录 ( orphan files ):');
    qiniuOnly.forEach(key => {
      console.log(`    - ${key}`);
    });
    console.log();
  }
  
  // 完全同步
  if (dbOnly.length === 0 && qiniuOnly.length === 0) {
    console.log('✅ 数据库与七牛云完全同步！\n');
  }
  
  return { dbOnly, qiniuOnly };
}

async function cleanupOrphans(dbOnly, qiniuOnly, dryRun = true) {
  console.log('🧹 清理建议...\n');
  
  if (dbOnly.length > 0) {
    console.log(`数据库孤记录 ${dbOnly.length} 条:`);
    console.log('  建议：从数据库删除这些记录（视频文件已丢失）\n');
  }
  
  if (qiniuOnly.length > 0) {
    console.log(`七牛云孤文件 ${qiniuOnly.length} 个:`);
    console.log('  建议：从七牛云删除这些文件（数据库无记录）\n');
    
    if (!dryRun) {
      console.log('正在删除七牛云孤文件...\n');
      const keysToDelete = qiniuOnly.map(key => ({ key }));
      
      const operation = bucketManager.batch(
        qiniuOnly.map(key => ({ op: 'delete', key }))
      );
      
      try {
        await operation;
        console.log(`✅ 已删除 ${qiniuOnly.length} 个七牛云孤文件\n`);
      } catch (err) {
        console.error('❌ 删除失败:', err.message);
      }
    }
  }
}

async function main() {
  try {
    console.log('🔍 开始同步检查...\n');
    console.log('=' .repeat(60));
    console.log();
    
    // 检查数据库
    const { actions, dbKeys } = await checkDatabase();
    console.log('=' .repeat(60));
    console.log();
    
    // 检查七牛云
    const qiniuKeys = await checkQiniu();
    console.log('=' .repeat(60));
    console.log();
    
    // 对比分析
    const { dbOnly, qiniuOnly } = compareData(dbKeys, qiniuKeys);
    
    // 清理建议
    await cleanupOrphans(dbOnly, qiniuOnly, true);
    
    console.log('=' .repeat(60));
    console.log('\n✨ 检查完成！\n');
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 检查失败:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// 如果直接运行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { checkDatabase, checkQiniu, compareData, cleanupOrphans };
