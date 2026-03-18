import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { getUploadToken, getFileUrl } from './qiniu.js';

/**
 * 从视频生成封面图（截取第 1 帧）
 * @param {string} videoPath - 本地视频文件路径
 * @param {string} outputDir - 输出目录
 * @returns {Promise<string>} - 生成的封面图路径
 */
export async function generateThumbnail(videoPath: string, outputDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const filename = path.basename(videoPath, path.extname(videoPath));
    const outputPath = path.join(outputDir, `${filename}-thumbnail.jpg`);

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:01'], // 截取第 1 秒的帧
        filename: `${filename}-thumbnail.jpg`,
        folder: outputDir,
        size: '640x360', // 缩略图尺寸
      })
      .on('end', () => {
        console.log(`Thumbnail generated: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('Thumbnail generation error:', err);
        reject(err);
      });
  });
}

/**
 * 上传封面图到七牛云
 * @param {string} thumbnailPath - 本地封面图路径
 * @param {string} videoKey - 视频在七牛云的 key（用于生成相似路径）
 * @returns {Promise<{ key: string, url: string }>} - 七牛云 key 和 URL
 */
export async function uploadThumbnailToQiniu(
  thumbnailPath: string,
  videoKey: string
): Promise<{ key: string; url: string }> {
  // 生成封面图的 key（在视频 key 基础上加 thumbnail 前缀）
  const thumbnailKey = videoKey.replace('.mp4', '-thumbnail.jpg');

  // 获取上传凭证
  const token = getUploadToken(thumbnailKey);

  // 读取文件
  const fileContent = fs.readFileSync(thumbnailPath);

  // 使用七牛云 SDK 上传
  const qiniu = await import('qiniu');
  const mac = new qiniu.auth.digest.Mac(
    process.env.QINIU_ACCESS_KEY!,
    process.env.QINIU_SECRET_KEY!
  );

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
          resolve({
            key: thumbnailKey,
            url,
          });
        } else {
          reject(new Error(`Upload failed: ${respInfo.statusCode}`));
        }
      }
    );
  });
}

/**
 * 清理本地临时文件
 * @param {string} filePath - 文件路径
 */
export function cleanupTempFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Cleaned up temp file: ${filePath}`);
    }
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}
