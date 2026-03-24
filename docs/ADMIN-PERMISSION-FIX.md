# 管理员权限修复部署报告

**日期**: 2026-03-24  
**问题**: content_admin（内容管理员）有游戏管理的编辑权限，应该只能管理分类、角色、动作

---

## 问题根因

**后端 API 权限缺失**:
- 游戏管理 API (`games.ts`) 只验证登录，不检查角色
- content_admin 可以调用创建/编辑/删除游戏的 API

**前端菜单配置错误**:
- 管理后台 Layout.jsx 中，content_admin 的菜单包含"游戏管理"

---

## 修复内容

### 1. 创建统一权限中间件

**文件**: `server/src/middleware/auth.ts`

**新增函数**:
- `requireRole(allowedRoles)` - 通用角色检查
- `requireAdmin` - 管理员权限（system_admin, admin, content_admin）
- `requireSeniorAdmin` - 高级管理员权限（system_admin, admin，不包括 content_admin）
- `requireSystemAdmin` - 仅系统管理员

```typescript
export const requireSeniorAdmin = requireRole(['system_admin', 'admin']);
```

### 2. 后端 API 权限修复

**游戏管理** (`server/src/routes/games.ts`):
- 创建游戏：`requireSeniorAdmin` ✅
- 更新游戏：`requireSeniorAdmin` ✅
- 删除游戏：`requireSeniorAdmin` ✅
- 上传图标：`requireSeniorAdmin` ✅

**分类管理** (`server/src/routes/categories.ts`):
- 创建/更新/删除分类：`requireAdmin` ✅

**角色管理** (`server/src/routes/characters.ts`):
- 所有管理接口：`requireAdmin` ✅

**动作管理** (`server/src/routes/actions.ts`):
- 所有管理接口：`requireAdmin` ✅

### 3. 前端菜单修复

**文件**: `admin/src/components/Layout.jsx`

**content_admin 菜单** (修改后):
```javascript
{ path: '/categories', label: '分类管理', icon: '📁' },
{ path: '/characters', label: '角色管理', icon: '👤' },
{ path: '/actions', label: '动作管理', icon: '🎯' },
{ path: '/settings', label: '账号设置', icon: '⚙️' },
```

**移除的菜单项**:
- ❌ 游戏管理（🎮）
- ❌ 头像审核（🖼️）
- ❌ 设置（改为"账号设置"）

---

## 管理员角色权限表

| 角色 | 游戏管理 | 分类管理 | 角色管理 | 动作管理 | VIP 套餐 | 头像审核 | 设置 |
|------|---------|---------|---------|---------|---------|---------|------|
| **system_admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **admin** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **content_admin** | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (账号设置) |

---

## 部署步骤

### 1. 本地构建
```bash
# 后端
cd /home/tenbox/CKAnim/server
npx prisma generate

# 前端管理后台
cd /home/tenbox/CKAnim/admin
npm run build
```

### 2. 上传到服务器
```bash
# 打包
tar -czf /tmp/ckanim-admin-fix.tar.gz \
  server/src/middleware/auth.ts \
  server/src/routes/games.ts \
  server/src/routes/categories.ts \
  server/src/routes/characters.ts \
  server/src/routes/actions.ts \
  admin/dist

# 上传
scp /tmp/ckanim-admin-fix.tar.gz root@39.102.115.79:/tmp/
```

### 3. 服务器部署
```bash
ssh root@39.102.115.79

cd /var/www/ckanim
tar -xzf /tmp/ckanim-admin-fix.tar.gz

# 重启后端
pm2 restart ckanim-server --update-env

# 验证服务
pm2 status
```

---

## 验证测试

### 测试账号
- **content_admin**: contentadmin / 密码（需要创建）
- **admin**: admin_new / admin123
- **system_admin**: sysadmin / Admin@123

### 测试步骤

1. **登录 content_admin 账号**:
   ```
   http://39.102.115.79:3003
   账号：contentadmin
   密码：[需要设置]
   ```

2. **检查菜单显示**:
   - ✅ 应该显示：分类管理、角色管理、动作管理、账号设置
   - ❌ 不应显示：游戏管理、VIP 套餐、头像审核

3. **尝试访问游戏管理页面**:
   - 直接访问 `http://39.102.115.79:3003/` 应该被拒绝或显示无权限

4. **API 测试**:
   ```bash
   # 使用 content_admin 的 token 尝试创建游戏
   curl -X POST http://39.102.115.79:3002/api/games \
     -H "Authorization: Bearer [content_admin_token]" \
     -H "Content-Type: application/json" \
     -d '{"name":"测试游戏"}'
   
   # 应该返回 403 Forbidden
   ```

---

## 修改文件清单

### 后端文件
- ✅ `server/src/middleware/auth.ts` - 新增权限中间件
- ✅ `server/src/routes/games.ts` - 添加 requireSeniorAdmin
- ✅ `server/src/routes/categories.ts` - 添加 requireAdmin
- ✅ `server/src/routes/characters.ts` - 添加 requireAdmin
- ✅ `server/src/routes/actions.ts` - 添加 requireAdmin

### 前端文件
- ✅ `admin/src/components/Layout.jsx` - 更新菜单显示逻辑
- ✅ `admin/dist/` - 重新构建

---

## 待完成事项

1. **创建 content_admin 测试账号** (如果还没有)
2. **验证所有角色的权限**
3. **更新文档** - 管理员角色权限说明

---

## 重要说明

**权限设计原则**:
- **system_admin**: 完全权限，包括 VIP 套餐管理
- **admin**: 内容管理 + 头像审核，但不包括 VIP 套餐
- **content_admin**: 仅内容管理（分类、角色、动作）+ 账号设置

**安全考虑**:
- 游戏管理涉及整个网站的内容结构，属于高级权限
- content_admin 定位为"内容编辑员"，只能管理具体游戏内的内容
- VIP 套餐涉及商业功能，仅限系统管理员
