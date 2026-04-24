'use client';

import React, { useState } from 'react';
import { contentApi } from '@/services/api';
import { toast } from 'react-hot-toast';
import { Loader } from './Loader';
import { Sparkles, Send } from 'lucide-react';
import GenerationProgress from './GenerationProgress';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ContentBriefForm() {
  const [loading, setLoading] = useState(false);
  const [currentNode, setCurrentNode] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [formData, setFormData] = useState({
    topic: '',
    audience: '',
    tone: 'Professional',
    goals: '',
    content_length: 600,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowProgress(true);
    setIsCompleted(false);
    setCurrentNode('');
    
    try {
      const brief = await contentApi.createBrief(formData);
      toast.success('Brief created! Starting generation...');
      
      const eventSource = new EventSource(`http://localhost:8000/generate/${brief.id}/stream`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.node) {
          setCurrentNode(data.node);
        }
        if (data.status === 'completed') {
          setIsCompleted(true);
          setLoading(false);
          eventSource.close();
        } else if (data.status === 'failed') {
          setLoading(false);
          eventSource.close();
          toast.error(data.error || 'Generation failed');
        }
        if (data.error) {
          toast.error(data.error);
          eventSource.close();
          setLoading(false);
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE error:", err);
        eventSource.close();
        setLoading(false);
      };

    } catch (error) {
      toast.error('Failed to start generation');
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto border-none shadow-soft rounded-3xl bg-white">
      <CardHeader>
        <CardTitle className="text-3xl font-heading font-bold text-slate">Create Content Brief</CardTitle>
        <CardDescription className="text-slate/50">Define your topic, audience, and goals to generate multi-format AI content.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="topic" className="text-slate/70">Topic</Label>
            <Input
              id="topic"
              required
              className="rounded-xl border-alabaster bg-alabaster/50 focus:ring-sage/20 h-12"
              placeholder="e.g. The Future of Mesh Networks"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="audience" className="text-slate/70">Target Audience</Label>
              <Input
                id="audience"
                required
                className="rounded-xl border-alabaster bg-alabaster/50 focus:ring-sage/20 h-12"
                placeholder="e.g. Tech Founders"
                value={formData.audience}
                onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate/70">Tone</Label>
              <Select
                value={formData.tone}
                onValueChange={(value) => setFormData({ ...formData, tone: value })}
              >
                <SelectTrigger className="rounded-xl border-alabaster bg-alabaster/50 focus:ring-sage/20 h-12">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Casual">Casual</SelectItem>
                  <SelectItem value="Witty">Witty</SelectItem>
                  <SelectItem value="Authoritative">Authoritative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goals" className="text-slate/70">Goals</Label>
            <Textarea
              id="goals"
              required
              rows={3}
              className="rounded-xl border-alabaster bg-alabaster/50 focus:ring-sage/20 min-h-[100px]"
              placeholder="What should this content achieve?"
              value={formData.goals}
              onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
            />
          </div>

          <div className="flex items-end justify-between gap-4 pt-4">
            <div className="w-1/3 space-y-2">
              <Label htmlFor="length" className="text-slate/70">Word Count</Label>
              <Input
                id="length"
                type="number"
                className="rounded-xl border-alabaster bg-alabaster/50 focus:ring-sage/20 h-12"
                value={formData.content_length}
                onChange={(e) => setFormData({ ...formData, content_length: parseInt(e.target.value) })}
              />
            </div>
            
            <Button
              type="submit"
              disabled={loading}
              className="bg-slate hover:bg-slate/90 text-white rounded-xl h-12 px-8 transition-all disabled:opacity-50"
            >
              {loading ? <Loader size="sm" className="mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {loading ? 'Processing...' : 'Generate Content'}
            </Button>
          </div>
        </form>
        
        {showProgress && (
          <div className="mt-8 border-t border-alabaster pt-8">
            <GenerationProgress 
              currentNode={currentNode} 
              isCompleted={isCompleted} 
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
