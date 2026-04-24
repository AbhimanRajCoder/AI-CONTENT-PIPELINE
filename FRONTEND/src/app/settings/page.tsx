'use client';

import React, { useState, useEffect } from 'react';
import { contentApi } from '@/services/api';
import { toast } from 'react-hot-toast';
import { Loader } from '@/components/Loader';
import { 
  Save, BookOpen, MessageSquare, PenTool,
  Linkedin, Twitter, Instagram, Link2, Unlink, ExternalLink,
  CheckCircle2, AlertCircle, Sparkles, Settings
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

const SOCIAL_PLATFORMS = [
  {
    key: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    color: '#0A66C2',
    bg: 'bg-[#0A66C2]',
    description: 'Post articles and updates to your LinkedIn profile',
  },
  {
    key: 'twitter',
    name: 'X (Twitter)',
    icon: Twitter,
    color: '#000000',
    bg: 'bg-black',
    description: 'Tweet and engage with your Twitter audience',
  },
  {
    key: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: '#E1306C',
    bg: 'bg-[#E1306C]',
    description: 'Share visual content on Instagram (coming soon)',
  },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brandVoice, setBrandVoice] = useState({
    tone_guidelines: '',
    vocabulary_rules: '',
    writing_style: ''
  });
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  useEffect(() => {
    fetchBrandVoice();
    fetchSocialAccounts();
  }, []);

  const fetchBrandVoice = async () => {
    try {
      const data = await contentApi.getBrandVoice();
      setBrandVoice(data);
    } catch (error) {
      toast.error("Failed to load brand voice");
    } finally {
      setLoading(false);
    }
  };

  const fetchSocialAccounts = async () => {
    try {
      const data = await contentApi.getSocialAccounts();
      setSocialAccounts(data);
    } catch {
      // Social accounts table may not exist yet
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await contentApi.updateBrandVoice(brandVoice);
      toast.success("Brand voice updated successfully");
    } catch (error) {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleConnectAccount = async (platform: string) => {
    setConnectingPlatform(platform);
    try {
      const { auth_url } = await contentApi.getAuthUrl(platform);
      // Open OAuth flow in new window
      window.open(auth_url, '_blank', 'width=600,height=700');
      toast.success(`Opening ${platform} authorization...`);
    } catch {
      toast.error(`Failed to start ${platform} connection. Set API keys in .env first.`);
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleDisconnectAccount = async (platform: string) => {
    try {
      await contentApi.disconnectAccount(platform);
      toast.success(`${platform} disconnected`);
      fetchSocialAccounts();
    } catch {
      toast.error('Disconnect failed');
    }
  };

  const isConnected = (platform: string) => socialAccounts.some(a => a.platform === platform);

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <Loader size="xl" text="Loading settings..." />
    </div>
  );

  return (
    <div className="min-h-screen bg-alabaster">
      {/* Navigation */}
      <nav className="border-b bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate rounded-lg flex items-center justify-center text-white">
                <Sparkles size={18} />
              </div>
              <span className="font-heading font-bold text-slate text-xl tracking-tight">FOAI Pipeline</span>
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-8 mx-8">
            <Link href="/" className="text-sm font-bold text-slate/40 hover:text-slate transition-colors">Dashboard</Link>
            <Link href="/briefs" className="text-sm font-bold text-slate/40 hover:text-slate transition-colors">Briefs</Link>
            <Link href="/drafts" className="text-sm font-bold text-slate/40 hover:text-slate transition-colors">Drafts</Link>
            <Link href="/library" className="text-sm font-bold text-slate/40 hover:text-slate transition-colors">Library</Link>
            <Link href="/settings" className="text-sm font-bold text-slate hover:text-sage transition-colors">Brand Voice</Link>
            <Link href="/calendar" className="text-sm font-bold text-slate/40 hover:text-slate transition-colors">Calendar</Link>
          </div>
          <Badge variant="secondary" className="bg-sage/10 text-sage hover:bg-sage/20 border-none px-3 py-1 font-bold">
            Production Mode
          </Badge>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-10">
        <div>
          <h1 className="text-4xl font-heading font-bold text-slate tracking-tight">Settings</h1>
          <p className="text-slate/40 text-lg font-medium">Brand voice, social accounts, and publishing configuration.</p>
        </div>

        {/* ========== SOCIAL ACCOUNTS ========== */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-terracotta/10 rounded-xl flex items-center justify-center text-terracotta">
              <Link2 size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-bold text-slate">Connected Accounts</h2>
              <p className="text-slate/40 text-sm">Connect your social accounts to publish directly from FOAI.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SOCIAL_PLATFORMS.map(platform => {
              const Icon = platform.icon;
              const connected = isConnected(platform.key);
              const account = socialAccounts.find(a => a.platform === platform.key);

              return (
                <Card key={platform.key} className={`rounded-2xl border-none shadow-soft bg-white overflow-hidden transition-all ${connected ? 'ring-2 ring-sage/20' : ''}`}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-xl ${platform.bg} flex items-center justify-center`}>
                        <Icon size={18} className="text-white" />
                      </div>
                      {connected ? (
                        <Badge className="bg-sage/10 text-sage border-none text-[9px] font-bold rounded-full px-2">
                          <CheckCircle2 size={10} className="mr-1" /> Connected
                        </Badge>
                      ) : (
                        <Badge className="bg-slate/5 text-slate/30 border-none text-[9px] font-bold rounded-full px-2">
                          <AlertCircle size={10} className="mr-1" /> Not Connected
                        </Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate">{platform.name}</h3>
                      <p className="text-[11px] text-slate/40 mt-0.5">{platform.description}</p>
                    </div>

                    {connected ? (
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate/40 font-bold uppercase tracking-wider">
                          {account?.account_name}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnectAccount(platform.key)}
                          className="w-full rounded-xl text-xs border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Unlink size={12} className="mr-1.5" /> Disconnect
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConnectAccount(platform.key)}
                        disabled={connectingPlatform === platform.key || platform.key === 'instagram'}
                        className="w-full rounded-xl text-xs"
                        style={{ backgroundColor: platform.color }}
                      >
                        {connectingPlatform === platform.key ? (
                          <Loader size="sm" />
                        ) : (
                          <ExternalLink size={12} className="mr-1.5" />
                        )}
                        {platform.key === 'instagram' ? 'Coming Soon' : 'Connect'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="rounded-2xl border-none shadow-soft bg-white">
            <CardContent className="p-4">
              <p className="text-xs text-slate/40 leading-relaxed">
                <strong className="text-slate/60">How it works:</strong> Click "Connect" to authorize FOAI to post on your behalf using official OAuth 2.0. 
                Your tokens are stored securely. You can revoke access at any time. For LinkedIn, you need a LinkedIn App with <code className="text-xs bg-alabaster px-1 rounded">w_member_social</code> scope. 
                For X, create an app at <code className="text-xs bg-alabaster px-1 rounded">developer.twitter.com</code> with <code className="text-xs bg-alabaster px-1 rounded">tweet.write</code> scope.
              </p>
            </CardContent>
          </Card>
        </section>

        <Separator className="bg-slate/5" />

        {/* ========== BRAND VOICE ========== */}
        <form onSubmit={handleSave} className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sage/10 rounded-xl flex items-center justify-center text-sage">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-bold text-slate">Brand Voice</h2>
              <p className="text-slate/40 text-sm">Define your clinical aesthetic and AI writing style.</p>
            </div>
          </div>

          <Card className="rounded-3xl border-none shadow-soft bg-white">
            <CardHeader className="border-b border-alabaster">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sage/10 rounded-xl flex items-center justify-center text-sage">
                  <BookOpen size={20} />
                </div>
                <div>
                  <CardTitle className="text-xl font-heading font-bold">Tone Guidelines</CardTitle>
                  <CardDescription>How should the AI sound? (e.g., Professional, Authoritative, Witty)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <Textarea 
                value={brandVoice.tone_guidelines}
                onChange={(e) => setBrandVoice({...brandVoice, tone_guidelines: e.target.value})}
                placeholder="e.g. Use a hyper-calm, clinically clean tone. Avoid panic-inducing language."
                className="min-h-[150px] rounded-2xl border-alabaster bg-alabaster/30"
              />
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-soft bg-white">
            <CardHeader className="border-b border-alabaster">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-terracotta/10 rounded-xl flex items-center justify-center text-terracotta">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <CardTitle className="text-xl font-heading font-bold">Vocabulary Rules</CardTitle>
                  <CardDescription>Forbidden words or industry-specific terminology.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <Textarea 
                value={brandVoice.vocabulary_rules}
                onChange={(e) => setBrandVoice({...brandVoice, vocabulary_rules: e.target.value})}
                placeholder="e.g. Prefer 'orchestration' over 'management'. Never use 'disruptive'."
                className="min-h-[150px] rounded-2xl border-alabaster bg-alabaster/30"
              />
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-soft bg-white">
            <CardHeader className="border-b border-alabaster">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate/10 rounded-xl flex items-center justify-center text-slate">
                  <PenTool size={20} />
                </div>
                <div>
                  <CardTitle className="text-xl font-heading font-bold">Writing Style</CardTitle>
                  <CardDescription>Structural preferences (e.g., short paragraphs, bullet points).</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <Textarea 
                value={brandVoice.writing_style}
                onChange={(e) => setBrandVoice({...brandVoice, writing_style: e.target.value})}
                placeholder="e.g. Use short, punchy sentences. End with a provocative question."
                className="min-h-[150px] rounded-2xl border-alabaster bg-alabaster/30"
              />
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4">
            <Button 
              type="submit" 
              disabled={saving}
              className="bg-slate hover:bg-slate/90 text-white rounded-xl px-12 h-12 font-bold"
            >
              {saving ? <Loader size="sm" className="mr-2" /> : <Save size={20} className="mr-2" />}
              {saving ? "Saving..." : "Save Brand Voice"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
