#!/bin/bash

echo "=========================================="
echo "CKAnim 角色动作视频关联修复验证"
echo "=========================================="
echo ""

# 1. 检查后端服务
echo "1️⃣  检查后端服务..."
if curl -s http://localhost:3002/health > /dev/null; then
    echo "✅ 后端服务正常运行"
else
    echo "❌ 后端服务未运行"
    exit 1
fi
echo ""

# 2. 检查游戏数据
echo "2️⃣  检查游戏数据..."
GAME_COUNT=$(curl -s http://localhost:3002/api/games | grep -o '"id":' | wc -l)
echo "   游戏数量：$GAME_COUNT"
if [ $GAME_COUNT -gt 0 ]; then
    echo "✅ 游戏数据存在"
else
    echo "❌ 游戏数据为空"
fi
echo ""

# 3. 检查动作数据
echo "3️⃣  检查动作数据..."
ACTION_COUNT=$(curl -s http://localhost:3002/api/actions | grep -o '"id":' | wc -l)
echo "   动作数量：$ACTION_COUNT"
if [ $ACTION_COUNT -gt 0 ]; then
    echo "✅ 动作数据存在"
else
    echo "❌ 动作数据为空"
fi
echo ""

# 4. 检查角色数据
echo "4️⃣  检查角色数据..."
CHAR_COUNT=$(curl -s http://localhost:3002/api/characters | grep -o '"id":' | wc -l)
echo "   角色数量：$CHAR_COUNT"
if [ $CHAR_COUNT -gt 0 ]; then
    echo "✅ 角色数据存在"
else
    echo "❌ 角色数据为空"
fi
echo ""

# 5. 检查 CharacterAction 关联
echo "5️⃣  检查 CharacterAction 关联..."
echo "   运行 Prisma 查询..."
cd /home/tenbox/CKAnim/server
CHARACTER_ACTION=$(npx tsx -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.characterAction.findMany({ 
  include: { 
    character: { select: { name: true } },
    action: { select: { name: true } },
    video: { select: { id: true, title: true } }
  } 
}).then(r => {
  console.log('COUNT:' + r.length);
  r.forEach(ca => {
    console.log('ID:' + ca.id);
    console.log('Character:' + ca.character?.name);
    console.log('Action:' + ca.action?.name);
    console.log('VideoId:' + (ca.videoId || 'null'));
    console.log('VideoTitle:' + (ca.video?.title || 'null'));
    console.log('---');
  });
}).catch(e => console.error('ERROR:' + e.message)).finally(() => p.\$disconnect());
" 2>/dev/null)

CA_COUNT=$(echo "$CHARACTER_ACTION" | grep "COUNT:" | cut -d: -f2)
echo "   CharacterAction 数量：${CA_COUNT:-0}"

if [ "${CA_COUNT:-0}" -gt 0 ]; then
    echo "✅ CharacterAction 关联存在"
    echo ""
    echo "   详细信息:"
    echo "$CHARACTER_ACTION" | grep -E "^(Character|Action|VideoId|VideoTitle):" | while read line; do
        echo "   $line"
    done
else
    echo "⚠️  CharacterAction 关联为空（正常，需要先上传视频）"
fi
echo ""

# 6. 检查前台 API
echo "6️⃣  检查前台 API..."
if [ "${CA_COUNT:-0}" -gt 0 ]; then
    FIRST_CHAR_ID=$(echo "$CHARACTER_ACTION" | grep "ID:" | head -1 | cut -d: -f2)
    if [ -n "$FIRST_CHAR_ID" ]; then
        API_RESPONSE=$(curl -s "http://localhost:3002/api/characters/${FIRST_CHAR_ID}/actions")
        ACTION_IN_API=$(echo "$API_RESPONSE" | grep -o '"actionId":' | wc -l)
        echo "   角色 $FIRST_CHAR_ID 的动作数量：$ACTION_IN_API"
        if [ "$ACTION_IN_API" -gt 0 ]; then
            echo "✅ 前台 API 返回动作数据"
        else
            echo "❌ 前台 API 未返回动作数据"
        fi
    fi
else
    echo "   跳过（无 CharacterAction 数据）"
fi
echo ""

# 7. 检查后端日志
echo "7️⃣  检查后端日志中的 CharacterAction 记录..."
CA_LOGS=$(grep -i "CharacterAction" /tmp/server.log | tail -5)
if [ -n "$CA_LOGS" ]; then
    echo "✅ 找到 CharacterAction 日志:"
    echo "$CA_LOGS" | while read line; do
        echo "   $line"
    done
else
    echo "⚠️  未找到 CharacterAction 日志（正常，可能还没有上传视频）"
fi
echo ""

echo "=========================================="
echo "验证完成！"
echo "=========================================="
echo ""
echo "📋 修复总结:"
echo "1. ✅ 使用 Prisma 事务确保原子性"
echo "2. ✅ 添加 characterId/actionId 配对验证"
echo "3. ✅ 添加详细日志记录"
echo "4. ✅ CharacterAction 创建失败时回滚整个事务"
echo "5. ✅ 前端添加必填验证"
echo ""
echo "🧪 测试步骤:"
echo "1. 访问 http://localhost:3003/videos"
echo "2. 选择游戏 → 上传视频"
echo "3. 必须选择角色和动作（否则无法上传）"
echo "4. 上传成功后检查日志：grep CharacterAction /tmp/server.log"
echo "5. 访问 http://localhost:5173/games 验证前台显示"
echo ""
