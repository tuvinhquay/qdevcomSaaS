'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArchiveBoxIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  HomeIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: HomeIcon },
  { href: '/chat', label: 'Chat', Icon: ChatBubbleLeftRightIcon },
  { href: '/work-orders', label: 'Work Orders', Icon: ClipboardDocumentListIcon },
  { href: '/production', label: 'Production', Icon: WrenchScrewdriverIcon },
  { href: '/warehouse', label: 'Warehouse', Icon: ArchiveBoxIcon },
  { href: '/settings', label: 'Settings', Icon: Cog6ToothIcon },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col px-4 py-5">
      <Link
        href="/dashboard"
        className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-900/60"
      >
        <div className="relative h-9 w-9 overflow-hidden rounded-md bg-slate-900 ring-1 ring-slate-800">
          <Image
            src="/assets/images/appqdev.png"
            alt="Q-DevCom"
            fill
            className="object-contain p-1"
            sizes="36px"
            priority
          />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Q-DevCom</span>
          <span className="text-xs text-slate-400">SaaS v2</span>
        </div>
      </Link>

      <nav className="mt-5 flex-1">
        <ul className="space-y-1">
          {navItems.map(({ href, label, Icon }) => {
            const isActive =
              pathname === href ||
              (href !== '/' && pathname?.startsWith(`${href}/`))

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={[
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                    isActive
                      ? 'bg-slate-900/70 text-slate-100 ring-1 ring-slate-800'
                      : 'text-slate-300 hover:bg-slate-900/50 hover:text-slate-100',
                  ].join(' ')}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-3 text-xs text-slate-400">
        <div className="font-medium text-slate-300">Quick tip</div>
        <div className="mt-1">Assets auto-sync từ `src/assets` → `public/assets`.</div>
      </div>
    </div>
  )
}
