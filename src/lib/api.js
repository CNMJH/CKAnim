import axios from 'axios';

// 创建 axios 实例（前台 API）
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  // ⭐ 禁用缓存，确保每次请求都获取最新数据
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
});

// ⭐ 添加请求拦截器，在 URL 后添加时间戳防止缓存
api.interceptors.request.use(config => {
  // GET 请求添加时间戳防止缓存
  if (config.method === 'get') {
    config.params = {
      ...config.params,
      _t: Date.now(), // 时间戳防止缓存
    };
  }
  return config;
});

// 角色 API
export const charactersAPI = {
  // 获取角色列表
  getByGame: (gameId, params = {}) => {
    return api.get('/characters', {
      params: { gameId, ...params },
    });
  },

  // 获取角色详情（带动作）
  getById: (id) => {
    return api.get(`/characters/${id}`);
  },

  // 获取角色的动作列表
  getActions: (id) => {
    return api.get(`/characters/${id}/actions`);
  },
};

// 动作 API
export const actionsAPI = {
  // 获取所有动作
  getAll: () => {
    return api.get('/actions');
  },
};

// 角色分类 API
export const characterRolesAPI = {
  // 获取角色分类列表
  getAll: (gameId) => {
    return api.get('/character-roles', {
      params: { gameId },
    });
  },
};

// 游戏 API
export const gamesAPI = {
  // 获取游戏列表
  getAll: () => {
    return api.get('/games');
  },
};

// 视频 API
export const videosAPI = {
  // 搜索视频
  search: (query) => {
    return api.get('/videos/search', {
      params: { q: query },
    });
  },

  // 获取视频列表
  getAll: (params) => {
    return api.get('/videos', { params });
  },
};

// 网站设置 API
export const siteSettingsAPI = {
  // 获取所有设置
  getAll: () => {
    return api.get('/settings');
  },

  // 获取单个设置
  getOne: (key) => {
    return api.get(`/settings/${key}`);
  },
};

// 轮播图 API
export const carouselAPI = {
  // 获取活跃的轮播图（前台使用）
  getActive: () => {
    return api.get('/carousels/active');
  },
};

// ==================== 用户系统 API ====================

// 创建带 Token 的 axios 实例
const createAuthApi = () => {
  const token = localStorage.getItem('token');
  return axios.create({
    baseURL: '/api',
    timeout: 10000,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
    },
  });
};

export const userAPI = {
  // 注册
  register: (data) => {
    return axios.post('/api/auth/register', data);
  },

  // 登录
  login: (data) => {
    return axios.post('/api/auth/login', data);
  },

  // 获取当前用户信息
  getMe: () => {
    const api = createAuthApi();
    return api.get('/auth/me');
  },

  // 更新用户信息
  updateMe: (data) => {
    const api = createAuthApi();
    return api.put('/auth/me', data);
  },

  // 修改密码
  updatePassword: (currentPassword, newPassword) => {
    const api = createAuthApi();
    return api.put('/auth/me/password', { currentPassword, newPassword });
  },

  // 获取收藏夹
  getFavorites: () => {
    const api = createAuthApi();
    return api.get('/favorites');
  },

  // 添加到收藏夹
  addFavorite: (videoId) => {
    const api = createAuthApi();
    return api.post('/favorites', { videoId });
  },

  // 从收藏夹移除
  removeFavorite: (videoId) => {
    const api = createAuthApi();
    return api.delete(`/favorites/${videoId}`);
  },

  // 检查收藏状态
  checkFavorite: (videoId) => {
    const api = createAuthApi();
    return api.get(`/favorites/check/${videoId}`);
  },

  // 获取头像上传凭证
  getAvatarUploadToken: (filename) => {
    const api = createAuthApi();
    return api.get(`/avatar/upload-token`, { params: { filename } });
  },

  // 提交头像审核
  submitAvatar: (avatarUrl, avatarKey) => {
    const api = createAuthApi();
    return api.post('/avatar/submit', { avatarUrl, avatarKey });
  },
};

// 用户认证工具函数
export const authUtils = {
  // 保存 Token
  setToken: (token) => {
    localStorage.setItem('token', token);
  },

  // 获取 Token
  getToken: () => {
    return localStorage.getItem('token');
  },

  // 移除 Token（登出）
  removeToken: () => {
    localStorage.removeItem('token');
  },

  // 检查是否已登录
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // 获取当前用户角色
  getUserRole: () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role;
    } catch {
      return null;
    }
  },

  // 检查是否是管理员
  isAdmin: () => {
    const role = authUtils.getUserRole();
    return role === 'system_admin' || role === 'content_admin';
  },

  // 检查是否是系统管理员
  isSystemAdmin: () => {
    const role = authUtils.getUserRole();
    return role === 'system_admin';
  },

  // 检查是否是内容管理员
  isContentAdmin: () => {
    const role = authUtils.getUserRole();
    return role === 'content_admin';
  },

  // 检查是否是 VIP 用户
  isVip: () => {
    const role = authUtils.getUserRole();
    return role === 'vip1' || role === 'vip2' || role === 'vip3';
  },
};

