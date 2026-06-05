'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Play, TrendingUp, Radio, Flame, Music, Gamepad2, Search as SearchIcon, Sparkles, Tv, Mic2, Film, BookOpen, Heart, Compass } from 'lucide-react';
import { videoApi } from '@/lib/services';
import { Video, Category } from '@/lib/types';
import { VideoCard } from '@/components/VideoCard';
import { motion } from 'framer-motion';
import { formatNumber, getErrorMessage } from '@/lib/utils';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';

const CATEGORY_ICONS: Record<string, any> = {
  All: Flame,
  Trending: TrendingUp,
  Live: Radio,
  Music: Music,
  Gaming: Gamepad2,
  Entertainment: Tv,
  Podcasts: Mic2,
  Movies: Film,
  Education: BookOpen,
  Lifestyle: Heart,
  Travel: Compass,
  default: Sparkles,
};

const SORTS = [
  { value: 'recent', label: 'Newest' },
  { value: 'popular', label: 'Most viewed' },
  { value: 'liked', label: 'Most liked' },
  { value: 'trending', label: 'Trending' },
] as const;

function VideoFeed() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { error } = useToast();
  const searchParams = useSearchParams();
  const search = searchParams.get('search') || '';
  const categorySlug = searchParams.get('category') || '';
  const sort = (searchParams.get('sort') as typeof SORTS[number]['value']) || 'recent';

  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [stats, setStats] = useState({ totalVideos: 0, totalViews: 0 });
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    setAuthChecked(true);
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!authChecked) return;
    videoApi.getCategories().then(setCategories).catch(() => {});
    videoApi.getTrending().then(setTrendingVideos).catch(() => {});
  }, [authChecked]);

  useEffect(() => {
    if (!authChecked) return;
    setLoading(true);
    setVideos([]);
    setPage(1);
    setHasMore(true);

    const params: any = { page: 1, pageSize: 12, sort };
    if (search) params.search = search;
    if (categorySlug) params.category = categorySlug;

    videoApi.list(params)
      .then(data => {
        setVideos(data.items);
        setHasMore(data.pagination.hasMore);
        setStats({ totalVideos: data.pagination.total, totalViews: 0 });
      })
      .catch(err => error(getErrorMessage(err, 'Failed to load videos')))
      .finally(() => setLoading(false));
  }, [search, categorySlug, sort, authChecked]);

  useEffect(() => {
    if (!hasMore || loadingMore || loading) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setLoadingMore(true);
          const nextPage = page + 1;
          const params: any = { page: nextPage, pageSize: 12, sort };
          if (search) params.search = search;
          if (categorySlug) params.category = categorySlug;

          videoApi.list(params)
            .then(data => {
              setVideos(prev => [...prev, ...data.items]);
              setHasMore(data.pagination.hasMore);
              setPage(nextPage);
            })
            .catch(err => error(getErrorMessage(err, 'Failed to load more videos')))
            .finally(() => setLoadingMore(false));
        }
      },
      { rootMargin: '200px' }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, search, categorySlug, sort]);

  if (!authChecked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground pt-24 sm:pt-28 pb-16 font-sans relative overflow-hidden">
      <div className="bg-blob bg-primary/10 w-[500px] h-[500px] rounded-blob-1 top-20 right-[-10%]" />
      <div className="bg-blob bg-secondary/10 w-[500px] h-[500px] rounded-blob-2 bottom-10 left-[-10%]" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Hero Banner - only when no search/filter */}
        {!search && !categorySlug && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10 bg-accent/30 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 md:p-14 relative overflow-hidden border border-border/40 shadow-soft"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5" />
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/10 rounded-blob-1 filter blur-3xl" />
            <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-secondary/10 rounded-blob-2 filter blur-3xl" />

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/15 border border-secondary/30 text-secondary text-[10px] font-extrabold uppercase tracking-wider">
                  <Flame size={10} /> Mindful curation
                </div>
                <h1 className="text-3xl md:text-5xl font-heading font-extrabold text-foreground leading-tight">
                  Embrace the <span className="text-primary italic font-normal">wabi-sabi</span> flow of video
                </h1>
                <p className="text-sm md:text-base text-muted-foreground max-w-lg leading-relaxed">
                  Discover serene nature clips, artisan tutorials, and human stories crafted with care. Your organic digital gallery awaits.
                </p>
                <div className="flex gap-3 pt-2">
                  <Link
                    href="/trending"
                    className="h-11 px-5 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-soft hover:scale-105 active:scale-95 transition-transform inline-flex items-center gap-2"
                  >
                    <TrendingUp size={16} /> Trending
                  </Link>
                  <Link
                    href="/upload"
                    className="h-11 px-5 rounded-full border-2 border-secondary text-secondary hover:bg-secondary/5 font-bold text-sm transition-all hover:scale-105 active:scale-95 inline-flex items-center"
                  >
                    Share yours
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Search results header */}
        {(search || categorySlug) && (
          <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground">
                {search ? (
                  <>Results for &ldquo;<span className="text-primary">{search}</span>&rdquo;</>
                ) : (
                  <>Category: <span className="text-primary">{categories.find(c => c.slug === categorySlug)?.name || categorySlug}</span></>
                )}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {stats.totalVideos} {stats.totalVideos === 1 ? 'video' : 'videos'} found
              </p>
            </div>
            {(search || categorySlug) && (
              <Link
                href="/dashboard"
                className="text-sm text-secondary hover:underline"
              >
                Clear filters
              </Link>
            )}
          </div>
        )}

        {/* Category pills */}
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-3 scrollbar-hide mb-6 -mx-4 sm:mx-0 px-4 sm:px-0">
          <CategoryPill
            icon={Flame}
            name="All"
            isActive={!categorySlug}
            onClick={() => router.push('/dashboard')}
          />
          {categories.map(cat => {
            const Icon = CATEGORY_ICONS[cat.name] || CATEGORY_ICONS.default;
            return (
              <CategoryPill
                key={cat.id}
                icon={Icon}
                name={cat.name}
                isActive={categorySlug === cat.slug}
                onClick={() => router.push(`/dashboard?category=${cat.slug}`)}
              />
            );
          })}
        </div>

        {/* Sort + count */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3 border-b border-border/40 pb-4">
          <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="text-primary" size={20} />
            {search ? 'Search results' : categorySlug ? 'Category videos' : 'Recommended streams'}
          </h2>
          <div className="flex gap-2">
            {SORTS.map(s => (
              <button
                key={s.value}
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set('sort', s.value);
                  router.push(`/dashboard?${params.toString()}`);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  sort === s.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card border border-border/60 rounded-2xl overflow-hidden">
                <div className="aspect-video skeleton" />
                <div className="p-4 space-y-2">
                  <div className="h-4 skeleton w-3/4" />
                  <div className="h-3 skeleton w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <EmptyState search={search} category={!!categorySlug} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
              {videos.map((video, i) => (
                <VideoCard key={video.id} video={video} index={i} />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center items-center py-12">
                {loadingMore && (
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            )}

            {!hasMore && videos.length > 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <Sparkles size={16} className="inline mr-2" />
                You&apos;ve reached the end
              </div>
            )}
          </>
        )}

        {/* Trending strip when no filters */}
        {!search && !categorySlug && trendingVideos.length > 0 && videos.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-heading font-extrabold text-foreground mb-6 flex items-center gap-2">
              <Flame className="text-secondary" size={22} />
              Trending this week
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
              {trendingVideos.slice(0, 4).map((video, i) => (
                <VideoCard key={video.id} video={video} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function CategoryPill({ icon: Icon, name, isActive, onClick }: { icon: any; name: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 border shrink-0 ${
        isActive
          ? 'bg-primary border-primary text-primary-foreground shadow-soft'
          : 'bg-card/60 border-border text-muted-foreground hover:bg-card hover:text-foreground'
      }`}
    >
      <Icon size={14} />
      {name}
    </button>
  );
}

function EmptyState({ search, category }: { search: string; category: boolean }) {
  return (
    <div className="text-center py-20 bg-card/60 rounded-[2rem] border border-border/50 shadow-soft flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 ring-1 ring-primary/20">
        {search ? <SearchIcon size={26} className="text-primary" /> : <Play size={26} className="text-primary ml-0.5 fill-primary" />}
      </div>
      <h3 className="text-2xl font-heading font-extrabold text-foreground mb-2 relative z-10">
        {search ? 'No results found' : category ? 'No videos in this category' : 'No videos yet'}
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-6 relative z-10 px-4 text-sm">
        {search
          ? `We couldn't find anything matching "${search}". Try a different search term.`
          : category
            ? 'Check back later, or browse other categories.'
            : 'Be the first to share a handcrafted video with the community.'}
      </p>
      <Link
        href="/upload"
        className="h-11 px-6 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-soft transition-transform hover:scale-105 active:scale-95 inline-flex items-center justify-center relative z-10"
      >
        Upload your first video
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <VideoFeed />
    </Suspense>
  );
}
