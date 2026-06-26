'use client';

import { useAuthStore } from '@/lib/stores/auth';
import { useTheme } from 'next-themes';
import { Sun, Moon, Bell, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="h-16 border-b border-gray-900/60 bg-gray-950/20 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="text-sm text-gray-500 font-medium hidden md:block">
        Instance: Local Development
      </div>
      <div className="md:hidden w-10 h-10" />

      <div className="flex items-center gap-4">
        {mounted && (
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-gray-400 hover:text-gray-200">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        )}

        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-200 relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-purple-500 animate-ping" />
        </Button>

        {isAuthenticated && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8 border border-purple-500/20">
                  <AvatarFallback className="bg-purple-950/50 text-purple-300 text-xs">
                    {user.email.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-gray-950 border border-gray-900 text-gray-300" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-gray-100">User Profile</p>
                  <p className="text-xs leading-none text-gray-500">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-900" />
              <DropdownMenuItem asChild className="hover:bg-gray-900 focus:bg-gray-900 focus:text-purple-400 cursor-pointer">
                <Link href="/settings" className="flex items-center w-full">
                  <UserIcon className="mr-2 h-4 w-4 text-gray-400" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-900" />
              <DropdownMenuItem onClick={logout} className="hover:bg-gray-900 focus:bg-gray-900 focus:text-red-400 text-red-400 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4 text-red-400" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-medium">
            <Link href="/settings">Sign In</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
