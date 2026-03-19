# 角色动作视频关联问题修复

## 问题现象
上传视频后，前台页面不显示动作按钮

## 根本原因
CharacterAction 关联的 `videoId` 字段为 null，导致前台 API 返回空数组

## 数据库状态（问题发生时）
```json
{
  "CharacterAction": {
    "id": 1,
    "characterId": 1,
    "actionId": 1,
    "videoId": null,  // ❌ 应该是视频 ID
    "videoUrl": "https://...",  // 有值但没用
    "published": false
  },
  "Video": {
    "id": 1,
    "title": "安娜",
    "gameId": 1
  }
}
```

## 临时修复
手动更新 CharacterAction 关联：
```sql
UPDATE character_actions 
SET videoId = 1, published = true 
WHERE characterId = 1 AND actionId = 1;
```

或使用 Prisma：
```javascript
await prisma.characterAction.update({
  where: {
    characterId_actionId: {
      characterId: 1,
      actionId: 1,
    },
  },
  data: {
    videoId: 1,
    videoUrl: '视频 URL',
    published: true,
  },
});
```

## 永久修复方案

### 1. 后端添加详细日志
文件：`server/src/routes/videos.ts`

```typescript
// 在创建视频记录前添加日志
server.log.info(`Creating video with characterId: ${characterId}, actionId: ${actionId}`);

// 在创建 CharacterAction 时添加日志
if (characterId && actionId) {
  server.log.info(`Creating CharacterAction: characterId=${characterId}, actionId=${actionId}, videoId=${video.id}`);
  // ... 创建逻辑
} else {
  server.log.warn(`Missing characterId or actionId: characterId=${characterId}, actionId=${actionId}`);
}
```

### 2. 错误处理改进
文件：`server/src/routes/videos.ts`

```typescript
if (characterId && actionId) {
  try {
    // ... 创建逻辑
  } catch (err) {
    server.log.error('Failed to create character action:', err);
    // 抛出错误而不是静默处理
    throw new Error(`Failed to create CharacterAction: ${err.message}`);
  }
}
```

### 3. 前端验证
文件：`admin/src/pages/Videos.jsx`

```javascript
const handleStartUpload = async (e) => {
  if (!pendingFile) return
  
  // 验证角色和动作必选
  if (!selectedCharacter) {
    alert('请选择角色！')
    return
  }
  if (!selectedAction) {
    alert('请选择动作！')
    return
  }
  
  // ... 上传逻辑
}
```

## 验证步骤

### 1. 检查 CharacterAction 关联
```bash
cd /home/tenbox/CKAnim/server
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.characterAction.findMany({ 
  include: { character: true, action: true, video: true } 
}).then(console.log).catch(console.error).finally(() => p.\$disconnect())
"
```

### 2. 检查前台 API
```bash
curl http://localhost:3002/api/characters/1/actions
```

应该返回：
```json
{
  "characterId": 1,
  "characterName": "盖伦",
  "actions": [
    {
      "id": 1,
      "actionId": 1,
      "name": "攻击",
      "code": "attack",
      "video": {
        "id": 1,
        "qiniuUrl": "https://...",
        "coverUrl": "...",
        "duration": 123,
        "title": "..."
      }
    }
  ]
}
```

### 3. 验证前台显示
访问 http://localhost:5173/games
1. 选择游戏：英雄联盟
2. 选择角色：盖伦
3. 应该看到动作按钮：攻击
4. 点击"攻击"按钮应该播放视频

## 预防措施

1. **上传视频时必须选择角色和动作** - 前端添加必填验证
2. **创建 CharacterAction 失败时阻止视频创建** - 事务处理
3. **添加管理界面显示 CharacterAction 关联状态** - 便于调试
4. **定期清理孤立的 CharacterAction 记录** - videoId 为 null 的记录

## 当前状态（2026-03-18 16:37）

✅ CharacterAction 已修复：
- characterId: 1 (盖伦)
- actionId: 1 (攻击)
- videoId: 1 (安娜视频)
- published: true

✅ 前台 API 正常返回数据

⚠️ 需要重新上传正确的视频（盖伦攻击动作）
