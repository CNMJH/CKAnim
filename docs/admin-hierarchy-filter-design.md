# CKAnim 管理员后台 - 层级筛选设计原则

## 📊 内容层级结构

```
游戏 (Game)
  └── 分类 (GameCategory) ──┬── 子分类（多级）
                            └── 角色 (Character)
                                 └── 动作 (Action)
                                      └── 视频 (Video)
```

---

## 🎯 设计原则

### 1. 层级筛选不可跳跃

**错误示例** ❌:
- 动作管理：直接选择角色（不知道属于哪个游戏）
- 视频管理：直接选择动作（不知道属于哪个角色）

**正确示例** ✅:
- 动作管理：选择游戏 → 选择分类 → 选择角色 → 显示动作
- 视频管理：选择游戏 → 选择角色 → 选择动作 → 显示视频

### 2. 上级改变时重置下级

```javascript
// 游戏改变时，重置分类和角色
const handleGameChange = (gameId) => {
  setSelectedGameId(gameId)
  setSelectedCategoryId('')    // 重置分类
  setSelectedCharacterId('')   // 重置角色
}

// 分类改变时，重置角色
const handleCategoryChange = (categoryId) => {
  setSelectedCategoryId(categoryId)
  setSelectedCharacterId('')   // 重置角色
}
```

### 3. 下级筛选依赖上级数据

```javascript
// 分类列表根据游戏筛选
const { data: categoriesData } = useQuery({
  queryKey: ['categories', selectedGameId],
  queryFn: async () => {
    if (!selectedGameId) return []
    const response = await categoriesAPI.getByGame(parseInt(selectedGameId))
    return response.data.categories || []
  },
  enabled: !!selectedGameId,  // 只有选择游戏后才加载
})

// 角色列表根据游戏筛选
const { data: charactersData } = useQuery({
  queryKey: ['characters', selectedGameId],
  queryFn: async () => {
    if (!selectedGameId) return []
    const response = await charactersAPI.getByGame(parseInt(selectedGameId))
    return response.data.characters || []
  },
  enabled: !!selectedGameId,
})

// 动作列表根据角色筛选
const { data: actionsData } = useQuery({
  queryKey: ['actions', selectedCharacterId],
  queryFn: async () => {
    if (!selectedCharacterId) return []
    const response = await actionsAPI.getAll({ characterId: selectedCharacterId })
    return response.data.actions || []
  },
  enabled: !!selectedCharacterId,
})
```

### 4. 创建表单也遵循层级

**错误示例** ❌:
```jsx
// 直接显示所有角色
<select>
  {allCharacters.map(char => <option>{char.name}</option>)}
</select>
```

**正确示例** ✅:
```jsx
// 先选游戏 → 再选分类 → 最后选角色
<select value={gameId} onChange={handleGameChange}>
  <option>选择游戏</option>
  {games.map(game => <option>{game.name}</option>)}
</select>

<select value={categoryId} onChange={handleCategoryChange}>
  <option>选择分类</option>
  {categories.map(cat => <option>{cat.name}</option>)}
</select>

<select value={characterId} onChange={setSelectedCharacterId}>
  <option>选择角色</option>
  {filteredCharacters.map(char => <option>{char.name}</option>)}
</select>
```

---

## 📋 各页面层级筛选规范

### 1. 游戏管理 (Games.jsx)
- **层级**: 无（顶级）
- **筛选**: 无
- **创建**: 直接创建

---

### 2. 分类管理 (Categories.jsx)
- **层级**: 游戏 > 分类
- **筛选器**:
  1. 选择游戏 ⭐
  2. 显示该游戏的分类树
- **创建流程**:
  1. 选择游戏 ⭐
  2. 选择分类层级（1 级/2 级/3 级...）
  3. 选择父分类（2 级及以上必填）
  4. 填写分类名称
  5. 上传图标（可选）

---

### 3. 角色管理 (Characters.jsx)
- **层级**: 游戏 > 分类 > 角色
- **筛选器**:
  1. 选择游戏 ⭐
  2. （可选）选择分类筛选
  3. 显示角色列表
- **创建流程**:
  1. 选择游戏 ⭐
  2. （可选）选择分类
  3. 填写角色名称
  4. 上传头像（可选）

---

### 4. 动作管理 (Actions.jsx) ✅ 已重构
- **层级**: 游戏 > 分类 > 角色 > 动作
- **筛选器**:
  1. 选择游戏 ⭐
  2. （可选）选择分类
  3. （可选）选择角色
  4. 显示动作列表
- **创建流程**:
  1. 选择游戏 ⭐
  2. （可选）选择分类
  3. 选择角色 ⭐
  4. 填写动作名称、代码
  5. 设置排序、发布状态

---

### 5. 视频管理 (Videos.jsx) 🔄 待重构
- **层级**: 游戏 > 分类 > 角色 > 动作 > 视频
- **当前筛选器**:
  1. 选择游戏 ⭐
  2. 显示视频列表
- **目标筛选器**:
  1. 选择游戏 ⭐
  2. （可选）选择分类
  3. （可选）选择角色
  4. （可选）选择动作
  5. 显示视频列表
