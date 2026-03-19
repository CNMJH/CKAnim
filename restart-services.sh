#!/bin/bash

echo "===== CKAnim 服务重启脚本 ====="
echo ""

# 1. 杀掉所有 Vite 进程
echo "1. 杀掉所有 Vite 进程..."
pkill -9 -f "vite" 2>/dev/null
sleep 2
echo "   ✅ 已清理 Vite 进程"

# 2. 清理缓存
echo ""
echo "2. 清理 Vite 缓存..."
rm -rf /home/tenbox/CKAnim/admin/node_modules/.vite
rm -rf /home/tenbox/CKAnim/front/node_modules/.vite
echo "   ✅ 缓存已清理"

# 3. 启动后端（如果未运行）
echo ""
echo "3. 检查后端服务..."
if ! curl -s http://localhost:3002/api/admin/games > /dev/null; then
  echo "   ⚠️ 后端未运行，正在启动..."
  cd /home/tenbox/CKAnim/server
  nohup npm run dev > /tmp/ckanim-server.log 2>&1 &
  sleep 3
  echo "   ✅ 后端已启动"
else
  echo "   ✅ 后端运行中 (端口 3002)"
fi

# 4. 启动管理后台
echo ""
echo "4. 启动管理后台..."
cd /home/tenbox/CKAnim/admin
nohup npm run dev > /tmp/ckanim-admin.log 2>&1 &
sleep 5
echo "   ✅ 管理后台已启动 (端口 3003)"

# 5. 启动前台网站
echo ""
echo "5. 启动前台网站..."
cd /home/tenbox/CKAnim/front
nohup npm run dev > /tmp/ckanim-front.log 2>&1 &
sleep 5
echo "   ✅ 前台网站已启动 (端口 5173)"

# 6. 验证服务
echo ""
echo "6. 验证服务状态..."
echo ""

# 验证后端
if curl -s http://localhost:3002/api/admin/games | grep -q "原神"; then
  echo "   ✅ 后端 API 正常 (http://localhost:3002)"
else
  echo "   ❌ 后端 API 异常"
fi

# 验证管理后台
if curl -s http://localhost:3003 | grep -q "CKAnim"; then
  echo "   ✅ 管理后台正常 (http://localhost:3003)"
else
  echo "   ❌ 管理后台异常"
fi

# 验证前台网站
if curl -s http://localhost:5173 | grep -q "CKAnim"; then
  echo "   ✅ 前台网站正常 (http://localhost:5173)"
else
  echo "   ❌ 前台网站异常"
fi

echo ""
echo "===== 服务重启完成 ====="
echo ""
echo "请访问："
echo "  - 管理后台：http://localhost:3003"
echo "  - 前台网站：http://localhost:5173"
echo ""
echo "⚠️ 重要：请在浏览器中硬刷新 (Ctrl+Shift+R) 清除缓存！"
echo ""
