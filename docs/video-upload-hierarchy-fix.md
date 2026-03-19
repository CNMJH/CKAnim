# 视频上传流程重构 - 遵循层级关系

**修复时间**: 2026-03-18 23:30  
**问题**: 上传视频时无法选择动作，且错误地显示了分类选择  
**根本原因**: 上传弹窗设计违反了内容层级关系

---

## 🔍 问题分析

### 错误的上传流程（修复前）
```
上传视频
├── 选择游戏 ✅
├── 选择分类 ❌（错误！差了好几层）
├── 选择角色 ❌（缺失）
├── 选择动作 ❌（缺失，无法选择）
└── 选择标签 ✅
```

### 正确的层级关系
```
游戏 (Game)
  └── 分类 (GameCategory)
      └── 角色 (Character)
          └── 动作 (Action)
              └── 视频 (Video) ← 1 对 1
```

**核心问题**:
1. 视频与动作是 **1 对 1 关系**
2. 选择动作 = 自动确定游戏 + 分类 + 角色
3. 分类与视频差了好几层，不应该直接关联

---

## ✅ 修复方案

### 新的上传流程
```
上传视频
├── 选择游戏 ⭐
├── 选择角色 ⭐（根据游戏筛选）
├── 选择动作 ⭐（根据角色筛选，显示"⚠️ 已有视频"提示）
├── 选择标签（可选）
└── 上传文件
```

### 关键设计原则

1. **层级筛选不可跳跃**
   - 游戏 → 角色 → 动作 → 视频
   - 上级改变时重置下级

2. **动作 - 视频 1 对 1**
   - 每个动作只能对应一个视频
   - 已有视频的动作显示"⚠️ 已有视频"提示
   - 覆盖时需要确认

3. **分类自动继承**
   - 角色的分类 = 视频的间接分类
   - 无需手动选择分类

---

## 🛠️ 修改内容

### 前端修改

**文件**: `admin/src/pages/Videos.jsx`

#### 1. 导入新 API
```javascript
// 修复前
import { gamesAPI, videosAPI, categoriesAPI, tagsAPI } from '../lib/services'

// 修复后
import { gamesAPI, videosAPI, categoriesAPI, tagsAPI, charactersAPI, actionsAPI } from '../lib/services'
```

#### 2. 新增状态变量
```javascript
const [selectedCharacterId, setSelectedCharacterId] = useState('')
const [selectedActionId, setSelectedActionId] = useState('')
```

#### 3. 新增数据查询
```javascript
// 获取角色列表（根据游戏）
const { data: characters = [] } = useQuery({
  queryKey: ['characters', selectedGame?.id],
  queryFn: async () => {
    if (!selectedGame) return []
    const response = await charactersAPI.getByGame(selectedGame.id)
    return response.data.characters || []
  },
  enabled: !!selectedGame,
})

// 获取动作列表（根据角色）
const { data: actions = [] } = useQuery({
  queryKey: ['actions', selectedCharacterId],
  queryFn: async () => {
    if (!selectedCharacterId) return []
    const response = await actionsAPI.getAll({ characterId: Number(selectedCharacterId) })
    return response.data.actions || []
  },
  enabled: !!selectedCharacterId,
})
```

#### 4. 移除分类查询
```javascript
// ❌ 删除
const { data: allCategories = [] } = useQuery({
  queryKey: ['categories', selectedGame?.id],
  queryFn: async () => {
    if (!selectedGame) return []
    const response = await categoriesAPI.getByGame(selectedGame.id)
    return response.data.categories || []
  },
  enabled: !!selectedGame,
})
```

#### 5. 上传弹窗 UI 重构
```jsx
{/* 角色选择 */}
{!selectedGame ? (
  <p className="upload-hint">请先在页面顶部选择游戏</p>
) : (
  <div className="character-section">
    <label>选择角色 ⭐</label>
    <select
      value={selectedCharacterId}
      onChange={(e) => {
        setSelectedCharacterId(e.target.value)
        setSelectedActionId('')  // 重置动作
      }}
      disabled={!selectedGame}
      className="upload-select"
    >
      <option value="">请选择角色</option>
      {characters.map(char => (
        <option key={char.id} value={char.id}>
          {char.name}（{char.category?.name || '未分类'}）
        </option>
      ))}
    </select>
    <p className="upload-hint">角色已按分类组织</p>
  </div>
)}

{/* 动作选择 */}
{!selectedCharacterId ? (
  <p className="upload-hint">请先选择角色</p>
) : (
  <div className="action-section">
    <label>选择动作 ⭐</label>
    <select
      value={selectedActionId}
      onChange={(e) => setSelectedActionId(e.target.value)}
      disabled={!selectedCharacterId}
      className="upload-select"
    >
      <option value="">请选择动作</option>
      {actions.map(action => (
        <option key={action.id} value={action.id}>
          {action.video ? '⚠️ 已有视频 - ' : ''}{action.name}
        </option>
      ))}
    </select>
    <p className="upload-hint">每个动作只能对应一个视频</p>
  </div>
)}
```

#### 6. 上传验证
```javascript
// 单个上传验证
const handleStartUpload = async (e) => {
  if (!pendingFile || !selectedActionId) {
    alert('请选择动作！')
    return
  }
  // ...
}

// 批量上传验证
const handleBatchUpload = async () => {
  if (pendingFiles.length === 0 || !selectedActionId) {
    alert('请选择动作！')
    return
  }
  // ...
}
```