- **创建流程**:
  1. 选择游戏 ⭐
  2. 选择角色 ⭐
  3. 选择动作 ⭐
  4. 选择分类（可选）
  5. 选择标签（可选）
  6. 选择视频文件

---

## 🔧 实现模板

### 筛选器状态管理

```javascript
// 层级筛选状态
const [selectedGameId, setSelectedGameId] = useState('')
const [selectedCategoryId, setSelectedCategoryId] = useState('')
const [selectedCharacterId, setSelectedCharacterId] = useState('')
const [selectedActionId, setSelectedActionId] = useState('')

// 上级改变时重置下级
const handleGameChange = (gameId) => {
  setSelectedGameId(gameId)
  setSelectedCategoryId('')
  setSelectedCharacterId('')
  setSelectedActionId('')
}

const handleCategoryChange = (categoryId) => {
  setSelectedCategoryId(categoryId)
  setSelectedCharacterId('')
  setSelectedActionId('')
}

const handleCharacterChange = (characterId) => {
  setSelectedCharacterId(characterId)
  setSelectedActionId('')
}
```

### 数据查询依赖

```javascript
// 分类查询依赖游戏
const { data: categoriesData } = useQuery({
  queryKey: ['categories', selectedGameId],
  queryFn: async () => {
    if (!selectedGameId) return []
    const response = await categoriesAPI.getByGame(parseInt(selectedGameId))
    return response.data.categories || []
  },
  enabled: !!selectedGameId,
})

// 角色查询依赖游戏
const { data: charactersData } = useQuery({
  queryKey: ['characters', selectedGameId],
  queryFn: async () => {
    if (!selectedGameId) return []
    const response = await charactersAPI.getByGame(parseInt(selectedGameId))
    return response.data.characters || []
  },
  enabled: !!selectedGameId,
})

// 动作查询依赖角色
const { data: actionsData } = useQuery({
  queryKey: ['actions', selectedCharacterId],
  queryFn: async () => {
    if (!selectedCharacterId) return []
    const response = await actionsAPI.getAll({ characterId: selectedCharacterId })
    return response.data.actions || []
  },
  enabled: !!selectedCharacterId,
})

// 视频查询依赖动作
const { data: videosData } = useQuery({
  queryKey: ['videos', selectedActionId],
  queryFn: async () => {
    if (!selectedActionId) return { videos: [] }
    const response = await videosAPI.getAll({ actionId: selectedActionId })
    return response.data
  },
  enabled: !!selectedActionId,
})
```

### 筛选器 UI 组件

```jsx
<div className="filter-bar">
  {/* 游戏选择（必选） */}
  <select value={selectedGameId} onChange={handleGameChange}>
    <option value="">选择游戏</option>
    {gamesData?.map(game => (
      <option key={game.id} value={game.id}>{game.name}</option>
    ))}
  </select>

  {/* 分类选择（可选） */}
  {selectedGameId && (
    <select value={selectedCategoryId} onChange={handleCategoryChange}>
      <option value="">所有分类</option>
      {categoriesData?.map(cat => (
        <option key={cat.id} value={cat.id}>{cat.name}</option>
      ))}
    </select>
  )}

  {/* 角色选择（可选） */}
  {selectedGameId && (
    <select value={selectedCharacterId} onChange={handleCharacterChange}>
      <option value="">所有角色</option>
      {charactersData
        ?.filter(char => {
          if (selectedCategoryId) {
            return char.categoryId === parseInt(selectedCategoryId)
          }
          return true
        })
        .map(char => (
          <option key={char.id} value={char.id}>
            {char.name}
            {char.category ? `（${char.category.name}）` : ''}
          </option>
        ))}
    </select>
  )}

  {/* 动作选择（可选） */}
  {selectedCharacterId && (
    <select value={selectedActionId} onChange={setSelectedActionId}>
      <option value="">所有动作</option>
      {actionsData?.map(action => (
        <option key={action.id} value={action.id}>
          {action.name}
          {action.video ? ' ✅' : ' ❌'}
        </option>
      ))}
    </select>
  )}
</div>
```

---

## ✅ 检查清单

修改每个管理页面时，检查以下项目：

### 筛选器
- [ ] 是否先选择游戏？
- [ ] 游戏改变时是否重置下级筛选？
- [ ] 分类/角色/动作筛选是否按顺序依赖？
- [ ] 下级筛选是否只显示上级数据？

### 创建表单
- [ ] 是否遵循层级选择顺序？
- [ ] 必填项是否正确（游戏、角色、动作）？
- [ ] 是否有清晰的提示文字？

### 数据查询
- [ ] useQuery 的 enabled 是否正确设置？
- [ ] queryKey 是否包含依赖的筛选条件？
- [ ] API 调用是否传递正确的筛选参数？

---

## 📝 更新日志

### 2026-03-18
- ✅ **动作管理** - 重构完成，实现游戏>分类>角色>动作层级筛选
- 🔄 **视频管理** - 待重构
- ✅ **角色管理** - 已有游戏选择，待添加分类筛选
- ✅ **分类管理** - 已有游戏选择，符合层级

---

**状态**: 动作管理已重构，视频管理待更新  
**原则**: 层级筛选不可跳跃，上级改变时重置下级
