# 🚀 个人参考库 VIP 上传限制功能 - 服务器部署指南

## ⚠️ 重要提示

**此部署需要在服务器上进行**，不是本地环境！

---

## 📋 部署前检查

### 1. 确认服务器连接
```bash
ssh root@anick.cn
```

### 2. 确认服务运行
```bash
pm2 list
# 应该看到：
# - ckanim-server
# - ckanim-front
# - ckanim-admin
```

---

## 🔧 服务器部署步骤

### 步骤 1：上传代码到服务器

**方法 A：使用 Git（推荐）**
```bash
# 在服务器上
cd /var/www/ckanim
git pull origin main
```

**方法 B：使用 SCP 上传**
```bash
# 在本地执行
scp -r src/ root@anick.cn:/var/www/ckanim/src/
scp -r dist/ root@anick.cn:/var/www/ckanim/dist/
scp server/src/routes/user-library.ts root@anick.cn:/var/www/ckanim/server/src/routes/
scp server/scripts/init-settings.js root@anick.cn:/var/www/ckanim/server/scripts/
```

### 步骤 2：在服务器上安装依赖

```bash
cd /var/www/ckanim
npm install
```

### 步骤 3：在服务器上构建前端

```bash
cd /var/www/ckanim
npm run build
```

### 步骤 4：在服务器上初始化数据库配置

```bash
cd /var/www/ckanim/server
node scripts/init-settings.js
```

### 步骤 5：在服务器上重启服务

```bash
pm2 restart ckanim-server
pm2 restart ckanim-front
pm2 restart ckanim-admin
```

### 步骤 6：验证部署

```bash
# 检查服务状态
pm2 status

# 查看日志
pm2 logs ckanim-server --lines 50

# 测试 API（需要替换 TOKEN）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3002/api/user-library/stats
```

---

## 🎯 快速部署脚本（服务器端）

创建文件：`/var/www/ckanim/deploy-vip-limits.sh`

```bash
#!/bin/bash
set -e

echo "🚀 开始部署 VIP 上传限制功能..."

# 1. 备份数据库
echo "📦 备份数据库..."
cp /var/www/ckanim/server/prisma/dev.db \
   /var/www/ckanim/backups/dev.db.backup.$(date +%Y%m%d_%H%M%S)

# 2. 更新代码
echo "🔄 更新代码..."
cd /var/www/ckanim
git pull origin main

# 3. 安装依赖
echo "📦 安装依赖..."
npm install

# 4. 构建前端
echo "🔨 构建前端..."
npm run build

# 5. 初始化配置
echo "💾 初始化 VIP 配置..."
cd /var/www/ckanim/server
node scripts/init-settings.js

# 6. 重启服务
echo "🔄 重启服务..."
pm2 restart all

# 7. 验证
echo "✅ 验证服务..."
pm2 status

echo ""
echo "✨ 部署完成！"
echo "📊 测试：https://anick.cn/user/library/manage"
```

执行：
```bash
chmod +x /var/www/ckanim/deploy-vip-limits.sh
/var/www/ckanim/deploy-vip-limits.sh
```

---

## 📝 本地文件准备清单

以下文件已修改，需要上传到服务器：

### 前端文件
- ✅ `src/lib/api.js`
- ✅ `src/pages/UserLibraryManage.jsx`
- ✅ `src/pages/UserLibraryManage.css`
- ✅ `dist/` (构建后的静态文件)

### 后端文件
- ✅ `server/src/routes/user-library.ts`
- ✅ `server/scripts/init-settings.js`

### 文档（可选）
- `server/docs/USER_LIBRARY_VIP_LIMITS_DEPLOYMENT.md`
- `server/docs/FEATURE_COMPLETE_REPORT_20260327.md`

---

## 🔍 验证测试

### 1. 访问个人参考库管理页面
```
https://anick.cn/user/library/manage
```

应该看到：
- ✅ VIP 统计卡片（显示当前等级）
- ✅ 已用空间、总容量、剩余空间
- ✅ 单文件限制
- ✅ 使用进度条

### 2. 测试上传功能

**普通用户**:
- 点击上传 → 提示"当前 VIP 等级不支持上传视频"

**VIP 用户**:
- 选择文件 → 自动验证大小 → 上传成功 → 统计更新

### 3. 测试 API

```bash
# 获取统计信息
curl -H "Authorization: Bearer TOKEN" \
  https://admin.anick.cn/api/user-library/stats

# 预期响应:
{
  "totalSize": 0,
  "totalSizeFormatted": "0 MB",
  "totalCount": 0,
  "vipPlan": "free",
  "maxFileSize": 0,
  "maxFileSizeFormatted": "0 MB",
  "maxTotalSize": 0,
  "maxTotalSizeFormatted": "0 MB",
  "remainingSize": 0,
  "remainingSizeFormatted": "0 MB",
  "usagePercent": 0
}
```

---

## ⚠️ 故障排查

### 问题 1：服务启动失败
```bash
# 查看日志
pm2 logs ckanim-server --lines 100

# 检查端口占用
netstat -tlnp | grep 3002

# 重启服务
pm2 restart ckanim-server
```

### 问题 2：数据库配置未生效
```bash
# 检查配置
cd /var/www/ckanim/server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.userLibrarySettings.findMany({
  where: { key: { startsWith: 'vip_limits_' }}
}).then(console.log).finally(() => prisma.\$disconnect());
"
```

### 问题 3：前端不显示统计卡片
```bash
# 清除浏览器缓存
# 或强制刷新：Ctrl+F5

# 检查浏览器控制台
# F12 → Console → 查看错误

# 检查 API 响应
# F12 → Network → 查看 /api/user-library/stats
```

---

## 📞 需要帮助？

如果部署过程中遇到问题：

1. 检查日志：`pm2 logs`
2. 查看文档：`server/docs/USER_LIBRARY_VIP_LIMITS_DEPLOYMENT.md`
3. 回滚：从备份恢复数据库

---

**部署时间**: 2026-03-27 01:58  
**版本**: v1.0.0  
**状态**: ✅ 本地已完成，待服务器部署
