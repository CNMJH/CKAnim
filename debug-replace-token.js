// 调试脚本：模拟替换功能的 token 生成流程
const fs = require('fs');
const qiniu = require('qiniu');

// 读取 .env
const env = fs.readFileSync('.env', 'utf-8');
const envObj = {};
env.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) envObj[key.trim()] = value.trim();
});

const accessKey = envObj.QINIU_ACCESS_KEY;
const secretKey = envObj.QINIU_SECRET_KEY;
const bucket = envObj.QINIU_BUCKET;
const domain = envObj.QINIU_DOMAIN;
const prefix = envObj.QINIU_PREFIX || '';

console.log('=== 七牛云配置 ===');
console.log('Bucket:', bucket);
console.log('Domain:', domain);
console.log('Prefix:', prefix);
console.log('');

const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);

// 模拟场景 1：批量上传（成功）
console.log('=== 场景 1：批量上传（成功）===');
const batchCategoryId = 2; // 假设分类 ID
const batchGameId = 1;
const batchActionId = 1;
const batchFilename = 'test-batch.mp4';
const batchCategoryPath = '火'; // 假设分类路径
const batchKey = prefix + batchCategoryPath + '/game-' + batchGameId + '/' + Date.now() + '-abc123.mp4';
const batchOptions = {
  scope: bucket + ':' + batchKey,
  expires: 7200,
  zone: qiniu.zone.Zone_z2
};
const batchToken = new qiniu.rs.PutPolicy(batchOptions).uploadToken(mac);
console.log('Key:', batchKey);
console.log('Token (前 50 字符):', batchToken.substring(0, 50));
console.log('');

// 模拟场景 2：替换功能 - categoryIds 为空，actionId 有值
console.log('=== 场景 2：替换功能（categoryIds 为空，actionId 有值）===');
const replaceCategoryId = 2; // 从 actionId 自动获取
const replaceGameId = 1;
const replaceActionId = 1;
const replaceFilename = 'test-replace.mp4';
const replaceCategoryPath = '火'; // 后端从 actionId 获取
const replaceKey = prefix + replaceCategoryPath + '/game-' + replaceGameId + '/' + Date.now() + '-xyz789.mp4';
const replaceOptions = {
  scope: bucket + ':' + replaceKey,
  expires: 7200,
  zone: qiniu.zone.Zone_z2
};
const replaceToken = new qiniu.rs.PutPolicy(replaceOptions).uploadToken(mac);
console.log('Key:', replaceKey);
console.log('Token (前 50 字符):', replaceToken.substring(0, 50));
console.log('');

// 模拟场景 3：替换功能 - categoryIds 为空，actionId 为 undefined
console.log('=== 场景 3：替换功能（categoryIds 为空，actionId 为 undefined）===');
const replaceGameId2 = 1;
const replaceFilename2 = 'test-replace2.mp4';
const replaceCategoryPath2 = ''; // 没有分类路径
const replaceKey2 = prefix + 'game-' + replaceGameId2 + '/' + Date.now() + '-def456.mp4';
const replaceOptions2 = {
  scope: bucket + ':' + replaceKey2,
  expires: 7200,
  zone: qiniu.zone.Zone_z2
};
const replaceToken2 = new qiniu.rs.PutPolicy(replaceOptions2).uploadToken(mac);
console.log('Key:', replaceKey2);
console.log('Token (前 50 字符):', replaceToken2.substring(0, 50));
console.log('');

// 模拟场景 4：前端传入错误的 categoryIds
console.log('=== 场景 4：替换功能（前端传入 categoryIds，但与 action 不匹配）===');
const wrongCategoryIds = [999]; // 错误的分类 ID
const replaceGameId3 = 1;
const replaceFilename3 = 'test-replace3.mp4';
// 后端会使用传入的 categoryIds，如果找不到分类，categoryPath 为空
const replaceCategoryPath3 = ''; // 分类 ID 999 不存在
const replaceKey3 = prefix + 'game-' + replaceGameId3 + '/' + Date.now() + '-ghi012.mp4';
const replaceOptions3 = {
  scope: bucket + ':' + replaceKey3,
  expires: 7200,
  zone: qiniu.zone.Zone_z2
};
const replaceToken3 = new qiniu.rs.PutPolicy(replaceOptions3).uploadToken(mac);
console.log('Key:', replaceKey3);
console.log('Token (前 50 字符):', replaceToken3.substring(0, 50));
console.log('');

console.log('=== 关键发现 ===');
console.log('1. token 与 key 是绑定的，七牛云会验证上传的 key 是否与 token 中 scope 匹配');
console.log('2. 如果前端生成的 key 与后端返回的 key 不一致，会导致 401 bad token');
console.log('3. 可能的问题：前端修改了 key 或者使用了错误的 key 上传');
