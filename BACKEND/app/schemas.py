from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from enum import Enum
from datetime import datetime
import uuid

class ContentStatus(str, Enum):
    DRAFT = "Draft"
    REVIEW = "Review"
    APPROVED = "Approved"
    PUBLISHED = "Published"
    SCHEDULED = "Scheduled"

class ContentType(str, Enum):
    BLOG = "blog"
    SOCIAL = "social"
    EMAIL = "email"

class PlatformType(str, Enum):
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    INSTAGRAM = "instagram"
    EMAIL = "email"
    BLOG = "blog"

class DraftStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    FAILED = "failed"

class ScheduleStatus(str, Enum):
    SCHEDULED = "scheduled"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ContentBriefCreate(BaseModel):
    topic: str
    target_audience: str = Field(alias="audience")
    tone: str
    goals: str
    content_length: int

    class Config:
        populate_by_name = True

class ContentBrief(ContentBriefCreate):
    id: uuid.UUID
    created_at: datetime

class ContentUpdate(BaseModel):
    content: Optional[Dict] = None
    status: Optional[ContentStatus] = None
    version: Optional[int] = None

class CommentCreate(BaseModel):
    content_id: uuid.UUID
    user_id: uuid.UUID
    comment: str

class BrandVoice(BaseModel):
    tone_guidelines: str
    vocabulary_rules: str
    writing_style: str

class GenerationState(BaseModel):
    brief: ContentBrief
    brand_voice: Optional[BrandVoice] = None
    blog_content: Optional[str] = None
    social_content: Optional[List[str]] = None
    email_content: Optional[str] = None
    images: Optional[List[str]] = None
    status: str = "pending"
    error: Optional[str] = None

# ============================================
# NEW SCHEMAS: Drafts, Scheduling, Publishing
# ============================================

class DraftCreate(BaseModel):
    brief_id: Optional[str] = None
    content_id: Optional[str] = None
    platform: PlatformType
    title: Optional[str] = None
    body: str
    image_url: Optional[str] = None
    hashtags: Optional[List[str]] = []

class DraftUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    image_url: Optional[str] = None
    hashtags: Optional[List[str]] = None
    status: Optional[DraftStatus] = None

class DraftResponse(BaseModel):
    id: str
    brief_id: Optional[str]
    content_id: Optional[str]
    platform: str
    title: Optional[str]
    body: str
    image_url: Optional[str]
    hashtags: Optional[List[str]]
    version: int
    status: str
    created_at: str
    updated_at: str

class ScheduleCreate(BaseModel):
    draft_id: str
    platform: PlatformType
    scheduled_at: str  # ISO 8601 datetime string

class ScheduleResponse(BaseModel):
    id: str
    draft_id: str
    platform: str
    scheduled_at: str
    published_at: Optional[str]
    status: str
    post_url: Optional[str]
    error_message: Optional[str]

class PublishRequest(BaseModel):
    draft_id: str
    platform: PlatformType

class RegenerateRequest(BaseModel):
    draft_id: str
    platform: PlatformType
    instructions: Optional[str] = None

class SocialAccountCreate(BaseModel):
    platform: PlatformType
    account_name: str
    access_token: str
    refresh_token: Optional[str] = None

class CalendarEvent(BaseModel):
    id: str
    title: str
    platform: str
    scheduled_at: str
    status: str
    body_preview: Optional[str] = None
    draft_id: Optional[str] = None
