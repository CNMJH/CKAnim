import api from './api'

export const authAPI = {
  login: (username, password) =>
    api.post('/admin/login', { username, password }),

  getMe: () => api.get('/admin/me'),

  updatePassword: (currentPassword, newPassword) =>
    api.put('/admin/password', { currentPassword, newPassword }),
}

export const gamesAPI = {
  getAll: () => api.get('/admin/games'),
  getOne: (id) => api.get(`/admin/games/${id}`),
  create: (data) => api.post('/admin/games', data),
  update: (id, data) => api.put(`/admin/games/${id}`, data),
  delete: (id) => api.delete(`/admin/games/${id}`),
}

export const categoriesAPI = {
  getByGame: (gameId) => api.get(`/admin/games/${gameId}/categories`),
  create: (data) => api.post('/admin/categories', data),
  update: (id, data) => api.put(`/admin/categories/${id}`, data),
  delete: (id) => api.delete(`/admin/categories/${id}`),
  reorder: (categoryId, newOrder) =>
    api.put('/admin/categories/reorder', { categoryId, newOrder }),
}

export const videosAPI = {
  getAll: (params) => api.get('/admin/videos', { params }),
  getOne: (id) => api.get(`/admin/videos/${id}`),
  getUploadToken: (filename, gameId) =>
    api.post('/admin/videos/upload-token', { filename, gameId }),
  create: (data) => api.post('/admin/videos', data),
  update: (id, data) => api.put(`/admin/videos/${id}`, data),
  delete: (id) => api.delete(`/admin/videos/${id}`),
}
