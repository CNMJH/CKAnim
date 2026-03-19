# CKAnim 内容层级关系

## 层级结构

```
游戏 (Game)
├── 分类 (GameCategory)
│   └── 角色 (Character)
│       └── 动作关联 (CharacterAction)
│           └── 视频 (Video)
├── 视频 (Video) [直接关联]
└── 角色 (Character) [直接关联]
```

---

## 各层级说明

### 1️⃣ 游戏 (Game) - 最父级

**作用**：游戏的容器，如"英雄联盟"、"原神"等

**字段**：
- `name` - 游戏名称（唯一）
- `description` - 游戏描述
- `iconUrl` - 游戏图标（七牛云）
- `order` - 排序
- `published` - 是否发布

**子级**：
- `categories` - 游戏分类
- `characters` - 游戏角色
- `videos` - 游戏视频

**删除行为**：
- ✅ 级联删除所有分类
- ✅ 级联删除所有角色
- ✅ 级联删除所有视频
- ✅ 级联删除所有 CharacterAction 关联
- ⚠️ **后端需手动删除七牛云文件**（图标、视频、封面图）

---

### 2️⃣ 分类 (GameCategory) - 游戏的子级

**作用**：给角色分类，便于用户查找特定角色

**字段**：
- `name` - 分类名称
- `iconUrl` - 分类图标（七牛云）
- `level` - 分类层级（1-7 级）
- `order` - 排序
- `parentId` - 父分类 ID（支持多级分类）

**子级**：
- `children` - 子分类（自关联）
- `characters` - 该分类下的角色

**删除行为**：
- ✅ 级联删除所有子分类
- ✅ 级联删除该分类下的所有角色
- ✅ 级联删除角色的 CharacterAction 关联
- ✅ 级联删除 CharacterAction 关联的视频
- ⚠️ **后端需手动删除七牛云文件**（图标）

---

### 3️⃣ 角色 (Character) - 分类的子级

**作用**：用户选择想看的角色

**字段**：
- `name` - 角色名称
- `avatar` - 角色头像（七牛云）
- `description` - 角色描述
- `gameId` - 所属游戏
- `categoryId` - 所属分类（可选）
- `order` - 排序
- `published` - 是否发布

**子级**：
- `actions` - 角色的动作关联（通过 CharacterAction）

**删除行为**：
- ✅ 级联删除所有 CharacterAction 关联
- ✅ 级联删除关联的视频
- ⚠️ **后端需手动删除七牛云文件**（头像）

---

### 4️⃣ 动作 (Action) - 全局定义

**作用**：定义动作类型，不直接属于某个角色

**字段**：
- `name` - 动作名称（如"攻击"、"走位"）
- `code` - 动作代码（如"attack"、"walk"）
- `description` - 动作描述
- `order` - 排序
- `published` - 是否发布

**关联**：
- `characters` - 通过 CharacterAction 关联到角色

**删除行为**：
- ✅ 级联删除所有 CharacterAction 关联
- ✅ 级联删除关联的视频
- ⚠️ **无七牛云文件**

---

### 5️⃣ 角色动作关联 (CharacterAction) - 核心关联表

**作用**：角色与动作的多对多关系，存储视频关联

**字段**：
- `characterId` - 角色 ID
- `actionId` - 动作 ID
- `videoId` - 视频 ID（可选）
- `videoUrl` - 视频 URL 备份
- `order` - 排序
- `published` - 是否发布

**关联**：
- `character` - 关联的角色
- `action` - 关联的动作
- `video` - 关联的视频

**删除行为**：
- ✅ 级联删除关联的视频
- ⚠️ **后端需手动删除七牛云文件**（视频、封面图）

**唯一约束**：
- `(characterId, actionId)` - 每个角色的每个动作只能有一个关联

---

### 6️⃣ 视频 (Video) - 动作的子级

**作用**：实际存储视频文件

**字段**：
- `title` - 视频标题
- `description` - 视频描述
- `duration` - 视频时长（秒）
- `coverUrl` - 封面图 URL（七牛云）
- `qiniuKey` - 七牛云文件 key
- `qiniuUrl` - 七牛云视频 URL
- `order` - 排序
- `published` - 是否发布

**关联**：
- `game` - 所属游戏
- `categories` - 所属分类（用于筛选）
- `tags` - 标签（用于搜索）
- `characterActions` - 关联的角色动作

**删除行为**：
- ⚠️ **后端需手动删除七牛云文件**（视频、封面图）

---

## 删除级联规则

### 数据库级联（自动）

| 删除对象 | 级联删除 |
|---------|---------|
| **游戏** | 所有分类、所有角色、所有视频 |
| **分类** | 所有子分类、该分类下的所有角色 |
| **角色** | 所有 CharacterAction 关联 |
| **动作** | 所有 CharacterAction 关联 |
| **CharacterAction** | 关联的视频 |

### 后端手动清理（七牛云文件）

| 删除对象 | 需清理的七牛云文件 |
|---------|------------------|
| **游戏** | 游戏图标 `icons/game/{id}/*` |
| **分类** | 分类图标 `icons/category/{id}/*` |
| **角色** | 角色头像 `icons/character/{id}/*` |
| **视频/CharacterAction** | 视频文件、封面图 |

---

## 七牛云文件路径规范

### 游戏图标
```
参考网站 2026/icons/game/{gameId}/{timestamp}-{random}.png
```

### 分类图标
```
参考网站 2026/icons/category/{categoryId}/{timestamp}-{random}.png
```

### 角色头像
```
参考网站 2026/icons/character/{characterId}/{timestamp}-{random}.png
```

### 视频文件
```
参考网站 2026/{分类路径}/game-{gameId}/{timestamp}-{random}.mp4
```

