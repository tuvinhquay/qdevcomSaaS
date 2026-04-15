import type { NextConfig } from 'next'
import withPWAInit from 'next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Avoid service worker minification (Workbox uses Rollup + terser workers on Windows,
  // which can fail in constrained environments). This does not affect Next.js app code.
  mode: 'development',
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  experimental: {
    // Use worker threads (not child processes) during build steps like static analysis/prerender.
    // This avoids `spawn EPERM` failures in constrained Windows environments.
    workerThreads: true,
    cpus: 1,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
        ],
      },
    ]
  },
}

export default withPWA(nextConfig)
