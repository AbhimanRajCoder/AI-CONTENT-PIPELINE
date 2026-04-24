'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { contentApi } from '@/services/api';
import { toast } from 'react-hot-toast';
import { Loader } from './Loader';
import { 
  MoreVertical, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  FileText, 
  Calendar,
  LayoutGrid,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import ContentPreview from './ContentPreview';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

const STAGES = ['Draft', 'Review', 'Approved', 'Published'];

export default function KanbanBoard() {
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  useEffect(() => {
    fetchContents();

    const channel = supabase
      .channel('contents_realtime')
      .on('postgres_changes' as any, { event: '*', table: 'contents' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setContents(prev => Array.isArray(prev) ? [...prev, payload.new] : [payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setContents(prev => Array.isArray(prev) ? prev.map(c => c.id === payload.new.id ? payload.new : c) : []);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchContents = async () => {
    try {
      const data = await contentApi.getCalendar();
      // The API now returns { content: [], scheduled: [], drafts: [] }
      const contentArray = Array.isArray(data.content) ? data.content : [];
      setContents(contentArray);
    } catch (error) {
      toast.error('Failed to fetch content');
      setContents([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await contentApi.updateStatus(id, newStatus);
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Update failed');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 min-h-[400px]">
      <Loader size="xl" text="Organizing your workflow..." />
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4">
      <Dialog open={!!selectedContentId} onOpenChange={(open) => !open && setSelectedContentId(null)}>
        <DialogContent className="max-w-6xl h-[90vh] overflow-y-auto rounded-3xl border-none p-8 bg-alabaster">
          {selectedContentId && <ContentPreview contentId={selectedContentId} />}
        </DialogContent>
      </Dialog>

      {STAGES.map(stage => (
        <div key={stage} className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-alabaster shadow-sm">
            <h3 className="font-heading font-bold text-slate text-xs tracking-widest uppercase">{stage}</h3>
            <Badge variant="secondary" className="bg-alabaster text-slate/40 hover:bg-alabaster">
              {contents.filter(c => c.status === stage).length}
            </Badge>
          </div>
          
          <div className="flex flex-col gap-4 min-h-[200px]">
            {contents.filter(c => c.status === stage).map(content => (
              <Card 
                key={content.id}
                onClick={() => setSelectedContentId(content.id)}
                className="group border-none shadow-soft hover:shadow-lg transition-all duration-300 rounded-3xl overflow-hidden bg-white cursor-pointer"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex justify-between items-start mb-3">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "rounded-lg px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold border-none",
                        content.status === 'Review' ? 'bg-terracotta/10 text-terracotta' : 'bg-sage/5 text-sage'
                      )}
                    >
                      {content.status === 'Review' ? 'Needs Review' : content.type}
                    </Badge>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate/20 group-hover:text-slate">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem className="text-xs font-medium">View Details</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs font-medium">Edit Content</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs font-medium text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <CardTitle className="text-sm font-heading font-bold text-slate leading-tight line-clamp-2">
                    {content.content_briefs?.topic || 'Untitled Content'}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="p-5 pt-0 pb-4">
                  <div className="flex items-center gap-4 text-slate/40 text-[10px] font-medium uppercase tracking-tighter">
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-sage/40" />
                      {formatDistanceToNow(new Date(content.created_at))} ago
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare size={12} className="text-sage/40" />
                      {content.comments?.length || 0}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="p-2 bg-alabaster/30 border-t border-alabaster flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                  {STAGES.filter(s => s !== stage).map(s => (
                    <Button
                      key={s}
                      variant="ghost"
                      size="sm"
                      onClick={() => updateStatus(content.id, s)}
                      className="h-7 px-2 text-[9px] font-bold text-slate/30 hover:text-sage hover:bg-sage/5 uppercase tracking-widest"
                    >
                      {s} <ChevronRight size={10} className="ml-1 opacity-50" />
                    </Button>
                  ))}
                </CardFooter>
              </Card>
            ))}
            
            {contents.filter(c => c.status === stage).length === 0 && (
              <div className="border-2 border-dashed border-alabaster rounded-3xl h-32 flex items-center justify-center text-slate/10">
                <LayoutGrid size={24} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
