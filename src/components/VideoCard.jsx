import { useRef, useState, useCallback } from 'react';
import './VideoCard.css';

function VideoCard({ video }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // 鼠标移入 - 开始播放
  const handleMouseEnter = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0; // 从头开始
      videoRef.current.play().catch(err => {
        console.log('Auto-play prevented:', err);
      });
      setIsPlaying(true);
    }
  }, []);

  // 鼠标移出 - 停止播放并清理缓冲
  const handleMouseLeave = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      // 暂停播放
      video.pause();
      
      // 重置进度
      video.currentTime = 0;
      
      // 保存原始视频 URL
      const originalSrc = video.src;
      
      // 清空视频源 - 释放缓冲的内存
      video.src = '';
      
      // 强制重新加载（清空内部缓冲）
      video.load();
      
      // 恢复原始 URL（下次播放时使用）
      video.src = originalSrc;
      
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
      videoRef.current.play();
    }
  }, []);

  return (
    <div
      className="video-card"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 封面图 */}
      {video.coverUrl && (
        <img
          src={video.coverUrl}
          alt={video.title}
          className="video-cover"
          style={{ opacity: isPlaying ? 0 : 1 }}
        />
      )}

      {/* 视频元素 */}
      <video
        ref={videoRef}
        src={video.qiniuUrl}
        className="video-element"
        muted
        loop
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      {/* 进度条 */}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 时长 */}
      <span className="video-duration">{video.duration}</span>

      {/* 标题 */}
      <div className="video-title">{video.title}</div>
    </div>
  );
}

export default VideoCard;
