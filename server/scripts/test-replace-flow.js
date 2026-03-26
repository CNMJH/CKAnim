// 测试视频替换功能的完整流程
const https = require('https');
const fs = require('fs');
const path = require('path');

// 配置
const API_BASE = 'http://localhost:3002/api';
const QINIU_ENDPOINT = 'https://up-z2.qiniup.com/';

// 七牛云配置
const QINIU_CONFIG = {
  accessKey: '7SQACfWTDUZdDgJFlRZGRbKQDIHUFGilt_H3UE2L',
  secretKey: 'LTaPJ6mK_LDudhkxJRmvLmdpnr-PLoL1gvOGDvfn',
  bucket: 'zhuque-guangdong',
};

// 测试参数（模拟替换功能）
const TEST_PARAMS = {
  filename: 'test-replace-video.mp4',
  gameId: 1,
  categoryIds: [1], // 火
  actionId: 76,
};

async function testReplaceFlow() {
  console.log('='.repeat(60));
  console.log('视频替换功能完整流程测试');
  console.log('='.repeat(60));
  console.log('');
  
  // 步骤 1: 获取 token（模拟前端调用）
  console.log('步骤 1: 获取上传凭证...');
  const token = await getUploadToken(TEST_PARAMS);
  console.log('  Token:', token.substring(0, 30) + '...');
  console.log('');
  
  // 步骤 2: 创建测试文件
  console.log('步骤 2: 创建测试文件...');
  const testFilePath = path.join('/tmp', `test-${Date.now()}.mp4`);
  fs.writeFileSync(testFilePath, 'test video content for replace function');
  console.log('  文件:', testFilePath);
  console.log('  大小:', fs.statSync(testFilePath).size, 'bytes');
  console.log('');
  
  // 步骤 3: 上传到七牛云（模拟前端 XMLHttpRequest）
  console.log('步骤 3: 上传到七牛云...');
  const uploadResult = await uploadToQiniu(token, token.key, testFilePath);
  console.log('  结果:', uploadResult);
  console.log('');
  
  // 步骤 4: 清理测试文件
  fs.unlinkSync(testFilePath);
  console.log('✅ 测试完成！');
  console.log('='.repeat(60));
}

async function getUploadToken(params) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(params);
    
    const req = https.request({
      hostname: 'localhost',
      port: 3002,
      path: '/api/admin/videos/upload-token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(body);
          console.log('  API 响应:', {
            key: result.key,
            url: result.url,
            tokenLength: result.token.length,
          });
          resolve(result);
        } else {
          console.error('  API 错误:', res.statusCode, body);
          reject(new Error(`API error: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function uploadToQiniu(token, key, filePath) {
  const FormData = require('form-data');
  const formData = new FormData();
  formData.append('token', token);
  formData.append('key', key);
  formData.append('file', fs.createReadStream(filePath));
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'up-z2.qiniup.com',
      port: 443,
      path: '/',
      method: 'POST',
      headers: formData.getHeaders(),
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          console.error('  七牛云错误:', res.statusCode, body);
          try {
            const error = JSON.parse(body);
            reject(new Error(`Qiniu error: ${error.error} (${error.error_code})`));
          } catch (e) {
            reject(new Error(`Qiniu error: ${res.statusCode}`));
          }
        }
      });
    });
    
    req.on('error', reject);
    formData.pipe(req);
  });
}

// 运行测试
testReplaceFlow().catch(console.error);
