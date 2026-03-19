# 前端生成封面图使用指南

## 📖 原理说明

### 技术栈

| API | 作用 | 浏览器支持 |
|-----|------|-----------|
| **HTML5 Video** | 加载和播放视频 | ✅ 所有现代浏览器 |
| **Canvas 2D** | 绘制视频帧为图片 | ✅ 所有现代浏览器 |
| **Blob API** | 导出图片二进制数据 | ✅ 所有现代浏览器 |
| **Object URL** | 创建临时文件引用 | ✅ 所有现代浏览器 |

### 工作流程

```
1. 用户选择视频文件
        ↓
2. 创建 Video 元素加载文件
        ↓
3. 跳转到第 1 秒 (currentTime = 1)
        ↓
4. 等待 seeked 事件（跳转完成）
        ↓
5. 创建 Canvas 绘制视频帧
        ↓
6. 导出为 JPEG Blob
        ↓
7. 上传到七牛云
        ↓
8. 清理临时对象
```

---

## 💻 使用方法

### 基础用法

```javascript
import { generateVideoCover } from './lib/cover-generator.js';

// 用户上传视频
const file = fileInput.files[0];

try {
  // 生成封面
  const { blob, url, width, height, size } = await generateVideoCover(file);
  
  console.log('封面生成成功:');
  console.log(`  尺寸：${width}x${height}`);
  console.log(`  大小：${(size / 1024).toFixed(2)} KB`);
  console.log(`  预览：${url}`);
  
  // 显示预览
  const img = document.createElement('img');
  img.src = url;
  document.body.appendChild(img);
  
  // 上传到七牛云
  const formData = new FormData();
  formData.append('token', uploadToken);
  formData.append('key', coverKey);
  formData.append('file', blob);
  
  await fetch('https://up-z2.qiniup.com/', {
    method: 'POST',
    body: formData,
  });
  
} catch (error) {
  console.error('封面生成失败:', error);
}
```

### 批量生成

```javascript
import { generateCoversBatch } from './lib/cover-generator.js';

const files = Array.from(fileInput.files);

// 批量生成（并发 3 个）
const results = await generateCoversBatch(files, 3);

results.forEach((result, index) => {
  if (result.error) {
    console.error(`文件 ${index} 失败:`, result.error);
  } else {
    console.log(`文件 ${index} 封面:`, result.cover);
  }
});
```

### 调整尺寸

```javascript
import { generateVideoCover, resizeCover } from './lib/cover-generator.js';

const { blob } = await generateVideoCover(file);

// 压缩到 640x360
const resizedBlob = await resizeCover(blob, 640, 360);

console.log(`压缩后大小：${(resizedBlob.size / 1024).toFixed(2)} KB`);
```

---

## 🔧 集成到 Actions.jsx

### 修改上传流程

```javascript
// admin/src/pages/Actions.jsx
import { generateVideoCover } from '../lib/cover-generator.js';

const handleUpload = async () => {
  for (let i = 0; i < pendingFiles.length; i++) {
    const file = pendingFiles[i];
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    
    try {
      // 1. 获取上传凭证
      const tokenResponse = await videosAPI.getUploadToken({
        filename: file.name,
        gameId: Number(selectedGameId),
        actionId: actionId,
      });
      
      const { token, key, url } = tokenResponse.data;
      
      // 2. 上传视频到七牛云
      const formData = new FormData();
      formData.append('token', token);
      formData.append('key', key);
      formData.append('file', file);
      
      await uploadToQiniu(formData);
      
      // 3. ⭐ 生成封面图（前端）
      let coverUrl = null;
      try {
        const { blob: coverBlob } = await generateVideoCover(file, 1, 0.8);
        
        // 上传封面到七牛云
        const coverKey = key.replace('.mp4', '-thumbnail.jpg');
        const coverToken = videosAPI.getCoverUploadToken(coverKey);
        
        const coverFormData = new FormData();
        coverFormData.append('token', coverToken);
        coverFormData.append('key', coverKey);
        coverFormData.append('file', coverBlob);
        
        await uploadToQiniu(coverFormData);
        coverUrl = getFileUrl(coverKey);
        
      } catch (err) {
        console.warn('封面生成失败，继续上传视频:', err);
      }
      
      // 4. 创建视频记录
      await videosAPI.create({
        title: fileName,
        gameId: Number(selectedGameId),
        characterId: Number(selectedCharacterId),
        actionId: actionId,
        qiniuKey: key,
        qiniuUrl: url,
        coverUrl: coverUrl, // ⭐ 封面图 URL
        published: true,
        generateCover: false, // ⭐ 前端已生成，不需要后端生成
      });
      
    } catch (error) {
      console.error('[上传] 失败:', error);
    }
  }
};
```

