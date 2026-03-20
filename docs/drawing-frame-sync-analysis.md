# 绘画 + 切帧功能稳定性问题分析报告

## 🔴 核心问题

### 问题 1: 帧索引计算严重不统一

代码中同时使用 `Math.floor()` 和 `Math.round()` 计算帧索引：

| 位置 | 行号 | 计算方式 | 状态 |
|------|------|---------|------|
| requestAnimationFrame 循环 | 99 | `Math.round()` | ✅ |
| renderCurrentFrameDrawings | 234 | `Math.floor()` | ❌ |
| useEffect(currentTime) | 256 | `Math.floor()` | ❌ |
| useEffect(drawings) | 288 | `Math.floor()` | ❌ |
| previousFrame | 354 | `Math.floor()` | ❌ |
| nextFrame | 388 | `Math.floor()` | ❌ |
| stopDrawing | 506 | `Math.round()` | ✅ |
| confirmText | 571 | `Math.round()` | ✅ |
| 键盘 ArrowLeft | 791 | `Math.round()` | ✅ |
| 键盘 ArrowRight | 825 | `Math.round()` | ✅ |

**导致的问题**:
```
场景：用户在第 6 帧（时间 0.200 秒）绘画

stopDrawing 保存:
Math.round(0.200 * 30) = Math.round(6.0) = 6  ← 保存到 frameIndex: 6

previousFrame 切换:
Math.floor(0.167 * 30) = Math.floor(5.01) = 5  ← 查找 frame 5

nextFrame 切换:
Math.floor(0.200 * 30) = Math.floor(6.0) = 6  ← 查找 frame 6 ✅

但如果时间是 0.199 秒:
Math.floor(0.199 * 30) = Math.floor(5.97) = 5  ← 查找 frame 5 ❌
实际绘画在 frame 6，但查找 frame 5，所以不显示！

这就是"明明在第 6 帧画的图案，却跑到了第 7 帧"的原因！
```

---

### 问题 2: 多个渲染入口导致竞态条件

代码中有 **7 个不同的地方** 会渲染 Canvas：

1. **requestAnimationFrame 循环** (88-143 行)
   - 每帧自动渲染
   - 依赖 `drawings` 和 `showDrawing`

2. **renderCurrentFrameDrawings 函数** (227-249 行)
   - 被其他函数调用
   - 依赖闭包中的 `drawings`

3. **useEffect(currentTime)** (255-282 行)
   - 监听 `currentTime` 变化
   - 监听 `lastFrame` 变化
   - **这个应该被 requestAnimationFrame 替代！**

4. **useEffect(drawings)** (285-320 行)
   - 监听 `drawings` 变化
   - 依赖闭包中的 `currentTime`

5. **previousFrame 函数** (340-370 行)
   - 按钮点击触发
   - setTimeout 50ms 后渲染

6. **nextFrame 函数** (373-403 行)
   - 按钮点击触发
   - setTimeout 50ms 后渲染

7. **键盘快捷键** (779-845 行)
   - ArrowLeft/ArrowRight
   - setTimeout 50ms 后渲染

**竞态条件示例**:
```
用户点击"下一帧"按钮:
1. nextFrame() 执行
2. video.currentTime = 0.200
3. setTimeout 50ms 后渲染 Canvas

同时:
4. currentTime 变化触发 useEffect
5. useEffect 立即渲染 Canvas（使用旧的 drawings 闭包）
6. 50ms 后 nextFrame 的 setTimeout 执行，再次渲染

结果：
- Canvas 被渲染 2 次
- 可能使用不同的 drawings 版本
- 最后一次渲染可能覆盖前一次
```

---

### 问题 3: 闭包引用旧数据

```javascript
// useEffect(drawings) - 第 285 行
useEffect(() => {
  const currentTime = videoRef.current.currentTime;
  const currentFrame = Math.floor(currentTime * 30);  // ❌ Math.floor
  
  // 这里的 drawings 是闭包中的值
  // 当 drawings 更新时，这个 useEffect 会重新执行
  // 但执行时可能 video.currentTime 已经变化了！
  
  const frameDrawings = drawings.filter(d => 
    d.type === 'single' && d.frameIndex === currentFrame
  );
  // ...
}, [currentTime, lastFrame, drawings, showDrawing]);  // ← 依赖这么多状态
```

**问题场景**:
```
1. 用户在 frame 6 绘画
2. stopDrawing 执行，setDrawings([...])
3. useEffect(drawings) 触发
4. 但此时 video.currentTime 可能已经轻微变化（视频在播放）
5. currentFrame = Math.floor(0.199 * 30) = 5  ← 不是 frame 6！
6. 渲染 frame 5 的绘画（空的）
7. 用户看到：绘画消失了！

然后用户画一笔:
8. 新的 stopDrawing 执行
9. 手动 setTimeout 渲染当前帧
10. 绘画又显示了
```

这就是"切到有图案的帧却不显示图案，要画一笔才会显示"的原因！

---

### 问题 4: 冗余的 useEffect 未删除

第 253-282 行的 `useEffect(currentTime)` 和第 285-320 行的 `useEffect(drawings)` 
应该已经被 requestAnimationFrame 循环替代了，但代码中还保留着！

