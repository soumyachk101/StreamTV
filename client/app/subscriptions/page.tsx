'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Compass, Loader2, Users } from 'lucide-react';
import { channelApi } from '@/lib/services';
import { Channel } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { formatNumber, getErrorMessage, getInitials } from '@/lib/utils';

export default function SubscriptionsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { error } = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login?returnTo=/subscriptions');
      return;
    }
    channelApi.getMySubscriptions()
      .then(setChannels)
      .catch(err => error(getErrorMessage(err, 'Failed to load subscriptions')))
      .finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 sm:pt-28 pb-16 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground flex items-center gap-3">
            <Compass className="text-primary" size={28} />
            Subscriptions
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Channels you follow.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : channels.length === 0 ? (
          <div className="text-center py-20 bg-card/60 rounded-[2rem] border border-border/50">
            <Compass size={32} className="mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">You haven&apos;t subscribed to any channels yet.</p>
            <Link
              href="/dashboard"
              className="inline-flex h-10 px-5 rounded-full bg-primary text-primary-foreground font-bold text-sm"
            >
              Discover channels
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map(c => (
              <Link
                key={c.id}
                href={`/channel/${c.username}`}
                className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl hover:border-primary/40 transition-all hover:shadow-soft"
              >
                <div className="w-14 h-14 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden">
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(c.displayName || c.username)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-bold text-foreground truncate">
                    {c.displayName || c.username}
                    {c.isVerified && <span className="ml-1 text-primary">✓</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">@{c.username}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Users size={11} />
                    {formatNumber(c.subscriberCount)} subscribers
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
