'use client';

import React from 'react';
import { Loader } from './Loader';
import { CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const NODES = [
  { id: 'validate', label: 'Validating Brief' },
  { id: 'blog', label: 'Generating Blog Post' },
  { id: 'social', label: 'Creating Social Captions' },
  { id: 'email', label: 'Drafting Email Newsletter' },
  { id: 'image', label: 'Generating Visuals' },
  { id: 'save', label: 'Saving to Supabase' },
];

interface GenerationProgressProps {
  currentNode: string;
  isCompleted: boolean;
}

export default function GenerationProgress({ currentNode, isCompleted }: GenerationProgressProps) {
  const currentIndex = NODES.findIndex(n => n.id === currentNode);
  const progressValue = isCompleted ? 100 : ((currentIndex + 1) / NODES.length) * 100;

  const getStatus = (nodeId: string) => {
    const nodeIndex = NODES.findIndex(n => n.id === nodeId);
    if (currentNode === nodeId && isCompleted === false) return 'loading';
    
    // We need to know if this specific node failed. 
    // Since we don't have per-node failure state passed in, we'll assume 
    // if it's the current node and not completed, it's either loading or failed.
    // Let's update the component props to handle error better.
    return nodeIndex < currentIndex || isCompleted ? 'completed' : 
           nodeId === currentNode ? 'loading' : 'pending';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate uppercase tracking-widest flex items-center gap-2">
          <Sparkles size={16} className="text-sage" />
          AI Generation Pipeline
        </h3>
        <span className="text-xs font-bold text-slate/40">{Math.round(progressValue)}%</span>
      </div>
      
      <Progress value={progressValue} className={cn("h-2 bg-alabaster border border-alabaster shadow-inner", isCompleted ? "bg-sage/20" : "")} />

      <div className="grid grid-cols-2 gap-4 mt-6">
        {NODES.map((node) => {
          const status = getStatus(node.id);
          return (
            <div 
              key={node.id} 
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300",
                status === 'loading' ? "bg-sage/5 border-sage/20 shadow-sm" : 
                status === 'completed' ? "bg-white border-alabaster opacity-60" : 
                "bg-alabaster/20 border-transparent opacity-30"
              )}
            >
              {status === 'completed' ? (
                <div className="w-6 h-6 rounded-full bg-sage/10 flex items-center justify-center text-sage">
                  <CheckCircle2 size={14} />
                </div>
              ) : status === 'loading' ? (
                <div className="w-6 h-6 rounded-full bg-terracotta/10 flex items-center justify-center text-terracotta">
                  <Loader size="sm" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate/5 flex items-center justify-center text-slate/20">
                  <Circle size={14} />
                </div>
              )}
              <span className={cn(
                "text-xs font-medium",
                status === 'loading' ? "text-slate" : "text-slate/60"
              )}>
                {node.label}
              </span>
            </div>
          );
        })}
      </div>

      {isCompleted && progressValue === 100 && (
        <div className="mt-8 p-4 bg-sage/5 border border-sage/10 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="w-10 h-10 bg-sage rounded-full flex items-center justify-center text-white shadow-soft">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate">All content generated!</p>
            <p className="text-xs text-slate/50">Blog, social media, and images are ready in your workspace.</p>
          </div>
        </div>
      )}
    </div>
  );
}
