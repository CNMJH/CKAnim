# BUG 修复：角色管理页面刷新后角色消失

## 🐛 问题描述

**时间**: 2026-03-18 19:45  
**现象**: 创建完角色后，前台网站能看到，但后台角色管理页面刷新后角色消失（显示"暂无角色"）

---

## 🔍 问题原因

**错误日志**:
```
PrismaClientValidationError: 
Unknown field `videos` for include statement on model `Action`. 
Available options are marked with ?.
```

**根本原因**:
- 2026-03-18 17:36 将 Action-Video 关系从 1 对多改为 1 对 1
- Schema 变更：`Action.videos: Video[]` → `Action.video: Video?`
- **遗漏**: `server/src/routes/characters.ts` 第 38 行还在查询 `videos: true`
- Prisma 找不到 `videos` 字段，抛出验证错误，API 返回 500

---

## ✅ 修复方案

### 文件：`server/src/routes/characters.ts`

**修改前** (第 36-40 行):
```typescript
actions: {
  include: {
    videos: true,  // ❌ 错误：字段不存在
  },
},
```

**修改后**:
```typescript
actions: {
  include: {
    video: true,  // ✅ 正确：1 对 1 关系
  },
},
```

---

## 🧪 验证结果

### 公开 API
```bash
curl http://localhost:3002/api/characters?gameId=1
```

**响应**:
```json
{
  "characters": [{
    "id": 1,
    "name": "迪卢克",
    "game": {"id": 1, "name": "原神"},
    "category": {"id": 1, "name": "火", "level": 1},
    "actions": []
  }]
}
```

### 管理员 API
```bash
curl http://localhost:3002/api/admin/characters?gameId=1 \
  -H "Authorization: Bearer $TOKEN"
```

**响应**: ✅ 同上，成功返回角色列表

---

## 📋 检查清单

修复后检查了所有相关文件，确保 `videos` 已全部改为 `video`：

| 文件 | 状态 |
|------|------|
| `server/src/routes/characters.ts` | ✅ 已修复 |
| `server/src/routes/actions.ts` | ✅ 正确（使用 video） |
| `server/src/routes/videos.ts` | ✅ 正确（使用 video） |
| `server/src/routes/public-characters.ts` | ✅ 正确（使用 video） |

---

## ⚠️ 教训

### 1. Schema 变更后的全面检查
修改 Prisma Schema 后，必须：
1. **全局搜索**旧字段名（`grep -r "videos:" server/src/`）
2. **检查所有路由文件**，确保 include 语句同步更新
3. **运行测试**验证 API 正常

### 2. 错误日志的重要性
- 前台显示"暂无角色"，但实际是 API 500 错误
- 必须查看后端日志才能找到根本原因
- Prisma 验证错误非常明确，直接指出字段名问题

### 3. 1 对 1 关系的影响范围
修改关联关系时，影响的不只是 Schema：
- ✅ Schema 定义
- ✅ 后端路由（include 语句）
- ✅ 前端代码（访问 `action.video` 而非 `action.videos[0]`）
- ✅ 测试脚本

---

## 🔧 快速修复命令

```bash
# 1. 全局搜索旧字段名
grep -rn "videos:" server/src/routes/

# 2. 修复文件
edit_file server/src/routes/characters.ts
  videos: true → video: true

# 3. 重启后端
pkill -9 -f "tsx.*server"
cd server && npm run dev

# 4. 验证 API
curl http://localhost:3002/api/characters?gameId=1
```

---

**状态**: ✅ 已修复  
**影响**: 角色管理页面、角色选择器  
**修复时间**: 2026-03-18 19:50
