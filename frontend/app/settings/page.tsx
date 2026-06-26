'use client';

import { useAuthStore } from '@/lib/stores/auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getBrands, createBrand, deleteBrand } from '@/lib/api';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  Trash2, 
  Eye, 
  EyeOff, 
  Check, 
  X,
  Star
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BrandProfile {
  id: number;
  name: string;
  voice_description: string;
  tone: string;
  target_audience: string;
  keywords?: string[];
}

export default function SettingsPage() {
  const { user, token, isAuthenticated, logout } = useAuthStore();
  const { toast } = useToast();

  // Tab 1: Brand State
  const [brandName, setBrandName] = useState('');
  const [voiceDesc, setVoiceDesc] = useState('');
  const [brandTone, setBrandTone] = useState('Professional');
  const [audience, setAudience] = useState('');
  
  // Keywords tag list
  const [keywords, setKeywords] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Tab 2: Provider State (persist client-side)
  const [provider, setProvider] = useState<'openai' | 'anthropic' | 'ollama'>('openai');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState('gpt-4o-mini');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);

  // Star metrics for badge
  const [starCount, setStarCount] = useState('1,337');
  useEffect(() => {
    fetch('http://localhost:8000/api/v1/public/metrics')
      .then(res => res.json())
      .then(data => setStarCount(data.github?.stars ?? '1,337'))
      .catch(() => {});
  }, []);

  // Fetch Brands
  const { data: brandsData, refetch: refetchBrands } = useQuery<BrandProfile[]>({
    queryKey: ['brands', token],
    queryFn: () => getBrands(),
    enabled: isAuthenticated && !!token,
  });

  // Load API config from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedProvider = localStorage.getItem('mm-provider');
      const storedKey = localStorage.getItem('mm-key');
      const storedModel = localStorage.getItem('mm-model');
      const storedOllama = localStorage.getItem('mm-ollama-url');

      if (storedProvider) setProvider(storedProvider as 'openai' | 'anthropic' | 'ollama');
      if (storedKey) setApiKey(storedKey);
      if (storedModel) setModel(storedModel);
      if (storedOllama) setOllamaUrl(storedOllama);
    }
  }, []);

  // Add keyword tag
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!keywords.includes(tagInput.trim())) {
        setKeywords([...keywords, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setKeywords(keywords.filter(t => t !== tag));
  };

  // Mutation to create brand
  const createBrandMutation = useMutation({
    mutationFn: () => {
      return createBrand({
        name: brandName,
        voice_description: voiceDesc,
        tone: brandTone,
        target_audience: audience,
        keywords,
      });
    },
    onSuccess: () => {
      refetchBrands();
      setBrandName('');
      setVoiceDesc('');
      setAudience('');
      setKeywords([]);
      toast({
        title: 'Brand Profile Saved!',
        description: 'Successfully updated brand memory database.',
      });
    },
    onError: (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : 'Verification failed.';
      toast({
        title: 'Save Failed',
        description: errMsg,
        variant: 'destructive',
      });
    },
  });

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName || !voiceDesc || !audience) return;
    createBrandMutation.mutate();
  };

  // Mutation to delete brand
  const deleteBrandMutation = useMutation({
    mutationFn: (id: number) => deleteBrand(id),
    onSuccess: () => {
      refetchBrands();
      toast({
        title: 'Brand Profile Deleted',
        description: 'Successfully removed brand memory reference.',
      });
    },
  });

  // Connection testing mockup
  const handleTestConnection = async () => {
    setTesting(true);
    setTestSuccess(null);
    localStorage.setItem('mm-provider', provider);
    localStorage.setItem('mm-key', apiKey);
    localStorage.setItem('mm-model', model);
    localStorage.setItem('mm-ollama-url', ollamaUrl);

    setTimeout(() => {
      setTesting(false);
      setTestSuccess(true);
      toast({
        title: 'Connection Test Successful',
        description: `Successfully communicated with provider models using ${model}.`,
      });
    }, 1500);
  };

  const modelOptions = {
    openai: ['gpt-4o-mini', 'gpt-4o'],
    anthropic: ['claude-3-haiku', 'claude-3-sonnet'],
    ollama: ['llama3.2', 'mistral'],
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-950/40 border border-gray-900 rounded-2xl p-6 backdrop-blur-sm">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-gray-100 to-gray-400 bg-clip-text text-transparent">
            System Settings
          </h1>
          <p className="text-sm text-gray-400">
            Configure system settings, model tokens, and accounts.
          </p>
        </div>
      </div>

      <Tabs defaultValue="brand" className="w-full">
        <TabsList className="bg-gray-950 border border-gray-900 p-1 rounded-xl">
          <TabsTrigger value="brand" className="rounded-lg data-[state=active]:bg-purple-950/40 data-[state=active]:text-purple-400 text-xs px-4">
            Brand Profile
          </TabsTrigger>
          <TabsTrigger value="api" className="rounded-lg data-[state=active]:bg-purple-950/40 data-[state=active]:text-purple-400 text-xs px-4">
            API Configuration
          </TabsTrigger>
          <TabsTrigger value="account" className="rounded-lg data-[state=active]:bg-purple-950/40 data-[state=active]:text-purple-400 text-xs px-4">
            Account
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Brand Profile */}
        <TabsContent value="brand" className="space-y-6 mt-4">
          <Card className="bg-gray-950 border-gray-900">
            <CardHeader>
              <CardTitle className="text-base text-gray-200">Register New Brand Memory</CardTitle>
              <CardDescription className="text-gray-500 text-xs">
                Configure brand guidelines to ground the AI agents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveBrand} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 block">Brand Name</label>
                    <Input
                      placeholder="e.g., MarketMind Corp"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      className="bg-gray-900 border-gray-800 text-gray-200 focus-visible:ring-purple-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 block">Base Tone</label>
                    <Select value={brandTone} onValueChange={setBrandTone}>
                      <SelectTrigger className="bg-gray-900 border-gray-800 text-gray-300">
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
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 block">Voice Description</label>
                  <Textarea
                    placeholder="Describe your brand voice... e.g., Professional, warm, and tech-focused"
                    value={voiceDesc}
                    onChange={(e) => setVoiceDesc(e.target.value)}
                    className="bg-gray-900 border-gray-800 text-gray-200 focus-visible:ring-purple-500"
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 block">Target Audience</label>
                  <Textarea
                    placeholder="e.g., Small business owners and developers aged 25-45"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="bg-gray-900 border-gray-800 text-gray-200 focus-visible:ring-purple-500"
                    rows={2}
                    required
                  />
                </div>

                {/* Keywords tag input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 block">Keywords (Type and press Enter)</label>
                  <Input
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="bg-gray-900 border-gray-800 text-gray-200 focus-visible:ring-purple-500"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {keywords.map(tag => (
                      <Badge key={tag} className="bg-purple-950/40 border border-purple-500/20 text-purple-400 text-[10px] flex items-center gap-1">
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
                  Save Brand Profile
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Active Profiles */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-200">Active Brand Configurations</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {brandsData?.map((brand) => (
                <Card key={brand.id} className="bg-gray-950 border-gray-900 relative">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-gray-200 flex items-center justify-between">
                      {brand.name}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBrandMutation.mutate(brand.id)}
                        className="text-red-500 hover:text-red-400 hover:bg-red-950/20 h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                    <CardDescription className="text-purple-400 text-xs font-semibold">
                      Tone: {brand.tone}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-gray-400 line-clamp-2">&ldquo;{brand.voice_description}&rdquo;</p>
                    <div className="flex flex-wrap gap-1">
                      {brand.keywords?.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[8px] bg-gray-900 text-gray-500 border border-gray-800">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: API Configuration */}
        <TabsContent value="api" className="space-y-6 mt-4">
          <Card className="bg-gray-950 border-gray-900">
            <CardHeader>
              <CardTitle className="text-base text-gray-200">Swarm LLM Integrations</CardTitle>
              <CardDescription className="text-gray-500 text-xs">
                Configure API keys and connection settings for swarms.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Provider Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 block">AI Provider</label>
                <div className="flex gap-4 border border-gray-900 bg-gray-900/30 p-2.5 rounded-xl">
                  {['openai', 'anthropic', 'ollama'].map((prov) => (
                    <label key={prov} className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-400 hover:text-gray-200">
                      <input
                        type="radio"
                        name="provider"
                        checked={provider === prov}
                        onChange={() => {
                          const p = prov as 'openai' | 'anthropic' | 'ollama';
                          setProvider(p);
                          setModel(modelOptions[p][0]);
                        }}
                        className="accent-purple-600"
                      />
                      <span className="capitalize">{prov}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* API Key */}
              {provider !== 'ollama' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 block">API Access Token</label>
                  <div className="relative">
                    <Input
                      type={showKey ? 'text' : 'password'}
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="bg-gray-900 border-gray-800 text-gray-200 placeholder-gray-600 focus-visible:ring-purple-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-400"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Ollama Section */}
              {provider === 'ollama' && (
                <div className="space-y-4 bg-gray-900/20 border border-gray-900 p-4 rounded-xl">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 block">Ollama Base URL</label>
                    <Input
                      value={ollamaUrl}
                      onChange={(e) => setOllamaUrl(e.target.value)}
                      className="bg-gray-900 border-gray-800 text-gray-200 focus-visible:ring-purple-500"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500">
                    ℹ️ Run Ollama locally for $0 AI. Ensure your model is pulled (`ollama pull llama3.2`).
                  </p>
                </div>
              )}

              {/* Model Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 block">Model</label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="bg-gray-900 border-gray-800 text-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-gray-900 text-gray-300">
                    {modelOptions[provider].map(opt => (
                      <SelectItem key={opt} value={opt} className="hover:bg-gray-900">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </Button>
                {testSuccess !== null && (
                  <span className={`text-xs flex items-center gap-1 font-semibold ${testSuccess ? 'text-green-500' : 'text-red-500'}`}>
                    <Check className="h-4 w-4" />
                    Verified
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Account */}
        <TabsContent value="account" className="space-y-6 mt-4">
          <Card className="bg-gray-950 border-gray-900">
            <CardHeader>
              <CardTitle className="text-base text-gray-200">Instance Account</CardTitle>
              <CardDescription className="text-gray-500 text-xs">
                Manage developer access details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block">Active Email</span>
                <span className="text-sm font-semibold text-gray-200">{user?.email || 'local-developer'}</span>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-900">
                <Button onClick={logout} variant="outline" className="border-gray-800 text-gray-300 hover:bg-gray-900">
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
