import './App.css'

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>🎬 CKAnim</h1>
        <p>动画展示平台</p>
      </header>
      
      <main className="main">
        <section className="hero">
          <h2>欢迎来到 CKAnim</h2>
          <p>探索精彩动画世界</p>
        </section>
        
        <section className="features">
          <div className="feature-card">
            <h3>🎨 精美动画</h3>
            <p>高质量动画作品展示</p>
          </div>
          <div className="feature-card">
            <h3>📺 在线播放</h3>
            <p>流畅的观看体验</p>
          </div>
          <div className="feature-card">
            <h3>📱 响应式设计</h3>
            <p>任何设备都能完美展示</p>
          </div>
        </section>
      </main>
      
      <footer className="footer">
        <p>© 2026 CKAnim. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
