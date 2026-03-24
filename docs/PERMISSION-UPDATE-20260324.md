# 管理员权限调整部署报告

**日期**: 2026-03-24  
**需求**: 根据新的权限表调整管理员角色和权限

---

## 📊 新权限表

| 权限内容 | 内容管理员 (content_admin) | 系统管理员 (system_admin) | VIP0-VIP3 |
|---------|--------------------------|------------------------|---------|
| **后台登录功能** | ✅ 有 | ✅ 有 | ❌ 无 |
| **游戏管理 - 菜单项** | ✅ 显示 | ✅ 显示 | - |
| **游戏管理 - 编辑权限** | ❌ 无 | ✅ 有 | - |
| **分类管理 - 菜单项** | ✅ 显示 | ✅ 显示 | - |
| **分类管理 - 编辑权限** | ✅ 有 | ✅ 有 | - |
| **角色管理 - 菜单项** | ✅ 显示 | ✅ 显示 | - |
| **角色管理 - 编辑权限** | ✅ 有 | ✅ 有 | - |
| **动作管理 - 菜单项** | ✅ 显示 | ✅ 显示 | - |
| **动作管理 - 编辑权限** | ✅ 有 | ✅ 有 | - |
| **VIP 套餐 - 菜单项** | ❌ 隐藏 | ✅ 显示 | - |
| **VIP 套餐 - 编辑权限** | ❌ 无 | ✅ 有 | - |
| **头像审核 - 菜单项** | ✅ 显示 | ✅ 显示 | - |
| **头像审核 - 编辑权限** | ✅ 有 | ✅ 有 | - |
| **设置 - 菜单项** | ✅ 显示 | ✅ 显示 | - |
| **设置 - 网站配置** | ❌ 隐藏 | ✅ 显示 | - |
| **设置 - 网站配置编辑** | ❌ 无 | ✅ 有 | - |
| **设置 - 修改密码** | ✅ 有 | ✅ 有 | - |
| **设置 - 账户信息** | ✅ 有 | ✅ 有 | - |
| **设置 - 系统信息** | ✅ 有 | ✅ 有 | - |

---

## ✅ 变更内容

### 1. 管理员账户调整

**删除角色**:
- ❌ `admin` (普通管理员) - 已删除

**保留角色**:
- ✅ `content_admin` (内容管理员)
- ✅ `system_admin` (系统管理员)

**新建账户**:
```
内容管理员：contentadmin / ContentAdmin@123
系统管理员：sysadmin / SystemAdmin@123
```

### 2. 后端 API 权限

**游戏管理 API** (`server/src/routes/games.ts`):
- 创建/更新/删除游戏：`requireSeniorAdmin` (仅 system_admin)
- content_admin 调用会返回 403 Forbidden

**分类/角色/动作管理 API**:
- `requireAdmin` (content_admin 和 system_admin 都可以)

### 3. 前端菜单调整

**Layout.jsx** - 菜单显示逻辑:

**content_admin 菜单**:
```javascript
{ path: '/', label: '游戏管理', icon: '🎮' },  // ✅ 显示，但无编辑权限
{ path: '/categories', label: '分类管理', icon: '📁' },
{ path: '/characters', label: '角色管理', icon: '👤' },
{ path: '/actions', label: '动作管理', icon: '🎯' },
{ path: '/avatar-review', label: '头像审核', icon: '🖼️' },
{ path: '/settings', label: '设置', icon: '⚙️' },
```

**system_admin 菜单**:
```javascript
// 所有菜单（包括 VIP 套餐）
```

### 4. 游戏管理页面权限控制

**Games.jsx**:
- 添加 `canEditGames` 检查（仅 system_admin）
- content_admin 可以看到游戏列表，但：
  - ❌ 不显示"新建游戏"按钮
  - ❌ 不显示"编辑"按钮
  - ❌ 不显示"上传图标"按钮
  - ❌ 不显示"删除"按钮

### 5. 设置页面优化

**Settings.jsx**:
- ✅ "初始化默认设置"按钮：仅 system_admin 可见
- ✅ "网站配置"区域：仅 system_admin 可见
- ✅ 账户信息显示：动态显示当前登录用户信息（不再是硬编码的 admin）

---

## 📦 部署步骤

### 1. 更新数据库账户

**本地执行** (已完成):
```bash
cd /home/tenbox/CKAnim/server
npx tsx scripts/update-admin-accounts.js
```

**结果**:
- ✅ 删除所有 `admin` 角色账户
- ✅ 创建 `contentadmin` (content_admin)
- ✅ 创建 `sysadmin` (system_admin)

### 2. 构建前端

