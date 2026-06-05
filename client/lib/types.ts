export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  role: UserRole;
  isVerified: boolean;
  subscriberCount: number;
  videoCount: number;
  createdAt: string;
}

export interface ChannelUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  position: number;
  _count?: { videos: number };
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export type VideoStatus = 'PROCESSING' | 'PUBLISHED' | 'UNLISTED' | 'PRIVATE' | 'BLOCKED';

export interface Video {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  hlsUrl: string | null;
  duration: number | null;
  views: number;
  likes: number;
  status: VideoStatus;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string | null;
  user: ChannelUser;
  category: Category | null;
  tags: Tag[];
  commentCount: number;
}

export interface CommentUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  videoId: string;
  parentId: string | null;
  likes: number;
  isEdited: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  user: CommentUser;
  replies?: Comment[];
  _count?: { replies: number };
}

export type NotificationType =
  | 'NEW_VIDEO'
  | 'NEW_COMMENT'
  | 'NEW_SUBSCRIBER'
  | 'NEW_LIKE'
  | 'SYSTEM';

export interface Notification {
  id: string;
  userId: string;
  actorId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  imageUrl: string | null;
  isRead: boolean;
  createdAt: string;
  actor?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface Playlist {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  isPublic: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { items: number };
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

export interface Channel extends User {
  isSubscribed?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}