### 封面图
```
参考网站 2026/{分类路径}/game-{gameId}/{timestamp}-{random}-thumbnail.jpg
```

---

## 删除流程示例

### 删除游戏（最复杂）

```typescript
// 1. 获取游戏所有数据
const game = await prisma.game.findUnique({
  where: { id: gameId },
  include: {
    categories: true,
    characters: { include: { actions: true } },
    videos: true,
  },
});

// 2. 收集所有七牛云文件 key
const keysToDelete: string[] = [];

// 游戏图标
if (game.iconUrl) {
  keysToDelete.push(extractQiniuKey(game.iconUrl));
}

// 分类图标
game.categories.forEach(cat => {
  if (cat.iconUrl) keysToDelete.push(extractQiniuKey(cat.iconUrl));
});

// 角色头像
game.characters.forEach(char => {
  if (char.avatar) keysToDelete.push(extractQiniuKey(char.avatar));
});

// 视频和封面图
game.videos.forEach(video => {
  keysToDelete.push(video.qiniuKey);
  if (video.coverUrl) keysToDelete.push(extractQiniuKey(video.coverUrl));
});

// 3. 删除数据库记录（级联）
await prisma.game.delete({ where: { id: gameId } });

// 4. 删除七牛云文件
await qiniu.deleteMultiple(keysToDelete);
```

### 删除角色

```typescript
// 1. 获取角色数据
const character = await prisma.character.findUnique({
  where: { id: characterId },
  include: {
    actions: { include: { video: true } },
  },
});

// 2. 收集七牛云文件 key
const keysToDelete: string[] = [];

// 角色头像
if (character.avatar) {
  keysToDelete.push(extractQiniuKey(character.avatar));
}

// 视频和封面图
character.actions.forEach(ca => {
  if (ca.video) {
    keysToDelete.push(ca.video.qiniuKey);
    if (ca.video.coverUrl) {
      keysToDelete.push(extractQiniuKey(ca.video.coverUrl));
    }
  }
});

// 3. 删除数据库记录（级联 CharacterAction 和视频）
await prisma.character.delete({ where: { id: characterId } });

// 4. 删除七牛云文件
await qiniu.deleteMultiple(keysToDelete);
```

---

## 前端管理页面

| 管理页面 | 路由 | 功能 |
|---------|------|------|
| 游戏管理 | `/games` | 创建/编辑/删除游戏，上传图标 |
| 分类管理 | `/categories` | 创建/编辑/删除分类，支持多级 |
| 角色管理 | `/characters` | 创建/编辑/删除角色，选择分类 |
| 动作管理 | `/actions` | 创建/编辑/删除动作 |
| 视频管理 | `/videos` | 上传视频，关联角色 + 动作 |

---

## 前台展示流程

### 用户访问流程

1. **选择游戏** → `/games` → 显示游戏列表
2. **选择角色分类** → 显示该游戏的分类按钮
3. **选择角色** → 显示该分类下的角色
4. **选择动作** → 显示该角色的动作按钮
5. **播放视频** → 点击动作按钮播放对应视频

### API 调用

```javascript
// 1. 获取游戏列表
GET /api/games

// 2. 获取游戏详情（包含分类）
GET /api/games/:id

// 3. 获取分类下的角色
GET /api/characters?gameId=1&categoryId=2

// 4. 获取角色的动作
GET /api/characters/:id/actions

// 5. 播放视频
// 从动作数据中获取 video.qiniuUrl
```

---

## 关键设计决策

### 1. 为什么动作是全局的？

**原因**：
- 不同游戏可能有相同的动作（如"攻击"、"走位"）
- 动作名称和代码可以复用
- 通过 CharacterAction 实现角色与动作的多对多关系

### 2. 为什么 CharacterAction 单独成表？

**原因**：
- 角色和动作是多对多关系
- 需要在关联上存储额外数据（videoId、order、published）
- 便于查询"某个角色的所有动作"

### 3. 为什么视频既关联游戏又关联 CharacterAction？

**原因**：
- 关联游戏：便于按游戏筛选视频
- 关联 CharacterAction：便于按角色 + 动作查询视频
- 双重关联提高查询灵活性

### 4. 为什么分类支持 7 级？

**原因**：
- 不同游戏分类深度不同
- 英雄联盟：游戏 → 职业（战士/法师）
- 原神：游戏 → 分类（战斗/表演） → 元素（火/冰/风）
- 支持深度分类便于扩展

---

## 数据完整性保障

### 1. 数据库约束

- **唯一约束**：
  - `Game.name` - 游戏名称唯一
  - `VideoTag.name` - 标签名称唯一
  - `Character.gameId + Character.name` - 同一游戏内角色名称唯一
  - `CharacterAction.characterId + CharacterAction.actionId` - 角色动作配对唯一

- **外键约束**：
  - 所有外键都有 `onDelete: Cascade` 或 `onDelete: SetNull`
  - 确保删除父级时子级正确处理

### 2. 后端验证

- 创建角色时验证游戏存在
- 创建 CharacterAction 时验证角色和动作存在
- 上传视频时验证游戏、角色、动作存在

### 3. 前端验证

- 上传视频时必须选择游戏、角色、动作
- 删除前确认提示
- 删除后刷新列表

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

### 2. 查询优化

```typescript
// 使用 include 一次性获取关联数据
const character = await prisma.character.findUnique({
  where: { id: characterId },
  include: {
    actions: {
      include: {
        action: true,
        video: true,
      },
    },
  },
});
```

### 3. 缓存策略

- 游戏列表缓存（变化少）
- 角色动作列表缓存（变化中等）
- 视频 URL 不缓存（CDN 已缓存）

---

**文档版本**：v1.0.0
**更新时间**：2026-03-18
**维护者**：CKAnim 团队
