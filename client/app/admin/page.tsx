'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users, Video, Eye, MessageCircle, Shield, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { apiGet, apiDelete, apiPatch } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { formatNumber, formatRelativeTime, getErrorMessage } from '@/lib/utils';

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { error: toastError, success } = useToast();
  const [tab, setTab] = useState<'overview' | 'users' | 'videos'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'overview') {
        const data: any = await apiGet('/api/admin/stats');
        setStats(data);
      } else if (tab === 'users') {
        const data: any = await apiGet('/api/admin/users');
        setUsers(data.items);
      } else if (tab === 'videos') {
        const data: any = await apiGet('/api/admin/videos');
        setVideos(data.items);
      }
    } catch (err) {
      toastError(getErrorMessage(err, 'Failed to load admin data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?returnTo=/admin');
      return;
    }
    if (user && user.role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }
    if (user?.role === 'ADMIN') {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, user, router, tab]);

  const handleVerify = async (userId: string, isVerified: boolean) => {
    try {
      await apiPatch(`/api/admin/users/${userId}/verify`, { isVerified });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isVerified } : u));
      success(isVerified ? 'User verified' : 'User unverified');
    } catch (err) {
      toastError(getErrorMessage(err, 'Failed to update user'));
    }
  };

  const handleRoleChange = async (userId: string, role: 'USER' | 'ADMIN') => {
    try {
      await apiPatch(`/api/admin/users/${userId}/role`, { role });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      success(`Role updated to ${role}`);
    } catch (err) {
      toastError(getErrorMessage(err, 'Failed to update role'));
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Delete this video permanently?')) return;
    try {
      await apiDelete(`/api/admin/videos/${videoId}`);
      setVideos(prev => prev.filter(v => v.id !== videoId));
      success('Video deleted');
    } catch (err) {
      toastError(getErrorMessage(err, 'Failed to delete video'));
    }
  };

  if (isLoading || !user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 sm:pt-28 pb-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary/20 text-secondary flex items-center justify-center">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground">Admin panel</h1>
            <p className="text-sm text-muted-foreground">Platform management & moderation</p>
          </div>
        </div>

        <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto scrollbar-hide">
          {[
            { value: 'overview' as const, label: 'Overview' },
            { value: 'users' as const, label: 'Users' },
            { value: 'videos' as const, label: 'Videos' },
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${
                tab === t.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : tab === 'overview' ? (
          <div className="space-y-6">
            <h2 className="text-lg font-heading font-bold text-foreground">All-time stats</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Users', value: stats?.total?.users, icon: Users, color: 'text-primary' },
                { label: 'Videos', value: stats?.total?.videos, icon: Video, color: 'text-secondary' },
                { label: 'Views', value: stats?.total?.views, icon: Eye, color: 'text-info' },
                { label: 'Comments', value: stats?.total?.comments, icon: MessageCircle, color: 'text-success' },
              ].map(s => (
                <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
                  <s.icon size={20} className={s.color} />
                  <div className="text-2xl font-heading font-extrabold text-foreground mt-2">
                    {formatNumber(s.value)}
                  </div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
            <h2 className="text-lg font-heading font-bold text-foreground pt-4">Last 7 days</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'New users', value: stats?.last7Days?.newUsers },
                { label: 'New videos', value: stats?.last7Days?.newVideos },
                { label: 'New views', value: stats?.last7Days?.newViews },
              ].map(s => (
                <div key={s.label} className="bg-card/60 border border-border/60 rounded-2xl p-4">
                  <div className="text-2xl font-heading font-extrabold text-foreground">
                    {formatNumber(s.value)}
                  </div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : tab === 'users' ? (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">User</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Role</th>
                    <th className="text-left p-3">Joined</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t border-border/40 hover:bg-muted/20">
                      <td className="p-3">
                        <p className="font-bold">{u.displayName || u.username}</p>
                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                      </td>
                      <td className="p-3 text-muted-foreground">{u.email}</td>
                      <td className="p-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as 'USER' | 'ADMIN')}
                          className="bg-card border border-border rounded-full px-2 py-1 text-xs"
                        >
                          <option value="USER">User</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {formatRelativeTime(u.createdAt)}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleVerify(u.id, !u.isVerified)}
                          className={`text-xs font-bold px-3 py-1 rounded-full ${
                            u.isVerified
                              ? 'bg-primary/10 text-primary hover:bg-primary/20'
                              : 'bg-muted text-muted-foreground hover:bg-accent'
                          }`}
                        >
                          {u.isVerified ? <><CheckCircle2 size={12} className="inline mr-1" />Verified</> : <><XCircle size={12} className="inline mr-1" />Unverified</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="divide-y divide-border">
              {videos.map(v => (
                <div key={v.id} className="p-4 flex items-center gap-4 hover:bg-muted/20">
                  <div className="w-32 aspect-video bg-muted rounded-lg overflow-hidden shrink-0">
                    {v.thumbnailUrl ? (
                      <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Video size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground line-clamp-1">{v.title}</p>
                    <p className="text-xs text-muted-foreground">
                      By {v.user?.displayName || v.user?.username} • {formatNumber(v._count?.videoViews || 0)} views • {formatRelativeTime(v.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteVideo(v.id)}
                    className="w-9 h-9 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center"
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
