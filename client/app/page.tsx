'use client';

<<<<<<< HEAD
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
=======
import Link from "next/link";
import Logo from "@/components/Logo";
import { motion } from "framer-motion";
import { Play, Upload, ArrowRight, Zap, Globe, Shield, Users, Video, Smartphone } from "lucide-react";

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen text-white bg-slate-900 font-sans overflow-x-hidden">
      {/* Dynamic Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
        <div className="absolute top-[40%] left-[40%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-20 md:pt-48 md:pb-32 px-4 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-5xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex justify-center mb-8"
          >
            <div className="glass p-6 rounded-3xl shadow-[0_0_50px_rgba(59,130,246,0.3)] border border-blue-400/20 backdrop-blur-xl flex items-center gap-4">
               <Logo className="w-12 h-12 text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
               <div className="text-left">
                  <p className="text-xs text-blue-300 font-bold uppercase tracking-wider">Introducing</p>
                  <p className="text-xl font-black tracking-tight"><span className="text-white">Stream</span><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 font-light">.Tv</span> 2.0</p>
               </div>
            </div>
          </motion.div>

          <div className="space-y-6 mb-12">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-tight"
            >
              Stream Without <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 glow-text">Boundaries</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="text-xl md:text-2xl text-slate-300 font-light max-w-3xl mx-auto leading-relaxed"
            >
              The next generation platform for creators and viewers. Experience crystal clear 4K streaming with zero latency and infinite possibilities.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/dashboard"
              className="group px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] hover:-translate-y-1"
            >
              <Play className="fill-white w-5 h-5" />
              <span>Start Watching Now</span>
            </Link>

            <Link
              href="/upload"
              className="group px-8 py-4 rounded-full glass font-bold text-lg text-white flex items-center justify-center gap-3 hover:bg-white/10 transition-all border border-white/20 hover:-translate-y-1"
            >
              <Upload className="w-5 h-5" />
              <span>For Creators</span>
            </Link>
          </motion.div>
        </motion.div>

        {/* Decorative Floating Elements */}
        <div className="absolute top-1/4 left-5 md:left-20 w-16 h-16 md:w-24 md:h-24 glass rounded-2xl rotate-12 opacity-40 animate-bounce" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-1/4 right-5 md:right-20 w-20 h-20 md:w-32 md:h-32 glass rounded-full opacity-30 animate-bounce" style={{ animationDuration: '8s', animationDelay: '1s' }} />
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-10 border-y border-white/5 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="space-y-2">
                 <h3 className="text-4xl md:text-5xl font-black text-white">10M+</h3>
                 <p className="text-slate-400 font-medium tracking-wide uppercase text-sm">Active Viewers</p>
              </div>
              <div className="space-y-2">
                 <h3 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">4K</h3>
                 <p className="text-slate-400 font-medium tracking-wide uppercase text-sm">Ultra HD Quality</p>
              </div>
              <div className="space-y-2">
                 <h3 className="text-4xl md:text-5xl font-black text-white">50K+</h3>
                 <p className="text-slate-400 font-medium tracking-wide uppercase text-sm">Content Creators</p>
              </div>
              <div className="space-y-2">
                 <h3 className="text-4xl md:text-5xl font-black text-white">Zero</h3>
                 <p className="text-slate-400 font-medium tracking-wide uppercase text-sm">Buffering Issues</p>
              </div>
           </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-24 md:py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold">Why choose <span className="text-blue-400">Stream.Tv</span>?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">We&apos;ve rebuilt video streaming from the ground up to provide the ultimate experience for both viewers and creators.</p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
          >
             {/* Feature 1 */}
             <motion.div variants={itemVariants} className="glass-panel-premium p-8 rounded-3xl border border-white/10 hover:border-blue-500/30 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                   <Zap className="text-blue-400 w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">Lightning Fast</h3>
                <p className="text-slate-400 leading-relaxed">Our globally distributed edge network ensures your videos start instantly and never buffer, no matter where your audience is.</p>
             </motion.div>

             {/* Feature 2 */}
             <motion.div variants={itemVariants} className="glass-panel-premium p-8 rounded-3xl border border-white/10 hover:border-purple-500/30 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                   <Video className="text-purple-400 w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">Flawless 4K</h3>
                <p className="text-slate-400 leading-relaxed">Experience every detail with support for stunning 4K resolution, HDR colors, and crystal-clear high-fidelity audio.</p>
             </motion.div>

             {/* Feature 3 */}
             <motion.div variants={itemVariants} className="glass-panel-premium p-8 rounded-3xl border border-white/10 hover:border-cyan-500/30 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                   <Users className="text-cyan-400 w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">Vibrant Community</h3>
                <p className="text-slate-400 leading-relaxed">Connect with millions of viewers. Live chat, interactive polls, and real-time reactions make watching a shared experience.</p>
             </motion.div>

             {/* Feature 4 */}
             <motion.div variants={itemVariants} className="glass-panel-premium p-8 rounded-3xl border border-white/10 hover:border-emerald-500/30 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                   <Shield className="text-emerald-400 w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">Bank-Grade Security</h3>
                <p className="text-slate-400 leading-relaxed">Your content is yours. End-to-end encryption and advanced DRM protect your streams from unauthorized access and piracy.</p>
             </motion.div>

             {/* Feature 5 */}
             <motion.div variants={itemVariants} className="glass-panel-premium p-8 rounded-3xl border border-white/10 hover:border-orange-500/30 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                   <Smartphone className="text-orange-400 w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">Any Device, Anywhere</h3>
                <p className="text-slate-400 leading-relaxed">Watch seamlessly on your TV, laptop, tablet, or phone. Our responsive platform adapts perfectly to any screen size.</p>
             </motion.div>

             {/* Feature 6 */}
             <motion.div variants={itemVariants} className="glass-panel-premium p-8 rounded-3xl border border-white/10 hover:border-pink-500/30 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                   <Globe className="text-pink-400 w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">Global Reach</h3>
                <p className="text-slate-400 leading-relaxed">Automatically translate captions and interact with audiences worldwide without language barriers.</p>
             </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-4 mb-10">
        <div className="max-w-5xl mx-auto glass p-12 md:p-20 rounded-[3rem] text-center relative overflow-hidden border border-blue-500/30 shadow-[0_0_80px_rgba(59,130,246,0.15)]">
           <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-purple-900/40" />
           <div className="relative z-10 space-y-8">
              <h2 className="text-4xl md:text-6xl font-black">Ready to Dive In?</h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">Join millions of users who have already made Stream.Tv their home for entertainment and creation.</p>
              <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
                 <Link href="/register" className="px-10 py-4 rounded-full bg-white text-slate-900 font-bold text-lg hover:bg-slate-200 transition-colors shadow-xl">
                    Create Free Account
                 </Link>
                 <Link href="/dashboard" className="px-10 py-4 rounded-full glass font-bold text-lg border border-white/30 hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                    Explore Content <ArrowRight className="w-5 h-5" />
                 </Link>
              </div>
           </div>
>>>>>>> origin/main
        </div>
      </section>

      {/* Footer */}
<<<<<<< HEAD
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
=======
      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-slate-500 text-sm font-light">
         <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 opacity-50">
               <Logo className="w-5 h-5 text-white" />
               <span className="font-bold text-white tracking-wide">Stream.Tv</span>
            </div>
            <div>© 2026 Stream.Tv Inc. All rights reserved.</div>
            <div className="flex gap-4">
               <Link href="#" className="hover:text-white transition-colors">Terms</Link>
               <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
               <Link href="#" className="hover:text-white transition-colors">Contact</Link>
            </div>
         </div>
>>>>>>> origin/main
      </footer>
    </div>
  );
}
