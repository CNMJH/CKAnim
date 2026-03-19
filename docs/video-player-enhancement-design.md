# 视频播放器增强设计文档

**日期**: 2026-03-19  
**版本**: v1.0  
**状态**: 📋 待开发

---

## 🎯 设计目标

为 CKAnim 游戏参考页的视频播放器添加专业动画参考功能，包括：
- 逐帧播放控制
- 视频标注/绘画功能
- 画板系统（默认关闭，手动开启）
- 帧截图保存

---

## 🎨 UI 设计

### 整体布局

```
┌─────────────────────────────────────────────────────────────┐
│ [播放器 v1.0]                                    (左上角)    │
│                                                             │
│                                                             │
│                                                             │
│                        视频画面区域                          │
│                     (16:9 比例，灰色背景)                     │
│                                                             │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ ▶  00:00 / 00:08                    [画板]  [倍速]          │
├─────────────────────────────────────────────────────────────┤
│ [上一帧] [下一帧]   [保存此帧]   👁️ ● 🟥 ✏️ ️ 🧹 T ↩️ ↪️ 🔄 💾 │
└─────────────────────────────────────────────────────────────┘
```

### 控制栏分层

**第一层（始终显示）**:
- 播放/暂停按钮
- 时间进度条
- 时间显示 (当前时间 / 总时长)
- 画板总开关按钮
- 倍速按钮

**第二层（画板开启后显示）**:
- 逐帧控制：上一帧、下一帧
- 截图功能：保存此帧
- 绘画工具：可见性开关、画笔粗细、画笔颜色
- 绘画工具：全程画笔、单帧画笔、橡皮擦、文本
- 操作历史：上一步、下一步、清除全部
- 保存功能：保存绘画标记到本地

---

## 🔧 功能详细说明

### 基础播放控制

| 按钮 | 图标 | 功能 | 快捷键 |
|------|------|------|--------|
| **播放/暂停** | ▶️ / ⏸️ | 切换播放/暂停状态 | 空格键 |
| **进度条** | ━━━━━━ | 拖拽调整播放进度 | - |
| **时间显示** | 00:00/00:08 | 当前时间 / 总时长 | - |

---

### 画板总开关

| 属性 | 说明 |
|------|------|
| **按钮文字** | "画板" |
| **默认状态** | ❌ 关闭 |
| **点击效果** | 展开/收起下方画板工具栏 |
| **状态保持** | 切换视频时重置为关闭 |

---

### 逐帧控制

| 按钮 | 图标 | 功能 | 快捷键 |
|------|------|------|--------|
| **上一帧** | ⏮️ | 跳转到上一帧 | ← 方向键 |
| **下一帧** | ⏭️ | 跳转到下一帧 | → 方向键 |

**技术实现**:
```javascript
// 假设视频 30fps
const FRAME_DURATION = 1 / 30; // 秒

function previousFrame() {
  video.currentTime = Math.max(0, video.currentTime - FRAME_DURATION);
}

function nextFrame() {
  video.currentTime = Math.min(video.duration, video.currentTime + FRAME_DURATION);
}
```

---

### 截图功能

| 按钮 | 图标 | 功能 | 快捷键 |
|------|------|------|--------|
| **保存此帧** | 📷 | 保存当前帧图片到本地 | S 键 |

**技术实现**:
```javascript
function saveCurrentFrame() {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // 下载图片
  const link = document.createElement('a');
  link.download = `frame_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
