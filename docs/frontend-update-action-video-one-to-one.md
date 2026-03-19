# CKAnim 前端更新 - 动作视频 1 对 1 关系

## 完成时间
2026-03-18 19:00

---

## ✅ 已更新文件

### 1. admin/src/lib/services.js
**变更**:
- ✅ `charactersAPI.getAll()` - 新增获取所有角色
- ✅ `actionsAPI.getAll(params)` - 支持按角色筛选（`characterId` 参数）

---

### 2. admin/src/pages/Actions.jsx
**变更**:

#### 新增功能
- ✅ **角色筛选器** - 页面顶部下拉列表，按角色筛选动作
- ✅ **角色选择器** - 创建/编辑动作时必须选择角色
- ✅ **所属角色列** - 动作列表显示动作所属的角色
- ✅ **视频状态列** - 显示"✅ 有视频"或"❌ 无视频"

#### 验证逻辑
```javascript
// 创建动作时验证
if (!selectedCharacterId) {
  alert('请选择角色')
  return
}

// 传递 characterId 到后端
await actionsAPI.create({ 
  ...formData, 
  characterId: parseInt(selectedCharacterId) 
})
```

#### UI 变更
```jsx
// 页面顶部筛选器
<select value={selectedCharacterId} onChange={...}>
  <option value="">所有角色</option>
  {charactersData?.map(char => (
    <option key={char.id} value={char.id}>
      {char.name}（{char.game?.name}）
    </option>
  ))}
</select>

// 动作列表表格
<thead>
  <tr>
    <th>所属角色</th>
    <th>视频</th>
    ...
  </tr>
</thead>
<tbody>
  <tr>
    <td>{action.character?.name}</td>
    <td>
      {action.video ? '✅ 有视频' : '❌ 无视频'}
    </td>
    ...
  </tr>
</tbody>

// 弹窗中的角色选择器
<div className="form-group">
  <label>选择角色 *</label>
  <select value={selectedCharacterId} onChange={...}>
    <option value="">请选择角色</option>
    {charactersData?.map(char => (...)}
  </select>
</div>
```

---

### 3. admin/src/pages/Actions.css
**新增样式**:

```css
/* 筛选器样式 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-select {
  padding: 10px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
}

/* 视频状态指示器 */
.has-video {
  background: #d4edda;
  color: #155724;
  padding: 4px 12px;
  border-radius: 6px;
}

.no-video {
  background: #fff3cd;
  color: #856404;
  padding: 4px 12px;
  border-radius: 6px;
}

/* 表单选择器 */
.form-group select.form-control {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
}
```

---

### 4. admin/src/pages/Videos.jsx
**变更**:

#### 动作筛选逻辑
```javascript
// 获取动作时根据角色筛选
const { data: actions } = useQuery({
  queryKey: ['actions', selectedCharacter?.id],
  queryFn: async () => {
    if (!selectedCharacter) return []
    const response = await actionsAPI.getAll({ 
      characterId: selectedCharacter.id 
    })
    return response.data.actions || []
  },
  enabled: !!selectedCharacter, // 只有选择角色后才加载
})
```

#### 角色选择器更新
```javascript
// 选择角色时清空动作选择
<select
  value={selectedCharacter?.id || ''}
  onChange={(e) => {
    const char = characters?.find(c => c.id === parseInt(e.target.value))
    setSelectedCharacter(char || null)
    setSelectedAction(null) // ⭐ 清空动作
  }}
>
  <option value="">请选择角色</option>
  {characters?.map(char => (
    <option key={char.id} value={char.id}>
      {char.name} ({char.category?.name})
    </option>
  ))}
</select>
<p>每个角色可以有多个动作，每个动作只能有一个视频</p>
```

#### 动作选择器更新
```javascript
<select
  value={selectedAction?.id || ''}
  onChange={(e) => {
    const action = actions?.find(a => a.id === parseInt(e.target.value))
    setSelectedAction(action || null)
  }}
  disabled={!selectedCharacter} // ⭐ 必须先选择角色
>
  <option value="">请先选择角色</option>
  {actions?.map(action => (
    <option key={action.id} value={action.id}>
      {action.name} ({action.code})
      {action.video ? ' ⚠️ 已有视频' : ''}
    </option>
  ))}
</select>

<p>
  {selectedAction?.video 
    ? '⚠️ 该动作已有视频，上传将覆盖（1 对 1 关系）' 
    : '每个动作只能有一个视频'}
</p>
```

