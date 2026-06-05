import Link from 'next/link';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-heading font-extrabold text-primary mb-4">404</div>
        <h1 className="text-2xl font-heading font-bold text-foreground mb-2">
          This stream has ended
        </h1>
        <p className="text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="h-11 px-5 rounded-full bg-primary text-primary-foreground font-bold text-sm inline-flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
          >
            <Home size={16} /> Home
          </Link>
          <Link
            href="/dashboard"
            className="h-11 px-5 rounded-full border border-border bg-card text-foreground font-bold text-sm inline-flex items-center gap-2 hover:bg-muted transition-colors"
          >
            <Search size={16} /> Browse
          </Link>
        </div>
      </div>
    </div>
  );
}
