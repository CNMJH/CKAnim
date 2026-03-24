# 🛡️ 安全部署方案 - 仅更新前端

**目标**: 只更新管理后台前端文件，**不影响数据库和后端功能**

---

## ⚠️ 重要说明

**本次部署范围**:
- ✅ 仅更新：`admin/dist/` (管理后台前端文件)
- ❌ 不执行：数据库账户更新脚本
- ❌ 不修改：后端 API 代码
- ❌ 不影响：现有数据库数据

**原因**: 
- 数据库账户可以在需要时手动更新
- 后端 API 权限检查已经部署（之前的权限中间件）
- 前端更新不会影响数据库结构

---

## 📦 部署文件

**已打包文件**: `/tmp/ckanim-frontend-only.tar.gz`

**包含内容**:
```
admin/dist/
  ├── index.html
  ├── assets/
  │   ├── index-*.css
  │   └── index-*.js
```

**不包含**:
- ❌ 数据库脚本
- ❌ 后端代码
- ❌ Prisma Schema

---

## 🚀 安全部署步骤

### 步骤 1: 上传文件

上传 `/tmp/ckanim-frontend-only.tar.gz` 到服务器 `/tmp/` 目录

### 步骤 2: 登录服务器

```bash
ssh root@39.102.115.79
```

### 步骤 3: 备份当前前端

```bash
cd /var/www/ckanim
cp -r admin/dist admin/dist.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ 备份完成：admin/dist.backup.*"
```

### 步骤 4: 停止管理后台服务

```bash
pm2 stop ckanim-admin
```

### 步骤 5: 更新前端文件

```bash
cd /var/www/ckanim
rm -rf admin/dist
tar -xzf /tmp/ckanim-frontend-only.tar.gz -C admin/
```

### 步骤 6: 重启服务

```bash
pm2 start ckanim-admin --update-env
pm2 status
```

### 步骤 7: 验证

```bash
# 检查服务状态
pm2 logs ckanim-admin --lines 20

# 访问测试
curl -I http://39.102.115.79:3003
```

---

## ✅ 验证测试（不影响现有用户）

### 测试 1: 现有管理员账号登录

**使用现有账号测试** (不要用新账号):
```
URL: http://39.102.115.79:3003
账号：admin (或你现有的管理员账号)
密码：你的密码
```

**检查**:
- ✅ 能正常登录
- ✅ 所有功能正常
- ✅ 数据库数据完整

### 测试 2: 浏览器缓存清理

如果界面没有更新：
- 硬刷新：`Ctrl + Shift + R`
- 或清除浏览器缓存

---

## 🔄 回滚方案（1 分钟内恢复）

如果有任何问题，立即回滚：

```bash
# 停止服务
pm2 stop ckanim-admin

# 恢复备份
cd /var/www/ckanim
rm -rf admin/dist
cp -r admin/dist.backup.* admin/dist

# 重启服务
pm2 start ckanim-admin --update-env

echo "✅ 已回滚到部署前状态"
```

---

## 📊 部署前后对比

| 项目 | 部署前 | 部署后 | 影响 |
|------|--------|--------|------|
| 数据库 | 不变 | 不变 | ✅ 无影响 |
| 后端 API | 不变 | 不变 | ✅ 无影响 |
| 管理员账户 | 不变 | 不变 | ✅ 无影响 |
| 前端界面 | 旧版本 | 新版本 | ✅ 仅 UI 更新 |
| 权限控制 | 后端已有限制 | 前端同步显示 | ✅ 更安全 |

---

## 🎯 预期效果

**前端更新后**:
- 管理后台界面优化
- 账户信息显示更准确
- 设置页面更清晰
- 权限控制更直观

**不会改变**:
- 现有管理员账号和密码
- 数据库中的用户数据
- 后端 API 权限检查
- 现有业务流程

---

## 📝 后续可选操作

**如果你想更新管理员账户** (可选，不影响当前使用):

```bash
# 在服务器上执行
cd /var/www/ckanim/server
npx tsx scripts/update-admin-accounts.js
```

**这会**:
- 创建新账户：contentadmin, sysadmin
- 删除旧账户：admin (如果有)

**不执行也没关系**，现有账户可以继续使用。

---

**部署原则**: 安全第一，不影响现有功能！
