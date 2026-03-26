# 视频替换功能 401 错误 - 全面排查报告

## 📋 问题概述
- **批量上传视频**: ✅ 工作正常
- **替换视频功能**: ❌ 七牛云返回 `{"error": "bad token", "error_code": "BadToken"}`

## ✅ 已验证正常的部分

### 1. 七牛云配置
```bash
QINIU_ACCESS_KEY: 7SQACfWTDUZdDgJFlRZGRbKQDIHUFGilt_H3UE2L ✓
QINIU_SECRET_KEY: LTaPJ6mK_LDudhkxJRmvLmdpnr-PLoL1gvOGDvfn ✓
QINIU_BUCKET: zhuque-guangdong ✓
QINIU_DOMAIN: http://video.jiangmeijixie.com ✓
QINIU_PREFIX: 参考网站 2026/ ✓
```

### 2. Token 生成和上传测试
在服务器上直接测试（使用与替换功能相同的参数）：
```javascript
const key = '参考网站 2026/火/game-1/1774520000000-test-replace.mp4';
const token = getUploadToken(key);  // ✓ 成功生成
uploadToQiniu(token, key, file);    // ✓ 上传成功 (HTTP 200)
```
**结论**: Token 生成和七牛云 API 本身完全正常

### 3. 上传端点
- 批量上传：`https://up-z2.qiniup.com/` ✓
- 替换功能：`https://up-z2.qiniup.com/` ✓
**结论**: 端点一致（都有尾部斜杠）

### 4. 后端路由
```typescript
server.post('/videos/upload-token', { preHandler: [authenticate] }, handler)
```
**结论**: 路由正确，JWT 认证正常

### 5. 数据库数据
```sql
-- 分类存在
SELECT id, name FROM game_categories WHERE id = 1;  -- 火 ✓

-- 动作存在
SELECT id, name, characterId FROM actions WHERE id = 76;  -- 单击 ✓

-- 角色存在
SELECT id, name, categoryId FROM characters WHERE id = xxx;  -- 班尼特 ✓
```
**结论**: 数据库数据完整

### 6. 代码部署
```bash
# 前端构建成功
dist/assets/index-DR3DrEgn.js   269.83 kB

# 服务状态
ckanim-front  (103025) online ✓
ckanim-admin  (107955) online ✓
ckanim-server (107923) online ✓
```
**结论**: 代码已正确部署

## 🔍 代码对比分析

### 批量上传 vs 替换功能

| 对比项 | 批量上传 | 替换功能 | 是否一致 |
|--------|---------|---------|---------|
| FormData 构造 | `append('token', token)` | `append('token', token)` | ✅ |
| FormData 构造 | `append('key', key)` | `append('key', key)` | ✅ |
| FormData 构造 | `append('file', file)` | `append('file', file)` | ✅ |
| XMLHttpRequest | `addEventListener('load', ...)` | `addEventListener('load', ...)` | ✅ |
| XMLHttpRequest | `addEventListener('error', ...)` | `addEventListener('error', ...)` | ✅ |
| 上传端点 | `xhr.open('POST', 'https://up-z2.qiniup.com/')` | `xhr.open('POST', 'https://up-z2.qiniup.com/')` | ✅ |
| Token 生成 API | `POST /api/admin/videos/upload-token` | `POST /api/admin/videos/upload-token` | ✅ |
| categoryIds | `[categoryId]` (1 个元素) | `editingVideo.categories?.map(c => c.id) \|\| []` | ⚠️ |
| actionId | `actionId` | `editingVideo.actionId \|\| undefined` | ✅ |

### 关键差异：categoryIds 传递

**批量上传**:
```javascript
const tokenResponse = await videosAPI.getUploadToken(
  file.name, 
  gameId, 
  [categoryId],  // ← 始终是包含 1 个元素的数组
  actionId
)
```

**替换功能**:
```javascript
const categoryIds = editingVideo.categories?.map(c => c.id) || []
const tokenResponse = await videosAPI.getUploadToken(
  replaceVideoFile.name,
  editingVideo.gameId,
  categoryIds,  // ← 可能为空数组 []
  editingVideo.actionId || undefined
)
```

**后端处理逻辑**:
```typescript
let finalCategoryIds = categoryIds;

// 如果提供了 actionId 且 categoryIds 为空，自动从 action 获取分类
if (actionId && !categoryIds.length) {
  const action = await prisma.action.findUnique({
    where: { id: actionId },
    include: {
      character: { select: { categoryId: true } },
    },
  });
  
  if (action && action.character?.categoryId) {
    finalCategoryIds = [action.character.categoryId];
  }
}
```