**本地构建** (已完成):
```bash
cd /home/tenbox/CKAnim/admin
npm run build
```

### 3. 上传到服务器

**打包文件**:
```bash
cd /home/tenbox/CKAnim
tar -czf /tmp/ckanim-permission-update.tar.gz \
  server/scripts/update-admin-accounts.js \
  admin/dist
```

**上传并部署**:
```bash
# 上传
scp /tmp/ckanim-permission-update.tar.gz root@39.102.115.79:/tmp/

# 登录服务器
ssh root@39.102.115.79

# 部署
cd /var/www/ckanim
tar -xzf /tmp/ckanim-permission-update.tar.gz

# 重启服务
pm2 restart all --update-env

# 验证
pm2 status
```

---

## ✅ 验证测试

### 测试账号

**内容管理员**:
- 账号：`contentadmin`
- 密码：`ContentAdmin@123`
- 角色：`content_admin`

**系统管理员**:
- 账号：`sysadmin`
- 密码：`SystemAdmin@123`
- 角色：`system_admin`

### 验证步骤

#### 1. 登录 contentadmin 账号

**菜单检查**:
- ✅ 显示：游戏管理、分类管理、角色管理、动作管理、头像审核、设置
- ❌ 不显示：VIP 套餐

**游戏管理页面**:
- ✅ 可以看到游戏列表
- ❌ 没有"新建游戏"按钮
- ❌ 每个游戏卡片没有"编辑/上传图标/删除"按钮

**设置页面**:
- ❌ 没有"初始化默认设置"按钮
- ❌ 没有"网站配置"区域
- ✅ 显示"修改密码"区域
- ✅ 账户信息显示正确的用户名和角色（contentadmin / 内容管理员）

#### 2. 登录 sysadmin 账号

**菜单检查**:
- ✅ 显示所有菜单（包括 VIP 套餐）

**游戏管理页面**:
- ✅ 有"新建游戏"按钮
- ✅ 每个游戏有"编辑/上传图标/删除"按钮

**设置页面**:
- ✅ 有"初始化默认设置"按钮
- ✅ 有"网站配置"区域
- ✅ 账户信息显示正确的用户名和角色（sysadmin / 系统管理员）

---

## 📁 修改文件清单

### 后端文件
- ✅ `server/scripts/update-admin-accounts.js` - 账户更新脚本
- ✅ `server/src/middleware/auth.ts` - 权限中间件（之前已创建）
- ✅ `server/src/routes/games.ts` - 游戏管理权限（之前已更新）
- ✅ `server/src/routes/categories.ts` - 分类管理权限（之前已更新）
- ✅ `server/src/routes/characters.ts` - 角色管理权限（之前已更新）
- ✅ `server/src/routes/actions.ts` - 动作管理权限（之前已更新）

### 前端文件
- ✅ `admin/src/components/Layout.jsx` - 菜单显示逻辑
- ✅ `admin/src/pages/Games.jsx` - 游戏管理权限控制
- ✅ `admin/src/pages/Settings.jsx` - 设置页面优化
- ✅ `admin/dist/` - 构建产物

---

## 🎯 权限设计说明

### 角色定位

**系统管理员 (system_admin)**:
- 完全权限，包括商业功能（VIP 套餐）
- 网站配置管理
- 游戏管理（创建/编辑/删除）

**内容管理员 (content_admin)**:
- 内容编辑权限（分类、角色、动作）
- 头像审核权限
- 可以查看游戏列表但不能编辑
- 不能管理 VIP 套餐和网站配置

### 安全考虑

1. **游戏管理**: 涉及整个网站的内容结构，属于高级权限
2. **VIP 套餐**: 涉及商业功能，仅限系统管理员
3. **网站配置**: 影响全站显示，仅限系统管理员
4. **内容管理**: 日常运营工作，content_admin 可以处理

---

## 🔄 回滚方法

如果需要恢复旧的 admin 账户：

```bash
cd /home/tenbox/CKAnim/server
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

prisma.admin.create({
  data: {
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    email: 'admin@ckanim.com',
    role: 'admin'
  }
}).then(() => console.log('✅ admin 账户已恢复')).finally(() => prisma.\$disconnect());
"
```

---

## 📝 注意事项

1. **旧 admin 账户已删除** - 如果使用过 admin 账户，需要用新账户
2. **密码已更新** - 新账户使用新密码
3. **前端缓存** - 如果权限不生效，清除浏览器缓存或硬刷新 (Ctrl+Shift+R)
4. **后端权限检查** - 前端隐藏按钮只是用户体验，后端 API 也有权限检查

---

**部署完成时间**: 2026-03-24  
**部署状态**: ✅ 等待部署到服务器