#### 上传验证逻辑
```javascript
// 单个上传验证
const handleStartUpload = async () => {
  // ⭐ 游戏、角色、动作必选
  if (!selectedGame) {
    alert('请先选择游戏！')
    return
  }
  if (!selectedCharacter) {
    alert('请选择角色！')
    return
  }
  if (!selectedAction) {
    alert('请选择动作！')
    return
  }

  // ⭐ 检查动作是否已有视频
  if (selectedAction.video) {
    const confirmed = confirm(
      `⚠️ 动作"${selectedAction.name}"已有视频！\n\n` +
      `上传新视频将覆盖原有视频（1 对 1 关系），确定继续吗？`
    )
    if (!confirmed) return
  }

  // 上传逻辑...
}

// 批量上传验证
const handleBatchUpload = async () => {
  // ⭐ 游戏、角色、动作必选
  if (!selectedGame) {
    alert('请先选择游戏！')
    return
  }
  if (!selectedCharacter) {
    alert('请选择角色！')
    return
  }
  if (!selectedAction) {
    alert('请选择动作！')
    return
  }

  // ⭐ 检查动作是否已有视频
  if (selectedAction.video) {
    const confirmed = confirm(
      `⚠️ 动作"${selectedAction.name}"已有视频！\n\n` +
      `上传多个视频将失败（1 对 1 关系），建议逐个上传到不同动作。\n\n` +
      `确定继续吗？`
    )
    if (!confirmed) return
  }

  // 批量上传逻辑...
}
```

#### 传递参数到后端
```javascript
await videosAPI.create({
  title: file.name.replace(/\.[^/.]+$/, ''),
  gameId: selectedGame.id,
  qiniuKey: key,
  qiniuUrl: url,
  published: false,
  tagIds: selectedTags,
  categoryIds: selectedCategories,
  generateCover: true,
  characterId: selectedCharacter?.id, // ⭐ 必传
  actionId: selectedAction?.id,       // ⭐ 必传
})
```

---

## 🎨 用户体验改进

### 1. 动作管理页面

#### 筛选功能
```
访问：http://localhost:3003/actions

顶部筛选器：
[所有角色 ▼] [➕ 新建动作]

选择"盖伦"后：
- 只显示盖伦的动作
- 列表显示每个动作的视频状态
```

#### 创建动作
```
点击"➕ 新建动作"

弹窗：
[选择角色 ▼] *  ← 必选
[名称] *
[代码] *
[描述]
[排序]
[✓] 发布

保存 → 创建成功
```

#### 列表显示
| ID | 名称 | 代码 | 所属角色 | 视频 | 状态 | 操作 |
|----|------|------|---------|------|------|------|
| 1 | 攻击 | attack | 盖伦 | ✅ 有视频 | 已发布 | 编辑 删除 |
| 2 | 走位 | walk | 盖伦 | ❌ 无视频 | 已发布 | 编辑 删除 |

---

### 2. 视频上传页面

#### 上传流程
```
访问：http://localhost:3003/videos

1. 选择游戏：[英雄联盟 ▼] *
2. 点击"📤 上传视频"
3. 选择角色：[盖伦 ▼] *  ← 必选
4. 选择动作：[攻击 ▼] *  ← 必选（只显示盖伦的动作）
   - 如果动作已有视频：显示"⚠️ 已有视频"
5. 选择分类：（可选）
6. 选择标签：（可选）
7. 选择文件：garen-attack.mp4
8. 点击"📤 开始上传"

验证：
- ✅ 游戏必选
- ✅ 角色必选
- ✅ 动作必选
- ⚠️ 动作已有视频时弹出确认
```

#### 动作选择器行为
```
未选择角色时：
[请先选择角色] (禁用)

选择角色后：
[攻击 (attack)]
[走位 (walk)]
[技能 (skill) ⚠️ 已有视频]

选择"技能"时：
提示："⚠️ 该动作已有视频，上传将覆盖（1 对 1 关系）"
```

#### 角色切换行为
```
选择"盖伦" → 选择"攻击"动作
↓
切换角色为"亚索"
↓
动作自动清空 → [请先选择角色]
动作列表更新为亚索的动作
```

---

## ⚠️ 错误提示

### 1. 未选择游戏
```
点击"上传视频"时：
❌ 请先选择游戏！
```

### 2. 未选择角色
```
点击"开始上传"时：
❌ 请选择角色！每个视频必须关联到一个角色。
```

### 3. 未选择动作
```
点击"开始上传"时：
❌ 请选择动作！每个动作只能有一个视频。
```

### 4. 动作已有视频（单个上传）
```
选择已有视频的动作时：
⚠️ 动作"攻击"已有视频！

上传新视频将覆盖原有视频（1 对 1 关系），确定继续吗？

[取消] [确定]
```