**结论**: 后端有 fallback 逻辑，即使 categoryIds 为空，也会从 actionId 获取分类。

## 🐛 已修复的问题

### 1. videos.ts 语法错误
**问题**: JSON.stringify 调用缺少闭合括号
```typescript
// ❌ 错误
server.log.info('[Upload Token] 生成的分类路径:', JSON.stringify({
  categoryPath,
  finalCategoryIds,
});  // ← 缺少 )

// ✅ 修复
server.log.info('[Upload Token] 生成的分类路径:', JSON.stringify({
  categoryPath,
  finalCategoryIds,
}));  // ← 添加 )
```

**修复**: 已修复 3 处语法错误，服务已重启

### 2. 调试日志增强
**新增日志**:
```javascript
// 前端
console.log('[Video Replace] 替换视频调试信息:', {
  willUseActionFallback: categoryIds.length === 0 && !!editingVideo.actionId,
  ...
})

console.log('[Video Replace] Upload failed:', {
  status: xhr.status,
  response: xhr.responseText,
  statusText: xhr.statusText,
})
```

## 🎯 可能的根本原因

### 假设 1: editingVideo.categories 为空且 actionId 无效
**场景**: 
- `editingVideo.categories` 为 `undefined` 或空数组
- `editingVideo.actionId` 也为 `undefined` 或无效
- 导致 `finalCategoryIds = []`，`categoryPath = ''`
- 生成的 key 为：`参考网站 2026/game-1/xxx.mp4`（缺少分类路径）
- token 的 scope 与上传时的 key 不匹配

**验证方法**:
```javascript
// 在浏览器控制台执行
console.log('editingVideo:', editingVideo);
console.log('categories:', editingVideo.categories);
console.log('actionId:', editingVideo.actionId);
console.log('willUseActionFallback:', !editingVideo.categories?.length && !!editingVideo.actionId);
```

**修复方案**:
```javascript
// 确保 categoryIds 或 actionId 至少有一个有效
if (categoryIds.length === 0 && !editingVideo.actionId) {
  alert('错误：视频缺少分类信息，无法替换')
  return
}
```

### 假设 2: 浏览器缓存旧版本代码
**场景**: 浏览器缓存了旧版本 JS 文件，没有最新的调试日志和修复

**验证方法**:
1. F12 → Network → 查看 `index-*.js` 文件名
2. 查看 Console 中是否有 `[Video Replace]` 日志
3. 强制刷新：Ctrl+F5 (Windows) 或 Cmd+Shift+R (Mac)

**修复方案**:
- 用户强制刷新浏览器
- 或添加版本号参数：`index.js?v=20260326`

### 假设 3: 前端代码中 token 被意外修改
**场景**: 获取 token 后，上传前 token 被修改

**验证方法**:
```javascript
// 对比两次日志中的 tokenPrefix
console.log('[Video Replace] 获取上传凭证成功:', { tokenPrefix: token.substring(0, 20) });
console.log('[Video Replace] 开始上传到七牛云:', { tokenPrefix: token.substring(0, 20) });
```

**修复方案**:
- 已添加调试日志对比 token 前缀

### 假设 4: 浏览器兼容性问题
**场景**: 某些浏览器对 FormData 或 XMLHttpRequest 有特殊限制

**验证方法**:
在浏览器控制台手动测试：
```javascript
const token = "从日志复制";
const key = "从日志复制";
const file = document.querySelector('input[type="file"]').files[0];

const formData = new FormData();
formData.append('token', token);
formData.append('key', key);
formData.append('file', file);

const xhr = new XMLHttpRequest();
xhr.addEventListener('load', () => {
  console.log('状态码:', xhr.status);
  console.log('响应:', xhr.responseText);
});
xhr.open('POST', 'https://up-z2.qiniup.com/');
xhr.send(formData);
```

## 📝 调试步骤（给用户）

### 步骤 1: 访问动作管理页面
```
https://admin.anick.cn/actions
```

### 步骤 2: 打开浏览器控制台
按 F12 打开开发者工具，切换到 Console 标签

### 步骤 3: 尝试替换视频
1. 点击任意视频的"编辑"按钮
2. 在编辑弹窗中选择"替换视频文件"
3. 选择一个视频文件上传

