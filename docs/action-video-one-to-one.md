# CKAnim 动作 - 视频 1 对 1 关系

## 完成时间
2026-03-18 18:30

---

## 🎯 核心设计

### 层级关系
```
游戏 > 分类 > 角色 > 动作（1 个视频）
```

### 关键特性
1. ✅ **每个动作仅对应一个视频**（1 对 1 关系）
2. ✅ **上传视频时游戏、角色、动作必选**
3. ✅ **动作直接属于角色**（无中间表）
4. ✅ **删除级联**：角色 → 动作 → 视频

---

## 📊 数据库 Schema

### Action 表
```prisma
model Action {
  id          Int       @id @default(autoincrement())
  name        String
  code        String
  description String?
  order       Int       @default(0)
  published   Boolean   @default(false)
  
  // 关联到角色
  characterId Int
  character   Character @relation(..., onDelete: Cascade)
  
  // ⭐ 关联到视频（1 对 1）
  video Video?
  
  @@index([characterId])
}
```

### Video 表
```prisma
model Video {
  id       Int     @id @default(autoincrement())
  title    String
  gameId   Int
  game     Game    @relation(..., onDelete: Cascade)
  
  // ⭐ 关联到动作（1 对 1）
  actionId Int?    @unique  // ⭐ unique 约束确保 1 对 1
  action   Action? @relation(..., onDelete: Cascade)
  
  @@index([gameId])
  @@index([actionId])
}
```

---

## 🔧 后端验证逻辑

### 上传视频必选参数
```typescript
POST /api/admin/videos

请求体：
{
  "title": "盖伦攻击动画",      // ✅ 必选
  "gameId": 1,                  // ✅ 必选
  "characterId": 5,             // ✅ 必选 ⭐
  "actionId": 10,               // ✅ 必选 ⭐
  "qiniuKey": "video.mp4",      // ✅ 必选
  "qiniuUrl": "https://...",    // ✅ 必选
  "categoryIds": [1, 2],        // 可选
  "tagIds": [1],                // 可选
  "description": "...",         // 可选
  "generateCover": true         // 可选
}
```

### 后端验证流程
```typescript
// 1. 验证游戏
const game = await tx.game.findUnique({ where: { id: gameId } })
if (!game) throw new Error('Game not found')

// 2. 验证角色 ⭐
const character = await tx.character.findUnique({ where: { id: characterId } })
if (!character) throw new Error('Character not found')
if (character.gameId !== gameId) {
  throw new Error('Character does not belong to this game')
}

// 3. 验证动作 ⭐
const action = await tx.action.findUnique({ where: { id: actionId } })
if (!action) throw new Error('Action not found')
if (action.characterId !== characterId) {
  throw new Error('Action does not belong to this character')
}

// 4. 验证动作是否已有视频（1 对 1）⭐
if (action.video) {
  throw new Error('Action already has a video. Each action can only have one video.')
}

// 5. 创建视频（直接关联 actionId）
const video = await tx.video.create({
  data: {
    title,
    gameId,
    actionId, // ⭐ 直接关联
    qiniuKey,
    qiniuUrl,
    ...
  }
})
```

---

## 🎨 前端使用流程

### 1️⃣ 创建角色
```
访问：http://localhost:3003/characters
操作：
  1. 点击"➕ 新建角色"
  2. 选择游戏：英雄联盟
  3. 填写名称：盖伦
  4. 选择分类：战士
  5. 保存
```

### 2️⃣ 创建动作
```
访问：http://localhost:3003/actions
操作：
  1. 点击"➕ 新建动作"
  2. 选择角色：盖伦 ⭐ 必选
  3. 填写名称：攻击
  4. 填写代码：attack
  5. 保存
```

### 3️⃣ 上传视频 ⭐ 游戏、角色、动作必选
```
访问：http://localhost:3003/videos
操作：
  1. 选择游戏：英雄联盟 ⭐ 必选
  2. 点击"📤 上传视频"
  3. 选择角色：盖伦 ⭐ 必选（从下拉列表）
  4. 选择动作：攻击 ⭐ 必选（从下拉列表，已属于盖伦）
  5. 选择分类：（可选）
  6. 选择标签：（可选）
  7. 选择文件：garen-attack.mp4
  8. 点击"📤 开始上传"
```

