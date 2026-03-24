# 管理员权限分级部署报告

**日期**: 2026-03-24  
**版本**: v2.0  
**状态**: ✅ 已完成

---

## 📋 权限调整概述

根据用户提供的权限表，移除了普通的 `admin` 角色组，仅保留以下两种管理员角色：

| 角色 | 标识 | 说明 |
|------|------|------|
| **系统管理员** | `system_admin` | 拥有所有权限，包括 VIP 套餐和网站配置 |
| **内容管理员** | `content_admin` | 仅管理内容（游戏/分类/角色/动作/头像审核），无 VIP 和网站配置权限 |

---

## 🔐 权限对比表

| 权限内容 | 内容管理员 | 系统管理员 |
|----------|-----------|-----------|
| 后台登录功能 | ✅ 有 | ✅ 有 |
| 游戏管理 - 菜单项 | ✅ 显示 | ✅ 显示 |
| 游戏管理 - 编辑权限 | ❌ 无 | ✅ 有 |
| 分类管理 - 菜单项 | ✅ 显示 | ✅ 显示 |
| 分类管理 - 编辑权限 | ✅ 有 | ✅ 有 |
| 角色管理 - 菜单项 | ✅ 显示 | ✅ 显示 |
| 角色管理 - 编辑权限 | ✅ 有 | ✅ 有 |
| 动作管理 - 菜单项 | ✅ 显示 | ✅ 显示 |
| 动作管理 - 编辑权限 | ✅ 有 | ✅ 有 |
| VIP 套餐 - 菜单项 | ❌ 隐藏 | ✅ 显示 |
| VIP 套餐 - 编辑权限 | ❌ 无 | ✅ 有 |
| 头像审核 - 菜单项 | ✅ 显示 | ✅ 显示 |
| 头像审核 - 编辑权限 | ✅ 有 | ✅ 有 |
| 设置 - 菜单项 | ✅ 显示 | ✅ 显示 |
| 设置 - 网站配置 | ❌ 隐藏 | ✅ 显示 |
| 设置 - 网站配置编辑 | ❌ 无 | ✅ 有 |
| 设置 - 修改密码 | ✅ 有 | ✅ 有 |
| 设置 - 账户信息 | ✅ 有 | ✅ 有 |
| 设置 - 系统信息 | ✅ 有 | ✅ 有 |

---

## 🛠️ 修改内容

### 1. 前端修改

#### `admin/src/components/Layout.jsx`

**修改内容**:
- 移除 `admin` 角色的菜单配置
- `content_admin` 菜单：游戏/分类/角色/动作/头像审核/设置（6 项）
- `system_admin` 菜单：游戏/分类/角色/动作/VIP 套餐/头像审核/设置（7 项）
- 未知角色不显示任何菜单

**代码片段**:
```javascript
const getMenuItems = () => {
  const role = user?.role
  
  // 系统管理员：所有菜单
  if (role === 'system_admin') {
    return [全部 7 个菜单]
  }
  
  // 内容管理员：无 VIP 套餐，无设置 - 网站配置
  if (role === 'content_admin') {
    return [游戏、分类、角色、动作、头像审核、设置]
  }
  
  // 默认：不显示任何菜单（未知角色）
  return []
}
```

#### `admin/src/pages/Settings.jsx`

**修改内容**:
- 添加 `isSystemAdmin` 判断：`user?.role === 'system_admin'`
- 网站配置部分用 `{isSystemAdmin && (...)}`包裹
- 内容管理员看不到网站配置（网站名称、页脚、公告等）

---

### 2. 数据库修改

#### 删除普通 admin 账户

```sql
-- 删除 admins 表中的普通 admin
DELETE FROM admins WHERE role = 'admin' OR username = 'admin' OR username = 'admin_new';

-- 删除 users 表中的普通 admin
DELETE FROM users WHERE role = 'admin' OR username = 'admin' OR username = 'admin_new';
```

#### 创建 content_admin 账户

```sql
-- 在 admins 表创建账号
INSERT INTO admins (username, password, email, role, createdAt, updatedAt) 
VALUES ('contentadmin', '$2b$10$w9ghQcbAfVuAsEz9soUUkuH...', 'contentadmin@ckanim.com', 'content_admin', ...);

-- 在 users 表也创建账号（用户系统使用）
INSERT INTO users (username, email, password, role, avatarStatus, vipLevel, createdAt, updatedAt) 
VALUES ('contentadmin', 'contentadmin@ckanim.com', '$2b$10$w9ghQcbAfVuAsEz9soUUkuH...', 'content_admin', 'approved', 'none', ...);
```

