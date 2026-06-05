import { apiGet, apiPatch, apiPost, setStoredUser, setToken, uploadFile } from './api';
import {
  AuthResponse,
  Channel,
  Comment,
  Notification,
  PaginatedResponse,
  Playlist,
  User,
  Video,
  Category,
} from './types';

export const authApi = {
  login: (email: string, password: string) =>
    apiPost<AuthResponse>('/api/auth/login', { email, password }),

  register: (data: { email: string; password: string; username: string; displayName?: string }) =>
    apiPost<AuthResponse>('/api/auth/register', data),

  googleSignIn: (data: { email: string; username: string; displayName?: string; avatarUrl?: string }) =>
    apiPost<AuthResponse>('/api/auth/google-signin', data),

  logout: () => apiPost('/api/auth/logout'),

  logoutAll: () => apiPost('/api/auth/logout-all'),

  getMe: () => apiGet<{ user: User }>('/api/auth/me'),

  updateProfile: (data: Partial<Pick<User, 'displayName' | 'bio' | 'avatarUrl' | 'bannerUrl'>>) =>
    apiPatch<{ user: User }>('/api/auth/me', data),

  uploadAvatar: (file: File) =>
    uploadFile<{ url: string }>('/api/auth/upload-avatar', file, 'avatar'),

  uploadBanner: (file: File) =>
    uploadFile<{ url: string }>('/api/auth/upload-banner', file, 'banner'),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiPost('/api/auth/change-password', { currentPassword, newPassword }),

  requestPasswordReset: (email: string) =>
    apiPost('/api/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    apiPost('/api/auth/reset-password', { token, newPassword }),

  checkAvailability: (params: { email?: string; username?: string }) =>
    apiGet<{ email?: boolean; username?: boolean }>('/api/auth/check-availability', params),
};

export const videoApi = {
  list: (params: {
    search?: string;
    category?: string;
    tag?: string;
    userId?: string;
    sort?: 'recent' | 'popular' | 'liked' | 'oldest' | 'trending';
    page?: number;
    pageSize?: number;
  } = {}) => apiGet<PaginatedResponse<Video>>('/api/videos', params),

  get: (id: string) => apiGet<Video>(`/api/videos/${id}`),

  upload: (file: File, fields: Record<string, string>, onProgress?: (percent: number) => void) =>
    uploadFile<Video>('/api/videos/upload', file, 'video', fields, onProgress),

  update: (id: string, data: { title: string; description: string; categoryId?: string; tags?: string[]; status?: string }) =>
    apiPatch<Video>(`/api/videos/${id}`, data),

  delete: (id: string) => apiPost(`/api/videos/${id}/delete`),

  recordView: (id: string, watchTime: number, percentage: number) =>
    apiPost(`/api/videos/${id}/view`, { watchTime, percentage }),

  toggleLike: (id: string) =>
    apiPost<{ liked: boolean; likes: number }>(`/api/videos/${id}/like`),

  getLikeStatus: (id: string) =>
    apiGet<{ liked: boolean }>(`/api/videos/${id}/like`),

  getRelated: (id: string) => apiGet<Video[]>(`/api/videos/${id}/related`),

  getTrending: () => apiGet<Video[]>('/api/videos/trending'),

  getCategories: () => apiGet<Category[]>('/api/videos/categories'),

  getComments: (id: string, page = 1, pageSize = 20) =>
    apiGet<PaginatedResponse<Comment>>(`/api/videos/${id}/comments`, { page, pageSize }),

  addComment: (id: string, content: string, parentId?: string) =>
    apiPost<Comment>(`/api/videos/${id}/comments`, { content, parentId }),

  updateComment: (videoId: string, commentId: string, content: string) =>
    apiPatch<Comment>(`/api/videos/${videoId}/comments/${commentId}`, { content }),

  deleteComment: (videoId: string, commentId: string) =>
    apiPost(`/api/videos/${videoId}/comments/${commentId}/delete`),
};

export const channelApi = {
  get: (username: string) => apiGet<Channel>(`/api/channels/${username}`),

  getVideos: (username: string, page = 1, pageSize = 20) =>
    apiGet<PaginatedResponse<Video>>(`/api/channels/${username}/videos`, { page, pageSize }),

  getStats: (username: string) =>
    apiGet<{ subscriberCount: number; videoCount: number; totalViews: number; totalLikes: number; joinedAt: string }>(`/api/channels/${username}/stats`),

  toggleSubscribe: (username: string) =>
    apiPost<{ subscribed: boolean; subscriberCount: number }>(`/api/channels/${username}/subscribe`),

  getMySubscriptions: () => apiGet<Channel[]>('/api/channels/me/subscriptions'),

  getLikedVideos: (page = 1, pageSize = 20) =>
    apiGet<PaginatedResponse<Video>>('/api/channels/me/liked', { page, pageSize }),

  getHistory: (page = 1, pageSize = 20) =>
    apiGet<PaginatedResponse<Video & { watchedAt: string; watchTime: number }>>('/api/channels/me/history', { page, pageSize }),
};

export const notificationApi = {
  list: (page = 1, pageSize = 20, unreadOnly = false) =>
    apiGet<PaginatedResponse<Notification> & { unreadCount: number }>('/api/notifications', { page, pageSize, unread: unreadOnly }),

  markRead: (id?: string) =>
    apiPost(id ? `/api/notifications/${id}/read` : '/api/notifications/read'),

  delete: (id: string) => apiPost(`/api/notifications/${id}/delete`),
};

export const playlistApi = {
  list: () => apiGet<Playlist[]>('/api/playlists'),

  get: (id: string) => apiGet<Playlist & { items: unknown[]; user: unknown }>(`/api/playlists/${id}`),

  create: (data: { title: string; description?: string; isPublic?: boolean }) =>
    apiPost<Playlist>('/api/playlists', data),

  update: (id: string, data: { title?: string; description?: string; isPublic?: boolean }) =>
    apiPatch<Playlist>(`/api/playlists/${id}`, data),

  delete: (id: string) => apiPost(`/api/playlists/${id}/delete`),

  addVideo: (id: string, videoId: string) =>
    apiPost(`/api/playlists/${id}/videos`, { videoId }),

  removeVideo: (id: string, videoId: string) =>
    apiPost(`/api/playlists/${id}/videos/${videoId}/remove`),
};

export async function saveAuth(token: string, user: User) {
  setToken(token);
  setStoredUser(user);
}
