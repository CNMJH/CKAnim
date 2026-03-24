# 🚀 CKAnim 权限更新 - 手动部署说明

**日期**: 2026-03-24  
**更新内容**: 管理员权限调整、账户更新、前端优化

---

## 📦 方式 1：使用部署脚本（推荐）

### 步骤 1：上传文件到服务器

**使用 FTP/SFTP 工具** (如 FileZilla、WinSCP):
1. 连接服务器：`39.102.115.79`
2. 用户名：`root`
3. 密码：`tenbox2024` (或你设置的密码)
4. 上传文件：
   - `/tmp/ckanim-permission-deploy.tar.gz` → `/tmp/`
   - `/home/tenbox/CKAnim/deploy-to-server.sh` → `/tmp/`

**或使用本地命令行**:
```bash
# 如果知道服务器密码
scp /tmp/ckanim-permission-deploy.tar.gz root@39.102.115.79:/tmp/
scp /home/tenbox/CKAnim/deploy-to-server.sh root@39.102.115.79:/tmp/
```

### 步骤 2：登录服务器执行部署

```bash
ssh root@39.102.115.79

# 进入临时目录
cd /tmp

# 给脚本执行权限
chmod +x deploy-to-server.sh

# 执行部署脚本
./deploy-to-server.sh
```

### 步骤 3：验证部署

按照脚本输出的测试步骤验证。

---

## 📦 方式 2：手动部署

### 1. 上传文件

```bash
# 上传打包文件
scp /tmp/ckanim-permission-deploy.tar.gz root@39.102.115.79:/tmp/
```

### 2. 登录服务器

```bash
ssh root@39.102.115.79
```

### 3. 停止服务

```bash
pm2 stop all
```

### 4. 备份当前文件

```bash
cd /var/www/ckanim
tar -czf /tmp/ckanim-admin-backup-$(date +%Y%m%d_%H%M%S).tar.gz admin/dist
```

### 5. 解压新文件

```bash
cd /var/www/ckanim
tar -xzf /tmp/ckanim-permission-deploy.tar.gz
```

### 6. 重启服务

```bash
pm2 start all --update-env
pm2 status
```

---

## ✅ 验证测试

### 测试 1：内容管理员账号

**登录**:
- URL: http://39.102.115.79:3003
- 账号：`contentadmin`
- 密码：`ContentAdmin@123`

**检查菜单** (应该显示):
- ✅ 🎮 游戏管理
- ✅ 📁 分类管理
- ✅ 👤 角色管理
- ✅ 🎯 动作管理
- ✅ 🖼️ 头像审核
- ✅ ⚙️ 设置
- ❌ 💎 VIP 套餐 (不显示)

**检查游戏管理页面**:
- ✅ 可以看到游戏列表
- ❌ 没有 "+ 新建游戏" 按钮
- ❌ 游戏卡片没有 "编辑/上传图标/删除" 按钮

**检查设置页面**:
- ❌ 没有 "🔄 初始化默认设置" 按钮
- ❌ 没有 "🌐 网站配置" 区域
- ✅ 账户信息显示：用户名 `contentadmin`，角色 `内容管理员`

---

### 测试 2：系统管理员账号

**登录**:
- URL: http://39.102.115.79:3003
- 账号：`sysadmin`
- 密码：`SystemAdmin@123`

**检查菜单** (应该全部显示):
- ✅ 🎮 游戏管理
- ✅ 📁 分类管理
- ✅ 👤 角色管理
- ✅ 🎯 动作管理
- ✅ 💎 VIP 套餐
- ✅ 🖼️ 头像审核
- ✅ ⚙️ 设置

**检查游戏管理页面**:
- ✅ 有 "+ 新建游戏" 按钮
- ✅ 每个游戏有 "编辑/上传图标/删除" 按钮

**检查设置页面**:
- ✅ 有 "🔄 初始化默认设置" 按钮
- ✅ 有 "🌐 网站配置" 区域
- ✅ 账户信息显示：用户名 `sysadmin`，角色 `系统管理员`

---

## 🔧 故障排查

### 问题 1：菜单不更新

**原因**: 浏览器缓存

**解决**:
- 硬刷新：`Ctrl + Shift + R` (Windows/Linux) 或 `Cmd + Shift + R` (Mac)
- 或清除浏览器缓存

### 问题 2：登录失败

**原因**: 数据库未更新

**解决**:
```bash
cd /var/www/ckAnim/server
npx tsx scripts/update-admin-accounts.js
```

### 问题 3：API 权限错误

**原因**: 后端服务未重启

**解决**:
```bash
pm2 restart ckanim-server --update-env
pm2 logs ckanim-server
```

### 问题 4：前端 404

**原因**: dist 目录未正确解压

**解决**:
```bash
cd /var/www/ckanim
ls -la admin/dist/  # 检查文件是否存在
pm2 restart ckanim-admin --update-env
```

---

## 🔄 回滚方法

如果部署后有问题，可以回滚：

```bash
# 登录服务器
ssh root@39.102.115.79

# 找到备份文件
ls -la /tmp/ckanim-admin-backup-*.tar.gz

# 恢复备份
cd /var/www/ckanim
tar -xzf /tmp/ckanim-admin-backup-YYYYMMDD_HHMMSS.tar.gz

# 重启服务
pm2 restart ckanim-admin --update-env
```

---

## 📋 修改文件清单

### 前端文件
- `admin/src/components/Layout.jsx` - 菜单显示逻辑
- `admin/src/pages/Games.jsx` - 游戏管理权限控制
- `admin/src/pages/Settings.jsx` - 设置页面优化
- `admin/dist/` - 构建产物

### 后端文件
- `server/scripts/update-admin-accounts.js` - 账户更新脚本
- `server/src/middleware/auth.ts` - 权限中间件
- `server/src/routes/games.ts` - 游戏管理权限
- `server/src/routes/categories.ts` - 分类管理权限
- `server/src/routes/characters.ts` - 角色管理权限
- `server/src/routes/actions.ts` - 动作管理权限

### 文档
- `docs/PERMISSION-UPDATE-20260324.md` - 完整权限更新报告

---

## 🎯 关键变更

1. **删除 admin 角色**，只保留 content_admin 和 system_admin
2. **游戏管理**: content_admin 只能查看，不能编辑
3. **VIP 套餐**: 仅 system_admin 可见
4. **网站配置**: 仅 system_admin 可见
5. **设置页面**: 去掉初始化按钮（对 content_admin），更新账户信息显示

---

**部署完成后，请按照测试步骤验证所有功能！**
