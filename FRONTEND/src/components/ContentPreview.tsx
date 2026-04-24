'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LinkedInMockup, TwitterMockup, InstagramMockup, EmailMockup, BlogMockup } from './SocialMockups';
import { Loader } from './Loader';
import { 
  Edit2, Image as ImageIcon, Save, Check, X, Send, History, Monitor,
  Linkedin, Twitter, Instagram, Mail, FileText, RefreshCw, Calendar
} from 'lucide-react';
import { contentApi } from '@/services/api';
import { toast } from 'react-hot-toast';
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ContentPreviewProps {
  contentId: string;
}

export default function ContentPreview({ contentId }: ContentPreviewProps) {
  const [content, setContent] = useState<any>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDraftId, setScheduleDraftId] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('10:00');

  useEffect(() => {
    if (contentId) {
      fetchContent();
      fetchDrafts();
    }
  }, [contentId]);

  const fetchContent = async () => {
    try {
      const data = await contentApi.getContent(contentId);
      setContent(data);
    } catch (error) {
      toast.error("Failed to load content details");
    }
  };

  const fetchDrafts = async () => {
    try {
      // Try to get drafts for this content's brief
      const contentRes = await contentApi.getContent(contentId);
      if (contentRes.brief_id) {
        const data = await contentApi.getDrafts({ brief_id: contentRes.brief_id });
        setDrafts(data);
      }
    } catch {
      // Drafts may not exist yet
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await contentApi.approveContent(contentId);
      toast.success("Content approved for publication!");
      fetchContent();
    } catch (error) {
      toast.error("Approval failed");
    } finally {
      setIsApproving(false);
    }
  };

  const handleRevise = async () => {
    if (!revisionNotes) {
      toast.error("Please provide revision notes");
      return;
    }
    try {
      await contentApi.reviseContent(contentId, revisionNotes);
      toast.success("Revision requested");
      setRevisionNotes("");
      fetchContent();
    } catch (error) {
      toast.error("Failed to submit revision");
    }
  };

  const handleSchedule = async () => {
    if (!scheduleDraftId || !scheduleDate || !scheduleTime) {
      toast.error('Please fill all fields');
      return;
    }
    const draft = drafts.find(d => d.id === scheduleDraftId);
    try {
      await contentApi.schedulePost({
        draft_id: scheduleDraftId,
        platform: draft?.platform || 'linkedin',
        scheduled_at: `${scheduleDate}T${scheduleTime}:00Z`,
      });
      toast.success('Post scheduled!');
      setShowScheduleDialog(false);
    } catch {
      toast.error('Scheduling failed');
    }
  };

  const handleDraftUpdate = async (draftId: string, newBody: string) => {
    try {
      await contentApi.updateDraft(draftId, { body: newBody });
      toast.success('Draft updated');
      fetchDrafts();
    } catch {
      toast.error('Update failed');
    }
  };

  if (!content) return null;

  const images = content.assets || [];
  
  // Find specific formats
  const blogFormat = content.formats?.find((f: any) => f.type === 'blog');
  const socialFormat = content.formats?.find((f: any) => f.type === 'social');
  const emailFormat = content.formats?.find((f: any) => f.type === 'email');
  
  const blogContent = blogFormat?.content?.text || "";
  const socialCaptions = socialFormat?.content?.captions || [];
  const emailContent = emailFormat?.content?.text || "";

  // Get platform-specific drafts
  const linkedinDraft = drafts.find(d => d.platform === 'linkedin');
  const twitterDraft = drafts.find(d => d.platform === 'twitter');
  const instagramDraft = drafts.find(d => d.platform === 'instagram');
  const emailDraft = drafts.find(d => d.platform === 'email');
  const blogDraft = drafts.find(d => d.platform === 'blog');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
      <Card className="rounded-3xl border-none shadow-soft bg-white h-fit overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-alabaster">
          <div className="flex items-center gap-4">
            <div>
              <CardTitle className="text-xl font-heading font-bold text-slate">Preview & Publish</CardTitle>
              <p className="text-xs text-slate/40">Edit, preview, and publish to real platforms</p>
            </div>
            <div className="flex items-center space-x-2 bg-alabaster/50 px-3 py-1.5 rounded-full border border-alabaster">
              <Switch id="live-mode" checked={liveMode} onCheckedChange={setLiveMode} />
              <Label htmlFor="live-mode" className="text-[10px] font-bold uppercase tracking-widest text-slate/60 cursor-pointer">Live Preview</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {liveMode ? (
            <div className="space-y-12 py-4">
              <LinkedInMockup 
                content={linkedinDraft?.body || socialCaptions[0] || "Drafting LinkedIn post..."} 
                imageUrl={images[activeImageIndex]?.image_url}
                draftId={linkedinDraft?.id}
                editable={!!linkedinDraft}
                onEdit={(newContent) => linkedinDraft && handleDraftUpdate(linkedinDraft.id, newContent)}
                onSchedule={() => { setScheduleDraftId(linkedinDraft?.id || ''); setShowScheduleDialog(true); }}
                onRegenerate={fetchDrafts}
              />
              <TwitterMockup 
                content={twitterDraft?.body || socialCaptions[2] || "Drafting Twitter post..."} 
                imageUrl={images[activeImageIndex]?.image_url}
                draftId={twitterDraft?.id}
                editable={!!twitterDraft}
                onEdit={(newContent) => twitterDraft && handleDraftUpdate(twitterDraft.id, newContent)}
                onSchedule={() => { setScheduleDraftId(twitterDraft?.id || ''); setShowScheduleDialog(true); }}
                onRegenerate={fetchDrafts}
              />
              <InstagramMockup
                content={instagramDraft?.body || socialCaptions[1] || "Drafting Instagram post..."}
                imageUrl={images[activeImageIndex]?.image_url}
                draftId={instagramDraft?.id}
                editable={!!instagramDraft}
                onEdit={(newContent) => instagramDraft && handleDraftUpdate(instagramDraft.id, newContent)}
              />
              <EmailMockup 
                content={emailDraft?.body || emailContent || "Drafting email..."}
                draftId={emailDraft?.id}
                editable={!!emailDraft}
                onEdit={(newContent) => emailDraft && handleDraftUpdate(emailDraft.id, newContent)}
                onRegenerate={fetchDrafts}
              />
              <BlogMockup
                content={blogDraft?.body || blogContent || "Drafting blog post..."}
                title={content.content_briefs?.topic || "Blog Post"}
                imageUrl={images[activeImageIndex]?.image_url}
                draftId={blogDraft?.id}
                editable={!!blogDraft}
                onEdit={(newContent) => blogDraft && handleDraftUpdate(blogDraft.id, newContent)}
                onRegenerate={fetchDrafts}
              />
            </div>
          ) : (
            <Tabs defaultValue="linkedin" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-8 bg-alabaster rounded-xl p-1">
                <TabsTrigger value="linkedin" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                  <Linkedin size={12} className="mr-1.5" /> LinkedIn
                </TabsTrigger>
                <TabsTrigger value="twitter" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                  <Twitter size={12} className="mr-1.5" /> X
                </TabsTrigger>
                <TabsTrigger value="instagram" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                  <Instagram size={12} className="mr-1.5" /> IG
                </TabsTrigger>
                <TabsTrigger value="email" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                  <Mail size={12} className="mr-1.5" /> Email
                </TabsTrigger>
                <TabsTrigger value="blog" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                  <FileText size={12} className="mr-1.5" /> Blog
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="linkedin" className="space-y-6">
                <LinkedInMockup 
                  content={linkedinDraft?.body || socialCaptions[0] || "Drafting LinkedIn post..."} 
                  imageUrl={images[activeImageIndex]?.image_url}
                  draftId={linkedinDraft?.id}
                  editable={!!linkedinDraft}
                  onEdit={(newContent) => linkedinDraft && handleDraftUpdate(linkedinDraft.id, newContent)}
                  onSchedule={() => { setScheduleDraftId(linkedinDraft?.id || ''); setShowScheduleDialog(true); }}
                  onRegenerate={fetchDrafts}
                />
              </TabsContent>
              
              <TabsContent value="twitter">
                <TwitterMockup 
                  content={twitterDraft?.body || socialCaptions[2] || "Drafting Twitter post..."} 
                  imageUrl={images[activeImageIndex]?.image_url}
                  draftId={twitterDraft?.id}
                  editable={!!twitterDraft}
                  onEdit={(newContent) => twitterDraft && handleDraftUpdate(twitterDraft.id, newContent)}
                  onSchedule={() => { setScheduleDraftId(twitterDraft?.id || ''); setShowScheduleDialog(true); }}
                  onRegenerate={fetchDrafts}
                />
              </TabsContent>

              <TabsContent value="instagram">
                <InstagramMockup
                  content={instagramDraft?.body || socialCaptions[1] || "Drafting Instagram post..."}
                  imageUrl={images[activeImageIndex]?.image_url}
                  draftId={instagramDraft?.id}
                  editable={!!instagramDraft}
                  onEdit={(newContent) => instagramDraft && handleDraftUpdate(instagramDraft.id, newContent)}
                />
              </TabsContent>

              <TabsContent value="email" className="space-y-4">
                <EmailMockup 
                  content={emailDraft?.body || emailContent || "No email content generated yet."}
                  draftId={emailDraft?.id}
                  editable={!!emailDraft}
                  onEdit={(newContent) => emailDraft && handleDraftUpdate(emailDraft.id, newContent)}
                  onRegenerate={fetchDrafts}
                />
              </TabsContent>

              <TabsContent value="blog">
                <BlogMockup
                  content={blogDraft?.body || blogContent || "No blog content generated yet."}
                  title={content.content_briefs?.topic || "Blog Post"}
                  imageUrl={images[activeImageIndex]?.image_url}
                  draftId={blogDraft?.id}
                  editable={!!blogDraft}
                  onEdit={(newContent) => blogDraft && handleDraftUpdate(blogDraft.id, newContent)}
                  onRegenerate={fetchDrafts}
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <div className="space-y-8">
        {/* Human-in-the-Loop */}
        <Card className="rounded-3xl border-none shadow-soft bg-white overflow-hidden">
          <CardHeader className="border-b border-alabaster flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-heading font-bold text-slate flex items-center gap-2">
              <Check size={20} className="text-sage" />
              Human-in-the-Loop
            </CardTitle>
            <Badge variant="outline" className={content.status === 'Approved' ? 'bg-sage/10 text-sage border-sage/20' : 'bg-terracotta/10 text-terracotta border-terracotta/20'}>
              {content.status}
            </Badge>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {content.status !== 'Approved' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate/40 uppercase tracking-widest">Revision Notes</p>
                  <Textarea 
                    placeholder="Enter instructions for AI revision..." 
                    className="rounded-xl border-alabaster bg-alabaster/30"
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <Button 
                    className="flex-1 bg-terracotta hover:bg-terracotta/90 text-white rounded-xl"
                    onClick={handleRevise}
                  >
                    <Send size={16} className="mr-2" /> Request Revision
                  </Button>
                  <Button 
                    className="flex-1 bg-sage hover:bg-sage/90 text-white rounded-xl"
                    onClick={handleApprove}
                    disabled={isApproving}
                  >
                    <Check size={16} className="mr-2" /> Approve
                  </Button>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate/40 uppercase tracking-widest flex items-center gap-2">
                <History size={14} /> Workflow History
              </p>
              <div className="space-y-3">
                {content.comments?.map((comment: any) => (
                  <div key={comment.id} className="text-xs p-3 bg-alabaster/50 rounded-xl border border-alabaster">
                    <p className="text-slate/60 leading-relaxed">{comment.comment}</p>
                    <p className="text-[10px] text-slate/30 mt-1 font-bold">
                      {new Date(comment.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
                {(!content.comments || content.comments.length === 0) && (
                  <p className="text-xs text-slate/30 italic">No history yet.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Draft Status Overview */}
        {drafts.length > 0 && (
          <Card className="rounded-3xl border-none shadow-soft bg-white overflow-hidden">
            <CardHeader className="border-b border-alabaster">
              <CardTitle className="text-xl font-heading font-bold text-slate flex items-center gap-2">
                <FileText size={20} className="text-sage" />
                Platform Drafts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {drafts.map((draft: any) => (
                  <div key={draft.id} className="flex items-center justify-between p-3 rounded-xl bg-alabaster/30 border border-alabaster">
                    <div className="flex items-center gap-3">
                      {draft.platform === 'linkedin' && <Linkedin size={16} className="text-[#0A66C2]" />}
                      {draft.platform === 'twitter' && <Twitter size={16} className="text-black" />}
                      {draft.platform === 'instagram' && <Instagram size={16} className="text-[#E1306C]" />}
                      {draft.platform === 'email' && <Mail size={16} className="text-red-500" />}
                      {draft.platform === 'blog' && <FileText size={16} className="text-slate" />}
                      <span className="text-xs font-bold text-slate capitalize">{draft.platform}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[9px] font-bold border-none rounded-full px-2 ${
                        draft.status === 'published' ? 'text-green-600 bg-green-50' :
                        draft.status === 'scheduled' ? 'text-blue-600 bg-blue-50' :
                        'text-amber-600 bg-amber-50'
                      }`}>
                        {draft.status} v{draft.version}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generated Visuals */}
        <Card className="rounded-3xl border-none shadow-soft bg-white overflow-hidden">
          <CardHeader className="border-b border-alabaster">
            <CardTitle className="text-xl font-heading font-bold text-slate flex items-center gap-2">
              <ImageIcon size={20} className="text-sage" />
              Generated Visuals
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {images.map((img: any, idx: number) => (
                <div 
                  key={img.id}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative cursor-pointer rounded-2xl overflow-hidden border-2 transition-all ${activeImageIndex === idx ? 'border-sage shadow-md scale-[1.02]' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                  <img src={img.image_url} alt={`Asset ${idx}`} className="w-full aspect-square object-cover" />
                  {activeImageIndex === idx && (
                    <div className="absolute top-2 right-2 bg-sage text-white p-1 rounded-full shadow-lg">
                      <Check size={12} />
                    </div>
                  )}
                </div>
              ))}
              {images.length === 0 && (
                <div className="col-span-2 h-40 flex flex-col items-center justify-center text-slate/20 border-2 border-dashed border-alabaster rounded-2xl">
                  <ImageIcon size={32} />
                  <p className="text-sm font-medium mt-2">No images generated yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Brief Info */}
        <Card className="rounded-3xl border-none shadow-soft bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-heading font-bold text-slate">Content Brief</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-4">
            <div className="flex justify-between items-start border-b border-alabaster pb-4">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-slate/40 font-bold">Audience</p>
                <p className="text-sm font-medium text-slate">{content.content_briefs?.audience}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[10px] uppercase tracking-widest text-slate/40 font-bold">Tone</p>
                <Badge className="bg-terracotta/10 text-terracotta hover:bg-terracotta/20 border-none">{content.content_briefs?.tone}</Badge>
              </div>
            </div>
            <div className="space-y-1 pt-2">
              <p className="text-[10px] uppercase tracking-widest text-slate/40 font-bold">Goals</p>
              <p className="text-sm text-slate/60 leading-relaxed italic">"{content.content_briefs?.goals}"</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="rounded-2xl border-none">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-bold text-slate flex items-center gap-2">
              <Calendar size={20} className="text-terracotta" /> Schedule Post
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate/70 text-sm">Date</Label>
                <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="rounded-xl border-alabaster bg-alabaster/50 h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate/70 text-sm">Time</Label>
                <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="rounded-xl border-alabaster bg-alabaster/50 h-11" />
              </div>
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
    </div>
  );
}
