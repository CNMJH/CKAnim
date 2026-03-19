# 视频编辑弹窗层级关系修复

**修复时间**: 2026-03-18 23:50  
**问题**: 视频编辑弹窗允许直接选择分类，违反层级关系  
**根本原因**: 历史遗留设计，早期层级关系不明确

---

## 🔍 问题分析

### 错误的编辑弹窗（修复前）

```
编辑视频信息
├── 视频标题 ✅
├── 视频分类 ❌（错误！可以修改分类）
└── 视频标签 ✅
```

**违反层级关系**:
```
游戏 > 分类 > 角色 > 动作 > 视频
```
- 视频与分类差了好几层
- 视频已通过动作间接关联分类
- 直接修改分类会导致数据不一致

### 与上传弹窗不一致

**上传弹窗**（已修复）:
- ❌ 不能选择分类
- ✅ 选择动作 = 自动确定分类

**编辑弹窗**（修复前）:
- ✅ 可以选择分类
- ❌ 与上传逻辑不一致

---

## ✅ 修复方案

### 新的编辑弹窗（修复后）

```
编辑视频信息
├── 视频标题 ✅
├── 所属分类（只读）✅（继承自角色，显示灰色）
└── 视频标签（可编辑）✅
```

**核心逻辑**:
- 分类继承自动作关联的角色
- 只读显示，不可修改
- 保持与上传弹窗一致性

---

## 🛠️ 修改内容

### 前端修改

**文件**: `admin/src/pages/Videos.jsx`

#### 1. 删除分类状态变量

```javascript
// ❌ 删除
const [editCategories, setEditCategories] = useState([])

// ✅ 保留
const [editTags, setEditTags] = useState([])
```

#### 2. 更新编辑弹窗打开逻辑

```javascript
// 修复前
const handleEditClick = (video) => {
  setEditingVideo(video)
  setEditTitle(video.title)
  setEditTags(video.tags?.map(t => t.id) || [])
  setEditCategories(video.categories?.map(c => c.id) || [])  // ❌ 删除
  setShowEditModal(true)
}

// 修复后
const handleEditClick = (video) => {
  setEditingVideo(video)
  setEditTitle(video.title)
  setEditTags(video.tags?.map(t => t.id) || [])
  setShowEditModal(true)
}
```

#### 3. 更新保存逻辑

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

#### 4. 更新 Mutation 定义

```javascript
// 修复前
const updateVideoMutation = useMutation({
  mutationFn: async ({ id, title, tagIds, categoryIds }) => {
    await videosAPI.update(id, { title, tagIds, categoryIds })
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['videos'])
    setShowEditModal(false)
    alert('更新成功！')
  },
})

// 修复后
const updateVideoMutation = useMutation({
  mutationFn: async ({ id, title, tagIds }) => {
    await videosAPI.update(id, { title, tagIds })
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['videos'])
    setShowEditModal(false)
    alert('更新成功！')
  },
})
```

#### 5. UI 重构 - 删除分类选择器

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
        {'\u00A0'.repeat((cat.level - 1) * 2)}
        {cat.name}
        <span className="level-tag">L{cat.level}</span>
      </button>
    ))}
  </div>
