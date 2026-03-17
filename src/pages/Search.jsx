import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { videosAPI } from '../lib/api';
import VideoCard from '../components/VideoCard';
import './Search.css';

function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [sortBy, setSortBy] = useState('relevance');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });

  // 搜索视频
  useEffect(() => {
    const fetchVideos = async () => {
      if (!query) {
        setVideos([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await videosAPI.search(query);
        setVideos(response.data.videos);
        setPagination(response.data.pagination);
      } catch (err) {
        console.error('Search error:', err);
        setError('搜索失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [query]);

  // 排序
  const sortedVideos = [...videos].sort((a, b) => {
    if (sortBy === 'views') return b.views - a.views;
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    return 0; // relevance 保持后端返回的顺序
  });

  return (
    <div className="search-page">
      <div className="search-header">
        <div className="search-query">
          搜索结果：<span>"{query}"</span>
        </div>
        
        <div className="sort-tabs">
          <button
            className={`sort-tab ${sortBy === 'relevance' ? 'active' : ''}`}
            onClick={() => setSortBy('relevance')}
          >
            相关性
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
        {loading ? (
          <div className="loading">加载中...</div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon">😕</div>
            <div className="error-text">{error}</div>
          </div>
        ) : sortedVideos.length > 0 ? (
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

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <span>第 {pagination.page} / {pagination.totalPages} 页</span>
          <span>共 {pagination.total} 个结果</span>
        </div>
      )}
    </div>
  );
}

export default Search;
