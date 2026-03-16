import './VideoCard.css';

function VideoCard({ video }) {
  const formatViews = (views) => {
    if (views >= 10000) {
      return (views / 10000).toFixed(1) + '万';
    }
    return views;
  };

  return (
    <div className="video-card">
      <div className="video-thumbnail">
        <img src={video.thumbnail} alt={video.title} />
        <div className="play-icon">▶</div>
        <span className="video-duration">{video.duration}</span>
      </div>
      <div className="video-info">
        <div className="video-title">{video.title}</div>
        <div className="video-meta">
          <span className="video-views">
            👁️ {formatViews(video.views)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default VideoCard;