### 5. 动作已有视频（批量上传）
```
选择已有视频的动作时：
⚠️ 动作"攻击"已有视频！

上传多个视频将失败（1 对 1 关系），建议逐个上传到不同动作。

确定继续吗？

[取消] [确定]
```

---

## 🧪 测试步骤

### 1. 测试动作管理页面

```
1. 访问：http://localhost:3003/actions
2. 查看顶部筛选器 - ✅ 显示所有角色
3. 选择"盖伦" - ✅ 只显示盖伦的动作
4. 点击"➕ 新建动作"
5. 填写表单：
   - 选择角色：盖伦 ✅
   - 名称：测试动作
   - 代码：test
6. 不选择角色直接保存 - ❌ 提示"请选择角色"
7. 选择角色后保存 - ✅ 创建成功
8. 查看列表 - ✅ 显示"所属角色：盖伦"
9. 查看"视频"列 - ✅ 显示"❌ 无视频"或"✅ 有视频"
```

### 2. 测试视频上传

```
1. 访问：http://localhost:3003/videos
2. 选择游戏：英雄联盟
3. 点击"📤 上传视频"
4. 不选择角色直接选择文件 - ✅ 无错误
5. 点击"开始上传" - ❌ 提示"请选择角色"
6. 选择角色：盖伦
7. 选择动作：攻击
8. 选择文件：test.mp4
9. 点击"开始上传" - ✅ 上传成功
10. 再次上传到同一动作 - ⚠️ 弹出确认对话框
```

### 3. 测试动作筛选

```
1. 访问：http://localhost:3003/videos
2. 选择游戏：英雄联盟
3. 点击"📤 上传视频"
4. 动作选择器显示"请先选择角色"（禁用）
5. 选择角色：盖伦
6. 动作选择器显示盖伦的动作列表
7. 切换角色：亚索
8. 动作选择器清空并显示亚索的动作列表
```

### 4. 测试批量上传

```
1. 访问：http://localhost:3003/videos
2. 选择游戏：英雄联盟
3. 点击"📤 批量上传"
4. 选择 5 个视频文件
5. 选择角色：盖伦
6. 选择动作：攻击
7. 点击"开始上传"
8. 验证：
   - ✅ 所有文件都关联到盖伦
   - ✅ 所有文件都关联到攻击
   - ⚠️ 如果攻击已有视频，弹出确认
```

---

## 📋 完整上传流程

### 单个上传
```
1. 访问后台：http://localhost:3003/videos
2. 选择游戏：英雄联盟 ⭐
3. 点击"📤 上传视频"
4. 选择角色：盖伦 ⭐
5. 选择动作：攻击 ⭐
   - 显示"每个动作只能有一个视频"
6. 选择分类：（可选）
7. 选择标签：（可选）
8. 选择文件：garen-attack.mp4
9. 点击"📤 开始上传"
10. 上传成功提示
```

### 批量上传
```
1. 访问后台：http://localhost:3003/videos
2. 选择游戏：英雄联盟 ⭐
3. 点击"📤 批量上传"
4. 选择角色：盖伦 ⭐
5. 选择动作：攻击 ⭐
6. 选择分类：（可选）
7. 选择标签：（可选）
8. 选择多个文件（最多 20 个）
9. 点击"开始上传"
10. 实时显示每个文件进度
11. 完成提示：成功 X/Y 个
```

---

## 🎯 设计优势

### 1. 用户体验
- ✅ **清晰的层级关系** - 游戏 → 角色 → 动作 → 视频
- ✅ **智能筛选** - 选择角色后自动筛选动作
- ✅ **实时反馈** - 动作已有视频时立即提示
- ✅ **防止错误** - 上传前验证所有必选字段

### 2. 数据一致性
- ✅ **前端验证** - 防止无效数据提交
- ✅ **后端验证** - 双重保障确保数据正确
- ✅ **1 对 1 约束** - 数据库 unique 约束 + 前端提示

### 3. 可维护性
- ✅ **代码复用** - 角色和动作选择逻辑统一
- ✅ **状态管理** - React Query 缓存优化
- ✅ **错误处理** - 友好的错误提示

---

## ⏳ 下一步

1. **测试完整流程**
   - [ ] 创建角色
   - [ ] 创建动作（绑定角色）
   - [ ] 上传视频（关联动作）
   - [ ] 验证前台播放

2. **优化用户体验**
   - [ ] 添加上传进度动画
   - [ ] 支持拖拽上传
   - [ ] 添加视频预览

3. **完善文档**
   - [ ] 更新管理员使用指南
   - [ ] 添加视频教程

---

**状态**: ✅ 前端完成  
**测试**: 待进行  
**文档**: `docs/action-video-one-to-one.md`（后端设计）
