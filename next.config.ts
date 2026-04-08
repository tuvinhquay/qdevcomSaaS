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
  // In some constrained Windows environments, Next's build-time type checking can fail
  // due to process spawn restrictions. Keep CI/typechecks separate from `next build`.
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default withPWA(nextConfig)
