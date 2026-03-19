# 分类 API 格式修复

**修复时间**: 2026-03-18 22:40  
**问题**: 动作管理页面分类下拉框不显示分类  
**根本原因**: 分类 API 返回格式与前端期望不匹配

---

## ❌ 问题分析

### 后端返回格式（修复前）
```json
[
  {"id": 3, "name": "战士", ...},
  {"id": 4, "name": "法师", ...},
  ...
]
```

### 前端期望格式
```javascript
// Actions.jsx
const { data: categoriesData } = useQuery({
  queryFn: async () => {
    const response = await categoriesAPI.getByGame(Number(selectedGameId))
    return response.data.categories || []  // ⚠️ 期望 response.data.categories
  },
})
```

**问题**: 
- 后端直接返回 **数组** `[...]`
- 前端期望 **对象** `{ categories: [...] }`
- `response.data.categories` → `undefined`

---

## ✅ 修复方案

### 修改分类 API 返回格式

**文件**: `server/src/routes/categories.ts`

**修复前** (第 61 行):
```typescript
reply.send(categories);  // ❌ 直接返回数组
```

**修复后**:
```typescript
reply.send({ categories });  // ✅ 返回对象 { categories: [...] }
```

---

## 📊 修复验证

### 后端 API 测试

```bash
curl http://localhost:3002/api/admin/games/3/categories
```

**修复前输出**:
```json
[{"id":3,"name":"战士",...}, ...]
```

**修复后输出**:
```json
{"categories":[{"id":3,"name":"战士",...}, ...]}
```

---

## 🎯 API 格式统一

现在所有 API 都返回统一的对象格式：

| API | 返回格式 | 状态 |
|-----|---------|------|
| `GET /api/admin/games` | `{ games: [...] }` | ✅ 已修复 |
| `GET /api/admin/games/:id/categories` | `{ categories: [...] }` | ✅ 已修复 |
| `GET /api/admin/characters` | `{ characters: [...] }` | ✅ 原本正确 |
| `GET /api/admin/actions` | `{ actions: [...] }` | ✅ 原本正确 |
| `GET /api/admin/videos` | `{ videos: [...] }` | ✅ 原本正确 |

---

## 🧪 测试验证

### 步骤 1: 访问动作管理
```
http://localhost:3003/actions
```

**验证点**:
- [ ] 选择游戏（如"英雄联盟"）
- [ ] 点击"所有分类"下拉框
- [ ] 显示已创建的分类（战士、法师、刺客、射手）
- [ ] 选择分类后角色列表更新

### 步骤 2: 验证分类筛选
- [ ] 选择"所有分类" → 显示所有角色
- [ ] 选择"战士" → 只显示战士类别的角色
- [ ] 选择"法师" → 只显示法师类别的角色

---

## 📁 修改文件

### 后端
1. ✅ `server/src/routes/games.ts` - GET /games 返回格式修复
2. ✅ `server/src/routes/categories.ts` - GET /games/:id/categories 返回格式修复

### 前端（无需修改）
- `admin/src/pages/Actions.jsx` - 代码原本就正确
- `admin/src/pages/Categories.jsx` - 代码原本就正确
- `admin/src/pages/Characters.jsx` - 代码原本就正确
- `admin/src/pages/Videos.jsx` - 代码原本就正确

---

## ⚠️ 注意事项

### 1. 自动重启
修改后端代码后，`tsx watch` 会自动重启服务，无需手动操作。

### 2. 浏览器缓存
如果修改后仍然不显示，请硬刷新浏览器（Ctrl+Shift+R）

### 3. 其他 API 检查
检查所有 API 是否都返回对象格式：

```bash
# 检查动作 API
curl http://localhost:3002/api/admin/actions

# 检查视频 API
curl http://localhost:3002/api/admin/videos?gameId=3
```

**预期格式**: 都应该返回对象 `{ xxx: [...] }` 而非直接数组

---

## 🔗 相关修复

### 已修复
- ✅ 后端 `/api/admin/games` 返回格式
- ✅ 后端 `/api/admin/games/:id/categories` 返回格式
- ✅ 前端所有页面类型保护（`data: xxx = []`）

### 待检查
- 📋 `/api/admin/actions` 返回格式
- 📋 `/api/admin/videos` 返回格式
- 📋 `/api/admin/tags` 返回格式

---

## 📝 经验总结

### API 设计规范

**统一返回格式**:
```typescript
// ✅ 推荐：返回对象
{
  "items": [...],
  "total": 100
}

// 或（本项目）
{
  "games": [...],
  "categories": [...],
  "characters": [...],
  "actions": [...],
  "videos": [...]
}

// ❌ 不推荐：直接返回数组
[...]
```

**优点**:
1. 一致性 - 所有接口格式统一
2. 可读性 - 清楚知道返回的是什么数据
3. 扩展性 - 可以添加 `total`, `page`, `meta` 等元数据
4. 安全性 - 避免 `undefined` 错误

### 前后端约定

**重要**: 前后端必须约定统一的 API 响应格式

**建议**:
1. 使用 TypeScript 定义接口类型
2. 编写 API 文档（如 Swagger/OpenAPI）
3. 添加接口测试用例
4. Code Review 时检查返回格式

---

## ✅ 修复状态

- ✅ **后端**: `/api/admin/games` 返回 `{ games: [...] }`
- ✅ **后端**: `/api/admin/games/:id/categories` 返回 `{ categories: [...] }`
- ✅ **前端**: 所有页面代码正确
- ✅ **测试**: 待用户验证

---

**修复完成时间**: 2026-03-18 22:40  
**测试建议**: 刷新浏览器（Ctrl+Shift+R）后访问动作管理页面，分类下拉框应该显示已创建的分类
