# 视频替换功能 Bug 修复报告

## 📋 发现的 Bug 及修复

### Bug 1: 前端上传凭证 API 调用参数错误 ⚠️ 严重

**问题描述**：
- 前端调用 `videosAPI.getUploadToken()` 时传递 `editingVideo.actionId`，可能为 `undefined`
- 后端期望接收 `actionId?: number`，但 `undefined` 会导致参数验证问题

**修复方案**：
```javascript
// 修复前
editingVideo.actionId

// 修复后
editingVideo.actionId || undefined
```

**影响**：可能导致上传凭证获取失败

---

### Bug 2: 七牛云上传缺少错误处理 ⚠️ 严重

**问题描述**：
- 前端上传视频到七牛云后没有检查响应状态
- 即使上传失败也会继续调用替换 API，导致数据库指向不存在的文件

**修复方案**：
```javascript
// 修复前
await fetch('https://up.qiniup.com', {
  method: 'POST',
  body: formData,
})

// 修复后
const uploadResponse = await fetch('https://up.qiniup.com', {
  method: 'POST',
  body: formData,
})

if (!uploadResponse.ok) {
  const errorData = await uploadResponse.json().catch(() => ({}))
  throw new Error(`七牛云上传失败：${errorData.error || uploadResponse.statusText}`)
}

const uploadResult = await uploadResponse.json()
```

**影响**：上传失败时数据不一致

---

### Bug 3: 替换 API 缺少权限检查 ⚠️ 中等

**问题描述**：
- `POST /videos/:id/replace` 使用 `authenticate` 中间件，只验证登录
- 普通用户（user 角色）也可以调用替换 API

**修复方案**：
```typescript
// 修复前
{ preHandler: [authenticate] }

// 修复后
{ preHandler: [requireAdmin] }
```

**影响**：权限漏洞，普通用户可替换视频

---

### Bug 4: 旧封面图未删除 ⚠️ 中等

**问题描述**：
- 替换视频时删除了旧视频文件（`qiniuKey`）
- **没有删除七牛云上的旧封面图**（`coverUrl`, `coverUrlJpg`, `coverUrlWebp`）
- 导致七牛云存储浪费，旧封面图永久存在

**修复方案**：
```typescript
// 新增删除旧封面图逻辑
const oldCoverKeysToDelete: string[] = []

// 从 URL 提取文件 key
if (oldVideo.coverUrl) {
  const coverKey = extractKeyFromUrl(oldVideo.coverUrl)
  if (coverKey) oldCoverKeysToDelete.push(coverKey)
}
// 同样处理 coverUrlJpg 和 coverUrlWebp

// 批量删除
for (const coverKey of oldCoverKeysToDelete) {
  await deleteFile(coverKey)
}
```

**影响**：存储浪费，旧封面图残留

---

### Bug 5: 事务安全性问题 ⚠️ 中等

**问题描述**：
- 封面生成失败不影响视频替换，但可能导致数据不一致
- 没有使用数据库事务确保原子性

**当前方案**：
- 封面生成失败时继续使用旧封面
- 记录错误日志，不影响主要功能

**建议改进**：
- 使用 Prisma 事务包装整个替换流程
- 提供选项让用户选择是否等待封面生成

---

### Bug 6: 文件上传响应未解析 ⚠️ 低

**问题描述**：
- 七牛云上传后应该解析响应获取实际存储的 key
- 前端直接使用请求时的 key（可能与实际不同）

**修复方案**：
```javascript
const uploadResult = await uploadResponse.json()
// 使用 uploadResult.key 而非请求时的 key
```

**影响**：理论上 key 应该一致，但解析响应更安全

---

### Bug 7: 编辑弹窗重置逻辑问题 ⚠️ 低

**问题描述**：
- 点击"取消"按钮时重置了 `replaceVideoFile`
- 但再次打开编辑弹窗时会保留上次的文件选择状态

**当前方案**：
- 在 `handleEdit()` 中重置 `setReplaceVideoFile(null)`

**影响**：用户体验问题，可能误操作

---

## 🛠️ 代码变更

### 后端文件

1. **`server/src/routes/videos.ts`**
   - 新增 `POST /videos/:id/replace` 路由
   - 使用 `requireAdmin` 中间件
   - 添加删除旧封面图逻辑
   - 完善错误日志

