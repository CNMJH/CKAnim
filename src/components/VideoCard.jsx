import { useRef, useState, useCallback, useEffect } from 'react';
import './VideoCard.css';

function VideoCard({ video }) {
  const videoRef = useRef(null);
  const cardRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // 使用 Intersection Observer 实现懒加载
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '100px', // 提前 100px 开始加载
        threshold: 0.1,
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  // 视频进入视口后开始播放
  useEffect(() => {
    if (isVisible && videoRef.current && !isLoaded) {
      const video = videoRef.current;
      video.load(); // 开始加载视频
      video.onloadeddata = () => {
        setIsLoaded(true);
        video.play().catch((err) => {
          if (err.name !== 'AbortError') {
            console.log('Auto-play prevented:', err);
          }
        });
        setIsPlaying(true);
      };
    }
  }, [isVisible, isLoaded]);

  // 鼠标移入 - 保持播放
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
      ref={cardRef}
      className="video-card"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 视频元素 - 加载完成后显示 */}
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
        style={{ opacity: isLoaded ? 1 : 0 }}
      />

      {/* 封面图 - 默认显示，视频加载后隐藏 */}
      {video.coverUrl && (
        <img
          src={video.coverUrl}
          alt={video.title}
          className="video-cover"
          style={{ opacity: isLoaded ? 0 : 1 }}
          loading="lazy"
        />
      )}

      {/* 加载指示器 */}
      {!isLoaded && (
        <div className="video-loading">
          <div className="loading-spinner"></div>
        </div>
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
