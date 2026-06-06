# Stream.Tv — Production-Grade Video Streaming Platform

![Stream.Tv Banner](./stream_tv_banner.png)

Stream.Tv is a high-performance, production-grade video streaming platform built as a monorepo with **Next.js**, **Express**, **PostgreSQL**, **Prisma**, and **FFmpeg/HLS**. This platform supports adaptive bitrate streaming, background transcoding pipelines, direct-to-disk profile assets, and subscriber notification alerts.

---

## 🎥 Working Application Demo

Below is an animation demonstrating the complete workflow: user sign-up, profile banner upload (direct-to-disk), uploading an MP4 video file with a real-time progress bar, waiting for the background transcoding to complete, and streaming the HLS video:

![Walkthrough Demo](./stream_tv_demo.webp)

---

## 📖 Table of Contents
1. [Platform Overview](#-platform-overview)
2. [Monorepo Directory Layout](#-monorepo-directory-layout)
3. [System Architecture](#-system-architecture)
4. [Core Workflows](#-core-workflows)
   - [HLS Video Transcoding Pipeline](#hls-video-transcoding-pipeline)
   - [Profile Image Upload Flow](#profile-image-upload-flow)
5. [Tech Stack](#-tech-stack)
6. [Getting Started for Beginners](#-getting-started-for-beginners)
   - [1. Prerequisites](#1-prerequisites)
   - [2. Backend Configuration](#2-backend-configuration)
   - [3. Frontend Configuration](#3-frontend-configuration)
7. [Technical Highlights & Features](#-technical-highlights--features)
8. [Troubleshooting Guide](#-troubleshooting-guide)

---

## 🎬 Platform Overview

Stream.Tv is designed to emulate commercial streaming platforms (like YouTube or Vimeo) by offering a high-performance, responsive, and secure experience:
* **HLS Adaptive Bitrate Streaming**: Transcodes uploaded videos in the background into `.m3u8` master playlists and `.ts` media segments.
* **Metadata & Duration Extraction**: Automatically extracts the true video duration using `ffprobe` and saves it to the database.
* **Default Preview Thumbnail**: Uses `ffmpeg` to capture a frame from the video at `00:00:01` and saves it as the default preview thumbnail.
* **Secure Asset Storage**: Implements direct image file upload endpoints for user profiles to avoid slow and bloated base64 database storage.
* **Subscribers Notification Alert**: Dispatches notifications to subscribers once background video transcoding successfully completes.
* **Tactile Design**: Sleek, earth-inspired aesthetic built with Tailwind CSS, custom mesh gradients, and Framer Motion.

---

## 📂 Monorepo Directory Layout

```
Stream.Tv/
├── client/                     # Next.js Frontend Application
│   ├── app/                    # Next.js App Router Pages
│   │   ├── upload/page.tsx     # Video Upload page with XHR hook
│   │   └── watch/[id]/page.tsx # HLS Player & status polling page
│   ├── components/             # Reusable UI Components & Providers
│   ├── lib/                    # Client API & Utility Services
│   └── package.json            # Client dependencies and scripts
│
├── server/                     # Express Backend API Server
│   ├── prisma/
│   │   └── schema.prisma       # Prisma Database schema (PostgreSQL)
│   ├── src/
│   │   ├── controllers/        # Route controllers
│   │   ├── middleware/         # Multer & JWT Auth middlewares
│   │   ├── routes/             # REST API endpoint definitions
│   │   ├── utils/
│   │   │   └── videoProcessor.ts # FFmpeg & HLS transcoder worker
│   │   └── index.ts            # App entrypoint & server setup
│   └── package.json            # Server dependencies and scripts
│
├── stream_tv_banner.png        # Repository visual banner
└── stream_tv_demo.webp         # Walkthrough walkthrough animation
```

---

## 📐 System Architecture

This diagram displays how the client app, Express server, PostgreSQL database, and system transcoders communicate with each other:

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

## 🔄 Core Workflows

### HLS Video Transcoding Pipeline
When a creator uploads a video, it goes through an asynchronous background transcoding pipeline. The server responds immediately, allowing the creator to navigate away while the video is optimized:

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
    Note over Server: Server does not block and returns immediate response to creator
    
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
To keep database payloads lightweight, user profile avatars and channel banners are stored directly on the server's disk space, with only their URL paths saved to the database:

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
| **Frontend** | React 19, Next.js 16 (App Router), Framer Motion, Lucide React, Tailwind CSS | Elegant, tactile, and fully responsive user interface with mesh gradients. |
| **Video Player** | `hls.js`, HTML5 Video Element | Dynamic adaptive bitrate video player with native iOS Safari fallbacks. |
| **Backend** | Node.js, Express 5, TypeScript 5, Multer | Modular controllers, strict validation schemas, rate-limiting, and error handlers. |
| **Database** | PostgreSQL (Neon Cloud), Prisma ORM | Relational database modeling with efficient indexes and cascade deletions. |
| **Media Engine** | FFmpeg, FFprobe (System binaries) | Automated media stream parsing, frame captures, and HLS segments encoding. |

---

## 🚀 Getting Started for Beginners

Follow these steps to set up and run Stream.Tv on your local machine:

### 1. Prerequisites
Ensure you have the following installed before starting:
* **Node.js** (v18 or higher): [Download here](https://nodejs.org)
* **Git**: [Download here](https://git-scm.com)
* **FFmpeg & FFprobe**:
  * **macOS (via Homebrew)**: `brew install ffmpeg`
  * **Windows (via Chocolatey)**: `choco install ffmpeg`
  * **Linux (Ubuntu/Debian)**: `sudo apt update && sudo apt install ffmpeg`
  Verify installation by running: `ffmpeg -version` and `ffprobe -version` in your terminal.

---

### 2. Backend Configuration

1. Open your terminal and navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Environment Variables:
   Create a `.env` file inside the `server/` directory:
   ```env
   PORT=5050
   DATABASE_URL="postgresql://neondb_owner:npg_aT8fvQYsOc3P@ep-nameless-dream-aidkt769-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"
   JWT_SECRET="YOUR_RANDOM_LONG_SECRET_STRING_32_CHARACTERS"
   JWT_EXPIRES_IN="7d"
   BCRYPT_ROUNDS=10
   UPLOAD_MAX_SIZE=524288000 # 500MB in bytes
   CORS_ORIGIN="http://localhost:3000"
   ```
4. Synchronize DB Schema:
   Generate the Prisma client and push the schema to PostgreSQL:
   ```bash
   npm run db:push
   ```
5. Start Development Server:
   ```bash
   npm run dev
   ```
   The backend API will now run at `http://localhost:5050`.

---

### 3. Frontend Configuration

1. Open a new terminal window and navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Environment Variables:
   Create a `.env.local` file inside the `client/` directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5050
   ```
4. Start Next.js Development Server:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000` to start watching!

---

## 💎 Technical Highlights & Features

### Upload Progress Updates (XHR Hook)
Standard `fetch` or Axios request wrappers do not natively track upload progress percentages. Stream.Tv utilizes an XMLHTTPRequest event listener wrapped inside a custom file uploader to compute progress:
```typescript
xhr.upload.addEventListener('progress', (e) => {
  if (e.lengthComputable) {
    const percent = Math.round((e.loaded / e.total) * 100);
    onProgress(percent); // Updates state dynamically in UI
  }
});
```
*Checkout the upload implementation in [upload/page.tsx](file:///Users/soumyachakraborty/Documents/D/Stream.Tv/client/app/upload/page.tsx).*

### HLS Player Configuration
In [watch/[id]/page.tsx](file:///Users/soumyachakraborty/Documents/D/Stream.Tv/client/app/watch/[id]/page.tsx), the player checks if HLS streaming is supported by the browser. If not (e.g. Chrome/Firefox), it binds the `.m3u8` playlist stream via the `hls.js` library; if native HLS is supported (Safari), it plays it natively:
```typescript
if (Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource(hlsUrl);
  hls.attachMedia(videoElement);
} else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
  videoElement.src = hlsUrl;
}
```

### Direct vs Base64 Storage Comparison
| Metrics | Base64 Database Storage (Legacy) | Disk Storage + URLs (Stream.Tv Upgraded) |
|---|---|---|
| **Database Bloat** | Highly bloated (Increases table sizes by ~33%). | Small (Saves only short text URLs in DB). |
| **API Speed** | Slow payload transfers; triggers server timeout on large images. | Instant transfers; optimized byte delivery. |
| **Client Caching** | Images cannot be cached effectively by the browser. | Fully cached via static cache-control. |
| **Scalability** | Relational databases scale poorly under heavy binary storage. | Scales infinitely (easily moves to S3/Cloudfront). |

---

## 🌐 Deployment Guide

This section outlines how to deploy Stream.Tv to cloud environments:

### 1. Database (PostgreSQL)
* Use a cloud-managed PostgreSQL database like **Neon Cloud PostgreSQL**, **Supabase**, or **AWS RDS**.
* Ensure you add `?sslmode=require` to the end of the database connection string in your production environment.
* Run database setup commands during your CI/CD build step:
  ```bash
  npx prisma db push
  ```

### 2. Backend API Server (Express)
The server requires **FFmpeg** and **FFprobe** system binaries to transcode videos.
* **Option A: Railway / Render (Using Docker)**:
  Create a `Dockerfile` in the `server/` directory:
  ```dockerfile
  FROM node:18-slim
  RUN apt-get update && apt-get install -y ffmpeg
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npx prisma generate
  RUN npm run build
  EXPOSE 5050
  CMD ["npm", "start"]
  ```
  Deploying with Docker is highly recommended because it packages system dependencies like FFmpeg directly into the build.
* **Option B: Virtual Private Server (VPS / DigitalOcean / AWS EC2)**:
  1. SSH into your VPS.
  2. Install Node.js, Git, PM2 (`npm install -g pm2`), and FFmpeg (`sudo apt install ffmpeg`).
  3. Clone the repository, navigate to `server/`, create `.env`, and install dependencies (`npm install`).
  4. Run `npx prisma db push` and `npm run build`.
  5. Start the backend process using PM2:
     ```bash
     pm2 start dist/index.js --name "stream-tv-server"
     ```
* **Persistent Disk Mount**:
  Because standard cloud container deployments are ephemeral, uploaded videos and thumbnails will be lost when the container restarts.
  * Mount a persistent disk volume (e.g. **Render Disk** or **Railway Volume**) to the `/app/uploads` path on the server container.

### 3. Frontend Application (Next.js)
* Deploy the `client/` folder to **Vercel** or **Netlify**.
* Configure the build settings:
  * **Build Command**: `npm run build`
  * **Output Directory**: `.next`
* Configure Environment Variables:
  * Set `NEXT_PUBLIC_API_URL` to your backend production URL (e.g. `https://your-api.railway.app`).

---

## 🔧 Troubleshooting Guide

> [!NOTE]
> Here are solutions to common setup issues encountered by developers setting up the platform.

### 1. Prisma Client connection error
* **Symptom**: `PrismaClientInitializationError: Can't reach database server...`
* **Fix**: Ensure that the database URL has `?sslmode=require` appended at the end of the query string. This is required for secure cloud platforms like Neon PostgreSQL.

### 2. FFmpeg binary not found on local path
* **Symptom**: `Error: spawn ffmpeg ENOENT` or `spawn ffprobe ENOENT`
* **Fix**: This means FFmpeg is not installed on your operating system or is not added to your system path.
  * Run `ffmpeg -version` in your terminal to verify it is accessible.
  * If you installed FFmpeg on Windows via Chocolatey or manual download, make sure to restart your IDE or terminal to load the new environment path.

### 3. File upload limits error
* **Symptom**: `PayloadTooLargeError: request entity too large` or `MulterError: File too large`
* **Fix**: The backend Express server has a upload file size limit of 500MB (defined by `UPLOAD_MAX_SIZE` in the `.env` file). Increase this value if you intend to upload files larger than 500MB.

### 4. CORS block on client upload
* **Symptom**: `Access to fetch at 'http://localhost:5050/api/...' from origin 'http://localhost:3000' has been blocked by CORS policy`
* **Fix**: Make sure `CORS_ORIGIN` in the backend `.env` file matches your frontend domain exactly (`http://localhost:3000`).

---

*Developed and maintained by Soumya Chakraborty.*

---

## 🤝 Contributing & Collaboration

I am always open to meaningful collaborations. If you have ideas for improvements, bug fixes, or new features, feel free to:
1. **Fork** the repository.
2. **Create** a new feature branch.
3. **Submit** a pull request.

Let's build something great together!

---

