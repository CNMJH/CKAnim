# React Query "data cannot be undefined" 错误修复

**修复时间**: 2026-03-18 22:10  
**错误**: `Query data cannot be undefined. Affected query key: ["games"]`

---

## ❌ 错误原因

### React Query 规则

**React Query 要求**: query function **不能返回 `undefined`**

```javascript
// ❌ 错误：可能返回 undefined
const { data } = useQuery({
  queryKey: ['games'],
  queryFn: async () => {
    const res = await gamesAPI.getAll()
    return res.data.games  // 如果 API 返回格式不对，这里是 undefined
  },
})

// ✅ 正确：返回空数组
const { data } = useQuery({
  queryKey: ['games'],
  queryFn: async () => {
    const res = await gamesAPI.getAll()
    return res.data.games || []  // 确保返回数组
  },
})
```

### 错误信息

```
Query data cannot be undefined. Please make sure query.ts:551 
to return a value other than undefined from your query function.
Affected query key: ["games"]
```

**翻译**: query function 不能返回 undefined，必须返回其他值。

---

## ✅ 修复方案

### 修复 1: Characters.jsx

```javascript
// 修复前
const { data: gamesData } = useQuery({
  queryKey: ['games'],
  queryFn: async () => {
    const res = await gamesAPI.getAll()
    return res.data.games  // ❌ 可能 undefined
  },
})

// 修复后
const { data: gamesData = [] } = useQuery({
  queryKey: ['games'],
  queryFn: async () => {
    const res = await gamesAPI.getAll()
    return res.data.games || []  // ✅ 确保返回数组
  },
})
```

**双重保护**:
1. queryFn 返回 `res.data.games || []`
2. 解构时设置默认值 `data: gamesData = []`

### 修复 2: Actions.jsx

```javascript
// 修复前
const { data: gamesData } = useQuery({
  queryKey: ['games'],
  queryFn: async () => {
    const response = await gamesAPI.getAll()
    return response.data.games || []
  },
})

// 修复后
const { data: gamesData = [] } = useQuery({
  queryKey: ['games'],
  queryFn: async () => {
    const response = await gamesAPI.getAll()
    return response.data.games || []
  },
})
```

### 修复 3: Videos.jsx

```javascript
// 修复前
const { data: games } = useQuery({
  queryKey: ['games'],
  queryFn: async () => {
    const response = await gamesAPI.getAll()
    return response.data  // ❌ 返回整个 response.data，可能没有 games 字段
  },
})

// 修复后
const { data: games = [] } = useQuery({
  queryKey: ['games'],
  queryFn: async () => {
    const response = await gamesAPI.getAll()
    return response.data.games || []  // ✅ 提取 games 字段
  },
})
```

### 修复 4: Categories.jsx

```javascript
// 修复前
const { data: games } = useQuery({
  queryKey: ['games'],
  queryFn: async () => {
    const response = await gamesAPI.getAll()
    return response.data  // ❌ 返回整个 response.data
  },
})

// 修复后
const { data: games = [] } = useQuery({
  queryKey: ['games'],
  queryFn: async () => {
    const response = await gamesAPI.getAll()
    return response.data.games || []  // ✅ 提取 games 字段
  },
})
```

---

## 📊 修复汇总

| 文件 | 修复前 | 修复后 | 状态 |
|------|--------|--------|------|
| `Characters.jsx` | `return res.data.games` | `return res.data.games \|\| []` + `data: gamesData = []` | ✅ 已修复 |
| `Actions.jsx` | `return response.data.games \|\| []` | `data: gamesData = []` | ✅ 已修复 |
| `Videos.jsx` | `return response.data` | `return response.data.games \|\| []` + `data: games = []` | ✅ 已修复 |
| `Categories.jsx` | `return response.data` | `return response.data.games \|\| []` + `data: games = []` | ✅ 已修复 |

---

## 🎯 最佳实践

### 1. React Query 返回规则