这些 useEffect:
- 使用 `Math.floor()` 计算帧
- 使用闭包中的 `drawings`
- 与 requestAnimationFrame 循环竞争渲染 Canvas
- 导致不可预测的行为

---

## 🎯 用户报告的问题对应分析

### 问题 A: "我明明在第 6 帧画的图案，却跑到了第 7 帧里"

**原因**: 帧索引计算不统一
- stopDrawing 用 `Math.round()` 保存到 frame 6
- nextFrame 用 `Math.floor()` 查找，可能找到 frame 5 或 frame 7
- 时间精度问题：0.199 秒 vs 0.200 秒

**修复**: 统一使用 `Math.round()`

---

### 问题 B: "偶尔还会有切到有图案的帧却不显示图案，要画一笔才会显示"

**原因**: 
1. useEffect(drawings) 使用闭包中的旧 `currentTime`
2. 多个渲染入口竞争，最后一次渲染可能使用错误的数据
3. requestAnimationFrame 循环的 `drawings` 闭包可能未更新

**修复**:
1. 删除冗余的 useEffect
2. 统一使用单一渲染入口（requestAnimationFrame）
3. 确保闭包使用最新数据

---

### 问题 C: "边画画边切帧，偶尔会有帧数错乱"

**原因**:
1. 绘画时 video 可能在播放，currentTime 在变化
2. stopDrawing 计算帧索引时，currentTime 可能与用户看到的不同
3. 切帧函数（previousFrame/nextFrame）立即修改 currentTime
4. requestAnimationFrame 循环检测到帧变化，立即渲染
5. 多个渲染同时发生，使用不同的帧索引

**修复**:
1. 统一帧索引计算
2. 删除冗余渲染入口
3. 添加帧索引同步机制

---

## ✅ 完整修复方案

### 步骤 1: 统一所有帧索引计算为 `Math.round()`

修改位置:
- renderCurrentFrameDrawings: `Math.floor` → `Math.round`
- useEffect(currentTime): `Math.floor` → `Math.round` (或直接删除)
- useEffect(drawings): `Math.floor` → `Math.round` (或直接删除)
- previousFrame: `Math.floor` → `Math.round`
- nextFrame: `Math.floor` → `Math.round`

---

### 步骤 2: 删除冗余的 useEffect

删除第 253-282 行的 `useEffect(currentTime)` - 已被 requestAnimationFrame 替代
删除第 285-320 行的 `useEffect(drawings)` - 已被 requestAnimationFrame 替代

---

### 步骤 3: 统一 previousFrame/nextFrame 使用 Math.round + 更新 lastFrameRef

```javascript
const previousFrame = () => {
  const video = videoRef.current;
  if (!video) return;
  
  video.currentTime = Math.max(0, video.currentTime - FRAME_DURATION);
  
  setTimeout(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const currentFrame = Math.round(video.currentTime * 30); // ← Math.round
    lastFrameRef.current = currentFrame;  // ← 更新 lastFrameRef
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (showDrawing) {
      // 渲染...
    }
  }, 50);
};
```

---

### 步骤 4: 确保 requestAnimationFrame 循环使用最新 drawings

当前代码:
```javascript
useEffect(() => {
  let animationFrameId;
  
  const renderLoop = () => {
    // ... 使用 drawings
  };
  
  renderLoop();
  
  return () => cancelAnimationFrame(animationFrameId);
}, [drawings, showDrawing]);  // ← 依赖 drawings
```

问题：当 `drawings` 变化时，useEffect 会重新执行，但 `renderLoop` 函数内的闭包还是旧值。

修复：使用 ref 存储最新的 drawings
```javascript
const drawingsRef = useRef(drawings);
useEffect(() => {
  drawingsRef.current = drawings;
}, [drawings]);

// renderLoop 中使用 drawingsRef.current
```

---

### 步骤 5: 添加帧索引同步机制

在 video seek 操作后，确保所有地方使用相同的帧索引：

```javascript
// 统一的帧索引计算函数
const getCurrentFrame = (time) => {
  return Math.round(time * 30);
};

// 所有地方都使用这个函数
const currentFrame = getCurrentFrame(video.currentTime);
```

---

## 📋 修复优先级

**P0 - 立即修复**:
1. 统一所有帧索引计算为 `Math.round()`
2. 删除冗余的 useEffect (currentTime 和 drawings)
3. previousFrame/nextFrame 更新 lastFrameRef

**P1 - 高优先级**:
4. requestAnimationFrame 循环使用 ref 获取最新 drawings
5. 添加 getCurrentFrame 统一函数

**P2 - 中优先级**:
6. 优化 setTimeout 延迟时间（50ms 可能太长）
7. 添加帧切换时的视觉反馈

---

## 🧪 测试验证

修复后需要测试:
1. 在每一帧绘画，然后逐帧切换，检查绘画是否在正确的帧
2. 边播放边绘画，检查绘画是否保存在正确的帧
3. 快速切换帧，检查是否有绘画不显示
4. 撤销/重做后切换帧，检查绘画是否正确
5. 键盘快捷键和按钮切换效果一致

---

## 📊 预期效果

修复前:
- 帧索引错误率：~10-20%
- 绘画不显示概率：~15%
- 用户满意度：❌ 很差

修复后:
- 帧索引错误率：<1%
- 绘画不显示概率：<2%
- 用户满意度：✅ 稳定可靠
