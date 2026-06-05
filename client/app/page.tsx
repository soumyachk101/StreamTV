'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import { motion } from 'framer-motion';
import {
  Play, Upload, ArrowRight, Sparkles, Layers, Compass, Heart,
  ChevronDown, TrendingUp, Users, Video, Zap, Shield
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers';
import { videoApi } from '@/lib/services';
import { VideoCard } from '@/components/VideoCard';
import { Video as VideoType } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

const FAQ_ITEMS = [
  {
    q: 'What makes Stream.Tv different?',
    a: 'We believe in mindful viewing. Instead of cold algorithmic feeds, we prioritize intentional watching, high-fidelity visuals, and a peaceful, sustainable community space for creators and viewers alike.',
  },
  {
    q: 'How does the upload system work?',
    a: 'Simply drag and drop your media. We support modern formats (MP4, WebM, MOV, AVI, MKV) up to 500MB. Add a title, description, category, and tags — your video is ready to share with the world.',
  },
  {
    q: 'Is there a subscription fee?',
    a: 'Stream.Tv is free to use. You can watch, upload, comment, like, and subscribe. We may introduce optional premium features for creators in the future, but the core platform will always be free.',
  },
  {
    q: 'How do subscriptions work?',
    a: 'Subscribe to channels you love to keep up with their latest uploads. We send you real-time notifications when your favorite creators post new content.',
  },
  {
    q: 'Can I keep my videos private?',
    a: 'Yes! You can set videos as public, unlisted (only people with the link can view), or private (only you can view).',
  },
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { isAuthenticated } = useAuth();
  const [trending, setTrending] = useState<VideoType[]>([]);
  const [stats, setStats] = useState({ videos: 0, creators: 0, views: 0 });

  useEffect(() => {
    videoApi.getTrending()
      .then(setTrending)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen text-foreground bg-background relative overflow-hidden font-sans selection:bg-primary/20 selection:text-primary">
      <div className="bg-blob bg-primary w-[500px] h-[500px] rounded-blob-1 top-[-10%] left-[-10%] opacity-[0.08] animate-float-slow" />
      <div className="bg-blob bg-secondary w-[450px] h-[450px] rounded-blob-2 bottom-[10%] right-[-10%] opacity-[0.07] animate-float-delayed" />
      <div className="bg-blob bg-accent w-[400px] h-[400px] rounded-blob-3 top-[40%] left-[30%] opacity-[0.06] animate-float-slow" />

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="space-y-7 max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={12} className="text-secondary" /> Mindful video streaming
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-extrabold tracking-tight text-foreground leading-[0.95]">
            Stream with <br className="hidden sm:inline" />
            <span className="text-primary italic font-normal">natural</span> clarity
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Experience video streaming inspired by the peace of nature. Handcrafted content, tactile design, and a calm space for authentic human expression.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link
              href={isAuthenticated ? '/dashboard' : '/register'}
              className="h-12 px-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-soft hover:shadow-float"
            >
              <Play className="fill-current w-4 h-4" />
              <span>{isAuthenticated ? 'Go to dashboard' : 'Start watching'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={isAuthenticated ? '/upload' : '/login'}
              className="h-12 px-8 rounded-full border-2 border-secondary bg-transparent text-secondary hover:bg-secondary/5 font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Upload video</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Zap size={12} className="text-primary" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Shield size={12} className="text-primary" /> Free forever</span>
            <span className="flex items-center gap-1.5"><Users size={12} className="text-primary" /> Join the community</span>
          </div>
        </motion.div>
      </section>

      {/* Trending preview */}
      {trending.length > 0 && (
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className="text-2xl font-heading font-extrabold text-foreground flex items-center gap-2">
              <TrendingUp className="text-secondary" size={22} />
              Trending this week
            </h2>
            <Link
              href={isAuthenticated ? '/trending' : '/register'}
              className="text-sm font-bold text-secondary hover:underline flex items-center gap-1"
            >
              See all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {trending.slice(0, 4).map((v, i) => (
              <VideoCard key={v.id} video={v} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-5xl font-heading font-extrabold text-foreground mb-3">
            Designed for connection
          </h2>
          <p className="text-muted-foreground">
            We avoid mechanical layouts in favor of tactile design details that reflect handcrafted quality.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Earthy Aesthetics',
              desc: 'Warm color palettes drawn from loam, sand, and moss green create a peaceful sanctuary for your eyes.',
              icon: Heart,
              color: 'text-secondary bg-secondary/10',
            },
            {
              title: 'Built for Creators',
              desc: 'Upload, tag, and categorize. Track views, build an audience, and engage with thoughtful comments.',
              icon: Layers,
              color: 'text-primary bg-primary/10',
            },
            {
              title: 'Peaceful Viewing',
              desc: 'No aggressive autoplay or manipulative feeds. Just the videos you chose to watch, in high fidelity.',
              icon: Compass,
              color: 'text-info bg-info/10',
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="bg-card/70 backdrop-blur border border-border/50 p-6 sm:p-8 shadow-soft hover:shadow-float hover:-translate-y-1 transition-all duration-300 rounded-3xl"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${feature.color}`}>
                <feature.icon size={22} />
              </div>
              <h3 className="font-heading font-bold text-xl text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-muted/30 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-heading font-extrabold text-foreground mb-3">
              How it works
            </h2>
            <p className="text-muted-foreground">
              A peaceful journey from publishing to participating in the community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-12 z-0 pointer-events-none">
              <svg className="w-full h-full overflow-visible" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,20 Q120,-10 240,25" stroke="var(--secondary)" strokeWidth="2" strokeDasharray="6 6" opacity="0.6" />
                <path d="M260,25 Q380,50 500,20" stroke="var(--secondary)" strokeWidth="2" strokeDasharray="6 6" opacity="0.6" />
              </svg>
            </div>

            {[
              { step: '01', title: 'Create account', desc: 'Sign up in seconds with email or Google. No fees, no credit card.' },
              { step: '02', title: 'Upload & share', desc: 'Drag and drop your video. Add tags, a category, and publish.' },
              { step: '03', title: 'Build community', desc: 'Engage with thoughtful comments and grow your audience.' },
            ].map((item, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-card border border-border shadow-soft flex items-center justify-center font-heading font-extrabold text-lg text-primary">
                  {item.step}
                </div>
                <h3 className="font-heading font-bold text-xl text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-heading font-extrabold text-foreground mb-3">
            Common questions
          </h2>
          <p className="text-muted-foreground">
            Everything you need to know to get started.
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-card/70 border border-border/50 rounded-2xl overflow-hidden shadow-soft transition-all"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left font-heading font-bold text-base sm:text-lg text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={20}
                    className={`text-muted-foreground transform transition-transform duration-300 shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-muted-foreground border-t border-border/30 pt-3 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto relative z-10">
        <div className="bg-primary text-primary-foreground rounded-[2.5rem] p-8 md:p-14 text-center space-y-6 relative overflow-hidden shadow-float">
          <div className="absolute top-0 left-0 w-64 h-64 bg-secondary opacity-15 rounded-blob-3 filter blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-accent opacity-10 rounded-blob-1 filter blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-5">
            <h2 className="text-3xl md:text-5xl font-heading font-extrabold tracking-tight">
              Begin your mindful streaming journey
            </h2>
            <p className="text-primary-foreground/85 text-base md:text-lg leading-relaxed">
              Create your free account, watch handcrafted documentaries, or share your own high-fidelity video streams.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link
                href={isAuthenticated ? '/dashboard' : '/register'}
                className="h-12 px-8 rounded-full bg-secondary text-secondary-foreground hover:scale-105 active:scale-95 transition-all shadow-float font-bold text-sm inline-flex items-center justify-center"
              >
                {isAuthenticated ? 'Open dashboard' : 'Create free account'}
              </Link>
              {!isAuthenticated && (
                <Link
                  href="/login"
                  className="h-12 px-8 rounded-full border border-primary-foreground/30 hover:bg-white/10 transition-all font-bold text-sm inline-flex items-center justify-center"
                >
                  Sign in instead
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-10 px-4 sm:px-6 lg:px-8 text-center text-muted-foreground text-sm relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
              <Logo className="h-3.5 w-3.5 text-primary-foreground fill-primary-foreground ml-0.5" />
            </div>
            <span className="font-heading font-extrabold text-foreground">
              Stream<span className="text-secondary font-sans font-medium">.Tv</span>
            </span>
          </div>
          <div className="flex gap-6 font-sans text-xs">
            <Link href="/dashboard" className="hover:text-primary transition-colors">Browse</Link>
            <Link href="/trending" className="hover:text-primary transition-colors">Trending</Link>
            <Link href={isAuthenticated ? '/upload' : '/register'} className="hover:text-primary transition-colors">Upload</Link>
          </div>
          <div className="font-light text-xs">
            © {new Date().getFullYear()} Stream.Tv • Crafted with care
          </div>
        </div>
      </footer>
    </div>
  );
}
