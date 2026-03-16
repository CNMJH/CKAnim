import './VideoCard.css';

function VideoCard({ video, onHover }) {
  const handleMouseEnter = () => {
    if (onHover) onHover(video);
  };

  return (
    <div 
      className="video-card"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => onHover && onHover(null)}
    >
      <div className="video-thumbnail">
        <img src={video.thumbnail} alt={video.title} />
        <div className="play-icon">▶</div>
        <div className="video-duration">{video.duration}</div>
      </div>
      <div className="video-info">
        <h3 className="video-title">{video.title}</h3>
        <div className="video-meta">
          <span className="video-views">{video.views.toLocaleString()} 次观看</span>
        </div>
      </div>
    </div>
  );
}

export default VideoCard;
