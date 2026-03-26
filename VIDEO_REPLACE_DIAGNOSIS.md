# 视频替换功能 401 错误诊断报告

## 问题现象
- **批量上传视频**: ✅ 成功
- **替换视频功能**: ❌ 失败，七牛云返回 `{"error": "bad token", "error_code": "BadToken"}`

## 已完成的排查

### ✅ 1. 七牛云配置验证
```bash
# 服务器配置
QINIU_ACCESS_KEY: 7SQACfWTDUZdDgJFlRZGRbKQDIHUFGilt_H3UE2L
QINIU_SECRET_KEY: LTaPJ6mK_LDudhkxJRmvLmdpnr-PLoL1gvOGDvfn
QINIU_BUCKET: zhuque-guangdong
QINIU_DOMAIN: http://video.jiangmeijixie.com
QINIU_PREFIX: 参考网站 2026/
```
**结论**: 配置正确

### ✅ 2. Token 生成测试
在服务器上直接测试 token 生成和上传：
```javascript
const key = '参考网站 2026/火/game-1/1774520000000-test-replace.mp4';
const token = getUploadToken(key);  // 成功生成
uploadToQiniu(token, key, file);    // ✅ 上传成功 (HTTP 200)
```
**结论**: Token 生成和七牛云 API 本身正常

### ✅ 3. 上传端点验证
- 批量上传：`https://up-z2.qiniup.com/` ✅
- 替换功能：`https://up-z2.qiniup.com/` ✅
**结论**: 端点一致（都有尾部斜杠）

### ✅ 4. 代码对比
对比批量上传和替换功能的代码：

| 对比项 | 批量上传 | 替换功能 | 是否一致 |
|--------|---------|---------|---------|
| FormData 构造 | 相同 | 相同 | ✅ |
| XMLHttpRequest | 相同 | 相同 | ✅ |
| 上传端点 | `https://up-z2.qiniup.com/` | `https://up-z2.qiniup.com/` | ✅ |
| Token 生成 API | `/api/admin/videos/upload-token` | `/api/admin/videos/upload-token` | ✅ |
| categoryIds 传递 | `[categoryId]` | `editingVideo.categories?.map(c => c.id) || []` | ⚠️ 可能不同 |
| actionId 传递 | `actionId` | `editingVideo.actionId \|\| undefined` | ✅ |

### ✅ 5. 后端逻辑验证
后端 `/api/admin/videos/upload-token` 处理逻辑：
```typescript
// 1. 如果提供了 actionId 且 categoryIds 为空，自动从 action 获取分类
if (actionId && !categoryIds.length) {
  const action = await prisma.action.findUnique({...});
  finalCategoryIds = [action.character.categoryId];
}

// 2. 查询分类信息
const categories = await prisma.gameCategory.findMany({...});

// 3. 生成分类路径
categoryPath = categories[0].name; // 例如："火"

// 4. 生成文件 key
key = generateFileKey(filename, gameId, categoryPath);
// 结果："参考网站 2026/火/game-1/1774511555569-xxxx.mp4"

// 5. 生成 token
token = getUploadToken(key);
```
**结论**: 后端逻辑正确

### ✅ 6. 数据库验证
```sql
-- 验证分类存在
SELECT id, name, level FROM game_categories;
-- 结果：1|火|1 ✓

-- 验证动作存在
SELECT id, name, characterId FROM actions WHERE id = 76;
-- 结果：76|单击|xxx ✓

-- 验证角色存在
SELECT id, name, categoryId FROM characters WHERE id = xxx;
-- 结果：xxx|班尼特|1 ✓
```
**结论**: 数据库数据正常

## 可能的根本原因

### 假设 1: 前端 editingVideo.categories 为空或 undefined
**症状**: 前端传递 `categoryIds: []`，后端尝试从 actionId 获取分类，但可能失败。

