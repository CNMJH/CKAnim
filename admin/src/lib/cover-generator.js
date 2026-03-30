/**
 * 前端视频封面生成工具
 * 
 * 原理：
 * 1. 使用 HTML5 Video 加载视频
 * 2. 跳转到指定时间（如第 1 秒）
 * 3. 使用 Canvas 绘制视频帧
 * 4. 导出为 JPEG 图片
 * 
 * @param {File} file - 视频文件
 * @param {number} time - 截取时间（秒），默认 1 秒
 * @param {number} quality - 图片质量 (0.1-1.0)，默认 0.6（优化后）
 * @returns {Promise<{ blob: Blob, url: string, width: number, height: number }>}
 */
export function generateVideoCover(file, time = 1, quality = 0.6) {
  return new Promise((resolve, reject) => {
    // 1. 创建 Video 元素
    const video = document.createElement('video');
    video.preload = 'metadata'; // 只加载元数据
    video.muted = true; // 静音
    video.playsInline = true; // 移动端不自动全屏
    
    // 2. 创建对象 URL
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    
    // 3. 加载元数据后设置时间
    video.addEventListener('loadedmetadata', () => {
      // 确保时间在视频长度范围内
      const targetTime = Math.min(time, video.duration - 0.1);
      video.currentTime = Math.max(0, targetTime);
    });
    
    // 4. 跳转到指定时间后截取
    video.addEventListener('seeked', () => {
      try {
        // 5. 创建 Canvas
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // 6. 绘制视频帧
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // 7. 导出为 Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }
            
            // 8. 创建预览 URL
            const url = URL.createObjectURL(blob);
            
            // 9. 返回结果
            resolve({
              blob,
              url,
              width: canvas.width,
              height: canvas.height,
              size: blob.size,
              type: blob.type,
            });
            
            // 10. 清理 Video 对象 URL
            URL.revokeObjectURL(objectUrl);
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        reject(error);
      }
    });
    
    // 10. 错误处理
    video.addEventListener('error', (e) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Video load error: ${e.message}`));
    });
    
    // 11. 超时保护（30 秒）
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Timeout: Failed to generate cover'));
    }, 30000);
  });
}

/**
 * 批量生成视频封面（限制并发数）
 * 
 * @param {File[]} files - 视频文件数组
 * @param {number} concurrency - 并发数，默认 3
 * @returns {Promise<Array<{ file: File, cover: Object, error?: Error }>>}
 */
export async function generateCoversBatch(files, concurrency = 3) {
  const results = [];
  const queue = [...files];
  let processing = 0;
  
  return new Promise((resolve) => {
    const processNext = async () => {
      if (queue.length === 0 && processing === 0) {
        resolve(results);
        return;
      }
      
      while (processing < concurrency && queue.length > 0) {
        processing++;
        const item = queue.shift();
        const index = files.indexOf(item);
        
        generateVideoCover(item)
          .then((cover) => {
            results[index] = { file: item, cover };
          })
          .catch((error) => {
            results[index] = { file: item, error };
          })
          .finally(() => {
            processing--;
            processNext();
          });
      }
    };
    
    processNext();
  });
}

/**
 * 压缩封面图（调整尺寸）
 * 
 * @param {Blob} blob - 图片 Blob
 * @param {number} maxWidth - 最大宽度
 * @param {number} maxHeight - 最大高度
 * @returns {Promise<Blob>}
 */
export function resizeCover(blob, maxWidth = 640, maxHeight = 360) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    
    img.onload = () => {
      // 计算缩放比例
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      
      // 创建 Canvas 调整尺寸
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (resizedBlob) => {
          URL.revokeObjectURL(objectUrl);
          resolve(resizedBlob);
        },
        'image/jpeg',
        0.8
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };
    
    img.src = objectUrl;
  });
}

/**
 * 预览封面图（用于上传前确认）
 * 
 * @param {File} file - 视频文件
 * @param {string} containerSelector - 容器选择器
 * @returns {Promise<HTMLImageElement>}
 */
export async function previewCover(file, containerSelector) {
  const { url } = await generateVideoCover(file);
  
  const container = document.querySelector(containerSelector);
  if (!container) throw new Error('Container not found');
  
  const img = document.createElement('img');
  img.src = url;
  img.style.maxWidth = '100%';
  img.style.borderRadius = '8px';
  img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  
  container.innerHTML = '';
  container.appendChild(img);
  
  return img;
}