**前端验证**：
```javascript
// 上传前验证
if (!selectedGame) {
  alert('请选择游戏')
  return
}
if (!selectedCharacter) {
  alert('请选择角色')
  return
}
if (!selectedAction) {
  alert('请选择动作')
  return
}
if (!file) {
  alert('请选择视频文件')
  return
}
```

---

## 📋 API 响应格式

### 获取动作列表（包含视频）
```javascript
GET /api/admin/actions?characterId=5

响应：
{
  "actions": [
    {
      "id": 10,
      "name": "攻击",
      "code": "attack",
      "characterId": 5,
      "character": {
        "id": 5,
        "name": "盖伦"
      },
      "video": {  // ⭐ 1 对 1 关系
        "id": 100,
        "title": "盖伦攻击动画",
        "qiniuUrl": "https://...",
        "coverUrl": "https://...",
        "duration": 1234
      }
    },
    {
      "id": 11,
      "name": "走位",
      "code": "walk",
      "characterId": 5,
      "character": {
        "id": 5,
        "name": "盖伦"
      },
      "video": null  // ⭐ 还没有视频
    }
  ]
}
```

### 获取角色详情（包含动作和视频）
```javascript
GET /api/characters/5

响应：
{
  "id": 5,
  "name": "盖伦",
  "game": {
    "id": 1,
    "name": "英雄联盟"
  },
  "actions": [
    {
      "id": 10,
      "name": "攻击",
      "code": "attack",
      "video": {  // ⭐ 1 对 1 关系
        "id": 100,
        "qiniuUrl": "https://...",
        "coverUrl": "https://...",
        "duration": 1234,
        "title": "盖伦攻击动画"
      }
    }
  ]
}
```

---

## 🗑️ 删除级联规则

### 删除角色
```
DELETE /api/admin/characters/5

级联删除：
  角色 (5)
    ↓
  所有动作 (10, 11, ...)
    ↓
  所有视频 (100, 101, ...)
    ↓
  七牛云文件清理（手动）
    - 角色头像：icons/character/5/*
    - 视频文件：*.mp4
    - 封面图：*-thumbnail.jpg
```

### 删除动作
```
DELETE /api/admin/actions/10

级联删除：
  动作 (10)
    ↓
  视频 (100)
    ↓
  七牛云文件清理（手动）
    - 视频文件：*.mp4
    - 封面图：*-thumbnail.jpg
```

---

## ⚠️ 错误处理

### 1. 未选择角色
```json
{
  "error": "Bad Request",
  "message": "characterId is required. Please select a character."
}
```

### 2. 未选择动作
```json
{
  "error": "Bad Request",
  "message": "actionId is required. Please select an action."
}
```

### 3. 动作已有视频（重复上传）
```json
{
  "error": "Bad Request",
  "message": "Action 攻击 already has a video. Each action can only have one video."
}
```

### 4. 角色不属于该游戏
```json
{
  "error": "Bad Request",
  "message": "Character 盖伦 does not belong to game 英雄联盟"
}
```

### 5. 动作不属于该角色
```json
{
  "error": "Bad Request",
  "message": "Action 攻击 does not belong to character 盖伦"
}
```

---

## 📁 相关文件

### 后端 ✅ 已完成
| 文件 | 变更 |
|------|------|
| `server/prisma/schema.prisma` | ✅ Action 表改为 `video Video?`（1 对 1）<br>✅ Video 表 `actionId` 添加 `@unique` |
| `server/src/routes/videos.ts` | ✅ 添加 characterId/actionId 必选验证<br>✅ 验证角色属于游戏、动作属于角色<br>✅ 验证动作没有视频（1 对 1）<br>✅ 创建视频时直接关联 actionId |
| `server/src/routes/actions.ts` | ✅ 返回动作时包含 `video`（而非 `videos`）<br>✅ 删除动作时级联删除视频 |
| `server/src/routes/public-characters.ts` | ✅ 返回角色时包含动作和视频（1 对 1） |

