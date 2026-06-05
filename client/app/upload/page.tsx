'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, UploadCloud, ArrowLeft, FileVideo, X, Plus, CheckCircle2, AlertCircle
} from 'lucide-react';
import { videoApi } from '@/lib/services';
import { Category } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { formatNumber, getErrorMessage } from '@/lib/utils';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export default function UploadPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { success, error: toastError } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<'PUBLISHED' | 'UNLISTED' | 'PRIVATE'>('PUBLISHED');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login?returnTo=/upload');
      return;
    }
    setAuthChecked(true);
    videoApi.getCategories().then(setCategories).catch(() => {});
  }, [isAuthenticated, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndSetFile(f);
  };

  const validateAndSetFile = (f: File) => {
    if (!f.type.startsWith('video/') && !/\.(mp4|webm|mov|avi|mkv|m4v|ogv)$/i.test(f.name)) {
      setError('Please select a valid video file (MP4, WebM, MOV, AVI, MKV)');
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError(`File is too large. Maximum size is ${formatNumber(MAX_FILE_SIZE / 1024 / 1024)}MB.`);
      return;
    }
    setError('');
    setFile(f);
    if (!title) {
      const cleanName = f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.substring(0, 200));
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addTag = () => {
    const t = tagsInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags(prev => [...prev, t]);
      setTagsInput('');
    }
  };

  const removeTag = (t: string) => {
    setTags(prev => prev.filter(x => x !== t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a video file');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setLoading(true);
    setError('');
    setProgress(0);

    try {
      const fields: Record<string, string> = {
        title: title.trim(),
        description: description.trim(),
        tags: JSON.stringify(tags),
        status,
      };
      if (categoryId) {
        fields.categoryId = categoryId;
      }

      const video = await videoApi.upload(file, fields, (percent) => {
        setProgress(percent);
      });
      success('Video uploaded successfully! Processing started.');
      router.push(`/watch/${video.id}`);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Upload failed');
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold animate-pulse">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 sm:pt-28 pb-16 px-4 sm:px-6 relative font-sans">
      <div className="bg-blob bg-primary/5 w-[400px] h-[400px] rounded-blob-1 top-20 left-[-10%]" />
      <div className="bg-blob bg-secondary/5 w-[400px] h-[400px] rounded-blob-2 bottom-10 right-[-10%]" />

      <div className="max-w-3xl mx-auto relative z-10 space-y-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="bg-card/80 backdrop-blur rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 border border-border/50 shadow-float">
          <div className="space-y-1 mb-8">
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground">Upload video</h1>
            <p className="text-sm text-muted-foreground">Share your handcrafted reel with the community.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-2xl border border-destructive/20 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* File drop zone */}
            {!file ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-[2rem] p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[200px] ${
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card/40 hover:border-primary hover:bg-card/60'
                }`}
                role="button"
                tabIndex={0}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                  <UploadCloud size={32} />
                </div>
                <p className="text-base font-bold text-foreground">Drag & drop your video here</p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                <p className="text-xs text-muted-foreground mt-4 font-medium uppercase tracking-wider">
                  MP4, WebM, MOV, AVI, MKV • Max {MAX_FILE_SIZE / 1024 / 1024}MB
                </p>
              </div>
            ) : (
              <div className="border-2 border-primary/40 bg-primary/5 rounded-[2rem] p-5 flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                  <FileVideo size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="w-9 h-9 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center transition-colors shrink-0"
                  aria-label="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-foreground uppercase tracking-wider ml-1">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className="w-full h-12 bg-card/50 border border-border rounded-full px-5 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all text-sm font-medium"
                placeholder="Give your story a title…"
              />
              <p className="text-xs text-muted-foreground text-right">{title.length}/200</p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-foreground uppercase tracking-wider ml-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={5000}
                rows={5}
                className="w-full bg-card/50 border border-border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all text-sm font-medium resize-none"
                placeholder="Tell viewers about your video…"
              />
              <p className="text-xs text-muted-foreground text-right">{description.length}/5000</p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-foreground uppercase tracking-wider ml-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-12 bg-card/50 border border-border rounded-full px-5 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all text-sm font-medium appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 1.25rem center',
                }}
              >
                <option value="">Select a category…</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-foreground uppercase tracking-wider ml-1">
                Tags <span className="text-muted-foreground font-normal normal-case">(up to 10)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  maxLength={30}
                  className="flex-1 h-12 bg-card/50 border border-border rounded-full px-5 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all text-sm font-medium"
                  placeholder="Add a tag and press Enter…"
                />
                <button
                  type="button"
                  onClick={addTag}
                  disabled={!tagsInput.trim() || tags.length >= 10}
                  className="h-12 px-5 rounded-full bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-transform"
                >
                  <Plus size={16} /> Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {tags.map(t => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        className="hover:text-destructive transition-colors"
                        aria-label={`Remove tag ${t}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-foreground uppercase tracking-wider ml-1">
                Visibility
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { value: 'PUBLISHED' as const, label: 'Public', desc: 'Everyone can watch' },
                  { value: 'UNLISTED' as const, label: 'Unlisted', desc: 'Only people with the link' },
                  { value: 'PRIVATE' as const, label: 'Private', desc: 'Only you' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`text-left p-3 rounded-2xl border-2 transition-all ${
                      status === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card/30 hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">{opt.label}</span>
                      {status === opt.value && <CheckCircle2 size={16} className="text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!file || !title.trim() || loading}
              className="w-full h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-soft hover:shadow-float transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  {progress > 0 ? `Publishing... ${progress}%` : 'Publishing…'}
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Publish video
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
