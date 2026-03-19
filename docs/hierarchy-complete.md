# CKAnim 层级关系梳理完成

## 完成时间
2026-03-18 17:30

---

## 层级结构

```
游戏 (Game) ──┬── 分类 (GameCategory) ──┬── 子分类（多级）
              │                         └── 角色 (Character) ──┬── 动作关联 (CharacterAction) ──┬── 视频 (Video)
              │                                                │                                └── 封面图
              │                                                └── 头像
              │
              ├── 视频 (Video) [直接关联]
              └── 图标
```

---

## 各层级职责

| 层级 | 模型 | 职责 | 示例 |
|------|------|------|------|
| **1️⃣ 游戏** | `Game` | 最父级，游戏容器 | 英雄联盟、原神 |
| **2️⃣ 分类** | `GameCategory` | 给角色分类，便于查找 | 战士、法师、刺客 |
| **3️⃣ 角色** | `Character` | 用户选择想看的角色 | 盖伦、安妮 |
| **4️⃣ 动作** | `Action` | 全局动作定义 | 攻击、走位、技能 |
| **5️⃣ 关联** | `CharacterAction` | 角色与动作的关联，存储视频 | 盖伦的攻击动作 |
| **6️⃣ 视频** | `Video` | 实际视频文件 | 盖伦攻击动画.mp4 |

---

## 删除级联规则

### 数据库级联（自动）

| 删除对象 | 级联删除 |
|---------|---------|
| **游戏** | ✅ 所有分类、所有角色、所有视频、所有 CharacterAction |
| **分类** | ✅ 所有子分类、该分类下的所有角色 |
| **角色** | ✅ 所有 CharacterAction 关联 |
| **动作** | ✅ 所有 CharacterAction 关联 |
| **CharacterAction** | ✅ 关联的视频 |

### 七牛云文件清理（后端手动）

| 删除对象 | 需清理的文件 |
|---------|-------------|
| **游戏** | 游戏图标 `icons/game/{id}/*` |
| **分类** | 分类图标 `icons/category/{id}/*` |
| **角色** | 角色头像 `icons/character/{id}/*` |
| **视频** | 视频文件 `.mp4` + 封面图 `-thumbnail.jpg` |

---

## 已实现功能

### ✅ 1. 数据库 Schema 优化

**文件**: `server/prisma/schema.prisma`

**改进**:
- 明确标注层级关系注释
- 添加 `onDelete: Cascade` 确保数据库级联
- 角色分类使用 `onDelete: SetNull`（删除分类不删除角色）
- CharacterAction 删除时级联删除视频

### ✅ 2. 七牛云批量删除功能

**文件**: `server/src/lib/qiniu.ts`

**新增函数**:
- `deleteMultipleFiles(keys: string[])` - 批量删除七牛云文件
- `extractKeyFromUrl(url: string)` - 从 URL 提取文件 key

**代码示例**:
```typescript
// 批量删除文件
await deleteMultipleFiles([
  '参考网站 2026/icons/game/1/xxx.png',
  '参考网站 2026/video.mp4',
  '参考网站 2026/video-thumbnail.jpg',
]);
```

### ✅ 3. 游戏删除路由（含文件清理）

**文件**: `server/src/routes/games.ts`

**功能**:
1. 获取游戏及其所有关联数据（分类、角色、视频）
2. 递归收集所有七牛云文件 key（游戏图标、分类图标、角色头像、视频、封面图）
3. 删除数据库记录（级联）
4. 批量删除七牛云文件
5. 详细日志记录

**路由**: `DELETE /api/admin/games/:id`

**代码流程**:
```typescript
// 1. 获取完整游戏数据
const game = await prisma.game.findUnique({
  include: {
    categories: { include: { children: {...} } },
    characters: { include: { actions: { include: { video: true } } } },
    videos: true,
  },
});

// 2. 收集七牛云文件 key
const keysToDelete: string[] = [];
// - 游戏图标
// - 分类图标（递归）
// - 角色头像
// - 视频文件
// - 封面图

// 3. 删除数据库
await prisma.game.delete({ where: { id: gameId } });

// 4. 批量删除七牛云
await deleteMultipleFiles(keysToDelete);
```

---

## 待实现功能

### ⏳ 1. 角色删除路由