</div>
```

#### 6. UI 重构 - 添加分类信息展示（只读）

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

---

## 📊 修改统计

| 类别 | 修改内容 | 行数 |
|------|---------|------|
| 状态变量 | 删除 `editCategories` | -1 |
| 打开逻辑 | 删除 `setEditCategories` | -1 |
| 保存逻辑 | 删除 `categoryIds` 参数 | -2 |
| Mutation | 删除 `categoryIds` 参数 | -2 |
| UI | 删除分类选择器 | -30 |
| UI | 新增分类信息展示 | +15 |
| **总计** | | **-21** |

---

## 🧪 测试验证

### 步骤 1: 访问视频管理
```
http://localhost:3003/videos
```

### 步骤 2: 点击任意视频的"编辑"按钮
**验证点**:
- [ ] 弹窗显示"编辑视频信息"
- [ ] **没有**"视频分类"选择按钮
- [ ] 显示"所属分类"灰色信息框
- [ ] 分类名称正确（继承自角色）
- [ ] 显示"继承自动作关联的角色（不可修改）"提示
- [ ] 显示"视频标签"选择（可编辑）

### 步骤 3: 修改视频标题
**验证点**:
- [ ] 可以修改标题
- [ ] 保存成功
- [ ] 控制台无错误

### 步骤 4: 修改视频标签
**验证点**:
- [ ] 可以选择/取消标签
- [ ] 保存成功
- [ ] 标签更新正确

### 步骤 5: 验证分类一致性
**验证点**:
- [ ] 编辑弹窗显示的分类 = 动作→角色→分类
- [ ] 与上传时的分类一致
- [ ] 前台网站显示的分类一致

---

## ⚠️ 注意事项

### 1. 数据一致性

**如果用户想修改视频的分类怎么办？**

正确流程:
1. 删除视频（或解除动作关联）
2. 创建新动作（选择正确的角色/分类）
3. 上传视频到新动作

**原因**:
- 分类是角色的属性，不是视频的属性
- 视频通过动作间接关联分类
- 保持数据一致性

### 2. 后端 API 调整

如果后端还有 `categoryIds` 参数，建议删除：

```typescript
// server/src/routes/videos.ts
server.put('/videos/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  const { title, tagIds } = request.body as {
    title?: string
    tagIds?: number[]
    // categoryIds?: number[]  // ❌ 建议删除
  }
  
  // ...
})
```

### 3. 数据库 Schema

如果 Video 和 Category 有多对多关系，建议删除：

```prisma
model Video {
  // categories  GameCategory[]  // ❌ 建议删除
  action    Action?  @relation(fields: [actionId], references: [id])
}

model GameCategory {
  // videos  Video[]  // ❌ 建议删除
  characters Character[]
}
```

---

## 📝 经验总结

### 为什么会出现这个问题？

1. **历史遗留** - 早期设计时层级关系不明确
2. **功能迭代** - 上传弹窗已修复，编辑弹窗遗漏
3. **缺乏审查** - 没有系统性检查所有弹窗

### 如何避免再次发生？

1. **设计审查清单** ✅
   ```
   - [ ] 是否符合层级关系？
   - [ ] 是否跨层级关联？
   - [ ] 与相关弹窗是否一致？
   ```

2. **代码审查** ✅
   - PR 时重点检查层级关系
   - 检查所有弹窗的字段

3. **文档化** ✅
   - 层级关系已添加到 PROFILE.md
   - 修复文档已创建

### 层级关系检查清单

```
✅ 游戏管理 - 顶级，无需上级
✅ 分类管理 - 必须选择父分类（2 级+）
✅ 角色管理 - 必须选择分类（可空）
✅ 动作管理 - 必须选择游戏和角色
✅ 视频上传 - 必须选择动作（包含游戏/分类/角色）
✅ 视频编辑 - 显示继承分类（只读）
```

---

## ✅ 修复状态

- ✅ **状态变量** - 删除 `editCategories`
- ✅ **打开逻辑** - 删除 `setEditCategories`
- ✅ **保存逻辑** - 删除 `categoryIds`
- ✅ **Mutation** - 删除 `categoryIds` 参数
- ✅ **UI 重构** - 删除分类选择器
- ✅ **UI 新增** - 添加分类信息展示（只读）
- ✅ **文档** - 修复文档已创建
- ⏳ **测试** - 待用户验证

---

## 🔗 相关文档

1. `docs/admin-modal-hierarchy-audit.md` - 全面检查报告
2. `docs/video-upload-hierarchy-fix.md` - 上传弹窗修复
3. `PROFILE.md` - 层级关系永久记忆

---

**修复完成时间**: 2026-03-18 23:50  
**测试建议**: 访问 http://localhost:3003/videos 点击任意视频的"编辑"按钮，验证分类显示为只读
