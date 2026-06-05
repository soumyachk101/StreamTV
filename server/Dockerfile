# Build stage
FROM node:18-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Production runner stage
FROM node:18-slim AS runner
WORKDIR /app

# Install system dependencies (FFmpeg and FFprobe)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --only=production

# Copy build artifacts and prisma files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Ensure upload directory is created
RUN mkdir -p uploads

ENV NODE_ENV=production
ENV PORT=5050
EXPOSE 5050

# Apply migrations / sync database and start server
CMD npx prisma db push && node dist/index.js
