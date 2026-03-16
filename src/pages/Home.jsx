import { useState } from 'react';
import { videos, banners } from '../data/mockData';
import VideoCard from './VideoCard';
import './Home.css';

function Home() {
  const [currentBanner, setCurrentBanner] = useState(0);

  // 自动轮播
  useState(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  });

  const handleRefresh = () => {
    // 刷新视频列表（实际项目中会重新请求数据）
    console.log('刷新视频列表');
  };

  return (
    <div className="home">
      <div className="home-title">随机参考，每日一看</div>

      <div className="home-content">
        {/* 左侧轮播图 */}
        <div className="banner-section">
          <div className="banner">
            <img 
              src={banners[currentBanner].image} 
              alt={banners[currentBanner].title}
            />
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

        {/* 右侧视频网格 */}
        <div className="video-grid-main">
          <div className="video-row">
            {videos.slice(0, 3).map(video => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
          <div className="video-row">
            {videos.slice(3, 6).map(video => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </div>
      </div>

      {/* 下方视频网格 */}
      <div className="video-grid-full">
        {videos.slice(6, 18).map(video => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      {/* 换一批按钮 */}
      <button className="refresh-btn" onClick={handleRefresh}>
        🔄 换一批
      </button>
    </div>
  );
}

export default Home;
