'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Loader2, Calendar, Flame } from 'lucide-react';
import { videoApi } from '@/lib/services';
import { Video } from '@/lib/types';
import { VideoCard } from '@/components/VideoCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { getErrorMessage } from '@/lib/utils';
import { useToast } from '@/components/providers/ToastProvider';

export default function TrendingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { error } = useToast();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login?returnTo=/trending');
      return;
    }
    videoApi.getTrending()
      .then(setVideos)
      .catch(err => error(getErrorMessage(err, 'Failed to load trending videos')))
      .finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 sm:pt-28 pb-16 font-sans">
      <div className="bg-blob bg-secondary/10 w-[500px] h-[500px] rounded-blob-2 top-20 right-[-10%]" />
      <div className="bg-blob bg-primary/10 w-[500px] h-[500px] rounded-blob-1 bottom-10 left-[-10%]" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/15 border border-secondary/30 text-secondary text-[10px] font-extrabold uppercase tracking-wider mb-3">
            <Flame size={10} /> This week
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground flex items-center gap-3">
            <TrendingUp className="text-primary" size={32} />
            Trending streams
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            The most-watched and most-engaged handcrafted videos from the past 7 days.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20 bg-card/60 rounded-[2rem] border border-border/50">
            <TrendingUp size={32} className="mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No trending videos this week yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {videos.map((v, i) => (
              <div key={v.id} className="relative">
                {i < 3 && (
                  <div className="absolute -top-2 -left-2 z-10 w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-heading font-extrabold text-sm shadow-float">
                    {i + 1}
                  </div>
                )}
                <VideoCard video={v} index={i} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