**需要**: `DELETE /api/admin/characters/:id`

**功能**:
- 删除角色
- 级联删除 CharacterAction 和视频
- 清理角色头像、视频文件、封面图

### ⏳ 2. 分类删除路由

**需要**: `DELETE /api/admin/categories/:id`

**功能**:
- 删除分类
- 级联删除子分类和角色
- 清理分类图标

### ⏳ 3. 视频删除路由优化

**当前**: 已存在 `DELETE /api/admin/videos/:id`

**需要优化**:
- 确保删除 CharacterAction 关联
- 清理视频文件和封面图

---

## 七牛云文件路径规范

### 图标类
```
参考网站 2026/icons/game/{gameId}/{timestamp}-{random}.png
参考网站 2026/icons/category/{categoryId}/{timestamp}-{random}.png
参考网站 2026/icons/character/{characterId}/{timestamp}-{random}.png
```

### 视频类
```
参考网站 2026/{分类路径}/game-{gameId}/{timestamp}-{random}.mp4
参考网站 2026/{分类路径}/game-{gameId}/{timestamp}-{random}-thumbnail.jpg
```

---

## 测试步骤

### 测试游戏删除

1. **准备测试数据**
   ```bash
   cd /home/tenbox/CKAnim/server
   npx tsx prisma/seed.ts
   ```

2. **上传测试文件**
   - 上传游戏图标
   - 上传分类图标
   - 创建角色并上传头像
   - 上传视频（带封面图）

3. **删除游戏**
   ```bash
   curl -X DELETE http://localhost:3002/api/admin/games/1 \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

4. **验证数据库**
   ```bash
   npx tsx -e "
   import { PrismaClient } from '@prisma/client';
   const p = new PrismaClient();
   p.game.findUnique({ where: { id: 1 } })
     .then(r => console.log('Game exists:', r !== null))
     .finally(() => p.\$disconnect())
   "
   ```
   应该显示 `Game exists: false`

5. **验证七牛云文件**
   - 访问之前的图标/视频 URL
   - 应该返回 404

---

## 关键设计决策

### 1. 为什么动作是全局的？

**原因**:
- 不同游戏可能有相同动作（攻击、走位、技能）
- 动作可以复用，减少数据冗余
- 通过 CharacterAction 实现灵活关联

### 2. 为什么 CharacterAction 单独成表？

**原因**:
- 角色和动作是多对多关系
- 需要在关联上存储额外数据（videoId、order、published）
- 便于查询"某个角色的所有动作"

### 3. 为什么视频既关联游戏又关联 CharacterAction？

**原因**:
- 关联游戏：便于按游戏筛选视频
- 关联 CharacterAction：便于按角色 + 动作查询视频
- 双重关联提高查询灵活性

### 4. 为什么分类删除使用 SetNull 而非 Cascade？

**原因**:
- 删除分类不应该删除角色
- 角色的分类可以设为 null
- 保持数据完整性

---

## 性能优化

### 1. 索引
```prisma
@@index([gameId])           // 游戏相关查询
@@index([parentId])          // 分类层级查询
@@index([categoryId])        // 角色分类查询
@@index([characterId])       // 角色动作查询
@@index([actionId])          // 动作角色查询
```

### 2. 批量删除
- 使用七牛云 `batch` 接口批量删除
- 避免多次 HTTP 请求
- 提高删除效率

### 3. 事务处理
- 视频上传使用 Prisma 事务
- 确保数据一致性

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `server/prisma/schema.prisma` | 数据库 Schema（已优化） |
| `server/src/lib/qiniu.ts` | 七牛云工具（新增批量删除） |
| `server/src/routes/games.ts` | 游戏路由（新增删除） |
| `docs/hierarchy.md` | 完整层级关系文档 |

---

## 下一步

1. **测试游戏删除功能** - 验证数据库级联和七牛云清理
2. **实现角色删除路由** - 添加 `DELETE /api/admin/characters/:id`
3. **实现分类删除路由** - 添加 `DELETE /api/admin/categories/:id`
4. **优化视频删除路由** - 确保 CharacterAction 关联被清理
5. **前端添加删除确认** - 删除前提示用户将删除的所有内容

---

**完成状态**: ✅ 基础架构完成，游戏删除已实现
**下一步**: 测试删除功能，实现其他删除路由
