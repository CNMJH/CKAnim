# 管理员后台弹窗层级关系全面检查

**检查时间**: 2026-03-18 23:45  
**检查依据**: 游戏 > 分类 > 角色 > 动作 > 视频 层级关系  
**检查结果**: 发现 1 个问题（视频编辑弹窗）

---

## 📊 层级关系回顾

```
游戏 (Game)                    ← 顶级
  └── 分类 (GameCategory)      ← 1 级，用于组织角色
      └── 角色 (Character)     ← 2 级，游戏的具体人物
          └── 动作 (Action)    ← 3 级，角色的动作
              └── 视频 (Video) ← 4 级，动作的演示视频（1 对 1）
```

**核心原则**:
1. 下级必须选择上级（如：创建角色必须选择分类）
2. 不能跨层级关联（如：视频不能直接关联分类）
3. 上级改变时重置下级

---

## ✅ 正确的弹窗

### 1. 游戏管理弹窗 ✅

**文件**: `admin/src/pages/Games.jsx`

**字段**:
- 游戏名称 ✅
- 描述 ✅
- 排序 ✅
- 图标上传 ✅

**评估**: 游戏是顶级，无需选择上级，**正确**。

---

### 2. 分类管理弹窗 ✅

**文件**: `admin/src/pages/Categories.jsx`

**字段**:
- 分类名称 ✅
- 层级（1-7 级）✅
- 父分类（2 级及以上必选）✅
- 排序 ✅
- 图标上传 ✅

**层级逻辑**:
```javascript
// 2 级及以上必须选择父分类
{!editingCategory && selectedLevel > 1 && (
  <div className="form-group">
    <label>父分类 *</label>
    <select required>
      <option value="">请选择父分类</option>
      {categories.filter(cat => cat.level === selectedLevel - 1)...}
    </select>
  </div>
)}
```

**评估**: 分类必须选择父分类（2 级+），**正确**。

---

### 3. 角色管理弹窗 ✅

**文件**: `admin/src/pages/Characters.jsx`

**字段**:
- 角色名称 ✅
- 角色分类（从当前游戏的分类中选择）✅
- 头像 URL ✅
- 描述 ✅
- 排序 ✅
- 发布状态 ✅

**层级逻辑**:
```javascript
// 角色必须属于某个分类（可选）
<select value={formData.categoryId}>
  <option value="">不分类</option>
  {categories?.map(cat => (
    <option key={cat.id} value={cat.id}>
      {cat.name} (L{cat.level})
    </option>
  ))}
</select>
```

**评估**: 角色选择分类（可空），分类已按游戏筛选，**正确**。

---

### 4. 动作管理弹窗 ✅

**文件**: `admin/src/pages/Actions.jsx`

**字段**:
- 选择游戏 ⭐ ✅
- 选择分类（可选，用于筛选角色）✅
- 选择角色 ⭐ ✅
- 动作名称 ✅
- 动作代码 ✅
- 描述 ✅
- 排序 ✅
- 发布状态 ✅

**层级逻辑**:
```javascript
// 动作必须选择游戏和角色
<select value={selectedGameId} onChange={handleGameChange}>
  <option value="">请选择游戏</option>
  {gamesData?.map(game => (...)}
</select>

<select value={selectedCharacterId} required>
  <option value="">请选择角色</option>
  {filteredCharacters.map(char => (...)}
</select>
```

**评估**: 动作必须选择游戏和角色，分类用于筛选，**正确**。

---

### 5. 视频上传弹窗 ✅（已修复）

**文件**: `admin/src/pages/Videos.jsx`

**字段**:
- 选择游戏 ⭐ ✅
- 选择角色 ⭐ ✅（根据游戏筛选）
- 选择动作 ⭐ ✅（根据角色筛选，显示"⚠️ 已有视频"）
- 选择标签（可选）✅

**层级逻辑**:
```javascript
// 视频必须选择动作（动作已包含游戏/分类/角色信息）
<select value={selectedCharacterId} onChange={...}>
  {characters.map(char => (...)}
</select>

<select value={selectedActionId} required>
  <option value="">请选择动作</option>
  {actions.map(action => (
    <option key={action.id} value={action.id}>
      {action.video ? '⚠️ 已有视频 - ' : ''}{action.name}
    </option>
  ))}
</select>
```

