'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import Logo from '@/components/Logo';
import { authApi } from '@/lib/services';
import { useToast } from '@/components/providers/ToastProvider';
import { isValidEmail, getErrorMessage } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
  const { success, error } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      error('Please enter a valid email');
      return;
    }
    setLoading(true);
    try {
      await authApi.requestPasswordReset(email);
      setSent(true);
      success('If an account exists, a reset link has been sent.');
    } catch (err) {
      error(getErrorMessage(err, 'Could not process request'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 font-sans relative overflow-hidden">
      <div className="bg-blob bg-primary/10 w-80 h-80 rounded-blob-1 -top-10 -left-10" />
      <div className="bg-blob bg-secondary/10 w-80 h-80 -bottom-10 -right-10 rounded-blob-2" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6 rounded-[2rem] bg-card p-8 md:p-10 shadow-float border border-border/50 relative z-10"
      >
        <div className="flex justify-center">
          <div className="h-12 w-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
            <Logo className="h-6 w-6 text-primary-foreground fill-primary-foreground ml-0.5" />
          </div>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="text-2xl font-heading font-extrabold text-foreground">Check your email</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If an account exists for <strong className="text-foreground">{email}</strong>, we&apos;ve sent password reset instructions.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-bold text-secondary hover:underline"
            >
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                <Mail size={20} />
              </div>
              <h2 className="text-2xl font-heading font-extrabold text-foreground">Forgot password?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enter your email and we&apos;ll send you reset instructions.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full h-12 rounded-full border border-border bg-card/50 px-5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-soft hover:scale-[1.01] active:scale-[0.99] transition-transform flex items-center justify-center disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Send reset link'}
              </button>
            </form>

            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-bold text-secondary hover:underline"
              >
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