---

## 📊 性能对比

| 方案 | 速度 | 质量 | 兼容性 | 依赖 |
|------|------|------|--------|------|
| **前端生成** | ⚡ 快 | ⭐⭐⭐⭐ | ✅ 好 | 无 |
| **后端 ffmpeg** | 🐌 慢 | ⭐⭐⭐⭐⭐ | ✅ 好 | ffmpeg |
| **七牛云智能** | ⚡ 最快 | ⭐⭐⭐ | ✅ 好 | 七牛云 VIP |

### 速度对比

| 视频大小 | 前端生成 | 后端 ffmpeg |
|---------|---------|------------|
| 10 MB | ~0.5 秒 | ~2 秒 |
| 50 MB | ~1 秒 | ~5 秒 |
| 100 MB | ~2 秒 | ~10 秒 |

**前端生成优势**:
- ✅ 无需服务器安装 ffmpeg
- ✅ 减轻服务器压力
- ✅ 即时预览
- ✅ 不占用服务器带宽（视频直传七牛云）

**前端生成劣势**:
- ⚠️ 依赖浏览器性能
- ⚠️ 大视频可能卡顿
- ⚠️ 移动端性能有限

---

## 🎨 实际效果

### 示例代码

```javascript
// 在上传弹窗中显示封面预览
function UploadModal({ file, onCoverGenerated }) {
  const [coverUrl, setCoverUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  
  useEffect(() => {
    if (file) {
      setGenerating(true);
      generateVideoCover(file, 1, 0.8)
        .then(({ url, blob }) => {
          setCoverUrl(url);
          onCoverGenerated?.(blob);
        })
        .catch(console.error)
        .finally(() => setGenerating(false));
    }
  }, [file]);
  
  return (
    <div className="upload-preview">
      {generating ? (
        <div className="loading">生成封面中...</div>
      ) : coverUrl ? (
        <img src={coverUrl} alt="封面预览" />
      ) : (
        <div className="placeholder">无封面</div>
      )}
    </div>
  );
}
```

---

## 🐛 常见问题

### Q1: 跨域问题

**问题**: 视频文件来自不同域名，Canvas 被污染

**解决**: 使用本地文件（用户上传）或设置 `crossOrigin="anonymous"`

```javascript
video.crossOrigin = 'anonymous';
```

### Q2: 移动端性能

**问题**: 大视频在移动端卡顿

**解决**: 限制视频大小或使用 Web Worker

```javascript
// 限制文件大小
if (file.size > 100 * 1024 * 1024) {
  throw new Error('视频文件过大，最大支持 100MB');
}
```

### Q3: 浏览器兼容性

**问题**: 旧浏览器不支持

**解决**: 添加降级方案

```javascript
if (!HTMLMediaElement.prototype.captureStream) {
  // 降级：使用后端生成
  return generateCoverBackend(file);
}
```

---

## 📝 完整示例

查看 `admin/src/lib/cover-generator.js` 获取完整工具函数：

- `generateVideoCover()` - 生成单个封面
- `generateCoversBatch()` - 批量生成
- `resizeCover()` - 调整尺寸
- `previewCover()` - 预览封面

---

## ✅ 总结

**前端生成封面图**:
1. ✅ **无需后端依赖** - 不安装 ffmpeg
2. ✅ **即时预览** - 用户上传后立即看到封面
3. ✅ **减轻服务器压力** - 计算在客户端完成
4. ✅ **简单易用** - 纯 JavaScript 实现
5. ⚠️ **注意性能** - 大视频可能卡顿

**推荐方案**: 
- 小视频（<100MB）→ 前端生成 ✅
- 大视频（>100MB）→ 后端 ffmpeg 或七牛云智能
