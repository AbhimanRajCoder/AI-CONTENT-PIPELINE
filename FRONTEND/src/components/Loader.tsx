'use client';

import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export function Loader({ className, size = 'md', text, fullScreen = false }: LoaderProps) {
  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center gap-4",
      className
    )}>
      <div className="relative">
        <Loader2 
          className={cn(
            "animate-spin text-secondary",
            sizeMap[size]
          )} 
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className={cn(
            "text-accent opacity-50",
            size === 'xl' ? 'w-6 h-6' : 'w-3 h-3'
          )} />
        </div>
      </div>
      {text && (
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
      <Loader size="lg" text="Preparing your creative space..." />
    </div>
  );
}
