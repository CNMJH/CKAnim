import { useState, useRef, useEffect, useCallback } from 'react';
import './VideoPlayerEnhanced.css';

// 假设视频 30fps
const FRAME_DURATION = 1 / 30;

function VideoPlayerEnhanced({ videoUrl, videoTitle }) {
  // 基础播放状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // 画板状态
  const [isDrawingBoardOpen, setIsDrawingBoardOpen] = useState(false);
  const [currentTool, setCurrentTool] = useState('brush'); // brush, eraser, text
  const [brushType, setBrushType] = useState('single'); // single (单帧), permanent (全程)
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#FF0000');
  const [showDrawing, setShowDrawing] = useState(true);
  const [showBrushSizeSlider, setShowBrushSizeSlider] = useState(false); // 画笔粗细滑条显示
  const [showColorPicker, setShowColorPicker] = useState(false); // 颜色选择器显示
  
  // 文本编辑状态
  const [isEditingText, setIsEditingText] = useState(false);
  const [editingText, setEditingText] = useState('');
  const [editingPos, setEditingPos] = useState({ x: 0, y: 0 });
  const [textRotation, setTextRotation] = useState(0); // 文字旋转角度
  const [selectedDrawing, setSelectedDrawing] = useState(null); // 当前选中的绘画（用于编辑）
  
  // Canvas 相关
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState(null);
  const [currentPath, setCurrentPath] = useState([]); // 当前正在画的路径
  
  // 绘画数据
  const [drawings, setDrawings] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // 获取当前绘画状态描述
  const getHistoryStatus = () => {
    if (history.length === 0) return '无历史记录';
    if (historyIndex === -1) return '已撤销到初始状态';
    return `第 ${historyIndex + 1} 步 / 共 ${history.length} 步`;
  };
  
  // 加载视频元数据
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setCurrentTime(0);
      setProgress(0);
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
      
      // 根据当前时间渲染对应帧的绘画
      if (canvasRef.current) {
        renderCurrentFrameDrawings(video.currentTime);
      }
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoUrl]);
  
  // 渲染单个绘画
  const renderDrawing = (ctx, drawing) => {
    if (drawing.tool === 'brush') {
      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = drawing.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      drawing.paths.forEach(path => {
        if (!path.points || path.points.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(path.points[0].x, path.points[0].y);
        
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        
        ctx.stroke();
      });
    } else if (drawing.tool === 'text' && drawing.text) {
      ctx.save(); // 保存当前状态
      
      // 移动到文字位置
      ctx.translate(drawing.position.x, drawing.position.y);
      
      // 旋转
      if (drawing.rotation) {
        ctx.rotate((drawing.rotation * Math.PI) / 180);
      }
      
      // 绘制文字
      ctx.font = `bold ${drawing.size * 3}px Arial`;
      ctx.fillStyle = drawing.color;
      ctx.textBaseline = 'top';
      ctx.fillText(drawing.text, 0, 0);
      
      ctx.restore(); // 恢复状态
    }
  };

    // 渲染当前帧的绘画
  const renderCurrentFrameDrawings = useCallback((time) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!showDrawing) return;
    
    const currentFrame = Math.floor(time * 30); // 30fps
    
    // 渲染全程绘画（所有帧都显示）
    const permanentDrawings = drawings.filter(d => d.type === 'permanent');
    permanentDrawings.forEach(drawing => {
      renderDrawing(ctx, drawing);
    });
    
    // 渲染当前帧的单帧绘画
    const frameDrawings = drawings.filter(d => 
      d.type === 'single' && d.frameIndex === currentFrame
    );
    frameDrawings.forEach(drawing => {
      renderDrawing(ctx, drawing);
    });
  }, [drawings, showDrawing,]);
  
  
  // 监听帧变化，重新渲染
  const [lastFrame, setLastFrame] = useState(-1);
  
  useEffect(() => {
    const currentFrame = Math.floor(currentTime * 30);
    if (currentFrame !== lastFrame) {
      setLastFrame(currentFrame);
      // 直接使用 renderCurrentFrameDrawings，确保使用最新的 drawings
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!showDrawing) return;
      
      // 渲染全程绘画（所有帧都显示）
      const permanentDrawings = drawings.filter(d => d.type === 'permanent');
      permanentDrawings.forEach(drawing => {
        renderDrawing(ctx, drawing);
      });
      
      // 渲染当前帧的单帧绘画
      const frameDrawings = drawings.filter(d => 
        d.type === 'single' && d.frameIndex === currentFrame
      );
      frameDrawings.forEach(drawing => {
        renderDrawing(ctx, drawing);
      });
    }
  }, [currentTime, lastFrame, drawings, showDrawing]);
  
  // 监听 drawings 变化（撤销/重做时），重新渲染 Canvas
  useEffect(() => {
    if (canvasRef.current && videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const currentFrame = Math.floor(currentTime * 30);
      setLastFrame(currentFrame);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!showDrawing) return;
      
      // 渲染全程绘画
      const permanentDrawings = drawings.filter(d => d.type === 'permanent');
      permanentDrawings.forEach(drawing => {
        renderDrawing(ctx, drawing);
      });
      
      // 渲染当前帧的单帧绘画
      const frameDrawings = drawings.filter(d => 
        d.type === 'single' && d.frameIndex === currentFrame
      );
      frameDrawings.forEach(drawing => {
        renderDrawing(ctx, drawing);
      });
    }
  }, [drawings, showDrawing]);
  
  // 播放控制
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleProgressChange = (e) => {
    const video = videoRef.current;
    if (!video) return;
    
    const newProgress = parseFloat(e.target.value);
    setProgress(newProgress);
    video.currentTime = (newProgress / 100) * duration;
  };
  
  // 逐帧控制
  const previousFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = Math.max(0, video.currentTime - FRAME_DURATION);
  };
  
  const nextFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = Math.min(duration, video.currentTime + FRAME_DURATION);
  };
  
  // Canvas 绘画事件
  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };
  
  const startDrawing = (e) => {
    if (!isDrawingBoardOpen) return;
    
    const pos = getCanvasCoordinates(e);
    
    // 检测是否点击了已有文本（用于编辑）
    if (currentTool === 'text' && !isEditingText) {
      const clickedText = drawings.find(d => {
        if (d.tool !== 'text' || !d.text) return false;
        
        // 简单的碰撞检测（假设文字宽度约为字符数 * 字号）
        const textWidth = d.text.length * d.size * 2;
        const textHeight = d.size * 3;
        
        return pos.x >= d.position.x && 
               pos.x <= d.position.x + textWidth &&
               pos.y >= d.position.y && 
               pos.y <= d.position.y + textHeight;
      });
      
      if (clickedText) {
        // 编辑已有文本
        editExistingText(clickedText);
        setIsDrawing(false);
        return;
      }
    }
    
    setIsDrawing(true);
    setLastPos(pos);
    setCurrentPath([pos]); // 开始新路径
    
    // 橡皮擦工具 - 擦除最近的笔画
    if (currentTool === 'eraser') {
      if (drawings.length > 0) {
        // 删除最后一个绘画
        const newDrawings = drawings.slice(0, -1);
        setDrawings(newDrawings);
        addToHistory(newDrawings);
      }
      setIsDrawing(false);
      return;
    }
    
    // 文本工具 - 显示输入框（新文本）
    if (currentTool === 'text') {
      setIsEditingText(true);
      setEditingPos(pos);
      setEditingText('');
      setTextRotation(0);
      setSelectedDrawing(null);
      setIsDrawing(false);
      return;
    }
  };
  
  const draw = (e) => {
    if (!isDrawing || currentTool === 'text') return;
    
    const pos = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // 保存路径点
    setCurrentPath(prev => [...prev, pos]);
    
    // 实时绘制（在 Canvas 上直接画）
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    setLastPos(pos);
  };
  
  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // 保存完整路径数据
    if (currentPath.length > 0) {
      const newDrawing = {
        id: Date.now(),
        type: brushType,
        frameIndex: Math.floor(videoRef.current.currentTime * 30),
        tool: 'brush',
        color: brushColor,
        size: brushSize,
        paths: [{ points: currentPath }], // 保存完整路径
        timestamp: Date.now()
      };
      
      const newDrawings = [...drawings, newDrawing];
      setDrawings(newDrawings);
      addToHistory(newDrawings);
    }
    
    setCurrentPath([]); // 清空当前路径
  };
  
  // 历史记录
  const addToHistory = (newDrawings) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newDrawings]); // 深拷贝
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };
  
  // 文本编辑功能
  const confirmText = () => {
    if (!editingText.trim()) {
      setIsEditingText(false);
      return;
    }
    
    if (selectedDrawing) {
      // 更新已有文本
      updateExistingText();
    } else {
      // 创建新文本
      const newDrawing = {
        id: Date.now(),
        type: brushType,
        frameIndex: Math.floor(videoRef.current.currentTime * 30),
        tool: 'text',
        color: brushColor,
        size: brushSize,
        text: editingText,
        position: editingPos,
        rotation: textRotation,
        timestamp: Date.now()
      };
      
      const newDrawings = [...drawings, newDrawing];
      setDrawings(newDrawings);
      addToHistory(newDrawings);
      setIsEditingText(false);
    }
  };
  
  const cancelText = () => {
    setIsEditingText(false);
    setEditingText('');
  };
  
  // 编辑已有文本
  const editExistingText = (drawing) => {
    if (drawing.tool !== 'text') return;
    
    setCurrentTool('text');
    setIsEditingText(true);
    setEditingText(drawing.text);
    setEditingPos(drawing.position);
    setTextRotation(drawing.rotation || 0);
    setSelectedDrawing(drawing);
  };
  
  // 更新已有文本
  const updateExistingText = () => {
    if (!selectedDrawing || !editingText.trim()) {
      setIsEditingText(false);
      return;
    }
    
    const updatedDrawing = {
      ...selectedDrawing,
      text: editingText,
      color: brushColor,
      size: brushSize,
      rotation: textRotation,
      position: editingPos
    };
    
    const newDrawings = drawings.map(d => 
      d.id === selectedDrawing.id ? updatedDrawing : d
    );
    setDrawings(newDrawings);
    addToHistory(newDrawings);
    setIsEditingText(false);
    setSelectedDrawing(null);
  };
  
  const undo = () => {
    if (history.length === 0) return;
    
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setDrawings([...history[newIndex]]); // 深拷贝
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setDrawings([]);
    }
  };
  
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setDrawings([...history[newIndex]]); // 深拷贝
    }
  };
  
  const clearAll = () => {
    if (window.confirm('确定要清除所有绘画吗？')) {
      setDrawings([]);
      setHistory([]);
      setHistoryIndex(-1);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
  
  // 保存当前帧为带绘画的图片
  const saveDrawings = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    
    // 创建临时 canvas 合并视频帧和绘画
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth || 1000;
    tempCanvas.height = video.videoHeight || 562.5;
    const ctx = tempCanvas.getContext('2d');
    
    try {
      // 1. 绘制当前视频帧
      ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
      
      // 2. 绘制所有绘画内容
      const currentFrame = Math.floor(video.currentTime * 30);
      
      // 绘制全程绘画
      const permanentDrawings = drawings.filter(d => d.type === 'permanent');
      permanentDrawings.forEach(drawing => {
        renderDrawingToCanvas(ctx, drawing);
      });
      
      // 绘制当前帧的单帧绘画
      const frameDrawings = drawings.filter(d => 
        d.type === 'single' && d.frameIndex === currentFrame
      );
      frameDrawings.forEach(drawing => {
        renderDrawingToCanvas(ctx, drawing);
      });
      
      // 3. 保存为 PNG 图片 - 自动下载到浏览器默认路径
      tempCanvas.toBlob((blob) => {
        if (!blob) return;
        
        const link = document.createElement('a');
        link.download = `frame_with_drawing_${Date.now()}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        
        // 清理 URL
        setTimeout(() => {
          URL.revokeObjectURL(link.href);
        }, 100);
      }, 'image/png');
      
    } catch (error) {
      console.error('保存失败:', error);
    }
  };
  
  // 渲染绘画到 Canvas（用于保存）
  const renderDrawingToCanvas = (ctx, drawing) => {
    if (drawing.tool === 'brush') {
      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = drawing.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      drawing.paths.forEach(path => {
        if (!path.points || path.points.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(path.points[0].x, path.points[0].y);
        
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        
        ctx.stroke();
      });
    } else if (drawing.tool === 'text' && drawing.text) {
      ctx.font = `${drawing.size * 3}px Arial`;
      ctx.fillStyle = drawing.color;
      ctx.fillText(drawing.text, drawing.position.x, drawing.position.y);
    }
  };
  
  // 快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isDrawingBoardOpen) return;
      
      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          previousFrame();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextFrame();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          saveDrawings(); // 保存当前帧为 PNG 图片（带绘画）
          break;
        case 'z':
          if (e.ctrlKey) {
            e.preventDefault();
            undo();
          }
          break;
        case 'y':
          if (e.ctrlKey) {
            e.preventDefault();
            redo();
          }
          break;
        case 'h':
          e.preventDefault();
          setShowDrawing(!showDrawing);
          break;
        case 'Escape':
          setIsDrawingBoardOpen(false);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawingBoardOpen, showDrawing]);
  
  // 格式化时间
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="video-player-enhanced">
      {/* 视频区域 */}
      <div className="video-container">
        <div className="version-tag">[播放器 v1.0]</div>
        <video
          ref={videoRef}
          src={videoUrl}
          className="video-element"
          loop
          playsInline
          crossOrigin="anonymous"
          onClick={togglePlay}
        />
        <canvas
          ref={canvasRef}
          className="drawing-overlay"
          width={1000}
          height={562.5}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          style={{ display: showDrawing ? 'block' : 'none' }}
        />
        
        {/* 文本编辑输入框 */}
        {isEditingText && (
          <div
            className="text-editor-overlay"
            style={{
              left: editingPos.x,
              top: editingPos.y,
            }}
          >
            <textarea
              className="text-editor-input"
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              placeholder="输入文字..."
              autoFocus
              style={{
                color: brushColor,
                fontSize: `${brushSize * 3}px`,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  confirmText();
                } else if (e.key === 'Escape') {
                  cancelText();
                }
              }}
            />
            <div className="text-editor-controls">
              <button className="text-editor-btn" onClick={confirmText} title="确认 (Ctrl+Enter)">
                ✓
              </button>
              <button className="text-editor-btn cancel" onClick={cancelText} title="取消 (Esc)">
                ✕
              </button>
              <input
                type="range"
                className="text-rotation-slider"
                min="0"
                max="360"
                value={textRotation}
                onChange={(e) => setTextRotation(Number(e.target.value))}
                title="旋转角度"
              />
              <span className="text-rotation-value">{textRotation}°</span>
            </div>
          </div>
        )}
      </div>
      
      {/* 第一层控制栏 - 始终显示 */}
      <div className="controls-bar-primary">
        <button className="play-btn" onClick={togglePlay}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <div className="time-display">
          {formatTime(currentTime)} / {formatTime(duration || 0)}
        </div>
        <input
          type="range"
          className="progress-slider"
          min="0"
          max="100"
          value={progress}
          onChange={handleProgressChange}
        />
        <button 
          className={`control-btn text-btn ${isDrawingBoardOpen ? 'active' : ''}`}
          onClick={() => setIsDrawingBoardOpen(!isDrawingBoardOpen)}
        >
          画板
        </button>
        <button className="control-btn text-btn">
          倍速
        </button>
      </div>
      
      {/* 第二层控制栏 - 画板开启后显示 */}
      {isDrawingBoardOpen && (
        <div className="controls-bar-drawing">
          {/* 逐帧控制 */}
          <button className="control-btn" onClick={previousFrame} title="上一帧 (←)">
            上一帧
          </button>
          <button className="control-btn" onClick={nextFrame} title="下一帧 (→)">
            下一帧
          </button>
          
          <div className="separator"></div>
          
          {/* 绘画工具 */}
          <button 
            className={`control-btn icon-btn ${showDrawing ? 'active' : ''}`}
            onClick={() => setShowDrawing(!showDrawing)}
            title="绘画内容总可视开关 (H)"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="white" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
          </button>
          
          <button 
            className={`control-btn icon-btn ${showBrushSizeSlider ? 'active' : ''}`}
            onClick={() => setShowBrushSizeSlider(!showBrushSizeSlider)}
            title="画笔粗细设置"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" style={{
              transform: `scale(${Math.max(0.3, Math.min(1, brushSize / 50))})`,
              transition: 'transform 0.1s',
            }}>
              <circle cx="12" cy="12" r="10" fill="white" />
            </svg>
          </button>
          
          {/* 画笔粗细滑条 */}
          {showBrushSizeSlider && (
            <div className="brush-size-slider-container">
              <input
                type="range"
                className="brush-size-slider"
                min="1"
                max="50"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
              />
              <span className="brush-size-value">{brushSize}px</span>
            </div>
          )}
          
          <button 
            className="control-btn icon-btn color-btn"
            onClick={() => setShowColorPicker(!showColorPicker)}
            style={{ backgroundColor: brushColor }}
            title="画笔颜色设置"
          />
          
          {/* 颜色选择器 */}
          {showColorPicker && (
            <div className="color-picker-container">
              <input
                type="color"
                className="color-picker"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
              />
              <span className="color-value">{brushColor}</span>
            </div>
          )}
          
          <button 
            className={`control-btn icon-btn ${brushType === 'permanent' && currentTool === 'brush' ? 'active' : ''}`}
            onClick={() => { setBrushType('permanent'); setCurrentTool('brush'); }}
            title="画笔（全程）- 类似水印，全程显示"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="white" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
          
          <button 
            className={`control-btn icon-btn ${brushType === 'single' && currentTool === 'brush' ? 'active' : ''}`}
            onClick={() => { setBrushType('single'); setCurrentTool('brush'); }}
            title="画笔（单帧）- 仅当前帧显示"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="white" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
          </button>
          
          <button 
            className={`control-btn icon-btn ${currentTool === 'eraser' ? 'active' : ''}`}
            onClick={() => setCurrentTool('eraser')}
            title="橡皮擦 - 点击擦除最后一笔"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="white" d="M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 0 1-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l10.6-10.6c.79-.78 2.05-.78 2.83 0zM4.22 15.58l3.54 3.53c.78.79 2.04.79 2.83 0l8.48-8.48-6.37-6.37L4.22 15.58z"/>
            </svg>
          </button>
          
          <button 
            className={`control-btn icon-btn ${currentTool === 'text' ? 'active' : ''}`}
            onClick={() => setCurrentTool('text')}
            title="文本工具"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="white" d="M5 4v3h5v12h3V7h5V4H5z"/>
            </svg>
          </button>
          
          <button 
            className="control-btn icon-btn" 
            onClick={undo} 
            disabled={historyIndex === -1}
            title={`上一步 (Ctrl+Z) - ${getHistoryStatus()}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="white" d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
            </svg>
          </button>
          
          <button 
            className="control-btn icon-btn" 
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title={`下一步 (Ctrl+Y) - ${getHistoryStatus()}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="white" d="M18.4 10.6C16.55 9 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/>
            </svg>
          </button>
          
          <button className="control-btn icon-btn" onClick={clearAll} title="清除全部">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="white" d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/>
            </svg>
          </button>
          
          <button 
            className="control-btn icon-btn save-btn"
            onClick={saveDrawings}
            title="保存当前帧为 PNG 图片（带绘画内容）"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="white" d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoPlayerEnhanced;