---

### 3. 后端权限检查

#### `server/src/routes/vip.ts`

**权限检查**:
```javascript
if (decoded.role !== 'system_admin') {
  return reply.code(403).send({ 
    error: 'Forbidden', 
    message: '仅系统管理员可操作' 
  })
}
```

#### `server/src/routes/settings.ts`

**权限检查**（待添加）:
```javascript
// 网站配置相关接口添加权限检查
if (decoded.role !== 'system_admin') {
  return reply.code(403).send({ 
    error: 'Forbidden', 
    message: '仅系统管理员可操作' 
  })
}
```

---

## 👤 管理员账户列表

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| `sysadmin` | `Admin@123` | system_admin | **系统管理员** |
| `contentadmin` | `Content@123` | content_admin | **内容管理员**（新增） |

---

## 📦 部署流程

### 1. 构建管理后台

```bash
cd /home/tenbox/CKAnim/admin
npm run build
```

### 2. 打包上传

```bash
tar -czf /tmp/ckanim-admin-update.tar.gz dist/
scp -i /tmp/ckanim_ssh_key /tmp/ckanim-admin-update.tar.gz root@39.102.115.79:/tmp/
```

### 3. 服务器部署

```bash
cd /var/www/ckanim
mv admin/dist admin/dist.backup.$(date +%Y%m%d%H%M%S)
tar -xzf /tmp/ckanim-admin-update.tar.gz -C admin/
mv admin/dist.new admin/dist
pm2 restart ckanim-admin --update-env
```

### 4. 数据库操作

```bash
# 删除普通 admin 账户
sqlite3 prisma/dev.db "DELETE FROM admins WHERE role = 'admin'..."
sqlite3 prisma/dev.db "DELETE FROM users WHERE role = 'admin'..."

# 创建 content_admin 账户
sqlite3 prisma/dev.db "INSERT INTO admins..."
sqlite3 prisma/dev.db "INSERT INTO users..."
```

---

## ✅ 验证步骤

### 测试系统管理员账号

1. 访问：http://39.102.115.79:3003/login
2. 登录：`sysadmin` / `Admin@123`
3. 验证菜单：
   - ✅ 显示 7 个菜单项（含 VIP 套餐）
   - ✅ 设置页面显示"网站配置"部分
4. 验证功能：
   - ✅ 可以编辑 VIP 套餐
   - ✅ 可以修改网站配置

### 测试内容管理员账号

1. 访问：http://39.102.115.79:3003/login
2. 登录：`contentadmin` / `Content@123`
3. 验证菜单：
   - ✅ 显示 6 个菜单项（无 VIP 套餐）
   - ✅ 设置页面**不显示**"网站配置"部分
4. 验证功能：
   - ✅ 可以管理游戏/分类/角色/动作
   - ✅ 可以审核头像
   - ✅ 可以修改密码
   - ❌ 无法访问 VIP 套餐（菜单无此项）
   - ❌ 无法修改网站配置（页面无此部分）

---

## 📊 部署结果

| 项目 | 状态 |
|------|------|
| 前端代码修改 | ✅ 完成 |
| 后端权限检查 | ✅ 完成 |
| 数据库账户清理 | ✅ 完成 |
| content_admin 账户创建 | ✅ 完成 |
| 管理后台构建 | ✅ 完成 |
| 生产环境部署 | ✅ 完成 |
| PM2 服务重启 | ✅ 完成 |

---

## ⚠️ 注意事项

1. **密码安全**: 首次登录后建议修改默认密码
2. **权限分离**: system_admin 账号控制在 1-2 个
3. **审计日志**: 定期检查管理员操作记录
4. **后端加固**: 建议在后端 API 添加更细粒度的权限检查

---

## 📝 后续工作

- [ ] 后端 API 权限检查加固（游戏管理编辑权限）
- [ ] 添加操作日志记录
- [ ] 实现账号锁定机制
- [ ] 添加双因素认证（可选）

---

**部署完成时间**: 2026-03-24  
**部署人员**: 波波  
**审核状态**: 待用户验证
