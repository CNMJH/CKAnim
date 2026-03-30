# 个人参考库 VIP 上传限制功能部署说明

## 📋 功能概述

为个人参考库添加了基于 VIP 等级的上传限制功能：

| VIP 等级 | 单文件限制 | 总空间限制 |
|---------|-----------|-----------|
| 普通用户 | 0 MB (不可上传) | 0 MB |
| VIP 月卡 | 30 MB | 500 MB |
| VIP 年卡 | 100 MB | 10 GB |
| 永久 SVIP | 200 MB | 50 GB |

---

## 🔧 部署步骤

### 1. 备份数据库 ⚠️

```bash
/home/tenbox/CKAnim/server/scripts/backup-db-local.sh
```

### 2. 初始化 VIP 限制配置

**方法 A：使用 SQL 脚本（推荐）**
```bash
sqlite3 /home/tenbox/CKAnim/server/prisma/dev.db < /home/tenbox/CKAnim/server/scripts/init-user-library-settings.sql
```

**方法 B：使用 TypeScript 脚本**
```bash
cd /home/tenbox/CKAnim
npx tsx server/scripts/init-user-library-settings.ts
```

**方法 C：管理员后台手动添加**
1. 登录管理员后台：`https://admin.anick.cn/admin/database`
2. 选择 `UserLibrarySettings` 表
3. 手动添加 4 条记录（key, value, description）

### 3. 重启后端服务

```bash
pm2 restart ckanim-server
```

### 4. 验证部署

**测试 API:**
```bash
# 获取统计信息（需登录）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3002/api/user-library/stats

# 获取上传凭证（需登录）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3002/api/user-library/videos/upload-token?filename=test.mp4&characterId=1&actionId=1"
```

---

## 📁 修改的文件

### 后端文件
- ✅ `server/src/routes/user-library.ts` - 添加 VIP 限制验证逻辑
- ✅ `server/scripts/init-user-library-settings.ts` - 初始化脚本
- ✅ `server/scripts/init-user-library-settings.sql` - SQL 初始化脚本

### 前端文件
- ✅ `src/lib/api.js` - 添加管理员配置 API
- ✅ `src/pages/UserLibraryManage.jsx` - 显示 VIP 统计和上传限制
- ✅ `src/pages/UserLibraryManage.css` - VIP 统计卡片样式
- ✅ `dist/` - 构建后的静态文件

---

## 🎯 功能特性

### 1. 上传前验证
- ✅ 检查 VIP 等级是否允许上传
- ✅ 检查单文件大小是否超限
- ✅ 检查剩余总空间是否充足
- ✅ 友好的错误提示信息

### 2. 空间统计显示
- ✅ 已用空间
- ✅ 总容量
- ✅ 剩余空间
- ✅ 单文件限制
- ✅ 使用进度条
- ✅ VIP 等级徽章

### 3. 管理员配置
- ✅ 查看 VIP 限制配置
- ✅ 修改 VIP 限制参数
- ✅ 仅系统管理员可访问

---

## 🔍 测试场景

### 场景 1：普通用户尝试上传
```
预期结果：
- 获取上传凭证时返回 403
- 提示："当前 VIP 等级不支持上传视频"
- 显示升级提示
```

### 场景 2：文件超出单文件限制
```
预期结果：
- 获取上传凭证时返回 400
- 提示："文件大小超出限制"
- 显示当前 VIP 等级限制和实际文件大小
```

### 场景 3：剩余空间不足
```
预期结果：
- 获取上传凭证时返回 400
- 提示："剩余空间不足"
- 显示剩余空间和需要空间
```

### 场景 4：VIP 用户正常上传
```
预期结果：
- 获取上传凭证成功
- 显示剩余空间和限制信息
- 上传过程正常
- 上传后统计信息自动更新
```

---

## 📊 数据库表结构

### UserLibrarySettings 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int | 主键 |
| key | String | 配置键（唯一） |
| value | String | 配置值（JSON 格式） |
| description | String? | 配置描述 |
| updatedAt | DateTime | 最后更新时间 |

### 示例数据

```json
{
  "key": "vip_limits_vip_monthly",
  "value": "{\"maxFileSize\":31457280,\"maxTotalSize\":524288000,\"description\":\"VIP 月卡：单文件 30MB，总空间 500MB\"}",
  "description": "VIP 月卡上传限制"
}
```

---

## 🛠️ 故障排查

### 问题 1：获取上传凭证失败
```bash
# 检查后端日志
pm2 logs ckanim-server --lines 50

# 检查数据库配置
sqlite3 /home/tenbox/CKAnim/server/prisma/dev.db \
  "SELECT * FROM user_library_settings WHERE key LIKE 'vip_limits_%';"
```

### 问题 2：统计信息显示异常
```bash
# 检查 API 响应
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3002/api/user-library/stats | jq

# 检查用户 VIP 等级
sqlite3 /home/tenbox/CKAnim/server/prisma/dev.db \
  "SELECT id, username, vipPlan FROM user WHERE id = YOUR_USER_ID;"
```

### 问题 3：前端构建失败
```bash
# 清理并重新构建
cd /home/tenbox/CKAnim
rm -rf dist/
npm run build
```

---

## 📝 后续优化建议

1. **管理员后台配置界面**
   - 在管理员后台添加可视化配置页面
   - 支持动态调整 VIP 限制参数

2. **上传历史记录**
   - 记录每次上传的时间、文件大小、结果
   - 支持查看上传历史

3. **空间使用告警**
   - 空间使用超过 80% 时提醒用户
   - 支持邮件/钉钉通知

4. **批量上传优化**
   - 支持批量上传时自动跳过超限文件
   - 显示批量上传进度和结果统计

5. **VIP 过期处理**
   - VIP 过期后自动降级
   - 超限文件处理策略（保留/删除/只读）

---

## ⚠️ 注意事项

1. **数据库安全**
   - 操作前先备份数据库
   - 不要在高峰期执行数据库操作
   - 测试环境先验证

2. **文件清理**
   - 删除视频时自动清理七牛云文件
   - 定期清理 orphaned 文件

3. **性能优化**
   - 统计信息添加缓存（5 分钟）
   - 大用户量时考虑分页查询

4. **监控告警**
   - 监控七牛云存储空间使用
   - 设置存储空间告警阈值

---

**部署时间**: 2026-03-27 00:30  
**部署人**: 波波  
**版本**: v1.0.0
