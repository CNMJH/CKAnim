#!/bin/bash

# CKAnim 权限更新部署脚本
# 使用方法：在服务器上执行

echo "=========================================="
echo "🚀 CKAnim 权限更新部署"
echo "=========================================="
echo ""

# 1. 停止服务
echo "⏹️  停止 PM2 服务..."
pm2 stop all
echo ""

# 2. 备份当前文件
echo "💾 备份当前管理后台..."
cd /var/www/ckanim
BACKUP_FILE="/tmp/ckanim-admin-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf $BACKUP_FILE admin/dist
echo "✅ 备份完成：$BACKUP_FILE"
echo ""

# 3. 解压新文件
echo "📦 解压新文件..."
tar -xzf /tmp/ckanim-permission-deploy.tar.gz
echo "✅ 解压完成"
echo ""

# 4. 重启服务
echo "▶️  重启 PM2 服务..."
pm2 start all --update-env
echo ""

# 5. 验证服务状态
echo "✅ 验证服务状态..."
pm2 status
echo ""

echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo ""
echo "📋 测试步骤:"
echo ""
echo "1️⃣  登录内容管理员账号:"
echo "   URL: http://39.102.115.79:3003"
echo "   账号：contentadmin"
echo "   密码：ContentAdmin@123"
echo ""
echo "2️⃣  检查菜单:"
echo "   ✅ 应该显示：游戏管理、分类管理、角色管理、动作管理、头像审核、设置"
echo "   ❌ 不应显示：VIP 套餐"
echo ""
echo "3️⃣  检查游戏管理页面:"
echo "   ✅ 可以看到游戏列表"
echo "   ❌ 没有'新建游戏'、'编辑'、'删除'按钮"
echo ""
echo "4️⃣  检查设置页面:"
echo "   ❌ 没有'初始化默认设置'按钮"
echo "   ❌ 没有'网站配置'区域"
echo "   ✅ 账户信息显示当前用户信息"
echo ""
echo "5️⃣  登录系统管理员账号测试:"
echo "   账号：sysadmin"
echo "   密码：SystemAdmin@123"
echo "   (应该有所有权限)"
echo ""
echo "=========================================="
echo ""
echo "💡 如有问题，查看日志：pm2 logs ckanim-admin"
echo "💡 回滚命令：tar -xzf $BACKUP_FILE -C /var/www/ckanim/"
echo ""
