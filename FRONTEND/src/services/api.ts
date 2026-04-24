import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const contentApi = {
  // ========== BRIEF & GENERATION ==========
  createBrief: async (briefData: any) => {
    const response = await api.post('/brief', briefData);
    return response.data;
  },
  generateContent: async (briefId: string) => {
    const response = await api.post(`/generate/${briefId}`);
    return response.data;
  },
  getContent: async (contentId: string) => {
    const response = await api.get(`/content/${contentId}`);
    return response.data;
  },
  updateStatus: async (contentId: string, status: string) => {
    const response = await api.patch(`/content/${contentId}/status`, { status });
    return response.data;
  },
  approveContent: async (contentId: string) => {
    const response = await api.post(`/content/${contentId}/approve`);
    return response.data;
  },
  reviseContent: async (contentId: string, notes: string) => {
    const response = await api.post(`/content/${contentId}/revise`, { notes });
    return response.data;
  },
  addComment: async (commentData: any) => {
    const response = await api.post('/comment', commentData);
    return response.data;
  },

  // ========== CALENDAR ==========
  getCalendar: async (year?: number, month?: number) => {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;
    const response = await api.get('/calendar', { params });
    return response.data;
  },
  getCalendarMonth: async (year: number, month: number) => {
    const response = await api.get(`/calendar/${year}/${month}`);
    return response.data;
  },

  // ========== DRAFTS ==========
  saveDraft: async (draftData: {
    brief_id?: string;
    content_id?: string;
    platform: string;
    title?: string;
    body: string;
    image_url?: string;
    hashtags?: string[];
  }) => {
    const response = await api.post('/draft/save', draftData);
    return response.data;
  },
  getDrafts: async (filters?: { platform?: string; status?: string; brief_id?: string }) => {
    const response = await api.get('/drafts', { params: filters });
    return response.data;
  },
  getDraft: async (draftId: string) => {
    const response = await api.get(`/draft/${draftId}`);
    return response.data;
  },
  updateDraft: async (draftId: string, data: { title?: string; body?: string; image_url?: string; hashtags?: string[]; status?: string }) => {
    const response = await api.patch(`/draft/${draftId}`, data);
    return response.data;
  },
  deleteDraft: async (draftId: string) => {
    const response = await api.delete(`/draft/${draftId}`);
    return response.data;
  },
  regenerateDraft: async (draftId: string, platform: string, instructions?: string) => {
    const response = await api.post('/draft/regenerate', {
      draft_id: draftId,
      platform,
      instructions
    });
    return response.data;
  },

  // ========== SCHEDULING ==========
  schedulePost: async (data: { draft_id: string; platform: string; scheduled_at: string }) => {
    const response = await api.post('/schedule', data);
    return response.data;
  },
  updateScheduledPost: async (postId: string, data: any) => {
    const response = await api.patch(`/schedule/${postId}`, data);
    return response.data;
  },
  cancelScheduledPost: async (postId: string) => {
    const response = await api.delete(`/schedule/${postId}`);
    return response.data;
  },

  // ========== PUBLISHING ==========
  publishToLinkedIn: async (draftId: string) => {
    const response = await api.post('/publish/linkedin', { draft_id: draftId, platform: 'linkedin' });
    return response.data;
  },
  publishToTwitter: async (draftId: string) => {
    const response = await api.post('/publish/twitter', { draft_id: draftId, platform: 'twitter' });
    return response.data;
  },

  // ========== SOCIAL ACCOUNTS ==========
  getSocialAccounts: async () => {
    const response = await api.get('/social-accounts');
    return response.data;
  },
  getAuthUrl: async (platform: string) => {
    const response = await api.get(`/auth/${platform}/url`);
    return response.data;
  },
  authCallback: async (platform: string, code: string, redirectUri?: string) => {
    const response = await api.post(`/auth/${platform}/callback`, { code, redirect_uri: redirectUri });
    return response.data;
  },
  disconnectAccount: async (platform: string) => {
    const response = await api.delete(`/social-accounts/${platform}`);
    return response.data;
  },

  // ========== BRAND VOICE ==========
  getBrandVoice: async () => {
    const response = await api.get('/brand-voice');
    return response.data;
  },
  updateBrandVoice: async (voiceData: any) => {
    const response = await api.post('/brand-voice', voiceData);
    return response.data;
  },
};
