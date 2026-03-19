# Actions.jsx 选择游戏报错 - 调试指南

**时间**: 2026-03-18 21:55  
**问题**: 用户在动作管理页面选择游戏时报错

---

## 🔍 问题分析

### 后端 API 状态
✅ 所有 API 正常返回 200：
- `GET /api/admin/games` - 游戏列表 ✅
- `GET /api/admin/games/3/categories` - 分类列表 ✅
- `GET /api/admin/characters?gameId=3` - 角色列表 ✅
- `GET /api/admin/actions` - 动作列表 ✅

### 前端代码状态
✅ 代码编译成功（`npm run build` 通过）
✅ 语法无错误
✅ API 调用逻辑正确

---

## 🎯 可能原因

### 1. 浏览器缓存旧代码 ⭐ 最可能
**现象**: 修改后的代码未生效，浏览器运行旧版本

**解决方法**:
```
硬刷新：Ctrl + Shift + R (Windows/Linux)
         Cmd + Shift + R (macOS)
```

### 2. Vite HMR 失效
**现象**: 热更新未触发，需要手动清除缓存

**解决方法**:
```bash
cd /home/tenbox/CKAnim/admin
rm -rf node_modules/.vite
# 重启服务
npm run dev
```

### 3. React Query 缓存
**现象**: React Query 缓存了旧数据

**解决方法**:
- 打开浏览器开发者工具
- 找到 React Query DevTools
- 清除缓存
- 或直接刷新页面

### 4. 控制台错误
**现象**: JavaScript 运行时错误

**排查方法**:
```
1. 打开浏览器开发者工具 (F12)
2. 切换到 Console 标签
3. 选择游戏
4. 查看红色错误信息
```

---

## 🛠️ 调试步骤

### 步骤 1: 查看控制台错误

打开浏览器开发者工具 (F12)，切换到 Console 标签，然后选择游戏。

**可能的错误**:
```javascript
// 错误 1: Cannot read property 'map' of undefined
// 原因：gamesData 是 undefined
// 解决：检查 API 返回格式

// 错误 2: gamesData.map is not a function
// 原因：gamesData 不是数组
// 解决：检查 API 返回格式

// 错误 3: Cannot read property 'id' of undefined
// 原因：game 对象是 undefined
// 解决：检查数据格式
```

### 步骤 2: 查看网络请求

打开浏览器开发者工具 (F12)，切换到 Network 标签，然后选择游戏。

**检查点**:
- [ ] `/api/admin/games` 请求是否成功（200）
- [ ] `/api/admin/games/:id/categories` 请求是否成功（200）
- [ ] `/api/admin/characters?gameId=:id` 请求是否成功（200）
- [ ] 响应数据格式是否正确

**预期响应**:
```json
// GET /api/admin/games
{
  "games": [
    {"id": 1, "name": "英雄联盟", ...},
    {"id": 3, "name": "原神", ...}
  ]
}

// GET /api/admin/games/3/categories
{
  "categories": [
    {"id": 3, "name": "战士", ...},
    {"id": 4, "name": "法师", ...}
  ]
}
```

### 步骤 3: 清除所有缓存

```bash
# 1. 杀掉所有 Vite 进程
pkill -9 -f "vite"

# 2. 清除 Vite 缓存
rm -rf /home/tenbox/CKAnim/admin/node_modules/.vite
rm -rf /home/tenbox/CKAnim/front/node_modules/.vite

# 3. 重启服务
cd /home/tenbox/CKAnim/admin
npm run dev &

cd /home/tenbox/CKAnim/front
npm run dev &
```

### 步骤 4: 浏览器硬刷新

1. 关闭所有浏览器标签页
2. 重新打开 http://localhost:3003/actions
3. **硬刷新**: Ctrl + Shift + R

---

## 📊 代码验证

### 验证 1: gamesData 格式

```javascript
// Actions.jsx 第 26-32 行
const { data: gamesData } = useQuery({
  queryKey: ['games'],
  queryFn: async () => {
    const response = await gamesAPI.getAll()
    return response.data.games || []  // ✅ 正确：返回数组
  },
})
```

