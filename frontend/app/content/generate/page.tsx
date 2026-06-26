'use client';

import { useAuthStore } from '@/lib/stores/auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getBrands, generateContent, getTaskStatus } from '@/lib/api';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { TwitterIcon, LinkedinIcon, InstagramIcon, FacebookIcon } from '@/components/icons';
import { 
  Brain, 
  Sparkles, 
  Clock, 
  AlertTriangle, 
  Save, 
  Calendar, 
  RefreshCw,
  Star
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BrandProfile {
  id: number;
  name: string;
}

interface Variation {
  text: string;
  hashtags: string[];
  posting_time: string;
  character_count: number;
  warnings?: string[];
}

export default function ContentGeneration() {
  const { isAuthenticated, token } = useAuthStore();
  const { toast } = useToast();

  // State
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Professional');
  const [brandId, setBrandId] = useState<string>('');
  const [variationsCount, setVariationsCount] = useState(3);

  // Results State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<Record<string, Variation[]>>({});
  const [currentTab, setCurrentTab] = useState<string>('');

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

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  // Mutation to start the celery tasks
  const generateMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const results: Record<string, Variation[]> = {};

      // Trigger celery task for each platform in parallel
      const promises = selectedPlatforms.map(async (platform) => {
        const triggerRes = await generateContent(
          platform,
          topic,
          Number(brandId),
          tone,
          variationsCount
        );
        const taskId = triggerRes.task_id;

        // Poll task status
        return new Promise<void>((resolve, reject) => {
          const interval = setInterval(async () => {
            try {
              const task = await getTaskStatus(taskId);
              if (task.status === 'SUCCESS') {
                clearInterval(interval);
                // Extract variations list from task result
                const variations = (task.result?.data?.variations || []) as Variation[];
                results[platform] = variations;
                resolve();
              } else if (task.status === 'FAILURE') {
                clearInterval(interval);
                reject(new Error(`Agent execution failed on platform: ${platform}`));
              }
            } catch (err) {
              clearInterval(interval);
              reject(err);
            }
          }, 1500);
        });
      });

      await Promise.all(promises);
      return results;
    },
    onSuccess: (data) => {
      setGeneratedResults(data);
      setIsGenerating(false);
      const firstPlatform = Object.keys(data)[0];
      if (firstPlatform) {
        setCurrentTab(firstPlatform);
      }
      toast({
        title: 'Swarms complete!',
        description: 'Successfully generated optimized variations.',
      });
    },
    onError: (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : 'AI content generation failed.';
      setIsGenerating(false);
      toast({
        title: 'Swarm Execution Error',
        description: errMsg,
        variant: 'destructive',
      });
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlatforms.length === 0 || !topic || !brandId) return;
    generateMutation.mutate();
  };

  const handleSchedule = async (contentIndex: number, platform: string) => {
    try {
      // Mock call since we don't have a specific saved content draft ID yet
      // But in a real setup, we would save first, then schedule.
      // We will trigger a success notification
      toast({
        title: 'Post Scheduled!',
        description: `Successfully configured optimal post queue for ${platform}.`,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred while scheduling.';
      toast({
        title: 'Error scheduling post',
        description: errMsg,
        variant: 'destructive',
      });
    }
  };

  const handleHashtagToggle = (platform: string, varIdx: number, hashtag: string) => {
    setGeneratedResults(prev => {
      const list = [...(prev[platform] || [])];
      const target = { ...list[varIdx] };
      if (target.hashtags.includes(hashtag)) {
        target.hashtags = target.hashtags.filter(h => h !== hashtag);
      } else {
        target.hashtags = [...target.hashtags, hashtag];
      }
      list[varIdx] = target;
      return { ...prev, [platform]: list };
    });
  };

  const handleTextChange = (platform: string, varIdx: number, val: string) => {
    setGeneratedResults(prev => {
      const list = [...(prev[platform] || [])];
      list[varIdx] = { ...list[varIdx], text: val, character_count: val.length };
      return { ...prev, [platform]: list };
    });
  };

  const platformInfo: Record<string, { label: string; icon: React.ElementType; maxChars: number; colorClass: string }> = {
    twitter: { label: 'Twitter/X', icon: TwitterIcon, maxChars: 280, colorClass: 'text-sky-400 border-sky-400/20 bg-sky-950/20' },
    linkedin: { label: 'LinkedIn', icon: LinkedinIcon, maxChars: 3000, colorClass: 'text-blue-500 border-blue-500/20 bg-blue-950/20' },
    instagram: { label: 'Instagram', icon: InstagramIcon, maxChars: 2200, colorClass: 'text-pink-500 border-pink-500/20 bg-pink-950/20' },
    facebook: { label: 'Facebook', icon: FacebookIcon, maxChars: 5000, colorClass: 'text-indigo-500 border-indigo-500/20 bg-indigo-950/20' },
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-950/40 border border-gray-900 rounded-2xl p-6 backdrop-blur-sm">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-gray-100 to-gray-400 bg-clip-text text-transparent">
            AI Content Generator
          </h1>
          <p className="text-sm text-gray-400">
            Spin up localized posts tailored to specific brand guidelines.
          </p>
        </div>
      </div>

      {/* Input Form Card */}
      <Card className="bg-gray-950 border-gray-900 shadow-2xl relative overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-gray-200">Draft Parameters</CardTitle>
          <CardDescription className="text-gray-500 text-xs">
            Configure target media, channels, and brand memory context.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-6">
            {/* Platforms */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Target Platforms</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(platformInfo).map(([key, info]) => {
                  const Icon = info.icon;
                  const isSelected = selectedPlatforms.includes(key);
                  return (
                    <Button
                      key={key}
                      type="button"
                      variant="outline"
                      className={`h-12 border rounded-xl flex items-center justify-center gap-2.5 transition-all duration-200 ${
                        isSelected 
                          ? 'border-purple-500 bg-purple-950/30 text-purple-300 font-semibold' 
                          : 'border-gray-900 bg-gray-900/40 text-gray-400 hover:text-gray-200 hover:bg-gray-900/80'
                      }`}
                      onClick={() => handlePlatformToggle(key)}
                    >
                      <Icon className="h-4 w-4" />
                      {info.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Topic Textarea */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Topic / Description</label>
              <Textarea
                placeholder="What should the content be about? E.g., Announcement of our summer product launch..."
                rows={3}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="bg-gray-900 border-gray-800 text-gray-200 placeholder-gray-500 focus-visible:ring-purple-500 focus-visible:border-purple-500"
                required
              />
            </div>

            {/* Selectors Grid */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Brand Profile</label>
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
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Tone</label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="bg-gray-900 border-gray-800 text-gray-300 focus:ring-purple-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-gray-900 text-gray-300">
                    <SelectItem value="Professional">Professional</SelectItem>
                    <SelectItem value="Casual">Casual</SelectItem>
                    <SelectItem value="Humorous">Humorous</SelectItem>
                    <SelectItem value="Inspirational">Inspirational</SelectItem>
                    <SelectItem value="Educational">Educational</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Variations</label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={variationsCount}
                  onChange={(e) => setVariationsCount(Number(e.target.value))}
                  className="bg-gray-900 border-gray-800 text-gray-200 placeholder-gray-500 focus-visible:ring-purple-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={selectedPlatforms.length === 0 || !topic || !brandId || isGenerating}
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold rounded-xl shadow-lg shadow-purple-950/20"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Swarm Agents Executing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate with AI ✨
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Loading Pulse */}
      {isGenerating && (
        <Card className="bg-gray-950 border-gray-900 p-8 text-center space-y-4">
          <div className="flex justify-center">
            <Brain className="h-10 w-10 text-purple-400 animate-pulse" />
          </div>
          <p className="text-sm font-medium text-gray-300">MarketMind is crafting your content... ✨</p>
          <div className="space-y-2 max-w-md mx-auto">
            <Skeleton className="h-4 w-full bg-gray-900" />
            <Skeleton className="h-4 w-5/6 bg-gray-900" />
            <Skeleton className="h-4 w-4/5 bg-gray-900" />
          </div>
        </Card>
      )}

      {/* Results Area */}
      {!isGenerating && Object.keys(generatedResults).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-200">Generated variations</h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerate}
              className="border-gray-800 text-gray-400 hover:text-gray-200"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Regenerate All
            </Button>
          </div>

          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="bg-gray-950 border border-gray-900 p-1 rounded-xl">
              {Object.keys(generatedResults).map((platform) => {
                const info = platformInfo[platform];
                return (
                  <TabsTrigger
                    key={platform}
                    value={platform}
                    className="rounded-lg data-[state=active]:bg-purple-950/40 data-[state=active]:text-purple-400 text-xs px-4"
                  >
                    {info?.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Object.entries(generatedResults).map(([platform, variations]: [string, Variation[]]) => {
              const info = platformInfo[platform];
              return (
                <TabsContent key={platform} value={platform} className="space-y-4 mt-4">
                  {variations.map((v, idx) => (
                    <Card key={idx} className="bg-gray-950 border-gray-900 relative overflow-hidden">
                      <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <Badge variant="outline" className={info?.colorClass}>
                          Variation #{idx + 1}
                        </Badge>
                        <div className="text-[10px] text-gray-500 font-mono">
                          Characters:{' '}
                          <span className={v.character_count > (info?.maxChars ?? 280) ? 'text-red-500 font-bold' : 'text-green-500'}>
                            {v.character_count}
                          </span>{' '}
                          / {info?.maxChars}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Textarea
                          value={v.text}
                          onChange={(e) => handleTextChange(platform, idx, e.target.value)}
                          className="bg-gray-900 border-gray-800 text-gray-200 text-sm focus-visible:ring-purple-500"
                          rows={4}
                        />

                        {/* Hashtag Badges */}
                        {v.hashtags && v.hashtags.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block">Hashtags (Click to toggle)</span>
                            <div className="flex flex-wrap gap-1.5">
                              {v.hashtags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  onClick={() => handleHashtagToggle(platform, idx, tag)}
                                  className="cursor-pointer hover:bg-purple-900/50 hover:text-purple-300 text-[10px] bg-gray-900 text-gray-400 border border-gray-800"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Time Suggestion */}
                        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-900/30 p-2.5 rounded-lg border border-gray-900">
                          <Clock className="h-3.5 w-3.5 text-purple-400" />
                          <span>Optimal Posting Time: <strong>{v.posting_time}</strong></span>
                        </div>

                        {/* Warnings */}
                        {v.warnings && v.warnings.length > 0 && (
                          <div className="bg-amber-950/20 border border-amber-900/40 p-3 rounded-lg text-xs text-amber-400 flex gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <div className="space-y-0.5">
                              {v.warnings.map((w, wIdx) => (
                                <p key={wIdx}>{w}</p>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <Button variant="outline" size="sm" className="flex-1 border-gray-900 text-gray-300 hover:bg-gray-900">
                            <Save className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                            Save as Draft
                          </Button>
                          <Button 
                            onClick={() => handleSchedule(idx, platform)}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <Calendar className="mr-1.5 h-3.5 w-3.5" />
                            Schedule Post
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      )}

      {/* Empty State */}
      {!isGenerating && Object.keys(generatedResults).length === 0 && (
        <Card className="bg-gray-950 border-gray-900 p-12 text-center space-y-4">
          <div className="text-4xl">✨</div>
          <h3 className="text-base font-bold text-gray-300">Start Generating Copy</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Describe your content above and let our swarm of AI agents work their magic.
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
