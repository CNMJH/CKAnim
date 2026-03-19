#!/bin/bash
echo "🔄 重启 CKAnim 所有服务..."
echo ""

# 杀掉旧进程
echo "📛 清理旧进程..."
pkill -9 -f "tsx.*server" 2>/dev/null || true
pkill -9 -f "vite" 2>/dev/null || true
sleep 3

# 释放端口
echo "🔓 释放端口..."
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:3003 | xargs kill -9 2>/dev/null || true
sleep 2

# 启动后端
echo "🚀 启动后端服务器 (3002)..."
cd /home/tenbox/CKAnim/server
nohup npx tsx src/index.ts > /tmp/ckanim-server.log 2>&1 &
BACKEND_PID=$!
echo "   PID: $BACKEND_PID"

# 等待后端启动
sleep 5

# 启动前台
echo "🚀 启动前台网站 (5173)..."
cd /home/tenbox/CKAnim
nohup npm run dev > /tmp/ckanim-front.log 2>&1 &
FRONT_PID=$!
echo "   PID: $FRONT_PID"

# 启动后台
echo "🚀 启动管理后台 (3003)..."
cd /home/tenbox/CKAnim/admin
nohup npm run dev > /tmp/ckanim-admin.log 2>&1 &
ADMIN_PID=$!
echo "   PID: $ADMIN_PID"

# 等待启动
sleep 8

echo ""
echo "✅ 所有服务启动完成！"
echo ""
echo "📍 访问地址:"
echo "   前台网站：http://localhost:5173"
echo "   管理后台：http://localhost:3003"
echo "   后端 API：http://localhost:3002"
echo ""
echo "📋 日志文件:"
echo "   后端：/tmp/ckanim-server.log"
echo "   前台：/tmp/ckanim-front.log"
echo "   后台：/tmp/ckanim-admin.log"
echo ""
echo "🧪 快速测试:"
echo "   curl http://localhost:3002/api/games"
echo "   curl http://localhost:5173"
echo "   curl http://localhost:3003"
