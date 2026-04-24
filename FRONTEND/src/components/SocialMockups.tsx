'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader } from './Loader';
import { 
  Heart, MessageCircle, Share2, MoreHorizontal, Globe, 
  ThumbsUp, Send, Repeat2, Bookmark, BarChart3,
  Edit2, RefreshCw, Calendar, Check, X,
  Linkedin, Twitter, Mail, FileText
} from 'lucide-react';
import { contentApi } from '@/services/api';
import { toast } from 'react-hot-toast';

// ========== LINKEDIN REALISTIC PREVIEW ==========

interface LinkedInMockupProps {
  content: string;
  imageUrl?: string;
  draftId?: string;
  onEdit?: (newContent: string) => void;
  onSchedule?: () => void;
  onPublish?: () => void;
  onRegenerate?: () => void;
  editable?: boolean;
  accountName?: string;
}

export function LinkedInMockup({ 
  content, imageUrl, draftId, onEdit, onSchedule, onPublish, onRegenerate,
  editable = false, accountName = "FOAI Content Studio"
}: LinkedInMockupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [publishing, setPublishing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleSaveEdit = () => {
    onEdit?.(editedContent);
    setIsEditing(false);
  };

  const handlePublish = async () => {
    if (!draftId) return;
    setPublishing(true);
    try {
      const result = await contentApi.publishToLinkedIn(draftId);
      if (result.post_url) {
        toast.success('Published to LinkedIn!');
      } else {
        toast.error(result.error || 'Publishing failed');
      }
      onPublish?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleRegenerate = async () => {
    if (!draftId) return;
    setRegenerating(true);
    try {
      const result = await contentApi.regenerateDraft(draftId, 'linkedin');
      setEditedContent(result.draft?.body || editedContent);
      toast.success('Post regenerated!');
      onRegenerate?.();
    } catch {
      toast.error('Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Platform Label */}
      <div className="flex items-center gap-2 px-1">
        <div className="w-5 h-5 bg-[#0A66C2] rounded flex items-center justify-center">
          <Linkedin size={12} className="text-white" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate/40">LinkedIn Preview</span>
        {draftId && <Badge variant="outline" className="text-[9px] ml-auto border-slate/10 text-slate/30">Draft</Badge>}
      </div>

      {/* LinkedIn Card */}
      <Card className="max-w-[555px] mx-auto bg-white border border-[#e0e0e0] shadow-sm rounded-lg overflow-hidden font-[system-ui,-apple-system,sans-serif]">
        <CardHeader className="p-3 pb-1 flex flex-row items-start gap-2 space-y-0">
          <Avatar className="h-12 w-12 rounded-full border border-gray-200">
            <AvatarFallback className="rounded-full bg-gradient-to-br from-[#0A66C2] to-[#004182] text-white text-sm font-bold">AI</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[14px] font-semibold text-[#191919] leading-tight hover:text-[#0A66C2] cursor-pointer">{accountName}</span>
            <span className="text-[12px] text-[#666666] leading-tight">AI Content Studio • 2,450 followers</span>
            <div className="flex items-center gap-1 text-[12px] text-[#666666]">
              <span>Just now •</span>
              <Globe size={12} />
            </div>
          </div>
          <button className="text-[#666666] hover:bg-gray-100 p-1 rounded-full transition-colors">
            <MoreHorizontal size={20} />
          </button>
        </CardHeader>

        <CardContent className="px-4 pt-2 pb-2 space-y-3">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[120px] text-[14px] leading-[1.4] border-[#0A66C2]/30 focus:ring-[#0A66C2]/20 rounded-lg"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} className="bg-[#0A66C2] hover:bg-[#004182] text-white text-xs rounded-full px-4">
                  <Check size={12} className="mr-1" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setEditedContent(content); }} className="text-xs rounded-full">
                  <X size={12} className="mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-[14px] text-[#191919] whitespace-pre-wrap leading-[1.4]">
              {editedContent || content}
            </p>
          )}
          
          {imageUrl && (
            <div className="rounded-none overflow-hidden -mx-4 border-t border-b border-[#e0e0e0]">
              <img src={imageUrl} alt="LinkedIn Post" className="w-full h-auto object-cover" style={{ aspectRatio: '1.91/1' }} />
            </div>
          )}
        </CardContent>

        {/* Engagement Stats */}
        <div className="px-4 py-1.5 flex items-center justify-between text-[12px] text-[#666666] border-b border-[#e0e0e0]">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1">
              <div className="w-4 h-4 rounded-full bg-[#0A66C2] flex items-center justify-center"><ThumbsUp size={8} className="text-white" /></div>
              <div className="w-4 h-4 rounded-full bg-[#E7413F] flex items-center justify-center"><Heart size={8} className="text-white" /></div>
            </div>
            <span className="ml-1">Preview</span>
          </div>
          <span>0 comments</span>
        </div>

        <CardFooter className="p-1 px-2 flex justify-between">
          <button className="flex items-center gap-1.5 text-[#666666] hover:bg-[#f0f0f0] py-2 px-3 rounded transition-colors text-[13px] font-semibold">
            <ThumbsUp size={18} /> Like
          </button>
          <button className="flex items-center gap-1.5 text-[#666666] hover:bg-[#f0f0f0] py-2 px-3 rounded transition-colors text-[13px] font-semibold">
            <MessageCircle size={18} /> Comment
          </button>
          <button className="flex items-center gap-1.5 text-[#666666] hover:bg-[#f0f0f0] py-2 px-3 rounded transition-colors text-[13px] font-semibold">
            <Repeat2 size={18} /> Repost
          </button>
          <button className="flex items-center gap-1.5 text-[#666666] hover:bg-[#f0f0f0] py-2 px-3 rounded transition-colors text-[13px] font-semibold">
            <Send size={18} /> Send
          </button>
        </CardFooter>
      </Card>

      {/* Action Buttons */}
      {editable && (
        <div className="flex gap-2 justify-center flex-wrap">
          <Button 
            size="sm" variant="outline" onClick={() => setIsEditing(true)}
            className="rounded-full text-xs border-slate/10 hover:border-[#0A66C2] hover:text-[#0A66C2]"
          >
            <Edit2 size={12} className="mr-1.5" /> Edit
          </Button>
          <Button 
            size="sm" variant="outline" onClick={handleRegenerate} disabled={regenerating}
            className="rounded-full text-xs border-slate/10 hover:border-sage hover:text-sage"
          >
            {regenerating ? <Loader size="sm" /> : <RefreshCw size={12} className="mr-1.5" />}
            Regenerate
          </Button>
          <Button 
            size="sm" variant="outline" onClick={onSchedule}
            className="rounded-full text-xs border-slate/10 hover:border-terracotta hover:text-terracotta"
          >
            <Calendar size={12} className="mr-1.5" /> Schedule
          </Button>
          <Button 
            size="sm" onClick={handlePublish} disabled={publishing}
            className="rounded-full text-xs bg-[#0A66C2] hover:bg-[#004182] text-white"
          >
            {publishing ? <Loader size="sm" /> : <Send size={12} className="mr-1.5" />}
            Post Now
          </Button>
        </div>
      )}
    </div>
  );
}

// ========== TWITTER / X REALISTIC PREVIEW ==========

interface TwitterMockupProps {
  content: string;
  imageUrl?: string;
  draftId?: string;
  onEdit?: (newContent: string) => void;
  onSchedule?: () => void;
  onPublish?: () => void;
  onRegenerate?: () => void;
  editable?: boolean;
  accountName?: string;
  handle?: string;
}

export function TwitterMockup({ 
  content, imageUrl, draftId, onEdit, onSchedule, onPublish, onRegenerate,
  editable = false, accountName = "FOAI Studio", handle = "@foai_studio"
}: TwitterMockupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [publishing, setPublishing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const charCount = (editedContent || content).length;

  const handleSaveEdit = () => {
    onEdit?.(editedContent);
    setIsEditing(false);
  };

  const handlePublish = async () => {
    if (!draftId) return;
    setPublishing(true);
    try {
      const result = await contentApi.publishToTwitter(draftId);
      if (result.post_url) {
        toast.success('Published to X!');
      } else {
        toast.error(result.error || 'Publishing failed');
      }
      onPublish?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleRegenerate = async () => {
    if (!draftId) return;
    setRegenerating(true);
    try {
      const result = await contentApi.regenerateDraft(draftId, 'twitter');
      setEditedContent(result.draft?.body || editedContent);
      toast.success('Tweet regenerated!');
      onRegenerate?.();
    } catch {
      toast.error('Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Platform Label */}
      <div className="flex items-center gap-2 px-1">
        <div className="w-5 h-5 bg-black rounded flex items-center justify-center">
          <Twitter size={11} className="text-white" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate/40">X (Twitter) Preview</span>
        {draftId && <Badge variant="outline" className="text-[9px] ml-auto border-slate/10 text-slate/30">Draft</Badge>}
      </div>

      {/* Twitter Card */}
      <Card className="max-w-[555px] mx-auto bg-white border border-[#eff3f4] shadow-none rounded-none overflow-hidden font-[system-ui,-apple-system,sans-serif]">
        <CardContent className="p-3 flex gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="bg-black text-white text-sm font-bold">AI</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[15px] font-bold text-[#0f1419] hover:underline cursor-pointer">{accountName}</span>
              <svg viewBox="0 0 22 22" className="w-[18px] h-[18px] text-[#1d9bf0]" fill="currentColor">
                <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.143.271.586.702 1.084 1.24 1.438.54.354 1.167.551 1.813.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.225 1.261.276 1.894.147.634-.13 1.22-.435 1.69-.88.445-.47.75-1.055.88-1.69.13-.634.084-1.292-.138-1.896.587-.275 1.087-.706 1.443-1.245.355-.54.554-1.17.573-1.817z"></path>
                <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="white"></path>
              </svg>
              <span className="text-[15px] text-[#536471]">{handle}</span>
              <span className="text-[15px] text-[#536471]">·</span>
              <span className="text-[15px] text-[#536471] hover:underline cursor-pointer">now</span>
            </div>

            {/* Content */}
            {isEditing ? (
              <div className="mt-1 space-y-2">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  maxLength={280}
                  className="min-h-[80px] text-[15px] leading-[1.3] border-[#1d9bf0]/30 focus:ring-[#1d9bf0]/20 rounded-xl"
                />
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${charCount > 280 ? 'text-red-500 font-bold' : 'text-[#536471]'}`}>{charCount}/280</span>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit} className="bg-black hover:bg-gray-800 text-white text-xs rounded-full px-4">Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setEditedContent(content); }} className="text-xs rounded-full">Cancel</Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[15px] text-[#0f1419] mt-0.5 whitespace-pre-wrap leading-[1.3]">
                {editedContent || content}
              </p>
            )}

            {/* Image */}
            {imageUrl && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-[#eff3f4]">
                <img src={imageUrl} alt="Tweet media" className="w-full h-auto object-cover" style={{ aspectRatio: '16/9' }} />
              </div>
            )}

            {/* Engagement Bar */}
            <div className="flex justify-between mt-3 max-w-[425px] text-[#536471]">
              <button className="flex items-center gap-1 group hover:text-[#1d9bf0] transition-colors p-1.5 -ml-1.5">
                <div className="p-1.5 rounded-full group-hover:bg-[#1d9bf0]/10 transition-colors">
                  <MessageCircle size={17} />
                </div>
                <span className="text-[13px]">0</span>
              </button>
              <button className="flex items-center gap-1 group hover:text-[#00ba7c] transition-colors p-1.5">
                <div className="p-1.5 rounded-full group-hover:bg-[#00ba7c]/10 transition-colors">
                  <Repeat2 size={17} />
                </div>
                <span className="text-[13px]">0</span>
              </button>
              <button className="flex items-center gap-1 group hover:text-[#f91880] transition-colors p-1.5">
                <div className="p-1.5 rounded-full group-hover:bg-[#f91880]/10 transition-colors">
                  <Heart size={17} />
                </div>
                <span className="text-[13px]">0</span>
              </button>
              <button className="flex items-center gap-1 group hover:text-[#1d9bf0] transition-colors p-1.5">
                <div className="p-1.5 rounded-full group-hover:bg-[#1d9bf0]/10 transition-colors">
                  <BarChart3 size={17} />
                </div>
                <span className="text-[13px]">0</span>
              </button>
              <div className="flex items-center gap-2">
                <button className="p-1.5 rounded-full hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0] transition-colors">
                  <Bookmark size={17} />
                </button>
                <button className="p-1.5 rounded-full hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0] transition-colors">
                  <Share2 size={17} />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {editable && (
        <div className="flex gap-2 justify-center flex-wrap">
          <Button 
            size="sm" variant="outline" onClick={() => setIsEditing(true)}
            className="rounded-full text-xs border-slate/10 hover:border-black hover:text-black"
          >
            <Edit2 size={12} className="mr-1.5" /> Edit
          </Button>
          <Button 
            size="sm" variant="outline" onClick={handleRegenerate} disabled={regenerating}
            className="rounded-full text-xs border-slate/10 hover:border-sage hover:text-sage"
          >
            {regenerating ? <Loader size="sm" /> : <RefreshCw size={12} className="mr-1.5" />}
            Regenerate
          </Button>
          <Button 
            size="sm" variant="outline" onClick={onSchedule}
            className="rounded-full text-xs border-slate/10 hover:border-terracotta hover:text-terracotta"
          >
            <Calendar size={12} className="mr-1.5" /> Schedule
          </Button>
          <Button 
            size="sm" onClick={handlePublish} disabled={publishing}
            className="rounded-full text-xs bg-black hover:bg-gray-800 text-white"
          >
            {publishing ? <Loader size="sm" /> : <Send size={12} className="mr-1.5" />}
            Post Now
          </Button>
        </div>
      )}
    </div>
  );
}

// ========== INSTAGRAM REALISTIC PREVIEW ==========

interface InstagramMockupProps {
  content: string;
  imageUrl?: string;
  draftId?: string;
  onEdit?: (newContent: string) => void;
  editable?: boolean;
  accountName?: string;
}

export function InstagramMockup({ 
  content, imageUrl, draftId, onEdit,
  editable = false, accountName = "foai_studio"
}: InstagramMockupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const handleSaveEdit = () => {
    onEdit?.(editedContent);
    setIsEditing(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div className="w-5 h-5 bg-gradient-to-tr from-[#fd5949] via-[#d6249f] to-[#285AEB] rounded flex items-center justify-center">
          <span className="text-white text-[9px] font-bold">IG</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate/40">Instagram Preview</span>
      </div>

      <Card className="max-w-[470px] mx-auto bg-white border border-[#dbdbdb] shadow-none rounded-lg overflow-hidden font-[system-ui,-apple-system,sans-serif]">
        {/* Header */}
        <div className="flex items-center gap-2.5 p-3 border-b border-[#efefef]">
          <Avatar className="h-8 w-8 ring-2 ring-[#e1306c] ring-offset-2">
            <AvatarFallback className="bg-gradient-to-br from-[#fd5949] to-[#285AEB] text-white text-[10px] font-bold">AI</AvatarFallback>
          </Avatar>
          <span className="text-[13px] font-semibold text-[#262626]">{accountName}</span>
          <button className="ml-auto text-[#262626]"><MoreHorizontal size={20} /></button>
        </div>

        {/* Image */}
        {imageUrl ? (
          <img src={imageUrl} alt="Instagram Post" className="w-full aspect-square object-cover" />
        ) : (
          <div className="w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400">
            <span className="text-sm">Image Preview</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-4">
            <Heart size={24} className="text-[#262626] cursor-pointer hover:text-gray-500 transition-colors" />
            <MessageCircle size={24} className="text-[#262626] cursor-pointer hover:text-gray-500 transition-colors" />
            <Send size={24} className="text-[#262626] cursor-pointer hover:text-gray-500 transition-colors" />
          </div>
          <Bookmark size={24} className="text-[#262626] cursor-pointer hover:text-gray-500 transition-colors" />
        </div>

        {/* Caption */}
        <div className="px-3 pb-3">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[80px] text-[13px] border-[#dbdbdb] rounded-lg"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} className="bg-[#0095f6] hover:bg-[#1877f2] text-white text-xs rounded-lg px-4">Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="text-xs">Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-[#262626] leading-[1.4]">
              <span className="font-semibold mr-1">{accountName}</span>
              {editedContent || content}
            </p>
          )}
        </div>
      </Card>

      {editable && (
        <div className="flex gap-2 justify-center">
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="rounded-full text-xs border-slate/10">
            <Edit2 size={12} className="mr-1.5" /> Edit Caption
          </Button>
        </div>
      )}
    </div>
  );
}

// ========== EMAIL REALISTIC PREVIEW ==========

interface EmailMockupProps {
  content: string;
  subject?: string;
  draftId?: string;
  onEdit?: (newContent: string) => void;
  onRegenerate?: () => void;
  editable?: boolean;
}

export function EmailMockup({ 
  content, subject = "Important Update from FOAI", draftId, onEdit, onRegenerate,
  editable = false
}: EmailMockupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [regenerating, setRegenerating] = useState(false);

  const handleSaveEdit = () => {
    onEdit?.(editedContent);
    setIsEditing(false);
  };

  const handleRegenerate = async () => {
    if (!draftId) return;
    setRegenerating(true);
    try {
      const result = await contentApi.regenerateDraft(draftId, 'email');
      setEditedContent(result.draft?.body || editedContent);
      toast.success('Email content regenerated!');
      onRegenerate?.();
    } catch {
      toast.error('Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div className="w-5 h-5 bg-red-500 rounded flex items-center justify-center">
          <Mail size={12} className="text-white" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate/40">Email Preview</span>
        {draftId && <Badge variant="outline" className="text-[9px] ml-auto border-slate/10 text-slate/30">Draft</Badge>}
      </div>

      <Card className="max-w-[600px] mx-auto bg-white border border-[#e0e0e0] shadow-sm rounded-xl overflow-hidden font-sans">
        <div className="bg-[#f2f6fc] px-6 py-4 border-b border-[#e0e0e0]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-[#202124]">{subject}</h2>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-white text-[#5f6368] font-normal text-[10px] border-[#dadce0]">Inbox</Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-[#5f6368] text-white">FO</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-[#202124]">FOAI Studio</span>
                <span className="text-xs text-[#5f6368] font-normal">&lt;studio@foai.ai&gt;</span>
              </div>
              <span className="text-xs text-[#5f6368]">to me</span>
            </div>
            <span className="ml-auto text-xs text-[#5f6368]">Just now</span>
          </div>
        </div>

        <CardContent className="px-10 py-10">
          {isEditing ? (
            <div className="space-y-4">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[300px] text-[15px] leading-relaxed border-[#dadce0] focus:ring-[#1a73e8]/20 rounded-lg font-serif"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} className="bg-[#1a73e8] hover:bg-[#174ea6] text-white text-xs rounded px-4">Save Changes</Button>
                <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setEditedContent(content); }} className="text-xs">Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-slate max-w-none">
              <div className="whitespace-pre-wrap text-[15px] text-[#3c4043] leading-relaxed font-sans">
                {editedContent || content}
              </div>
            </div>
          )}
        </CardContent>

        <div className="px-10 pb-8 flex gap-3">
          <Button variant="outline" size="sm" className="rounded-full text-xs border-[#dadce0] text-[#5f6368] hover:bg-[#f8f9fa]">
            <Repeat2 size={14} className="mr-2" /> Reply
          </Button>
          <Button variant="outline" size="sm" className="rounded-full text-xs border-[#dadce0] text-[#5f6368] hover:bg-[#f8f9fa]">
            <Send size={14} className="mr-2" /> Forward
          </Button>
        </div>
      </Card>

      {editable && (
        <div className="flex gap-2 justify-center">
          <Button 
            size="sm" variant="outline" onClick={() => setIsEditing(true)}
            className="rounded-full text-xs border-slate/10 hover:border-red-500 hover:text-red-500"
          >
            <Edit2 size={12} className="mr-1.5" /> Edit Content
          </Button>
          <Button 
            size="sm" variant="outline" onClick={handleRegenerate} disabled={regenerating}
            className="rounded-full text-xs border-slate/10 hover:border-sage hover:text-sage"
          >
            {regenerating ? <Loader size="sm" /> : <RefreshCw size={12} className="mr-1.5" />}
            Regenerate
          </Button>
        </div>
      )}
    </div>
  );
}

// ========== BLOG REALISTIC PREVIEW ==========

interface BlogMockupProps {
  content: string;
  title: string;
  imageUrl?: string;
  draftId?: string;
  onEdit?: (newContent: string) => void;
  onRegenerate?: () => void;
  editable?: boolean;
}

export function BlogMockup({ 
  content, title, imageUrl, draftId, onEdit, onRegenerate,
  editable = false
}: BlogMockupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [regenerating, setRegenerating] = useState(false);

  const handleSaveEdit = () => {
    onEdit?.(editedContent);
    setIsEditing(false);
  };

  const handleRegenerate = async () => {
    if (!draftId) return;
    setRegenerating(true);
    try {
      const result = await contentApi.regenerateDraft(draftId, 'blog');
      setEditedContent(result.draft?.body || editedContent);
      toast.success('Blog post regenerated!');
      onRegenerate?.();
    } catch {
      toast.error('Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div className="w-5 h-5 bg-slate-800 rounded flex items-center justify-center">
          <FileText size={12} className="text-white" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate/40">Blog Post Preview</span>
        {draftId && <Badge variant="outline" className="text-[9px] ml-auto border-slate/10 text-slate/30">Draft</Badge>}
      </div>

      <Card className="max-w-[740px] mx-auto bg-white border border-[#e0e0e0] shadow-sm rounded-none overflow-hidden font-serif">
        {imageUrl && (
          <img src={imageUrl} alt={title} className="w-full aspect-[2/1] object-cover" />
        )}
        
        <CardContent className="px-8 md:px-16 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-[#292929] mb-6 leading-tight font-sans">
            {title}
          </h1>
          
          <div className="flex items-center gap-3 mb-10 pb-6 border-b border-[#f2f2f2]">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-slate-200 text-slate-600">AI</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[#292929] font-sans">FOAI Content Studio</span>
              <div className="flex items-center gap-2 text-xs text-[#757575] font-sans">
                <span>Published in FOAI Blog</span>
                <span>•</span>
                <span>5 min read</span>
                <span>•</span>
                <span>Just now</span>
              </div>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[400px] text-[18px] leading-relaxed border-[#e0e0e0] focus:ring-[#292929]/10 rounded-lg font-serif"
              />
              <div className="flex gap-2 font-sans">
                <Button size="sm" onClick={handleSaveEdit} className="bg-[#1a8917] hover:bg-[#156d12] text-white text-xs rounded-full px-4">Publish Updates</Button>
                <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setEditedContent(content); }} className="text-xs">Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-lg prose-slate max-w-none">
              <div className="whitespace-pre-wrap text-[18px] text-[#292929] leading-[1.6] font-serif">
                {editedContent || content}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {editable && (
        <div className="flex gap-2 justify-center font-sans">
          <Button 
            size="sm" variant="outline" onClick={() => setIsEditing(true)}
            className="rounded-full text-xs border-slate/10 hover:border-slate-800 hover:text-slate-800"
          >
            <Edit2 size={12} className="mr-1.5" /> Edit Article
          </Button>
          <Button 
            size="sm" variant="outline" onClick={handleRegenerate} disabled={regenerating}
            className="rounded-full text-xs border-slate/10 hover:border-sage hover:text-sage"
          >
            {regenerating ? <Loader size="sm" /> : <RefreshCw size={12} className="mr-1.5" />}
            Regenerate
          </Button>
        </div>
      )}
    </div>
  );
}
