'use client';

import { cn } from '@/lib/utils';
import { Timer, BarChart3, PenLine } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { useUserSafe, useClerkSafe } from '@/lib/clerk-hooks';
import { clerkEnabled } from '@/lib/clerk-config';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SoundPopover } from '@/components/audio/sound-popover';
import { CompactTimer } from '@/components/editor/compact-timer';

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { href: '/', label: 'Timer', icon: <Timer size={20} /> },
  { href: '/dashboard', label: 'Stats', icon: <BarChart3 size={20} /> },
  { href: '/text-editor', label: 'Write', icon: <PenLine size={20} /> },
];

export function NavBar() {
  const pathname = usePathname();
  const { isSignedIn } = useUserSafe();
  const { openSignIn } = useClerkSafe();

  return (
    <nav className="glass sticky top-0 z-50 px-4 py-3 flex items-center justify-between !rounded-none">
      <Link href="/" className="text-xl font-bold text-brand-text">
        JeFocus
      </Link>

      <div className="flex items-center gap-1">
        {pathname === '/text-editor' ? (
          <CompactTimer />
        ) : (
          navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all',
                pathname === item.href
                  ? 'glass-strong text-brand-text font-medium'
                  : 'text-brand-text/60 hover:text-brand-text hover:bg-brand-light/30'
              )}
            >
              {item.icon}
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          ))
        )}
      </div>

      <div className="flex items-center gap-2">
        <SoundPopover />
        {clerkEnabled && isSignedIn ? (
          <UserButton />
        ) : (
          <button
            onClick={() => openSignIn()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-brand-text/60 hover:text-brand-text hover:bg-brand-light/30 transition-all"
          >
            <span className="hidden sm:inline">Sign in</span>
          </button>
        )}
      </div>
    </nav>
  );
}
