import { useRef, useState, useCallback } from 'react';
import './VideoCard.css';

function VideoCard({ video }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // 检测是否支持 WebP
  const supportsWebP = typeof document !== 'undefined' 
    ? document.createElement('canvas').toDataURL('image/webp').includes('webp')
    : true;
  
  // 优先使用 WebP 封面图
  const coverUrl = video.coverUrlWebp && supportsWebP 
    ? video.coverUrlWebp 
    : (video.coverUrl || video.coverUrlJpg);

  // 鼠标移入 - 加载并播放视频
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    
    // 如果视频还没加载，开始加载
    if (!videoLoaded && videoRef.current && video.qiniuUrl) {
      videoRef.current.src = video.qiniuUrl;
      setVideoLoaded(true);
    }
    
    // 播放视频
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch((err) => {
        if (err.name !== 'AbortError') {
          console.log('Play prevented:', err);
        }
      });
      setIsPlaying(true);
    }
  }, [videoLoaded, video.qiniuUrl]);

  // 鼠标移出 - 停止播放并重置
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  // 进度更新
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const { currentTime, duration } = videoRef.current;
      if (duration > 0) {
        setProgress((currentTime / duration) * 100);
      }
    }
  }, []);

  // 视频结束 - 循环
  const handleEnded = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch((err) => {
        if (err.name !== 'AbortError') {
          console.log('Loop prevented:', err);
        }
      });
    }
  }, []);

  return (
    <div
      className="video-card"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 封面图 - 默认显示，鼠标移入时隐藏（优先使用 WebP） */}
      {coverUrl && (
        <img
          src={coverUrl}
          alt={video.title}
          className="video-card__cover"
          style={{ opacity: isPlaying ? 0 : 1, visibility: isPlaying ? 'hidden' : 'visible' }}
          loading="lazy"
        />
      )}

      {/* 视频元素 - 鼠标移入时才加载并显示 */}
      <video
        ref={videoRef}
        className="video-element"
        muted
        loop
        playsInline
        preload="none"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        style={{ opacity: isPlaying ? 1 : 0, visibility: isPlaying ? 'visible' : 'hidden' }}
      />

      {/* 进度条 - 鼠标悬停时显示 */}
      <div className="progress-bar" style={{ opacity: isHovered ? 1 : 0 }}>
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 时长 */}
      <span className="video-duration">{video.duration || '--:--'}</span>

      {/* 标题 */}
      <div className="video-title">{video.title}</div>
    </div>
  );
}

export default VideoCard;
