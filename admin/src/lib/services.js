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
  getIconToken: (filename, gameId) => api.post('/admin/games/icon-token', { filename, gameId }),
}

export const categoriesAPI = {
  getByGame: (gameId) => api.get(`/admin/games/${gameId}/categories`),
  create: (data) => api.post('/admin/categories', data),
  update: (id, data) => api.put(`/admin/categories/${id}`, data),
  delete: (id) => api.delete(`/admin/categories/${id}`),
  reorder: (categoryId, newOrder) =>
    api.put('/admin/categories/reorder', { categoryId, newOrder }),
  getIconToken: (filename, categoryId) => api.post('/admin/categories/icon-token', { filename, categoryId }),
}

export const videosAPI = {
  getAll: (params) => api.get('/admin/videos', { params }),
  getOne: (id) => api.get(`/admin/videos/${id}`),
  getUploadToken: (filename, gameId, categoryIds = []) =>
    api.post('/admin/videos/upload-token', { filename, gameId, categoryIds }),
  create: (data) => api.post('/admin/videos', data),
  update: (id, data) => api.put(`/admin/videos/${id}`, data),
  delete: (id) => api.delete(`/admin/videos/${id}`),
}

export const tagsAPI = {
  getAll: () => api.get('/admin/tags'),
  create: (data) => api.post('/admin/tags', data),
  update: (id, data) => api.put(`/admin/tags/${id}`, data),
  delete: (id) => api.delete(`/admin/tags/${id}`),
}

export const charactersAPI = {
  getByGame: (gameId) => api.get(`/admin/characters?gameId=${gameId}`),
  create: (data) => api.post('/admin/characters', data),
  update: (id, data) => api.put(`/admin/characters/${id}`, data),
  delete: (id) => api.delete(`/admin/characters/${id}`),
}
