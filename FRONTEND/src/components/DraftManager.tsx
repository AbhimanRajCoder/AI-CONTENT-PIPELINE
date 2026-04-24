'use client';

import React, { useState, useEffect } from 'react';
import { contentApi } from '@/services/api';
import { toast } from 'react-hot-toast';
import { LinkedInMockup, TwitterMockup, InstagramMockup, EmailMockup, BlogMockup } from './SocialMockups';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader } from './Loader';
import {
  Linkedin, Twitter, Instagram, Mail, FileText,
  Plus, RefreshCw, Calendar, Trash2,
  Clock, CheckCircle2, XCircle, Edit2, Send, Eye
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PLATFORM_CONFIG: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  linkedin: { icon: Linkedin, label: 'LinkedIn', color: '#0A66C2', bg: 'bg-[#0A66C2]/10' },
  twitter: { icon: Twitter, label: 'X (Twitter)', color: '#000000', bg: 'bg-black/5' },
  instagram: { icon: Instagram, label: 'Instagram', color: '#E1306C', bg: 'bg-[#E1306C]/10' },
  email: { icon: Mail, label: 'Email', color: '#EA4335', bg: 'bg-red-50' },
  blog: { icon: FileText, label: 'Blog', color: '#264653', bg: 'bg-slate/5' },
};

const STATUS_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  draft: { icon: Edit2, label: 'Draft', color: 'text-amber-600 bg-amber-50' },
  scheduled: { icon: Clock, label: 'Scheduled', color: 'text-blue-600 bg-blue-50' },
  published: { icon: CheckCircle2, label: 'Published', color: 'text-green-600 bg-green-50' },
  failed: { icon: XCircle, label: 'Failed', color: 'text-red-600 bg-red-50' },
};

