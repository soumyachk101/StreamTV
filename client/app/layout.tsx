import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";
import "@/lib/firebase";
import Navbar from "@/components/Navbar";
import { Providers } from "@/components/providers/Providers";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://stream.tv';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Stream.Tv — Mindful Video Streaming",
    template: "%s • Stream.Tv",
  },
  description: "Experience video streaming inspired by the peace of nature. Handcrafted content, tactile designs, and a calm space for authentic human expression.",
  keywords: ["video streaming", "organic", "mindful", "creators", "wabi-sabi", "Stream.Tv"],
  authors: [{ name: "Stream.Tv" }],
  creator: "Stream.Tv",
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Stream.Tv',
    title: 'Stream.Tv — Mindful Video Streaming',
    description: 'Experience video streaming inspired by the peace of nature.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Stream.Tv',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stream.Tv — Mindful Video Streaming',
    description: 'Experience video streaming inspired by the peace of nature.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/logo.svg', type: 'image/svg+xml' },
    ],
    apple: '/logo.svg',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FDFCF8' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1814' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${nunito.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('stream_theme');
                  var theme = stored;
                  if (!theme || theme === 'system') {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  if (theme === 'dark') document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-background text-foreground font-sans antialiased min-h-screen">
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
