import { useState, useRef, useEffect, useCallback } from 'react';
import './VideoPlayerEnhanced.css';
import AuthModal from './AuthModal';
import { authUtils, favoritesAPI } from '../lib/api';

// 假设视频 30fps
const FRAME_DURATION = 1 / 30;

function VideoPlayerEnhanced({ videoUrl, videoTitle, videoId, autoPlay = false }) {
  // 用户认证状态
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // 收藏相关状态
  const [isFavorited, setIsFavorited] = useState(false); // 是否已收藏
  const [showFavoriteMenu, setShowFavoriteMenu] = useState(false); // 收藏夹菜单显示
  const [collections, setCollections] = useState([]); // 收藏夹列表
  const [selectedCollectionId, setSelectedCollectionId] = useState(null); // 当前选择的收藏夹 ID
  
  // 基础播放状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // 音量控制
  const [volume, setVolume] = useState(1); // 音量 0-1
  const [isMuted, setIsMuted] = useState(false); // 是否静音
  
  // 画板状态
  const [isDrawingBoardOpen, setIsDrawingBoardOpen] = useState(false);
  const [currentTool, setCurrentTool] = useState('brush'); // brush, eraser, text
  const [brushType, setBrushType] = useState('single'); // single (单帧), permanent (全程)
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#FF0000');
  const [showDrawing, setShowDrawing] = useState(true);
  const [showBrushSizeSlider, setShowBrushSizeSlider] = useState(false); // 画笔粗细滑条显示
  const [showColorPicker, setShowColorPicker] = useState(false); // 颜色选择器显示
  const [showSpeedMenu, setShowSpeedMenu] = useState(false); // 倍速菜单显示
  const [showVolumeMenu, setShowVolumeMenu] = useState(false); // 音量菜单显示
  const [showEraserMenu, setShowEraserMenu] = useState(false); // 橡皮擦菜单显示
  const [eraserSize, setEraserSize] = useState(20); // 橡皮擦大小
  const [eraserShape, setEraserShape] = useState('circle'); // circle (圆形), square (正方形)
  
  // 文本编辑状态
  const [isEditingText, setIsEditingText] = useState(false);
  const [editingText, setEditingText] = useState('');
  const [editingPos, setEditingPos] = useState({ x: 0, y: 0 });
  const [textRotation, setTextRotation] = useState(0); // 文字旋转角度
  const [selectedDrawing, setSelectedDrawing] = useState(null); // 当前选中的绘画（用于编辑）
  
  // 全屏状态
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerContainerRef = useRef(null);
  
  // Canvas 相关
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const lastFrameRef = useRef(-1);  // 用于 requestAnimationFrame 帧追踪
  const drawingsRef = useRef([]);  // 存储最新的 drawings，避免闭包问题
  
  // 统一的帧索引计算函数（30fps 视频）
  const getCurrentFrame = useCallback((time) => {
    return Math.round(time * 30);
  }, []);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState(null);
  const [currentPath, setCurrentPath] = useState([]); // 当前正在画的路径
  
  // 绘画数据
  const [drawings, setDrawings] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // 同步 drawingsRef，确保所有渲染逻辑使用最新的 drawings
  useEffect(() => {
    drawingsRef.current = drawings;
  }, [drawings]);
  
  // 在两点之间插值，生成连续路径（用于橡皮擦）
  const interpolatePoints = (p1, p2, distance = 3) => {
    const points = [];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist <= distance) return [p2];
    
    const steps = Math.floor(dist / distance);
    for (let i = 1; i <= steps; i++) {
      points.push({
        x: p1.x + (dx * i / steps),
        y: p1.y + (dy * i / steps)
      });
    }
    return points;
  };
  
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
      // 初始化播放速度为 1.0
      video.playbackRate = 1.0;
      // 初始化音量为 100%
      video.volume = 1;
      setVolume(1);
    };
    

    const handleEnded = () => {
      setIsPlaying(false);
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoUrl]);
  
  // 使用 requestAnimationFrame 渲染绘画（解决 timeupdate 频率不足导致的丢帧问题）
  useEffect(() => {
    let animationFrameId;
    
    const renderLoop = () => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended) {
        animationFrameId = requestAnimationFrame(renderLoop);
        return;
      }
      
      // 计算当前帧（30fps 视频）
      const currentFrame = getCurrentFrame(video.currentTime);
      
      // 只在帧变化时重新渲染
      if (currentFrame !== lastFrameRef.current) {
        lastFrameRef.current = currentFrame;
        
        // 更新 React 状态（用于进度条等 UI）
        setCurrentTime(video.currentTime);
        setProgress((video.currentTime / video.duration) * 100);
        
        // 渲染当前帧的绘画（橡皮擦工具使用时跳过，避免覆盖预览）
        if (currentTool !== 'eraser' || !isDrawing) {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (canvas && ctx && showDrawing) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // 渲染全程绘画（所有帧都显示）
            const permanentDrawings = drawingsRef.current.filter(d => d.type === 'permanent');
            permanentDrawings.forEach(drawing => {
              renderDrawing(ctx, drawing);
            });
            
            // 渲染当前帧的单帧绘画
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
    
    // 启动渲染循环
    renderLoop();
    
    // 清理函数
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [showDrawing, getCurrentFrame]);
  
  // 切换视频时清空画板
  useEffect(() => {
    setDrawings([]);
    setHistory([]);
    setHistoryIndex(-1);
    
    // 清空 Canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [videoUrl]);
  
  // 检查登录状态
  useEffect(() => {
    if (authUtils.isAuthenticated()) {
      // 简单获取用户信息（实际项目中应该调用 API 获取完整信息）
      setCurrentUser({ username: '用户' });
    }
  }, []);
  
  // 处理登录成功
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
  };
  
  // 处理登出
  const handleLogout = () => {
    authUtils.removeToken();
    setCurrentUser(null);
    setIsFavorited(false);
  };
  
  // 加载收藏夹列表
  const loadCollections = useCallback(async () => {
    if (!authUtils.isAuthenticated()) return;
    try {
      const res = await favoritesAPI.getCollections();
      setCollections(res.data.collections || []);
    } catch (err) {
      console.error('加载收藏夹失败:', err);
    }
  }, []);
  
  // 检查收藏状态
  const checkFavoriteStatus = useCallback(async () => {
    if (!videoId || !authUtils.isAuthenticated()) return;
    try {
      const res = await favoritesAPI.checkFavorite(videoId);
      setIsFavorited(res.data.favorited || false);
    } catch (err) {
      console.error('检查收藏状态失败:', err);
    }
  }, [videoId]);
  
  // 切换收藏菜单
  const toggleFavoriteMenu = async () => {
    if (!authUtils.isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }
    
    if (showFavoriteMenu) {
      setShowFavoriteMenu(false);
      return;
    }
    
    // 加载收藏夹列表
    await loadCollections();
    // 检查收藏状态
    await checkFavoriteStatus();
    setShowFavoriteMenu(true);
  };
  
  // 添加到收藏夹
  const handleAddToFavorite = async (collectionId) => {
    if (!videoId) return;
    try {
      await favoritesAPI.addFavorite(videoId, collectionId);
      setIsFavorited(true);
      setSelectedCollectionId(collectionId);
      setShowFavoriteMenu(false);
      // 更新收藏夹列表（刷新封面和数量）
      await loadCollections();
    } catch (err) {
      alert(err.response?.data?.message || '添加收藏失败');
    }
  };
  
  // 从收藏夹移除
  const handleRemoveFromFavorite = async () => {
    if (!videoId || !selectedCollectionId) return;
    try {
      await favoritesAPI.removeFavorite(videoId, selectedCollectionId);
      setIsFavorited(false);
      setShowFavoriteMenu(false);
      // 更新收藏夹列表
      await loadCollections();
    } catch (err) {
      alert(err.response?.data?.message || '移除收藏失败');
    }
  };
  
  // 全屏切换
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  // 退出全屏
  const exitFullscreen = () => {
    setIsFullscreen(false);
  };
  
  // 自动播放视频
  useEffect(() => {
    const video = videoRef.current;
    if (autoPlay && video && videoUrl) {
      video.play().catch(err => {
        console.log('自动播放失败:', err);
      });
      setIsPlaying(true);
    }
  }, [autoPlay, videoUrl]);
  
  // 监听 videoId 变化，检查收藏状态
  useEffect(() => {
    if (videoId && authUtils.isAuthenticated()) {
      checkFavoriteStatus();
    } else {
      setIsFavorited(false);
      setSelectedCollectionId(null);
    }
  }, [videoId, checkFavoriteStatus]);
  
  // 视频播放结束后重置 autoPlay
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleEnded = () => {
      // 循环播放时不重置 autoPlay
    };
    
    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, []);
  
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
    
    // ⭐ 基于帧号计算，而非时间累加（消除累积误差）
    const currentFrame = Math.round(video.currentTime * 30);
    video.currentTime = Math.max(0, (currentFrame - 1) / 30);
    
    // ⭐ 手动更新进度条和时间显示
    const newTime = video.currentTime;
    setCurrentTime(newTime);
    if (duration > 0) {
      setProgress((newTime / duration) * 100);
    }
    
    // 手动触发当前帧绘画渲染
    setTimeout(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      
      const currentFrame = getCurrentFrame(video.currentTime);
      
      // 更新 lastFrameRef，防止 requestAnimationFrame 循环重复渲染
      lastFrameRef.current = currentFrame;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!showDrawing) return;
      
      // 渲染全程绘画
      const permanentDrawings = drawingsRef.current.filter(d => d.type === 'permanent');
      permanentDrawings.forEach(drawing => {
        renderDrawing(ctx, drawing);
      });
      
      // 渲染当前帧的单帧绘画
      const frameDrawings = drawingsRef.current.filter(d => 
        d.type === 'single' && d.frameIndex === currentFrame
      );
      frameDrawings.forEach(drawing => {
        renderDrawing(ctx, drawing);
      });
    }, 50);
  };
  
  const nextFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    
    // ⭐ 基于帧号计算，而非时间累加（消除累积误差）
    const currentFrame = Math.round(video.currentTime * 30);
    video.currentTime = Math.min(duration, (currentFrame + 1) / 30);
    
    // ⭐ 手动更新进度条和时间显示
    const newTime = video.currentTime;
    setCurrentTime(newTime);
    if (duration > 0) {
      setProgress((newTime / duration) * 100);
    }
    
    // 手动触发当前帧绘画渲染
    setTimeout(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      
      const currentFrame = getCurrentFrame(video.currentTime);
      
      // 更新 lastFrameRef，防止 requestAnimationFrame 循环重复渲染
      lastFrameRef.current = currentFrame;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!showDrawing) return;
      
      // 渲染全程绘画
      const permanentDrawings = drawingsRef.current.filter(d => d.type === 'permanent');
      permanentDrawings.forEach(drawing => {
        renderDrawing(ctx, drawing);
      });
      
      // 渲染当前帧的单帧绘画
      const frameDrawings = drawingsRef.current.filter(d => 
        d.type === 'single' && d.frameIndex === currentFrame
      );
      frameDrawings.forEach(drawing => {
        renderDrawing(ctx, drawing);
      });
    }, 50);
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
    
    // 橡皮擦工具 - 记录擦除路径（不立即删除）
    if (currentTool === 'eraser') {
      setIsDrawing(true);
      setLastPos(pos);
      setCurrentPath([pos]); // 开始记录擦除路径
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
    
    // 橡皮擦工具 - 实时擦除 + 显示预览
    if (currentTool === 'eraser') {
      const video = videoRef.current;
      const currentFrame = getCurrentFrame(video.currentTime);
      
      // 获取 Canvas 缩放比例
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const eraserRadius = eraserSize / 2;
      
      // 实时擦除：检测当前点到上一点之间的路径，擦除碰到的绘画
      if (lastPos) {
        // 在 lastPos 和 pos 之间插值，形成连续擦除路径
        const erasePoints = interpolatePoints(lastPos, pos, 3);
        
        // 对每个插值点进行擦除检测
        erasePoints.forEach(erasePoint => {
          const newDrawings = drawingsRef.current.map(drawing => {
            const isInCurrentFrame = drawing.type === 'single' && drawing.frameIndex === currentFrame;
            const isPermanent = drawing.type === 'permanent';
            
            if (!isInCurrentFrame && !isPermanent) return drawing;
            
            const newPaths = [];
            drawing.paths.forEach(path => {
              const segments = [];
              let currentSegment = [];
              
              path.points.forEach(point => {
                const isErased = eraserShape === 'circle'
                  ? Math.sqrt((point.x - erasePoint.x) ** 2 + (point.y - erasePoint.y) ** 2) < (eraserRadius * scaleX)
                  : Math.abs(point.x - erasePoint.x) < (eraserRadius * scaleX) && Math.abs(point.y - erasePoint.y) < (eraserRadius * scaleY);
                
                if (isErased) {
                  if (currentSegment.length > 1) segments.push({ points: currentSegment });
                  currentSegment = [];
                } else {
                  currentSegment.push(point);
                }
              });
              
              if (currentSegment.length > 1) segments.push({ points: currentSegment });
              newPaths.push(...segments);
            });
            
            return newPaths.length > 0 ? { ...drawing, paths: newPaths } : null;
          }).filter(d => d !== null);
          
          // 更新 drawingsRef 和 drawings 状态
          drawingsRef.current = newDrawings;
          setDrawings(newDrawings);
        });
      }
      
      // 清除 Canvas 并重新渲染
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
      
      // 绘制橡皮擦预览（半透明）
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)';
      ctx.lineWidth = 2;
      
      if (eraserShape === 'circle') {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, (eraserSize * scaleX) / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        const halfX = (eraserSize * scaleX) / 2;
        const halfY = (eraserSize * scaleY) / 2;
        ctx.fillRect(pos.x - halfX, pos.y - halfY, eraserSize * scaleX, eraserSize * scaleY);
        ctx.strokeRect(pos.x - halfX, pos.y - halfY, eraserSize * scaleX, eraserSize * scaleY);
      }
      
      // 更新 lastPos 和记录路径
      setLastPos(pos);
      setCurrentPath(prev => {
        if (prev.length === 0) return [pos];
        const interpolated = interpolatePoints(prev[prev.length - 1], pos, 3);
        return [...prev, ...interpolated];
      });
      
      return;
    }
    
    // 其他工具 - 保存路径点（带插值），然后实时绘制
    setCurrentPath(prev => {
      if (prev.length === 0) return [pos];
      const lastPos = prev[prev.length - 1];
      const interpolated = interpolatePoints(lastPos, pos, 3);
      return [...prev, ...interpolated];
    });
    
    // 画笔工具 - 实时绘制
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
    
    // 橡皮擦工具 - 擦除路径范围内的绘画
    if (currentTool === 'eraser' && currentPath.length > 0) {
      const video = videoRef.current;
      const currentFrame = getCurrentFrame(video.currentTime);
      
      // 计算擦除路径的边界框
      const eraserBounds = {
        minX: Math.min(...currentPath.map(p => p.x)) - eraserSize / 2,
        maxX: Math.max(...currentPath.map(p => p.x)) + eraserSize / 2,
        minY: Math.min(...currentPath.map(p => p.y)) - eraserSize / 2,
        maxY: Math.max(...currentPath.map(p => p.y)) + eraserSize / 2,
      };
      
      // 真实擦除：路径分段算法
      // 当橡皮擦擦过路径时，将路径分成多段，移除被擦除的部分
      // 使用 drawingsRef.current 获取最新数据，避免闭包问题
      const eraserRadius = eraserSize / 2;
      
      const newDrawings = drawingsRef.current.map(drawing => {
        // 只处理当前帧的单帧绘画，或所有常驻绘画
        const isInCurrentFrame = drawing.type === 'single' && drawing.frameIndex === currentFrame;
        const isPermanent = drawing.type === 'permanent';
        
        if (!isInCurrentFrame && !isPermanent) return drawing; // 保留其他帧的绘画
        
        // 获取 Canvas 缩放比例
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        // 对每个路径进行分段处理
        const newPaths = [];
        
        drawing.paths.forEach(path => {
          const points = path.points;
          const segments = []; // 存储分段后的路径
          let currentSegment = []; // 当前正在构建的路径段
          
          for (let i = 0; i < points.length; i++) {
            const point = points[i];
            
            // 检查这个点是否被橡皮擦碰到（考虑 Canvas 缩放）
            const isErased = currentPath.some(eraserPoint => {
              if (eraserShape === 'circle') {
                // 圆形擦除：检查点到擦除路径的距离
                const dx = point.x - eraserPoint.x;
                const dy = point.y - eraserPoint.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance < (eraserRadius * scaleX);
              } else {
                // 方形擦除：检查点是否在擦除路径的矩形范围内
                return Math.abs(point.x - eraserPoint.x) < (eraserRadius * scaleX) &&
                       Math.abs(point.y - eraserPoint.y) < (eraserRadius * scaleY);
              }
            });
            
            if (isErased) {
              // 遇到被擦除的点，保存当前段（如果有）
              if (currentSegment.length > 1) {
                segments.push({ points: currentSegment });
              }
              currentSegment = []; // 开始新的一段
            } else {
              // 未被擦除，加入当前段
              currentSegment.push(point);
            }
          }
          
          // 保存最后一段（如果有）
          if (currentSegment.length > 1) {
            segments.push({ points: currentSegment });
          }
          
          // 将分段添加到新路径
          newPaths.push(...segments);
        });
        
        // 返回新的 drawing 对象（如果 paths 为空，则删除整个 drawing）
        return newPaths.length > 0 ? { ...drawing, paths: newPaths } : null;
      }).filter(d => d !== null); // 过滤掉被完全擦除的绘画
      
      // 更新状态
      setDrawings(newDrawings);
      addToHistory(newDrawings);
      
      // 清除橡皮擦预览并重新渲染
      setCurrentPath([]);
      setTimeout(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx && showDrawing) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const permanentDrawings = newDrawings.filter(d => d.type === 'permanent');
          permanentDrawings.forEach(drawing => {
            renderDrawing(ctx, drawing);
          });
          const frameDrawings = newDrawings.filter(d => 
            d.type === 'single' && d.frameIndex === currentFrame
          );
          frameDrawings.forEach(drawing => {
            renderDrawing(ctx, drawing);
          });
        }
      }, 50);
      return;
    }
    
    // 保存完整路径数据（画笔和文本）
    if (currentPath.length > 0) {
      const video = videoRef.current;
      const currentFrame = getCurrentFrame(video.currentTime); // 与渲染循环一致
      
      const newDrawing = {
        id: Date.now(),
        type: brushType,
        frameIndex: currentFrame,
        tool: 'brush',
        color: brushColor,
        size: brushSize,
        paths: [{ points: currentPath }], // 保存完整路径
        timestamp: Date.now()
      };
      
      const newDrawings = [...drawings, newDrawing];
      setDrawings(newDrawings);
      addToHistory(newDrawings);
      
      // 立即渲染当前帧（解决绘画后不立即显示的问题）
      setTimeout(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx && showDrawing) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // 渲染全程绘画
          const permanentDrawings = newDrawings.filter(d => d.type === 'permanent');
          permanentDrawings.forEach(drawing => {
            renderDrawing(ctx, drawing);
          });
          
          // 渲染当前帧的单帧绘画
          const frameDrawings = newDrawings.filter(d => 
            d.type === 'single' && d.frameIndex === currentFrame
          );
          frameDrawings.forEach(drawing => {
            renderDrawing(ctx, drawing);
          });
        }
      }, 50);
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
      const video = videoRef.current;
      const currentFrame = getCurrentFrame(video.currentTime); // 与渲染循环一致
      
      const newDrawing = {
        id: Date.now(),
        type: brushType,
        frameIndex: currentFrame,
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
      const newDrawings = [...history[newIndex]]; // 深拷贝
      setHistoryIndex(newIndex);
      setDrawings(newDrawings);
      drawingsRef.current = newDrawings; // ⭐ 同步更新 drawingsRef
      
      // ⭐ 立即触发 Canvas 渲染
      setTimeout(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        
        const currentFrame = getCurrentFrame(videoRef.current?.currentTime || 0);
        lastFrameRef.current = currentFrame;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (showDrawing) {
          // 渲染全程绘画
          const permanentDrawings = newDrawings.filter(d => d.type === 'permanent');
          permanentDrawings.forEach(drawing => {
            renderDrawing(ctx, drawing);
          });
          // 渲染当前帧的单帧绘画
          const frameDrawings = newDrawings.filter(d => 
            d.type === 'single' && d.frameIndex === currentFrame
          );
          frameDrawings.forEach(drawing => {
            renderDrawing(ctx, drawing);
          });
        }
      }, 50);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      const newDrawings = [];
      setDrawings(newDrawings);
      drawingsRef.current = newDrawings; // ⭐ 同步更新 drawingsRef
      
      // ⭐ 立即清空 Canvas
      setTimeout(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }, 50);
    }
  };
  
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const newDrawings = [...history[newIndex]]; // 深拷贝
      setHistoryIndex(newIndex);
      setDrawings(newDrawings);
      drawingsRef.current = newDrawings; // ⭐ 同步更新 drawingsRef
      
      // ⭐ 立即触发 Canvas 渲染
      setTimeout(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        
        const currentFrame = getCurrentFrame(videoRef.current?.currentTime || 0);
        lastFrameRef.current = currentFrame;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (showDrawing) {
          // 渲染全程绘画
          const permanentDrawings = newDrawings.filter(d => d.type === 'permanent');
          permanentDrawings.forEach(drawing => {
            renderDrawing(ctx, drawing);
          });
          // 渲染当前帧的单帧绘画
          const frameDrawings = newDrawings.filter(d => 
            d.type === 'single' && d.frameIndex === currentFrame
          );
          frameDrawings.forEach(drawing => {
            renderDrawing(ctx, drawing);
          });
        }
      }, 50);
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
    tempCanvas.width = video.videoWidth || 1920;
    tempCanvas.height = video.videoHeight || 1080;
    const ctx = tempCanvas.getContext('2d');
    
    // 计算缩放比例（从 Canvas 分辨率到视频分辨率）
    const scaleX = tempCanvas.width / canvas.width;   // 例如：1920 / 1000 = 1.92
    const scaleY = tempCanvas.height / canvas.height; // 例如：1080 / 562.5 = 1.92
    
    try {
      // 1. 绘制当前视频帧
      ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
      
      // 2. 绘制所有绘画内容（坐标缩放）
      const currentFrame = getCurrentFrame(video.currentTime);
      
      // 绘制全程绘画
      const permanentDrawings = drawingsRef.current.filter(d => d.type === 'permanent');
      permanentDrawings.forEach(drawing => {
        renderDrawingToCanvas(ctx, drawing, scaleX, scaleY);
      });
      
      // 绘制当前帧的单帧绘画
      const frameDrawings = drawingsRef.current.filter(d => 
        d.type === 'single' && d.frameIndex === currentFrame
      );
      frameDrawings.forEach(drawing => {
        renderDrawingToCanvas(ctx, drawing, scaleX, scaleY);
      });
      
      // 3. 保存为 PNG 图片 - 自动下载到浏览器默认路径
      tempCanvas.toBlob((blob) => {
        if (!blob) return;
        
        try {
          // 方法 1: 使用 a 标签下载（最佳实践）
          const link = document.createElement('a');
          link.download = `frame_with_drawing_${Date.now()}.png`;
          link.href = URL.createObjectURL(blob);
          link.style.display = 'none';
          document.body.appendChild(link);
          
          // 触发下载
          link.click();
          
          // 清理
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
          }, 100);
          
        } catch (error) {
          console.error('保存失败:', error);
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('保存失败:', error);
    }
  };
  
  // 渲染绘画到 Canvas（用于保存）
  const renderDrawingToCanvas = (ctx, drawing, scaleX = 1, scaleY = 1) => {
    if (drawing.tool === 'brush') {
      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = drawing.size * scaleX;  // 线宽也缩放
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      drawing.paths.forEach(path => {
        if (!path.points || path.points.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(
          path.points[0].x * scaleX,  // X 坐标缩放
          path.points[0].y * scaleY   // Y 坐标缩放
        );
        
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(
            path.points[i].x * scaleX,
            path.points[i].y * scaleY
          );
        }
        
        ctx.stroke();
      });
    } else if (drawing.tool === 'text' && drawing.text) {
      ctx.font = `${drawing.size * 3 * scaleX}px Arial`;
      ctx.fillStyle = drawing.color;
      ctx.fillText(
        drawing.text,
        drawing.position.x * scaleX,
        drawing.position.y * scaleY
      );
    }
  };
  
  // 快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isDrawingBoardOpen) return;
      
      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          // ⭐ 基于帧号计算，而非时间累加（消除累积误差）
          const video = videoRef.current;
          if (!video) return;
          const currentFrame = Math.round(video.currentTime * 30);
          video.currentTime = Math.max(0, (currentFrame - 1) / 30);
          
          // ⭐ 手动更新进度条和时间显示（和按钮逻辑一致）
          const newTime = video.currentTime;
          setCurrentTime(newTime);
          if (duration > 0) {
            setProgress((newTime / duration) * 100);
          }
          
          setTimeout(() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx) return;
            
            // 使用 Math.round 与 stopDrawing 和渲染循环保持一致
            const currentFrame = getCurrentFrame(video.currentTime);
            
            // 更新 lastFrameRef，防止 requestAnimationFrame 循环重复渲染
            lastFrameRef.current = currentFrame;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (showDrawing) {
              // 渲染全程绘画
              const permanentDrawings = drawingsRef.current.filter(d => d.type === 'permanent');
              permanentDrawings.forEach(drawing => {
                renderDrawing(ctx, drawing);
              });
              // 渲染当前帧的单帧绘画
              const frameDrawings = drawingsRef.current.filter(d => 
                d.type === 'single' && d.frameIndex === currentFrame
              );
              frameDrawings.forEach(drawing => {
                renderDrawing(ctx, drawing);
              });
            }
          }, 50);
          break;
        case 'ArrowRight':
          e.preventDefault();
          // ⭐ 基于帧号计算，而非时间累加（消除累积误差）
          const video2 = videoRef.current;
          if (!video2) return;
          const currentFrame2 = Math.round(video2.currentTime * 30);
          video2.currentTime = Math.min(duration, (currentFrame2 + 1) / 30);
          
          // ⭐ 手动更新进度条和时间显示（和按钮逻辑一致）
          const newTime2 = video2.currentTime;
          setCurrentTime(newTime2);
          if (duration > 0) {
            setProgress((newTime2 / duration) * 100);
          }
          
          setTimeout(() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx) return;
            
            // 使用 Math.round 与 stopDrawing 和渲染循环保持一致
            const currentFrame = getCurrentFrame(video2.currentTime);
            
            // 更新 lastFrameRef，防止 requestAnimationFrame 循环重复渲染
            lastFrameRef.current = currentFrame;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (showDrawing) {
              // 渲染全程绘画
              const permanentDrawings = drawingsRef.current.filter(d => d.type === 'permanent');
              permanentDrawings.forEach(drawing => {
                renderDrawing(ctx, drawing);
              });
              // 渲染当前帧的单帧绘画
              const frameDrawings = drawingsRef.current.filter(d => 
                d.type === 'single' && d.frameIndex === currentFrame
              );
              frameDrawings.forEach(drawing => {
                renderDrawing(ctx, drawing);
              });
            }
          }, 50);
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
  }, [isDrawingBoardOpen, showDrawing, undo, redo, saveDrawings, duration]);
  
  // 格式化时间
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // 切换播放速度
  const togglePlaybackRate = () => {
    const video = videoRef.current;
    if (!video) return;
    
    const rates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = rates.indexOf(video.playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    video.playbackRate = rates[nextIndex];
  };
  
  // 获取当前速度显示文本
  const getPlaybackRateText = () => {
    const video = videoRef.current;
    if (!video) return '倍速';
    
    const rate = video.playbackRate;
    if (rate === 1.0) return '倍速';
    return `${rate}x`;
  };
  
  // 切换静音
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };
  
  // 调节音量
  const handleVolumeChange = (e) => {
    const video = videoRef.current;
    if (!video) return;
    
    const newVolume = Number(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    
    // 如果音量 > 0 且当前是静音，取消静音
    if (newVolume > 0 && isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
  };
  
  // 获取音量图标 SVG
  const renderVolumeIcon = () => {
    if (isMuted || volume === 0) {
      // 静音图标
      return (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="white" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
        </svg>
      );
    }
    if (volume < 0.5) {
      // 低音量图标
      return (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="white" d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
        </svg>
      );
    }
    // 高音量图标
    return (
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path fill="white" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
      </svg>
    );
  };
  
  return (
    <>
      {/* 全屏模式下的关闭按钮 */}
      {isFullscreen && (
        <button className="fullscreen-close-btn" onClick={exitFullscreen}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="white" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      )}
      
      <div 
        className={`video-player-enhanced ${isFullscreen ? 'fullscreen' : ''}`}
        ref={playerContainerRef}
        onDoubleClick={toggleFullscreen}
      >
        {/* 视频区域 */}
        <div className="video-container">
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
          style={{ display: isDrawingBoardOpen && showDrawing ? 'block' : 'none' }}
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
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path fill="white" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </button>
              <button className="text-editor-btn cancel" onClick={cancelText} title="取消 (Esc)">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path fill="white" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
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
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="white" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="white" d="M8 5v14l11-7z"/>
            </svg>
          )}
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
        
        {/* 收藏按钮 - B 站风格 */}
        <div className="speed-volume-wrapper">
          <button 
            className={`control-btn icon-btn ${showFavoriteMenu ? 'active' : ''}`}
            onClick={toggleFavoriteMenu}
            title={isFavorited ? '已收藏' : '添加到收藏夹'}
            style={{ width: '40px', padding: 0 }}
          >
            {isFavorited ? (
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#FF4081" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="white" d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.56 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/>
              </svg>
            )}
          </button>
          {showFavoriteMenu && (
            <div className="speed-volume-menu favorite-menu">
              {isFavorited ? (
                <button
                  className="favorite-action-btn remove-btn"
                  onClick={handleRemoveFromFavorite}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginRight: '6px' }}>
                    <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                  移除收藏
                </button>
              ) : (
                <>
                  <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px', display: 'block', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    选择收藏夹
                  </div>
                  {collections.length === 0 ? (
                    <div style={{ padding: '8px 0', color: '#999', fontSize: '12px' }}>
                      暂无收藏夹
                    </div>
                  ) : (
                    collections.map(collection => (
                      <button
                        key={collection.id}
                        className="favorite-option"
                        onClick={() => handleAddToFavorite(collection.id)}
                      >
                        <span className="favorite-option-name">{collection.name}</span>
                        {collection.isDefault && (
                          <span className="favorite-option-badge">默认</span>
                        )}
                      </button>
                    ))
                  )}
                </>
              )}
            </div>
          )}
        </div>
        
        {/* 会员登录按钮 */}
        {currentUser ? (
          <div 
            className="user-info-wrapper"
            onClick={() => window.location.href = '/user'}
            style={{ cursor: 'pointer' }}
            title="点击访问用户中心"
          >
            <span className="username">{currentUser.username}</span>
            <button 
              className="logout-btn" 
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
            >
              退出
            </button>
          </div>
        ) : (
          <button 
            className="control-btn text-btn login-btn"
            onClick={() => setShowAuthModal(true)}
          >
            会员登录
          </button>
        )}
        {/* 倍速按钮 - B 站风格 */}
        <div className="speed-volume-wrapper">
          <button 
            className={`control-btn text-btn ${showSpeedMenu ? 'active' : ''}`}
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            title="播放速度"
          >
            {getPlaybackRateText()}
          </button>
          {showSpeedMenu && (
            <div className="speed-volume-menu">
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(rate => (
                <button
                  key={rate}
                  className={`speed-option ${videoRef.current?.playbackRate === rate ? 'active' : ''}`}
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.playbackRate = rate;
                      setShowSpeedMenu(false);
                    }
                  }}
                >
                  {rate}x
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* 音量按钮 - B 站风格 */}
        <div className="speed-volume-wrapper">
          <button 
            className={`control-btn icon-btn ${showVolumeMenu ? 'active' : ''}`}
            onClick={() => setShowVolumeMenu(!showVolumeMenu)}
            title="音量"
            style={{ width: '40px', padding: 0 }}
          >
            {renderVolumeIcon()}
          </button>
          {showVolumeMenu && (
            <div className="speed-volume-menu volume-menu">
              <input
                type="range"
                className="volume-slider-vertical"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const newVolume = parseFloat(e.target.value);
                  setVolume(newVolume);
                  if (videoRef.current) {
                    videoRef.current.volume = newVolume;
                    if (newVolume > 0 && isMuted) {
                      setIsMuted(false);
                    }
                  }
                }}
              />
              <button
                className="mute-button"
                onClick={() => {
                  toggleMute();
                }}
              >
                {isMuted || volume === 0 ? (
                  <>
                    <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                      <path fill="white" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                    取消静音
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                      <path fill="white" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                    静音
                  </>
                )}
              </button>
            </div>
          )}
        </div>
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
              transform: `scale(${Math.max(0.08, Math.min(1.25, brushSize / 20))})`,
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
                max="25"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
              />
              <span className="brush-size-value">{brushSize}px</span>
            </div>
          )}
          
          {/* 颜色选择按钮 */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer'
              }}
              title="画笔颜色设置"
            />
            <button 
              className="control-btn icon-btn color-btn"
              style={{ backgroundColor: brushColor, pointerEvents: 'none' }}
              title="画笔颜色设置"
            />
          </div>
          
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
              <path fill="white" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            <span className="badge-dot"></span>
          </button>
          
          <div className="speed-volume-wrapper">
            <button 
              className={`control-btn icon-btn ${currentTool === 'eraser' ? 'active' : ''}`}
              onClick={() => {
                setCurrentTool('eraser');
                setShowEraserMenu(!showEraserMenu);
              }}
              title="橡皮擦 - 擦除绘画"
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="white" d="M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 0 1-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l10.6-10.6c.79-.78 2.05-.78 2.83 0zM4.22 15.58l3.54 3.53c.78.79 2.04.79 2.83 0l8.48-8.48-6.37-6.37L4.22 15.58z"/>
              </svg>
            </button>
            {showEraserMenu && (
              <div className="speed-volume-menu" style={{ minWidth: '140px', padding: '12px 16px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px', display: 'block' }}>大小：{eraserSize}px</div>
                  <input type="range" min="10" max="100" value={eraserSize} onChange={(e) => setEraserSize(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px', display: 'block' }}>形状</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setEraserShape('circle')} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: eraserShape === 'circle' ? '2px solid #00A1D6' : '1px solid rgba(255,255,255,0.2)', backgroundColor: eraserShape === 'circle' ? 'rgba(0,161,214,0.2)' : 'transparent', color: eraserShape === 'circle' ? '#00A1D6' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="8" fill="currentColor" /></svg>
                    </button>
                    <button onClick={() => setEraserShape('square')} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: eraserShape === 'square' ? '2px solid #00A1D6' : '1px solid rgba(255,255,255,0.2)', backgroundColor: eraserShape === 'square' ? 'rgba(0,161,214,0.2)' : 'transparent', color: eraserShape === 'square' ? '#00A1D6' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <svg viewBox="0 0 24 24" width="20" height="20"><rect x="4" y="4" width="16" height="16" fill="currentColor" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
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
      
      {/* 登录/注册弹窗 */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}

export default VideoPlayerEnhanced;
