export interface User {
    id: string;
    email: string;
    password: string;
    username: string;
    avatarUrl?: string;
    createdAt: Date;
}

export interface Session {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
}

export interface Video {
    id: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    videoUrl: string;
    views: number;
    duration?: number;
    userId: string;
    createdAt: Date;
}

class InMemoryDB {
    users: User[] = [];
    sessions: Session[] = [];
    videos: Video[] = [];

    // User Methods
    async findUserByEmail(email: string): Promise<User | undefined> {
        return this.users.find(u => u.email === email);
    }

    async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
        const newUser: User = {
            ...user,
            id: Math.random().toString(36).substring(7),
            createdAt: new Date(),
        };
        this.users.push(newUser);
        return newUser;
    }

    // Video Methods
    async createVideo(video: Omit<Video, 'id' | 'views' | 'createdAt'>): Promise<Video> {
        const newVideo: Video = {
            ...video,
            id: Math.random().toString(36).substring(7),
            views: 0,
            createdAt: new Date(),
        };
        this.videos.push(newVideo);
        return newVideo;
    }

    async getAllVideos(): Promise<Video[]> {
        return this.videos;
    }

    async getVideoById(id: string): Promise<Video | undefined> {
        return this.videos.find(v => v.id === id);
    }
}

export const db = new InMemoryDB();
