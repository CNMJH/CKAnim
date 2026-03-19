#!/bin/bash
# 测试视频上传脚本

echo "=== 1. 登录获取 Token ==="
TOKEN=$(curl -s -X POST http://localhost:3002/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: ${TOKEN:0:50}..."

echo ""
echo "=== 2. 获取角色列表 ==="
curl -s http://localhost:3002/api/admin/characters \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null | grep -A3 '"name"'

echo ""
echo "=== 3. 创建测试动作 ==="
ACTION_RESPONSE=$(curl -s -X POST http://localhost:3002/api/admin/actions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "测试攻击",
    "code": "test_attack",
    "characterId": 3,
    "published": true
  }')

echo "$ACTION_RESPONSE" | python3 -m json.tool 2>/dev/null
ACTION_ID=$(echo "$ACTION_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)
echo "动作 ID: $ACTION_ID"

echo ""
echo "=== 4. 获取上传凭证 ==="
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3002/api/admin/videos/upload-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "filename": "test.mp4",
    "gameId": 3,
    "categoryIds": [3],
    "actionId": '"$ACTION_ID"'
  }')

echo "$UPLOAD_RESPONSE" | python3 -m json.tool 2>/dev/null
TOKEN_QINIU=$(echo "$UPLOAD_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
KEY=$(echo "$UPLOAD_RESPONSE" | grep -o '"key":"[^"]*"' | cut -d'"' -f4)
URL=$(echo "$UPLOAD_RESPONSE" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)

echo ""
echo "=== 5. 上传到七牛云 ==="
echo "上传凭证已获取，需要实际视频文件才能继续"
echo "Token: ${TOKEN_QINIU:0:30}..."
echo "Key: $KEY"
echo "URL: $URL"
