# 数据同步机制 - 后台、数据库、七牛云三者同步

**日期**: 2026-03-19  
**目标**: 确保管理员后台、数据库、七牛云三者数据完全同步  
**原则**: 以管理员后台操作为准，自动同步到数据库和七牛云

---

## 🎯 同步流程

### 1️⃣ 上传视频（后台 → 数据库 → 七牛云）

```
管理员上传视频
    ↓
[1] 前端请求上传凭证
    POST /api/admin/videos/upload-token
    Body: { filename, gameId, characterId, actionId }
    ↓
[2] 后端生成七牛云上传凭证
    - 验证游戏、角色、动作存在
    - 生成文件 key（带分类路径）
    - 返回 token 和 url
    ↓
[3] 前端直传七牛云
    - 使用 token 上传视频到七牛云
    - 七牛云返回上传成功
    ↓
[4] 前端创建数据库记录
    POST /api/admin/videos
    Body: { title, gameId, characterId, actionId, qiniuKey, qiniuUrl, ... }
    ↓
[5] 后端事务处理
    - 验证游戏、角色、动作
    - 检查动作是否已有视频（1 对 1）
    - 创建 Video 记录
    - 关联 Action.videoId
    - 生成封面图（可选）
    - 设置 published: true
    ↓
[6] 完成
    - 数据库：新增 Video 记录
    - 七牛云：新增视频文件
    - 前台：立即可见（published: true）
```

### 2️⃣ 删除视频（后台 → 数据库 + 七牛云）

```
管理员删除视频
    ↓
[1] 前端调用删除 API
    DELETE /api/admin/videos/:id
    ↓
[2] 后端查询视频信息
    - 获取 qiniuKey
    - 获取 coverUrl
    ↓
[3] 删除数据库记录
    prisma.video.delete({ where: { id } })
    ↓
[4] 删除七牛云文件
    - 删除视频文件 (.mp4)
    - 删除封面图 (-thumbnail.jpg)
    ↓
[5] 完成
    - 数据库：删除 Video 记录
    - 七牛云：删除文件
    - 前台：立即消失
```

### 3️⃣ 更新动作名称（后台 → 数据库 → 前台）

```
管理员更新动作名称
    ↓
[1] 前端调用更新 API
    PUT /api/admin/actions/:id
    Body: { name, code, description, ... }
    ↓
[2] 后端更新数据库
    prisma.action.update({
      where: { id },
      data: { name, code, ... }
    })
    ↓
[3] 完成
    - 数据库：更新 Action.name
    - 前台：刷新后显示新名称
    - 七牛云：不受影响（文件 key 不变）
```

---

## 🛡️ 数据一致性保障

### 事务保证

**场景**: 创建视频时，确保数据库和七牛云同步

```javascript
// server/src/routes/videos.ts
const video = await prisma.$transaction(async (tx) => {
  // 1. 验证游戏、角色、动作
  const game = await tx.game.findUnique({ where: { id: gameId } });
  const character = await tx.character.findUnique({ where: { id: characterId } });
  const action = await tx.action.findUnique({ where: { id: actionId } });
  
  // 2. 验证动作没有视频（1 对 1）
  if (action.video) {
    throw new Error('Action already has a video');
  }
  
  // 3. 创建视频记录
  const video = await tx.video.create({
    data: {
      title,
      gameId,
      qiniuKey,
      qiniuUrl,
      published: true,
      actionId,
    },
  });
  
  // 4. 关联动作和视频
  await tx.action.update({
    where: { id: actionId },
    data: { videoId: video.id },
  });
  
  return video;
});
```

### 级联删除

**场景**: 删除父级时自动删除子级

```prisma
// server/prisma/schema.prisma

model Game {
  characters Character[] @relation(onDelete: Cascade)
}

model Character {
  actions Action[] @relation(onDelete: Cascade)
}

model Action {
  video Video? @relation(onDelete: Cascade)
}
```

**删除顺序**:
- 删除游戏 → 所有角色 → 所有动作 → 所有视频
- 删除角色 → 所有动作 → 所有视频
- 删除动作 → 视频

### 七牛云清理

**场景**: 删除数据库记录时同步删除七牛云文件

