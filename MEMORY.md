# CKAnim 项目记忆库

## 📋 重要经验教训

### 1. Nginx 配置修改原则
**问题**：使用 `sed -i` 插入配置导致多处重复，网站崩溃显示 Apache 默认页

**教训**：
- ❌ 避免使用 `sed -i` 修改复杂配置文件
- ✅ 使用 `cat > file << 'EOF'` 完整重写配置文件
- ✅ 修改前备份：`cp /etc/nginx/conf.d/ckanim.conf /etc/nginx/conf.d/ckanim.conf.bak`
- ✅ 修改后验证：`nginx -t && systemctl reload nginx`

### 2. 静态文件服务配置
**正确做法**：
```nginx
# 在 HTTPS server 块内添加
location /static/ {
    alias /var/www/ckanim/public/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    types {
        image/jpeg jpg jpeg;
        image/webp webp;
        image/png png;
        image/gif gif;
    }
}
```

**路径映射**：
- URL: `https://anick.cn/static/covers/xxx.jpg`
- 实际路径：`/var/www/ckanim/public/covers/xxx.jpg`

### 3. 七牛云上传问题
**已知问题**：华南区域 bucket (`zhuque-guangdong`) 上传返回 401 Bad Token

**尝试过的方案**（均失败）：
- curl 直接上传
- Node SDK FormUploader
- 不同上传端点切换
- 带/不带 zone 配置

**临时解决**：使用本地存储 + Nginx 静态文件服务

**待排查**：
- 检查七牛云后台上传端点配置
- 验证 AccessKey/SecretKey 是否过期
- 联系七牛云技术支持

### 4. Mixed Content 修复
**问题**：HTTPS 页面加载 HTTP 资源被浏览器阻止

**修复模式**：
```javascript
// ❌ 错误
const API_BASE = 'http://39.102.115.79:3002/api'

// ✅ 正确
const API_BASE = 'https://admin.anick.cn/api'
```

**部署流程**：
```bash
cd /home/tenbox/CKAnim/admin
npm run build
scp -r dist/* root@server:/var/www/ckanim/admin/dist/
ssh root@server "pm2 restart ckanim-admin"
```

### 5. 数据库操作规范
**安全更新**：
```bash
# 先查询确认
sqlite3 db.db "SELECT * FROM videos WHERE id = 86;"

# 再更新
sqlite3 db.db "UPDATE videos SET coverUrl = '...' WHERE id = 86;"

# 验证结果
sqlite3 db.db "SELECT coverUrl FROM videos WHERE id = 86;"
```

**禁止操作**：
- ❌ 不要清空或覆盖现有数据库
- ❌ 不要使用 `DROP TABLE` 除非明确需要
- ❌ 不要在服务器上直接修改 prisma schema 后不迁移

---

## 🔧 服务器信息

| 项目 | 值 |
|------|-----|
| 服务器 IP | 39.102.115.79 |
| SSH 密钥 | `/home/tenbox/.ssh/ckanim_deploy` |
| 前台域名 | https://anick.cn |
| 后台域名 | https://admin.anick.cn |
| 静态资源 | https://anick.cn/static/ |

### 服务端口
| 服务 | 端口 | PM2 名称 |
|------|------|----------|
| 前台前端 | 5173 | ckanim-front |
| 后台前端 | 3003 | ckanim-admin |
| API 服务器 | 3002 | ckanim-server |

### 关键路径
```
/var/www/ckanim/
├── front/           # 前台前端
├── admin/           # 后台前端
│   └── dist/        # 构建产物
├── server/          # API 服务器
│   ├── prisma/
│   │   └── dev.db   # SQLite 数据库
│   └── scripts/     # 脚本目录
└── public/          # 静态资源
    ├── icons/       # 图标
    └── covers/      # 封面图
```

---

## 📊 数据库状态（2026-03-26）

| 表 | 记录数 | 备注 |
|----|--------|------|
| videos | 94 | 100% 有封面图 |
| games | 3 | 原神、星铁、绝区零 |
| characters | 11 | 可玩角色 |
| categories | 7 | 视频分类 |

---

## 🚨 已知问题待解决

1. **七牛云上传失败** - 401 Bad Token，改用本地存储临时解决
2. **Nginx 配置重复警告** - `conflicting server name "_" on 0.0.0.0:80`

---

*最后更新：2026-03-26*