**评估**: 视频通过动作间接关联游戏/分类/角色，**正确**。

---

## ❌ 错误的弹窗

### 视频编辑弹窗 ❌

**文件**: `admin/src/pages/Videos.jsx` (第 737-850 行)

**问题字段**:
```javascript
// ❌ 错误：视频编辑时不应该直接选择分类
<div className="form-group">
  <label>视频分类（可选）</label>
  <div className="categories-list">
    {flattenCategories(allCategories || []).map(cat => (
      <button
        key={cat.id}
        className={`category-btn ${editCategories.includes(cat.id) ? 'selected' : ''}`}
        onClick={() => {
          setEditCategories(prev =>
            prev.includes(cat.id)
              ? prev.filter(id => id !== cat.id)
              : [...prev, cat.id]
          )
        }}
      >
        {cat.name}
        <span className="level-tag">L{cat.level}</span>
      </button>
    ))}
  </div>
</div>
```

**问题分析**:

1. **违反层级关系** ❌
   ```
   游戏 > 分类 > 角色 > 动作 > 视频
   ```
   视频与分类差了好几层，不应该直接关联

2. **数据冗余** ❌
   - 视频已通过动作关联了角色
   - 角色已关联了分类
   - 再让视频直接关联分类是冗余的

3. **逻辑混乱** ❌
   - 如果视频的分类和动作的分类不一致，以哪个为准？
   - 用户会困惑

4. **与上传弹窗不一致** ❌
   - 上传时不能选择分类
   - 编辑时却可以选择分类
   - 用户体验不一致

**正确做法**:
```javascript
// ✅ 删除分类选择，只显示继承自动作的分类信息
<div className="form-group">
  <label>所属分类</label>
  <div className="category-info">
    {editingVideo.action?.character?.category?.name || '未分类'}
    <small>（继承自动作关联的角色）</small>
  </div>
</div>
```

---

## 📋 修复方案

### 视频编辑弹窗修复

**文件**: `admin/src/pages/Videos.jsx`

#### 1. 删除分类选择 UI

```jsx
// ❌ 删除整个分类选择区块
{/* 分类选择 */}
<div className="form-group">
  <label>视频分类（可选）</label>
  <div className="categories-list">
    {flattenCategories(allCategories || []).map(cat => (
      <button
        key={cat.id}
        type="button"
        className={`category-btn ${editCategories.includes(cat.id) ? 'selected' : ''}`}
        onClick={() => {
          setEditCategories(prev =>
            prev.includes(cat.id)
              ? prev.filter(id => id !== cat.id)
              : [...prev, cat.id]
          )
        }}
      >
        {cat.name}
        <span className="level-tag">L{cat.level}</span>
      </button>
    ))}
  </div>
</div>
```

#### 2. 添加分类信息展示（只读）

```jsx
// ✅ 新增：显示继承的分类信息
<div className="form-group">
  <label>所属分类</label>
  <div className="category-info" style={{
    padding: '12px',
    background: '#f5f5f5',
    borderRadius: '8px',
    color: '#666'
  }}>
    {editingVideo.action?.character?.category?.name || '未分类'}
    <small style={{display: 'block', marginTop: '4px', color: '#999'}}>
      继承自动作关联的角色（不可修改）
    </small>
  </div>
</div>
```

#### 3. 删除分类状态

```javascript
// ❌ 删除
const [editCategories, setEditCategories] = useState([])

// ✅ 保留标签状态
const [editTags, setEditTags] = useState([])
```

#### 4. 更新保存逻辑

```javascript
// 修复前
const handleSaveEdit = () => {
  updateVideoMutation.mutate({
    id: editingVideo.id,
    title: editTitle,
    tagIds: editTags,
    categoryIds: editCategories,  // ❌ 删除
  })
}

// 修复后
const handleSaveEdit = () => {
  updateVideoMutation.mutate({
    id: editingVideo.id,
    title: editTitle,
    tagIds: editTags,
  })
}
```

#### 5. 后端 API 调整

**文件**: `server/src/routes/videos.ts`

