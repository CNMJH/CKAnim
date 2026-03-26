import qiniu from 'qiniu';
import dotenv from 'dotenv';

dotenv.config();

const accessKey = process.env.QINIU_ACCESS_KEY;
const secretKey = process.env.QINIU_SECRET_KEY;
const bucket = process.env.QINIU_BUCKET;
const domain = process.env.QINIU_DOMAIN;
const prefix = process.env.QINIU_PREFIX || '';

if (!accessKey || !secretKey || !bucket) {
  throw new Error('Missing Qiniu configuration');
}

const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);

// 生成上传凭证
export function getUploadToken(key?: string) {
  const options: qiniu.rs.PutPolicyOptions = {
    scope: key ? `${bucket}:${key}` : bucket,
    expires: 7200, // 2 小时
    // 指定上传区域（华南）
    zone: qiniu.zone.Zone_z2,
  };
  
  const putPolicy = new qiniu.rs.PutPolicy(options);
  return putPolicy.uploadToken(mac);
}

// 生成上传凭证（带自定义参数）
export function getUploadTokenWithParams(params: {
  key?: string;
  fileSize?: number;
}) {
  const options: qiniu.rs.PutPolicyOptions = {
    scope: params.key ? `${bucket}:${params.key}` : bucket,
    expires: 7200,
    fileSize: params.fileSize,
  };
  
  const putPolicy = new qiniu.rs.PutPolicy(options);
  return putPolicy.uploadToken(mac);
}

// 生成文件存储 key（支持分类路径）
export function generateFileKey(filename: string, gameId?: number, categoryPath?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = filename.split('.').pop() || 'mp4';
  const gamePath = gameId ? `game-${gameId}/` : '';
  
  // 如果有分类路径，添加到文件路径中
  const categoryDir = categoryPath ? `${categoryPath}/` : '';
  
  return `${prefix}${categoryDir}${gamePath}${timestamp}-${random}.${ext}`;
}

// 生成图标文件 key
export function generateIconKey(filename: string, type: 'game' | 'category' | 'character', id?: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = filename.split('.').pop() || 'png';
  const idPath = id ? `${id}/` : '';
  
  return `${prefix}icons/${type}/${idPath}${timestamp}-${random}.${ext}`;
}

// 获取文件外链
export function getFileUrl(key: string): string {
  return `${domain}/${key}`;
}

// 删除文件
export async function deleteFile(key: string) {
  const bucketManager = new qiniu.rs.BucketManager(mac);
  
  return new Promise<void>((resolve, reject) => {
    bucketManager.delete(bucket, key, (err, _respBody, respInfo) => {
      if (err) {
        reject(err);
      } else if (respInfo.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`Delete failed: ${respInfo.statusCode}`));
      }
    });
  });
}

// 批量删除文件
export async function deleteMultipleFiles(keys: string[]) {
  if (keys.length === 0) return;
  
  const bucketManager = new qiniu.rs.BucketManager(mac);
  const operations = keys.map(key => ({
    bucket,
    key,
  }));
  
  return new Promise<void>((resolve, reject) => {
    bucketManager.batch(operations, (err, respBody, respInfo) => {
      if (err) {
        reject(err);
      } else if (respInfo.statusCode === 200) {
        // 检查每个操作的结果
        const results = respBody as Array<{ code: number }>;
        const failed = results.filter(r => r.code !== 200);
        if (failed.length > 0) {
          console.warn(`Batch delete: ${failed.length}/${keys.length} files failed`);
        }
        resolve();
      } else {
        reject(new Error(`Batch delete failed: ${respInfo.statusCode}`));
      }
    });
  });
}

// 获取文件信息
export async function getFileStat(key: string) {
  const bucketManager = new qiniu.rs.BucketManager(mac);
  
  return new Promise<qiniu.rs.StatResp>((resolve, reject) => {
    bucketManager.stat(bucket, key, (err, respBody, respInfo) => {
      if (err) {
        reject(err);
      } else if (respInfo.statusCode === 200) {
        resolve(respBody);
      } else {
        reject(new Error(`Stat failed: ${respInfo.statusCode}`));
      }
    });
  });
}

// 从 URL 提取文件 key
export function extractKeyFromUrl(url: string): string | null {
  if (!url || !domain) return null;
  // 移除域名前缀
  const key = url.replace(`${domain}/`, '');
  return key || null;
}

// 生成下载凭证（私有空间）
export function getDownloadUrl(key: string, expiresInSeconds = 3600): string {
  const deadline = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return qiniu.util.urlToPrivateAccess(
    `${domain}/${key}`,
    domain || '',
    deadline,
    mac
  );
}

// ==================== 图片内容审核 ====================

// 调用七牛云图片审核 API
export async function censorImage(imageUrl: string, scenes: string[] = ['pulp', 'terror', 'politician', 'ads']) {
  const accessKey = process.env.QINIU_ACCESS_KEY;
  const secretKey = process.env.QINIU_SECRET_KEY;
  
  if (!accessKey || !secretKey) {
    throw new Error('Missing Qiniu credentials for image censor');
  }

  const auth = new qiniu.auth.digest.Mac(accessKey, secretKey);
  
  // 构建请求体
  const body = {
    data: {
      uri: imageUrl,
    },
    params: {
      scenes: scenes,
    },
  };

  const bodyStr = JSON.stringify(body);
  
  // 生成鉴权 Token
  const token = qiniu.util.generateAccessTokenV2(auth, 'http://ai.qiniuapi.com/v3/image/censor', 'application/json', bodyStr);

  try {
    const response = await fetch('http://ai.qiniuapi.com/v3/image/censor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: bodyStr,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image censor API failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    
    // 解析审核结果
    const censorResult = parseCensorResult(result);
    
    return censorResult;
  } catch (error: any) {
    console.error('Image censor error:', error);
    throw error;
  }
}

// 解析审核结果
interface CensorResult {
  suggestion: 'pass' | 'review' | 'block';
  details: Array<{
    scene: string;
    suggestion: 'pass' | 'review' | 'block';
    label: string;
    score: number;
  }>;
}

function parseCensorResult(result: any): CensorResult {
  const overallSuggestion = result.result?.suggestion || 'pass';
  const details: any[] = [];

  const scenes = result.result?.scenes || {};
  
  // 遍历所有审核类型的结果
  for (const [scene, sceneResult] of Object.entries(scenes)) {
    const sceneData = sceneResult as any;
    const sceneSuggestion = sceneData.suggestion || 'pass';
    
    if (sceneData.details && sceneData.details.length > 0) {
      for (const detail of sceneData.details) {
        details.push({
          scene,
          suggestion: detail.suggestion || sceneSuggestion,
          label: detail.label || 'unknown',
          score: detail.score || 0,
        });
      }
    } else {
      // 没有 details 时，记录整体结果
      details.push({
        scene,
        suggestion: sceneSuggestion,
        label: 'normal',
        score: 1.0,
      });
    }
  }

  return {
    suggestion: overallSuggestion,
    details,
  };
}
