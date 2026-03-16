import './VideoCard.css';

function VideoCard({ video }) {
  return (
    <div className="video-card">
      <div className="play-icon">▶</div>
      <span className="video-duration">{video.duration}</span>
    </div>
  );
}

export default VideoCard;
