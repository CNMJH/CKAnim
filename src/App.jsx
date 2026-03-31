import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Games from './pages/Games';
import Search from './pages/Search';
import UserCenter from './pages/UserCenter';
import FavoriteCollections from './pages/FavoriteCollections';
import FavoriteDetail from './pages/FavoriteDetail';
import UserLibrary from './pages/UserLibrary';
import UserLibraryManage from './pages/UserLibraryManage';
import Lottery from './pages/Lottery';
import ResumeList from './pages/ResumeList';
import ResumeEditor from './pages/ResumeEditor';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/games" element={<Games />} />
            <Route path="/search" element={<Search />} />
            <Route path="/user" element={<UserCenter />} />
            <Route path="/user/security" element={<UserCenter />} />
            <Route path="/user/vip" element={<UserCenter />} />
            <Route path="/user/favorites" element={<FavoriteCollections />} />
            <Route path="/user/favorites/:id" element={<FavoriteDetail />} />
            <Route path="/user/library" element={<UserLibrary />} />
            <Route path="/user/library/manage" element={<UserLibraryManage />} />
            <Route path="/user/lottery" element={<Lottery />} />
            <Route path="/resume" element={<ResumeList />} />
            <Route path="/resume/edit/:id" element={<ResumeEditor />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
