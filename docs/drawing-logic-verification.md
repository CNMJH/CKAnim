# 绘画功能逻辑验证

## 用户需求

### 1. 单帧绘画（single）
- ✅ 在 X 帧绘画后，内容永远存在于 X 帧
- ✅ 切帧（按钮/键盘）再切回来，内容应该显示
- ✅ 播放视频到 X 帧时，应该显示 X 帧的绘画
- ✅ 刷新网页或点击清理按钮才会移除

### 2. 常驻绘画（permanent）
- ✅ 绘画内容在所有帧都显示（类似水印）
- ✅ 无论怎么切帧，内容永远显示
- ✅ 刷新网页或点击清理按钮才会移除

### 3. 橡皮擦
- ⚠️ 当前实现：删除最后一个绘画（不分类型）
- 用户期望：可以同时擦除两个图层的绘画内容

---

## 当前代码逻辑

### 绘画保存
```javascript
const newDrawing = {
  id: Date.now(),
  type: brushType,  // 'single' 或 'permanent'
  frameIndex: currentFrame,  // 当前帧索引
  tool: 'brush',
  color: brushColor,
  size: brushSize,
  paths: [{ points: currentPath }],
  timestamp: Date.now()
};
```

### 渲染逻辑
```javascript
// 1. 渲染所有 permanent 绘画（所有帧都显示）
const permanentDrawings = drawingsRef.current.filter(d => d.type === 'permanent');
permanentDrawings.forEach(drawing => {
  renderDrawing(ctx, drawing);
});

// 2. 渲染当前帧的 single 绘画
const frameDrawings = drawingsRef.current.filter(d => 
  d.type === 'single' && d.frameIndex === currentFrame
);
frameDrawings.forEach(drawing => {
  renderDrawing(ctx, drawing);
});
```

### 橡皮擦逻辑
```javascript
if (currentTool === 'eraser') {
  if (drawings.length > 0) {
    // 删除最后一个绘画（不分类型）
    const newDrawings = drawings.slice(0, -1);
    setDrawings(newDrawings);
    addToHistory(newDrawings);
  }
  setIsDrawing(false);
  return;
}
```

---

## 问题诊断

### 之前的问题
1. ❌ drawingsRef 没有同步 → 始终为空数组
2. ❌ 切帧后绘画不显示

### 已修复
1. ✅ 添加了 drawingsRef 同步 useEffect
2. ✅ 统一帧索引计算（全部使用 getCurrentFrame）
3. ✅ 删除冗余 useEffect，单一渲染入口

---

## 待确认问题

### 橡皮擦行为
当前橡皮擦删除的是 `drawings` 数组的最后一个元素，这意味着：
- 如果用户在 frame 5 画了第 1 笔
- 然后切换到 frame 3 画了第 2 笔
- 在 frame 3 使用橡皮擦 → 删除的是 frame 3 的绘画 ✅
- 但如果 frame 3 没有绘画，橡皮擦会删除 frame 5 的绘画 ❌

**用户期望的橡皮擦行为**:
- 橡皮擦应该擦除"当前帧"的绘画（single 类型）
- 或者擦除"最近一次"的绘画（无论类型）
- 或者提供两种模式：擦除当前帧 / 擦除最近一笔

---

## 测试建议

### 测试 1: 单帧绘画持久性
1. 在第 5 帧画一笔（选择"单帧"模式）
2. 切换到第 3 帧
3. 切换回第 5 帧
4. 预期：第 5 帧的绘画应该显示 ✅

### 测试 2: 常驻绘画持久性
1. 选择"常驻"模式，在第 5 帧画一笔
2. 切换到第 3 帧
3. 预期：第 3 帧也能看到第 5 帧的常驻绘画 ✅
4. 切换回第 5 帧
5. 预期：第 5 帧的常驻绘画仍然显示 ✅

### 测试 3: 视频播放
1. 在第 5、10、15 帧分别画一笔（单帧模式）
2. 从第 0 帧开始播放视频
3. 预期：视频播放到第 5、10、15 帧时，对应绘画应该显示 ✅

### 测试 4: 橡皮擦
1. 在第 5 帧画一笔
2. 切换到第 3 帧
3. 使用橡皮擦点击
4. 当前行为：删除最后一个绘画（可能是第 5 帧的）
5. 用户期望：？？？（需要确认）

---

## 橡皮擦改进建议

### 方案 A: 擦除当前帧的绘画
```javascript
if (currentTool === 'eraser') {
  const currentFrame = getCurrentFrame(video.currentTime);
  // 删除当前帧的最后一个 single 绘画
  const newDrawings = drawings.filter((d, index) => {
    if (d.type === 'single' && d.frameIndex === currentFrame) {
      // 是当前帧的绘画，删除最后一个
      return index !== drawings.length - 1;
    }
    return true; // 保留其他帧的绘画
  });
  setDrawings(newDrawings);
}
```

### 方案 B: 擦除最近一笔（不分帧）
当前实现，保持现状。

### 方案 C: 橡皮擦也分单帧/常驻模式
- 单帧模式：只擦除当前帧的绘画
- 常驻模式：擦除所有 permanent 绘画

---

## 结论

核心绘画逻辑是正确的：
- ✅ 单帧绘画绑定到特定帧
- ✅ 常驻绘画在所有帧显示
- ✅ drawingsRef 同步问题已修复

橡皮擦行为可能需要根据用户期望调整。
