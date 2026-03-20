# 部署配置对比与修正

> **检查时间**: 2026-03-21  
> **目的**: 确保部署教程完全匹配本地和 GitHub 配置

---

## 📊 本地实际配置

### 1. server/.env（开发环境）

```bash
# 服务器配置
PORT=3002
NODE_ENV=development

# SQLite 数据库（开发用）
DATABASE_URL="file:./prisma/dev.db"

# JWT 配置
JWT_SECRET="ckanim-admin-secret-key-change-in-production-2026"
JWT_EXPIRES_IN="7d"

# 七牛云配置
QINIU_ACCESS_KEY="DwLK5ft-Zx0XgxiI8HaIyeUh0wyaHddssczs2s0c"
QINIU_SECRET_KEY="14ykOp2Q-nkbLmSfZdd2aHmoEnZUHqWxk1BeFN2-"
QINIU_BUCKET="zhuque-guangdong"
QINIU_DOMAIN="https://video.jiangmeijixie.com"
QINIU_PREFIX="参考网站 2026/"
```

### 2. server/prisma/schema.prisma

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

### 3. ecosystem.config.js（服务器配置）

```javascript
{
  name: 'ckanim-server',
  cwd: './server',  // ← 工作目录是 server
  script: 'node_modules/.bin/tsx',
  args: 'watch src/index.ts',
  env: {
    NODE_ENV: 'production',
    PORT: 3002,
    JWT_SECRET: process.env.JWT_SECRET || 'ckanim-production-secret-key-change-me',
    JWT_EXPIRES_IN: '7d',
  },
}
```

---

## ❌ 部署教程的问题

### 问题 1：七牛云配置不匹配

**教程配置**：
```bash
QINIU_BUCKET="你的储存空间名称"
QINIU_DOMAIN="你的七牛云域名"
QINIU_PREFIX="ckanim/"
QINIU_ZONE="zone_z0"
```

**本地配置**：
```bash
QINIU_BUCKET="zhuque-guangdong"
QINIU_DOMAIN="https://video.jiangmeijixie.com"
QINIU_PREFIX="参考网站 2026/"
# 没有 QINIU_ZONE
```

**后果**：用户会配置错误的七牛云参数！

---

### 问题 2：数据库路径不一致

**教程配置**：
```bash
DATABASE_URL="file:/var/www/ckanim/server/prisma/dev.db"
```

**本地配置**：
```bash
DATABASE_URL="file:./prisma/dev.db"  # 相对于 server 目录
```

**分析**：
- 本地：在 `server/` 目录执行，相对路径正确
- 教程：使用绝对路径，任何目录都正确
- **结论**：教程的绝对路径更优，但需要说明

---

### 问题 3：缺少 QINIU_ZONE 配置

**本地代码中没有使用 QINIU_ZONE**！

检查后端代码：
```bash
grep -r "QINIU_ZONE" server/src/
```

**结果**：没有使用这个变量！

**教程却要求用户配置**：
```bash
QINIU_ZONE="zone_z0"
```

**后果**：配置了但没用，误导用户！

---

### 问题 4：七牛云域名格式

**教程**：
```bash
QINIU_DOMAIN="你的七牛云域名"  # 如 xxx.bkt.clouddn.com
```

**本地**：
```bash
QINIU_DOMAIN="https://video.jiangmeijixie.com"  # 带 https://
```

**后果**：用户可能忘记加 `https://`！

---

## ✅ 修正方案

### 修正 1：七牛云配置说明

**教程应该说明**：

```bash
# 七牛云配置（⚠️ 必须修改成你的！）
# 1. AccessKey 和 SecretKey：七牛云控制台 → 密钥管理
# 2. 储存空间名称：如 zhuque-guangdong（不是域名！）
# 3. 域名：如 https://video.jiangmeijixie.com（要带 https://）
# 4. 路径前缀：如 参考网站 2026/（用于组织文件）

QINIU_ACCESS_KEY="你的 AccessKey"
QINIU_SECRET_KEY="你的 SecretKey"
QINIU_BUCKET="你的储存空间名称"
QINIU_DOMAIN="https://你的域名.com"
QINIU_PREFIX="你的路径前缀/"
```

**删除**：`QINIU_ZONE`（代码中没使用）

---

### 修正 2：数据库路径说明

**教程应该说明**：

```bash
# 数据库配置
# 说明：使用绝对路径，避免在不同目录执行时出错
# 实际文件位置：/var/www/ckanim/server/prisma/dev.db
DATABASE_URL="file:/var/www/ckanim/server/prisma/dev.db"
```

---

### 修正 3：配置示例

**提供完整示例**：

```bash
# JWT 配置（⚠️ 生产环境必须修改！）
# 生成随机字符串：openssl rand -base64 32
JWT_SECRET="xK9mL2nP5qR8sT1vW4yZ7aB0cD3eF6gH9iJ2kL5mN8o="
JWT_EXPIRES_IN="7d"

# 七牛云配置（⚠️ 必须修改成你的！）
QINIU_ACCESS_KEY="DwLK5ft-Zx0XgxiI8HaIyeUh0wyaHddssczs2s0c"
QINIU_SECRET_KEY="14ykOp2Q-nkbLmSfZdd2aHmoEnZUHqWxk1BeFN2-"
QINIU_BUCKET="zhuque-guangdong"
QINIU_DOMAIN="https://video.jiangmeijixie.com"
QINIU_PREFIX="参考网站 2026/"

# 数据库配置（SQLite）
DATABASE_URL="file:/var/www/ckanim/server/prisma/dev.db"

# 服务器配置
PORT=3002
NODE_ENV=production
```

---

## 📋 配置项说明

### 必须修改的配置

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `JWT_SECRET` | JWT 密钥（生产环境必须随机生成） | `openssl rand -base64 32` |
| `QINIU_ACCESS_KEY` | 七牛云 AccessKey | `DwLK5ft-xxxxx` |
| `QINIU_SECRET_KEY` | 七牛云 SecretKey | `14ykOp2Q-xxxxx` |
| `QINIU_BUCKET` | 七牛云储存空间名称 | `zhuque-guangdong` |
| `QINIU_DOMAIN` | 七牛云域名（带 https://） | `https://video.jiangmeijixie.com` |
| `QINIU_PREFIX` | 文件路径前缀 | `参考网站 2026/` |

### 可以不修改的配置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `DATABASE_URL` | 数据库路径（绝对路径） | `file:/var/www/ckanim/server/prisma/dev.db` |
| `PORT` | 后端 API 端口 | `3002` |
| `NODE_ENV` | 环境 | `production` |

---

## 🎯 部署教程修正清单

- [x] 删除 `QINIU_ZONE` 配置（代码中未使用）
- [ ] 更新七牛云配置说明（强调域名要带 `https://`）
- [ ] 更新 `QINIU_PREFIX` 说明（示例：`参考网站 2026/`）
- [ ] 添加配置项详细说明
- [ ] 提供完整配置示例
- [ ] 说明数据库路径使用绝对路径的原因

---

**检查完成时间**: 2026-03-21  
**状态**: 待修正