```javascript
// ✅ 总是返回一个值（不能是 undefined）
queryFn: async () => {
  const res = await api.get()
  return res.data.items || []  // 返回数组
}

// ❌ 不要返回 undefined
queryFn: async () => {
  const res = await api.get()
  return res.data.items  // 可能是 undefined
}
```

### 2. 解构默认值

```javascript
// ✅ 双重保护
const { data: items = [] } = useQuery({
  queryKey: ['items'],
  queryFn: async () => {
    const res = await api.get()
    return res.data.items || []
  },
})

// ⚠️ 只有 queryFn 保护
const { data: items } = useQuery({
  queryKey: ['items'],
  queryFn: async () => {
    const res = await api.get()
    return res.data.items || []
  },
})
```

### 3. API 响应格式

**预期格式**:
```json
{
  "games": [
    {"id": 1, "name": "英雄联盟"},
    {"id": 3, "name": "原神"}
  ]
}
```

**防御性代码**:
```javascript
// ✅ 安全提取
return response.data.games || []

// ❌ 不安全
return response.data.games  // 如果 games 字段不存在，返回 undefined
```

---

## 🧪 测试验证

### 测试步骤

1. **访问所有管理页面**:
   - http://localhost:3003/games
   - http://localhost:3003/categories
   - http://localhost:3003/characters
   - http://localhost:3003/actions
   - http://localhost:3003/videos

2. **验证无错误**:
   - [ ] 打开页面不报错
   - [ ] 控制台无红色错误
   - [ ] 选择游戏下拉框正常显示
   - [ ] 选择游戏后筛选器正常出现

3. **验证功能**:
   - [ ] 角色管理：选择游戏 → 显示角色列表
   - [ ] 动作管理：选择游戏 → 显示分类/角色筛选
   - [ ] 视频管理：选择游戏 → 显示视频列表
   - [ ] 分类管理：选择游戏 → 显示分类列表

---

## 📁 修改文件

### 修改的文件
1. ✅ `admin/src/pages/Characters.jsx` - 添加默认值 + 修复返回
2. ✅ `admin/src/pages/Actions.jsx` - 添加默认值
3. ✅ `admin/src/pages/Videos.jsx` - 修复返回格式 + 添加默认值
4. ✅ `admin/src/pages/Categories.jsx` - 修复返回格式 + 添加默认值

### 修复代码量
- **修改行数**: 4 个文件 × 2 行 = 8 行
- **修复点**: 4 个 useQuery hooks

---

## ⚠️ 注意事项

### 1. 浏览器缓存
修改后必须**硬刷新**（Ctrl+Shift+R）

### 2. API 响应格式变化
如果后端 API 响应格式变化，需要同步更新前端：

```javascript
// 后端返回格式变化
// 旧：{ games: [...] }
// 新：{ data: [...], total: 10 }

// 前端需要同步修改
return response.data.games || []  // ❌ 旧格式
return response.data.data || []   // ✅ 新格式
```

### 3. 其他可能的 undefined

检查所有 useQuery：
```javascript
// 检查是否还有其他可能返回 undefined 的 query
const { data: categories } = useQuery({...})
const { data: characters } = useQuery({...})
const { data: actions } = useQuery({...})
const { data: videos } = useQuery({...})
const { data: tags } = useQuery({...})
```

**建议**: 所有 useQuery 都添加默认值：
```javascript
const { data: items = [] } = useQuery({...})
```

---

## 🔗 相关资源

- [React Query: queryFn cannot return undefined](https://tanstack.com/query/latest/docs/react/guides/queries)
- [MDN: Logical OR (||)](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Logical_OR)
- [MDN: Default Parameters](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Functions/Default_parameters)

---

## ✅ 修复状态

- ✅ **Characters.jsx** - 已修复
- ✅ **Actions.jsx** - 已修复
- ✅ **Videos.jsx** - 已修复
- ✅ **Categories.jsx** - 已修复

**测试**: ⏳ 待用户验证（需要硬刷新）

---

**修复完成时间**: 2026-03-18 22:10  
**测试建议**: 硬刷新浏览器（Ctrl+Shift+R）后访问各个管理页面
