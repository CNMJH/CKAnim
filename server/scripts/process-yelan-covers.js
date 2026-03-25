#!/usr/bin/env node

/**
 * 将用户提供的封面图转换为 WebP 并上传到七牛云
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import qiniu from 'qiniu';
import sharp from 'sharp';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 七牛云配置
const accessKey = process.env.QINIU_ACCESS_KEY;
const secretKey = process.env.QINIU_SECRET_KEY;
const bucket = process.env.QINIU_BUCKET;
const domain = process.env.QINIU_DOMAIN;

console.log('七牛云配置:', {
  accessKey: accessKey ? accessKey.substring(0, 10) + '...' : 'MISSING',
  bucket: bucket,
  domain: domain,
});

if (!accessKey || !secretKey || !bucket || !domain) {
  console.error('❌ 缺少七牛云配置');
  process.exit(1);
}

const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);

// 七牛云华南区域上传端点
const QINIU_UPLOAD_URL = 'https://upload-z2.qiniup.com';

// 用户提供的图片路径（本地）
const INPUT_IMAGE = '/home/tenbox/.copaw/media/om_x100b530bf82cf8a8b3b9534b7f07cae_img_v3_02104_10788035-c095-4dfb-ab64-8616e2c66fdg.jpg';

// 数据库文件路径（本地）
const DB_PATH = path.join(__dirname, '../prisma/dev.db');

// 夜兰的 3 个视频信息
const yelanVideos = [
  {
    id: 86,
    title: '三连击',
    qiniuKey: '参考网站 2026/水/game-1/1774359081809-g46hos.mp4',
  },
  {
    id: 87,
    title: '四连击',
    qiniuKey: '参考网站 2026/水/game-1/1774359112790-2hy189.mp4',
  },
  {
    id: 88,
    title: '战技',
    qiniuKey: '参考网站 2026/水/game-1/1774359143801-d84tfc.mp4',
  },
];

/**
 * 生成上传凭证
 */
function getUploadToken(key) {
  const options = {
    scope: key ? `${bucket}:${key}` : bucket,
    expires: 7200,
  };
  const putPolicy = new qiniu.rs.PutPolicy(options);
  return putPolicy.uploadToken(mac);
}

/**
 * 获取文件 URL
 */
function getFileUrl(key) {
  return `${domain}/${key}`;
}

/**
 * 使用 curl 上传文件到七牛云
 */
async function uploadToQiniuCurl(filePath, key) {
  const token = getUploadToken(key);
  
  console.log(`⬆️  上传到七牛云：${key}`);
  
  const { execSync } = await import('child_process');
  const cmd = `curl -X POST ${QINIU_UPLOAD_URL}/ \
    -F token="${token}" \
    -F key="${key}" \
    -F file=@${filePath}`;
  
  try {
    const result = execSync(cmd, { encoding: 'utf8' });
    const url = getFileUrl(key);
    console.log(`✅ 上传成功：${url}`);
    return { key, url };
  } catch (error) {
    console.error('上传失败:', error.message);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始处理封面图\n');
  
  // 检查输入文件
  if (!fs.existsSync(INPUT_IMAGE)) {
    console.error(`❌ 输入文件不存在：${INPUT_IMAGE}`);
    process.exit(1);
  }
  
  const tempDir = path.join(__dirname, 'temp-yelan-covers');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  let successCount = 0;
  
  for (const video of yelanVideos) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`处理视频 #${video.id}: ${video.title}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      const baseKey = video.qiniuKey.replace('.mp4', '-thumbnail');
      const jpgPath = path.join(tempDir, `${path.basename(baseKey)}.jpg`);
      const webpPath = path.join(tempDir, `${path.basename(baseKey)}.webp`);
      
      // 1. 使用 sharp 调整尺寸并保存为 JPG
      console.log('📐 调整尺寸并保存 JPG...');
      await sharp(INPUT_IMAGE)
        .resize(640, 360, { fit: 'fill' })
        .jpeg({ quality: 85 })
        .toFile(jpgPath);
      
      const jpgStats = fs.statSync(jpgPath);
      console.log(`✅ JPG: ${(jpgStats.size / 1024).toFixed(1)} KB`);
      
      // 2. 使用 sharp 转换为 WebP
      console.log('🔄 转换为 WebP...');
      await sharp(INPUT_IMAGE)
        .resize(640, 360, { fit: 'fill' })
        .webp({ quality: 75 })
        .toFile(webpPath);
      
      const webpStats = fs.statSync(webpPath);
      console.log(`✅ WebP: ${(webpStats.size / 1024).toFixed(1)} KB`);
      
      // 3. 上传到七牛云
      const jpgKey = `${baseKey}.jpg`;
      const webpKey = `${baseKey}.webp`;
      
      const [jpgResult, webpResult] = await Promise.all([
        uploadToQiniuCurl(jpgPath, jpgKey),
        uploadToQiniuCurl(webpPath, webpKey),
      ]);
      
      // 4. 更新数据库（本地）
      const updateSql = `UPDATE videos SET coverUrl = '${jpgResult.url}', coverUrlJpg = '${jpgResult.url}', coverUrlWebp = '${webpResult.url}' WHERE id = ${video.id};`;
      console.log(`📝 更新本地数据库`);
      
      const { execSync } = await import('child_process');
      execSync(`sqlite3 "${DB_PATH}" "${updateSql}"`, {
        stdio: 'inherit',
      });
      
      console.log(`✅ 视频 #${video.id} 处理完成`);
      successCount++;
      
      // 5. 清理临时文件
      if (fs.existsSync(jpgPath)) fs.unlinkSync(jpgPath);
      if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath);
      
    } catch (error) {
      console.error(`❌ 视频 #${video.id} 处理失败：${error.message}`);
      console.error(error);
    }
  }
  
  // 清理临时目录
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir, { recursive: true });
      console.log(`\n🗑️  清理临时目录`);
    }
  } catch (err) {
    // 忽略
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 处理结果统计');
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ 成功：${successCount} 个`);
  console.log(`📝 总计：${yelanVideos.length} 个`);
}

// 运行主函数
main().catch((err) => {
  console.error('💥 程序异常退出:', err);
  process.exit(1);
});