```

---

### 绘画工具

#### 1. 绘画内容总可视开关

| 属性 | 说明 |
|------|------|
| **图标** | 👁️ / 👁️‍️ (显示/隐藏) |
| **功能** | 切换所有绘画内容的可见性 |
| **状态** | 开启/关闭 |
| **影响** | 不影响已保存的绘画数据，仅控制显示 |

---

#### 2. 画笔粗细设置

| 属性 | 说明 |
|------|------|
| **图标** | ● (圆点大小表示粗细) |
| **交互** | 点击弹出滑块选择器 (1-50px) |
| **默认值** | 5px |
| **实时预览** | 滑块拖动时显示当前粗细 |

---

#### 3. 画笔颜色设置

| 属性 | 说明 |
|------|------|
| **图标** | 🟥 (红色方块，显示当前颜色) |
| **交互** | 点击弹出颜色选择器 |
| **默认值** | #FF0000 (红色) |
| **预设颜色** | 红、橙、黄、绿、青、蓝、紫、黑、白 |
| **自定义颜色** | 支持 HEX/RGB 输入 |

---

#### 4. 画笔（全程）

| 属性 | 说明 |
|------|------|
| **图标** | ✏️ (带水印标识) |
| **功能** | 在当前帧绘画，内容全程显示（类似水印） |
| **持久性** | 绘画内容绑定到视频，所有帧都显示 |
| **用途** | 标注固定参考点、水印、签名等 |

**数据结构**:
```javascript
{
  type: 'permanent',
  frameIndex: 0,  // 绘制的帧
  paths: [...],   // 绘画路径数据
  timestamp: Date.now()
}
```

---

#### 5. 画笔（单帧）

| 属性 | 说明 |
|------|------|
| **图标** | ✏️ (普通铅笔) |
| **功能** | 在当前帧绘画，仅当前帧显示 |
| **持久性** | 绘画内容绑定到特定帧，切换帧后隐藏，返回时显示 |
| **用途** | 帧级标注、动作分解等 |

**数据结构**:
```javascript
{
  type: 'frame-specific',
  frameIndex: 15,  // 仅在第 15 帧显示
  paths: [...],
  timestamp: Date.now()
}
```

---

#### 6. 橡皮擦

| 属性 | 说明 |
|------|------|
| **图标** | 🧹 |
| **功能** | 擦除绘画内容 |
| **模式** | 点击切换到擦除模式，再次点击切回画笔 |
| **擦除范围** | 可配置（仅单帧/全程/全部） |

---

#### 7. 文本工具

| 属性 | 说明 |
|------|------|
| **图标** | T |
| **功能** | 在视频上添加文字标注 |
| **交互** | 点击后在视频上点击位置输入文字 |
| **样式** | 可配置字体、大小、颜色、背景 |

---

#### 8. 上一步 / 下一步

| 按钮 | 图标 | 功能 | 快捷键 |
|------|------|------|--------|
| **上一步** | ↩️ | 撤销上一次绘画操作 | Ctrl+Z |
| **下一步** | ↪️ | 重做被撤销的操作 | Ctrl+Y |

**技术实现**:
```javascript
const history = [];
const historyIndex = -1;

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    renderDrawings(history[historyIndex]);
  }
}

function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    renderDrawings(history[historyIndex]);
  }
}
```

---

#### 9. 清除全部

| 属性 | 说明 |
|------|------|
| **图标** | 🔄 (循环箭头) |
| **功能** | 清除所有绘画内容 |
| **确认** | 弹窗确认："确定要清除所有绘画吗？" |
| **范围** | 当前视频的所有绘画（单帧 + 全程） |

---

#### 10. 保存绘画标记到本地

| 属性 | 说明 |
|------|------|
| **图标** | 💾 (软盘) |
| **功能** | 保存绘画数据到本地文件 |
| **格式** | JSON 文件 |
| **弹窗选项** | 
  - 单帧：保存当前帧视频 + 绘画内容
  - 全部：导出当前视频 + 全部绘画内容

**保存格式**:
```json
{
  "videoId": 11,
  "videoTitle": "戳刺攻击潘森",
  "exportedAt": "2026-03-19T12:00:00.000Z",
  "drawings": [
    {
      "type": "permanent",
      "frameIndex": 0,
      "paths": [...],
      "timestamp": 1710864000000
    },
    {
      "type": "frame-specific",
      "frameIndex": 15,
      "paths": [...],
      "timestamp": 1710864001000
    }
  ]
}
```

---

## 🎹 快捷键映射

| 快捷键 | 功能 | 作用域 |
|--------|------|--------|
| **空格** | 播放/暂停 | 全局 |
| **←** | 上一帧 | 画板开启 |
| **→** | 下一帧 | 画板开启 |
| **S** | 保存此帧 | 画板开启 |
| **Ctrl+Z** | 撤销 | 画板开启 |
| **Ctrl+Y** | 重做 | 画板开启 |
| **Esc** | 关闭画板 | 画板开启 |
| **H** | 隐藏/显示绘画 | 画板开启 |

---

## 📐 尺寸规范

### 播放器容器

```css
.video-player-container {
  width: 1000px;        /* 固定宽度 */
  aspect-ratio: 16/9;   /* 或固定高度 562.5px */
  background: #000;
}
```

### 控制栏尺寸

```css
/* 第一层控制栏 */
.controls-bar-primary {
  height: 48px;
  background: rgba(0, 0, 0, 0.7);
  padding: 0 16px;
}

