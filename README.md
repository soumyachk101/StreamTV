# Stream.Tv — Production-Grade Video Streaming Platform

![Stream.Tv Banner](./stream_tv_banner.png)

Welcome to **Stream.Tv**, a commercial-level, production-grade video streaming platform built with Next.js, Express, PostgreSQL, Prisma, and FFmpeg/HLS. This monorepo contains both the frontend client app and the backend API server.

---

## 📖 Table of Contents
1. [Platform Overview](#-platform-overview)
2. [Architecture Diagram](#-architecture-diagram)
3. [Key Workflows](#-key-workflows)
   - [Video Transcoding Pipeline](#video-transcoding-pipeline)
   - [Profile Image Upload Flow](#profile-image-upload-flow)
4. [Tech Stack](#-tech-stack)
5. [Getting Started for Beginners](#-getting-started-for-beginners)
   - [Prerequisites](#1-prerequisites)
   - [Backend Configuration](#2-backend-configuration)
   - [Frontend Configuration](#3-frontend-configuration)
6. [Technical Highlights & Features](#-technical-highlights--features)

---

## 🎬 Platform Overview

Stream.Tv is designed to emulate commercial streaming services (like YouTube or Vimeo) by offering a high-performance, responsive, and secure experience:
* **HLS Adaptive Streaming**: Transcodes uploaded videos in the background into `.m3u8` playlists and `.ts` media chunks.
* **Thumbnail & Duration Extraction**: Uses `ffmpeg` and `ffprobe` to dynamically extract video length and capture a frame as the default preview thumbnail.
* **Secure Asset Storage**: Implements direct image file upload endpoints for user profiles to avoid slow base64 database storage.
* **Subscribers Notification Alert**: Dispatches notifications to subscribers once background video transcoding successfully completes.

---

## 📐 Architecture Diagram

This diagram displays how the client, server, database, and system transcoders communicate with each other:

```mermaid
graph TD
    %% Define components
    subgraph Client [Frontend App Next.js]
        UI[Tactile React UI]
        HlsPlayer[Hls.js / Native Video Player]
        Uploader[XHR Upload Progress Form]
    end

    subgraph Server [Backend REST API Express]
        API[Express Router]
        Multer[Multer File Middleware]
        PR[Prisma ORM Client]
        Proc[Background Video Processor]
    end

    subgraph Storage [Database & Assets]
        DB[(Neon PostgreSQL)]
        Disk[(Server Disk /uploads)]
    end

    %% Interactions
    UI -->|JSON requests & Auth| API
    Uploader -->|Multipart Video/Image file| Multer
    HlsPlayer -->|Request HLS Streams .m3u8| Disk
    Multer -->|Write binary files| Disk
    API -->|Queries & Updates| PR
    PR -->|Connect| DB
    Proc -->|Spawns ffmpeg/ffprobe| Disk
    Proc -->|Update duration & status| PR
```

---

## 🔄 Key Workflows

### Video Transcoding Pipeline
When a creator uploads a video, it goes through an asynchronous background transcoding pipeline so that the user doesn't have to wait for compression/conversion to complete:

```mermaid
sequenceDiagram
    autonumber
    actor Creator as User/Creator
    participant Client as Frontend (Next.js)
    participant Server as Backend (Express)
    participant Worker as Background transcode
    participant DB as PostgreSQL (Neon)

    Creator->>Client: Drag & drop video, add title/tags, click Publish
    Client->>Server: POST /api/videos/upload (Multipart FormData)
    Note over Client,Server: Client tracks real-time progress (0% - 100%) via XHR events
    Server->>DB: Create Video record (status: 'PROCESSING', duration: 0)
    Server->>Client: Return 201 Created (Video Object)
    Note over Client: Client Watch Page redirects to `/watch/:id`<br/>Displays: "Video is currently processing..."
    Server->>Worker: Trigger processVideoInBackground() asynchronously
    Note over Server: Server does not block; returns immediate response to creator
    
    activate Worker
    Worker->>Worker: Run ffprobe to extract true video duration
    Worker->>Worker: Run ffmpeg to capture thumbnail frame at 00:00:01
    Worker->>Worker: Run ffmpeg to transcode video to HLS (.m3u8 + .ts segments)
    Worker->>DB: Update Video (duration, thumbnailUrl, hlsUrl, status: 'PUBLISHED')
    Worker->>DB: Create notifications (type: 'NEW_VIDEO') for all channel subscribers
    deactivate Worker

    Note over Client,DB: Client Watch Page polls `/api/videos/:id` every 5s
    DB-->>Client: Returns updated Video object (status: 'PUBLISHED')
    Note over Client: UI dynamically hides processing state and loads Hls.js streaming player
```

### Profile Image Upload Flow
We avoid writing raw image files as base64 data strings into the relational database. Instead, images are uploaded directly to the filesystem and saved as URL paths:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as Frontend (Next.js)
    participant Server as Backend (Express)
    participant DB as PostgreSQL (Neon)

    User->>Client: Select avatar file (Click camera button)
    Client->>Server: POST /api/auth/upload-avatar (file)
    Note over Server: Multer validates limits (Max 2MB, Image format)
    Server-->>Client: Return 200 JSON { url: "/uploads/avatar-xyz.png" }
    Note over Client: Displays instant preview using the returned URL path
    User->>Client: Edit bio / displayName, click "Save Changes"
    Client->>Server: PATCH /api/auth/me (avatarUrl: "/uploads/avatar-xyz.png", bio, etc)
    Server->>DB: Update User record
    DB-->>Client: Return updated User profile object
    Client-->>User: Toast success alert ("Profile updated")
```

---

## 🛠 Tech Stack

| Component | Technologies Used | Description |
|---|---|---|
| **Frontend** | React 19, Next.js 16 (App Router), Framer Motion, Lucide React, TailwindCSS | Elegant, skeuomorphic, and fully responsive user interface. |
| **Video Player** | `hls.js`, HTML5 Video Element | Dynamic adaptive bitrate video player with native iOS Safari fallbacks. |
| **Backend** | Node.js, Express 5, TypeScript 5, Multer | Modular controllers, strict validation schemas, rate-limiting, and error handlers. |
| **Database** | PostgreSQL (Neon Cloud), Prisma ORM | Relational database modeling with efficient indexes and transaction logs. |
| **Media Engine** | FFmpeg, FFprobe (System binaries) | Automated media stream parsing, frame captures, and HLS encoding. |

---

## 🚀 Getting Started for Beginners

Follow these steps to run Stream.Tv on your local development machine:

### 1. Prerequisites
Ensure you have the following installed:
* **Node.js** (v18 or higher): [Download here](https://nodejs.org)
* **Git**: [Download here](https://git-scm.com)
* **FFmpeg & FFprobe**:
  * **macOS (via Homebrew)**: `brew install ffmpeg`
  * **Windows (via Chocolatey)**: `choco install ffmpeg`
  * **Linux (Ubuntu/Debian)**: `sudo apt update && sudo apt install ffmpeg`
  Verify installation by running: `ffmpeg -version` and `ffprobe -version`

---

### 2. Backend Configuration

1. **Open terminal** and navigate to the server directory:
   ```bash
   cd server
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env` file inside the `server/` directory:
   ```env
   PORT=5050
   DATABASE_URL="postgresql://your_username:your_password@localhost:5432/neondb?sslmode=require"
   JWT_SECRET="YOUR_RANDOM_LONG_SECRET_STRING_32_CHARACTERS"
   JWT_EXPIRES_IN="7d"
   BCRYPT_ROUNDS=10
   UPLOAD_MAX_SIZE=524288000 # 500MB in bytes
   CORS_ORIGIN="http://localhost:3000"
   ```
4. **Synchronize DB Schema**:
   Generate client and push the schema to your PostgreSQL database:
   ```bash
   npm run db:push
   ```
5. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   The backend API will run at `http://localhost:5050`.

---

### 3. Frontend Configuration

1. **Open a new terminal window** and navigate to the client directory:
   ```bash
   cd client
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env.local` file inside the `client/` directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5050
   ```
4. **Start Next.js Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000` to start watching!

---

## 💎 Technical Highlights & Features

### Upload Progress Updates (XHR Hook)
Standard `fetch` API doesn't support request upload progress updates natively. Stream.Tv uses an XMLHttpRequest upload tracker to compute progress percentages:
```typescript
xhr.upload.addEventListener('progress', (e) => {
  if (e.lengthComputable) {
    const percent = Math.round((e.loaded / e.total) * 100);
    onProgress(percent); // Updates state dynamically in UI
  }
});
```

### Direct vs Base64 Storage Comparison
| Metrics | Base64 Database Storage (Legacy) | Disk Storage + URLs (Stream.Tv Upgraded) |
|---|---|---|
| **Database Bloat** | Highly bloated (Increases table sizes by ~33%). | Small (Saves only short text URLs in DB). |
| **API Speed** | Slow payload transfers; triggers server timeout on large images. | Instant transfers; optimized byte delivery. |
| **Client Caching** | Images cannot be cached effectively by the browser. | Fully cached via Nginx/Express static cache-control. |
| **Scalability** | Relational databases scale poorly under heavy binary storage. | Scales infinitely (easily moves to AWS S3/Cloudfront). |