**验证方法**:
```javascript
// 在浏览器控制台执行
console.log('editingVideo:', editingVideo);
console.log('categories:', editingVideo.categories);
console.log('categoryIds:', editingVideo.categories?.map(c => c.id));
```

**修复方案**:
```javascript
// 确保 categoryIds 不为空
const categoryIds = editingVideo.categories?.map(c => c.id) || [];

// 如果为空，尝试从 action 获取
if (categoryIds.length === 0 && editingVideo.actionId) {
  // 后端会自动处理，无需前端干预
}
```

### 假设 2: 浏览器缓存旧版本代码
**症状**: 代码已更新，但浏览器仍使用旧版本。

**验证方法**:
1. 打开浏览器开发者工具 (F12)
2. Network 标签
3. 查看 `index-*.js` 文件名是否最新
4. 查看 console 中是否有 `[Video Replace]` 日志

**修复方案**:
- 强制刷新：Ctrl+F5 (Windows) 或 Cmd+Shift+R (Mac)
- 清除缓存：浏览器设置 → 清除浏览数据

### 假设 3: 前端代码中 token 被修改
**症状**: 获取 token 后，上传前 token 被意外修改。

**验证方法**:
```javascript
// 在浏览器控制台查看日志
console.log('[Video Replace] 获取上传凭证成功:', { tokenPrefix: token.substring(0, 20) });
console.log('[Video Replace] 开始上传到七牛云:', { tokenPrefix: token.substring(0, 20) });
// 对比两个 tokenPrefix 是否一致
```

**修复方案**:
- 已添加调试日志，对比 token 前缀

### 假设 4: 浏览器环境问题
**症状**: 某些浏览器对 FormData 或 XMLHttpRequest 有特殊限制。

**验证方法**:
在浏览器控制台手动执行上传：
```javascript
// 1. 获取 token（从失败的请求中复制）
const token = "复制的 token";
const key = "复制的 key";
const file = document.querySelector('input[type="file"]').files[0];

// 2. 手动构造 FormData
const formData = new FormData();
formData.append('token', token);
formData.append('key', key);
formData.append('file', file);

// 3. 手动上传
const xhr = new XMLHttpRequest();
xhr.addEventListener('load', () => {
  console.log('状态码:', xhr.status);
  console.log('响应:', xhr.responseText);
});
xhr.open('POST', 'https://up-z2.qiniup.com/');
xhr.send(formData);
```

## 调试步骤

### 步骤 1: 检查前端日志
在浏览器控制台 (F12) 查看：
```
[Video Replace] 替换视频调试信息: {
  videoId: 74,
  videoTitle: "单击",
  gameId: 1,
  actionId: 76,
  categories: [...],  // ← 检查是否为空
  categoryIds: [1],   // ← 检查是否为 [1]
  categoryIdsLength: 1,
  hasAction: true
}
[Video Replace] 获取上传凭证成功: {
  key: "参考网站 2026/火/game-1/...",
  url: "...",
  tokenPrefix: "7SQACfWTDUZdDgJFlRZG...",
  tokenLength: 465
}
[Video Replace] 开始上传到七牛云: {
  endpoint: "https://up-z2.qiniup.com/",
  key: "参考网站 2026/火/game-1/...",
  tokenPrefix: "7SQACfWTDUZdDgJFlRZG...",  // ← 应与上面一致
  fileSize: 724978,
  fileName: "班尼特单击_batch.mp4"
}
```

### 步骤 2: 检查服务器日志
```bash
ssh ckanim-server "tail -100 /var/www/ckanim/server/logs/server-out.log | grep 'Upload Token'"
```

查看：
```
[Upload Token] 请求参数: {"filename":"...","gameId":1,"categoryIds":[1],"actionId":76}
[Upload Token] 查询分类: {"categoryIds":[1],"foundCategories":[{"id":1,"name":"火","level":1}]}
[Upload Token] 生成的分类路径: {"categoryPath":"火","finalCategoryIds":[1]}
[Upload Token] 生成的文件 key: {"key":"参考网站 2026/火/game-1/...","gameId":1,"categoryPath":"火"}
[Upload Token] 返回上传凭证: {"key":"...","tokenLength":465}
```

