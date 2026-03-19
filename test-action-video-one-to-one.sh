#!/bin/bash
# 测试动作 - 视频 1 对 1 关系

echo "=== 测试动作 - 视频 1 对 1 关系 ==="
echo ""

# 1. 创建测试游戏
echo "1️⃣  创建测试游戏..."
GAME_RESPONSE=$(curl -s -X POST http://localhost:3002/api/admin/games \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{
    "name": "测试游戏_'"$(date +%s)"'",
    "description": "测试用",
    "published": true
  }')
GAME_ID=$(echo $GAME_RESPONSE | jq -r '.id')
echo "   游戏 ID: $GAME_ID"

# 2. 创建测试分类
echo "2️⃣  创建测试分类..."
CATEGORY_RESPONSE=$(curl -s -X POST http://localhost:3002/api/admin/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{
    "name": "测试分类",
    "gameId": '"$GAME_ID"',
    "level": 1,
    "published": true
  }')
CATEGORY_ID=$(echo $CATEGORY_RESPONSE | jq -r '.id')
echo "   分类 ID: $CATEGORY_ID"

# 3. 创建测试角色
echo "3️⃣  创建测试角色..."
CHARACTER_RESPONSE=$(curl -s -X POST http://localhost:3002/api/admin/characters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{
    "name": "测试角色",
    "gameId": '"$GAME_ID"',
    "categoryId": '"$CATEGORY_ID"',
    "published": true
  }')
CHARACTER_ID=$(echo $CHARACTER_RESPONSE | jq -r '.id')
echo "   角色 ID: $CHARACTER_ID"

# 4. 创建测试动作
echo "4️⃣  创建测试动作..."
ACTION_RESPONSE=$(curl -s -X POST http://localhost:3002/api/admin/actions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{
    "name": "测试动作",
    "code": "test",
    "characterId": '"$CHARACTER_ID"',
    "published": true
  }')
ACTION_ID=$(echo $ACTION_RESPONSE | jq -r '.id')
echo "   动作 ID: $ACTION_ID"

# 5. 验证动作没有视频
echo "5️⃣  验证动作初始状态..."
ACTION_DETAIL=$(curl -s http://localhost:3002/api/admin/actions?characterId=$CHARACTER_ID)
echo "   动作详情: $ACTION_DETAIL"

# 6. 尝试创建视频（不提供 characterId 和 actionId）
echo "6️⃣  测试：上传视频不提供 characterId 和 actionId（应该失败）..."
VIDEO_RESPONSE=$(curl -s -X POST http://localhost:3002/api/admin/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{
    "title": "测试视频",
    "gameId": '"$GAME_ID"',
    "qiniuKey": "test.mp4",
    "qiniuUrl": "https://example.com/test.mp4"
  }')
echo "   响应: $VIDEO_RESPONSE"
if echo $VIDEO_RESPONSE | grep -q "characterId is required"; then
  echo "   ✅ 正确拒绝了请求"
else
  echo "   ❌ 应该拒绝请求"
fi

# 7. 尝试创建视频（提供 characterId 但不提供 actionId）
echo "7️⃣  测试：上传视频只提供 characterId（应该失败）..."
VIDEO_RESPONSE=$(curl -s -X POST http://localhost:3002/api/admin/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{
    "title": "测试视频",
    "gameId": '"$GAME_ID"',
    "characterId": '"$CHARACTER_ID"',
    "qiniuKey": "test.mp4",
    "qiniuUrl": "https://example.com/test.mp4"
  }')
echo "   响应: $VIDEO_RESPONSE"
if echo $VIDEO_RESPONSE | grep -q "actionId is required"; then
  echo "   ✅ 正确拒绝了请求"
else
  echo "   ❌ 应该拒绝请求"
fi

# 8. 清理测试数据
echo "8️⃣  清理测试数据..."
curl -s -X DELETE "http://localhost:3002/api/admin/games/$GAME_ID" \
  -H "Authorization: Bearer test" > /dev/null
echo "   ✅ 已删除游戏（级联删除分类、角色、动作）"

echo ""
echo "=== 测试完成 ==="
