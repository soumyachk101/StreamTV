'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowRight, Heart, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Logo from '../Logo';
import { authApi } from '@/lib/services';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { isValidEmail, isValidPassword, isValidUsername, getErrorMessage } from '@/lib/utils';

interface AuthModernProps {
  initialMode: 'login' | 'register';
}

export default function AuthModern({ initialMode }: AuthModernProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, refresh } = useAuth();
  const { error: toastError, success } = useToast();

  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [usernameError, setUsernameError] = useState('');
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  const returnTo = searchParams.get('returnTo') || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(returnTo);
    }
  }, [isAuthenticated, returnTo, router]);

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setEmailError('');
    setPasswordErrors([]);
    setUsernameError('');
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', !isLogin ? '/login' : '/register');
    }
  };

  // Live validation
  useEffect(() => {
    if (isLogin || !email) {
      setEmailError('');
      setEmailAvailable(null);
      return;
    }
    const valid = isValidEmail(email);
    setEmailError(valid ? '' : 'Please enter a valid email');
  }, [email, isLogin]);

  useEffect(() => {
    if (isLogin || !password) {
      setPasswordErrors([]);
      return;
    }
    const v = isValidPassword(password);
    setPasswordErrors(v.errors);
  }, [password, isLogin]);

  useEffect(() => {
    if (isLogin || !name) {
      setUsernameError('');
      setUsernameAvailable(null);
      return;
    }
    const err = isValidUsername(name);
    setUsernameError(err || '');
  }, [name, isLogin]);

  // Debounced availability check
  useEffect(() => {
    if (isLogin || !email || emailError || !isValidEmail(email)) {
      setEmailAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res: any = await authApi.checkAvailability({ email });
        setEmailAvailable(typeof res?.email === 'boolean' ? res.email : null);
        setAvailabilityChecked(true);
      } catch {
        // ignore
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [email, isLogin, emailError]);

  useEffect(() => {
    if (isLogin || !name || usernameError || isValidUsername(name) !== null) {
      setUsernameAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res: any = await authApi.checkAvailability({ username: name });
        setUsernameAvailable(typeof res?.username === 'boolean' ? res.username : null);
        setAvailabilityChecked(true);
      } catch {
        // ignore
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [name, isLogin, usernameError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

<<<<<<< HEAD
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!isValidPassword(password).valid) {
      setError('Password does not meet requirements');
      return;
    }
    if (!isLogin) {
      if (isValidUsername(name) !== null) {
        setError('Please enter a valid username');
        return;
      }
      if (emailAvailable === false) {
        setError('This email is already registered');
        return;
      }
      if (usernameAvailable === false) {
        setError('This username is already taken');
        return;
      }
    }
=======
                    {/* Bottom Content */}
                    <div className="relative z-10">
                        <div className="flex items-end justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white/20 p-0.5">
                                     {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full rounded-full bg-slate-800" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg leading-tight">ProGamer.tv</h4>
                                    <p className="text-xs text-white/60">Live Streaming & Gaming</p>
                                </div>
                            </div>
>>>>>>> origin/main

    setLoading(true);
    try {
      const response = isLogin
        ? await authApi.login(email, password)
        : await authApi.register({ email, password, username: name, displayName: name });

      login(response.token, response.user);
      success(isLogin ? 'Welcome back!' : 'Account created!');
      router.push(returnTo);
    } catch (err) {
      const msg = getErrorMessage(err, 'Authentication failed');
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (!user.email) {
        throw new Error('Google account must have an email');
      }

      const response = await authApi.googleSignIn({
        email: user.email,
        username: user.displayName || user.email.split('@')[0],
        displayName: user.displayName || undefined,
        avatarUrl: user.photoURL || undefined,
      });

      login(response.token, response.user);
      success('Welcome!');
      router.push(returnTo);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setLoading(false);
        return;
      }
      const msg = getErrorMessage(err, 'Google sign-in failed');
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background font-sans relative overflow-hidden">
      <div className="bg-blob bg-primary/10 w-[400px] h-[400px] rounded-blob-1 -top-20 -left-20" />
      <div className="bg-blob bg-secondary/10 w-[400px] h-[400px] rounded-blob-2 -bottom-20 -right-20" />

      <div className="w-full max-w-[1100px] min-h-[680px] md:h-[720px] bg-card rounded-[2rem] md:rounded-[2.5rem] shadow-float border border-border/50 overflow-hidden flex flex-col md:flex-row relative z-10">
        {/* Left panel */}
        <div className="w-full md:w-1/2 relative bg-primary text-primary-foreground flex flex-col justify-between p-8 md:p-12 overflow-hidden shrink-0">
          <div className="absolute top-[-20%] right-[-15%] w-72 h-72 rounded-blob-2 bg-secondary/20 blur-2xl pointer-events-none" />
          <div className="absolute bottom-[-15%] left-[-15%] w-72 h-72 rounded-blob-1 bg-accent/20 blur-2xl pointer-events-none" />

<<<<<<< HEAD
          <Link href="/" className="relative z-10 flex items-center gap-2 w-fit">
            <div className="h-8 w-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
              <Logo className="h-4 w-4 text-white fill-white ml-0.5" />
=======
                            <div className="flex justify-end">
                                <button type="button" className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors">
                                    Forgot password?
                                </button>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-500 text-sm rounded-lg text-center">
                                    {error}
                                </div>
                            )}

                            {/* Divider */}
                            <div className="relative flex py-4 items-center">
                                <div className="flex-grow border-t border-slate-200"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-semibold">or</span>
                                <div className="flex-grow border-t border-slate-200"></div>
                            </div>

                            <button type="button" className="w-full py-3.5 rounded-xl border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors text-slate-700 font-bold text-sm" onClick={() => alert("Google Login coming soon")}>
                                 {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                                {isLogin ? 'Login with Google' : 'Sign up with Google'}
                            </button>

                            <button
                                disabled={loading}
                                className="w-full py-4 rounded-xl bg-[#EA4335] hover:bg-[#d63d30] text-white font-bold text-sm shadow-lg shadow-red-500/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
                            >
                                {loading ? <Loader2 className="animate-spin mx-auto text-white" /> : (isLogin ? 'Login' : 'Sign Up')}
                            </button>

                            <div className="text-center mt-6">
                                <span className="text-slate-500 text-sm">
                                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                                    <button type="button" onClick={toggleMode} className="text-[#EA4335] font-bold hover:underline">
                                        {isLogin ? 'Sign up' : 'Login'}
                                    </button>
                                </span>
                            </div>

                        </form>

                        {/* Social Icons Bottom */}
                        <div className="mt-10 flex justify-center gap-6 opacity-60">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 cursor-pointer transition-colors"></div>
                            ))}
                        </div>
                    </div>
                </div>
>>>>>>> origin/main
            </div>
            <span className="font-heading font-extrabold text-white text-lg">Stream.Tv</span>
          </Link>

          <div className="relative z-10 my-12 md:my-0 space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wider">
              <Heart size={10} className="fill-secondary text-secondary" /> Organic ecosystem
            </span>

            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? "login-message" : "register-message"}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="space-y-3"
              >
                <h2 className="text-3xl md:text-4xl font-heading font-bold leading-tight">
                  {isLogin ? "Welcome to the sanctuary" : "Join the mindful wave"}
                </h2>
                <p className="text-sm text-primary-foreground/80 leading-relaxed font-light">
                  {isLogin
                    ? "Reconnect with your favorite stories. Sit back, take a breath, and experience crystal clear natural viewing."
                    : "Create your free account today. Start publishing handcrafted streams and build your own sustainable video space."
                  }
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="relative z-10 text-xs text-primary-foreground/50 border-t border-white/10 pt-4">
            &ldquo;There are no straight lines in nature.&rdquo; • Wabi-Sabi Design System
          </div>
        </div>

        {/* Right panel */}
        <div className="w-full md:w-1/2 bg-card flex flex-col justify-center p-6 sm:p-10 md:p-16 relative">
          <div className="max-w-md w-full mx-auto relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? 'login-form' : 'register-form'}
                initial={{ opacity: 0, x: isLogin ? -15 : 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isLogin ? 15 : -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div className="space-y-2 text-center md:text-left">
                  <h1 className="text-3xl font-heading font-extrabold text-foreground">
                    {isLogin ? 'Hello friend' : 'Get started'}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {isLogin ? 'Sign in to access your video dashboard.' : 'Sign up to begin publishing streams.'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {!isLogin && (
                    <div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Username"
                          required
                          minLength={3}
                          maxLength={30}
                          className={`w-full px-5 py-3 h-12 rounded-full border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 transition-all text-sm font-medium ${
                            usernameError
                              ? 'border-destructive focus:ring-destructive/20'
                              : usernameAvailable === true
                                ? 'border-success focus:ring-success/20'
                                : 'border-border focus:ring-primary/20 focus:border-primary'
                          }`}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                      {usernameError && (
                        <p className="text-xs text-destructive mt-1 ml-4">{usernameError}</p>
                      )}
                      {!usernameError && usernameAvailable === true && (
                        <p className="text-xs text-success mt-1 ml-4">✓ Available</p>
                      )}
                      {!usernameError && usernameAvailable === false && (
                        <p className="text-xs text-destructive mt-1 ml-4">Username is taken</p>
                      )}
                    </div>
                  )}

                  <div>
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="Email address"
                        required
                        className={`w-full px-5 py-3 h-12 rounded-full border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 transition-all text-sm font-medium ${
                          emailError
                            ? 'border-destructive focus:ring-destructive/20'
                            : emailAvailable === true
                              ? 'border-success focus:ring-success/20'
                              : 'border-border focus:ring-primary/20 focus:border-primary'
                        }`}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    {emailError && (
                      <p className="text-xs text-destructive mt-1 ml-4">{emailError}</p>
                    )}
                    {!isLogin && !emailError && emailAvailable === true && (
                      <p className="text-xs text-success mt-1 ml-4">✓ Available</p>
                    )}
                  </div>

                  <div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        required
                        minLength={8}
                        className={`w-full px-5 py-3 h-12 pr-12 rounded-full border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 transition-all text-sm font-medium ${
                          !isLogin && password && passwordErrors.length > 0
                            ? 'border-destructive/50 focus:ring-destructive/20'
                            : 'border-border focus:ring-primary/20 focus:border-primary'
                        }`}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(s => !s)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {!isLogin && password && (
                      <ul className="text-xs mt-2 ml-4 space-y-0.5">
                        {[
                          { check: password.length >= 8, label: 'At least 8 characters' },
                          { check: /[A-Z]/.test(password), label: 'One uppercase letter' },
                          { check: /[a-z]/.test(password), label: 'One lowercase letter' },
                          { check: /\d/.test(password), label: 'One number' },
                        ].map(req => (
                          <li key={req.label} className={req.check ? 'text-success' : 'text-muted-foreground'}>
                            {req.check ? '✓' : '○'} {req.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {isLogin && (
                    <div className="flex justify-end">
                      <Link href="/forgot-password" className="text-xs font-bold text-secondary hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                  )}

                  {error && (
                    <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-xl border border-destructive/20 text-center font-medium">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-soft hover:scale-[1.01] active:scale-[0.99] transition-transform flex items-center justify-center disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                      <span className="inline-flex items-center gap-1.5">
                        {isLogin ? 'Sign in' : 'Create account'} <ArrowRight size={14} />
                      </span>
                    )}
                  </button>
                </form>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-border/80"></div>
                  <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs font-semibold">or continue with</span>
                  <div className="flex-grow border-t border-border/80"></div>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  className="w-full h-12 rounded-full border-2 border-secondary bg-transparent hover:bg-secondary/5 flex items-center justify-center gap-2 text-secondary font-bold text-sm transition-all disabled:opacity-50"
                  onClick={handleGoogleSignIn}
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                  <span>Google</span>
                </button>
              </motion.div>
            </AnimatePresence>

            <div className="text-center mt-6 font-sans">
              <span className="text-muted-foreground text-sm">
                {isLogin ? "First time visiting? " : "Already have an account? "}
                <button type="button" onClick={toggleMode} className="text-secondary font-bold hover:underline">
                  {isLogin ? 'Create an account' : 'Sign in instead'}
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
