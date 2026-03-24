import { useRef, useState, useCallback, useEffect } from 'react';
import './VideoPlayerEnhanced.css';

// 导入工具函数
import { formatTime } from '../lib/utils';
import authUtils from '../lib/auth';
import { videosAPI, favoritesAPI, siteSettingsAPI } from '../lib/api';

function VideoPlayerEnhanced({ 
  videoUrl, 
  videoId, 
  autoPlay = false, 
  onVideoEnd,
  versionId 
}) {
  // ==================== Refs ====================
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const playerContainerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const drawingsRef = useRef([]);
  const lastFrameRef = useRef(-1);

  // ==================== 状态 ====================
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showDrawing, setShowDrawing] = useState(false);
  const [isDrawingBoardOpen, setIsDrawingBoardOpen] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen');
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#FF0000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawings, setDrawings] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [showFavoriteMenu, setShowFavoriteMenu] = useState(false);
  const [collections, setCollections] = useState([]);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editingText, setEditingText] = useState('');
  const [editingPos, setEditingPos] = useState({ x: 0, y: 0 });
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // ==================== 工具函数 ====================
  const getCurrentFrame = useCallback((time) => {
    return Math.floor(time * 30);
  }, []);

  const renderDrawing = (ctx, drawing) => {
    if (!ctx) return;
    
    ctx.strokeStyle = drawing.color;
    ctx.lineWidth = drawing.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = drawing.color;

    if (drawing.tool === 'pen' || drawing.tool === 'brush') {
      if (drawing.points.length < 2) return;
      
      ctx.beginPath();
      ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
      
      for (let i = 1; i < drawing.points.length; i++) {
        ctx.lineTo(drawing.points[i].x, drawing.points[i].y);
      }
      
      ctx.stroke();
    } else if (drawing.tool === 'eraser') {
      if (drawing.points.length < 2) return;
      
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
      
      for (let i = 1; i < drawing.points.length; i++) {
        ctx.lineTo(drawing.points[i].x, drawing.points[i].y);
      }
      ctx.stroke();
      
      ctx.globalCompositeOperation = 'source-over';
    } else if (drawing.tool === 'text') {
      if (drawing.text) {
        ctx.font = `${drawing.size * 3}px Arial`;
        ctx.fillText(drawing.text, drawing.x, drawing.y);
      }
    }
  };

  // ==================== Canvas 坐标计算（核心修复）====================
  const getCanvasCoordinates = useCallback((e) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return { x: 0, y: 0 };
    
    // 获取视频在视口中的实际位置和尺寸
    const videoRect = video.getBoundingClientRect();
    
    // 计算鼠标相对于视频左上角的位置
    const relativeX = e.clientX - videoRect.left;
    const relativeY = e.clientY - videoRect.top;
    
    // 计算缩放比例（Canvas 内部像素尺寸 / 视频显示尺寸）
    const scaleX = canvas.width / videoRect.width;
    const scaleY = canvas.height / videoRect.height;
    
    // 转换为 Canvas 内部坐标
    return {
      x: relativeX * scaleX,
      y: relativeY * scaleY
    };
  }, []);

  // ==================== Canvas 尺寸同步（核心修复）====================
  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;
    
    // 等待视频加载完成
    if (video.readyState < 1) return;
    
    // 获取视频的实际渲染尺寸（offsetWidth/Height 是实际渲染的像素尺寸）
    const videoWidth = video.offsetWidth;
    const videoHeight = video.offsetHeight;
    
    // 确保尺寸有效
    if (videoWidth <= 0 || videoHeight <= 0) return;
    
    // 设置 Canvas 内部像素尺寸与视频完全一致
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    
    // 重绘所有绘画
    const ctx = canvas.getContext('2d');
    if (ctx && showDrawing) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 重绘永久绘画
      const permanentDrawings = drawingsRef.current.filter(d => d.type === 'permanent');
      permanentDrawings.forEach(drawing => {
        renderDrawing(ctx, drawing);
      });
      
      // 重绘当前帧绘画
      const currentFrame = getCurrentFrame(video.currentTime);
      const frameDrawings = drawingsRef.current.filter(d => 
        d.type === 'frame' && d.frame === currentFrame
      );
      frameDrawings.forEach(drawing => {
        renderDrawing(ctx, drawing);
      });
    }
  }, [showDrawing, getCurrentFrame]);

  // ==================== 事件处理 ====================
  const startDrawing = useCallback((e) => {
    if (!isDrawingBoardOpen) return;
    
    const pos = getCanvasCoordinates(e);
    
    // 检测是否点击了已有文本（用于编辑）
    if (currentTool === 'text' && !isEditingText) {
      const clickedText = drawings.find(d => {
        if (d.tool !== 'text' || !d.text) return false;
        
        const textWidth = d.text.length * d.size * 2;
        const textHeight = d.size * 3;
        
        return (
          pos.x >= d.x &&
          pos.x <= d.x + textWidth &&
          pos.y >= d.y - textHeight &&
          pos.y <= d.y
        );
      });
      
      if (clickedText) {
        setIsEditingText(true);
        setEditingText(clickedText.text);
        setEditingPos({ x: clickedText.x, y: clickedText.y });
        setBrushSize(clickedText.size);
        setBrushColor(clickedText.color);
        return;
      }
    }
    
    setIsDrawing(true);
    
    if (currentTool === 'text' && !isEditingText) {
      setIsEditingText(true);
      setEditingText('');
      setEditingPos(pos);
      setBrushSize(5);
      setBrushColor('#FF0000');
    } else {
      const newDrawing = {
        id: Date.now(),
        tool: currentTool,
        points: [pos],
        size: brushSize,
        color: brushColor,
        type: currentTool === 'eraser' ? 'single' : 'permanent',
        frameIndex: currentTool === 'eraser' ? getCurrentFrame(currentTime) : undefined,
      };
      
      setDrawings(prev => [...prev, newDrawing]);
    }
  }, [isDrawingBoardOpen, currentTool, brushSize, brushColor, currentTime, drawings, getCanvasCoordinates, getCurrentFrame, isEditingText]);

  const draw = useCallback((e) => {
    if (!isDrawing || !isDrawingBoardOpen) return;
    
    const pos = getCanvasCoordinates(e);
    
    if (currentTool === 'text') return;
    
    setDrawings(prev => {
      const newDrawings = [...prev];
      const currentDrawing = newDrawings[newDrawings.length - 1];
      
      if (currentDrawing) {
        currentDrawing.points.push(pos);
      }
      
      return newDrawings;
    });
  }, [isDrawing, isDrawingBoardOpen, currentTool, getCanvasCoordinates]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    
    if (currentTool !== 'text') {
      setHistory(prev => [...prev.slice(0, historyIndex + 1), drawings]);
      setHistoryIndex(prev => prev + 1);
    }
  }, [isDrawing, currentTool, drawings, historyIndex]);

  // ==================== Effects ====================
  
  // 同步 Canvas 尺寸 - 全屏切换时
  useEffect(() => {
    // 等待 DOM 更新后再同步尺寸
    const timer = setTimeout(() => {
      syncCanvasSize();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isFullscreen, syncCanvasSize]);
  
  // 同步 Canvas 尺寸 - 窗口大小变化时
  useEffect(() => {
    const handleResize = () => {
      syncCanvasSize();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [syncCanvasSize]);
  
  // 同步 Canvas 尺寸 - 视频加载完成后
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleLoadedMetadata = () => {
      syncCanvasSize();
    };
    
    const handleLoadedData = () => {
      syncCanvasSize();
    };
    
    const handleCanPlay = () => {
      syncCanvasSize();
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [videoUrl, syncCanvasSize]);
  
  // 使用 requestAnimationFrame 渲染绘画
  useEffect(() => {
    let animationFrameId;
    
    const renderLoop = () => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended) {
        animationFrameId = requestAnimationFrame(renderLoop);
        return;
      }
      
      const currentFrame = getCurrentFrame(video.currentTime);
      
      if (currentFrame !== lastFrameRef.current) {
        lastFrameRef.current = currentFrame;
        
        setCurrentTime(video.currentTime);
        setProgress((video.currentTime / video.duration) * 100);
        
        if (currentTool !== 'eraser' || !isDrawing) {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (canvas && ctx && showDrawing) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const permanentDrawings = drawingsRef.current.filter(d => d.type === 'permanent');
            permanentDrawings.forEach(drawing => {
              renderDrawing(ctx, drawing);
            });
            
            const frameDrawings = drawingsRef.current.filter(d => 
              d.type === 'single' && d.frameIndex === currentFrame
            );
            frameDrawings.forEach(drawing => {
              renderDrawing(ctx, drawing);
            });
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    
    renderLoop();
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [showDrawing, getCurrentFrame, currentTool, isDrawing]);
  
  // 监听 drawings 变化，同步到 ref
  useEffect(() => {
    drawingsRef.current = drawings;
  }, [drawings]);
  
  // 切换视频时清空画板
  useEffect(() => {
    setDrawings([]);
    setHistory([]);
    setHistoryIndex(-1);
    lastFrameRef.current = -1;
  }, [videoUrl]);

  // ==================== 控制函数 ====================
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  const handleSeek = useCallback((e) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    video.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(percentage * 100);
  }, [duration]);

  const handleVolumeChange = useCallback((e) => {
    const video = videoRef.current;
    if (!video) return;
    
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isMuted) {
      video.volume = volume || 1;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const changePlaybackRate = useCallback((rate) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  }, []);

  const toggleDrawingBoard = useCallback(() => {
    setIsDrawingBoardOpen(prev => !prev);
    setShowDrawing(true);
  }, []);

  const clearCanvas = useCallback(() => {
    setDrawings([]);
    setHistory(prev => [...prev.slice(0, historyIndex + 1), []]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setDrawings(history[historyIndex - 1]);
      setHistoryIndex(prev => prev - 1);
    } else if (historyIndex === 0) {
      setDrawings([]);
      setHistoryIndex(-1);
    }
  }, [history, historyIndex]);

  const handleTextSubmit = useCallback(() => {
    if (editingText.trim()) {
      const newText = {
        id: Date.now(),
        tool: 'text',
        text: editingText.trim(),
        x: editingPos.x,
        y: editingPos.y,
        size: brushSize,
        color: brushColor,
        type: 'permanent',
      };
      
      setDrawings(prev => [...prev, newText]);
      setHistory(prev => [...prev.slice(0, historyIndex + 1), drawings]);
      setHistoryIndex(prev => prev + 1);
    }
    
    setIsEditingText(false);
    setEditingText('');
  }, [editingText, editingPos, brushSize, brushColor, drawings, historyIndex]);

  // ==================== 收藏功能 ====================
  const loadCollections = useCallback(async () => {
    if (!authUtils.isAuthenticated()) return;
    try {
      const res = await favoritesAPI.getCollections();
      setCollections(res.data.collections || []);
    } catch (err) {
      console.error('加载收藏夹失败:', err);
    }
  }, []);
  
  const checkFavoriteStatus = useCallback(async () => {
    if (!videoId || !authUtils.isAuthenticated()) return;
    try {
      const res = await favoritesAPI.checkFavorite(videoId);
      setIsFavorited(res.data.favorited || false);
    } catch (err) {
      console.error('检查收藏状态失败:', err);
    }
  }, [videoId]);
  
  const toggleFavoriteMenu = async () => {
    if (!authUtils.isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }
    
    if (showFavoriteMenu) {
      setShowFavoriteMenu(false);
      return;
    }
    
    await loadCollections();
    await checkFavoriteStatus();
    setShowFavoriteMenu(true);
  };
  
  const handleAddToFavorite = async (collectionId) => {
    if (!videoId) return;
    try {
      await favoritesAPI.addFavorite(videoId, collectionId);
      setIsFavorited(true);
      setSelectedCollectionId(collectionId);
      setShowFavoriteMenu(false);
      await loadCollections();
    } catch (err) {
      if (err.response?.status === 401) {
        alert('请先登录后再收藏视频');
      } else {
        alert(err.response?.data?.message || '添加收藏失败');
      }
      console.error('收藏失败:', err);
    }
  };
  
  const handleRemoveFromFavorite = async () => {
    if (!videoId || !selectedCollectionId) return;
    try {
      await favoritesAPI.removeFavorite(videoId, selectedCollectionId);
      setIsFavorited(false);
      setShowFavoriteMenu(false);
      await loadCollections();
    } catch (err) {
      alert(err.response?.data?.message || '移除收藏失败');
    }
  };

  // ==================== 渲染 ====================
  return (
    <div 
      className={`video-player-enhanced ${isFullscreen ? 'fullscreen' : ''}`}
      ref={playerContainerRef}
      onDoubleClick={toggleFullscreen}
    >
      {/* 全屏模式下的关闭按钮 */}
      {isFullscreen && (
        <button className="fullscreen-close-btn" onClick={exitFullscreen}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="white" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      )}
      
      {/* 视频区域 */}
      <div className="video-container">
        <div className="video-wrapper">
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
            style={{ 
              display: isDrawingBoardOpen && showDrawing ? 'block' : 'none',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%'
            }}
          />
        </div>
      </div>
      
      {/* 第一层控制栏 - 始终显示 */}
      <div className="controls-bar-primary">
        <button 
          className="control-btn play-btn" 
          onClick={togglePlay}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="24" height="24">
              <rect x="6" y="4" width="4" height="16" fill="white"/>
              <rect x="14" y="4" width="4" height="16" fill="white"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="white" d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>
        
        <span className="time-display">
          {formatTime(currentTime)} / {formatTime(duration || 0)}
        </span>
        
        <input
          type="range"
          className="progress-slider"
          min="0"
          max="100"
          value={progress}
          onChange={handleSeek}
        />
        
        <div style={{ flex: 1 }} />
        
        <button 
          className="control-btn"
          onClick={toggleDrawingBoard}
        >
          画板
        </button>
        
        <button 
          className={`control-btn favorite-btn ${isFavorited ? 'active' : ''}`}
          onClick={toggleFavoriteMenu}
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path 
              fill={isFavorited ? "#FF4444" : "white"} 
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            />
          </svg>
        </button>
        
        {showFavoriteMenu && (
          <div className="favorite-menu">
            {collections.map(collection => (
              <button
                key={collection.id}
                className="favorite-menu-item"
                onClick={() => handleAddToFavorite(collection.id)}
              >
                {collection.name}
              </button>
            ))}
            {isFavorited && (
              <button
                className="favorite-menu-item remove"
                onClick={handleRemoveFromFavorite}
              >
                移除收藏
              </button>
            )}
          </div>
        )}
        
        <button 
          className="control-btn user-btn"
          onClick={() => setShowSpeedMenu(!showSpeedMenu)}
        >
          {playbackRate}x
        </button>
        
        {showSpeedMenu && (
          <div className="speed-menu">
            {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(rate => (
              <button
                key={rate}
                className={`speed-menu-item ${playbackRate === rate ? 'active' : ''}`}
                onClick={() => changePlaybackRate(rate)}
              >
                {rate}x
              </button>
            ))}
          </div>
        )}
        
        <button 
          className="control-btn"
          onClick={toggleMute}
        >
          {isMuted ? (
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="white" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="white" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          )}
        </button>
        
        <div 
          className="volume-slider-container"
          onMouseEnter={() => setShowVolumeSlider(true)}
          onMouseLeave={() => setShowVolumeSlider(false)}
        >
          <input
            type="range"
            className="volume-slider"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
          />
        </div>
      </div>
      
      {/* 第二层控制栏 - 画板工具 */}
      {isDrawingBoardOpen && (
        <div className="controls-bar-drawing">
          <button 
            className={`control-btn ${currentTool === 'pen' ? 'active' : ''}`}
            onClick={() => setCurrentTool('pen')}
          >
            画笔
          </button>
          
          <button 
            className={`control-btn ${currentTool === 'eraser' ? 'active' : ''}`}
            onClick={() => setCurrentTool('eraser')}
          >
            橡皮
          </button>
          
          <button 
            className="control-btn"
            onClick={clearCanvas}
          >
            清空
          </button>
          
          <button 
            className="control-btn"
            onClick={undo}
            disabled={historyIndex < 0}
          >
            撤销
          </button>
          
          <input
            type="color"
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            className="color-picker"
          />
          
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="brush-size-slider"
          />
        </div>
      )}
      
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
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTextSubmit();
              } else if (e.key === 'Escape') {
                setIsEditingText(false);
                setEditingText('');
              }
            }}
            onBlur={handleTextSubmit}
          />
        </div>
      )}
      
      {/* 认证模态框 */}
      {showAuthModal && (
        <div className="auth-modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            <h3>请先登录</h3>
            <p>登录后才能使用收藏功能</p>
            <button onClick={() => setShowAuthModal(false)}>关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPlayerEnhanced;
