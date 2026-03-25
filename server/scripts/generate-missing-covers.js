#!/usr/bin/env node

/**
 * 为没有封面图的视频生成封面
 */

import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import qiniu from 'qiniu';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// 七牛云配置
const accessKey = process.env.QINIU_ACCESS_KEY;
const secretKey = process.env.QINIU_SECRET_KEY;
const bucket = process.env.QINIU_BUCKET;
const domain = process.env.QINIU_DOMAIN;

if (!accessKey || !secretKey || !bucket || !domain) {
  console.error('❌ 缺少七牛云配置');
  process.exit(1);
}

const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);

/**
 * 生成上传凭证
 */
function getUploadToken(key) {
  const options = {
    scope: key ? `${bucket}:${key}` : bucket,
    expires: 7200,
    zone: qiniu.zone.Zone_z2,
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
 * 下载视频到本地
 */
async function downloadVideo(videoUrl, outputPath) {
  const { execSync } = await import('child_process');
  
  // 确保目录存在
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  console.log(`⬇️  下载视频：${videoUrl}`);
  execSync(`curl -fsSL "${videoUrl}" -o "${outputPath}"`, {
    stdio: 'pipe',
    timeout: 60000, // 60 秒超时
  });
  
  const stats = fs.statSync(outputPath);
  console.log(`✅ 下载完成：${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

/**
 * 生成封面图
 */
async function generateThumbnail(videoPath, outputDir) {
  return new Promise((resolve, reject) => {
    const filename = path.basename(videoPath, path.extname(videoPath));
    const outputPath = path.join(outputDir, `${filename}-thumbnail.jpg`);
    
    console.log(`🎬 生成封面：${outputPath}`);
    
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:01'],
        filename: `${filename}-thumbnail.jpg`,
        folder: outputDir,
        size: '640x360',
      })
      .on('end', () => {
        console.log(`✅ 封面生成成功`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(`❌ 封面生成失败：${err.message}`);
        reject(err);
      });
  });
}

/**
 * 上传封面到七牛云
 */
async function uploadThumbnail(thumbnailPath, videoKey) {
  const thumbnailKey = videoKey.replace('.mp4', '-thumbnail.jpg');
  const token = getUploadToken(thumbnailKey);
  const fileContent = fs.readFileSync(thumbnailPath);
  
  console.log(`⬆️  上传封面到七牛云：${thumbnailKey}`);
  
  const formUploader = new qiniu.form_up.FormUploader();
  const putExtra = new qiniu.form_up.PutExtra();
  
  return new Promise((resolve, reject) => {
    formUploader.put(
      token,
      thumbnailKey,
      fileContent,
      putExtra,
      (respErr, respBody, respInfo) => {
        if (respErr) {
          reject(respErr);
        } else if (respInfo.statusCode === 200) {
          const url = getFileUrl(thumbnailKey);
          console.log(`✅ 上传成功：${url}`);
          resolve({ key: thumbnailKey, url });
        } else {
          reject(new Error(`上传失败：${respInfo.statusCode}`));
        }
      }
    );
  });
}

/**
 * 清理临时文件
 */
function cleanupTempFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  清理临时文件：${filePath}`);
    }
  } catch (err) {
    console.error(`清理文件失败：${err.message}`);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始生成缺失的封面图\n');
  
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
  
  const tempDir = path.join(__dirname, 'temp-thumbnails');
  let successCount = 0;
  let failCount = 0;
  
  for (const video of videosWithoutCover) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`处理视频 #${video.id}: ${video.title}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      // 1. 下载视频
      const videoPath = path.join(tempDir, path.basename(video.qiniuKey));
      await downloadVideo(video.qiniuUrl, videoPath);
      
      // 2. 生成封面
      const thumbnailPath = await generateThumbnail(videoPath, tempDir);
      
      // 3. 上传封面
      const result = await uploadThumbnail(thumbnailPath, video.qiniuKey);
      
      // 4. 更新数据库
      await prisma.video.update({
        where: { id: video.id },
        data: { coverUrl: result.url },
      });
      
      console.log(`✅ 视频 #${video.id} 处理完成`);
      successCount++;
      
      // 5. 清理临时文件
      cleanupTempFile(videoPath);
      cleanupTempFile(thumbnailPath);
      
    } catch (error) {
      console.error(`❌ 视频 #${video.id} 处理失败：${error.message}`);
      failCount++;
    }
  }
  
  // 清理临时目录
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir, { recursive: true });
      console.log(`\n🗑️  清理临时目录：${tempDir}`);
    }
  } catch (err) {
    // 忽略
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 处理结果统计');
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ 成功：${successCount} 个`);
  console.log(`❌ 失败：${failCount} 个`);
  console.log(`📝 总计：${videosWithoutCover.length} 个`);
  
  await prisma.$disconnect();
}

// 运行主函数
main().catch((err) => {
  console.error('💥 程序异常退出:', err);
  process.exit(1);
});
