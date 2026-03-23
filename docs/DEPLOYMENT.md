# CKAnim 部署指南

本文档介绍如何部署 CKAnim 到生产环境。

---

## 📋 部署方式

### 方式一：PM2 部署（推荐 - 简单快速）

**适用场景**: 单机部署、快速上线、开发测试环境

**步骤**:

1. **安装 PM2**
   ```bash
   npm install -g pm2
   ```

2. **配置环境变量**
   ```bash
   cp .env.production.example .env.production
   # 编辑 .env.production，填入实际配置
   ```

3. **安装依赖并构建**
   ```bash
   ./deploy.sh build
   ```

4. **启动服务**
   ```bash
   ./deploy.sh start
   ```

5. **验证服务**
   ```bash
   pm2 status
   curl http://localhost:3002/api/games
   ```

**常用命令**:
```bash
pm2 status              # 查看状态
pm2 logs                # 查看日志
pm2 restart all         # 重启所有服务
pm2 stop all            # 停止所有服务
pm2 delete all          # 删除所有进程
```

---

### 方式二：Docker 部署（推荐 - 生产环境）

**适用场景**: 生产环境、多服务编排、需要隔离

**步骤**:

1. **配置环境变量**
   ```bash
   cp .env.production.example .env.production
   # 编辑 .env.production
   ```

2. **构建并启动**
   ```bash
   docker-compose up -d --build
   ```

3. **查看状态**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

4. **数据库迁移**
   ```bash
   docker-compose exec server npx prisma migrate deploy
   ```

**常用命令**:
```bash
docker-compose down             # 停止并删除容器
docker-compose restart          # 重启所有服务
docker-compose logs -f server   # 查看后端日志
docker-compose exec server bash # 进入后端容器
```

---

### 方式三：阿里云服务器部署

**适用场景**: 云服务器、需要公网访问

**步骤**:

1. **准备服务器**
   - 阿里云 ECS（2 核 4G+）
   - 操作系统：Alibaba Cloud Linux 3 / Ubuntu 22.04
   - 开放端口：80, 443, 3002, 3003

2. **安装依赖**
   ```bash
   # 安装 Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
   apt install -y nodejs
   
   # 安装 PM2
   npm install -g pm2
   
   # 安装 Git
   apt install -y git
   ```

3. **克隆代码**
   ```bash
   cd /var/www
   git clone https://github.com/CNMJH/CKAnim.git
   cd CKAnim
   ```

4. **配置环境变量**
   ```bash
   cp .env.production.example .env.production
   vim .env.production  # 编辑配置
   ```

5. **部署**
   ```bash
   ./deploy.sh
   ```

6. **配置 Nginx（可选，用于反向代理）**
   ```bash
   # /etc/nginx/sites-available/ckanim
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5173;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
       
       location /api {
           proxy_pass http://localhost:3002;
       }
       
       location /admin {
           proxy_pass http://localhost:3003;
       }
   }
   
   # 启用配置
   ln -s /etc/nginx/sites-available/ckanim /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

7. **配置 HTTPS（推荐）**
   ```bash
   # 使用 Let's Encrypt
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d your-domain.com
   ```

---

## 🔧 环境变量说明

### 必需配置

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `JWT_SECRET` | JWT 签名密钥 | `your-secret-key` |
| `JWT_EXPIRES_IN` | Token 有效期 | `7d` |
| `QINIU_ACCESS_KEY` | 七牛云 AccessKey | `YOUR_ACCESS_KEY` |
| `QINIU_SECRET_KEY` | 七牛云 SecretKey | `YOUR_SECRET_KEY` |
| `QINIU_BUCKET` | 七牛云存储桶 | `zhuque-guangdong` |
| `QINIU_DOMAIN` | 七牛云域名 | `https://video.jiangmeijixie.com` |
| `QINIU_PREFIX` | 存储路径前缀 | `参考网站 2026/` |

### 可选配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 后端端口 | `3002` |
| `NODE_ENV` | 运行环境 | `production` |
| `DATABASE_URL` | 数据库连接 | SQLite 默认 |

---

## 📊 数据库迁移

### SQLite（开发环境）
```bash
cd server
npx prisma db push
```

### PostgreSQL（生产环境）
```bash
cd server
npx prisma migrate deploy
npx prisma generate
```

---

## 🔍 故障排查

### 服务无法启动

```bash
# 查看 PM2 日志
pm2 logs ckanim-server

# 查看端口占用
lsof -ti:3002 | xargs kill -9

# 检查环境变量
cat .env.production
```

### 数据库连接失败

```bash
# 测试数据库连接
cd server
npx prisma db pull

# 查看数据库日志
docker-compose logs postgres
```

### 七牛云上传失败

```bash
# 检查配置
cat .env.production | grep QINIU

# 测试上传
curl -X POST http://localhost:3002/api/admin/videos/upload-token \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.mp4", "gameId": 1, "categoryIds": [], "actionId": 1}'
```

---

## 📈 性能优化建议

### 1. 启用 Gzip 压缩
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

### 2. 配置 CDN
- 图片、视频等静态资源使用七牛云 CDN
- 前端静态资源可考虑使用 Cloudflare

### 3. 数据库优化
- 定期清理无用数据
- 添加索引优化查询
- 使用连接池

### 4. 缓存策略
- Redis 缓存热点数据
- HTTP 缓存头配置
- 浏览器缓存优化

---

## 🔐 安全建议

1. **修改默认密钥**: JWT_SECRET 必须使用随机字符串
2. **HTTPS**: 生产环境必须使用 HTTPS
3. **防火墙**: 仅开放必要端口
4. **定期更新**: 及时更新依赖包
5. **备份**: 定期备份数据库

---

## 📝 检查清单

部署前确认：
- [ ] 环境变量已配置
- [ ] JWT_SECRET 已修改
- [ ] 数据库已迁移
- [ ] 端口已开放
- [ ] HTTPS 已配置
- [ ] 备份策略已设置

部署后验证：
- [ ] 前台网站可访问
- [ ] 管理后台可访问
- [ ] API 接口正常
- [ ] 视频上传正常
- [ ] 日志记录正常
- [ ] 错误监控正常

---

_最后更新：2026-03-19_
