'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'
import {
  ArchiveBoxIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  HomeIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@/core/auth/AuthProvider'
import { type UserRole } from '@/core/firestore/firestoreClient'

type NavItem = {
  href: string
  label: string
  Icon: ComponentType<{ className?: string }>
  allowedRoles: UserRole[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: HomeIcon, allowedRoles: ['owner', 'admin', 'manager', 'staff', 'guest'] },
  { href: '/chat', label: 'Chat', Icon: ChatBubbleLeftRightIcon, allowedRoles: ['owner', 'admin', 'manager', 'staff', 'guest'] },
  { href: '/work-orders', label: 'Work Orders', Icon: ClipboardDocumentListIcon, allowedRoles: ['owner', 'admin', 'manager', 'staff'] },
  { href: '/production', label: 'Production', Icon: WrenchScrewdriverIcon, allowedRoles: ['owner', 'admin', 'manager'] },
  { href: '/warehouse', label: 'Warehouse', Icon: ArchiveBoxIcon, allowedRoles: ['owner', 'admin', 'staff'] },
  { href: '/settings', label: 'Settings', Icon: Cog6ToothIcon, allowedRoles: ['owner', 'admin'] },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { currentUserRole } = useAuth()

  const visibleNavItems = currentUserRole
    ? navItems.filter((item) => item.allowedRoles.includes(currentUserRole))
    : []

  return (
    <div className="flex h-full flex-col px-4 py-5">
      <Link
        href="/dashboard"
        className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-900/45"
      >
        <div className="relative h-9 w-9 overflow-hidden rounded-md bg-slate-900/70 ring-1 ring-white/20">
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
          {visibleNavItems.map(({ href, label, Icon }) => {
            const isActive = pathname === href || (href !== '/' && pathname?.startsWith(`${href}/`))

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={[
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                    isActive
                      ? 'bg-slate-900/65 text-slate-100 ring-1 ring-white/15'
                      : 'text-slate-300 hover:bg-slate-900/40 hover:text-slate-100',
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

      <div className="mt-4 rounded-lg border border-white/15 bg-slate-950/30 px-3 py-3 text-xs text-slate-300">
        <div className="font-medium text-slate-300">Quick tip</div>
        <div className="mt-1">Assets auto-sync t? `src/assets` ? `public/assets`.</div>
      </div>
    </div>
  )
}
