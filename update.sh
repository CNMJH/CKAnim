#!/bin/bash

# CKAnim 一键更新脚本
# 使用方法：bash update.sh

echo "=========================================="
echo "  CKAnim 一键更新脚本"
echo "=========================================="
echo ""

# 1. 停止服务
echo "1. 停止服务..."
pm2 stop all
echo "   ✅ 服务已停止"
echo ""

# 2. 拉取最新代码
echo "2. 拉取最新代码..."
git pull
if [ $? -ne 0 ]; then
    echo "   ❌ 代码拉取失败，请检查网络连接"
    exit 1
fi
echo "   ✅ 代码已更新"
echo ""

# 3. 安装依赖
echo "3. 安装依赖..."
npm install
cd admin && npm install && cd ..
cd server && npm install && cd ..
echo "   ✅ 依赖已安装"
echo ""

# 4. 构建项目
echo "4. 构建项目..."
npm run build
cd admin && npm run build && cd ..
echo "   ✅ 构建完成"
echo ""

# 5. 启动服务
echo "5. 启动服务..."
pm2 start ecosystem.config.cjs
echo "   ✅ 服务已启动"
echo ""

# 6. 查看状态
echo "6. 服务状态："
pm2 status
echo ""

echo "=========================================="
echo "  ✅ 更新完成！"
echo "=========================================="
echo ""
echo "访问地址："
echo "  前台网站：http://39.102.115.79:5173"
echo "  管理后台：http://39.102.115.79:3003"
echo ""
