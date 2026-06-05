'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { History, Loader2 } from 'lucide-react';
import { channelApi } from '@/lib/services';
import { Video } from '@/lib/types';
import { VideoCard } from '@/components/VideoCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { getErrorMessage } from '@/lib/utils';
import { useToast } from '@/components/providers/ToastProvider';

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { error } = useToast();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login?returnTo=/history');
      return;
    }
    channelApi.getHistory()
      .then(data => setVideos(data.items))
      .catch(err => error(getErrorMessage(err, 'Failed to load history')))
      .finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 sm:pt-28 pb-16 font-sans">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground flex items-center gap-3">
            <History className="text-primary" size={28} />
            Watch history
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Videos you&apos;ve watched recently.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20 bg-card/60 rounded-[2rem] border border-border/50">
            <History size={32} className="mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Your watch history is empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {videos.map((v, i) => (
              <VideoCard key={v.id} video={v} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
