import { useRef, useState, useCallback, useEffect } from 'react';
import './VideoCard.css';

function VideoCard({ video }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);

  // 组件加载后自动播放视频
  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      video.currentTime = 0;
      video.play().catch((err) => {
        if (err.name !== 'AbortError') {
          console.log('Auto-play prevented:', err);
        }
      });
      setIsPlaying(true);
    }
  }, [video]);

  // 鼠标移入 - 保持播放（无操作）
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  // 鼠标移出 - 继续播放（不停止）
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
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
      {/* 视频元素 - 始终可见 */}
      <video
        ref={videoRef}
        src={video.qiniuUrl}
        className="video-element"
        muted
        loop
        playsInline
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        style={{ opacity: 1 }}
      />

      {/* 封面图 - 仅在视频加载前显示 */}
      {video.coverUrl && (
        <img
          src={video.coverUrl}
          alt={video.title}
          className="video-cover"
          style={{ opacity: isPlaying ? 0 : 1 }}
        />
      )}

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
