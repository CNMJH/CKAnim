import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { getUploadToken, getFileUrl } from './qiniu.js';

/**
 * 从视频生成封面图（截取第 1 秒）
 * 同时生成 JPG 和 WebP 两种格式
 * @param {string} videoPath - 本地视频文件路径
 * @param {string} outputDir - 输出目录
 * @returns {Promise<{ jpg: string, webp: string }>} - 生成的封面图路径
 */
export async function generateThumbnail(videoPath: string, outputDir: string): Promise<{ jpg: string; webp: string }> {
  return new Promise((resolve, reject) => {
    const filename = path.basename(videoPath, path.extname(videoPath));
    const jpgPath = path.join(outputDir, `${filename}-thumbnail.jpg`);
    const webpPath = path.join(outputDir, `${filename}-thumbnail.webp`);

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 先截取一帧保存为临时文件
    const tempFrame = path.join(outputDir, `${filename}-temp.jpg`);
    
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:01'], // 截取第 1 秒的帧
        filename: `${filename}-temp.jpg`,
        folder: outputDir,
        size: '640x360', // 缩略图尺寸
      })
      .on('end', async () => {
        try {
          // 使用 ffmpeg 转换为 JPG 和 WebP
          await Promise.all([
            // 生成 JPG（高质量）
            new Promise<void>((resolveJpg, rejectJpg) => {
              ffmpeg(tempFrame)
                .outputOptions(['-q:v 2']) // 高质量 JPEG
                .save(jpgPath)
                .on('end', () => resolveJpg())
                .on('error', rejectJpg);
            }),
            // 生成 WebP（高压缩）
            new Promise<void>((resolveWebp, rejectWebp) => {
              ffmpeg(tempFrame)
                .outputOptions(['-c:v libwebp', '-q:v 75', '-lossless 0']) // WebP 格式，质量 75%
                .save(webpPath)
                .on('end', () => resolveWebp())
                .on('error', rejectWebp);
            })
          ]);
          
          // 清理临时文件
          if (fs.existsSync(tempFrame)) {
            fs.unlinkSync(tempFrame);
          }
          
          console.log(`Thumbnails generated: ${jpgPath}, ${webpPath}`);
          resolve({ jpg: jpgPath, webp: webpPath });
        } catch (err) {
          reject(err);
        }
      })
      .on('error', (err) => {
        console.error('Thumbnail generation error:', err);
        reject(err);
      });
  });
}

/**
 * 上传封面图到七牛云（JPG + WebP）
 * @param {string} thumbnailPaths - 封面图路径 { jpg, webp }
 * @param {string} videoKey - 视频在七牛云的 key（用于生成相似路径）
 * @returns {Promise<{ jpg: { key, url }, webp: { key, url } }>} - 七牛云 key 和 URL
 */
export async function uploadThumbnailToQiniu(
  thumbnailPaths: { jpg: string; webp: string },
  videoKey: string
): Promise<{ jpg: { key: string; url: string }; webp: { key: string; url: string } }> {
  const qiniu = await import('qiniu');
  const mac = new qiniu.auth.digest.Mac(
    process.env.QINIU_ACCESS_KEY!,
    process.env.QINIU_SECRET_KEY!
  );

  // 生成 JPG 和 WebP 的 key
  const jpgKey = videoKey.replace('.mp4', '-thumbnail.jpg');
  const webpKey = videoKey.replace('.mp4', '-thumbnail.webp');

  // 获取上传凭证
  const jpgToken = getUploadToken(jpgKey);
  const webpToken = getUploadToken(webpKey);

  // 读取文件
  const jpgContent = fs.readFileSync(thumbnailPaths.jpg);
  const webpContent = fs.readFileSync(thumbnailPaths.webp);

  const formUploader = new qiniu.form_up.FormUploader();
  const putExtra = new qiniu.form_up.PutExtra();

  // 并行上传两种格式
  const [jpgResult, webpResult] = await Promise.all([
    new Promise<{ key: string; url: string }>((resolve, reject) => {
      formUploader.put(
        jpgToken,
        jpgKey,
        jpgContent,
        putExtra,
        (respErr, respBody, respInfo) => {
          if (respErr) {
            reject(respErr);
          } else if (respInfo.statusCode === 200) {
            resolve({ key: jpgKey, url: getFileUrl(jpgKey) });
          } else {
            reject(new Error(`JPG upload failed: ${respInfo.statusCode}`));
          }
        }
      );
    }),
    new Promise<{ key: string; url: string }>((resolve, reject) => {
      formUploader.put(
        webpToken,
        webpKey,
        webpContent,
        putExtra,
        (respErr, respBody, respInfo) => {
          if (respErr) {
            reject(respErr);
          } else if (respInfo.statusCode === 200) {
            resolve({ key: webpKey, url: getFileUrl(webpKey) });
          } else {
            reject(new Error(`WebP upload failed: ${respInfo.statusCode}`));
          }
        }
      );
    })
  ]);

  return { jpg: jpgResult, webp: webpResult };
}

/**
 * 从 URL 生成 WebP 格式封面图（使用七牛云图片处理）
 * @param {string} jpgUrl - JPG 封面图 URL
 * @returns {string} - WebP 封面图 URL
 */
export function generateWebpCoverUrl(jpgUrl: string): string {
  return `${jpgUrl}?imageMogr2/format/webp/quality/75`;
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
