# CKAnim 新层级关系 - 动作绑定角色

## 完成时间
2026-03-18 18:00

---

## 🎯 核心变更

### 旧设计（已废弃）
```
动作 (Action) - 全局定义 ❌
  ├── 攻击 (attack) - 所有角色共享
  └── 走位 (walk) - 所有角色共享

角色 (Character) - 独立存在
  └── 盖伦

角色动作关联 (CharacterAction) - 中间表 ❌
  └── 盖伦 + 攻击 + 视频
```

**问题**:
- ❌ 动作管理页面显示所有动作，非常混乱
- ❌ 无法快速找到"盖伦的动作"
- ❌ 动作与角色关系不清晰

---

### 新设计（当前）
```
游戏 > 分类 > 角色 > 动作 > 视频 ✅
```

**层级关系**:
```
游戏 (Game)
├── 分类 (GameCategory)
│   └── 角色 (Character)
│       └── 动作 (Action) ← 直接属于角色
│           └── 视频 (Video)
└── 视频 (Video) [直接关联]
```

**优点**:
- ✅ 动作直接属于角色，管理清晰
- ✅ 每个角色有自己的动作列表
- ✅ 动作管理页面可以按角色筛选
- ✅ 删除角色时自动删除所有动作和视频

---

## 📊 数据库 Schema 变更

### 删除的表
- ❌ `CharacterAction` - 角色动作关联表（已删除）

### 修改的表

#### Action 表
```prisma
model Action {
  id          Int      @id @default(autoincrement())
  name        String
  code        String
  description String?
  order       Int      @default(0)
  published   Boolean  @default(false)
  
  // 新增：直接关联到角色
  characterId Int
  character Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  
  // 新增：关联视频
  videos Video[]
  
  @@index([characterId])
  @@map("actions")
}
```

#### Video 表
```prisma
model Video {
  // ... 其他字段
  
  // 新增：直接关联到动作
  actionId   Int?
  action     Action? @relation(fields: [actionId], references: [id], onDelete: Cascade)
  
  @@index([actionId])
  @@map("videos")
}
```

#### Character 表
```prisma
model Character {
  // ... 其他字段
  
  // 修改：直接关联动作（而非通过中间表）
  actions Action[]
  
  @@map("characters")
}
```

---

## 🔧 后端路由变更

### 新增路由

#### 动作管理（需要认证）
```
GET    /api/admin/actions?characterId=1  - 获取动作列表（支持按角色筛选）
POST   /api/admin/actions                - 创建动作（必须选择角色）
PUT    /api/admin/actions/:id            - 更新动作
DELETE /api/admin/actions/:id            - 删除动作（级联删除视频）
```

#### 公开动作 API
```
GET /api/actions?characterId=1  - 获取动作列表（支持按角色筛选）
```

### 修改的路由

#### 角色详情（包含动作）
```
GET /api/characters/:id
GET /api/characters/:id/actions
```

**返回数据**:
```json
{
  "characterId": 1,
  "characterName": "盖伦",
  "actions": [
    {
      "id": 1,
      "name": "攻击",
      "code": "attack",
      "description": "普通攻击",
      "order": 0,
      "videos": [
        {
          "id": 1,
          "qiniuUrl": "https://...",
          "coverUrl": "https://...",
          "duration": 123,
          "title": "盖伦攻击"
        }
      ]
    }
  ]
}
```

---

## 🎨 前端变更

### 动作管理页面

#### 创建动作时必须选择角色
```jsx
<div className="form-group">
  <label>选择角色 *</label>
  <select
    value={selectedCharacter?.id || ''}
    onChange={(e) => setSelectedCharacterId(parseInt(e.target.value))}
  >
    <option value="">请选择角色</option>
    {characters?.map(char => (
      <option key={char.id} value={char.id}>
        {char.name}
      </option>
    ))}
  </select>
</div>

<div className="form-group">
  <label>名称 *</label>
  <input
    type="text"
    value={formData.name}
    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
    placeholder="如：攻击、走位"
  />
</div>
```

#### 动作列表显示角色信息
```jsx
{actions?.map(action => (
  <tr key={action.id}>
    <td>{action.id}</td>
    <td>{action.name}</td>
    <td>{action.code}</td>
    <td>{action.character?.name}</td> {/* 新增：显示所属角色 */}
    <td>{action.videos?.length || 0}</td> {/* 新增：显示视频数量 */}
    <td>
      <button onClick={() => handleEdit(action)}>编辑</button>
      <button onClick={() => handleDelete(action.id)}>删除</button>
    </td>
  </tr>
))}
```

---

## 📋 使用流程

### 创建角色动作视频

#### 1️⃣ 创建角色
```
访问：http://localhost:3003/characters
操作：点击"➕ 新建角色"
填写：
  - 名称：盖伦
  - 游戏：英雄联盟
  - 分类：战士
  - 头像：（可选）
  - 描述：德玛西亚之力
```

#### 2️⃣ 创建动作（必须选择角色）⭐
```
访问：http://localhost:3003/actions
操作：点击"➕ 新建动作"
填写：
  - 选择角色：盖伦 ⭐ 必选
  - 名称：攻击
  - 代码：attack
  - 描述：普通攻击动作
  - 排序：0
  - 发布：✅ 勾选
```

