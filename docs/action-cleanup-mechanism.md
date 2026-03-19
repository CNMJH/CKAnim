# 动作清理机制

## 问题背景

在批量上传视频时，可能会创建一些没有关联视频的动作（测试数据、上传失败等）。这些无效动作会导致：

1. **前台显示"未知动作"** - API 返回动作但没有视频
2. **数据库污染** - 无效数据累积
3. **用户体验差** - 点击动作无法播放视频

## 解决方案

### 1️⃣ 前端过滤（已实现）

**文件**: `src/pages/Games.jsx`

```javascript
{characterActions
  .filter(charAction => charAction.video) // ⭐ 只显示有视频的动作
  .map((charAction) => (
    <button key={charAction.id} ...>
      {charAction.name}
    </button>
  ))}
```

**效果**: 前台只显示有视频的动作，用户看不到无效数据。

### 2️⃣ 后端清理脚本（新增）

**文件**: `server/scripts/cleanup-actions-without-video.js`

**功能**:
- 查找所有 `video: null` 的动作
- 按角色分组显示
- 批量删除无效动作
- 保持数据库整洁

**使用**:
```bash
cd /home/tenbox/CKAnim/server
node scripts/cleanup-actions-without-video.js
```

**输出示例**:
```
🔍 查找没有视频的动作...

📋 找到 7 个没有视频的动作:

  原神 > 迪卢克:
    - 攻击
  英雄联盟 > 潘森:
    - 安娜
    - 原版_batch
  英雄联盟 > 盖伦:
    - 安娜
    - 原版_batch

🗑️  正在删除...

✅ 已删除 7 个动作

✨ 清理完成！
```

### 3️⃣ 数据库级联删除（已配置）

**文件**: `server/prisma/schema.prisma`

```prisma
model Action {
  characterId Int
  character   Character @relation(..., onDelete: Cascade)
  video       Video?    // 1 对 1 关系
}

model Video {
  actionId Int?     @unique
  action   Action?  @relation(..., onDelete: Cascade)
}
```

**效果**:
- 删除角色 → 自动删除所有动作 → 自动删除所有视频
- 删除动作 → 自动删除视频
- 七牛云文件 → 后端路由手动清理

### 4️⃣ 视频默认发布（已修复）

**文件**: `server/src/routes/videos.ts`

```javascript
const video = await tx.video.create({
  data: {
    // ...
    published: true, // ⭐ 默认发布，前台可访问
    actionId,
  },
});
```

**效果**: 新上传的视频默认可见，无需手动发布。

## 最佳实践

### ✅ 推荐做法

1. **上传前检查** - 确保选择正确的角色和动作
2. **批量上传** - 使用动作管理页面的批量上传功能
3. **定期清理** - 运行清理脚本保持数据库整洁
4. **前端过滤** - 始终只显示有视频的动作

### ❌ 避免做法

1. **手动创建动作** - 使用批量上传自动创建
2. **删除视频保留动作** - 动作和视频应该同生共死
3. **忽略 published 字段** - 确保视频设置为已发布

## 自动化建议

### 方案 1: 定时清理（推荐）

添加 cron 任务，每天凌晨清理：

```bash
# /etc/crontab
0 3 * * * cd /home/tenbox/CKAnim/server && node scripts/cleanup-actions-without-video.js >> /var/log/ckanim-cleanup.log 2>&1
```

### 方案 2: 上传后清理

在视频上传成功后自动清理无效动作：

```javascript
// server/src/routes/videos.ts
await prisma.action.deleteMany({
  where: {
    video: null,
    characterId,
    createdAt: { lt: new Date(Date.now() - 3600000) }, // 1 小时前的
  },
});
```

### 方案 3: 数据库约束（未来）

添加数据库触发器，自动删除没有视频的动作：

```sql
-- SQLite 触发器（伪代码）
CREATE TRIGGER cleanup_empty_actions
AFTER UPDATE ON Video
WHEN OLD.actionId IS NOT NULL AND NEW.actionId IS NULL
BEGIN
  DELETE FROM Action WHERE id = OLD.actionId;
END;
```

## 验证步骤

1. **检查数据库**:
   ```bash
   node scripts/cleanup-actions-without-video.js
   ```

2. **验证前台**:
   - 访问 http://localhost:5173/games
   - 选择游戏 → 角色
   - 确认动作按钮都有视频（点击可播放）

3. **验证 API**:
   ```bash
   curl http://localhost:3002/api/characters/:id/actions
   # 所有动作的 video 字段都不为 null
   ```

## 清理记录

| 日期 | 清理数量 | 备注 |
|------|---------|------|
| 2026-03-19 | 7 个 | 测试数据清理（安娜、原版_batch 等） |

## 相关文件

- `server/scripts/cleanup-actions-without-video.js` - 清理脚本
- `src/pages/Games.jsx` - 前端过滤逻辑
- `server/src/routes/videos.ts` - 视频创建（published: true）
- `server/src/routes/actions.ts` - 动作删除（级联清理七牛云）
- `server/prisma/schema.prisma` - 数据库级联配置
