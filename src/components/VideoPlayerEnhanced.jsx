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
  
  // 绘画数据
  const [drawings, setDrawings] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
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
  }, [drawings, showDrawing]);
  
  // 渲染单个绘画
  const renderDrawing = (ctx, drawing) => {
    if (drawing.tool === 'brush') {
      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = drawing.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      drawing.paths.forEach(path => {
        if (path.points.length < 2) return;
        
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
  
  // 保存当前帧
  const saveCurrentFrame = () => {
    const video = videoRef.current;
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
    
    // 绘制线条
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
    
    // 保存绘画数据（简化版，实际应该保存路径）
    const newDrawing = {
      id: Date.now(),
      type: brushType,
      frameIndex: Math.floor(videoRef.current.currentTime * 30),
      tool: 'brush',
      color: brushColor,
      size: brushSize,
      paths: [{ points: [lastPos] }], // 简化
      timestamp: Date.now()
    };
    
    const newDrawings = [...drawings, newDrawing];
    setDrawings(newDrawings);
    addToHistory(newDrawings);
  };
  
  // 历史记录
  const addToHistory = (newDrawings) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newDrawings);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };
  
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setDrawings(history[historyIndex - 1]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setDrawings([]);
    }
  };
  
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setDrawings(history[historyIndex + 1]);
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
  
  // 保存绘画到本地
  const saveDrawings = (mode) => {
    const data = {
      videoId: 1, // TODO: 从 props 获取
      videoTitle: videoTitle || '未命名视频',
      exportedAt: new Date().toISOString(),
      drawings: mode === 'all' ? drawings : drawings.filter(d => 
        d.frameIndex === Math.floor(videoRef.current.currentTime * 30)
      )
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `annotations_${Date.now()}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
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
          saveCurrentFrame();
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
          
          {/* 截图功能 */}
          <button className="control-btn" onClick={saveCurrentFrame} title="保存此帧 (S)">
            保存此帧
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
          
          <button className="control-btn icon-btn" onClick={undo} title="上一步 (Ctrl+Z)">
            ↩️
          </button>
          
          <button className="control-btn icon-btn" onClick={redo} title="下一步 (Ctrl+Y)">
            ↪️
          </button>
          
          <button className="control-btn icon-btn" onClick={clearAll} title="清除全部">
            🔄
          </button>
          
          <button 
            className="control-btn icon-btn save-btn"
            onClick={() => {
              const mode = window.confirm('选择保存模式:\n确定 - 保存全部\n取消 - 仅保存当前帧');
              saveDrawings(mode ? 'all' : 'current');
            }}
            title="保存绘画标记到本地"
          >
            💾
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoPlayerEnhanced;