// ==================== 收藏夹 API ====================
// 创建带认证拦截器的 axios 实例
const favoritesApi = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 添加请求拦截器，动态添加 Token
favoritesApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const favoritesAPI = {
  // 获取所有收藏夹
  getCollections: () => {
    return favoritesApi.get('/favorite-collections');
  },

  // 创建收藏夹
  createCollection: (data) => {
    return favoritesApi.post('/favorite-collections', data);
  },

  // 更新收藏夹
  updateCollection: (id, data) => {
    return favoritesApi.put(`/favorite-collections/${id}`, data);
  },

  // 删除收藏夹
  deleteCollection: (id) => {
    return favoritesApi.delete(`/favorite-collections/${id}`);
  },

  // 调整收藏夹排序
  updateCollectionOrder: (id, order) => {
    return favoritesApi.put(`/favorite-collections/${id}/order`, { order });
  },

  // 获取收藏夹内的视频列表
  getFavorites: (collectionId) => {
    return favoritesApi.get('/favorites', {
      params: { collectionId },
    });
  },

  // 添加视频到收藏夹
  addFavorite: (videoId, collectionId) => {
    return favoritesApi.post('/favorites', { videoId, collectionId });
  },

  // 从收藏夹移除视频
  removeFavorite: (videoId, collectionId) => {
    return favoritesApi.delete(`/favorites/${videoId}`, {
      params: { collectionId },
    });
  },

  // 检查视频收藏状态
  checkFavorite: (videoId) => {
    return favoritesApi.get(`/favorites/check/${videoId}`);
  },

  // 批量添加视频
  batchAdd: (videoIds, collectionId) => {
    return favoritesApi.post('/favorites/batch-add', { videoIds, collectionId });
  },

  // 批量移动视频
  batchMove: (videoIds, fromCollectionId, toCollectionId) => {
    return favoritesApi.post('/favorites/batch-move', {
      videoIds,
      fromCollectionId,
      toCollectionId,
    });
  },

  // 批量删除视频
  batchRemove: (videoIds, collectionId) => {
    return favoritesApi.post('/favorites/batch-remove', { videoIds, collectionId });
  },
};

// ==================== 用户个人参考库 API ====================
const userLibraryApi = axios.create({
  baseURL: '/api',
  timeout: 30000, // 上传需要更长时间
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
});

// 添加认证头
userLibraryApi.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.method === 'get') {
    config.params = {
      ...config.params,
      _t: Date.now(),
    };
  }
  return config;
});

export const userLibraryAPI = {
  // ===== 分类管理 =====
  getCategories: () => userLibraryApi.get('/user-library/categories'),
  createCategory: (data) => userLibraryApi.post('/user-library/categories', data),
  updateCategory: (id, data) => userLibraryApi.put(`/user-library/categories/${id}`, data),
  deleteCategory: (id) => userLibraryApi.delete(`/user-library/categories/${id}`),
  
  // ===== 角色管理 =====
  getCharacters: (categoryId) => userLibraryApi.get('/user-library/characters', {
    params: categoryId ? { categoryId } : {}
  }),
  createCharacter: (data) => userLibraryApi.post('/user-library/characters', data),
  updateCharacter: (id, data) => userLibraryApi.put(`/user-library/characters/${id}`, data),
  deleteCharacter: (id) => userLibraryApi.delete(`/user-library/characters/${id}`),
  
  // ===== 动作管理 =====
  getActions: (characterId) => userLibraryApi.get(`/user-library/characters/${characterId}/actions`),
  createAction: (characterId, data) => userLibraryApi.post(`/user-library/characters/${characterId}/actions`, data),
  updateAction: (id, data) => userLibraryApi.put(`/user-library/actions/${id}`, data),
  deleteAction: (id) => userLibraryApi.delete(`/user-library/actions/${id}`),
  
  // ===== 视频管理 =====
  getUploadToken: (filename, characterId, actionId) => userLibraryApi.get('/user-library/videos/upload-token', {
    params: { filename, characterId, actionId }
  }),
  getCoverUploadToken: (key) => userLibraryApi.get('/user-library/videos/cover-upload-token', {
    params: { key }
  }),
  saveVideo: (data) => userLibraryApi.post('/user-library/videos', data),
  
  // ===== 统计 =====
  getStats: () => userLibraryApi.get('/user-library/stats'),
  
  // ===== 管理员配置 =====
  getAdminSettings: () => userLibraryApi.get('/user-library/admin/settings'),
  updateAdminSetting: (key, data) => userLibraryApi.put(`/user-library/admin/settings/${key}`, data),
};

// ===== 抽奖 API =====
export const lotteryAPI = {
  // 获取活跃抽奖配置
  getActive: () => api.get('/lottery/active'),

  // 获取每日剩余次数
  getDailyCount: () => api.get('/lottery/daily-count'),

  // 执行抽奖
  draw: (configId) => api.post('/lottery/draw', { configId }),

  // 获取用户抽奖记录
  getUserRecords: (page = 1, limit = 20) => api.get('/lottery/records', { params: { page, limit } }),
};
