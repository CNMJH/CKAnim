import { useState, useEffect } from 'react';
import { videosAPI, siteSettingsAPI } from '../lib/api';
import VideoCard from '../components/VideoCard';
import './Home.css';

function Home() {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState({
    siteName: 'CKAnim',
    announcement: {
      text: '随机参考，每日一看',
      enabled: true,
      color: '#666',
    },
  });

  // 轮播图数据（暂时使用静态数据）
  const banners = [
    { id: 1, title: '欢迎来到 CKAnim', image: 'https://placehold.co/640x360/3b82f6/ffffff?text=CKAnim' },
    { id: 2, title: '发现精彩游戏动作', image: 'https://placehold.co/640x360/10b981/ffffff?text=Game+Actions' },
    { id: 3, title: '每日更新不间断', image: 'https://placehold.co/640x360/f59e0b/ffffff?text=Daily+Updates' },
  ];

  // 加载网站设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await siteSettingsAPI.getAll();
        const settings = response.data.settings;
        
        setSiteSettings({
          siteName: settings.siteName?.value || 'CKAnim',
          announcement: settings.siteAnnouncement?.value 
            ? JSON.parse(settings.siteAnnouncement.value)
            : { text: '随机参考，每日一看', enabled: true, color: '#666' },
        });

        // 更新页面标题
        document.title = settings.siteName?.value || 'CKAnim';
      } catch (error) {
        console.error('加载网站设置失败:', error);
      }
    };
    loadSettings();
  }, []);

  // 加载视频数据（随机）
  const loadRandomVideos = async () => {
    try {
      setLoading(true);
      const response = await videosAPI.getAll({ limit: 100 });
      const allVideos = response.data.videos || [];
      // 随机打乱数组
      const shuffled = [...allVideos].sort(() => Math.random() - 0.5);
      setVideos(shuffled);
    } catch (error) {
      console.error('加载视频失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadRandomVideos();
  }, []);

  // 自动轮播
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // 换一批 - 随机刷新
  const handleRefresh = async () => {
    try {
      setLoading(true);
      const response = await videosAPI.getAll({ limit: 100 });
      const allVideos = response.data.videos || [];
      // 随机打乱数组
      const shuffled = [...allVideos].sort(() => Math.random() - 0.5);
      setVideos(shuffled);
    } catch (error) {
      console.error('刷新视频失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home">
      {siteSettings.announcement.enabled && (
        <div 
          className="home-title" 
          style={{ color: siteSettings.announcement.color }}
        >
          {siteSettings.announcement.text}
        </div>
      )}

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
          {loading ? (
            <div className="loading">加载中...</div>
          ) : (
            <>
              {/* 视频卡片 - 2 行×3 列 = 6 个 */}
              {videos.slice(0, 6).map(video => (
                <VideoCard key={video.id} video={video} />
              ))}

              {/* 换一批按钮 - 右上角，垂直排列 */}
              <button className="refresh-btn" onClick={handleRefresh} title="换一批">
                <svg className="refresh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 21" />
                  <path d="M21 3v6h-6" />
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 3" />
                  <path d="M3 21v-6h6" />
                </svg>
                <span className="refresh-text">
                  <span>换</span>
                  <span>一</span>
                  <span>批</span>
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 下方视频网格 - 2 行×5 列 = 10 个 */}
      {!loading && videos.length > 6 && (
        <div className="video-grid-full">
          {videos.slice(6, 16).map(video => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;
