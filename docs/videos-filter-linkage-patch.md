# Videos.jsx 筛选器联动优化补丁

**时间**: 2026-03-18 21:20  
**目标**: 在视频管理页面添加完整的层级筛选器（游戏>分类>角色>动作），并实现与上传弹窗的联动

---

## 📋 需要添加的功能

### 1. 状态变量（在组件顶部添加）

```javascript
// 在现有的 state 后面添加
const [selectedCategoryId, setSelectedCategoryId] = useState(null)
const [selectedCharacterId, setSelectedCharacterId] = useState(null)
const [selectedActionId, setSelectedActionId] = useState(null)
```

### 2. API 调用（在游戏列表查询后添加）

```javascript
// 获取角色列表（根据分类筛选）
const { data: characters } = useQuery({
  queryKey: ['characters', selectedCategoryId],
  queryFn: async () => {
    const params = selectedCategoryId ? { categoryId: selectedCategoryId } : {}
    const response = await charactersAPI.getAll(params)
    return response.data.characters
  },
  enabled: !!selectedGame,
})

// 获取动作列表（根据角色筛选）
const { data: actions } = useQuery({
  queryKey: ['actions', selectedCharacterId],
  queryFn: async () => {
    const params = selectedCharacterId ? { characterId: selectedCharacterId } : {}
    const response = await actionsAPI.getAll(params)
    return response.data.actions
  },
  enabled: !!selectedGame,
})

// 获取视频列表（根据所有筛选条件）
const { data: videosData, isLoading } = useQuery({
  queryKey: ['videos', selectedGame?.id, selectedCategoryId, selectedCharacterId, selectedActionId],
  queryFn: async () => {
    const params = { gameId: selectedGame.id }
    if (selectedCategoryId) params.categoryId = selectedCategoryId
    if (selectedCharacterId) params.characterId = selectedCharacterId
    if (selectedActionId) params.actionId = selectedActionId
    const response = await videosAPI.getAll(params)
    return response.data
  },
  enabled: !!selectedGame,
})
```

### 3. 筛选器 UI（在游戏选择器后面添加）

```jsx
{/* 层级筛选器 */}
{selectedGame && (
  <div className="filter-bar">
    {/* 分类筛选 */}
    <select
      className="filter-select"
      value={selectedCategoryId || ''}
      onChange={(e) => {
        setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : null)
        setSelectedCharacterId(null) // 重置下级
        setSelectedActionId(null) // 重置下级
      }}
      disabled={!categories?.length}
    >
      <option value="">全部分类</option>
      {categories?.map(cat => (
        <option key={cat.id} value={cat.id}>{cat.name}</option>
      ))}
    </select>

    {/* 角色筛选 */}
    <select
      className="filter-select"
      value={selectedCharacterId || ''}
      onChange={(e) => {
        setSelectedCharacterId(e.target.value ? parseInt(e.target.value) : null)
        setSelectedActionId(null) // 重置下级
      }}
      disabled={!characters?.length}
    >
      <option value="">全部角色</option>
      {characters?.map(char => (
        <option key={char.id} value={char.id}>{char.name}</option>
      ))}
    </select>

    {/* 动作筛选 */}
    <select
      className="filter-select"
      value={selectedActionId || ''}
      onChange={(e) => {
        setSelectedActionId(e.target.value ? parseInt(e.target.value) : null)
      }}
      disabled={!actions?.length}
    >
      <option value="">全部动作</option>
      {actions?.map(action => (
        <option key={action.id} value={action.id}>
          {action.name} {action.video ? '✅' : '❌'}
        </option>
      ))}
    </select>
  </div>
)}
```

### 4. 上传弹窗联动函数

```javascript
// 打开上传弹窗（带联动逻辑）
const handleOpenUploadModal = () => {
  setShowModal(true)
  
  // 继承页面筛选器的选择
  if (selectedCategoryId) {
    const category = categories?.find(c => c.id === selectedCategoryId)
    // 这里可以设置弹窗的分类选择
  }
  
  if (selectedCharacterId) {
    const character = characters?.find(c => c.id === selectedCharacterId)
    // 设置弹窗的角色选择
    // setSelectedCharacter(character) // 如果弹窗有这个角色状态
  }
  
  if (selectedActionId) {
    const action = actions?.find(a => a.id === selectedActionId)
    // 设置弹窗的动作选择
    // setSelectedAction(action) // 如果弹窗有这个角色状态
  }
}
```

### 5. 修改上传按钮

```jsx
<button
  type="button"
  className="btn-primary"
  onClick={handleOpenUploadModal}
  disabled={!selectedGame}
>
  📤 上传视频
</button>
```

---

## 🎯 完整实现步骤

### 步骤 1: 修改 Videos.jsx

1. 添加状态变量（第 23 行后）
2. 添加 API 查询（第 65 行后）
3. 添加筛选器 UI（第 390 行后）
4. 添加联动函数（第 100 行后）
5. 修改上传按钮（第 367 行）

### 步骤 2: 测试验证

1. 访问 http://localhost:3003/videos
2. 选择游戏 → 验证分类/角色/动作筛选器出现
3. 选择分类 → 验证角色列表更新
4. 选择角色 → 验证动作列表更新
5. 选择动作 → 验证视频列表更新
6. 点击上传 → 验证弹窗继承筛选条件

---

## 📊 预期效果

### 筛选链路
```
选择游戏（原神）
  ↓
选择分类（火元素）
  ↓
选择角色（迪卢克）
  ↓
选择动作（E 技能）
  ↓
视频列表显示：迪卢克的 E 技能视频
  ↓
点击上传 → 弹窗自动选择：游戏=原神，分类=火，角色=迪卢克，动作=E 技能
```

### 用户体验提升
- **减少点击**: 最多节省 4 次选择操作
- **降低错误**: 避免选错游戏/角色/动作
- **提升效率**: 批量上传同一角色的多个动作时特别有用

---

## ⚠️ 注意事项

1. **API 依赖**: 需要 `charactersAPI.getAll()` 和 `actionsAPI.getAll()` 支持筛选参数
2. **状态重置**: 改变上级筛选时，必须重置所有下级筛选
3. **空状态处理**: 如果某级没有数据，禁用下级筛选器
4. **加载状态**: 下级筛选器在数据加载时显示"加载中..."

---

## 🔗 相关文件

- `admin/src/pages/Videos.jsx` - 视频管理页面
- `admin/src/pages/Videos.css` - 已添加全局筛选器样式
- `admin/src/lib/services.js` - API 服务（需确认支持筛选参数）
- `docs/admin-filter-optimizations.md` - 筛选器优化文档
- `docs/backend-video-api-filter-support.md` - 后端 API 筛选支持文档

---

**状态**: 📝 待实现  
**优先级**: 中  
**预计时间**: 30 分钟
