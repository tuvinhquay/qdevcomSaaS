import type { ReactNode } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <div className="w-[260px] shrink-0 border-r border-slate-800 bg-slate-950/60">
          <Sidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