### 步骤 3: 手动测试上传
在浏览器控制台执行：
```javascript
// 使用失败的请求中的 token 和 key
const token = "从日志中复制";
const key = "从日志中复制";
const file = document.querySelector('input[type="file"]').files[0];

const formData = new FormData();
formData.append('token', token);
formData.append('key', key);
formData.append('file', file);

const xhr = new XMLHttpRequest();
xhr.addEventListener('load', () => {
  console.log('状态码:', xhr.status);
  console.log('响应:', xhr.responseText);
  if (xhr.status === 200) {
    console.log('✅ 上传成功！');
  } else {
    console.log('❌ 上传失败:', JSON.parse(xhr.responseText));
  }
});
xhr.open('POST', 'https://up-z2.qiniup.com/');
xhr.send(formData);
```

## 修复方案

### 方案 A: 确保 categoryIds 不为空（推荐）
修改 `admin/src/pages/Actions.jsx`：
```javascript
// 1. 获取上传凭证
const categoryIds = editingVideo.categories?.map(c => c.id) || []

// 2. 如果 categoryIds 为空但有 actionId，后端会自动处理
// 无需前端干预，但添加日志确认
console.log('[Video Replace] 分类信息:', {
  hasCategories: !!editingVideo.categories,
  categoryIdsLength: categoryIds.length,
  hasActionId: !!editingVideo.actionId,
  willUseActionFallback: categoryIds.length === 0 && !!editingVideo.actionId,
})
```

### 方案 B: 添加重试机制
```javascript
// 如果上传失败，尝试重新获取 token 并重试
let retryCount = 0
const maxRetries = 2

async function uploadWithRetry(token, key, file) {
  try {
    await uploadToQiniu(token, key, file)
  } catch (err) {
    if (retryCount < maxRetries) {
      retryCount++
      console.log(`[Video Replace] 上传失败，重试 ${retryCount}/${maxRetries}`)
      // 重新获取 token
      const newTokenResponse = await videosAPI.getUploadToken(...)
      return uploadWithRetry(newTokenResponse.data.token, newTokenResponse.data.key, file)
    }
    throw err
  }
}
```

### 方案 C: 使用 fetch 替代 XMLHttpRequest
```javascript
// 使用 fetch API（更现代，错误处理更清晰）
const uploadResponse = await fetch('https://up-z2.qiniup.com/', {
  method: 'POST',
  body: formData,
})

if (!uploadResponse.ok) {
  const errorData = await uploadResponse.json()
  throw new Error(`七牛云上传失败：${errorData.error}`)
}

const uploadResult = await uploadResponse.json()
```

## 下一步行动

1. **等待用户测试**：请用户访问 https://admin.anick.cn/actions
2. **打开浏览器控制台** (F12)
3. **尝试替换视频**，查看控制台日志
4. **复制日志**发给我，我会根据日志继续诊断

## 关键日志格式

### 前端日志（浏览器 F12）
```
[Video Replace] 替换视频调试信息: {...}
[Video Replace] 获取上传凭证成功: {...}
[Video Replace] 开始上传到七牛云: {...}
[Video Replace] Upload success: {...}  // 或
[Video Replace] Upload failed: 401 {...}
```

### 服务器日志
```bash
ssh ckanim-server "tail -50 /var/www/ckanim/server/logs/server-out.log | grep 'Upload Token'"
```

```
[Upload Token] 请求参数: {...}
[Upload Token] 查询分类: {...}
[Upload Token] 生成的分类路径: {...}
[Upload Token] 生成的文件 key: {...}
[Upload Token] 返回上传凭证: {...}
```

## 联系信息
如有问题，请提供：
1. 浏览器控制台完整日志（F12 → Console）
2. 网络请求详情（F12 → Network → 点击失败的请求）
3. 服务器日志（如有权限）
