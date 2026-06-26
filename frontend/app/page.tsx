'use client';

import { useAuthStore } from '@/lib/stores/auth';
import { useQuery } from '@tanstack/react-query';
import { 
  getContent, 
  getAgentRuns, 
  getPublicMetrics, 
  register as apiRegister 
} from '@/lib/api';
import { 
  FileText, 
  Calendar, 
  Send, 
  Bot, 
  ArrowUpRight, 
  Loader2, 
  Brain,
  Star
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import Link from 'next/link';

interface ContentPiece {
  id: number;
  platform: string;
  text: string;
  status: string;
  scheduled_at?: string;
  published_at?: string;
}

interface AgentRun {
  id: number;
  agent_name: string;
  status: string;
  input_data?: unknown;
  output_data?: unknown;
  error_message?: string;
  tokens_used: number;
  cost_usd: number;
  started_at: string;
  completed_at?: string;
}

export default function Dashboard() {
  const { isAuthenticated, token, login } = useAuthStore();
  const { toast } = useToast();

  // Local auth form state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Queries (only active when logged in)
  const { data: contentData, isLoading: contentLoading } = useQuery({
    queryKey: ['content', token],
    queryFn: () => getContent(),
    enabled: isAuthenticated && !!token,
  });

  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: ['runs', token],
    queryFn: () => getAgentRuns(),
    enabled: isAuthenticated && !!token,
  });

  const { data: publicMetrics } = useQuery({
    queryKey: ['publicMetrics'],
    queryFn: () => getPublicMetrics(),
  });

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setAuthLoading(true);

    try {
      if (authMode === 'login') {
        await login(email, password);
        toast({
          title: 'Welcome back!',
          description: 'You have logged in successfully.',
        });
      } else {
        await apiRegister(email, password);
        toast({
          title: 'Account created!',
          description: 'Please sign in with your credentials.',
        });
        setAuthMode('login');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Verification failed. Check credentials.';
      toast({
        title: 'Authentication Error',
        description: errMsg,
        variant: 'destructive',
      });
    } finally {
      setAuthLoading(false);
    }
  };

  // If not logged in, render the Auth view
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md bg-gray-950 border border-gray-900 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 animate-pulse" />
          <CardHeader className="space-y-1 text-center pt-8">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-2xl bg-purple-950/50 flex items-center justify-center border border-purple-500/20">
                <Brain className="h-6 w-6 text-purple-400 animate-pulse" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-gray-100">
              Welcome to MarketMind
            </CardTitle>
            <CardDescription className="text-gray-400 text-xs">
              Built By One. Owned By Everyone. Sign in to your instance.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-900 border-gray-800 text-gray-200 placeholder-gray-500 focus-visible:ring-purple-500 focus-visible:border-purple-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-900 border-gray-800 text-gray-200 placeholder-gray-500 focus-visible:ring-purple-500 focus-visible:border-purple-500"
                  required
                />
              </div>
              <Button type="submit" disabled={authLoading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-lg shadow-purple-950/20">
                {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center text-xs">
              <span className="text-gray-500">
                {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
              </span>{' '}
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
              >
                {authMode === 'login' ? 'Register Now' : 'Sign In'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate statistics
  const contentList = (contentData as ContentPiece[]) || [];
  const runsList = (runsData as AgentRun[]) || [];

  const createdCount = contentList.length;
  const scheduledCount = contentList.filter((c) => c.status === 'scheduled').length;
  const publishedCount = contentList.filter((c) => c.status === 'published').length;
  const aiRunsCount = runsList.length;

  const starCount = publicMetrics?.github?.stars ?? '1,337';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner with GitHub stars */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-950/40 border border-gray-900 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-gray-100 to-gray-400 bg-clip-text text-transparent">
            Overview Dashboard
          </h1>
          <p className="text-sm text-gray-400">
            Monitor content outputs, agent scheduler runs, and instance metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/Savior-Systems/MarketMind"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs font-semibold text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
            <span>{starCount} Stars</span>
          </a>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Content Created */}
        <Card className="bg-gray-950 border-gray-900 hover:border-purple-500/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-xs font-semibold text-gray-400">Content Created</span>
            <div className="h-7 w-7 rounded-lg bg-purple-950/30 flex items-center justify-center border border-purple-500/10">
              <FileText className="h-4 w-4 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            {contentLoading ? (
              <Skeleton className="h-8 w-16 bg-gray-900" />
            ) : (
              <div className="text-2xl font-bold text-gray-100">{createdCount}</div>
            )}
            <p className="text-[10px] text-gray-500 mt-1">Total drafts and versions</p>
          </CardContent>
        </Card>

        {/* Scheduled */}
        <Card className="bg-gray-950 border-gray-900 hover:border-purple-500/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-xs font-semibold text-gray-400">Scheduled Posts</span>
            <div className="h-7 w-7 rounded-lg bg-blue-950/30 flex items-center justify-center border border-blue-500/10">
              <Calendar className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            {contentLoading ? (
              <Skeleton className="h-8 w-16 bg-gray-900" />
            ) : (
              <div className="text-2xl font-bold text-gray-100">{scheduledCount}</div>
            )}
            <p className="text-[10px] text-gray-500 mt-1">Active scheduling pipelines</p>
          </CardContent>
        </Card>

        {/* Published */}
        <Card className="bg-gray-950 border-gray-900 hover:border-purple-500/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-xs font-semibold text-gray-400">Published Posts</span>
            <div className="h-7 w-7 rounded-lg bg-green-950/30 flex items-center justify-center border border-green-500/10">
              <Send className="h-4 w-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            {contentLoading ? (
              <Skeleton className="h-8 w-16 bg-gray-900" />
            ) : (
              <div className="text-2xl font-bold text-gray-100">{publishedCount}</div>
            )}
            <p className="text-[10px] text-gray-500 mt-1">Pushed to destination channels</p>
          </CardContent>
        </Card>

        {/* AI Runs */}
        <Card className="bg-gray-950 border-gray-900 hover:border-purple-500/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-xs font-semibold text-gray-400">AI Runs</span>
            <div className="h-7 w-7 rounded-lg bg-pink-950/30 flex items-center justify-center border border-pink-500/10">
              <Bot className="h-4 w-4 text-pink-400" />
            </div>
          </CardHeader>
          <CardContent>
            {runsLoading ? (
              <Skeleton className="h-8 w-16 bg-gray-900" />
            ) : (
              <div className="text-2xl font-bold text-gray-100">{aiRunsCount}</div>
            )}
            <p className="text-[10px] text-gray-500 mt-1">Celery agent background iterations</p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section: Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-200">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Button asChild size="lg" className="h-16 bg-gray-950 hover:bg-gray-900 text-gray-300 border border-gray-900 hover:border-purple-500/30 flex items-center justify-between px-6 rounded-2xl group transition-all">
            <Link href="/content/generate">
              <span className="flex items-center gap-3 font-semibold text-sm">
                Generate Content <span className="text-base group-hover:animate-bounce">✨</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </Button>

          <Button asChild size="lg" className="h-16 bg-gray-950 hover:bg-gray-900 text-gray-300 border border-gray-900 hover:border-purple-500/30 flex items-center justify-between px-6 rounded-2xl group transition-all">
            <Link href="/calendar">
              <span className="flex items-center gap-3 font-semibold text-sm">
                View Calendar <span className="text-base group-hover:scale-110 transition-transform">📅</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </Button>

          <Button asChild size="lg" className="h-16 bg-gray-950 hover:bg-gray-900 text-gray-300 border border-gray-900 hover:border-purple-500/30 flex items-center justify-between px-6 rounded-2xl group transition-all">
            <Link href="/analytics">
              <span className="flex items-center gap-3 font-semibold text-sm">
                Run Analytics <span className="text-base group-hover:rotate-12 transition-transform">📊</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Bottom Section: Recent Activity (AgentRuns) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-200">Recent AI Agent Activity</h2>
          <Button asChild variant="link" className="text-xs text-purple-400 hover:text-purple-300 px-0">
            <Link href="/settings">View Logs</Link>
          </Button>
        </div>

        <Card className="bg-gray-950 border-gray-900 overflow-hidden shadow-xl">
          {runsLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-6 w-full bg-gray-900" />
              <Skeleton className="h-6 w-full bg-gray-900" />
              <Skeleton className="h-6 w-full bg-gray-900" />
            </div>
          ) : runsList.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 space-y-3">
              <p>Welcome to MarketMind! Start by creating a Brand Profile in Settings.</p>
              <Button asChild variant="outline" size="sm" className="border-gray-800 text-gray-300 hover:bg-gray-900">
                <Link href="/settings">Create Brand Profile</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-900 bg-gray-900/30 text-gray-400 font-semibold text-xs uppercase tracking-wider">
                    <th className="p-4">Agent Name</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4 text-right">Tokens Used</th>
                    <th className="p-4 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900/60 text-gray-300">
                  {runsList.slice(0, 10).map((run) => (
                    <tr key={run.id} className="hover:bg-gray-900/20 transition-colors">
                      <td className="p-4 font-medium text-gray-200 flex items-center gap-2">
                        <Bot className="h-4 w-4 text-purple-400" />
                        {run.agent_name}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className={
                            run.status === 'success' || run.status === 'completed'
                              ? 'border-green-500/20 bg-green-500/10 text-green-400'
                              : run.status === 'failed' || run.status === 'error'
                              ? 'border-red-500/20 bg-red-500/10 text-red-400'
                              : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400'
                          }
                        >
                          {run.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-gray-500 text-xs">
                        {new Date(run.started_at).toLocaleString()}
                      </td>
                      <td className="p-4 text-right text-gray-400 font-mono text-xs">
                        {run.tokens_used.toLocaleString()}
                      </td>
                      <td className="p-4 text-right text-purple-400 font-mono font-semibold text-xs">
                        ${run.cost_usd.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