2. **`server/src/lib/qiniu.ts`**
   - 修改 `extractKeyFromUrl()` 返回类型为 `string | null`
   - 增强空值处理

### 前端文件

1. **`admin/src/pages/Actions.jsx`**
   - 新增 `replaceVideoFile` 和 `isReplacing` 状态
   - 新增 `handleReplaceVideoSelect()` 函数
   - 新增 `handleReplaceVideo()` 函数（包含完整上传流程）
   - 修改编辑弹窗 UI，添加替换视频区域

2. **`admin/src/lib/services.js`**
   - 新增 `videosAPI.replace()` 方法

---

## ✅ 测试建议

### 功能测试

1. **基本替换流程**
   - 选择视频 → 点击编辑 → 选择新视频文件 → 点击替换
   - 验证：新视频播放正常，新封面图生成，旧文件删除

2. **权限测试**
   - 使用普通用户（user 角色）登录
   - 尝试调用替换 API → 应该返回 403

3. **错误处理测试**
   - 上传非视频文件 → 应该提示"请选择视频文件"
   - 七牛云上传失败 → 应该显示具体错误信息
   - 网络中断 → 应该有错误提示

4. **旧文件清理测试**
   - 替换前记录旧视频 key 和封面 key
   - 替换后检查七牛云 → 旧文件应该被删除

5. **边界情况测试**
   - 替换没有封面图的视频
   - 替换只有部分封面图的视频（只有 JPG 没有 WebP）
   - 连续多次替换同一视频

### 性能测试

1. **大文件上传**：测试 500MB+ 视频文件
2. **并发替换**：多个管理员同时替换不同视频
3. **封面生成时间**：记录从上传到封面生成的总时长

---

## 📊 部署状态

| 服务 | 状态 | PID | 版本 |
|------|------|-----|------|
| ckanim-server | 🟢 online | 103464 | fceda0f |
| ckanim-admin | 🟢 online | 103477 | fceda0f |
| ckanim-front | 🟢 online | 103025 | fceda0f |

**部署时间**：2026-03-26 13:30
**提交哈希**：`fceda0f`, `141742e`

---

## 📝 使用指南

### 替换视频步骤

1. 访问 `https://admin.anick.cn/actions`
2. 找到要替换的视频，点击"编辑"按钮
3. 在弹窗底部看到"🔄 替换视频文件"区域
4. 点击"选择文件"上传新视频（支持 MP4、WebM 等格式）
5. 确认文件信息后点击"🔄 替换视频"按钮
6. 等待上传和处理完成（显示进度提示）
7. 替换成功后自动刷新列表

### 注意事项

⚠️ **替换操作会**：
- ✅ 删除七牛云上的旧视频文件
- ✅ 删除七牛云上的旧封面图（JPG + WebP）
- ✅ 生成新的封面图（自动截取第 1 秒）
- ✅ 更新数据库中的视频 URL 和封面 URL
- ✅ 保留原有的标题、标签、分类、排序等信息

⚠️ **替换操作不会**：
- ❌ 修改视频标题（需手动编辑）
- ❌ 修改视频分类
- ❌ 修改视频标签
- ❌ 修改视频排序
- ❌ 删除关联的动作记录

---

## 🔍 监控建议

### 日志监控

```bash
# 查看替换相关日志
pm2 logs ckanim-server --lines 1000 | grep "Video Replace"

# 查看错误日志
pm2 logs ckanim-server --lines 1000 | grep "ERROR"
```

### 七牛云监控

- 监控存储空间变化（替换后应该减少）
- 监控 CDN 流量（旧封面图不应再有访问）

### 数据库监控

```sql
-- 查看最近替换的视频
SELECT id, title, qiniuKey, coverUrl, updatedAt 
FROM videos 
ORDER BY updatedAt DESC 
LIMIT 10;
```

---

## 🚀 后续优化建议

1. **进度显示**：显示上传进度条（使用七牛云分片上传）
2. **批量替换**：支持一次选择多个视频进行替换
3. **版本历史**：保留最近 N 个版本的视频，支持回滚
4. **预览功能**：替换前预览新视频内容
5. **定时清理**：定期扫描并删除孤立的封面图
6. **事务优化**：使用数据库事务确保原子性

---

**文档版本**：1.0
**最后更新**：2026-03-26
**作者**：波波
