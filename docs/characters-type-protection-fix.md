# Characters.jsx 类型保护修复

**修复时间**: 2026-03-18 22:50  
**问题**: 角色管理页面分类下拉框不显示分类  
**原因**: 缺少类型保护（默认值）

---

## ❌ 问题分析

### 问题代码（修复前）

```javascript
// Characters.jsx 第 33-40 行
const { data: categories } = useQuery({
  queryKey: ['categories', selectedGame?.id],
  queryFn: async () => {
    if (!selectedGame) return []
    const res = await categoriesAPI.getByGame(selectedGame.id)
    return res.data.categories  // ❌ 没有默认值
  },
  enabled: !!selectedGame,
})
```

**问题**:
1. `res.data.categories` 可能返回 `undefined`
2. React Query 不允许返回 `undefined`
3. 导致分类数据无法正确获取

---

## ✅ 修复方案

### 添加双重类型保护

**修复后**:
```javascript
const { data: categories = [] } = useQuery({
  queryKey: ['categories', selectedGame?.id],
  queryFn: async () => {
    if (!selectedGame) return []
    const res = await categoriesAPI.getByGame(selectedGame.id)
    return res.data.categories || []  // ✅ 双重保护
  },
  enabled: !!selectedGame,
})
```

**保护机制**:
1. **queryFn 返回默认值**: `res.data.categories || []`
2. **解构时设置默认值**: `data: categories = []`

---

## 📊 修复对比

| 位置 | 修复前 | 修复后 | 说明 |
|------|--------|--------|------|
| 分类查询 | `const { data: categories }` | `const { data: categories = [] }` | 添加默认值 |
| 分类 queryFn | `return res.data.categories` | `return res.data.categories \|\| []` | 添加默认值 |
| 角色查询 | `const { data: characters }` | `const { data: characters = [] }` | 添加默认值 |
| 角色 queryFn | `return res.data.characters` | `return res.data.characters \|\| []` | 添加默认值 |

---

## 🎯 为什么需要双重保护？

### 第 1 层：queryFn 返回默认值

```javascript
queryFn: async () => {
  return res.data.categories || []  // 如果 categories 是 undefined，返回 []
}
```

**作用**: 确保 query function 不返回 `undefined`（React Query 规则）

### 第 2 层：解构时设置默认值

```javascript
const { data: categories = [] } = useQuery({...})
```

**作用**: 即使 queryFn 意外返回 `undefined`，`categories` 也有默认值 `[]`

---

## 🧪 测试验证

### 步骤 1: 访问角色管理
```
http://localhost:3003/characters
```

**验证点**:
- [ ] 选择游戏（如"英雄联盟"）
- [ ] 点击"所有分类"下拉框
- [ ] 显示 4 个分类：战士、法师、刺客、射手
- [ ] 选择分类后角色列表正确筛选

### 步骤 2: 验证筛选功能
- [ ] 选择"所有分类" → 显示所有角色
- [ ] 选择"战士" → 只显示潘森、盖伦等战士
- [ ] 选择"法师" → 只显示法师类角色

---

## 📁 修改文件

### 前端
1. ✅ `admin/src/pages/Characters.jsx` - 添加类型保护
   - 分类查询：`data: categories = []`
   - 分类 queryFn：`return res.data.categories || []`
   - 角色查询：`data: characters = []`
   - 角色 queryFn：`return res.data.characters || []`

---

## ⚠️ 注意事项

### 1. 浏览器缓存
修改后需要**硬刷新**（Ctrl+Shift+R）

### 2. React Query 规则

**重要**: React Query 的 query function **不能返回 `undefined`**

```javascript
// ❌ 错误
queryFn: async () => {
  return res.data.categories  // 可能是 undefined
}

// ✅ 正确
queryFn: async () => {
  return res.data.categories || []  // 确保返回数组
}
```

### 3. 其他页面检查

检查所有页面是否都有类型保护：

```javascript
// ✅ 推荐模式
const { data: items = [] } = useQuery({
  queryFn: async () => {
    const res = await api.get()
    return res.data.items || []
  },
})
```

---

## 🔗 相关修复

### 已修复
- ✅ `Characters.jsx` - 分类查询类型保护
- ✅ `Characters.jsx` - 角色查询类型保护
- ✅ `Categories.jsx` - 游戏查询类型保护
- ✅ `Actions.jsx` - 游戏查询类型保护
- ✅ `Videos.jsx` - 游戏查询类型保护
- ✅ 后端 `/api/admin/games` 返回格式
- ✅ 后端 `/api/admin/games/:id/categories` 返回格式

### 待检查
- 📋 `Videos.jsx` - 分类/角色/动作查询类型保护
- 📋 `Actions.jsx` - 分类/角色/动作查询类型保护

---

## 📝 最佳实践

### React Query 类型保护模板

```javascript
const { data: items = [] } = useQuery({
  queryKey: ['items', param],
  queryFn: async () => {
    if (!param) return []  // 前置条件检查
    const res = await api.get(`/items?param=${param}`)
    return res.data.items || []  // 返回默认值
  },
  enabled: !!param,  // 启用条件
})
```

### 防御性编程

```javascript
// ✅ 安全：多层保护
const { data: items = [] } = useQuery({
  queryFn: async () => {
    const res = await api.get()
    return res.data?.items || []  // 可选链 + 默认值
  },
})

// ❌ 不安全
const { data: items } = useQuery({
  queryFn: async () => {
    const res = await api.get()
    return res.data.items  // 可能 undefined
  },
})
```

---

## ✅ 修复状态

- ✅ **分类查询**: 添加双重类型保护
- ✅ **角色查询**: 添加双重类型保护
- ✅ **测试**: 待用户验证（需要硬刷新）

---

**修复完成时间**: 2026-03-18 22:50  
**测试建议**: 硬刷新浏览器（Ctrl+Shift+R）后访问角色管理页面，分类下拉框应该显示 4 个分类
