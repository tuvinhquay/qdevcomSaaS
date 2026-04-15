import type { ReactNode } from 'react'
import AppVideoBackground from './AppVideoBackground'
import Header from './Header'
import Sidebar from './Sidebar'

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full text-slate-100">
      <AppVideoBackground src="/assets/videos/bieutuong2.mp4" />

      <div className="relative z-10 flex min-h-screen">
        <div className="w-[260px] shrink-0 border-r border-white/15 bg-slate-950/40 backdrop-blur-md">
          <Sidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 bg-slate-950/24 p-6">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}