/* 第二层画板工具栏 */
.controls-bar-drawing {
  height: 64px;
  background: rgba(0, 0, 0, 0.8);
  padding: 0 16px;
  gap: 8px;
}
```

### 按钮尺寸

```css
.control-btn {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  font-size: 18px;
}

.text-btn {
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 6px;
}
```

---

## 🎨 配色方案

### 主题色

| 用途 | 颜色 | HEX |
|------|------|-----|
| **背景** | 深灰 | #2C2C2C |
| **控制栏** | 半透明黑 | rgba(0, 0, 0, 0.7) |
| **按钮** | 中灰 | #4A4A4A |
| **按钮悬停** | 浅灰 | #5A5A5A |
| **按钮激活** | 蓝色 | #007AFF |
| **文字** | 白色 | #FFFFFF |
| **强调色** | 红色 | #FF3B30 |

### 状态色

| 状态 | 颜色 | 说明 |
|------|------|------|
| **默认** | #4A4A4A | 按钮背景 |
| **悬停** | #5A5A5A | 鼠标悬停 |
| **激活** | #007AFF | 功能开启 |
| **禁用** | #2C2C2C | 不可用状态 |

---

## 📦 数据结构

### 绘画数据模型

```typescript
interface Drawing {
  id: string;
  type: 'permanent' | 'frame-specific';
  frameIndex: number;
  tool: 'brush' | 'eraser' | 'text';
  color: string;
  size: number;
  paths: Path[];
  text?: string;
  position?: { x: number; y: number };
  timestamp: number;
}

interface Path {
  points: { x: number; y: number }[];
  pressure?: number;  // 压感（如果支持）
}

interface VideoAnnotation {
  videoId: number;
  videoTitle: string;
  exportedAt: string;
  drawings: Drawing[];
}
```

---

## 🔧 技术实现要点

### 1. Canvas 叠加层

```jsx
<div className="video-player">
  <video ref={videoRef} src={videoUrl} />
  <canvas 
    ref={canvasRef}
    className="drawing-overlay"
    width={1000}
    height={562.5}
  />
  <div className="controls-primary">...</div>
  <div className="controls-drawing">...</div>
</div>
```

### 2. 帧同步

```javascript
// 监听视频时间变化，同步显示对应帧的绘画
video.addEventListener('timeupdate', () => {
  const currentFrame = Math.floor(video.currentTime * FPS);
  renderFrameDrawings(currentFrame);
});
```

### 3. 绘画持久化

```javascript
// IndexedDB 存储
const db = await openDB('CKAnimAnnotations', 1, {
  upgrade(db) {
    db.createObjectStore('drawings', { keyPath: 'id' });
  }
});

// 保存
await db.put('drawings', drawingData);

