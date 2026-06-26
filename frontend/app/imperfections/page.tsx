'use client';

import { useQuery } from '@tanstack/react-query';
import { getImperfections } from '@/lib/api';
import { useState } from 'react';
import { 
  Wrench, 
  CheckCircle2, 
  ThumbsUp, 
  ExternalLink,
  Sparkles,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Imperfection {
  id: number;
  title: string;
  url: string;
  category: 'UI' | 'Performance' | 'Documentation' | 'Feature Gap' | 'DX';
  status: 'open' | 'claimed' | 'fixed';
  assignee: {
    username: string;
    avatar_url: string;
  } | null;
  fixed_by: string | null;
  pr_url: string | null;
  reactions_count: number;
  created_at: string;
}

const CATEGORIES = ['All', 'UI', 'Performance', 'Documentation', 'Feature Gap', 'DX'];

export default function ImperfectionsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('newest');

  const { data: imperfections, isLoading, error } = useQuery<Imperfection[]>({
    queryKey: ['imperfections'],
    queryFn: getImperfections,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  // Calculate progress statistics
  const total = imperfections?.length || 0;
  const closed = imperfections?.filter(i => i.status === 'fixed').length || 0;
  const percentPolished = total > 0 ? Math.round((closed / total) * 100) : 0;

  // Filter & Sort logic
  const filteredIssues = imperfections
    ?.filter(issue => {
      if (selectedCategory === 'All') return true;
      return issue.category.toLowerCase() === selectedCategory.toLowerCase();
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'reactions') {
        return b.reactions_count - a.reactions_count;
      }
      return 0;
    });

  const getStatusBadge = (status: 'open' | 'claimed' | 'fixed') => {
    switch (status) {
      case 'fixed':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20">Fixed</Badge>;
      case 'claimed':
        return <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20">Claimed</Badge>;
      default:
        return <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20">Open</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      'UI': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      'Performance': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'Documentation': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      'Feature Gap': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      'DX': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    };
    return (
      <Badge variant="outline" className={colors[category] || 'bg-gray-500/10 text-gray-400'}>
        {category}
      </Badge>
    );
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8 space-y-8 text-gray-100">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950/20 border border-gray-800 rounded-2xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -z-10" />
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-semibold">
            <Sparkles className="h-3 w-3" />
            Open Source Community Board
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-purple-400 bg-clip-text text-transparent">
            The Imperfection Board
          </h1>
          <p className="text-gray-400 max-w-xl text-sm md:text-base leading-relaxed">
            Every rough edge is your chance to shape MarketMind. Pick a ticket, claim it, submit a PR, and make this product your own.
          </p>
        </div>

        {/* Polished Stats Card */}
        <div className="w-full md:w-80 bg-gray-950/80 border border-gray-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-gray-400">MarketMind is</span>
            <span className="text-purple-400 font-bold">{percentPolished}% polished</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-gray-900 rounded-full h-3.5 p-0.5 border border-gray-800">
            <div 
              className="bg-gradient-to-r from-purple-600 to-indigo-500 h-2.5 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${percentPolished}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{closed} fixed</span>
            <span>{total} total imperfections</span>
          </div>
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-950/40 border border-gray-900 rounded-xl">
        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <Filter className="h-4 w-4 text-gray-500 shrink-0" />
          {CATEGORIES.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className={selectedCategory === cat ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-900'}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2.5">
          <ArrowUpDown className="h-4 w-4 text-gray-500" />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] bg-gray-950 border-gray-800 text-gray-300">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent className="bg-gray-950 border-gray-800 text-gray-300">
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="reactions">Most Reactions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-gray-950 border-gray-900 animate-pulse">
              <CardHeader className="space-y-3">
                <div className="h-4 bg-gray-800 rounded w-1/4" />
                <div className="h-6 bg-gray-800 rounded w-3/4" />
              </CardHeader>
              <CardContent className="h-20 bg-gray-950/50" />
              <CardFooter className="border-t border-gray-900 py-3 flex justify-between">
                <div className="h-5 bg-gray-800 rounded w-1/3" />
                <div className="h-8 bg-gray-800 rounded w-1/4" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12 p-8 bg-red-950/20 border border-red-900/30 rounded-xl max-w-xl mx-auto space-y-3">
          <h2 className="text-red-400 font-semibold text-lg">Failed to load imperfections</h2>
          <p className="text-gray-400 text-sm">{(error as Error).message || 'An error occurred while loading the board.'}</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="border-red-900/40 text-red-400 hover:bg-red-950/30 mt-2">
            Retry Connection
          </Button>
        </div>
      )}

      {/* Content Board */}
      {!isLoading && !error && (
        <>
          {filteredIssues && filteredIssues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredIssues.map((issue) => (
                <Card 
                  key={issue.id} 
                  className="bg-gray-950 border-gray-900 hover:border-purple-500/40 transition-all duration-300 shadow-lg hover:shadow-purple-950/10 flex flex-col group"
                >
                  <CardHeader className="pb-3 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      {getCategoryBadge(issue.category)}
                      {getStatusBadge(issue.status)}
                    </div>
                    <CardTitle className="text-base font-bold text-gray-200 line-clamp-2 leading-snug group-hover:text-white transition-colors">
                      {issue.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="pb-4 pt-0 space-y-4">
                    {/* Status descriptions */}
                    {issue.status === 'claimed' && issue.assignee && (
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-blue-950/25 border border-blue-900/20 text-xs text-blue-400">
                        <img 
                          src={issue.assignee.avatar_url} 
                          alt={issue.assignee.username} 
                          className="h-5 w-5 rounded-full border border-blue-400/30"
                        />
                        <span>Claimed by <strong>@{issue.assignee.username}</strong></span>
                      </div>
                    )}

                    {issue.status === 'fixed' && (
                      <div className="flex flex-col gap-1.5 px-3 py-2 rounded-lg bg-emerald-950/20 border border-emerald-900/20 text-xs text-emerald-400">
                        <div className="flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span>Fixed by @{issue.fixed_by}</span>
                        </div>
                        {issue.pr_url && (
                          <a 
                            href={issue.pr_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1 text-emerald-500 hover:underline font-semibold"
                          >
                            View PR <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}

                    {issue.status === 'open' && (
                      <p className="text-xs text-gray-500 italic">
                        Unassigned. Be the first to claim and build this!
                      </p>
                    )}
                  </CardContent>

                  <CardFooter className="border-t border-gray-900 py-3 bg-gray-950/60 flex items-center justify-between rounded-b-xl">
                    <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                      <ThumbsUp className="h-3.5 w-3.5 text-gray-500" />
                      {issue.reactions_count} reactions
                    </span>

                    <Button 
                      asChild 
                      variant={issue.status === 'fixed' ? 'ghost' : 'outline'}
                      size="sm"
                      className="h-8 border-gray-800 hover:bg-purple-950/20 hover:text-purple-400 hover:border-purple-500/30 font-semibold"
                    >
                      <a 
                        href={issue.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5"
                      >
                        {issue.status === 'fixed' ? 'View Issue' : issue.status === 'claimed' ? 'Help Out' : 'Claim This'}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-20 px-4 bg-gray-950/20 border border-gray-900 rounded-2xl max-w-xl mx-auto space-y-4">
              <div className="inline-flex p-4 rounded-full bg-purple-500/5 border border-purple-500/10 text-purple-400">
                <Wrench className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-200">No imperfections found</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
                Either we&apos;re perfect (extremely unlikely) or we haven&apos;t filed any issue reports under the &apos;imperfection&apos; label yet!
              </p>
              <Button asChild className="bg-purple-600 hover:bg-purple-700 mt-2">
                <a 
                  href="https://github.com/Savior-Systems/MarketMind/issues" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  File an Issue
                </a>
              </Button>
            </div>
          )}
        </>
      )}

    </div>
  );
}
