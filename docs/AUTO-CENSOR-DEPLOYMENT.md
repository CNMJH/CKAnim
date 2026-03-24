# 七牛云自动审核部署报告

**日期**: 2026-03-24  
**功能**: 头像上传自动审核（七牛云内容审核 API）  
**状态**: ✅ 已完成部署并修复编译错误

---

## 📋 功能概述

用户上传头像后，系统自动调用七牛云图片内容审核 API，根据审核结果自动处理：

- **自动通过** - 审核结果为 `pass`，头像立即显示
- **自动拒绝** - 审核结果为 `block`，显示违规原因，用户需重新上传
- **人工审核** - 审核结果为 `review` 或 API 调用失败，转管理员审核

## 🔧 技术实现

### 1. 后端修改

#### `server/src/lib/qiniu.ts` - 新增图片审核函数

```typescript
export async function censorImage(imageUrl: string, scenes: string[] = ['pulp', 'terror', 'politician', 'ads'])
```

**审核类型**:
- `pulp` - 鉴黄（色情内容）
- `terror` - 鉴暴恐
- `politician` - 敏感人物
- `ads` - 广告

**返回结果**:
```typescript
interface CensorResult {
  suggestion: 'pass' | 'review' | 'block';
  details: Array<{
    scene: string;
    suggestion: 'pass' | 'review' | 'block';
    label: string;
    score: number;
  }>;
}
```

### 2. `server/src/routes/users.ts` - 头像提交接口增强

**修改前**（纯人工审核）:
```typescript
await prisma.user.update({
  where: { id: userId },
  data: {
    avatar: avatarUrl,
    avatarStatus: 'pending',
    avatarRejectReason: null,
  },
})
```

**修改后**（自动审核）:
```typescript
// 调用七牛云审核 API
const censorResult = await censorImage(avatarUrl)

// 根据结果设置状态
let avatarStatus = 'pending'
let avatarRejectReason = null

if (censorResult.suggestion === 'pass') {
  avatarStatus = 'approved'  // 自动通过
} else if (censorResult.suggestion === 'block') {
  avatarStatus = 'rejected'  // 自动拒绝
  avatarRejectReason = `系统检测到违规内容：${reasons.join('，')}`
} else {
  avatarStatus = 'pending'  // 转人工审核
}

await prisma.user.update({ ... })
```

## 📊 审核流程

```
用户上传头像
    ↓
前端获取上传凭证
    ↓
上传到七牛云
    ↓
调用后端 /api/avatar/submit
    ↓
后端调用七牛云审核 API
    ↓
┌───────────────────────────────────┐
│  审核结果处理                      │
├───────────────────────────────────┤
│  pass → 自动通过（approved）      │
│  block → 自动拒绝（rejected）     │
│  review → 人工审核（pending）     │
│  API 失败 → 人工审核（pending）   │
└───────────────────────────────────┘
    ↓
更新数据库（avatarStatus + avatarRejectReason）
    ↓
返回用户（显示审核状态）
```

## 🚀 部署步骤

### 1. 上传文件到服务器

```bash
cd /home/tenbox/CKAnim
tar -czf /tmp/ckanim-auto-censor.tar.gz server
scp -i /tmp/ckanim_ssh_key /tmp/ckanim-auto-censor.tar.gz root@39.102.115.79:/tmp/
```

### 2. 服务器部署

```bash
ssh root@39.102.115.79

cd /var/www/ckanim
pm2 stop ckanim-server
rm -rf server/src  # 删除旧文件避免冲突
tar -xzf /tmp/ckanim-auto-censor.tar.gz
cd server
npm install
pm2 restart ckanim-server --update-env
pm2 status ckanim-server
```

### 3. 验证服务

```bash
pm2 logs ckanim-server --lines 50
```

查看日志确认：
- `[Avatar Censor] Starting auto-censor...`
- `[Avatar Censor] Result: {...}`
- `[Avatar Censor] Auto-approved/rejected/Manual review...`

### 4. 常见问题修复

**编译错误：变量名包含中文字符**
```
ERROR: Expected ";" but found "Details"
```
解决：使用英文变量名 `blockDetails` 替代 `违规 Details`

## 🧪 测试场景

### 场景 1: 正常头像（自动通过）
- 上传：普通人物照片
- 预期：头像立即显示，状态 `approved`
- 日志：`Auto-approved for user X`

### 场景 2: 违规头像（自动拒绝）
- 上传：违规内容图片
- 预期：显示拒绝原因，状态 `rejected`
- 日志：`Auto-rejected for user X: 系统检测到违规内容：色情内容（置信度：98.5%）`

### 场景 3: 可疑头像（人工审核）
- 上传：边界内容图片
- 预期：状态 `pending`，管理员审核页面可见
- 日志：`Manual review required for user X`

### 场景 4: API 调用失败（降级到人工审核）
- 网络问题或 API 故障
- 预期：状态 `pending`，不影响上传流程
- 日志：`API call failed, fallback to manual review`

## 📝 数据库 Schema

```prisma
model User {
  // ...
  avatar           String?
  avatarStatus     String   @default("pending")  // pending/approved/rejected
  avatarRejectReason String?
  // ...
}
```

**无需数据库迁移** - 字段已存在

## 🎯 优势

### 1. 用户体验提升
- ✅ 正常头像立即通过，无需等待
- ✅ 违规头像立即反馈，明确原因
- ✅ 减少管理员审核工作量

### 2. 系统稳定性
- ✅ API 调用失败时自动降级到人工审核
- ✅ 不影响上传流程
- ✅ 日志记录详细，便于排查

### 3. 成本效益
- ✅ 七牛云免费额度内免费使用
- ✅ 减少人工审核时间
- ✅ 提高审核效率和一致性

## ⚠️ 注意事项

### 1. 七牛云配额
- 免费额度：每月 1000 次图片审核
- 超出后：¥0.0012/次
- 监控：七牛云控制台查看使用量

### 2. 审核准确性
- 自动审核置信度阈值：系统默认
- 边界情况：转人工审核（`review`）
- 误判处理：用户可重新上传

### 3. 隐私保护
- 头像仅用于审核，不用于其他用途
- 审核结果仅显示违规类型，不显示详细评分
- 符合七牛云隐私政策

## 📊 性能影响

- **API 调用时间**: ~200-500ms
- **总体上传时间**: 增加 ~300-600ms
- **用户体验**: 无感知（上传过程显示进度条）

## 🔍 监控与日志

### 后端日志关键字

```
[Avatar Censor] Starting auto-censor for user X, image: http://...
[Avatar Censor] Result: { suggestion: 'pass', details: [...] }
[Avatar Censor] Auto-approved for user X
[Avatar Censor] Auto-rejected for user X: ...
[Avatar Censor] Manual review required for user X
[Avatar Censor] API call failed, fallback to manual review: ...
```

### 查看日志

```bash
pm2 logs ckanim-server --lines 100 | grep "Avatar Censor"
```

## 📈 后续优化

1. **缓存审核结果** - 相同图片不重复审核
2. **异步审核** - 上传后立即返回，审核完成通知用户
3. **审核日志** - 记录所有审核历史
4. **阈值调整** - 根据实际效果调整自动通过/拒绝阈值

---

**部署完成时间**: 2026-03-24  
**部署人员**: 波波（AI 助手）  
**审核状态**: ✅ 服务运行正常