### 前端 ⏳ 待更新
| 文件 | 需要修改 |
|------|---------|
| `admin/src/pages/Actions.jsx` | ⏳ 添加角色选择器（创建动作时必选） |
| `admin/src/pages/Videos.jsx` | ⏳ 添加角色选择器（上传视频时必选）<br>⏳ 动作选择器根据角色筛选<br>⏳ 显示"角色名 - 动作名" |
| `admin/src/lib/services.js` | ⏳ 上传视频 API 添加 characterId 参数 |

---

## 🧪 测试步骤

### 1. 创建完整层级
```bash
# 创建游戏
curl -X POST http://localhost:3002/api/admin/games \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"name":"测试游戏","published":true}'

# 创建分类
curl -X POST http://localhost:3002/api/admin/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"name":"战士","gameId":1,"level":1}'

# 创建角色
curl -X POST http://localhost:3002/api/admin/characters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"name":"盖伦","gameId":1,"categoryId":1}'

# 创建动作
curl -X POST http://localhost:3002/api/admin/actions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"name":"攻击","code":"attack","characterId":1}'
```

### 2. 测试上传验证
```bash
# ❌ 不提供 characterId（应该失败）
curl -X POST http://localhost:3002/api/admin/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"title":"测试","gameId":1,"qiniuKey":"test.mp4","qiniuUrl":"https://..."}'

# ❌ 不提供 actionId（应该失败）
curl -X POST http://localhost:3002/api/admin/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"title":"测试","gameId":1,"characterId":1,"qiniuKey":"test.mp4","qiniuUrl":"https://..."}'

# ✅ 提供所有必选参数
curl -X POST http://localhost:3002/api/admin/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"title":"盖伦攻击","gameId":1,"characterId":1,"actionId":1,"qiniuKey":"test.mp4","qiniuUrl":"https://..."}'

# ❌ 再次上传到同一动作（应该失败 - 1 对 1）
curl -X POST http://localhost:3002/api/admin/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"title":"盖伦攻击 2","gameId":1,"characterId":1,"actionId":1,"qiniuKey":"test2.mp4","qiniuUrl":"https://..."}'
```

### 3. 测试前台播放
```bash
# 获取角色详情（包含动作和视频）
curl http://localhost:3002/api/characters/1

# 预期响应包含：
# {
#   "name": "盖伦",
#   "actions": [
#     {
#       "name": "攻击",
#       "video": {
#         "qiniuUrl": "https://...",
#         "coverUrl": "https://..."
#       }
#     }
#   ]
# }
```

---

## 🎯 设计优势

### 1. 简化数据结构
- ❌ 旧设计：`videos: Video[]`（一对多，复杂）
- ✅ 新设计：`video: Video?`（一对一，简单）

### 2. 明确业务逻辑
- ✅ 每个动作只有一个视频（符合动画参考网站定位）
- ✅ 上传流程清晰：游戏 → 角色 → 动作 → 视频
- ✅ 删除级联简单：角色 → 动作 → 视频

### 3. 提高数据质量
- ✅ 数据库 `@unique` 约束防止重复
- ✅ 后端验证确保层级关系正确
- ✅ 前端验证提供友好提示

### 4. 优化用户体验
- ✅ 动作管理页面显示"所属角色"和"视频数量"（0 或 1）
- ✅ 上传视频时按角色筛选动作（避免混乱）
- ✅ 前台播放时直接获取动作的视频（无需遍历数组）

---

## ⏳ 下一步工作

1. **更新前端动作管理页面**
   - [ ] 添加角色选择器（创建动作时必选）
   - [ ] 动作列表显示所属角色
   - [ ] 动作列表显示视频状态（有/无）

2. **更新前端视频上传页面**
   - [ ] 添加角色选择器（上传时必选）
   - [ ] 动作选择器根据角色筛选
   - [ ] 显示"角色名 - 动作名"
   - [ ] 添加前端验证（游戏、角色、动作必选）

3. **测试完整流程**
   - [ ] 创建角色
   - [ ] 创建动作（绑定角色）
   - [ ] 上传视频（关联动作）
   - [ ] 验证前台播放
   - [ ] 测试删除级联

---

**状态**: ✅ 后端完成，数据库已迁移，前端待更新  
**数据库**: `rm -rf prisma/migrations prisma/dev.db && npx prisma migrate dev --name init`  
**测试脚本**: `test-action-video-one-to-one.sh`
