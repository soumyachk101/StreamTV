'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, BellOff, Share2, Calendar, Video, Users, Eye, Heart, Loader2, ArrowLeft } from 'lucide-react';
import { channelApi, authApi } from '@/lib/services';
import { Channel, Video as VideoType } from '@/lib/types';
import { VideoCard } from '@/components/VideoCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { formatNumber, formatDate, getErrorMessage, getInitials, getMediaUrl } from '@/lib/utils';
import { motion } from 'framer-motion';

type Tab = 'videos' | 'about';

export default function ChannelPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { success, error: toastError } = useToast();

  const [channel, setChannel] = useState<Channel | null>(null);
  const [stats, setStats] = useState<{ subscriberCount: number; videoCount: number; totalViews: number; totalLikes: number; joinedAt: string } | null>(null);
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('videos');
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      channelApi.get(username),
      channelApi.getStats(username).catch(() => null),
      channelApi.getVideos(username, 1, 24).catch(() => ({ items: [], pagination: { total: 0 } })),
    ])
      .then(([ch, st, vs]) => {
        if (!mounted) return;
        setChannel(ch);
        setStats(st);
        setVideos(vs.items);
      })
      .catch(err => {
        if (!mounted) return;
        toastError(getErrorMessage(err, 'Channel not found'));
        router.push('/dashboard');
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [username, router]);

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      router.push(`/login?returnTo=/channel/${username}`);
      return;
    }
    if (!channel) return;
    setSubscribing(true);
    try {
      const res = await channelApi.toggleSubscribe(channel.username);
      setChannel(prev => prev ? { ...prev, isSubscribed: res.subscribed, subscriberCount: res.subscriberCount } : prev);
      success(res.subscribed ? `Subscribed to ${channel.username}` : 'Unsubscribed');
    } catch (err) {
      toastError(getErrorMessage(err, 'Could not update subscription'));
    } finally {
      setSubscribing(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      success('Channel link copied');
    } catch {
      toastError('Could not copy link');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!channel) return null;

  const isOwn = user?.id === channel.id;

  return (
    <div className="min-h-screen bg-background text-foreground pt-20 sm:pt-24 pb-16 font-sans">
      <div className="relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-primary/30 to-secondary/30 overflow-hidden">
        {channel.bannerUrl && (
          <img src={getMediaUrl(channel.bannerUrl)} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 sm:top-6 sm:left-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/80 hover:text-foreground bg-background/60 backdrop-blur-sm px-3 py-1.5 rounded-full transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-soft"
        >
          <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start sm:items-end">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-3xl sm:text-4xl font-heading font-bold border-4 border-card shadow-float overflow-hidden shrink-0">
              {channel.avatarUrl ? (
                <img src={getMediaUrl(channel.avatarUrl)} alt={channel.username} className="w-full h-full object-cover" />
              ) : (
                getInitials(channel.displayName || channel.username)
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground">
                  {channel.displayName || channel.username}
                </h1>
                {channel.isVerified && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">✓ Verified</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">@{channel.username}</p>
              {channel.bio && (
                <p className="text-sm text-foreground/80 mt-2 max-w-2xl">{channel.bio}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users size={13} className="text-primary" />
                  <strong className="text-foreground">{formatNumber(channel.subscriberCount)}</strong> subscribers
                </span>
                <span className="flex items-center gap-1">
                  <Video size={13} className="text-secondary" />
                  <strong className="text-foreground">{formatNumber(channel.videoCount)}</strong> videos
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-info" />
                  Joined {formatDate(channel.createdAt, { year: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              {!isOwn && (
                <button
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className={`flex-1 sm:flex-none h-10 px-5 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    channel.isSubscribed
                      ? 'bg-muted text-foreground hover:bg-muted/70'
                      : 'bg-primary text-primary-foreground hover:scale-105 active:scale-95 shadow-soft'
                  }`}
                >
                  {subscribing ? <Loader2 size={14} className="animate-spin" /> :
                    channel.isSubscribed ? <><Bell size={14} /> Subscribed</> : <><BellOff size={14} /> Subscribe</>
                  }
                </button>
              )}
              <button
                onClick={handleShare}
                className="h-10 w-10 rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center transition-colors"
                aria-label="Share channel"
              >
                <Share2 size={16} />
              </button>
              {isOwn && (
                <Link
                  href="/profile"
                  className="h-10 px-4 rounded-full border border-border bg-card hover:bg-muted font-bold text-xs uppercase tracking-wider flex items-center transition-colors"
                >
                  Edit profile
                </Link>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mt-6 border-b border-border">
          {(['videos', 'about'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'videos' ? `Videos (${videos.length})` : 'About'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="py-8">
          {tab === 'videos' ? (
            videos.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Video size={32} className="mx-auto mb-3 opacity-50" />
                <p>This channel hasn&apos;t uploaded any videos yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {videos.map((v, i) => (
                  <VideoCard key={v.id} video={v} index={i} showChannel={false} />
                ))}
              </div>
            )
          ) : (
            <div className="max-w-2xl space-y-6">
              {channel.bio ? (
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Bio</h3>
                  <p className="text-foreground/90 leading-relaxed">{channel.bio}</p>
                </section>
              ) : (
                <p className="text-muted-foreground italic">No bio provided.</p>
              )}

              {stats && (
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Channel stats</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Subscribers', value: channel.subscriberCount, icon: Users, color: 'text-primary' },
                      { label: 'Videos', value: channel.videoCount, icon: Video, color: 'text-secondary' },
                      { label: 'Total views', value: stats.totalViews, icon: Eye, color: 'text-info' },
                      { label: 'Total likes', value: stats.totalLikes, icon: Heart, color: 'text-destructive' },
                    ].map(s => (
                      <div key={s.label} className="bg-card/60 border border-border/60 rounded-2xl p-4 text-center">
                        <s.icon size={18} className={`mx-auto ${s.color}`} />
                        <div className="text-xl font-heading font-extrabold text-foreground mt-1">
                          {formatNumber(s.value)}
                        </div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Joined</h3>
                <p className="text-foreground">{formatDate(channel.createdAt, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
