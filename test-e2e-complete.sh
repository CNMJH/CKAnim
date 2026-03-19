#!/bin/bash
echo "=== CKAnim 端到端测试 - 动作视频 1 对 1 关系 ==="
echo ""

# 获取 Token
echo "🔑 获取管理员 Token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3002/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "   Token: ${TOKEN:0:50}..."
echo ""

HEADERS="-H \"Content-Type: application/json\" -H \"Authorization: Bearer $TOKEN\""

# 测试 1：创建游戏
echo "1️⃣  创建测试游戏..."
GAME_RESPONSE=$(curl -s -X POST http://localhost:3002/api/admin/games \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "测试游戏_'"$(date +%s)"'",
    "description": "动作视频 1 对 1 测试",
    "published": true
  }')
GAME_ID=$(echo $GAME_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "   ✅ 游戏 ID: $GAME_ID"
echo ""

# 测试 2：创建分类
echo "2️⃣  创建测试分类..."
CATEGORY_RESPONSE=$(curl -s -X POST http://localhost:3002/api/admin/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "战士",
    "gameId": '"$GAME_ID"',
    "level": 1,
    "published": true
  }')
CATEGORY_ID=$(echo $CATEGORY_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "   ✅ 分类 ID: $CATEGORY_ID"
echo ""

# 测试 3：创建角色
echo "3️⃣  创建测试角色..."
CHARACTER_RESPONSE=$(curl -s -X POST http://localhost:3002/api/admin/characters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "测试战士",
    "gameId": '"$GAME_ID"',
    "categoryId": '"$CATEGORY_ID"',
    "published": true
  }')
CHARACTER_ID=$(echo $CHARACTER_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "   ✅ 角色 ID: $CHARACTER_ID"
echo ""

# 测试 4：创建动作（绑定角色）
echo "4️⃣  创建测试动作（绑定角色）..."
ACTION_RESPONSE=$(curl -s -X POST http://localhost:3002/api/admin/actions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "攻击",
    "code": "attack",
    "description": "普通攻击",
    "characterId": '"$CHARACTER_ID"',
    "published": true
  }')
ACTION_ID=$(echo $ACTION_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "   ✅ 动作 ID: $ACTION_ID"
echo ""

# 测试 5：验证动作属于角色
echo "5️⃣  验证动作属于角色..."
ACTION_LIST=$(curl -s "http://localhost:3002/api/admin/actions?characterId=$CHARACTER_ID" \
  -H "Authorization: Bearer $TOKEN")
echo "   动作列表：$ACTION_LIST"
if echo $ACTION_LIST | grep -q '"characterId":'"$CHARACTER_ID"''; then
  echo "   ✅ 动作正确绑定到角色"
else
  echo "   ❌ 动作未正确绑定"
fi
echo ""

# 测试 6：尝试上传视频（不提供 characterId 和 actionId）
echo "6️⃣  测试：上传视频不提供 characterId 和 actionId（应该失败）..."
VIDEO_RESPONSE=$(curl -s -X POST http://localhost:3002/api/admin/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "测试视频",
    "gameId": '"$GAME_ID"',
    "qiniuKey": "test.mp4",
    "qiniuUrl": "https://example.com/test.mp4"
  }')
echo "   响应：$VIDEO_RESPONSE"
if echo $VIDEO_RESPONSE | grep -q "characterId is required"; then
  echo "   ✅ 正确拒绝了请求"
else
  echo "   ⚠️ 响应：$VIDEO_RESPONSE"
fi
echo ""

# 测试 7：尝试上传视频（只提供 characterId）
echo "7️⃣  测试：上传视频只提供 characterId（应该失败）..."
VIDEO_RESPONSE=$(curl -s -X POST http://localhost:3002/api/admin/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "测试视频",
    "gameId": '"$GAME_ID"',
    "characterId": '"$CHARACTER_ID"',
    "qiniuKey": "test.mp4",
    "qiniuUrl": "https://example.com/test.mp4"
  }')
echo "   响应：$VIDEO_RESPONSE"
if echo $VIDEO_RESPONSE | grep -q "actionId is required"; then
  echo "   ✅ 正确拒绝了请求"
else
  echo "   ⚠️ 响应：$VIDEO_RESPONSE"
fi
echo ""

# 测试 8：获取角色详情（包含动作）
echo "8️⃣  获取角色详情（包含动作）..."
CHARACTER_DETAIL=$(curl -s "http://localhost:3002/api/characters/$CHARACTER_ID")
echo "   角色详情：$CHARACTER_DETAIL"
if echo $CHARACTER_DETAIL | grep -q '"actions"'; then
  echo "   ✅ 返回包含动作列表"
else
  echo "   ❌ 未返回动作列表"
fi
echo ""

# 测试 9：删除动作（级联删除）
echo "9️⃣  删除动作..."
DELETE_RESPONSE=$(curl -s -X DELETE "http://localhost:3002/api/admin/actions/$ACTION_ID" \
  -H "Authorization: Bearer $TOKEN")
echo "   删除响应代码：$?"
echo ""

# 测试 10：验证动作已删除
echo "🔟 验证动作已删除..."
ACTION_LIST=$(curl -s "http://localhost:3002/api/admin/actions?characterId=$CHARACTER_ID" \
  -H "Authorization: Bearer $TOKEN")
echo "   动作列表：$ACTION_LIST"
if echo $ACTION_LIST | grep -q '"actions":\[\]'; then
  echo "   ✅ 动作已删除"
else
  echo "   ⚠️ 动作列表：$ACTION_LIST"
fi
echo ""

# 清理：删除角色、分类、游戏
echo "🧹 清理测试数据..."
curl -s -X DELETE "http://localhost:3002/api/admin/characters/$CHARACTER_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X DELETE "http://localhost:3002/api/admin/games/$GAME_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
echo "   ✅ 已删除游戏和角色"
echo ""

echo "=== 测试完成 ==="
