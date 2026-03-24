#!/bin/bash

# CKAnim 管理员权限修复部署脚本
# 使用方法：在服务器上执行 ./deploy-permission-fix.sh

echo "🚀 开始部署管理员权限修复..."

# 1. 停止服务
echo "⏹️  停止 PM2 服务..."
pm2 stop all

# 2. 备份当前文件
echo "💾 备份当前文件..."
cd /var/www/ckanim
cp server/src/middleware/auth.ts server/src/middleware/auth.ts.bak 2>/dev/null || true
tar -czf /tmp/ckanim-backup-$(date +%Y%m%d_%H%M%S).tar.gz \
  server/src/middleware/auth.ts \
  server/src/routes/games.ts \
  server/src/routes/categories.ts \
  server/src/routes/characters.ts \
  server/src/routes/actions.ts \
  admin/dist 2>/dev/null

# 3. 上传并解压文件（从本地上传后执行）
echo "📦 请上传 /tmp/ckanim-permission-fix.tar.gz 到服务器，然后按回车继续..."
read -p "上传完成后按回车..."

cd /var/www/ckanim
tar -xzf /tmp/ckanim-permission-fix.tar.gz

# 4. 重启服务
echo "▶️  重启 PM2 服务..."
pm2 start all --update-env

# 5. 验证服务状态
echo "✅ 验证服务状态..."
pm2 status

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo ""
echo "测试步骤:"
echo "1. 登录 content_admin 账号"
echo "2. 检查菜单是否只有：分类管理、角色管理、动作管理、账号设置"
echo "3. 确认没有"游戏管理"菜单项"
echo ""
echo "如有问题，查看日志：pm2 logs ckanim-server"
echo ""
