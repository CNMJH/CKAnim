# 轮播图管理功能文档

## 📋 功能概述

为 CKAnim 管理员后台新增轮播图管理功能，支持系统管理员配置首页轮播图，每个轮播图可设置展示时长，过期后自动下架。

## ✨ 功能特性

### 1. 轮播图管理
- ✅ 创建/编辑/删除轮播图
- ✅ 上传图片（本地存储）
- ✅ 设置展示时长（小时）
- ✅ 自动过期下架
- ✅ 默认轮播图（常驻展示）
- ✅ 续期功能（一键续期）
- ✅ 点击跳转链接（可选）

### 2. 权限控制
- ✅ 仅 system_admin 可访问
- ✅ content_admin 不可见
- ✅ 前台公开 API（只读）

### 3. 自动过期
- ✅ 设置时长后自动计算结束时间
- ✅ 过期轮播图自动从首页下架
- ✅ 管理员后台可查看所有轮播图（含过期）
- ✅ 一键续期功能

## 🗂️ 数据库结构

### Carousel 表

```prisma
model Carousel {
  id          Int      @id @default(autoincrement())
  title       String   // 轮播图标题
  imageUrl    String   // 图片 URL
  targetUrl   String?  // 跳转链接（可选）
  order       Int      @default(0) // 排序
  duration    Int      @default(24) // 展示时长（小时）
  startTime   DateTime // 开始时间
  endTime     DateTime // 结束时间（自动计算）
  active      Boolean  @default(true) // 是否激活
  isDefault   Boolean  @default(false) // 是否默认轮播图（常驻）
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## 🔌 API 接口

### 公开 API（前台使用）

#### GET /api/carousels/active
获取当前有效的轮播图（无需认证）

**响应示例:**
```json
{
  "carousels": [
    {
      "id": 1,
      "title": "欢迎来到 CKAnim",
      "imageUrl": "https://anick.cn/static/carousel-images/1234567890-abc123.jpg",
      "targetUrl": "https://example.com",
      "order": 1,
      "duration": 168,
      "startTime": "2026-03-26T01:59:29.694Z",
      "endTime": "2026-04-02T01:59:29.694Z",
      "active": true,
      "isDefault": true
    }
  ]
}
```

### 管理员 API（后台使用）

需要认证：`Authorization: Bearer <token>`

#### GET /api/admin/carousels
获取所有轮播图（支持过滤）

**查询参数:**
- `active`: 过滤激活状态（true/false）
- `includeExpired`: 是否包含过期轮播图（true/false）

#### POST /api/admin/carousels
创建新轮播图

**请求体:**
```json
{
  "title": "新年活动",
  "imageUrl": "https://anick.cn/static/carousel-images/...",
  "targetUrl": "https://example.com/promo",
  "duration": 72,
  "order": 1,
  "isDefault": false
}
```

#### PUT /api/admin/carousels/:id
更新轮播图

#### DELETE /api/admin/carousels/:id
删除轮播图（不能删除默认轮播图）

#### POST /api/admin/carousels/:id/renew
续期轮播图

**请求体:**
```json
{
  "duration": 168
}
```

#### POST /api/admin/carousels/upload
上传图片

**请求类型:** `multipart/form-data`

**响应:**
```json
{
  "url": "https://anick.cn/static/carousel-images/1234567890-abc123.jpg"
}
```

## 🖥️ 管理页面

### 访问路径
`https://admin.anick.cn/carousels`

### 功能界面

1. **轮播图列表**
   - 卡片视图显示所有轮播图
   - 显示剩余时间/过期状态
   - 默认轮播图绿色边框标识
   - 过期轮播图半透明显示

2. **创建/编辑表单**
   - 标题（必填）
   - 图片 URL 或上传本地图片
   - 跳转链接（可选）
   - 展示时长（小时）
   - 排序
   - 设为默认轮播图（复选框）

3. **操作按钮**
   - 续期：一键续期，从当前时间重新计算
   - 编辑：修改轮播图信息
   - 删除：删除轮播图（默认轮播图不可删除）

## 🏠 前台集成

### Home.jsx 自动获取轮播图