interface Draft {
  id: string;
  brief_id?: string;
  content_id?: string;
  platform: string;
  title?: string;
  body: string;
  image_url?: string;
  hashtags?: string[];
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function DraftManager({ briefId }: { briefId?: string }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [schedulingDraftId, setSchedulingDraftId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showNewDraft, setShowNewDraft] = useState(false);
  const [newDraftPlatform, setNewDraftPlatform] = useState('linkedin');
  const [newDraftBody, setNewDraftBody] = useState('');

  useEffect(() => {
    fetchDrafts();
  }, [briefId]);

  const fetchDrafts = async () => {
    try {
      const data = await contentApi.getDrafts(briefId ? { brief_id: briefId } : undefined);
      setDrafts(data);
    } catch (error) {
      console.error('Failed to fetch drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!newDraftBody.trim()) {
      toast.error('Draft content is required');
      return;
    }
    try {
      await contentApi.saveDraft({
        platform: newDraftPlatform,
        body: newDraftBody,
        brief_id: briefId,
      });
      toast.success('Draft saved!');
      setShowNewDraft(false);
      setNewDraftBody('');
      fetchDrafts();
    } catch {
      toast.error('Failed to save draft');
    }
  };

  const handleUpdateDraft = async (draftId: string, newBody: string) => {
    try {
      await contentApi.updateDraft(draftId, { body: newBody });
      toast.success('Draft updated');
      fetchDrafts();
    } catch {
      toast.error('Update failed');
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      await contentApi.deleteDraft(draftId);
      toast.success('Draft deleted');
      setSelectedDraft(null);
      fetchDrafts();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleSchedule = async () => {
    if (!schedulingDraftId || !scheduleDate || !scheduleTime) {
      toast.error('Please select date and time');
      return;
    }
    const draft = drafts.find(d => d.id === schedulingDraftId);
    if (!draft) return;

    try {
      await contentApi.schedulePost({
        draft_id: schedulingDraftId,
        platform: draft.platform,
        scheduled_at: `${scheduleDate}T${scheduleTime}:00Z`,
      });
      toast.success('Post scheduled!');
      setShowScheduleDialog(false);
      setScheduleDate('');
      setScheduleTime('');
      fetchDrafts();
    } catch {
      toast.error('Scheduling failed');
    }
  };

  const openScheduleDialog = (draftId: string) => {
    setSchedulingDraftId(draftId);
    setShowScheduleDialog(true);
  };

  const filteredDrafts = activeTab === 'all' 
    ? drafts 
    : drafts.filter(d => d.platform === activeTab);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[400px]">
        <Loader size="xl" text="Fetching your drafts..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-slate tracking-tight">Drafts</h2>
          <p className="text-slate/40 text-sm">{drafts.length} drafts across {new Set(drafts.map(d => d.platform)).size} platforms</p>
        </div>
        <Button onClick={() => setShowNewDraft(true)} className="bg-slate hover:bg-slate/90 text-white rounded-xl h-10 px-6">
          <Plus size={16} className="mr-2" /> New Draft
        </Button>
      </div>

      {/* Platform Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-alabaster rounded-xl p-1 h-auto flex-wrap">
          <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">
            All ({drafts.length})
          </TabsTrigger>
          {Object.entries(PLATFORM_CONFIG).map(([key, config]) => {
            const count = drafts.filter(d => d.platform === key).length;
            if (count === 0) return null;
            const Icon = config.icon;
            return (
              <TabsTrigger key={key} value={key} className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">
                <Icon size={12} className="mr-1.5" style={{ color: config.color }} />
                {config.label} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Draft List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {filteredDrafts.map(draft => {
            const platform = PLATFORM_CONFIG[draft.platform] || PLATFORM_CONFIG.blog;
            const status = STATUS_CONFIG[draft.status] || STATUS_CONFIG.draft;
            const Icon = platform.icon;
            const StatusIcon = status.icon;

            return (
              <Card
                key={draft.id}
                className="group border-none shadow-soft hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden bg-white cursor-pointer"
                onClick={() => setSelectedDraft(draft)}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${platform.bg}`}>
                      <Icon size={12} style={{ color: platform.color }} />
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: platform.color }}>{platform.label}</span>
                    </div>
                    <Badge className={`text-[9px] font-bold border-none rounded-full px-2 ${status.color}`}>
                      <StatusIcon size={10} className="mr-1" /> {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <p className="text-sm text-slate/70 line-clamp-3 leading-relaxed">{draft.body}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-alabaster">
                    <span className="text-[10px] text-slate/30 font-medium">
                      v{draft.version} • {formatDistanceToNow(new Date(draft.updated_at))} ago
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-slate/30 hover:text-terracotta"
                        onClick={(e) => { e.stopPropagation(); handleDeleteDraft(draft.id); }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredDrafts.length === 0 && (
          <div className="text-center py-16 text-slate/20">
            <FileText size={48} className="mx-auto mb-4" />
            <p className="font-medium">No drafts yet</p>
            <p className="text-sm mt-1">Create a brief to generate drafts automatically, or create one manually.</p>
          </div>
        )}
      </Tabs>

      {/* Draft Preview Dialog */}
      <Dialog open={!!selectedDraft} onOpenChange={(open) => !open && setSelectedDraft(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-none p-6 bg-alabaster">
          {selectedDraft && (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-heading font-bold text-slate flex items-center gap-2">
                  <Eye size={20} className="text-sage" /> Draft Preview
                </DialogTitle>
              </DialogHeader>

              {selectedDraft.platform === 'linkedin' && (
                <LinkedInMockup
                  content={selectedDraft.body}
                  imageUrl={selectedDraft.image_url}
                  draftId={selectedDraft.id}
                  editable
                  onEdit={(newContent) => handleUpdateDraft(selectedDraft.id, newContent)}
                  onSchedule={() => openScheduleDialog(selectedDraft.id)}
                  onRegenerate={fetchDrafts}
                />
              )}
              {selectedDraft.platform === 'twitter' && (
                <TwitterMockup
                  content={selectedDraft.body}
                  imageUrl={selectedDraft.image_url}
                  draftId={selectedDraft.id}
                  editable
                  onEdit={(newContent) => handleUpdateDraft(selectedDraft.id, newContent)}
                  onSchedule={() => openScheduleDialog(selectedDraft.id)}
                  onRegenerate={fetchDrafts}
                />
              )}
              {selectedDraft.platform === 'instagram' && (
                <InstagramMockup
                  content={selectedDraft.body}
                  imageUrl={selectedDraft.image_url}
                  draftId={selectedDraft.id}
                  editable
                  onEdit={(newContent) => handleUpdateDraft(selectedDraft.id, newContent)}
                />
              )}
              {selectedDraft.platform === 'email' && (
                <EmailMockup
                  content={selectedDraft.body}
                  draftId={selectedDraft.id}
                  editable
                  onEdit={(newContent) => handleUpdateDraft(selectedDraft.id, newContent)}
                  onRegenerate={fetchDrafts}
                />
              )}
              {selectedDraft.platform === 'blog' && (
                <BlogMockup
                  content={selectedDraft.body}
                  title={selectedDraft.title || "Blog Post"}
                  imageUrl={selectedDraft.image_url}
                  draftId={selectedDraft.id}
                  editable
                  onEdit={(newContent) => handleUpdateDraft(selectedDraft.id, newContent)}
                  onRegenerate={fetchDrafts}
                />
              )}

              <div className="flex items-center justify-between pt-4 border-t border-alabaster">
                <span className="text-[10px] text-slate/30 font-bold uppercase tracking-wider">
                  Version {selectedDraft.version} • Last updated {formatDistanceToNow(new Date(selectedDraft.updated_at))} ago
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteDraft(selectedDraft.id)}
                  className="rounded-full text-xs"
                >
                  <Trash2 size={12} className="mr-1.5" /> Delete Draft
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="rounded-2xl border-none">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-bold text-slate flex items-center gap-2">
              <Calendar size={20} className="text-terracotta" /> Schedule Post
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate/70 text-sm">Date</Label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="rounded-xl border-alabaster bg-alabaster/50 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate/70 text-sm">Time</Label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="rounded-xl border-alabaster bg-alabaster/50 h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowScheduleDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSchedule} className="bg-terracotta hover:bg-terracotta/90 text-white rounded-xl">
              <Calendar size={14} className="mr-2" /> Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Draft Dialog */}
      <Dialog open={showNewDraft} onOpenChange={setShowNewDraft}>
        <DialogContent className="rounded-2xl border-none">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-bold text-slate flex items-center gap-2">
              <Plus size={20} className="text-sage" /> Create Draft
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate/70 text-sm">Platform</Label>
              <Select value={newDraftPlatform} onValueChange={setNewDraftPlatform}>
                <SelectTrigger className="rounded-xl border-alabaster bg-alabaster/50 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORM_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon size={14} style={{ color: config.color }} />
                          {config.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate/70 text-sm">Content</Label>
              <Textarea
                value={newDraftBody}
                onChange={(e) => setNewDraftBody(e.target.value)}
                placeholder="Write your draft content..."
                className="min-h-[150px] rounded-xl border-alabaster bg-alabaster/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewDraft(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSaveDraft} className="bg-sage hover:bg-sage/90 text-white rounded-xl">
              <FileText size={14} className="mr-2" /> Save Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
