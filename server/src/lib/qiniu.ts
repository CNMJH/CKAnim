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
