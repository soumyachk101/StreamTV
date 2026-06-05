'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Play, ArrowLeft, Eye, Calendar, Sparkles, ThumbsUp, ThumbsDown,
  Share2, Bell, BellOff, MessageCircle, MoreVertical, Loader2
} from 'lucide-react';
import { videoApi, channelApi, playlistApi } from '@/lib/services';
import { Video, Comment, Channel } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { VideoCard } from '@/components/VideoCard';
import { formatNumber, formatDuration, formatDate, formatRelativeTime, getInitials, getErrorMessage, getMediaUrl } from '@/lib/utils';
import { motion } from 'framer-motion';
import Hls from 'hls.js';

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuth();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();

  const [video, setVideo] = useState<Video | null>(null);
  const [related, setRelated] = useState<Video[]>([]);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDescription, setShowDescription] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [savedProgress, setSavedProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressReportedRef = useRef(false);
  const watchStartRef = useRef<number>(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      videoApi.get(id),
      videoApi.getRelated(id).catch(() => []),
    ])
      .then(([v, r]) => {
        if (!mounted) return;
        setVideo(v);
        setRelated(r);
        setLikes(v.likes);
        if (v.user) {
          channelApi.get(v.user.username).then(setChannel).catch(() => {});
        }
      })
      .catch(err => {
        if (!mounted) return;
        setError(getErrorMessage(err, 'Video not found'));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    if (isAuthenticated) {
      videoApi.getLikeStatus(id).then(s => {
        if (mounted) setLiked(s.liked);
      }).catch(() => {});
    }

    return () => { mounted = false; };
  }, [id, isAuthenticated]);

  useEffect(() => {
    if (!video) return;
    setCommentsLoading(true);
    videoApi.getComments(video.id, 1, 20)
      .then(data => {
        setComments(data.items);
        setCommentCount(data.pagination.total);
      })
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [video?.id]);

  // Poll video status if processing
  useEffect(() => {
    if (!video || video.status !== 'PROCESSING') return;

    const interval = setInterval(async () => {
      try {
        const v = await videoApi.get(video.id);
        if (v.status !== 'PROCESSING') {
          setVideo(v);
          toastSuccess('Video processing completed!');
        }
      } catch {
        // ignore
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [video?.id, video?.status]);

  // View tracking
  useEffect(() => {
    if (!video) return;
    watchStartRef.current = Date.now();
    progressReportedRef.current = false;

    return () => {
      // On unmount, send final view tracking
      if (!video || progressReportedRef.current) return;
      const watchTime = (Date.now() - watchStartRef.current) / 1000;
      const duration = videoRef.current?.duration || video.duration || 0;
      const percentage = duration > 0 ? Math.min(100, (watchTime / duration) * 100) : 0;
      if (watchTime >= 5 || percentage >= 25) {
        progressReportedRef.current = true;
        videoApi.recordView(video.id, Math.round(watchTime), Math.round(percentage))
          .catch(() => {});
      }
    };
  }, [video?.id]);

  // Save progress periodically
  useEffect(() => {
    if (!video || !videoRef.current) return;
    const v = videoRef.current;
    const handler = () => {
      if (v.duration > 0) {
        setSavedProgress((v.currentTime / v.duration) * 100);
      }
    };
    v.addEventListener('timeupdate', handler);
    return () => v.removeEventListener('timeupdate', handler);
  }, [video?.id]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      router.push(`/login?returnTo=/watch/${id}`);
      return;
    }
    try {
      const res = await videoApi.toggleLike(id);
      setLiked(res.liked);
      setLikes(res.likes);
    } catch (err) {
      toastError(getErrorMessage(err, 'Could not like video'));
    }
  };

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      router.push(`/login?returnTo=/watch/${id}`);
      return;
    }
    if (!channel) return;
    setSubscribing(true);
    try {
      const res = await channelApi.toggleSubscribe(channel.username);
      setChannel(prev => prev ? { ...prev, isSubscribed: res.subscribed, subscriberCount: res.subscriberCount } : prev);
      toastSuccess(res.subscribed ? `Subscribed to ${channel.displayName || channel.username}` : 'Unsubscribed');
    } catch (err) {
      toastError(getErrorMessage(err, 'Could not update subscription'));
    } finally {
      setSubscribing(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: video?.title, url });
        return;
      } catch { /* fallback */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      toastSuccess('Link copied to clipboard');
    } catch {
      toastError('Could not copy link');
    }
  };

  const handleAddToPlaylist = async () => {
    if (!isAuthenticated) {
      router.push(`/login?returnTo=/watch/${id}`);
      return;
    }
    setShowPlaylistMenu(true);
    try {
      const data = await playlistApi.list();
      setPlaylists(data);
    } catch (err) {
      toastError('Could not load playlists');
    }
  };

  const handleAddToSpecificPlaylist = async (playlistId: string) => {
    try {
      await playlistApi.addVideo(playlistId, id);
      toastSuccess('Added to playlist');
      setShowPlaylistMenu(false);
    } catch (err) {
      toastError(getErrorMessage(err, 'Could not add to playlist'));
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push(`/login?returnTo=/watch/${id}`);
      return;
    }
    if (!newComment.trim() || !video) return;

    setSubmittingComment(true);
    try {
      const c = await videoApi.addComment(video.id, newComment.trim());
      setComments(prev => [c, ...prev]);
      setCommentCount(c => c + 1);
      setNewComment('');
      toastSuccess('Comment posted');
    } catch (err) {
      toastError(getErrorMessage(err, 'Could not post comment'));
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Loading…</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md space-y-6 rounded-[2rem] bg-card p-8 border border-border/50 text-center shadow-soft">
          <h2 className="text-xl font-heading font-extrabold text-destructive">Unable to load video</h2>
          <p className="text-sm text-muted-foreground">{error || 'This video is unavailable.'}</p>
          <Link
            href="/dashboard"
            className="inline-flex h-10 px-6 rounded-full bg-primary text-primary-foreground font-bold text-sm items-center gap-2"
          >
            <ArrowLeft size={16} /> Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const videoSrc = video
    ? getMediaUrl(video.hlsUrl || video.videoUrl)
    : '';

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !videoSrc || video.status === 'PROCESSING') return;

    let hls: Hls | null = null;

    if (videoSrc.endsWith('.m3u8') || videoSrc.includes('.m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(videoSrc);
        hls.attachMedia(videoEl);
      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = videoSrc;
      }
    } else {
      videoEl.src = videoSrc;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      videoEl.src = '';
    };
  }, [videoSrc, video?.status]);

  const isOwnVideo = user?.id === video.user.id;

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 sm:pt-28 pb-16 font-sans relative">
      <div className="bg-blob bg-primary/5 w-[400px] h-[400px] rounded-blob-1 top-20 right-[-10%] pointer-events-none" />
      <div className="bg-blob bg-secondary/5 w-[400px] h-[400px] rounded-blob-2 bottom-10 left-[-10%] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-5">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>

            {/* Video Player */}
            <div className="bg-card border border-border/50 rounded-2xl sm:rounded-3xl p-2 sm:p-3 shadow-float">
              <div className="aspect-video bg-foreground rounded-xl sm:rounded-2xl overflow-hidden relative group">
                {video.status === 'PROCESSING' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-neutral-900">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 ring-1 ring-primary/20 animate-pulse">
                      <Loader2 className="animate-spin text-primary w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-heading font-extrabold text-white mb-1">Your video is processing</h3>
                    <p className="text-sm text-neutral-400 max-w-sm">
                      We are currently generating HLS adaptive bitrate segments and extracting duration. This page will auto-refresh once ready.
                    </p>
                  </div>
                ) : videoSrc ? (
                  <video
                    ref={videoRef}
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain"
                    poster={video.thumbnailUrl ? getMediaUrl(video.thumbnailUrl) : undefined}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <p>Video file is unavailable</p>
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground leading-tight">
              {video.title}
            </h1>

            {/* Channel + actions row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/40">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <Link href={`/channel/${video.user.username}`} className="shrink-0">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-base overflow-hidden">
                    {video.user.avatarUrl ? (
                      <img src={getMediaUrl(video.user.avatarUrl)} alt={video.user.username} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(video.user.displayName || video.user.username)
                    )}
                  </div>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/channel/${video.user.username}`} className="font-heading font-bold text-base text-foreground hover:text-primary transition-colors flex items-center gap-1">
                    <span className="truncate">{video.user.displayName || video.user.username}</span>
                    {video.user.isVerified && <span className="text-primary text-xs">✓</span>}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(channel?.subscriberCount || 0)} subscribers
                  </p>
                </div>
                {!isOwnVideo && (
                  <button
                    onClick={handleSubscribe}
                    disabled={subscribing}
                    className={`h-9 sm:h-10 px-4 sm:px-5 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      channel?.isSubscribed
                        ? 'bg-muted text-foreground hover:bg-muted/70'
                        : 'bg-primary text-primary-foreground hover:scale-105 active:scale-95 shadow-soft'
                    }`}
                  >
                    {channel?.isSubscribed ? (
                      <><Bell size={14} /> Subscribed</>
                    ) : (
                      <><BellOff size={14} /> Subscribe</>
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleLike}
                  className={`h-9 sm:h-10 px-3 sm:px-4 rounded-full border font-bold text-xs transition-all flex items-center gap-1.5 ${
                    liked
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border bg-card hover:bg-muted'
                  }`}
                >
                  <ThumbsUp size={14} className={liked ? 'fill-current' : ''} />
                  {formatNumber(likes)}
                </button>
                <button
                  onClick={handleShare}
                  className="h-9 sm:h-10 px-3 sm:px-4 rounded-full border border-border bg-card hover:bg-muted font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Share2 size={14} /> Share
                </button>
                <div className="relative">
                  <button
                    onClick={handleAddToPlaylist}
                    className="h-9 sm:h-10 px-3 sm:px-4 rounded-full border border-border bg-card hover:bg-muted font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <MoreVertical size={14} /> Save
                  </button>
                  {showPlaylistMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-2xl shadow-modal z-10 overflow-hidden">
                      <div className="p-3 border-b border-border/60">
                        <p className="text-sm font-heading font-bold">Save to playlist</p>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {playlists.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground text-center">
                            No playlists yet.{' '}
                            <Link href="/profile" className="text-secondary hover:underline">Create one</Link>
                          </div>
                        ) : (
                          playlists.map(p => (
                            <button
                              key={p.id}
                              onClick={() => handleAddToSpecificPlaylist(p.id)}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                            >
                              {p.title}
                              <span className="block text-xs text-muted-foreground">{p._count?.items || 0} videos</span>
                            </button>
                          ))
                        )}
                      </div>
                      <div className="p-2 border-t border-border/60">
                        <Link
                          href="/profile"
                          className="block text-center text-xs font-semibold text-secondary hover:underline py-1.5"
                          onClick={() => setShowPlaylistMenu(false)}
                        >
                          + Create new playlist
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description card */}
            <div className="bg-card/60 border border-border/40 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-3 text-xs text-muted-foreground font-semibold mb-2">
                <span className="flex items-center gap-1">
                  <Eye size={13} className="text-primary" /> {formatNumber(video.views)} views
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-secondary" /> {formatDate(video.createdAt, { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                {video.category && (
                  <>
                    <span>•</span>
                    <Link href={`/dashboard?category=${video.category.slug}`} className="text-secondary hover:underline">
                      {video.category.name}
                    </Link>
                  </>
                )}
              </div>
              <p className={`text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap font-light ${!showDescription ? 'line-clamp-3' : ''}`}>
                {video.description || 'No description provided.'}
              </p>
              {video.description && video.description.length > 200 && (
                <button
                  onClick={() => setShowDescription(s => !s)}
                  className="text-xs font-bold text-primary hover:underline mt-2"
                >
                  {showDescription ? 'Show less' : 'Show more'}
                </button>
              )}
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {video.tags.map(tag => (
                    <Link
                      key={tag.id}
                      href={`/dashboard?tag=${tag.slug}`}
                      className="px-2.5 py-1 bg-muted hover:bg-accent text-foreground/80 text-xs font-medium rounded-full transition-colors"
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="space-y-4 pt-2">
              <h3 className="text-lg font-heading font-extrabold text-foreground flex items-center gap-2">
                <MessageCircle size={18} /> {formatNumber(commentCount)} Comments
              </h3>

              {isAuthenticated ? (
                <form onSubmit={handleSubmitComment} className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
                    {user?.avatarUrl ? (
                      <img src={getMediaUrl(user.avatarUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getInitials(user?.displayName || user?.username || 'U')
                    )}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a thoughtful comment…"
                      rows={2}
                      maxLength={2000}
                      className="w-full bg-card/50 border border-border rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">{newComment.length}/2000</span>
                      <button
                        type="submit"
                        disabled={!newComment.trim() || submittingComment}
                        className="h-9 px-4 rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-soft transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        {submittingComment ? <Loader2 size={14} className="animate-spin" /> : 'Post'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="bg-muted/30 rounded-2xl p-4 text-center text-sm">
                  <Link href={`/login?returnTo=/watch/${id}`} className="text-secondary font-bold hover:underline">
                    Sign in
                  </Link>{' '}
                  <span className="text-muted-foreground">to join the conversation.</span>
                </div>
              )}

              {commentsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-9 h-9 rounded-full skeleton shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 skeleton w-1/4" />
                        <div className="h-3 skeleton w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No comments yet. Be the first to share your thoughts.
                </p>
              ) : (
                <div className="space-y-4">
                  {comments.map(c => (
                    <CommentItem key={c.id} comment={c} videoId={video.id} onDelete={() => {
                      setComments(prev => prev.filter(x => x.id !== c.id));
                      setCommentCount(c => Math.max(0, c - 1));
                    }} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Related videos sidebar */}
          <aside className="space-y-4">
            <h3 className="text-lg font-heading font-extrabold text-foreground flex items-center gap-2">
              <Sparkles size={18} className="text-secondary" /> Up next
            </h3>
            {related.length === 0 ? (
              <p className="text-sm text-muted-foreground">No related videos found.</p>
            ) : (
              <div className="space-y-3">
                {related.slice(0, 10).map(v => (
                  <Link
                    key={v.id}
                    href={`/watch/${v.id}`}
                    className="flex gap-3 group bg-card/50 border border-border/40 rounded-xl p-2 hover:bg-card transition-all"
                  >
                    <div className="w-32 sm:w-40 aspect-video bg-muted rounded-lg overflow-hidden shrink-0 relative">
                      {v.thumbnailUrl ? (
                        <img
                          src={getMediaUrl(v.thumbnailUrl)}
                          alt={v.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Play size={20} className="opacity-50" />
                        </div>
                      )}
                      {v.duration ? (
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-foreground/85 text-background text-[10px] font-bold rounded">
                          {formatDuration(v.duration)}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {v.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {v.user.displayName || v.user.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(v.views)} views • {formatRelativeTime(v.createdAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment, videoId, onDelete }: { comment: Comment; videoId: string; onDelete: () => void }) {
  const { user: currentUser, isAuthenticated } = useAuth();
  const { error: toastError } = useToast();
  const [showReply, setShowReply] = useState(false);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replies, setReplies] = useState<Comment[]>(comment.replies || []);

  const canModify = currentUser?.id === comment.userId || currentUser?.role === 'ADMIN';

  const handleDelete = async () => {
    if (!confirm('Delete this comment?')) return;
    try {
      await videoApi.deleteComment(videoId, comment.id);
      onDelete();
    } catch (err) {
      toastError(getErrorMessage(err, 'Could not delete comment'));
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSubmitting(true);
    try {
      const c = await videoApi.addComment(videoId, reply.trim(), comment.id);
      setReplies(prev => [...prev, c]);
      setReply('');
      setShowReply(false);
    } catch (err) {
      toastError(getErrorMessage(err, 'Could not post reply'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <Link href={`/channel/${comment.user.username}`} className="shrink-0">
          <div className="w-9 h-9 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-bold overflow-hidden">
            {comment.user.avatarUrl ? (
              <img src={getMediaUrl(comment.user.avatarUrl)} alt="" className="w-full h-full object-cover" />
            ) : (
              getInitials(comment.user.displayName || comment.user.username)
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/channel/${comment.user.username}`}
              className="font-bold text-sm text-foreground hover:text-primary transition-colors"
            >
              {comment.user.displayName || comment.user.username}
            </Link>
            {comment.user.isVerified && <span className="text-primary text-xs">✓</span>}
            <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
            {comment.isEdited && <span className="text-xs text-muted-foreground italic">(edited)</span>}
          </div>
          <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words">{comment.content}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <button
              onClick={() => setShowReply(s => !s)}
              className="font-bold hover:text-primary transition-colors"
            >
              Reply
            </button>
            {canModify && (
              <button
                onClick={handleDelete}
                className="font-bold hover:text-destructive transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {showReply && isAuthenticated && (
        <form onSubmit={handleReply} className="ml-12 flex gap-2">
          <input
            type="text"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Add a reply…"
            maxLength={2000}
            className="flex-1 bg-card/50 border border-border rounded-full px-4 py-1.5 text-sm focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={!reply.trim() || submitting}
            className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
          >
            Reply
          </button>
        </form>
      )}

      {replies.length > 0 && (
        <div className="ml-12 space-y-3 border-l-2 border-border/40 pl-4">
          {replies.map(r => (
            <div key={r.id} className="flex gap-2">
              <Link href={`/channel/${r.user.username}`} className="shrink-0">
                <div className="w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold overflow-hidden">
                  {r.user.avatarUrl ? (
                    <img src={getMediaUrl(r.user.avatarUrl)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(r.user.displayName || r.user.username)
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/channel/${r.user.username}`}
                    className="font-bold text-xs text-foreground hover:text-primary"
                  >
                    {r.user.displayName || r.user.username}
                  </Link>
                  <span className="text-[10px] text-muted-foreground">{formatRelativeTime(r.createdAt)}</span>
                </div>
                <p className="text-xs text-foreground/90 mt-0.5">{r.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
