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
  }, [drawings, showDrawing, renderDrawing]);
  
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
  }, [currentTime, lastFrame, drawings, showDrawing, renderDrawing]);
  
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
  }, [drawings, showDrawing, renderDrawing]);
  
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
      ctx.font = `${drawing.size * 3}px Arial`;
      ctx.fillStyle = drawing.color;
      ctx.fillText(drawing.text, drawing.position.x, drawing.position.y);
    }
  };
  
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
    if (!isDrawingBoardOpen || currentTool === 'eraser') return;
    
    const pos = getCanvasCoordinates(e);
    setIsDrawing(true);
    setLastPos(pos);
    setCurrentPath([pos]); // 开始新路径
    
    // 如果是文本工具
    if (currentTool === 'text') {
      const text = prompt('请输入文字:');
      if (text) {
        const newDrawing = {
          id: Date.now(),
          type: brushType,
          frameIndex: Math.floor(videoRef.current.currentTime * 30),
          tool: 'text',
          color: brushColor,
          size: brushSize,
          text: text,
          position: pos,
          timestamp: Date.now()
        };
        
        const newDrawings = [...drawings, newDrawing];
        setDrawings(newDrawings);
        addToHistory(newDrawings);
      }
      setIsDrawing(false);
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
    
    // 3. 保存为 PNG 图片
    tempCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.download = `frame_with_drawing_${Date.now()}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      
      // 清理 URL
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
      }, 100);
    }, 'image/png');
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
            👁️
          </button>
          
          <button 
            className="control-btn icon-btn"
            onClick={() => {
              const size = prompt('画笔粗细 (1-50):', brushSize);
              if (size) setBrushSize(Math.max(1, Math.min(50, parseInt(size))));
            }}
            title="画笔粗细设置"
          >
            ●
          </button>
          
          <button 
            className="control-btn icon-btn color-btn"
            onClick={() => {
              const color = prompt('画笔颜色 (HEX):', brushColor);
              if (color) setBrushColor(color);
            }}
            style={{ backgroundColor: brushColor }}
            title="画笔颜色设置"
          />
          
          <button 
            className={`control-btn icon-btn ${brushType === 'permanent' && currentTool === 'brush' ? 'active' : ''}`}
            onClick={() => { setBrushType('permanent'); setCurrentTool('brush'); }}
            title="画笔（全程）- 类似水印，全程显示"
          >
            ✏️
          </button>
          
          <button 
            className={`control-btn icon-btn ${brushType === 'single' && currentTool === 'brush' ? 'active' : ''}`}
            onClick={() => { setBrushType('single'); setCurrentTool('brush'); }}
            title="画笔（单帧）- 仅当前帧显示"
          >
            🖊️
          </button>
          
          <button 
            className={`control-btn icon-btn ${currentTool === 'eraser' ? 'active' : ''}`}
            onClick={() => setCurrentTool('eraser')}
            title="橡皮擦"
          >
            🧹
          </button>
          
          <button 
            className={`control-btn icon-btn ${currentTool === 'text' ? 'active' : ''}`}
            onClick={() => setCurrentTool('text')}
            title="文本工具"
          >
            T
          </button>
          
          <button 
            className="control-btn icon-btn" 
            onClick={undo} 
            disabled={historyIndex === -1}
            title={`上一步 (Ctrl+Z) - ${getHistoryStatus()}`}
          >
            ↩️
          </button>
          
          <button 
            className="control-btn icon-btn" 
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title={`下一步 (Ctrl+Y) - ${getHistoryStatus()}`}
          >
            ↪️
          </button>
          
          <button className="control-btn icon-btn" onClick={clearAll} title="清除全部">
            🔄
          </button>
          
          <button 
            className="control-btn icon-btn save-btn"
            onClick={saveDrawings}
            title="保存当前帧为 PNG 图片（带绘画内容）"
          >
            💾
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoPlayerEnhanced;
