import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Deep Job Researcher',
  description: 'AI-powered job matching using resume analysis and live web scraping with Hyperbrowser',
  keywords: 'job search, AI matching, resume analysis, web scraping, career finder',
  authors: [{ name: 'Hyperbrowser' }],
  openGraph: {
    title: 'Deep Job Researcher',
    description: 'Match your skills with live job opportunities using AI and web scraping',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deep Job Researcher',
    description: 'AI-powered job matching with real-time web scraping',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
