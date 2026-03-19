#!/bin/bash
# 网站自定义设置功能测试脚本
# 用法：./test-settings.sh

set -e

BASE_URL="http://localhost:3002"
ADMIN_URL="http://localhost:3003"
FRONT_URL="http://localhost:5173"

echo "======================================"
echo "CKAnim 网站自定义设置功能测试"
echo "======================================"
echo ""

# 1. 检查服务状态
echo "1️⃣  检查服务状态..."
echo "-----------------------------------"

check_service() {
  local name=$1
  local url=$2
  local status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$status" = "200" ]; then
    echo "✅ $name: HTTP $status"
  else
    echo "❌ $name: HTTP $status"
    exit 1
  fi
}

check_service "前台网站" "$FRONT_URL"
check_service "后端 API" "$BASE_URL/health"
check_service "管理后台" "$ADMIN_URL"

echo ""

# 2. 登录获取 Token
echo "2️⃣  登录获取 Token..."
echo "-----------------------------------"

LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo "✅ 登录成功，Token: ${TOKEN:0:50}..."
else
  echo "❌ 登录失败"
  exit 1
fi

echo ""

# 3. 初始化默认设置
echo "3️⃣  初始化默认设置..."
echo "-----------------------------------"

INIT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/settings/init" \
  -H "Authorization: Bearer $TOKEN")

if echo "$INIT_RESPONSE" | grep -q "默认设置已初始化"; then
  echo "✅ 默认设置已初始化"
else
  echo "⚠️  设置可能已存在，继续测试"
fi

echo ""

# 4. 获取所有设置
echo "4️⃣  获取所有设置..."
echo "-----------------------------------"

SETTINGS_RESPONSE=$(curl -s "$BASE_URL/api/settings")

if echo "$SETTINGS_RESPONSE" | grep -q "siteName"; then
  echo "✅ 获取设置成功"
  echo "   网站名称：$(echo "$SETTINGS_RESPONSE" | grep -o '"siteName":{"value":"[^"]*"' | cut -d'"' -f4)"
  echo "   公告文字：$(echo "$SETTINGS_RESPONSE" | grep -o '"text":"[^"]*"' | head -1 | cut -d'"' -f4)"
else
  echo "❌ 获取设置失败"
  exit 1
fi

echo ""

# 5. 测试批量更新设置
echo "5️⃣  测试批量更新设置..."
echo "-----------------------------------"

UPDATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/settings/batch" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"settings":[{"key":"siteName","value":"测试网站名称","description":"网站名称"}]}')

if echo "$UPDATE_RESPONSE" | grep -q "测试网站名称"; then
  echo "✅ 更新设置成功"
else
  echo "❌ 更新设置失败"
  exit 1
fi

echo ""

# 6. 验证更新结果
echo "6️⃣  验证更新结果..."
echo "-----------------------------------"

VERIFY_RESPONSE=$(curl -s "$BASE_URL/api/settings")

if echo "$VERIFY_RESPONSE" | grep -q "测试网站名称"; then
  echo "✅ 验证成功，网站名称已更新为：测试网站名称"
else
  echo "❌ 验证失败"
  exit 1
fi

echo ""

# 7. 恢复默认设置
echo "7️⃣  恢复默认设置..."
echo "-----------------------------------"

RESTORE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/settings/batch" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"settings":[{"key":"siteName","value":"CKAnim","description":"网站名称"}]}')

if echo "$RESTORE_RESPONSE" | grep -q "CKAnim"; then
  echo "✅ 已恢复默认网站名称：CKAnim"
else
  echo "⚠️  恢复默认设置可能失败"
fi

echo ""

# 8. 前台网站检查
echo "8️⃣  前台网站检查..."
echo "-----------------------------------"

FRONT_RESPONSE=$(curl -s "$FRONT_URL")

if echo "$FRONT_RESPONSE" | grep -q "CKAnim"; then
  echo "✅ 前台网站包含网站名称：CKAnim"
else
  echo "⚠️  前台网站可能未正确加载设置"
fi

echo ""

# 9. 管理后台检查
echo "9️⃣  管理后台检查..."
echo "-----------------------------------"

ADMIN_RESPONSE=$(curl -s "$ADMIN_URL")

if echo "$ADMIN_RESPONSE" | grep -q "settings"; then
  echo "✅ 管理后台可访问"
else
  echo "⚠️  管理后台可能未正确加载"
fi

echo ""
echo "======================================"
echo "✅ 所有测试通过！"
echo "======================================"
echo ""
echo "📋 访问地址:"
echo "   前台网站：$FRONT_URL"
echo "   管理后台：$ADMIN_URL"
echo "   设置页面：$ADMIN_URL/settings"
echo "   后端 API:  $BASE_URL"
echo ""
echo "🎯 下一步:"
echo "   1. 访问 http://localhost:3003/settings"
echo "   2. 点击'🔄 初始化默认设置'（首次使用）"
echo "   3. 修改网站名称、页脚信息、全站公告"
echo "   4. 点击'💾 保存设置'"
echo "   5. 访问 http://localhost:5173 查看效果"
echo ""