### 步骤 4: 查看控制台日志
复制以下日志发给我：

**前端日志**（浏览器 F12 → Console）:
```
[Video Replace] 替换视频调试信息: {
  videoId: ...,
  videoTitle: ...,
  gameId: ...,
  actionId: ...,
  categories: [...],  // ← 重点检查
  categoryIds: [...],  // ← 重点检查
  willUseActionFallback: true/false,  // ← 新增
  ...
}
[Video Replace] 获取上传凭证成功: {
  key: "...",
  url: "...",
  tokenPrefix: "...",
  tokenLength: ...
}
[Video Replace] 开始上传到七牛云: {
  endpoint: "https://up-z2.qiniup.com/",
  key: "...",
  tokenPrefix: "...",  // ← 应与上面一致
  fileSize: ...,
  fileName: "..."
}
[Video Replace] Upload failed: {
  status: 401,
  response: "{\"error\":\"bad token\",\"error_code\":\"BadToken\"}",
  statusText: "Unauthorized"
}
```

### 步骤 5: 查看网络请求（可选）
F12 → Network → 点击失败的请求 → 查看：
- Request URL
- Request Headers
- Request Payload

## 🛠️ 下一步行动

### 方案 A: 等待用户测试（推荐）
1. 用户访问 https://admin.anick.cn/actions
2. 强制刷新浏览器（Ctrl+F5）
3. 尝试替换视频
4. 复制控制台日志发给我

### 方案 B: 添加防御性代码
如果 `editingVideo.categories` 为空且 `actionId` 无效，阻止上传：

```javascript
// 在获取上传凭证前添加检查
if (categoryIds.length === 0 && !editingVideo.actionId) {
  alert('错误：视频缺少分类信息，无法替换。请刷新页面重试。')
  setIsReplacing(false)
  return
}
```

### 方案 C: 使用批量上传代码
将替换功能的上传代码完全替换为批量上传的成功代码：

```javascript
// 直接使用批量上传的上传逻辑
await new Promise((resolve, reject) => {
  const formData = new FormData()
  formData.append('token', token)
  formData.append('key', key)
  formData.append('file', replaceVideoFile)

  const xhr = new XMLHttpRequest()
  xhr.upload.addEventListener('progress', (e) => {
    // 进度条
  })
  xhr.addEventListener('load', () => {
    if (xhr.status === 200) resolve()
    else reject(new Error(`上传失败 (${xhr.status})`))
  })
  xhr.addEventListener('error', () => reject(new Error('网络错误')))
  xhr.open('POST', 'https://up-z2.qiniup.com/')
  xhr.send(formData)
})
```

## 📊 服务器日志查看

```bash
# 查看最近的上传 token 日志
ssh ckanim-server "tail -100 /var/www/ckanim/server/logs/server-out.log | grep 'Upload Token'"

# 实时查看日志
ssh ckanim-server "pm2 logs ckanim-server --lines 50"
```

**关键日志**:
```
[Upload Token] 请求参数: {"filename":"...","gameId":1,"categoryIds":[],"actionId":76}
[Upload Token] 从 actionId 获取分类: {"actionId":76,"foundAction":true,"categoryId":1}
[Upload Token] 查询分类: {"categoryIds":[1],"foundCategories":[{"id":1,"name":"火","level":1}]}
[Upload Token] 生成的分类路径: {"categoryPath":"火","finalCategoryIds":[1]}
[Upload Token] 生成的文件 key: {"key":"参考网站 2026/火/game-1/...","gameId":1,"categoryPath":"火"}
[Upload Token] 返回上传凭证: {"key":"...","tokenLength":465}
```

## ✅ 当前状态

- [x] 七牛云配置验证 ✓
- [x] Token 生成测试 ✓
- [x] 上传端点验证 ✓
- [x] 后端路由验证 ✓
- [x] 数据库数据验证 ✓
- [x] 代码部署验证 ✓
- [x] 语法错误修复 ✓
- [x] 调试日志增强 ✓
- [ ] 用户测试验证 ⏳
- [ ] 根本原因定位 ⏳
- [ ] 最终修复 ⏳

## 📞 联系信息

请提供以下信息以便继续诊断：
1. 浏览器控制台完整日志（F12 → Console）
2. 网络请求详情（F12 → Network → 点击失败的请求）
3. 浏览器类型和版本
