import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// 视频 API
export const videosAPI = {
  // 获取视频列表（按游戏）
  getByGame: (gameId) => api.get(`/videos?gameId=${gameId}&published=true`),
  
  // 搜索视频
  search: (query, page = 1, limit = 20) => 
    api.get(`/videos/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`),
  
  // 获取热门视频（最新发布）
  getLatest: (limit = 10) => 
    api.get(`/videos?published=true&limit=${limit}`),
};

// 游戏 API
export const gamesAPI = {
  getAll: () => api.get('/games?published=true'),
  getOne: (id) => api.get(`/games/${id}`),
};

export default api;