```javascript
// 加载轮播图
useEffect(() => {
  const loadBanners = async () => {
    const response = await carouselAPI.getActive();
    const activeBanners = response.data.carousels || [];
    
    if (activeBanners.length > 0) {
      setBanners(activeBanners);
    } else {
      // 使用默认轮播图
      setBanners([...]);
    }
  };
  loadBanners();
}, []);
```

### 特性
- ✅ 自动轮播（5 秒间隔）
- ✅ 点击跳转（如果配置了 targetUrl）
- ✅ 无轮播图时显示占位符
- ✅ 轮播点指示器

## 📁 文件存储

### 图片存储路径
`/var/www/ckanim/public/carousel-images/`

### Nginx 配置
```nginx
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

### 访问 URL
`https://anick.cn/static/carousel-images/<filename>`

## 🔐 权限说明

| 角色 | 轮播图管理菜单 | 查看轮播图 | 创建/编辑/删除 |
|------|--------------|-----------|--------------|
| system_admin | ✅ 可见 | ✅ | ✅ |
| content_admin | ❌ 不可见 | ✅ | ❌ |
| user | ❌ 不可见 | ✅ | ❌ |

## 📊 过期逻辑

### 时间计算
```javascript
// 创建时
startTime = new Date()
endTime = startTime + (duration * 60 * 60 * 1000)

// 续期时
startTime = new Date()  // 从当前时间重新计算
endTime = startTime + (duration * 60 * 60 * 1000)
```

### 自动下架
- 前台 API `/api/carousels/active` 只返回 `endTime >= now` 的轮播图
- 过期轮播图在管理后台仍然可见（半透明显示）
- 可手动删除或续期过期轮播图

## 🧪 测试步骤

### 1. 登录管理员后台
```
URL: https://admin.anick.cn
账号：sysadmin
密码：SystemAdmin@123
```

### 2. 访问轮播图管理页面
```
URL: https://admin.anick.cn/carousels
```

### 3. 创建测试轮播图
1. 点击"+ 新建轮播图"
2. 填写标题、上传图片
3. 设置展示时长（如 24 小时）
4. 点击"保存"

### 4. 验证前台显示
```
URL: https://anick.cn
```
查看首页左侧轮播图区域是否显示新创建的轮播图。

### 5. 测试过期功能
1. 创建一个时长 1 小时的轮播图
2. 等待 1 小时后刷新首页
3. 轮播图应自动下架

### 6. 测试续期功能
1. 在管理后台找到即将过期的轮播图
2. 点击"续期"按钮
3. 输入新的时长
4. 验证结束时间已更新

## 📝 注意事项

1. **图片上传**
   - 支持格式：JPG, PNG, WebP, GIF
   - 推荐尺寸：1200x400 像素
   - 本地存储，避免七牛云认证问题

2. **默认轮播图**
   - 只能有一个默认轮播图
   - 设置新的默认轮播图会自动取消旧的
   - 默认轮播图不会过期，需手动删除

3. **删除限制**
   - 不能删除默认轮播图
   - 需先取消"默认"标识再删除

4. **性能优化**
   - 轮播图缓存在浏览器（30 天）
   - 前台 API 无认证，加载快速
   - 图片使用 WebP 格式（自动降级）

## 🚀 部署清单

- [x] 数据库迁移（`npx prisma db push`）
- [x] 创建图片存储目录（`/var/www/ckanim/public/carousel-images/`）
- [x] Nginx 配置（已配置 `/static/` 路径）
- [x] 后端服务重启（`pm2 restart ckanim-server`）
- [x] 前端构建（`npm run build`）
- [x] 管理服务重启（`pm2 restart ckanim-admin`）
- [x] API 验证（公开 + 管理员）
- [x] 创建测试轮播图

## 📞 技术支持

如遇问题，请检查：
1. PM2 服务状态：`pm2 status`
2. 服务器日志：`pm2 logs ckanim-server`
3. 数据库表是否存在：`sqlite3 dev.db ".tables"`
4. 图片目录权限：`ls -la /var/www/ckanim/public/carousel-images/`

---

_最后更新：2026-03-26_
