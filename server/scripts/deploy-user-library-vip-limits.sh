#!/bin/bash
# 个人参考库 VIP 上传限制功能部署脚本
# 用法：./deploy-user-library-vip-limits.sh

set -e

echo "======================================"
echo "🚀 个人参考库 VIP 限制功能部署"
echo "======================================"
echo ""

# 1. 备份数据库
echo "📦 1. 备份数据库..."
/home/tenbox/CKAnim/server/scripts/backup-db-local.sh
echo ""

# 2. 构建前端
echo "🔨 2. 构建前端..."
cd /home/tenbox/CKAnim
npm run build
echo ""

# 3. 初始化数据库配置
echo "💾 3. 初始化 VIP 限制配置..."
cd /home/tenbox/CKAnim/server
node scripts/init-settings.js
echo ""

# 4. 重启服务
echo "🔄 4. 重启后端服务..."
pm2 restart ckanim-server
echo ""

# 5. 验证服务
echo "✅ 5. 验证服务状态..."
pm2 list | grep ckanim
echo ""

echo "======================================"
echo "✨ 部署完成！"
echo "======================================"
echo ""
echo "📊 测试步骤:"
echo "1. 访问：https://anick.cn/user/library/manage"
echo "2. 查看 VIP 统计卡片"
echo "3. 测试上传功能"
echo ""
echo "📝 文档位置:"
echo "- 部署说明：server/docs/USER_LIBRARY_VIP_LIMITS_DEPLOYMENT.md"
echo "- 功能报告：server/docs/FEATURE_COMPLETE_REPORT_20260327.md"
echo ""