### 验证 2: categoriesData 格式

```javascript
// Actions.jsx 第 35-42 行
const { data: categoriesData } = useQuery({
  queryKey: ['categories', selectedGameId],
  queryFn: async () => {
    if (!selectedGameId) return []
    const response = await categoriesAPI.getByGame(parseInt(selectedGameId))
    return response.data.categories || []  // ✅ 正确：返回数组
  },
  enabled: !!selectedGameId,
})
```

### 验证 3: charactersData 格式

```javascript
// Actions.jsx 第 45-52 行
const { data: charactersData } = useQuery({
  queryKey: ['characters', selectedGameId],
  queryFn: async () => {
    if (!selectedGameId) return []
    const response = await charactersAPI.getByGame(parseInt(selectedGameId))
    return response.data.characters || []  // ✅ 正确：返回数组
  },
  enabled: !!selectedGameId,
})
```

---

## 🎯 快速解决方案

### 方案 1: 硬刷新（推荐）
```
1. 按 F12 打开开发者工具
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"
```

### 方案 2: 清除 Vite 缓存
```bash
cd /home/tenbox/CKAnim/admin
rm -rf node_modules/.vite
npm run dev
```

### 方案 3: 完全重启
```bash
# 1. 杀掉所有相关进程
pkill -9 -f "vite"
pkill -9 -f "tsx.*server"

# 2. 清除所有缓存
rm -rf /home/tenbox/CKAnim/admin/node_modules/.vite
rm -rf /home/tenbox/CKAnim/front/node_modules/.vite
rm -rf /home/tenbox/CKAnim/server/node_modules/.cache/tsx

# 3. 重启所有服务
/home/tenbox/CKAnim/restart-all-services.sh
```

---

## 📝 测试清单

### 功能测试
- [ ] 打开 http://localhost:3003/actions
- [ ] 页面正常加载，显示"动作管理"标题
- [ ] 看到"选择游戏"下拉框
- [ ] 选择游戏（如"原神"）
- [ ] 出现"所有分类"和"所有角色"下拉框
- [ ] 选择分类后，角色列表更新
- [ ] 选择角色后，动作列表更新

### 样式测试
- [ ] 筛选器有白色背景
- [ ] 筛选器有圆角边框
- [ ] 筛选器有轻微阴影
- [ ] hover 时边框变紫色
- [ ] focus 时有紫色阴影

---

## 🔗 相关文件

- `admin/src/pages/Actions.jsx` - 动作管理页面组件
- `admin/src/pages/Actions.css` - 动作管理页面样式
- `admin/src/styles/filters.css` - 全局筛选器样式
- `admin/src/lib/services.js` - API 服务定义
- `docs/actions-filter-fix.md` - 筛选器修复文档

---

## ⚠️ 常见错误及解决方案

### 错误 1: "Cannot read property 'map' of undefined"
**原因**: API 返回格式不是预期的 `{ games: [...] }`

**解决**: 检查后端 API 返回格式，或在前端添加防御性代码：
```javascript
return response.data?.games || []
```

### 错误 2: 页面空白，控制台无错误
**原因**: Vite 缓存问题

**解决**: 清除缓存 + 硬刷新

### 错误 3: 样式不生效
**原因**: CSS 文件未重新加载

**解决**: 硬刷新（Ctrl+Shift+R）

---

## 📞 需要提供的信息

如果问题仍未解决，请提供以下信息：

1. **浏览器控制台错误**（截图或文字）
2. **Network 面板截图**（显示 API 请求和响应）
3. **具体报错信息**（完整的错误堆栈）
4. **浏览器版本**（Chrome/Firefox/Safari 等）
5. **操作步骤**（详细的重现步骤）

---

**建议操作**: 
1. 先硬刷新浏览器（Ctrl+Shift+R）
2. 如果无效，清除 Vite 缓存并重启服务
3. 查看控制台错误信息，根据错误类型排查