#### 7. 创建视频记录
```javascript
// 修复前
await videosAPI.create({
  title: file.name.replace(/\.[^/.]+$/, ''),
  gameId: selectedGame.id,
  qiniuKey: key,
  qiniuUrl: url,
  published: false,
  tagIds: selectedTags,
  categoryIds: selectedCategories,  // ❌ 错误
  generateCover: true,
})

// 修复后
await videosAPI.create({
  title: file.name.replace(/\.[^/.]+$/, ''),
  gameId: selectedGame.id,
  characterId: Number(selectedCharacterId),  // ✅ 新增
  actionId: Number(selectedActionId),        // ✅ 新增
  qiniuKey: key,
  qiniuUrl: url,
  published: false,
  tagIds: selectedTags,
  generateCover: true,
})
```

#### 8. 上传按钮禁用逻辑
```jsx
<button
  className="btn-primary"
  onClick={isBatchMode ? handleBatchUpload : handleStartUpload}
  disabled={
    (isBatchMode ? pendingFiles.length === 0 : !pendingFile) || 
    uploadingFile || 
    !selectedActionId  // ✅ 新增：必须选择动作
  }
>
  {uploadingFile ? '上传中...' : (isBatchMode ? `📤 开始上传 (${pendingFiles.length}个)` : '📤 开始上传')}
  {!selectedActionId && ' (请先选择动作)'}
</button>
```

### CSS 样式

**文件**: `admin/src/pages/Videos.css`

```css
.character-section,
.action-section {
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.upload-select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
  cursor: pointer;
  background: white;
}

.upload-select:hover,
.upload-select:focus {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}
```

---

## 📊 修改统计

| 类别 | 修改内容 | 行数 |
|------|---------|------|
| 导入 | 新增 `charactersAPI`, `actionsAPI` | +1 |
| 状态 | 新增 `selectedCharacterId`, `selectedActionId` | +2 |
| 查询 | 新增角色/动作查询，删除分类查询 | +20 / -15 |
| UI | 新增角色/动作选择器，删除分类选择器 | +60 / -40 |
| 验证 | 新增动作必选验证 | +10 |
| 样式 | 新增 `.upload-select` 样式 | +15 |
| **总计** | | **+108 / -55** |

---

## 🧪 测试验证

### 步骤 1: 访问视频管理
```
http://localhost:3003/videos
```

### 步骤 2: 点击"上传视频"
**验证点**:
- [ ] 弹窗显示"选择游戏"提示
- [ ] 没有"视频分类"选择区域

### 步骤 3: 选择游戏（如"原神"）
**验证点**:
- [ ] 显示角色下拉框
- [ ] 角色列表包含该游戏的所有角色
- [ ] 角色显示所属分类（如"火 L1"）

### 步骤 4: 选择角色（如"迪卢克"）
**验证点**:
- [ ] 显示动作下拉框
- [ ] 动作列表只显示该角色的动作
- [ ] 已有视频的动作显示"⚠️ 已有视频"

### 步骤 5: 选择动作
**验证点**:
- [ ] "开始上传"按钮变为可用
- [ ] 选择已有视频的动作时，上传后应该覆盖

### 步骤 6: 选择文件并上传
**验证点**:
- [ ] 上传成功
- [ ] 前台网站能看到视频
- [ ] 动作状态更新为"✅ 有视频"

### 步骤 7: 测试批量上传
**验证点**:
- [ ] 切换到"批量上传"模式
- [ ] 选择多个文件
- [ ] 必须选择动作才能上传
- [ ] 所有文件上传到同一个动作

---

## ⚠️ 注意事项

### 1. 层级关系不可跳跃
```
游戏 → 角色 → 动作 → 视频
```
- 改变游戏时重置角色和动作
- 改变角色时重置动作

### 2. 动作 - 视频 1 对 1
- 每个动作只能有一个视频
- 上传到已有视频的动作会覆盖
- 建议添加确认对话框

### 3. 分类自动继承
- 无需手动选择分类
- 角色的分类 = 视频的间接分类
- 前台筛选通过动作关联查询

---

## 📝 经验总结

### 为什么之前设计错误？

1. **忽略了层级关系** - 直接让视频关联分类
2. **违反了数据模型** - 动作 - 视频 1 对 1 关系未体现
3. **增加了用户负担** - 让用户手动选择不需要的分类

### 正确的设计思路

1. **遵循层级关系** - 游戏 > 分类 > 角色 > 动作 > 视频
2. **简化用户操作** - 选择动作后自动确定所有上级
3. **体现业务逻辑** - 1 对 1 关系在前端明确提示

### 层级关系的重要性

```
游戏 (Game)
  └── 分类 (GameCategory)      ← 用于组织角色
      └── 角色 (Character)     ← 游戏的具体人物
          └── 动作 (Action)    ← 角色的动作
              └── 视频 (Video) ← 动作的演示视频
```

**每一层都有明确的意义**:
- 分类：组织角色（如"火元素"、"战士"）
- 角色：游戏的具体人物（如"迪卢克"、"潘森"）
- 动作：角色的动作（如"普攻"、"大招"）
- 视频：动作的演示（1 对 1）

**跨层级关联会导致**:
- 数据冗余
- 逻辑混乱
- 用户困惑

---

## ✅ 修复状态

- ✅ **前端导入** - 新增 charactersAPI, actionsAPI
- ✅ **状态变量** - selectedCharacterId, selectedActionId
- ✅ **数据查询** - 角色/动作查询，删除分类查询
- ✅ **UI 重构** - 角色/动作选择器，删除分类选择器
- ✅ **上传验证** - 动作必选验证
- ✅ **CSS 样式** - 新增 .upload-select 样式
- ✅ **测试**: 待用户验证

---

**修复完成时间**: 2026-03-18 23:30  
**测试建议**: 访问 http://localhost:3003/videos 测试新的上传流程
