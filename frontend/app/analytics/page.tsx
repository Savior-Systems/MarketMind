'use client';

import { useAuthStore } from '@/lib/stores/auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getBrands, getAnalytics, getTaskStatus } from '@/lib/api';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  FileText, 
  TrendingUp, 
  Award,
  RefreshCw,
  Star
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface BrandProfile {
  id: number;
  name: string;
}

interface AnalyticsReport {
  summary: string;
  statistics: {
    total_posts: number;
    posts_per_day: number;
    consistency_score: number;
    platform_breakdown: Record<string, number>;
  };
  insights: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  recommendations: Array<{
    action: string;
    reasoning: string;
    expected_impact: 'high' | 'medium' | 'low';
  }>;
}

export default function AnalyticsDashboard() {
  const { isAuthenticated, token } = useAuthStore();
  const { toast } = useToast();

  const [brandId, setBrandId] = useState<string>('');
  const [dateRange, setDateRange] = useState('7d');
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<AnalyticsReport | null>(null);

  // Fetch Brands
  const { data: brandsData } = useQuery<BrandProfile[]>({
    queryKey: ['brands', token],
    queryFn: () => getBrands(),
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

  // Mutation to request analytics Celery task
  const reportMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const res = await getAnalytics(Number(brandId), dateRange);
      const taskId = res.task_id;

      // Poll task status
      return new Promise<AnalyticsReport>((resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            const task = await getTaskStatus(taskId);
            if (task.status === 'SUCCESS') {
              clearInterval(interval);
              resolve(task.result?.data?.report);
            } else if (task.status === 'FAILURE') {
              clearInterval(interval);
              reject(new Error('Analytics swarm execution failed. Make sure content pieces are generated.'));
            }
          } catch (err) {
            clearInterval(interval);
            reject(err);
          }
        }, 1500);
      });
    },
    onSuccess: (data) => {
      setReport(data);
      setIsGenerating(false);
      toast({
        title: 'Report Compiled!',
        description: 'AI agent successfully analyzed brand metrics.',
      });
    },
    onError: (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : 'AI performance analysis failed.';
      setIsGenerating(false);
      toast({
        title: 'Analytics Error',
        description: errMsg,
        variant: 'destructive',
      });
    },
  });

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandId) return;
    reportMutation.mutate();
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-950/40 border border-gray-900 rounded-2xl p-6 backdrop-blur-sm">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-gray-100 to-gray-400 bg-clip-text text-transparent">
            AI Analytics
          </h1>
          <p className="text-sm text-gray-400">
            Synthesize posting histories and extract swarms suggestions.
          </p>
        </div>
      </div>

      {/* Config Card */}
      <Card className="bg-gray-950 border-gray-900 shadow-xl">
        <CardContent className="pt-6">
          <form onSubmit={handleGenerateReport} className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Target Brand</label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger className="bg-gray-900 border-gray-800 text-gray-300 focus:ring-purple-500">
                  <SelectValue placeholder="Select Brand..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-950 border-gray-900 text-gray-300">
                  {brandsData?.map((brand) => (
                    <SelectItem key={brand.id} value={String(brand.id)} className="hover:bg-gray-900">
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Date Range</label>
              <div className="flex border border-gray-900 rounded-xl bg-gray-900/30 p-1">
                {['7d', '30d', '90d'].map((range) => (
                  <Button
                    key={range}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`rounded-lg text-xs capitalize ${
                      dateRange === range
                        ? 'bg-purple-950/40 text-purple-400 font-semibold'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                    onClick={() => setDateRange(range)}
                  >
                    {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={!brandId || isGenerating}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-10 px-6 rounded-xl shadow-lg shadow-purple-950/20"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Swarms...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Loading Skeletons */}
      {isGenerating && (
        <Card className="bg-gray-950 border-gray-900 p-8 text-center space-y-6">
          <div className="flex justify-center">
            <TrendingUp className="h-10 w-10 text-purple-400 animate-bounce" />
          </div>
          <p className="text-sm font-medium text-gray-300">MarketMind is analyzing your content performance... 📊</p>
          <div className="space-y-3 max-w-xl mx-auto">
            <Skeleton className="h-6 w-full bg-gray-900" />
            <Skeleton className="h-6 w-5/6 bg-gray-900" />
          </div>
        </Card>
      )}

      {/* Report Display */}
      {!isGenerating && report && (
        <div className="space-y-8">
          {/* Executive Summary */}
          <Card className="bg-gray-950 border-gray-900 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-purple-500 to-indigo-500" />
            <CardHeader>
              <CardTitle className="text-base font-bold text-gray-200">AI Performance Synthesis</CardTitle>
              <CardDescription className="text-gray-500 text-xs">Dynamic overview compiled by Swarm agents.</CardDescription>
            </CardHeader>
            <CardContent>
              <blockquote className="border-l-2 border-purple-500 pl-4 py-1 italic text-gray-300 text-sm leading-relaxed">
                &ldquo;{report.summary}&rdquo;
              </blockquote>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-4">
            {/* Total Posts */}
            <Card className="bg-gray-950 border-gray-900">
              <CardHeader className="pb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Publications</span>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-purple-400" />
                <div className="text-2xl font-bold text-gray-100">{report.statistics.total_posts}</div>
              </CardContent>
            </Card>

            {/* Posts Per Day */}
            <Card className="bg-gray-950 border-gray-900">
              <CardHeader className="pb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Average Posts / Day</span>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-blue-400" />
                <div className="text-2xl font-bold text-gray-100">{report.statistics.posts_per_day.toFixed(1)}</div>
              </CardContent>
            </Card>

            {/* Consistency Gauge */}
            <Card className="bg-gray-950 border-gray-900">
              <CardHeader className="pb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Consistency Score</span>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <div className="relative h-10 w-10 flex items-center justify-center">
                  <svg className="absolute h-full w-full -rotate-90">
                    <circle cx="20" cy="20" r="16" fill="transparent" stroke="#1f2937" strokeWidth="3" />
                    <circle 
                      cx="20" 
                      cy="20" 
                      r="16" 
                      fill="transparent" 
                      stroke="#8b5cf6" 
                      strokeWidth="3" 
                      strokeDasharray="100" 
                      strokeDashoffset={100 - report.statistics.consistency_score}
                    />
                  </svg>
                  <span className="text-xs font-bold text-gray-200">{report.statistics.consistency_score}</span>
                </div>
                <div className="text-sm font-semibold text-gray-300">Grade: Good</div>
              </CardContent>
            </Card>

            {/* Platform breakdown */}
            <Card className="bg-gray-950 border-gray-900">
              <CardHeader className="pb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Platform Mappings</span>
              </CardHeader>
              <CardContent className="space-y-1.5 pt-1">
                {Object.entries(report.statistics.platform_breakdown).map(([platform, percentage]) => (
                  <div key={platform} className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span className="capitalize">{platform}</span>
                      <span>{percentage}%</span>
                    </div>
                    <div className="h-1 w-full bg-gray-900 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-600" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Insights Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-200">Critical Observations</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {report.insights.map((insight, idx) => (
                <Card key={idx} className="bg-gray-950 border-gray-900">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold text-gray-200">{insight.title}</CardTitle>
                    <Badge 
                      variant="outline" 
                      className={
                        insight.priority === 'high' 
                          ? 'border-red-500/20 bg-red-500/10 text-red-400' 
                          : insight.priority === 'medium'
                          ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                          : 'border-green-500/20 bg-green-500/10 text-green-400'
                      }
                    >
                      {insight.priority} priority
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-400 leading-relaxed">{insight.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-200">Strategic Recommendations</h2>
            <div className="space-y-3">
              {report.recommendations.map((rec, idx) => (
                <Card key={idx} className="bg-gray-950 border-gray-900">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-purple-400" />
                      <CardTitle className="text-sm font-bold text-gray-200">{rec.action}</CardTitle>
                    </div>
                    <Badge variant="outline" className="border-purple-500/20 bg-purple-950/20 text-purple-400 text-[10px]">
                      Impact: {rec.expected_impact}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-400 leading-relaxed">{rec.reasoning}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isGenerating && !report && (
        <Card className="bg-gray-950 border-gray-900 p-12 text-center space-y-4">
          <div className="text-4xl">📊</div>
          <h3 className="text-base font-bold text-gray-300">Assemble Performance Report</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Choose a target brand profile and date range above to start.
          </p>
        </Card>
      )}

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
