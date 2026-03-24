import { useRef, useState, useCallback } from 'react';
import './VideoCard.css';

function VideoCard({ video }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // 鼠标移入 - 开始播放
  const handleMouseEnter = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      video.currentTime = 0;
      video.play().catch(err => {
        if (err.name !== 'AbortError') {
          console.log('Auto-play prevented:', err);
        }
      });
      setIsPlaying(true);
    }
  }, []);

  // 鼠标移出 - 停止播放但保留缓冲
  const handleMouseLeave = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      video.pause();
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

  return (
    <div
      className="video-card"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 视频元素 - 只在播放时可见 */}
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
        style={{ opacity: isPlaying ? 1 : 0 }}
      />

      {/* 封面图 - 默认显示，播放时隐藏 */}
      {video.coverUrl && (
        <img
          src={video.coverUrl}
          alt={video.title}
          className="video-card-cover"
          style={{ opacity: isPlaying ? 0 : 1 }}
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
