# 绘画丢帧问题分析报告

## 问题描述

用户在每一帧都画了图，但播放视频时，有的帧的图案不会显示，出现丢帧现象。

## 根本原因分析

### 原因 1: timeupdate 事件触发频率不足 ⭐⭐⭐

**问题**:
```javascript
video.addEventListener('timeupdate', handleTimeUpdate);

const handleTimeUpdate = () => {
  setCurrentTime(video.currentTime);
  // 渲染当前帧的绘画
  renderCurrentFrameDrawings(video.currentTime);
};
```

**浏览器限制**:
- `timeupdate` 事件触发频率：**10-15 Hz**（每秒 10-15 次）
- 视频帧率：**30 fps**（每秒 30 帧）
- **覆盖率只有 33%-50%**！

**丢帧场景**:
```
视频时间轴 (30fps, 总 3 秒 = 90 帧):
0.00s 0.03s 0.07s 0.10s 0.13s 0.17s 0.20s 0.23s 0.27s 0.30s ...
  ↑     ↑           ↑           ↑           ↑
timeupdate 触发点 (10Hz)

帧索引计算:
frame = floor(time * 30)
0.00s → frame 0   ✅ 渲染
0.03s → frame 0   (重复，不渲染)
0.07s → frame 2   ✅ 渲染
0.10s → frame 3   ✅ 渲染
0.13s → frame 3   (重复)
0.17s → frame 5   ✅ 渲染
...

结果：frame 1, 4, 6, 7, 8... 被跳过！❌
```

### 原因 2: currentTime 状态更新延迟 ⭐⭐

**问题**:
```javascript
const handleTimeUpdate = () => {
  setCurrentTime(video.currentTime);  // ⚠️ React 状态更新是异步的
  
  // 立即使用 currentTime 渲染
  renderCurrentFrameDrawings(video.currentTime);
};

// 监听帧变化的 useEffect
useEffect(() => {
  const currentFrame = Math.floor(currentTime * 30);  // ⚠️ 使用可能过时的 currentTime
  if (currentFrame !== lastFrame) {
    // 渲染...
  }
}, [currentTime, lastFrame, drawings, showDrawing]);
```

**延迟问题**:
- `setCurrentTime()` 是异步的
- useEffect 依赖的 `currentTime` 可能不是最新值
- 导致某些帧的渲染被跳过

### 原因 3: 帧索引计算精度问题 ⭐

**问题**:
```javascript
const currentFrame = Math.floor(time * 30);
```

**浮点数精度**:
```
0.0333... * 30 = 0.999... → floor = 0  (期望 frame 1)
0.0666... * 30 = 1.999... → floor = 1  (期望 frame 2)
0.1000... * 30 = 3.000... → floor = 3  (frame 2 被跳过！)

实际视频帧边界:
frame 0: 0.000s - 0.033s
frame 1: 0.033s - 0.067s
frame 2: 0.067s - 0.100s
frame 3: 0.100s - 0.133s

timeupdate 触发点可能刚好错过某些帧的时间窗口！
```

### 原因 4: 渲染逻辑重复但不同步 ⭐⭐

**问题**:
```javascript
// 渲染逻辑 1: timeupdate 事件
video.addEventListener('timeupdate', () => {
  renderCurrentFrameDrawings(video.currentTime);
});

// 渲染逻辑 2: currentTime 状态变化
useEffect(() => {
  const currentFrame = Math.floor(currentTime * 30);
  if (currentFrame !== lastFrame) {
    // 手动渲染...
  }
}, [currentTime, lastFrame]);

// 渲染逻辑 3: drawings 状态变化
useEffect(() => {
  // 重新渲染...
}, [drawings]);
```

**同步问题**:
- 三个渲染逻辑可能互相冲突
- 某些情况下会覆盖彼此的渲染结果
- 导致某些帧的绘画被清空但未重新绘制

## 解决方案

### 方案 1: 使用 requestAnimationFrame 替代 timeupdate ⭐⭐⭐

**原理**:
- `requestAnimationFrame` 与浏览器刷新率同步（通常 60fps）
- 可以每帧都检查并渲染