#### 3️⃣ 上传视频（关联到动作）
```
访问：http://localhost:3003/videos
操作：
  1. 选择游戏：英雄联盟
  2. 点击"📤 上传视频"
  3. 选择动作：盖伦 - 攻击 ⭐
  4. 选择分类：（可选）
  5. 选择文件：garen-attack.mp4
  6. 点击"📤 开始上传"
```

**注意**：
- ✅ 上传视频时选择动作，视频自动关联到该动作
- ✅ 一个动作可以有多个视频（如多个攻击动画）
- ✅ 删除动作时，所有关联的视频会被级联删除

---

## 🔍 动作管理页面功能

### 按角色筛选
```
访问：http://localhost:3003/actions

默认显示：所有角色的所有动作
筛选后：只显示盖伦的动作
```

**实现**:
```javascript
// 获取动作列表时传递 characterId 参数
const { data: actionsData } = useQuery({
  queryKey: ['actions', selectedCharacter?.id],
  queryFn: async () => {
    const response = await actionsAPI.getAll({
      characterId: selectedCharacter?.id
    })
    return response.data.actions || []
  },
})
```

### 显示信息
| 列名 | 说明 |
|------|------|
| ID | 动作 ID |
| 名称 | 动作名称（如"攻击"） |
| 代码 | 动作代码（如"attack"） |
| 所属角色 | 动作属于哪个角色 ⭐ 新增 |
| 视频数量 | 该动作有多少个视频 ⭐ 新增 |
| 状态 | 已发布/未发布 |
| 操作 | 编辑、删除 |

---

## 🗑️ 删除级联规则

### 删除角色
```
删除角色
  ↓
级联删除所有动作
  ↓
级联删除所有视频
  ↓
清理七牛云文件（角色头像、视频、封面图）
```

### 删除动作
```
删除动作
  ↓
级联删除所有视频
  ↓
清理七牛云文件（视频、封面图）
```

### 删除视频
```
删除视频
  ↓
清理七牛云文件（视频、封面图）
```

---

## 📁 相关文件

### 后端
| 文件 | 说明 |
|------|------|
| `server/prisma/schema.prisma` | 数据库 Schema（已更新） |
| `server/src/routes/actions.ts` | 动作路由（新建） |
| `server/src/routes/characters.ts` | 角色路由（已更新） |
| `server/src/routes/videos.ts` | 视频路由（已更新） |
| `server/src/routes/public-characters.ts` | 公开角色路由（已更新） |
| `server/src/index.ts` | 路由注册（已更新） |

### 前端（待更新）
| 文件 | 状态 |
|------|------|
| `admin/src/pages/Actions.jsx` | ⏳ 需要更新（添加角色选择） |
| `admin/src/pages/Videos.jsx` | ⏳ 需要更新（改为选择动作） |
| `admin/src/lib/services.js` | ⏳ 需要更新（API 参数） |

---

## ⏳ 下一步工作

### 1. 更新前端动作管理页面
- [ ] 添加角色选择器（创建动作时必选）
- [ ] 动作列表显示所属角色
- [ ] 动作列表显示视频数量
- [ ] 支持按角色筛选动作

### 2. 更新前端视频上传页面
- [ ] 改为选择动作（而非角色 + 动作）
- [ ] 动作选择器显示"角色名 - 动作名"
- [ ] 移除角色选择器

### 3. 测试完整流程
- [ ] 创建角色
- [ ] 创建动作（绑定角色）
- [ ] 上传视频（关联动作）
- [ ] 前台播放验证
- [ ] 删除测试（级联删除）

---

## 🎯 设计总结

### 为什么这样设计？

#### 1. 动作直接属于角色
**原因**:
- ✅ 管理清晰 - 每个角色有自己的动作列表
- ✅ 易于筛选 - 动作管理页面可以按角色筛选
- ✅ 删除方便 - 删除角色时自动删除所有动作

#### 2. 视频直接关联动作
**原因**:
- ✅ 关系简单 - 视频 → 动作 → 角色
- ✅ 查询高效 - 不需要中间表
- ✅ 级联删除 - 删除动作时自动删除视频

#### 3. 删除 CharacterAction 中间表
**原因**:
- ✅ 简化结构 - 减少一层关联
- ✅ 减少冗余 - 不需要额外的关联表
- ✅ 提高性能 - 少一次 JOIN 查询

---

## 🧪 测试步骤

### 1. 创建测试数据
```bash
cd /home/tenbox/CKAnim/server
npx tsx prisma/seed.ts
```

### 2. 测试动作创建
```
1. 访问：http://localhost:3003/actions
2. 点击"➕ 新建动作"
3. 选择角色：盖伦
4. 填写名称：攻击
5. 填写代码：attack
6. 保存
```

### 3. 测试视频上传
```
1. 访问：http://localhost:3003/videos
2. 选择游戏：英雄联盟
3. 点击"📤 上传视频"
4. 选择动作：盖伦 - 攻击
5. 选择文件：garen-attack.mp4
6. 上传
```

### 4. 测试前台播放
```
1. 访问：http://localhost:5173/games
2. 选择游戏：英雄联盟
3. 选择角色：盖伦
4. 点击动作：攻击
5. 播放视频
```

### 5. 测试删除级联
```
1. 删除动作
2. 验证视频被删除
3. 验证七牛云文件被清理
```

---

**状态**: ✅ 后端完成，前端待更新  
**下一步**: 更新前端动作管理页面和視頻上传页面
