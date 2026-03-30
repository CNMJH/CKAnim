#!/bin/bash
# CKAnim 部署脚本 - 每日抽奖功能

echo "🚀 开始部署 CKAnim..."

cd /var/www/ckanim

# 1. 拉取最新代码
echo "📦 拉取最新代码..."
git pull origin main

# 2. 构建前端
echo "🔨 构建前端..."
cd admin
npm install
npm run build
cd ..

# 3. 构建后端
echo "🔧 构建后端..."
cd server
npm install
npm run build
cd ..

# 4. 重启服务
echo "🔄 重启服务..."
# 根据实际使用的进程管理工具选择
# 如果使用 PM2:
pm2 restart ckanim-server
pm2 restart ckanim-admin

# 或者如果使用 systemd:
# systemctl restart ckanim-server
# systemctl restart ckanim-admin

echo "✅ 部署完成！"
echo ""
echo "📊 新功能：活动配置（🎰）"
echo "   - 管理员后台 → 活动配置 → 每日抽奖配置"
echo "   - 支持积分/道具/实物三种奖品类型"
echo "   - 概率验证、库存管理、抽奖记录"
