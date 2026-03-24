# 管理员权限修复 - 部署说明

**问题**: content_admin（内容管理员）有游戏管理的编辑权限

**修复**: 
- 后端 API 添加角色权限检查
- 前端菜单移除 content_admin 的游戏管理入口

---

## 📦 部署步骤

### 方式 1：手动上传（推荐）

**1. 在本地打包** (已完成):
```bash
tar -czf /tmp/ckanim-permission-fix.tar.gz \
  server/src/middleware/auth.ts \
  server/src/routes/games.ts \
  server/src/routes/categories.ts \
  server/src/routes/characters.ts \
  server/src/routes/actions.ts \
  admin/dist
```

**2. 上传到服务器**:
```bash
scp /tmp/ckanim-permission-fix.tar.gz root@39.102.115.79:/tmp/
```

**3. 登录服务器并部署**:
```bash
ssh root@39.102.115.79

cd /var/www/ckanim

# 停止服务
pm2 stop all

# 备份（可选）
tar -czf /tmp/ckanim-backup-$(date +%Y%m%d_%H%M%S).tar.gz \
  server/src/middleware/auth.ts \
  server/src/routes/games.ts \
  server/src/routes/categories.ts \
  server/src/routes/characters.ts \
  server/src/routes/actions.ts \
  admin/dist

# 解压新文件
tar -xzf /tmp/ckanim-permission-fix.tar.gz

# 重启服务
pm2 start all --update-env

# 查看状态
pm2 status
```

---

### 方式 2：使用部署脚本

**1. 上传打包文件和脚本**:
```bash
scp /tmp/ckanim-permission-fix.tar.gz root@39.102.115.79:/tmp/
scp /home/tenbox/CKAnim/deploy-permission-fix.sh root@39.102.115.79:/tmp/
```

**2. 在服务器上执行脚本**:
```bash
ssh root@39.102.115.79
cd /tmp
chmod +x deploy-permission-fix.sh
./deploy-permission-fix.sh
```

---

## ✅ 验证测试

**1. 登录 content_admin 账号**:
```
URL: http://39.102.115.79:3003
账号：contentadmin
密码：[当前密码]
```

**2. 检查菜单**:
应该只显示：
- 📁 分类管理
- 👤 角色管理
- 🎯 动作管理
- ⚙️ 账号设置

**不应该显示**:
- ❌ 🎮 游戏管理
- ❌ 💎 VIP 套餐
- ❌ 🖼️ 头像审核

**3. 测试 API 权限**:
尝试直接访问游戏管理页面应该被拒绝。

---

## 📊 权限说明

| 角色 | 游戏管理 | 分类管理 | 角色管理 | 动作管理 | VIP 套餐 | 头像审核 |
|------|---------|---------|---------|---------|---------|---------|
| system_admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| content_admin | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 🔧 回滚方法

如果有问题，恢复备份：
```bash
cd /var/www/ckanim
tar -xzf /tmp/ckanim-backup-*.tar.gz
pm2 restart all --update-env
```
