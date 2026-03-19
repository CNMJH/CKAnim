# CKAnim 测试流程

## 问题诊断

上传视频后前台不显示，可能原因：
1. ❌ 数据库被重置，数据丢失
2. ❌ 没有创建角色
3. ❌ 上传时没有选择角色和动作
4. ❌ CharacterAction 关联未创建
5. ❌ 视频未发布（published: false）

## 当前状态（2026-03-18 16:30）

```bash
# 游戏
curl http://localhost:3002/api/games
# ✅ 返回：英雄联盟 (ID: 1)

# 动作
curl http://localhost:3002/api/actions
# ✅ 返回：攻击、走位、技能、大招

# 角色
curl http://localhost:3002/api/characters
# ❌ 返回：[] (空)

# 视频
curl http://localhost:3002/api/videos
# ❌ 返回：[] (空)
```

## 测试步骤

### 1. 创建角色
访问：http://localhost:3003/characters
- 点击"➕ 新建角色"
- 名称：测试战士
- 分类：选择已有分类（或先创建分类）
- 游戏：英雄联盟
- 发布：✅ 勾选
- 保存

### 2. 上传视频
访问：http://localhost:3003/videos
- 选择游戏：英雄联盟
- 点击"📤 上传视频"
- 选择角色：测试战士 ⭐
- 选择动作：攻击 ⭐
- 选择视频文件
- 点击"📤 开始上传"

### 3. 验证数据库关联
```bash
# 检查 CharacterAction 关联
curl http://localhost:3002/api/characters/1/actions
# 应该返回：包含动作和视频信息的列表
```

### 4. 验证前台显示
访问：http://localhost:5173/games
- 选择游戏：英雄联盟
- 选择角色：测试战士
- 应该显示动作按钮：攻击、走位、技能、大招
- 点击"攻击"按钮
- 应该播放上传的视频

## 常见问题排查

### 前台显示"该角色暂无动作视频"
**原因**：CharacterAction 关联不存在

**排查步骤**：
```bash
# 1. 检查角色是否有动作关联
curl http://localhost:3002/api/characters/1/actions

# 2. 检查视频是否存在
curl http://localhost:3002/api/admin/videos

# 3. 检查 CharacterAction 表
# 需要直接查询数据库或使用 Prisma Studio
npx prisma studio
```

### 上传视频时忘记选择角色/动作
**解决**：
1. 在视频管理页面编辑视频
2. 重新选择角色和动作
3. 保存后会自动创建 CharacterAction 关联

### 视频未发布
**解决**：
1. 在视频管理页面找到视频
2. 点击"发布"按钮
3. 或者编辑视频时勾选"发布"

## 快速测试数据

使用以下脚本创建完整测试数据：
```bash
cd /home/tenbox/CKAnim/server
npx tsx prisma/seed.ts
```

当前已创建：
- ✅ 管理员账户：admin / admin123
- ✅ 游戏：英雄联盟
- ✅ 动作：攻击、走位、技能、大招

待创建：
- ❌ 角色（需手动创建）
- ❌ 视频（需手动上传）
- ❌ CharacterAction 关联（上传视频时自动创建）
