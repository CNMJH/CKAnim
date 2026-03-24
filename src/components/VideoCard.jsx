import { useRef, useState, useCallback } from 'react';
import './VideoCard.css';

function VideoCard({ video }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [coverLoaded, setCoverLoaded] = useState(false);

  // 鼠标移入 - 开始播放
  const handleMouseEnter = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      // 如果视频还未加载，先加载
      if (!isLoaded) {
        video.load();
        setIsLoaded(true);
      }
      video.currentTime = 0; // 从头开始
      video.play().catch(err => {
        // 忽略自动播放阻止错误
        if (err.name !== 'AbortError') {
          console.log('Auto-play prevented:', err);
        }
      });
      setIsPlaying(true);
    }
  }, [isLoaded]);

  // 鼠标移出 - 停止播放但保留缓冲
  const handleMouseLeave = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      // 暂停播放
      video.pause();
      
      // 重置进度（不清空缓冲）
      video.currentTime = 0;
      
      setIsPlaying(false);
      setProgress(0);
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
      videoRef.current.play().catch(err => {
        if (err.name !== 'AbortError') {
          console.log('Loop prevented:', err);
        }
      });
    }
  }, []);

  // 视频加载完成
  const handleLoadedData = useCallback(() => {
    setIsLoaded(true);
  }, []);

  // 封面图加载完成
  const handleCoverLoad = useCallback(() => {
    setCoverLoaded(true);
  }, []);

  return (
    <div
      className="video-card"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 视频元素 - 预加载元数据 */}
      <video
        ref={videoRef}
        src={video.qiniuUrl}
        className="video-element"
        muted
        loop
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedData={handleLoadedData}
      />

      {/* 封面图 - 使用 lazy 加载，播放时隐藏 */}
      {video.coverUrl && (
        <img
          src={video.coverUrl}
          alt={video.title}
          className="video-cover"
          loading="lazy"
          onLoad={handleCoverLoad}
          onError={(e) => {
            // 封面加载失败时隐藏
            e.target.style.display = 'none';
          }}
          style={{ 
            opacity: isPlaying ? 0 : 1,
            display: coverLoaded || !video.qiniuUrl ? 'block' : 'none'
          }}
        />
      )}

      {/* 进度条 */}
      <div className="progress-bar">
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
