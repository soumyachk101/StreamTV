'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Save, Camera, Lock, User as UserIcon, Trash2, ListVideo, Heart, History, Plus, X, AlertTriangle } from 'lucide-react';
import { authApi, playlistApi } from '@/lib/services';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { formatNumber, formatDate, getErrorMessage, getInitials, isValidPassword, isValidUsername, getMediaUrl } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'profile' | 'security' | 'playlists';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser, logout, refresh } = useAuth();
  const { success, error: toastError } = useToast();

  const [tab, setTab] = useState<Tab>('profile');

  // Profile form
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<'avatar' | 'banner' | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Playlists
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login?returnTo=/profile');
      return;
    }
    if (user) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatarUrl || '');
      setBannerUrl(user.bannerUrl || '');
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (tab === 'playlists') {
      playlistApi.list().then(setPlaylists).catch(() => {});
    }
  }, [tab]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (displayName && displayName.length > 50) {
      toastError('Display name must be 50 characters or less');
      return;
    }
    if (bio && bio.length > 1000) {
      toastError('Bio must be 1000 characters or less');
      return;
    }

    setSavingProfile(true);
    try {
      const data: any = {
        displayName: displayName.trim() || null,
        bio: bio.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        bannerUrl: bannerUrl.trim() || null,
      };
      const { user: updated } = await authApi.updateProfile(data);
      updateUser(updated);
      success('Profile updated');
    } catch (err) {
      toastError(getErrorMessage(err, 'Could not update profile'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toastError('Passwords do not match');
      return;
    }
    const validation = isValidPassword(newPassword);
    if (!validation.valid) {
      toastError(`Password must contain: ${validation.errors.join(', ')}`);
      return;
    }

    setSavingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refresh();
    } catch (err) {
      toastError(getErrorMessage(err, 'Could not change password'));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistTitle.trim()) return;

    setCreatingPlaylist(true);
    try {
      const p = await playlistApi.create({ title: newPlaylistTitle.trim(), description: newPlaylistDesc.trim() || undefined });
      setPlaylists(prev => [p, ...prev]);
      setNewPlaylistTitle('');
      setNewPlaylistDesc('');
      setShowNewPlaylist(false);
      success('Playlist created');
    } catch (err) {
      toastError(getErrorMessage(err, 'Could not create playlist'));
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    if (!confirm('Delete this playlist? Videos will not be deleted.')) return;
    try {
      await playlistApi.delete(id);
      setPlaylists(prev => prev.filter(p => p.id !== id));
      success('Playlist deleted');
    } catch (err) {
      toastError(getErrorMessage(err, 'Could not delete playlist'));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner', setter: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toastError('Please select an image file');
      return;
    }
    const maxSize = type === 'avatar' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toastError(`Image must be under ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    setUploadingImage(type);
    try {
      let res;
      if (type === 'avatar') {
        res = await authApi.uploadAvatar(file);
      } else {
        res = await authApi.uploadBanner(file);
      }
      setter(res.url);
      success(`${type === 'avatar' ? 'Avatar' : 'Banner'} uploaded successfully`);
    } catch (err) {
      toastError(getErrorMessage(err, 'Failed to upload image'));
    } finally {
      setUploadingImage(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 sm:pt-28 pb-16 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your profile, security, and playlists</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[200px,1fr] gap-6 lg:gap-8">
          {/* Sidebar */}
          <nav className="space-y-1">
            {[
              { value: 'profile' as const, label: 'Profile', icon: UserIcon },
              { value: 'security' as const, label: 'Security', icon: Lock },
              { value: 'playlists' as const, label: 'Playlists', icon: ListVideo },
            ].map(item => (
              <button
                key={item.value}
                onClick={() => setTab(item.value)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  tab === item.value
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
            <div className="border-t border-border/60 my-3" />
            <Link
              href={`/channel/${user.username}`}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Camera size={16} /> View channel
            </Link>
            <Link
              href="/liked"
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Heart size={16} /> Liked videos
            </Link>
            <Link
              href="/history"
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <History size={16} /> Watch history
            </Link>
          </nav>

          {/* Tab content */}
          <div className="space-y-6">
            {tab === 'profile' && (
              <motion.form
                onSubmit={handleProfileSave}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-soft space-y-6"
              >
                <div>
                  <h2 className="text-xl font-heading font-extrabold text-foreground">Public profile</h2>
                  <p className="text-sm text-muted-foreground">How others see you on Stream.Tv</p>
                </div>

                {/* Banner */}
                <div>
                  <label className="block text-xs font-extrabold text-foreground uppercase tracking-wider mb-2">Banner</label>
                  <div className="relative h-32 sm:h-40 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-2xl overflow-hidden border border-border">
                    {bannerUrl && uploadingImage !== 'banner' && (
                      <img src={getMediaUrl(bannerUrl)} alt="" className="w-full h-full object-cover" />
                    )}
                    {uploadingImage === 'banner' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="animate-spin text-white" size={24} />
                      </div>
                    )}
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'banner', setBannerUrl)}
                      className="hidden"
                    />
                    <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => bannerInputRef.current?.click()}
                        className="px-4 py-2 bg-card text-foreground rounded-full text-xs font-bold flex items-center gap-2"
                      >
                        <Camera size={14} /> Change banner
                      </button>
                    </div>
                  </div>
                </div>

                {/* Avatar */}
                <div className="flex items-start gap-5">
                  <div className="relative w-24 h-24 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-2xl font-heading font-bold overflow-hidden shrink-0 ring-4 ring-card">
                    {avatarUrl && uploadingImage !== 'avatar' ? (
                      <img src={getMediaUrl(avatarUrl)} alt="" className="w-full h-full object-cover" />
                    ) : uploadingImage === 'avatar' ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="animate-spin text-white" size={20} />
                      </div>
                    ) : (
                      getInitials(user.displayName || user.username)
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'avatar', setAvatarUrl)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-foreground/50 text-background opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                      aria-label="Change avatar"
                    >
                      <Camera size={20} />
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">Profile picture</p>
                    <p className="text-xs text-muted-foreground mt-1">Click the image to upload. PNG, JPG up to 5MB.</p>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="text-xs text-destructive hover:underline mt-2"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Display name */}
                <div>
                  <label className="block text-xs font-extrabold text-foreground uppercase tracking-wider mb-2">Display name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={50}
                    className="w-full h-11 bg-card/50 border border-border rounded-full px-4 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Your name"
                  />
                </div>

                {/* Username (read only) */}
                <div>
                  <label className="block text-xs font-extrabold text-foreground uppercase tracking-wider mb-2">Username</label>
                  <input
                    type="text"
                    value={user.username}
                    disabled
                    className="w-full h-11 bg-muted border border-border rounded-full px-4 text-sm text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Usernames cannot be changed.</p>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs font-extrabold text-foreground uppercase tracking-wider mb-2">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={1000}
                    rows={4}
                    className="w-full bg-card/50 border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                    placeholder="Tell viewers about yourself…"
                  />
                  <p className="text-xs text-muted-foreground text-right mt-1">{bio.length}/1000</p>
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="h-11 px-6 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-soft hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-2"
                >
                  {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save changes
                </button>
              </motion.form>
            )}

            {tab === 'security' && (
              <motion.form
                onSubmit={handlePasswordSave}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-soft space-y-6"
              >
                <div>
                  <h2 className="text-xl font-heading font-extrabold text-foreground">Security</h2>
                  <p className="text-sm text-muted-foreground">Keep your account safe</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold text-foreground uppercase tracking-wider mb-2">Current password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="w-full h-11 bg-card/50 border border-border rounded-full px-4 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-foreground uppercase tracking-wider mb-2">New password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full h-11 bg-card/50 border border-border rounded-full px-4 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      At least 8 characters with uppercase, lowercase, and a number
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-foreground uppercase tracking-wider mb-2">Confirm new password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full h-11 bg-card/50 border border-border rounded-full px-4 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                    className="h-11 px-6 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-soft hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                    Update password
                  </button>
                </div>

                <div className="border-t border-border/60 pt-6">
                  <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-2xl">
                    <AlertTriangle size={20} className="text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">Sign out everywhere</p>
                      <p className="text-xs text-muted-foreground mt-0.5">This will sign you out of all devices</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm('Sign out of all devices?')) return;
                        try {
                          await authApi.logoutAll();
                          await logout();
                          router.push('/');
                        } catch (err) {
                          toastError('Could not sign out everywhere');
                        }
                      }}
                      className="h-9 px-4 rounded-full border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-bold"
                    >
                      Sign out all
                    </button>
                  </div>
                </div>
              </motion.form>
            )}

            {tab === 'playlists' && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-soft space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-heading font-extrabold text-foreground">Your playlists</h2>
                    <p className="text-sm text-muted-foreground">Organize videos into collections</p>
                  </div>
                  <button
                    onClick={() => setShowNewPlaylist(true)}
                    className="h-10 px-4 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-transform"
                  >
                    <Plus size={14} /> New playlist
                  </button>
                </div>

                <AnimatePresence>
                  {showNewPlaylist && (
                    <motion.form
                      onSubmit={handleCreatePlaylist}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-muted/30 rounded-2xl p-4 space-y-3"
                    >
                      <input
                        type="text"
                        value={newPlaylistTitle}
                        onChange={(e) => setNewPlaylistTitle(e.target.value)}
                        placeholder="Playlist title"
                        required
                        maxLength={200}
                        className="w-full h-10 bg-card border border-border rounded-full px-4 text-sm focus:outline-none focus:border-primary"
                      />
                      <textarea
                        value={newPlaylistDesc}
                        onChange={(e) => setNewPlaylistDesc(e.target.value)}
                        placeholder="Description (optional)"
                        rows={2}
                        maxLength={1000}
                        className="w-full bg-card border border-border rounded-2xl px-4 py-2 text-sm focus:outline-none focus:border-primary resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowNewPlaylist(false)}
                          className="h-9 px-4 rounded-full border border-border text-sm font-bold hover:bg-muted"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={creatingPlaylist || !newPlaylistTitle.trim()}
                          className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
                        >
                          {creatingPlaylist ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {playlists.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ListVideo size={32} className="mx-auto mb-3 opacity-50" />
                    <p>You haven&apos;t created any playlists yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {playlists.map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 rounded-xl transition-colors">
                        <div className="w-16 h-10 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center shrink-0">
                          <ListVideo size={18} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">{p.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {p._count?.items || 0} videos • {p.isPublic ? 'Public' : 'Private'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeletePlaylist(p.id)}
                          className="w-9 h-9 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                          aria-label="Delete playlist"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
