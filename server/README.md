# CKAnim 管理员系统后端

## 快速开始

### 前置要求

- **Node.js** >= 18
- **PostgreSQL** >= 14

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

**重要：** 修改 `DATABASE_URL` 为你的 PostgreSQL 连接字符串

### 3. 初始化数据库

```bash
# 生成 Prisma 客户端
npm run db:generate

# 推送数据库结构
npm run db:push

# 种子数据（创建管理员和示例游戏）
npm run db:seed
```

### 4. 启动开发服务器

```bash
npm run dev
```

服务器将在 http://localhost:3002 启动

---

## 没有 PostgreSQL？

如果你还没有安装 PostgreSQL，可以：

### 选项 1: 使用 Docker（推荐）

```bash
docker run -d \
  --name ckanim-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ckanim \
  -p 5432:5432 \
  postgres:15
```

### 选项 2: 本地安装

- **macOS:** `brew install postgresql@15`
- **Ubuntu:** `sudo apt install postgresql postgresql-contrib`
- **Windows:** 下载安装 https://www.postgresql.org/download/windows/

## API 文档

### 认证

#### 登录
```bash
POST /api/admin/login
{
  "username": "admin",
  "password": "admin123"
}

Response:
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@ckanim.com",
    "role": "admin"
  }
}
```

#### 获取当前用户
```bash
GET /api/admin/me
Authorization: Bearer <token>
```

### 游戏管理

#### 获取所有游戏
```bash
GET /api/admin/games
```

#### 创建游戏
```bash
POST /api/admin/games
Authorization: Bearer <token>
{
  "name": "新游戏",
  "description": "描述",
  "order": 3
}
```

### 分类管理

#### 获取游戏分类树
```bash
GET /api/admin/games/:gameId/categories
```

#### 创建分类
```bash
POST /api/admin/categories
Authorization: Bearer <token>
{
  "name": "分类名",
  "level": 2,
  "gameId": 1,      // 一级分类需要
  "parentId": 5,    // 二级及以上需要
  "order": 1
}
```

#### 更新分类
```bash
PUT /api/admin/categories/:id
Authorization: Bearer <token>
{
  "name": "新名称",
  "order": 2
}
```

#### 删除分类
```bash
DELETE /api/admin/categories/:id
Authorization: Bearer <token>
```

### 视频管理

#### 获取上传凭证
```bash
POST /api/admin/videos/upload-token
Authorization: Bearer <token>
{
  "filename": "video.mp4",
  "gameId": 1
}

Response:
{
  "token": "upload-token",
  "key": "zhuque-guangdong/参考网站 2026/game-1/1234567890-abc123.mp4",
  "url": "https://video.jiangmeijixie.com/zhuque-guangdong/参考网站 2026/game-1/1234567890-abc123.mp4"
}
```

#### 上传视频到七牛云
使用返回的 token 和 key 直接上传到七牛云（前端实现）

#### 创建视频记录
```bash
POST /api/admin/videos
Authorization: Bearer <token>
{
  "title": "视频标题",
  "gameId": 1,
  "qiniuKey": "zhuque-guangdong/参考网站 2026/game-1/xxx.mp4",
  "qiniuUrl": "https://...",
  "duration": 120,
  "categoryIds": [1, 2, 3]
}
```

## 默认账户

- **用户名：** admin
- **密码：** admin123
- **角色：** admin

⚠️ **生产环境请修改默认密码！**

## 技术栈

- **框架：** Fastify
- **数据库：** PostgreSQL + Prisma
- **认证：** JWT
- **存储：** 七牛云对象存储
- **语言：** TypeScript (ESM)

## 项目结构

```
server/
├── src/
│   ├── index.ts          # 入口文件
│   ├── routes/
│   │   ├── auth.ts       # 认证路由
│   │   ├── games.ts      # 游戏管理
│   │   ├── categories.ts # 分类管理
│   │   └── videos.ts     # 视频管理
│   ├── middleware/
│   │   └── auth.ts       # JWT 认证中间件
│   └── lib/
│       ├── db.ts         # Prisma 客户端
│       └── qiniu.ts      # 七牛云工具
├── prisma/
│   ├── schema.prisma     # 数据库模型
│   └── seed.ts           # 种子数据
├── .env                  # 环境变量
└── package.json
```

## 数据库模型

- **Admin** - 管理员
- **Game** - 游戏
- **GameCategory** - 游戏分类（支持 1-7 级）
- **Video** - 视频

## 开发命令

```bash
npm run dev          # 开发模式
npm run build        # 编译 TypeScript
npm run start        # 启动生产服务器
npm run db:generate  # 生成 Prisma 客户端
npm run db:push      # 推送数据库结构
npm run db:studio    # 打开 Prisma Studio
npm run db:seed      # 种子数据
```
