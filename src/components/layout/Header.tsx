export default function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/70 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="text-sm font-semibold tracking-tight">Q-DevCom SaaS</div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-xs text-slate-400">Signed in as</div>
            <div className="text-sm font-medium">User</div>
          </div>

          <div className="h-9 w-9 rounded-full bg-slate-800 ring-2 ring-slate-700" />
        </div>
      </div>
    </header>
  )
}
