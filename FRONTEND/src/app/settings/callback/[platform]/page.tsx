'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { contentApi } from '@/services/api';
import { Loader } from '@/components/Loader';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function AuthCallbackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting your account...');
  const hasCalled = useRef(false);

  const platform = params.platform as string;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  useEffect(() => {
    if (hasCalled.current) return;

    if (error) {
      hasCalled.current = true;
      setStatus('error');
      setMessage(errorDescription || 'Authorization failed');
      return;
    }

    if (code && platform) {
      hasCalled.current = true;
      const redirectUri = window.location.origin + window.location.pathname;
      handleCallback(platform, code, redirectUri);
    } else if (!code && !error) {
      // Wait for params to load
    } else {
      hasCalled.current = true;
      setStatus('error');
      setMessage('Missing authorization code or platform');
    }
  }, [code, platform, error]);

  const handleCallback = async (platform: string, code: string, redirectUri: string) => {
    try {
      await contentApi.authCallback(platform, code, redirectUri);
      setStatus('success');
      setMessage(`${platform.charAt(0).toUpperCase() + platform.slice(1)} connected successfully!`);
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        window.close();
      }, 2000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.response?.data?.detail || 'Failed to complete connection');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
      {status === 'loading' && (
        <>
          <Loader size="xl" className="mb-4" />
          <h1 className="text-xl font-bold text-slate">{message}</h1>
          <p className="text-sm text-slate/40 mt-2">Please do not close this window.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle2 className="text-sage mb-4" size={64} />
          <h1 className="text-2xl font-bold text-slate">Success!</h1>
          <p className="text-slate/60 mt-2">{message}</p>
          <p className="text-xs text-slate/30 mt-8 italic">This window will close automatically.</p>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle className="text-terracotta mb-4" size={64} />
          <h1 className="text-2xl font-bold text-slate">Connection Failed</h1>
          <p className="text-slate/60 mt-2">{message}</p>
          <button 
            onClick={() => window.close()}
            className="mt-8 px-6 py-2 bg-slate text-white rounded-xl text-sm font-bold"
          >
            Close Window
          </button>
        </>
      )}
    </div>
  );
}
