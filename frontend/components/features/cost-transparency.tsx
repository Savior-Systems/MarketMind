'use client';

import { useQuery } from '@tanstack/react-query';
import { getBrands, getSavings } from '@/lib/api';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Bot, Share2, Sparkles, TrendingDown } from 'lucide-react';
import Link from 'next/link';

interface ContentPiece {
  id: number;
  platform: string;
  text: string;
  status: string;
  scheduled_at?: string;
  published_at?: string;
  created_at?: string;
}

interface AgentRun {
  id: number;
  agent_name: string;
  status: string;
  tokens_used: number;
  cost_usd: number;
  started_at?: string;
}

interface CostTransparencyProps {
  contentList: ContentPiece[];
  runsList: AgentRun[];
}

export function CostTransparency({ contentList = [], runsList = [] }: CostTransparencyProps) {
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);

  // Fetch Brands
  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: getBrands,
  });

  // Automatically select first brand when loaded
  useEffect(() => {
    if (brands && brands.length > 0 && !selectedBrandId) {
      setSelectedBrandId(brands[0].id);
    }
  }, [brands, selectedBrandId]);

  // Fetch Savings Analytics
  const { data: savings, isLoading } = useQuery({
    queryKey: ['savings', selectedBrandId],
    queryFn: () => getSavings(selectedBrandId!),
    enabled: !!selectedBrandId,
    refetchInterval: 60000, // Refetch every 60s
  });

  // Calculate "This Session" (last 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const sessionPieces = contentList.filter(
    (c) => new Date(c.created_at || Date.now()) > oneHourAgo
  );
  const sessionCount = sessionPieces.length;

  const sessionRuns = runsList.filter(
    (r) => new Date(r.started_at || Date.now()) > oneHourAgo
  );
  const sessionTokens = sessionRuns.reduce((sum, r) => sum + r.tokens_used, 0);
  const sessionCost = sessionRuns.reduce((sum, r) => sum + r.cost_usd, 0);

  // Jasper/Buffer comparisons
  const jasperSessionCost = 99.00;
  const sessionSaved = sessionCount > 0 ? (jasperSessionCost - sessionCost) : 0;

  const shareSavings = () => {
    const text = `I just generated ${sessionCount || 3} marketing posts with MarketMind for $${sessionCost.toFixed(4) || '0.0015'}. Jasper would charge $99 for the same. That's ${(savings?.savings_percentage ?? 99).toFixed(2)}% savings! 🚀`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://github.com/Savior-Systems/MarketMind')}`;
    window.open(url, '_blank');
  };

  if (isLoading || !selectedBrandId) {
    return (
      <Card className="bg-gray-950 border-gray-900 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-500 to-indigo-500" />
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-gray-200">Cost Transparency Calculator</CardTitle>
          <CardDescription>Calculating real-time API vs SaaS costs...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full bg-gray-900 animate-pulse" />
          <Skeleton className="h-20 w-full bg-gray-900 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-950 border-gray-900 shadow-xl overflow-hidden relative group hover:border-purple-500/20 transition-all duration-300">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-500 to-indigo-500" />
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-bold text-gray-100 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-purple-400" />
            Cost Transparency
          </CardTitle>
          <CardDescription className="text-xs text-gray-400">
            Real-time API billing vs SaaS comparisons
          </CardDescription>
        </div>
        {brands && brands.length > 1 && (
          <select
            value={selectedBrandId || ''}
            onChange={(e) => setSelectedBrandId(Number(e.target.value))}
            className="bg-gray-900 border border-gray-800 text-xs text-gray-300 rounded px-2 py-1 focus:ring-purple-500 focus:border-purple-500"
          >
            {brands.map((b: { id: number; name: string }) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* This Session Section */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">This Session</h4>
          <div className="bg-gray-900/30 border border-gray-900/60 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between text-gray-400">
              <span>Pieces generated:</span>
              <span className="font-semibold text-gray-200">{sessionCount}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Tokens consumed:</span>
              <span className="font-mono text-gray-200">{sessionTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Actual API cost:</span>
              <span className="font-mono font-semibold text-purple-400">${sessionCost.toFixed(4)}</span>
            </div>
            <div className="border-t border-gray-900/60 pt-2 flex flex-col gap-1 text-[11px] text-gray-500">
              <div className="flex justify-between">
                <span>Jasper AI cost:</span>
                <span className="line-through">$99.00</span>
              </div>
              <div className="flex justify-between">
                <span>Buffer AI cost:</span>
                <span className="line-through">$120.00</span>
              </div>
            </div>
            {sessionCount > 0 && (
              <div className="bg-purple-950/20 border border-purple-500/10 rounded-lg p-2 text-center text-purple-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 mt-2">
                <Sparkles className="h-3 w-3 text-purple-400" />
                You saved ${sessionSaved.toFixed(2)} this session!
              </div>
            )}
          </div>
        </div>

        {/* All-Time Savings Section */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">All-Time Savings</h4>
          <div className="bg-gradient-to-br from-purple-950/20 to-indigo-950/20 border border-purple-500/10 rounded-xl p-3.5 space-y-2.5 text-xs">
            <div className="flex justify-between items-baseline">
              <span className="text-gray-400">Total saved since install:</span>
              <span className="text-lg font-extrabold text-green-400">${(savings?.total_saved ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 border-t border-purple-500/10 pt-2">
              <span>Platform Model:</span>
              <span className="text-purple-300 flex items-center gap-1">
                <Bot className="h-3 w-3" /> LiteLLM Swarm
              </span>
            </div>
            <div className="text-[10px] text-center text-gray-500">
              <Link href="/settings" className="text-purple-400 hover:text-purple-300 font-semibold underline decoration-dotted">
                Switch to Ollama ($0/forever)
              </Link>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Button onClick={shareSavings} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center justify-center gap-2 py-2 rounded-xl">
          <Share2 className="h-3.5 w-3.5" />
          Share My Savings
        </Button>
      </CardContent>
    </Card>
  );
}
