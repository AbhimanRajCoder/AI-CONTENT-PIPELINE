'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { contentApi } from '@/services/api';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon,
  Linkedin, Twitter, Instagram, Mail, FileText,
  Clock, CheckCircle2, XCircle, Trash2, Eye,
  LayoutGrid, List
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, addMonths, subMonths,
  getDay, parseISO
} from 'date-fns';

const PLATFORM_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  linkedin: { icon: Linkedin, color: '#0A66C2', bg: 'bg-[#0A66C2]' },
  twitter: { icon: Twitter, color: '#000000', bg: 'bg-black' },
  instagram: { icon: Instagram, color: '#E1306C', bg: 'bg-[#E1306C]' },
  email: { icon: Mail, color: '#EA4335', bg: 'bg-[#EA4335]' },
  blog: { icon: FileText, color: '#264653', bg: 'bg-[#264653]' },
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'border-l-blue-400 bg-blue-50/50',
  publishing: 'border-l-amber-400 bg-amber-50/50',
  published: 'border-l-green-400 bg-green-50/50',
  failed: 'border-l-red-400 bg-red-50/50',
  cancelled: 'border-l-gray-400 bg-gray-50/50',
  draft: 'border-l-amber-300 bg-amber-50/30',
};

interface ScheduledPost {
  id: string;
  draft_id: string;
  platform: string;
  scheduled_at: string;
  published_at?: string;
  status: string;
  post_url?: string;
  error_message?: string;
  drafts?: {
    id: string;
    body: string;
    platform: string;
    title?: string;
    image_url?: string;
  };
}

interface CalendarEvent {
  id: string;
  title: string;
  platform: string;
  time: string;
  status: string;
  bodyPreview: string;
  type: 'scheduled' | 'draft';
  originalData: any;
}

