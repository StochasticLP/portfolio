import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "./components/nav";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Footer from "./components/footer";
import { ThemeProvider } from "./components/theme-switch";
import { metaData } from "./lib/config";

import StarBackground from "./components/star-background";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  // ... (unchanged metadata)
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" 
    className={inter.className} 
    style={{ textSizeAdjust: "100%" }}>
      <head>
        <title>{metaData.title}</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme-preference') || 
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.classList.add(theme);
                if (theme === 'dark') {
                  document.documentElement.style.colorScheme = 'dark';
                }
                document.documentElement.style.textSizeAdjust = '100%';
              })();
            `,
          }}
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          href="/rss.xml"
          title="RSS Feed"
        />
        <link
          rel="alternate"
          type="application/atom+xml"
          href="/atom.xml"
          title="Atom Feed"
        />
        <link
          rel="alternate"
          type="application/feed+json"
          href="/feed.json"
          title="JSON Feed"
        />
      </head>
      <body className="antialiased min-h-screen w-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <StarBackground />
          <main className="flex-1 flex flex-col w-full max-w-none">
            <Navbar />
            <div className="w-full flex-1">{children}</div>
            <Footer />
            <Analytics />
            <SpeedInsights />
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