```javascript
// server/src/routes/actions.ts
const action = await prisma.action.findUnique({
  where: { id: actionId },
  include: { video: true },
});

// 删除数据库记录
await prisma.action.delete({ where: { id: actionId } });

// 删除七牛云文件
if (action.video) {
  const keysToDelete = [
    action.video.qiniuKey,           // 视频文件
    extractKeyFromUrl(action.video.coverUrl) // 封面图
  ];
  await deleteMultipleFiles(keysToDelete);
}
```

---

## 🔍 同步检查工具

### 检查数据库与七牛云一致性

```bash
cd /home/tenbox/CKAnim/server
node scripts/sync-check.js
```

**输出**:
```
📊 数据库中有 3 个文件记录
☁️  七牛云中有 18 个文件
⚠️  发现 15 个孤文件（七牛云有但数据库无记录）
```

### 清理七牛云孤文件

```bash
# 预览模式（不实际删除）
node scripts/cleanup-qiniu-orphans.js

# 实际删除
node scripts/cleanup-qiniu-orphans.js --no-dry-run
```

### 清理数据库孤记录

```bash
# 删除没有视频的动作
node scripts/cleanup-actions-without-video.js
```

---

## 📋 当前状态（2026-03-19）

| 类型 | 数据库 | 七牛云 | 状态 |
|------|--------|--------|------|
| **视频文件** | 3 | 3 + 3 孤儿 | ⚠️ 需清理 |
| **封面图** | 0 | 0 | ✅ 同步 |
| **图标** | 0 | 12 孤儿 | ⚠️ 需清理 |

**孤文件列表**:
- `参考网站 2026/game-1/*.mp4` × 2（原神测试数据）
- `参考网站 2026/game-4/*.mp4` × 1（绝区零测试数据）
- `参考网站 2026/战士/game-3/*.mp4` × 2（盖伦旧数据）
- `参考网站 2026/icons/*` × 12（游戏/分类图标）

---

## ✅ 最佳实践

### 上传视频

1. **选择正确的角色和动作** - 确保层级关系正确
2. **使用批量上传** - 自动创建动作（文件名=动作名）
3. **验证上传结果** - 检查前台是否显示
4. **检查 published 状态** - 确保视频已发布

### 删除视频

1. **使用管理员后台删除** - 自动清理数据库和七牛云
2. **不要直接操作数据库** - 会导致七牛云文件残留
3. **不要直接操作七牛云** - 会导致数据库记录残留

### 更新动作

1. **在动作管理页面更新** - 自动同步到数据库
2. **刷新前台查看效果** - 名称立即更新
3. **不影响视频文件** - 七牛云文件不受影响

---

## 🚨 常见问题

### Q1: 七牛云文件比数据库多

**原因**: 直接删除了数据库记录，没有通过 API 删除

**解决**:
```bash
node scripts/cleanup-qiniu-orphans.js --no-dry-run
```

### Q2: 数据库记录比七牛云多

**原因**: 七牛云文件被手动删除或过期

**解决**:
```bash
node scripts/cleanup-actions-without-video.js
```

### Q3: 前台显示"未知动作"

**原因**: 动作没有关联视频

**解决**:
1. 检查动作是否有视频：`curl http://localhost:3002/api/characters/:id/actions`
2. 删除无视频的动作：`node scripts/cleanup-actions-without-video.js`
3. 重新上传视频

### Q4: 更新动作名称后前台不更新

**原因**: 浏览器缓存

**解决**:
1. 硬刷新：Ctrl+Shift+R
2. 清除浏览器缓存
3. 检查 API 返回：`curl http://localhost:3002/api/characters/:id/actions`

---

## 📝 相关文件

| 文件 | 说明 |
|------|------|
| `server/src/routes/videos.ts` | 视频 CRUD（上传、删除） |
| `server/src/routes/actions.ts` | 动作 CRUD（创建、更新、删除） |
| `server/scripts/sync-check.js` | 同步检查工具 |
| `server/scripts/cleanup-qiniu-orphans.js` | 清理七牛云孤文件 |
| `server/scripts/cleanup-actions-without-video.js` | 清理数据库孤记录 |
| `server/prisma/schema.prisma` | 数据库级联配置 |

---

## 🎯 同步原则

1. **以管理员后台为准** - 所有操作从后台发起
2. **自动同步** - 后台操作自动更新数据库和七牛云
3. **事务保证** - 关键操作使用数据库事务
4. **级联删除** - 删除父级自动删除子级
5. **定期检查** - 运行同步检查工具保持数据一致

---

**总结**: 通过 API 操作确保三者同步，定期运行检查工具清理孤数据！