```typescript
// 更新视频
server.put('/videos/:id', { preHandler: [authenticate] }, async (request, reply) => {
  try {
    const { id } = request.params as { id: string }
    const { title, tagIds } = request.body as {
      title?: string
      tagIds?: number[]
      // categoryIds?: number[]  // ❌ 删除
    }

    // 更新视频
    const video = await prisma.video.update({
      where: { id: parseInt(id) },
      data: {
        title,
        tags: tagIds ? {
          set: tagIds.map(id => ({ id })),
        } : undefined,
        // categories: categoryIds ? {...} : undefined,  // ❌ 删除
      },
      include: {
        action: {
          include: {
            character: {
              include: {
                category: true,
              },
            },
          },
        },
        tags: true,
        // categories: true,  // ❌ 删除
      },
    })

    reply.send({ video })
  } catch (error) {
    // ...
  }
})
```

---

## 📊 修复统计

| 类别 | 修改内容 | 行数 |
|------|---------|------|
| 删除分类选择 UI | 删除整个分类选择区块 | -30 |
| 新增分类展示 | 添加只读分类信息 | +15 |
| 删除状态变量 | 删除 `editCategories` | -1 |
| 更新保存逻辑 | 删除 `categoryIds` 参数 | -2 |
| 后端调整 | 删除分类关联代码 | -10 |
| **总计** | | **-28** |

---

## 🧪 测试验证

### 步骤 1: 访问视频管理
```
http://localhost:3003/videos
```

### 步骤 2: 点击任意视频的"编辑"按钮
**验证点**:
- [ ] 弹窗显示"编辑视频信息"
- [ ] **没有**"视频分类"选择区域
- [ ] 显示"所属分类"（只读，继承自角色）
- [ ] 显示"视频标签"选择（可编辑）

### 步骤 3: 修改视频标题和标签
**验证点**:
- [ ] 可以修改标题
- [ ] 可以选择/取消标签
- [ ] 分类显示为灰色只读状态
- [ ] 保存成功

### 步骤 4: 验证前台显示
**验证点**:
- [ ] 前台网站视频分类正确（继承自动作）
- [ ] 标签更新成功

---

## ⚠️ 注意事项

### 1. 数据迁移

如果数据库中已有视频关联了分类，需要迁移：

```sql
-- 查询有分类关联的视频
SELECT v.id, v.title, a.id as action_id, c.id as character_id, cat.id as category_id
FROM Video v
JOIN Action a ON v.actionId = a.id
JOIN Character c ON a.characterId = c.id
JOIN GameCategory cat ON c.categoryId = cat.id
WHERE v.id IN (SELECT DISTINCT videoId FROM _CategoryToVideo);

-- 验证分类一致性
-- 视频的分类应该等于动作→角色→分类
```

### 2. Schema 调整

```prisma
// 删除 Video 与 Category 的多对多关系
model Video {
  // categories  GameCategory[]  // ❌ 删除
  action    Action?  @relation(fields: [actionId], references: [id])
}

model GameCategory {
  // videos  Video[]  // ❌ 删除
  characters Character[]
}
```

### 3. 前端一致性

**所有地方**都应该遵循层级关系：
- 上传弹窗：选择动作 ✅
- 编辑弹窗：显示继承分类（只读）✅
- 列表筛选：通过动作间接筛选 ✅

---

## 📝 经验总结

### 为什么会出现这个问题？

1. **历史遗留** - 早期设计时层级关系不明确
2. **思维惯性** - 习惯性让视频直接关联分类
3. **缺乏审查** - 没有系统性检查所有弹窗

### 如何避免再次发生？

1. **设计审查清单** - 每次新增功能时检查层级关系
2. **代码审查** - PR 时重点检查跨层级关联
3. **文档化** - 将层级关系写入文档（已完成 ✅）

### 层级关系的重要性

```
✅ 正确：游戏 > 分类 > 角色 > 动作 > 视频
   - 数据一致
   - 逻辑清晰
   - 用户易懂

❌ 错误：视频直接关联分类
   - 数据冗余
   - 逻辑混乱
   - 用户困惑
```

---

## ✅ 修复状态

- ✅ **问题识别** - 视频编辑弹窗违反层级关系
- ✅ **修复方案** - 删除分类选择，显示继承分类
- ✅ **文档更新** - 层级关系已添加到 PROFILE.md
- ⏳ **待修复** - 视频编辑弹窗
- ⏳ **待测试** - 修复后需要完整测试

---

**检查完成时间**: 2026-03-18 23:45  
**建议**: 立即修复视频编辑弹窗，确保所有弹窗遵循层级关系