export default function ContentCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDraftId, setScheduleDraftId] = useState('');
  const [schedulePlatform, setSchedulePlatform] = useState('linkedin');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');

  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      
      const [calendarData, draftsData] = await Promise.all([
        contentApi.getCalendar(year, month),
        contentApi.getDrafts({ status: 'draft' })
      ]);

      // Transform scheduled posts into calendar events
      const scheduledEvents: CalendarEvent[] = (calendarData.scheduled || []).map((post: ScheduledPost) => ({
        id: post.id,
        title: post.drafts?.title || `${post.platform} post`,
        platform: post.platform,
        time: post.scheduled_at,
        status: post.status,
        bodyPreview: post.drafts?.body?.substring(0, 100) || '',
        type: 'scheduled' as const,
        originalData: post,
      }));

      setEvents(scheduledEvents);
      setDrafts(draftsData || []);
    } catch (error) {
      console.error('Calendar fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleSchedulePost = async () => {
    if (!scheduleDraftId || !scheduleDate || !scheduleTime) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      await contentApi.schedulePost({
        draft_id: scheduleDraftId,
        platform: schedulePlatform,
        scheduled_at: `${scheduleDate}T${scheduleTime}:00Z`,
      });
      toast.success('Post scheduled successfully!');
      setShowScheduleDialog(false);
      setScheduleDraftId('');
      fetchCalendarData();
    } catch {
      toast.error('Failed to schedule post');
    }
  };

  const handleCancelScheduledPost = async (postId: string) => {
    try {
      await contentApi.cancelScheduledPost(postId);
      toast.success('Scheduled post cancelled');
      setSelectedEvent(null);
      fetchCalendarData();
    } catch {
      toast.error('Failed to cancel');
    }
  };

  // Calendar grid computation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart); // 0=Sunday
  const paddedDays = Array(startPadding).fill(null).concat(days);

  const getEventsForDay = (day: Date) =>
    events.filter(e => isSameDay(parseISO(e.time), day));

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-heading font-bold text-slate tracking-tight">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8 rounded-full hover:bg-alabaster">
              <ChevronLeft size={16} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleToday} className="h-8 rounded-full text-xs font-bold hover:bg-alabaster px-3">
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8 rounded-full hover:bg-alabaster">
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-alabaster rounded-xl p-1">
            <Button 
              variant="ghost" size="sm"
              onClick={() => setViewMode('month')}
              className={`rounded-lg text-xs h-7 px-3 ${viewMode === 'month' ? 'bg-white shadow-sm' : ''}`}
            >
              <LayoutGrid size={12} className="mr-1.5" /> Month
            </Button>
            <Button 
              variant="ghost" size="sm"
              onClick={() => setViewMode('list')}
              className={`rounded-lg text-xs h-7 px-3 ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <List size={12} className="mr-1.5" /> List
            </Button>
          </div>

          {/* Schedule Button */}
          <Button 
            onClick={() => setShowScheduleDialog(true)}
            className="bg-terracotta hover:bg-terracotta/90 text-white rounded-xl h-9 px-5 text-sm"
          >
            <Plus size={14} className="mr-1.5" /> Schedule Post
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Scheduled', count: events.filter(e => e.status === 'scheduled').length, color: 'bg-blue-500', icon: Clock },
          { label: 'Published', count: events.filter(e => e.status === 'published').length, color: 'bg-green-500', icon: CheckCircle2 },
          { label: 'Failed', count: events.filter(e => e.status === 'failed').length, color: 'bg-red-500', icon: XCircle },
          { label: 'Drafts Ready', count: drafts.length, color: 'bg-amber-500', icon: FileText },
        ].map(stat => (
          <Card key={stat.label} className="rounded-2xl border-none shadow-soft bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.color}/10 flex items-center justify-center`}>
                <stat.icon size={18} className={stat.color.replace('bg-', 'text-')} />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold text-slate">{stat.count}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate/40">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 min-h-[400px]">
          <Loader size="xl" text="Syncing your content calendar..." />
        </div>
      ) : viewMode === 'month' ? (
        /* Month View */
        <Card className="rounded-3xl border-none shadow-soft bg-white overflow-hidden">
          <CardContent className="p-0">
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-alabaster">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate/40 bg-alabaster/30">
                  {day}
                </div>
              ))}
            </div>

            {/* Day Grid */}
            <div className="grid grid-cols-7">
              {paddedDays.map((day, idx) => {
                if (!day) {
                  return <div key={`pad-${idx}`} className="min-h-[100px] border-b border-r border-alabaster/50 bg-alabaster/20" />;
                }

                const dayEvents = getEventsForDay(day);
                const isCurrentDay = isToday(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[100px] border-b border-r border-alabaster/50 p-1.5 cursor-pointer transition-colors hover:bg-sage/5
                      ${isSelected ? 'bg-sage/5 ring-1 ring-inset ring-sage/20' : ''}
                      ${!isSameMonth(day, currentMonth) ? 'bg-alabaster/20' : ''}
                    `}
                  >
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold mb-1
                      ${isCurrentDay ? 'bg-terracotta text-white' : 'text-slate/60'}
                    `}>
                      {format(day, 'd')}
                    </div>

                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map(event => {
                        const platformIcon = PLATFORM_ICONS[event.platform] || PLATFORM_ICONS.blog;
                        const Icon = platformIcon.icon;
                        return (
                          <div
                            key={event.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border-l-2 cursor-pointer hover:opacity-80 transition-opacity
                              ${STATUS_COLORS[event.status] || STATUS_COLORS.draft}
                            `}
                          >
                            <Icon size={9} style={{ color: platformIcon.color }} />
                            <span className="truncate text-slate/70">{format(parseISO(event.time), 'HH:mm')}</span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-[9px] text-slate/40 font-bold px-1.5">+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* List View */
        <div className="space-y-3">
          {events.length === 0 ? (
            <Card className="rounded-2xl border-none shadow-soft bg-white">
              <CardContent className="p-12 text-center text-slate/30">
                <CalendarIcon size={48} className="mx-auto mb-4 opacity-30" />
                <p className="font-medium">No scheduled posts this month</p>
                <p className="text-sm mt-1">Schedule a draft to see it here.</p>
              </CardContent>
            </Card>
          ) : (
            events
              .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
              .map(event => {
                const platformIcon = PLATFORM_ICONS[event.platform] || PLATFORM_ICONS.blog;
                const Icon = platformIcon.icon;
                return (
                  <Card
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="rounded-2xl border-none shadow-soft bg-white cursor-pointer hover:shadow-lg transition-all"
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl ${platformIcon.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate">{event.title}</span>
                          <Badge className={`text-[9px] font-bold border-none rounded-full px-2 ${
                            event.status === 'published' ? 'text-green-600 bg-green-50' :
                            event.status === 'scheduled' ? 'text-blue-600 bg-blue-50' :
                            'text-amber-600 bg-amber-50'
                          }`}>{event.status}</Badge>
                        </div>
                        <p className="text-xs text-slate/50 truncate mt-0.5">{event.bodyPreview}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-slate">{format(parseISO(event.time), 'MMM d')}</p>
                        <p className="text-xs text-slate/40">{format(parseISO(event.time), 'HH:mm')}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
          )}
        </div>
      )}

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="rounded-2xl border-none max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-heading font-bold text-slate flex items-center gap-2">
                  {(() => {
                    const pi = PLATFORM_ICONS[selectedEvent.platform] || PLATFORM_ICONS.blog;
                    const Icon = pi.icon;
                    return <div className={`w-8 h-8 rounded-lg ${pi.bg} flex items-center justify-center`}><Icon size={14} className="text-white" /></div>;
                  })()}
                  Scheduled Post
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate/40 mb-1">Platform</p>
                  <p className="text-sm font-medium text-slate capitalize">{selectedEvent.platform}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate/40 mb-1">Scheduled For</p>
                  <p className="text-sm font-medium text-slate">{format(parseISO(selectedEvent.time), 'EEEE, MMMM d, yyyy • HH:mm')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate/40 mb-1">Status</p>
                  <Badge className={`text-xs font-bold border-none rounded-full px-3 ${
                    selectedEvent.status === 'published' ? 'text-green-600 bg-green-50' :
                    selectedEvent.status === 'scheduled' ? 'text-blue-600 bg-blue-50' :
                    selectedEvent.status === 'failed' ? 'text-red-600 bg-red-50' :
                    'text-amber-600 bg-amber-50'
                  }`}>{selectedEvent.status}</Badge>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate/40 mb-1">Preview</p>
                  <p className="text-sm text-slate/70 bg-alabaster/50 p-3 rounded-xl border border-alabaster">{selectedEvent.bodyPreview || 'No preview available'}</p>
                </div>
              </div>
              <DialogFooter className="gap-2">
                {selectedEvent.status === 'scheduled' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleCancelScheduledPost(selectedEvent.id)}
                    className="rounded-xl"
                  >
                    <Trash2 size={14} className="mr-1.5" /> Cancel Post
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setSelectedEvent(null)} className="rounded-xl">Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule New Post Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="rounded-2xl border-none">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-bold text-slate flex items-center gap-2">
              <CalendarIcon size={20} className="text-terracotta" /> Schedule a Post
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate/70 text-sm">Select Draft</Label>
              <Select value={scheduleDraftId} onValueChange={(v) => {
                setScheduleDraftId(v);
                const draft = drafts.find((d: any) => d.id === v);
                if (draft) setSchedulePlatform(draft.platform);
              }}>
                <SelectTrigger className="rounded-xl border-alabaster bg-alabaster/50 h-11">
                  <SelectValue placeholder="Choose a draft to schedule..." />
                </SelectTrigger>
                <SelectContent>
                  {drafts.map((draft: any) => {
                    const pi = PLATFORM_ICONS[draft.platform] || PLATFORM_ICONS.blog;
                    const Icon = pi.icon;
                    return (
                      <SelectItem key={draft.id} value={draft.id}>
                        <div className="flex items-center gap-2">
                          <Icon size={12} style={{ color: pi.color }} />
                          <span className="truncate">{draft.body?.substring(0, 50)}...</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {drafts.length === 0 && (
                <p className="text-xs text-slate/40 italic">No drafts available. Create a draft first.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
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
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowScheduleDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSchedulePost} className="bg-terracotta hover:bg-terracotta/90 text-white rounded-xl" disabled={!scheduleDraftId}>
              <CalendarIcon size={14} className="mr-2" /> Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Selected Day Detail */}
      {selectedDay && getEventsForDay(selectedDay).length > 0 && (
        <Card className="rounded-2xl border-none shadow-soft bg-white">
          <CardHeader className="border-b border-alabaster pb-3">
            <CardTitle className="text-sm font-heading font-bold text-slate">
              {format(selectedDay, 'EEEE, MMMM d')} — {getEventsForDay(selectedDay).length} posts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {getEventsForDay(selectedDay).map(event => {
              const pi = PLATFORM_ICONS[event.platform] || PLATFORM_ICONS.blog;
              const Icon = pi.icon;
              return (
                <div
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-alabaster/30 hover:bg-alabaster/60 cursor-pointer transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg ${pi.bg} flex items-center justify-center`}>
                    <Icon size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate">{format(parseISO(event.time), 'HH:mm')} • {event.platform}</p>
                    <p className="text-[11px] text-slate/50 truncate">{event.bodyPreview}</p>
                  </div>
                  <Badge className={`text-[9px] font-bold border-none rounded-full ${
                    event.status === 'published' ? 'text-green-600 bg-green-50' :
                    'text-blue-600 bg-blue-50'
                  }`}>{event.status}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
