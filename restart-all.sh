#!/bin/bash

echo "===== CKAnim 服务完全重启 ====="
echo ""

# 1. 杀掉所有相关进程
echo "1. 清理所有进程..."
pkill -9 -f "vite" 2>/dev/null
pkill -9 -f "tsx.*server" 2>/dev/null
sleep 2

# 2. 释放端口
echo "2. 释放端口..."
for port in 3002 3003 5173; do
  pid=$(lsof -ti:$port 2>/dev/null)
  if [ -n "$pid" ]; then
    kill -9 $pid 2>/dev/null
    echo "   释放端口 $port (PID: $pid)"
  fi
done
sleep 1

# 3. 清理缓存
echo "3. 清理 Vite 缓存..."
rm -rf /home/tenbox/CKAnim/admin/node_modules/.vite
rm -rf /home/tenbox/CKAnim/front/node_modules/.vite
echo "   ✅ 缓存已清理"

# 4. 启动后端
echo ""
echo "4. 启动后端服务..."
cd /home/tenbox/CKAnim/server
npm run dev > /tmp/ckanim-server.log 2>&1 &
BACKEND_PID=$!
sleep 3
if curl -s http://localhost:3002/api/admin/games | grep -q "原神"; then
  echo "   ✅ 后端启动成功 (PID: $BACKEND_PID)"
else
  echo "   ⚠️ 后端可能启动中..."
fi

# 5. 启动管理后台
echo ""
echo "5. 启动管理后台..."
cd /home/tenbox/CKAnim/admin
npm run dev > /tmp/ckanim-admin.log 2>&1 &
ADMIN_PID=$!
sleep 5
if curl -s http://localhost:3003 | grep -q "CKAnim"; then
  echo "   ✅ 管理后台启动成功 (PID: $ADMIN_PID)"
else
  echo "   ⚠️ 管理后台可能启动中..."
fi

# 6. 启动前台
echo ""
echo "6. 启动前台网站..."
cd /home/tenbox/CKAnim/front
npm run dev > /tmp/ckanim-front.log 2>&1 &
FRONT_PID=$!
sleep 5
if curl -s http://localhost:5173 | grep -q "CKAnim"; then
  echo "   ✅ 前台网站启动成功 (PID: $FRONT_PID)"
else
  echo "   ⚠️ 前台网站可能启动中..."
fi

echo ""
echo "===== 启动完成 ====="
echo ""
echo "服务地址："
echo "  管理后台：http://localhost:3003"
echo "  前台网站：http://localhost:5173"
echo ""
echo "⚠️ 重要提示："
echo "  1. 在浏览器中按 Ctrl+Shift+R 硬刷新"
echo "  2. 清除浏览器缓存"
echo "  3. 关闭所有标签页重新打开"
echo ""
