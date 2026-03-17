import { useState, useEffect } from 'react';
import { videos, banners } from '../data/mockData';
import VideoCard from '../components/VideoCard';
import './Home.css';

function Home() {
  const [currentBanner, setCurrentBanner] = useState(0);

  // 自动轮播
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    console.log('刷新视频列表');
    // 实际项目中会重新请求数据
  };

  return (
    <div className="home">
      <div className="home-title">随机参考，每日一看</div>

      <div className="home-content">
        {/* 左侧轮播图 */}
        <div className="banner-section">
          <div className="banner">
            <div className="banner-placeholder">
              轮播图
            </div>
            <div className="banner-title">{banners[currentBanner].title}</div>
          </div>
          <div className="banner-dots">
            {banners.map((_, index) => (
              <span
                key={index}
                className={`dot ${index === currentBanner ? 'active' : ''}`}
                onClick={() => setCurrentBanner(index)}
              />
            ))}
          </div>
        </div>

        {/* 右侧区域：视频网格 + 换一批按钮 */}
        <div className="right-section">
          {/* 视频卡片 - 2 行×3 列 = 6 个 */}
          {videos.slice(0, 6).map(video => (
            <VideoCard key={video.id} video={video} />
          ))}

          {/* 换一批按钮 - 右上角，垂直排列 */}
          <button className="refresh-btn" onClick={handleRefresh}>
            <span className="refresh-icon">🔄</span>
            <span className="refresh-text">
              <span>换</span>
              <span>一</span>
              <span>批</span>
            </span>
          </button>
        </div>
      </div>

      {/* 下方视频网格 - 2 行×5 列 = 10 个 */}
      <div className="video-grid-full">
        {videos.slice(6, 16).map(video => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}

export default Home;