**实现**:
```javascript
useEffect(() => {
  let animationFrameId;
  
  const renderLoop = () => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended) return;
    
    const currentFrame = Math.floor(video.currentTime * 30);
    if (currentFrame !== lastFrameRef.current) {
      lastFrameRef.current = currentFrame;
      
      // 渲染当前帧绘画
      renderCurrentFrameDrawings(video.currentTime);
    }
    
    animationFrameId = requestAnimationFrame(renderLoop);
  };
  
  renderLoop();
  
  return () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}, []);
```

**优势**:
- 渲染频率提升到 60fps
- 与视频播放完全同步
- 不会错过任何帧

### 方案 2: 优化帧索引计算 ⭐⭐

**实现**:
```javascript
const getFrameIndex = (time) => {
  // 使用四舍五入而非向下取整
  return Math.round(time * 30);
};

// 或者添加容差
const getFrameIndex = (time) => {
  return Math.floor(time * 30 + 0.001);  // 添加微小偏移
};
```

### 方案 3: 统一渲染逻辑 ⭐⭐

**实现**:
```javascript
// 只保留一个渲染入口
const renderFrame = useCallback(() => {
  const video = videoRef.current;
  if (!video) return;
  
  const currentFrame = Math.round(video.currentTime * 30);
  
  // 检查是否需要重新渲染
  if (currentFrame === lastRenderedFrameRef.current) {
    return;  // 跳过重复渲染
  }
  lastRenderedFrameRef.current = currentFrame;
  
  // 渲染...
}, []);

// 统一使用 requestAnimationFrame 调用
useEffect(() => {
  let rafId;
  const loop = () => {
    renderFrame();
    rafId = requestAnimationFrame(loop);
  };
  loop();
  return () => cancelAnimationFrame(rafId);
}, []);
```

### 方案 4: 使用 video 的 seeked 事件 ⭐

**实现**:
```javascript
video.addEventListener('seeked', () => {
  // 用户拖动进度条后触发
  renderCurrentFrameDrawings(video.currentTime);
});

video.addEventListener('timeupdate', () => {
  // 正常播放时使用 requestAnimationFrame
});
```

## 推荐方案

**组合使用**:
1. **主渲染循环**: `requestAnimationFrame` (60fps)
2. **帧索引计算**: `Math.round()` 替代 `Math.floor()`
3. **统一渲染逻辑**: 只保留一个渲染入口
4. **特殊事件**: `seeked` 处理拖动进度条

## 预期效果

**修复前**:
```
90 帧视频 → 实际渲染 30-45 帧 → 丢失 45-60 帧 ❌
```

**修复后**:
```
90 帧视频 → 实际渲染 85-90 帧 → 丢失 0-5 帧 ✅
```

## 技术细节

### timeupdate vs requestAnimationFrame

| 特性 | timeupdate | requestAnimationFrame |
|------|-----------|---------------------|
| 触发频率 | 10-15 Hz | 60 Hz (显示器刷新率) |
| 与视频同步 | 不同步 | 完全同步 |
| 性能开销 | 低 | 中 |
| 适用场景 | 进度条更新 | 动画/渲染 |

### 帧率计算公式

```javascript
// 30fps 视频
帧持续时间 = 1 / 30 = 0.0333... 秒

// 帧索引计算
frame = Math.round(currentTime * 30)

// 示例
0.000s → frame 0
0.033s → frame 1
0.067s → frame 2
0.100s → frame 3
```

## 测试验证

**测试步骤**:
1. 在视频的每一帧都画上不同的标记（如帧号）
2. 播放视频，录制屏幕
3. 逐帧检查录制的视频
4. 统计缺失的帧数

**预期结果**:
- 修复前：约 50% 的帧没有显示绘画
- 修复后：>95% 的帧显示绘画

## 参考链接

- [MDN: timeupdate event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/timeupdate_event)
- [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)
- [HTML5 Video 帧精确控制](https://dev.to/gtcrefr/html5-video-frame-accurate-control-3k7d)
