#!/bin/bash
# 视频上传调试脚本

echo "======================================"
echo "视频上传流程调试"
echo "======================================"
echo ""

# 1. 检查数据库中的动作
echo "1️⃣  检查动作数据..."
cd /home/tenbox/CKAnim/server
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const actions = await prisma.action.findMany({
    include: { 
      character: true,
      video: true
    }
  });
  console.log('动作总数:', actions.length);
  actions.forEach(a => {
    console.log('  -', a.id, a.name, '| 角色:', a.character.name, '| 视频:', a.video ? '✅' : '❌');
  });
  await prisma.\$disconnect();
})()
"

echo ""
echo "2️⃣  检查数据库中的视频..."
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const videos = await prisma.video.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { 
      action: { include: { character: true } },
      game: true
    }
  });
  console.log('视频总数:', videos.length);
  videos.forEach(v => {
    console.log('  -', v.id, v.title, '| 动作:', v.action?.name, '| 游戏:', v.game.name);
  });
  await prisma.\$disconnect();
})()
"

echo ""
echo "3️⃣  检查后端日志（最近 20 条）..."
tail -20 /tmp/ckanim-server.log | grep -i "video\|upload\|error" || echo "无相关日志"

echo ""
echo "4️⃣  服务状态..."
curl -s -o /dev/null -w "前台 (5173): HTTP %{http_code}\n" http://localhost:5173
curl -s -o /dev/null -w "后端 (3002): HTTP %{http_code}\n" http://localhost:3002/health
curl -s -o /dev/null -w "后台 (3003): HTTP %{http_code}\n" http://localhost:3003

echo ""
echo "======================================"
echo "调试建议:"
echo "1. 打开浏览器开发者工具 (F12)"
echo "2. 访问 http://localhost:3003/actions"
echo "3. 选择角色，点击批量上传"
echo "4. 查看 Console 标签页的错误信息"
echo "5. 查看 Network 标签页的 API 请求"
echo "======================================"
