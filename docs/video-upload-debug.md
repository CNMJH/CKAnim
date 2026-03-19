# 视频上传调试指南

**问题**: 上传视频后在后台和参考网站都看不到

**日期**: 2026-03-19 00:05

## 已修复的问题

### 1. API 参数缺失
- **问题**: `videosAPI.getUploadToken()` 缺少 `actionId` 参数
- **修复**: 
  - `admin/src/lib/services.js`: 添加 `actionId` 参数
  - `admin/src/pages/Actions.jsx`: 调用时传递 `actionId`

### 2. 调试日志不足
- **修复**: 
  - 前端添加详细的上传日志（文件信息、API 请求、错误详情）
  - 后端添加请求体日志

## 调试步骤

### 第一步：打开浏览器开发者工具

1. 访问 http://localhost:3003/actions
2. 按 `F12` 打开开发者工具
3. 切换到 **Console** 标签页

### 第二步：执行上传流程

1. 选择游戏（如"英雄联盟"）
2. 选择分类（如"战士"）
3. 选择角色（如"迪卢克"）
4. 点击 "📤 批量上传" 按钮
5. 选择一个视频文件（MP4 格式）
6. 点击 "开始上传"

### 第三步：查看控制台日志

**正常流程应该看到**:
```
[上传] 创建动作：{ name: "xxx", code: "xxx", characterId: 1 }
[上传] 动作创建成功：{ id: 3, name: "xxx", ... }
上传凭证：{ token: "xxx...", key: "xxx", url: "xxx" }
[上传] 创建视频记录：{ title: "xxx", gameId: 1, characterId: 1, actionId: 3, ... }
[上传] 视频创建成功：{ id: 1, title: "xxx", ... }
```

**如果看到错误**:
```
[上传] 失败详情：{
  file: "xxx.mp4",
  error: "错误信息",
  response: { message: "详细错误", ... },
  stack: "错误堆栈"
}
```

### 第四步：查看 Network 标签页

1. 在开发者工具中切换到 **Network** 标签页
2. 筛选 `admin/videos` 相关的请求
3. 检查以下请求：

**POST /api/admin/videos/upload-token**
- 请求体：`{ filename: "xxx.mp4", gameId: 1, categoryIds: [1], actionId: 2 }`
- 响应：`{ token: "xxx", key: "xxx", url: "xxx" }`

**POST /api/admin/videos**
- 请求体：`{ title: "xxx", gameId: 1, characterId: 1, actionId: 2, qiniuKey: "xxx", qiniuUrl: "xxx", ... }`
- 响应：视频对象（包含 id, title 等）

### 第五步：检查后端日志

```bash
tail -50 /tmp/ckanim-server.log | grep -i "video\|upload"
```

**正常日志**:
```
[Video Create] Request body: { ... }
[Video Create] title=xxx, gameId=1, characterId=1, actionId=2, qiniuKey=xxx
[Video Create] Validated: game=xxx, character=xxx, action=xxx
[Video Create] Video created: id=1, actionId=2
[Video Create] Completed successfully: id=1
```

**错误日志**:
```
[Video Create] Error: xxx
```

### 第六步：检查数据库

```bash
cd /home/tenbox/CKAnim/server
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const videos = await prisma.video.findMany({
    include: { action: { include: { character: true } } }
  });
  console.log('视频数量:', videos.length);
  videos.forEach(v => {
    console.log('  -', v.id, v.title, '| 动作:', v.action.name, '| 角色:', v.action.character.name);
  });
  await prisma.\$disconnect();
})()
"
```

## 常见错误及解决方案

### 1. "actionId is required"
**原因**: 前端没有传递 actionId  
**解决**: 确保已选择角色，并且批量上传时自动创建了动作

### 2. "characterId is required"
**原因**: 前端没有传递 characterId  
**解决**: 确保在动作管理页面选择了角色

### 3. "Action already has a video"
**原因**: 每个动作只能有一个视频（1 对 1 关系）  
**解决**: 删除现有视频或选择其他动作

### 4. "Game/Character/Action not found"
**原因**: ID 不匹配或数据不存在  
**解决**: 检查选择的角色/动作是否正确

### 5. 七牛云上传失败
**原因**: Token 过期或配置错误  
**解决**: 检查七牛云配置（AccessKey, SecretKey, Bucket）

### 6. 网络错误
**原因**: 后端服务未启动或端口被占用  
**解决**: 
```bash
curl http://localhost:3002/health
# 如果失败，重启后端
cd /home/tenbox/CKAnim/server
npm run dev
```

## 快速测试

运行调试脚本：
```bash
cd /home/tenbox/CKAnim
./debug-upload.sh
```

## 预期结果

上传成功后：
1. ✅ 数据库中有视频记录
2. ✅ 七牛云有视频文件
3. ✅ 后台动作管理页面显示视频卡片
4. ✅ 前台网站选择角色后显示动作按钮

## 如果仍然失败

请提供以下信息：
1. 浏览器控制台的完整错误日志
2. Network 标签页中失败请求的详细信息
3. 后端日志中的错误信息
4. 数据库中现有的动作和视频数量
