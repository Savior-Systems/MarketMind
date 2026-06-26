'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  Calendar, 
  BarChart3, 
  Settings, 
  Brain, 
  Menu 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Content', href: '/content/generate', icon: FileText },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex-1 space-y-1.5 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive 
                ? "bg-purple-950/40 text-purple-400 border-l-2 border-purple-500 pl-2.5" 
                : "text-gray-400 hover:text-gray-100 hover:bg-gray-900/60"
            )}
          >
            <Icon className={cn("h-4 w-4", isActive ? "text-purple-400" : "text-gray-400")} />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-950 border-r border-gray-900 min-h-screen text-gray-300">
        <div className="flex h-16 items-center px-6 border-b border-gray-900 gap-2.5">
          <Brain className="h-6 w-6 text-purple-500 animate-pulse" />
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            MarketMind
          </span>
        </div>
        <NavLinks />
        <div className="p-4 border-t border-gray-900 text-xs text-gray-500 text-center">
          Built By One. Owned By Everyone.
        </div>
      </aside>

      {/* Mobile Trigger & Sidebar */}
      <div className="md:hidden fixed top-3 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-100 bg-gray-950/80 border border-gray-800">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-gray-950 border-r border-gray-900 text-gray-300">
            <div className="flex h-16 items-center px-6 border-b border-gray-900 gap-2.5">
              <Brain className="h-6 w-6 text-purple-500 animate-pulse" />
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                MarketMind
              </span>
            </div>
            <NavLinks onClick={() => setOpen(false)} />
            <div className="p-4 border-t border-gray-900 text-xs text-gray-500 text-center">
              Built By One. Owned By Everyone.
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
