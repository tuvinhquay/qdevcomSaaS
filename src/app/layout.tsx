import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/core/auth/AuthProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Q-DevCom SaaS v2.0',
  description: 'Q-DevCom SaaS v2.0 â€” Foundation ready',
  applicationName: 'Q-DevCom SaaS v2.0',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Q-DevCom',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0f172a' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full bg-background text-foreground font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}