'use client';

import { useAuthStore } from '@/lib/stores/auth';
import { useQuery } from '@tanstack/react-query';
import { getContent } from '@/lib/api';
import { useState, useEffect } from 'react';
import { TwitterIcon, LinkedinIcon, InstagramIcon, FacebookIcon } from '@/components/icons';
import { 
  ChevronLeft, 
  ChevronRight, 
  Bot,
  Star
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface ContentPiece {
  id: number;
  platform: string;
  text: string;
  status: string;
  scheduled_at?: string;
  published_at?: string;
}

export default function ContentCalendar() {
  const { isAuthenticated, token } = useAuthStore();

  // Calendar dates
  const [currentDate, setCurrentDate] = useState(new Date());


  // Selected Day Dialog state
  const [selectedDayContent, setSelectedDayContent] = useState<ContentPiece[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDateLabel, setSelectedDateLabel] = useState('');

  // Platform Filter state
  const [filters, setFilters] = useState<Record<string, boolean>>({
    twitter: true,
    linkedin: true,
    instagram: true,
    facebook: true,
  });

  // Fetch Content Pieces
  const { data: contentData, isLoading } = useQuery<ContentPiece[]>({
    queryKey: ['content', token],
    queryFn: () => getContent(),
    enabled: isAuthenticated && !!token,
  });

  // Star metrics for badge
  const [starCount, setStarCount] = useState('1,337');
  useEffect(() => {
    fetch('http://localhost:8000/api/v1/public/metrics')
      .then(res => res.json())
      .then(data => setStarCount(data.github?.stars ?? '1,337'))
      .catch(() => {});
  }, []);

  const handleFilterToggle = (platform: string) => {
    setFilters(prev => ({ ...prev, [platform]: !prev[platform] }));
  };

  // Helper date calculators
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const setToday = () => {
    setCurrentDate(new Date());
  };

  // Filter content
  const activeContent = (contentData || []).filter((item: ContentPiece) => {
    const platformKey = item.platform.toLowerCase();
    return filters[platformKey] ?? false;
  });

  const getDayContent = (dayNumber: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    return activeContent.filter((item: ContentPiece) => {
      const dateStr = item.scheduled_at || item.published_at;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === dayNumber;
    });
  };

  const handleDayClick = (dayNumber: number) => {
    const dayContent = getDayContent(dayNumber);
    if (dayContent.length > 0) {
      setSelectedDayContent(dayContent);
      setSelectedDateLabel(`${currentDate.toLocaleString('default', { month: 'long' })} ${dayNumber}, ${currentDate.getFullYear()}`);
      setIsDialogOpen(true);
    }
  };

  // Rendering month helper arrays
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayIndex = getFirstDayOfMonth(currentDate);

  const monthYearString = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const platformInfo: Record<string, { color: string; icon: React.ElementType }> = {
    twitter: { color: 'bg-[#1DA1F2] text-[#1DA1F2]', icon: TwitterIcon },
    linkedin: { color: 'bg-[#0A66C2] text-[#0A66C2]', icon: LinkedinIcon },
    instagram: { color: 'bg-[#E4405F] text-[#E4405F]', icon: InstagramIcon },
    facebook: { color: 'bg-[#1877F2] text-[#1877F2]', icon: FacebookIcon },
  };

  const isToday = (dayNum: number) => {
    const today = new Date();
    return today.getDate() === dayNum && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Title / Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-950/40 border border-gray-900 rounded-2xl p-6 backdrop-blur-sm">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-gray-100 to-gray-400 bg-clip-text text-transparent">
            Content Calendar
          </h1>
          <p className="text-sm text-gray-400">
            Monitor and coordinates publication timelines across all channels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filters */}
          <div className="flex gap-4 border border-gray-900 bg-gray-900/30 px-4 py-2 rounded-xl">
            {Object.keys(platformInfo).map((key) => (
              <label key={key} className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-400 hover:text-gray-200">
                <Checkbox
                  checked={filters[key]}
                  onCheckedChange={() => handleFilterToggle(key)}
                  className="border-gray-800 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <span className="capitalize">{key}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={setToday} className="border-gray-800 text-gray-300">
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8 border-gray-900 text-gray-400">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-gray-200 w-32 text-center">{monthYearString}</span>
            <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8 border-gray-900 text-gray-400">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <Card className="bg-gray-950 border-gray-900 p-6 overflow-hidden">
        {isLoading ? (
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-24 bg-gray-900 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Days Header */}
            <div className="grid grid-cols-7 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Numbers */}
            <div className="grid grid-cols-7 gap-2.5">
              {/* Padding for first day */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="h-24 rounded-lg bg-gray-900/10 border border-gray-950" />
              ))}

              {/* Days List */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dayContent = getDayContent(dayNum);
                const hasContent = dayContent.length > 0;
                
                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => handleDayClick(dayNum)}
                    className={`h-24 p-2 border rounded-xl flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                      hasContent 
                        ? 'border-gray-900 hover:border-purple-500/30 bg-gray-900/30' 
                        : 'border-transparent bg-gray-950 hover:bg-gray-900/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${
                        isToday(dayNum) 
                          ? 'h-5 w-5 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold' 
                          : 'text-gray-400'
                      }`}>
                        {dayNum}
                      </span>
                    </div>

                    {/* Dots List */}
                    {hasContent && (
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-1">
                          {dayContent.slice(0, 3).map((item: ContentPiece) => {
                            const pKey = item.platform.toLowerCase();
                            return (
                              <span
                                key={item.id}
                                className={`h-1.5 w-1.5 rounded-full ${platformInfo[pKey]?.color || 'bg-gray-400'}`}
                              />
                            );
                          })}
                          {dayContent.length > 3 && (
                            <span className="text-[8px] text-gray-500 font-bold leading-none">
                              +{dayContent.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Selected Day Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-gray-950 border border-gray-900 text-gray-300 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-100">{selectedDateLabel}</DialogTitle>
            <DialogDescription className="text-gray-500">Scheduled publications for this day.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {selectedDayContent.map((item) => {
              const pKey = item.platform.toLowerCase();
              const Icon = platformInfo[pKey]?.icon || Bot;
              return (
                <div key={item.id} className="p-3 bg-gray-900 border border-gray-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-purple-400" />
                      <span className="text-xs font-semibold capitalize text-gray-200">{item.platform}</span>
                    </div>
                    <Badge variant="outline" className="border-purple-500/20 bg-purple-950/20 text-purple-400 text-[10px]">
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2 italic">&ldquo;{item.text}&rdquo;</p>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer star count badge */}
      <footer className="text-center text-[10px] text-gray-500 pt-8 border-t border-gray-900 flex justify-center items-center gap-2">
        <span>Powered by MarketMind</span>
        <a 
          href="https://github.com/Savior-Systems/MarketMind"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded px-1.5 py-0.5 hover:text-gray-300 transition-colors"
        >
          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
          <span>{starCount}</span>
        </a>
      </footer>
    </div>
  );
}