// 加载
const drawings = await db.getAll('drawings');
```

---

## 📋 开发任务清单

### P0 - 核心功能

- [ ] 基础播放器控制（播放/暂停/进度条）
- [ ] 画板总开关（展开/收起）
- [ ] 逐帧控制（上一帧/下一帧）
- [ ] 保存此帧截图
- [ ] 画笔工具（单帧/全程）
- [ ] 橡皮擦工具
- [ ] 撤销/重做

### P1 - 增强功能

- [ ] 画笔粗细选择器
- [ ] 画笔颜色选择器
- [ ] 文本工具
- [ ] 绘画可见性开关
- [ ] 清除全部（带确认）
- [ ] 保存绘画到本地

### P2 - 高级功能

- [ ] 快捷键支持
- [ ] 绘画数据持久化（IndexedDB）
- [ ] 导入绘画数据
- [ ] 倍速播放
- [ ] 导出视频 + 绘画

---

## 🎯 验收标准

### 功能验收

1. ✅ 画板默认关闭，点击"画板"按钮展开
2. ✅ 上一帧/下一帧精确控制（30fps）
3. ✅ 保存此帧下载 PNG 图片
4. ✅ 单帧绘画仅在当前帧显示
5. ✅ 全程绘画在所有帧显示
6. ✅ 撤销/重做功能正常
7. ✅ 保存绘画数据为 JSON 文件

### 性能验收

1. ✅ 逐帧播放无卡顿
2. ✅ 绘画延迟 < 50ms
3. ✅ 支持 1000+ 绘画路径
4. ✅ 内存占用 < 200MB

### 兼容性验收

1. ✅ Chrome 90+
2. ✅ Firefox 88+
3. ✅ Safari 14+
4. ✅ Edge 90+

---

## 📝 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-03-19 | v1.0 | 初始设计文档 | 阿米大王 |
| 2026-03-19 | v1.1 | 实现基础播放器 UI + 画板功能 | 波波 |

---

## ✅ 实现进度

### 已完成 (2026-03-19)

- [x] **基础播放器组件创建** - `VideoPlayerEnhanced.jsx` (430 行)
- [x] **样式文件创建** - `VideoPlayerEnhanced.css` (180 行)
- [x] **双层控制栏布局** - 第一层（播放控制）+ 第二层（画板工具）
- [x] **画板总开关** - 默认关闭，点击"画板"按钮展开
- [x] **基础播放控制** - 播放/暂停、进度条、时间显示
- [x] **逐帧控制** - 上一帧/下一帧按钮
- [x] **截图功能** - 保存当前帧为 PNG
- [x] **绘画工具** - 单帧画笔、全程画笔
- [x] **橡皮擦工具** - 切换擦除模式
- [x] **文本工具** - 添加文字标注
- [x] **撤销/重做** - Ctrl+Z / Ctrl+Y
- [x] **清除全部** - 带确认对话框
- [x] **保存绘画到本地** - JSON 格式导出
- [x] **画笔设置** - 粗细、颜色（弹窗输入）
- [x] **可见性开关** - 显示/隐藏绘画
- [x] **快捷键支持** - ←→、S、H、Esc 等
- [x] **集成到 Games.jsx** - 替换旧播放器
- [x] **Canvas 叠加层** - 支持绘画
- [x] **帧同步渲染** - 根据视频时间显示对应帧的绘画

### 待优化

- [ ] **画笔粗细选择器** - 改用滑块而非弹窗
- [ ] **画笔颜色选择器** - 改用颜色选择器而非弹窗
- [ ] **绘画数据持久化** - IndexedDB 存储
- [ ] **导入绘画数据** - 加载 JSON 文件
- [ ] **倍速播放** - 倍速按钮功能
- [ ] **路径平滑** - 改进绘画质量
- [ ] **触摸支持** - 平板/手机适配

---

## 🔗 相关资源

- [HTML5 Canvas API](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API)
- [Video Frame Extraction](https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLVideoElement)
- [IndexedDB](https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API)
- [Fabric.js](http://fabricjs.com/) - Canvas 库（可选）

---

**文档状态**: 📋 待开发  
**优先级**: P0  
**预计工时**: 5-7 天
