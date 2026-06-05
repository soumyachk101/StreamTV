'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Eye, Clock } from 'lucide-react';
import Link from 'next/link';
import { Video } from '@/lib/types';
import { formatNumber, formatDuration, formatRelativeTime, getMediaUrl } from '@/lib/utils';

interface VideoCardProps {
  video: Video;
  size?: 'sm' | 'md' | 'lg';
  showChannel?: boolean;
  className?: string;
  index?: number;
}

export function VideoCard({ video, size = 'md', showChannel = true, className = '', index = 0 }: VideoCardProps) {
  const [imgError, setImgError] = useState(false);

  const sizes = {
    sm: { title: 'text-sm', meta: 'text-xs' },
    md: { title: 'text-base', meta: 'text-xs' },
    lg: { title: 'text-lg', meta: 'text-sm' },
  } as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
      className={className}
    >
      <Link
        href={`/watch/${video.id}`}
        className="group block bg-card border border-border/60 overflow-hidden shadow-card hover:shadow-float hover:-translate-y-1 transition-all duration-300 rounded-2xl"
      >
        <div className="aspect-video bg-muted relative overflow-hidden">
          {video.thumbnailUrl && !imgError ? (
            <img
              src={getMediaUrl(video.thumbnailUrl)}
              alt={video.title}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/50">
              <Play size={32} className="opacity-40" />
            </div>
          )}

          {/* Play overlay */}
          <div className="absolute inset-0 bg-foreground/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
            <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform">
              <Play size={20} className="text-primary fill-primary ml-0.5" />
            </div>
          </div>

          {/* Duration */}
          {video.duration ? (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-foreground/85 backdrop-blur-sm rounded-md text-xs font-semibold text-background">
              {formatDuration(video.duration)}
            </div>
          ) : null}

          {/* Category badge */}
          {video.category && (
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary/90 backdrop-blur-sm rounded-md text-[10px] font-bold uppercase tracking-wider text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              {video.category.name}
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4">
          <h3 className={`font-heading font-bold ${sizes[size].title} leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors`}>
            {video.title}
          </h3>

          <div className={`flex items-center justify-between ${sizes[size].meta} text-muted-foreground mt-2 font-medium`}>
            <span className="flex items-center gap-1">
              <Eye size={12} />
              {formatNumber(video.views)} views
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatRelativeTime(video.createdAt)}
            </span>
          </div>

          {showChannel && video.user && (
            <Link
              href={`/channel/${video.user.username}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 mt-3 group/channel"
            >
              <div className="w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold font-heading overflow-hidden">
                {video.user.avatarUrl ? (
                  <img src={getMediaUrl(video.user.avatarUrl)} alt={video.user.username} className="w-full h-full object-cover" />
                ) : (
                  (video.user.displayName || video.user.username).charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-xs font-bold text-foreground/80 group-hover/channel:text-primary transition-colors truncate">
                {video.user.displayName || video.user.username}
                {video.user.isVerified && <span className="ml-1 text-primary">✓</span>}
              </span>
            </Link>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
