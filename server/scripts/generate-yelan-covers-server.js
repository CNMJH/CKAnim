#!/usr/bin/env node

/**
 * 为夜兰的 3 个视频生成封面图并上传到七牛云（服务器版本）
 */

import { execSync } from 'child_process';
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

// 夜兰的 3 个视频
const yelanVideos = [
  {
    id: 86,
    title: '三连击',
    videoUrl: 'https://video.jiangmeijixie.com/%E5%8F%82%E8%80%83%E7%BD%91%E7%AB%99%202026/%E6%B0%B4/game-1/1774359081809-g46hos.mp4',
    qiniuKey: '参考网站 2026/水/game-1/1774359081809-g46hos.mp4',
  },
  {
    id: 87,
    title: '四连击',
    videoUrl: 'https://video.jiangmeijixie.com/%E5%8F%82%E8%80%83%E7%BD%91%E7%AB%99%202026/%E6%B0%B4/game-1/1774359112790-2hy189.mp4',
    qiniuKey: '参考网站 2026/水/game-1/1774359112790-2hy189.mp4',
  },
  {
    id: 88,
    title: '战技',
    videoUrl: 'https://video.jiangmeijixie.com/%E5%8F%82%E8%80%83%E7%BD%91%E7%AB%99%202026/%E6%B0%B4/game-1/1774359143801-d84tfc.mp4',
    qiniuKey: '参考网站 2026/水/game-1/1774359143801-d84tfc.mp4',
  },
];

// 七牛云华南区域上传端点
const QINIU_UPLOAD_URL = 'https://upload-z2.qiniup.com';

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
 * 下载视频
 */
function downloadVideo(videoUrl, outputPath) {
  console.log(`⬇️  下载视频`);
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  execSync(`curl -fsSL --url "${videoUrl}" -o "${outputPath}"`, {
    stdio: 'pipe',
    timeout: 120000,
  });
  
  const stats = fs.statSync(outputPath);
  console.log(`✅ 下载完成：${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

/**
 * 从视频生成封面图（JPG + WebP）
 */
async function generateThumbnails(videoPath, outputDir) {
  const filename = path.basename(videoPath, path.extname(videoPath));
  const jpgPath = path.join(outputDir, `${filename}-thumbnail.jpg`);
  const webpPath = path.join(outputDir, `${filename}-thumbnail.webp`);
  const tempFrame = path.join(outputDir, `${filename}-temp.jpg`);
  
  console.log(`🎬 生成封面图：${filename}`);
  
  // 1. 截取第 1 秒的帧
  execSync(`ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -y "${tempFrame}"`, {
    stdio: 'pipe',
  });
  
  // 2. 使用 sharp 转换为 JPG 和 WebP
  await Promise.all([
    // 生成 JPG
    sharp(tempFrame)
      .resize(640, 360, { fit: 'fill' })
      .jpeg({ quality: 85 })
      .toFile(jpgPath),
    
    // 生成 WebP
    sharp(tempFrame)
      .resize(640, 360, { fit: 'fill' })
      .webp({ quality: 75 })
      .toFile(webpPath),
  ]);
  
  // 3. 清理临时文件
  if (fs.existsSync(tempFrame)) {
    fs.unlinkSync(tempFrame);
  }
  
  const jpgStats = fs.statSync(jpgPath);
  const webpStats = fs.statSync(webpPath);
  
  console.log(`✅ JPG: ${(jpgStats.size / 1024).toFixed(1)} KB`);
  console.log(`✅ WebP: ${(webpStats.size / 1024).toFixed(1)} KB`);
  
  return { jpg: jpgPath, webp: webpPath };
}

/**
 * 使用 curl 上传文件到七牛云
 */
async function uploadToQiniuCurl(filePath, key) {
  const token = getUploadToken(key);
  
  console.log(`⬆️  上传到七牛云：${key}`);
  
  // 使用 curl 直接上传到七牛云华南区域
  const cmd = `curl -X POST ${QINIU_UPLOAD_URL}/ \
    -F token="${token}" \
    -F key="${key}" \
    -F file=@${filePath}`;
  
  try {
    const result = execSync(cmd, { encoding: 'utf8' });
    console.log('上传响应:', result);
    const url = getFileUrl(key);
    console.log(`✅ 上传成功：${url}`);
    return { key, url };
  } catch (error) {
    console.error('上传失败:', error.message);
    throw error;
  }
}

/**
 * 清理临时文件
 */
function cleanupTempFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  清理：${path.basename(filePath)}`);
    }
  } catch (err) {
    // 忽略
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始为夜兰视频生成封面图\n');
  
  const tempDir = path.join(__dirname, 'temp-yelan-thumbnails');
  let successCount = 0;
  
  for (const video of yelanVideos) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`处理视频 #${video.id}: ${video.title}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      // 1. 下载视频
      const videoPath = path.join(tempDir, path.basename(video.qiniuKey));
      downloadVideo(video.videoUrl, videoPath);
      
      // 2. 生成封面图（JPG + WebP）
      const thumbnailPaths = await generateThumbnails(videoPath, tempDir);
      
      // 3. 上传到七牛云
      const jpgKey = video.qiniuKey.replace('.mp4', '-thumbnail.jpg');
      const webpKey = video.qiniuKey.replace('.mp4', '-thumbnail.webp');
      
      const [jpgResult, webpResult] = await Promise.all([
        uploadToQiniuCurl(thumbnailPaths.jpg, jpgKey),
        uploadToQiniuCurl(thumbnailPaths.webp, webpKey),
      ]);
      
      // 4. 更新数据库
      const updateSql = `UPDATE videos SET coverUrl = '${jpgResult.url}', coverUrlJpg = '${jpgResult.url}', coverUrlWebp = '${webpResult.url}' WHERE id = ${video.id};`;
      console.log(`📝 更新数据库`);
      
      execSync(`sqlite3 prisma/dev.db "${updateSql}"`, {
        stdio: 'inherit',
      });
      
      console.log(`✅ 视频 #${video.id} 处理完成`);
      successCount++;
      
      // 5. 清理临时文件
      cleanupTempFile(videoPath);
      cleanupTempFile(thumbnailPaths.jpg);
      cleanupTempFile(thumbnailPaths.webp);
      
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
