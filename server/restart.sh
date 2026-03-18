#!/bin/bash

echo "🔄 重启 CKAnim 后端服务器..."

# 1. 杀掉所有相关进程
echo "📛 杀掉旧进程..."
pkill -9 -f "tsx.*index" 2>/dev/null
pkill -9 -f "node.*index.ts" 2>/dev/null
pkill -9 -f "npm exec tsx" 2>/dev/null
lsof -ti:3002 | xargs kill -9 2>/dev/null

# 2. 等待端口释放
sleep 2

# 3. 清理缓存
echo "🧹 清理缓存..."
cd /home/tenbox/CKAnim/server
rm -rf node_modules/.cache/tsx

# 4. 启动新进程
echo "🚀 启动新服务器..."
cd /home/tenbox/CKAnim/server
nohup npm exec tsx src/index.ts > /tmp/server.log 2>&1 &

# 5. 等待启动
sleep 8

# 6. 验证
if curl -s http://localhost:3002/health > /dev/null; then
    echo "✅ 后端服务器已启动！http://localhost:3002"
    tail -5 /tmp/server.log
else
    echo "❌ 启动失败，查看日志："
    tail -20 /tmp/server.log
fi
