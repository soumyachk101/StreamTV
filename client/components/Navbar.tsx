'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import Logo from './Logo';
import {
  Upload, LogOut, Search, Bell, User as UserIcon,
  Sun, Moon, Monitor, Menu, X, Settings, Heart, History, Compass, Sparkles
} from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from './providers/AuthProvider';
import { useTheme } from './providers/ThemeProvider';
import { notificationApi } from '@/lib/services';
import { formatNumber, formatRelativeTime, getInitials, getMediaUrl } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const data = await notificationApi.list(1, 1, true);
        if (!cancelled) setUnreadCount(data.unreadCount);
      } catch {
        // Silent fail
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAuthenticated, pathname]);

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const s = params.get('search');
    if (s !== null) setSearchQuery(s);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard?search=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push('/dashboard');
    }
  };

  if (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password') return null;

  return (
    <nav className="fixed top-3 sm:top-4 left-0 right-0 z-50 px-3 sm:px-4 lg:px-8">
      <div className={`max-w-7xl mx-auto rounded-full transition-all duration-300 border border-border/50 ${
        scrolled
          ? 'bg-background/85 backdrop-blur-xl py-1.5 px-3 sm:px-5 shadow-soft'
          : 'bg-background/70 backdrop-blur-md py-2 px-4 sm:px-6'
      }`}>
        <div className="flex items-center justify-between h-11 sm:h-12 gap-2 sm:gap-4">
          {/* Logo */}
          <Link href={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2 sm:gap-3 shrink-0 group">
            <div className="h-9 w-9 sm:h-10 sm:w-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-soft transition-transform duration-300 group-hover:scale-105 group-hover:rotate-6">
              <Logo className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground fill-primary-foreground ml-0.5" />
            </div>
            <span className="hidden xs:inline text-lg sm:text-xl font-heading font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors">
              Stream<span className="text-secondary font-sans font-medium">.Tv</span>
            </span>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="flex-1 max-w-md hidden md:block">
            <form onSubmit={handleSearch} className="relative group">
              <input
                type="text"
                placeholder="Search videos, creators, tags…"
                className="w-full bg-card/60 border border-border rounded-full py-2 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search"
              />
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </form>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {isAuthenticated ? (
              <>
                {/* Theme toggle */}
                <button
                  onClick={() => {
                    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
                    setTheme(next);
                  }}
                  className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-full transition-colors hidden sm:flex"
                  aria-label="Toggle theme"
                  title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Upload - desktop */}
                <Link
                  href="/upload"
                  className="hidden sm:flex p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-full transition-colors"
                  title="Upload Video"
                  aria-label="Upload Video"
                >
                  <Upload size={18} />
                </Link>

                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifOpen(o => !o)}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-full transition-colors relative"
                    aria-label="Notifications"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                  <AnimatePresence>
                    {notifOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-modal overflow-hidden"
                      >
                        <NotificationsPanel onClose={() => setNotifOpen(false)} onUnreadChange={setUnreadCount} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* User menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(o => !o)}
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-soft hover:shadow-float transition-all flex items-center justify-center overflow-hidden"
                    aria-label="User menu"
                  >
                    {user?.avatarUrl ? (
                      <img src={getMediaUrl(user.avatarUrl)} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      <span>{getInitials(user?.displayName || user?.username || 'U')}</span>
                    )}
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-2xl shadow-modal overflow-hidden"
                      >
                        <div className="p-4 border-b border-border/60">
                          <p className="font-heading font-bold text-foreground truncate">
                            {user?.displayName || user?.username}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatNumber(user?.subscriberCount || 0)} subscribers
                          </p>
                        </div>
                        <div className="py-1">
                          <Link
                            href={`/channel/${user?.username}`}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            <UserIcon size={16} />
                            Your channel
                          </Link>
                          <Link
                            href="/subscriptions"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            <Compass size={16} />
                            Subscriptions
                          </Link>
                          <Link
                            href="/liked"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            <Heart size={16} />
                            Liked videos
                          </Link>
                          <Link
                            href="/history"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            <History size={16} />
                            History
                          </Link>
                          <Link
                            href="/profile"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            <Settings size={16} />
                            Settings
                          </Link>
                          {user?.role === 'ADMIN' && (
                            <Link
                              href="/admin"
                              className="flex items-center gap-3 px-4 py-2 text-sm text-secondary hover:bg-muted transition-colors border-t border-border/60"
                            >
                              <Sparkles size={16} />
                              Admin panel
                            </Link>
                          )}
                        </div>
                        <div className="border-t border-border/60 py-1">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                          >
                            <LogOut size={16} />
                            Sign out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mobile menu button */}
                <button
                  onClick={() => setMobileMenuOpen(o => !o)}
                  className="md:hidden p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-full transition-colors"
                  aria-label="Menu"
                >
                  {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
                    setTheme(next);
                  }}
                  className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-full transition-colors"
                  aria-label="Toggle theme"
                >
                  {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <Link
                  href="/login"
                  className="bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-transform shadow-soft px-4 sm:px-6 py-2 rounded-full text-sm font-semibold inline-flex items-center"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Search */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-border/40 mt-2 pt-3 pb-1"
            >
              <form onSubmit={handleSearch} className="relative mb-2">
                <input
                  type="text"
                  placeholder="Search videos, creators, tags…"
                  className="w-full bg-card/60 border border-border rounded-full py-2 pl-10 pr-4 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </form>
              <div className="grid grid-cols-2 gap-1 pb-1">
                <Link href="/dashboard" className="px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg">Browse</Link>
                <Link href="/trending" className="px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg">Trending</Link>
                {isAuthenticated && (
                  <Link href="/upload" className="px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg">Upload</Link>
                )}
                {isAuthenticated && (
                  <Link href="/subscriptions" className="px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg">Subscriptions</Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

function NotificationsPanel({ onClose, onUnreadChange }: { onClose: () => void; onUnreadChange: (n: number) => void }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await notificationApi.list(1, 8);
        if (mounted) {
          setNotifications(data.items);
          onUnreadChange(data.unreadCount);
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleMarkAll = async () => {
    try {
      await notificationApi.markRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      onUnreadChange(0);
    } catch {
      // ignore
    }
  };

  const handleClick = async (n: any) => {
    if (!n.isRead) {
      try {
        await notificationApi.markRead(n.id);
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
        onUnreadChange(0);
      } catch {
        // ignore
      }
    }
    if (n.link) {
      router.push(n.link);
      onClose();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between p-3 border-b border-border/60">
        <h3 className="font-heading font-bold text-foreground">Notifications</h3>
        <button
          onClick={handleMarkAll}
          className="text-xs font-semibold text-secondary hover:underline"
        >
          Mark all read
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Bell size={20} className="mx-auto mb-2 opacity-50" />
            No notifications yet
          </div>
        ) : (
          notifications.map(n => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full text-left p-3 hover:bg-muted transition-colors flex items-start gap-3 ${!n.isRead ? 'bg-primary/5' : ''}`}
            >
              <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0 text-xs font-bold overflow-hidden">
                {n.actor?.avatarUrl ? (
                  <img src={getMediaUrl(n.actor.avatarUrl)} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(n.actor?.displayName || n.actor?.username || 'S')
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground line-clamp-1">{n.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{formatRelativeTime(n.createdAt)}</p>
              </div>
              {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
