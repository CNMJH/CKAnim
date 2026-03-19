# 封面缩略图功能说明

**状态**: ⚠️ 代码已实现，但缺少 ffmpeg 依赖

---

## ✅ 功能实现状态

| 组件 | 状态 | 说明 |
|------|------|------|
| **后端代码** | ✅ 已完成 | `server/src/lib/thumbnail.ts` |
| **前端调用** | ✅ 已完成 | `generateCover: true` |
| **默认配置** | ✅ 已启用 | `generateCover = true` |
| **ffmpeg** | ❌ **未安装** | 服务器缺少此依赖 |
| **封面图生成** | ❌ **失败** | 因缺少 ffmpeg |

---

## 🔍 当前问题

### 现象
上传视频后，数据库中 `coverUrl` 字段为空：

```bash
curl http://localhost:3002/api/admin/videos

# 返回：
{
  "videos": [
    {
      "title": "防御",
      "coverUrl": null,  # ❌ 应该是封面图 URL
      "qiniuUrl": "..."
    }
  ]
}
```

### 原因
后端日志显示：
```
Failed to generate thumbnail: Error: ffmpeg is not defined
```

服务器上未安装 ffmpeg，导致封面图生成失败。

---

## 🛠️ 解决方案

### 方案 1: 安装 ffmpeg（推荐）

**Ubuntu/Debian**:
```bash
sudo apt-get update
sudo apt-get install -y ffmpeg
```

**CentOS/RHEL**:
```bash
sudo yum install -y ffmpeg
```

**Alpine Linux**:
```bash
apk add --no-cache ffmpeg
```

**验证安装**:
```bash
ffmpeg -version
# 应该输出版本信息
```

### 方案 2: 使用七牛云智能封面（备选）

七牛云提供智能截取封面功能，无需本地 ffmpeg：

```javascript
// server/src/lib/qiniu.js
import { cdn } from 'qiniu';

const client = new cdn.Client({
  accessKey: process.env.QINIU_ACCESS_KEY,
  secretKey: process.env.QINIU_SECRET_KEY,
});

// 调用七牛云 API 生成封面
const result = await client.createVideoThumbnailsTask({
  bucket: QINIU_CONFIG.bucket,
  key: videoKey,
  time: 1, // 第 1 秒
});
```

### 方案 3: 前端生成封面（简单方案）

使用 HTML5 Video API 在前端截取封面：

```javascript
// admin/src/pages/Actions.jsx
function generateCover(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.src = URL.createObjectURL(file);
    video.currentTime = 1; // 第 1 秒
    
    video.addEventListener('seeked', () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.8);
    });
  });
}
```

---

## 📋 安装 ffmpeg 后的验证步骤

### 1. 安装 ffmpeg
```bash
sudo apt-get install -y ffmpeg
```

### 2. 验证安装
```bash
ffmpeg -version
# 输出：
# ffmpeg version 4.4.2-0ubuntu0.22.04.1
# ...
```

### 3. 测试封面生成
```bash
# 上传一个新视频
# 或者重新上传现有视频
```

### 4. 检查数据库
```bash
curl http://localhost:3002/api/admin/videos | python3 -m json.tool | grep coverUrl
# 应该显示封面图 URL
```

### 5. 检查七牛云
```bash
node scripts/sync-check.js
# 应该显示封面图文件
```

---

## 🎯 封面图生成流程

```
上传视频
    ↓
下载视频到临时目录
    ↓
ffmpeg 截取第 1 秒帧
    ↓
生成 640x360 缩略图
    ↓
上传到七牛云（-thumbnail.jpg 后缀）
    ↓
更新数据库 coverUrl 字段
    ↓
清理临时文件
```

---

## 📊 当前视频状态

| 视频 | 封面图 | 状态 |
|------|--------|------|
| 防御 | ❌ 无 | 待生成 |
| 攻击 | ❌ 无 | 待生成 |
| 繁森攻击 | ❌ 无 | 待生成 |

---

## 🔧 重新生成现有视频封面

安装 ffmpeg 后，可以运行脚本重新生成封面：

```javascript
// server/scripts/regenerate-covers.js
import { PrismaClient } from '@prisma/client';
import { generateThumbnail, uploadThumbnailToQiniu } from '../src/lib/thumbnail.js';
import https from 'https';
import fs from 'fs';
import os from 'os';
import path from 'path';

const prisma = new PrismaClient();

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}

async function regenerateCovers() {
  const videos = await prisma.video.findMany({
    where: { coverUrl: null },
  });
  
  console.log(`找到 ${videos.length} 个需要生成封面的视频\n`);
  
  for (const video of videos) {
    try {
      console.log(`处理：${video.title}`);
      
      // 下载视频
      const tempDir = path.join(os.tmpdir(), 'ckanim-thumbnails');
      const videoFilename = path.basename(video.qiniuKey);
      const tempVideoPath = path.join(tempDir, videoFilename);
      
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      await downloadFile(video.qiniuUrl, tempVideoPath);
      
      // 生成封面
      const thumbnailPath = await generateThumbnail(tempVideoPath, tempDir);
      
      // 上传到七牛云
      const result = await uploadThumbnailToQiniu(thumbnailPath, video.qiniuKey);
      
      // 更新数据库
      await prisma.video.update({
        where: { id: video.id },
        data: { coverUrl: result.url },
      });
      
      console.log(`  ✅ 封面已生成：${result.url}\n`);
      
      // 清理临时文件
      fs.unlinkSync(tempVideoPath);
      fs.unlinkSync(thumbnailPath);
      
    } catch (err) {
      console.error(`  ❌ 失败：${err.message}\n`);
    }
  }
  
  await prisma.$disconnect();
}

regenerateCovers().catch(console.error);
```

---

## 📝 相关代码

| 文件 | 说明 |
|------|------|
| `server/src/lib/thumbnail.ts` | 封面生成核心逻辑 |
| `server/src/routes/videos.ts` (435-460 行) | 上传时调用封面生成 |
| `admin/src/pages/Actions.jsx` (215 行) | 前端传递 `generateCover: true` |

---

## ✅ 下一步

1. **安装 ffmpeg** - 在服务器上运行 `apt-get install ffmpeg`
2. **测试上传** - 上传新视频验证封面生成
3. **重新生成** - 运行脚本为现有视频生成封面
4. **验证结果** - 检查数据库和七牛云

---

**总结**: 封面功能代码完整，只需安装 ffmpeg 即可正常工作！
