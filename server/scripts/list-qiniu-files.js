#!/usr/bin/env node

/**
 * 列出七牛云 bucket 中的文件
 */

import dotenv from 'dotenv';
import qiniu from 'qiniu';

dotenv.config();

const accessKey = process.env.QINIU_ACCESS_KEY;
const secretKey = process.env.QINIU_SECRET_KEY;
const bucket = process.env.QINIU_BUCKET;

console.log('七牛云配置:', {
  accessKey: accessKey ? accessKey.substring(0, 10) + '...' : 'MISSING',
  bucket: bucket,
});

const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);

// 列出文件
const bucketManager = new qiniu.rs.BucketManager(mac, {});

bucketManager.listPrefix(bucket, {
  prefix: '参考网站 2026/水/game-1/1774359',
  limit: 20,
}, (err, respBody, respInfo) => {
  if (err) {
    console.error('❌ 查询失败:', err);
    return;
  }
  
  if (respInfo.statusCode === 200) {
    console.log('\n📁 找到的文件:');
    respBody.items.forEach((item) => {
      const size = (item.fsize / 1024).toFixed(1);
      console.log(`  - ${item.key} (${size} KB)`);
    });
    console.log('\n✅ 查询完成');
  } else {
    console.error('❌ HTTP 状态码:', respInfo.statusCode);
    console.error('响应:', respBody);
  }
});
