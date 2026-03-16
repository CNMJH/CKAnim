import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { videos } from '../data/mockData';
import VideoCard from '../components/VideoCard';
import './Search.css';

function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [sortBy, setSortBy] = useState('relevance');

  // 过滤视频（简单实现，实际项目中应该用后端搜索）
  const filteredVideos = videos.filter(video =>
    video.title.toLowerCase().includes(query.toLowerCase())
  );

  // 排序
  const sortedVideos = [...filteredVideos].sort((a, b) => {
    if (sortBy === 'views') return b.views - a.views;
    if (sortBy === 'newest') return b.id - a.id;
    return 0; // relevance - 保持原顺序
  });

  return (
    <div className="search-page">
      <div className="search-header">
        <div className="search-query">
          搜索结果："{query}"
        </div>
        
        <div className="sort-tabs">
          <button
            className={`sort-tab ${sortBy === 'relevance' ? 'active' : ''}`}
            onClick={() => setSortBy('relevance')}
          >
            相关性
          </button>
          <button
            className={`sort-tab ${sortBy === 'views' ? 'active' : ''}`}
            onClick={() => setSortBy('views')}
          >
            最多播放
          </button>
          <button
            className={`sort-tab ${sortBy === 'newest' ? 'active' : ''}`}
            onClick={() => setSortBy('newest')}
          >
            最新
          </button>
        </div>
      </div>

      <div className="search-results">
        {sortedVideos.length > 0 ? (
          <div className="video-grid-search">
            {sortedVideos.map(video => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="no-results">
            <div className="no-results-icon">😕</div>
            <div className="no-results-text">没有找到相关视频</div>
            <div className="no-results-hint">试试其他关键词吧</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Search;
