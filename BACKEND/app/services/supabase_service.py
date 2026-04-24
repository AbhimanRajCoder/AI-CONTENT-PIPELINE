import os
from supabase import create_client, Client
from pathlib import Path
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional
import uuid

# Load environment variables from the .env file in the fastapi directory
env_path = Path(__file__).parents[2] / '.env'
load_dotenv(dotenv_path=env_path)

class SupabaseService:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "").replace("/rest/v1/", "").replace("/rest/v1", "")
        self.key = os.getenv("SUPABASE_KEY")
        if not self.url or not self.key:
            print("WARNING: SUPABASE_URL or SUPABASE_KEY not set")
        self.client: Client = create_client(self.url, self.key)

    # ========== EXISTING METHODS ==========

    async def create_brief(self, brief_data: Dict[str, Any]):
        response = self.client.table("content_briefs").insert(brief_data).execute()
        return response.data[0]

    async def get_brief(self, brief_id: str):
        response = self.client.table("content_briefs").select("*").eq("id", brief_id).execute()
        return response.data[0] if response.data else None

    async def get_brand_voice(self):
        response = self.client.table("brand_voice").select("*").limit(1).execute()
        return response.data[0] if response.data else None

    async def save_content(self, brief_id: str, content_type: str, content_data: Dict[str, Any]):
        response = self.client.table("contents").insert({
            "brief_id": brief_id,
            "type": content_type,
            "content": content_data,
            "status": "Draft",
            "version": 1
        }).execute()
        return response.data[0]

    async def save_asset(self, content_id: str, image_url: str):
        response = self.client.table("assets").insert({
            "content_id": content_id,
            "image_url": image_url
        }).execute()
        return response.data[0]

    async def update_content_status(self, content_id: str, status: str):
        response = self.client.table("contents").update({"status": status}).eq("id", content_id).execute()
        return response.data[0]

    async def add_comment(self, comment_data: Dict[str, Any]):
        response = self.client.table("comments").insert(comment_data).execute()
        return response.data[0]

    async def get_all_content(self):
        try:
            response = self.client.table("contents").select("*, content_briefs(*)").execute()
            return response.data
        except Exception as e:
            print(f"DEBUG: get_all_content failed with join: {e}")
            response = self.client.table("contents").select("*").execute()
            return response.data

    async def upload_image(self, file_path: str, bucket_name: str = "assets"):
        with open(file_path, "rb") as f:
            file_name = f"{uuid.uuid4()}.png"
            response = self.client.storage.from_(bucket_name).upload(file_name, f.read())
            url = self.client.storage.from_(bucket_name).get_public_url(file_name)
            return url

    # ========== DRAFT METHODS ==========

    async def create_draft(self, draft_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new draft for a specific platform."""
        response = self.client.table("drafts").insert(draft_data).execute()
        return response.data[0]

    async def get_draft(self, draft_id: str) -> Optional[Dict[str, Any]]:
        """Get a single draft by ID."""
        response = self.client.table("drafts").select("*").eq("id", draft_id).execute()
        return response.data[0] if response.data else None

    async def get_drafts(self, platform: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all drafts with optional filtering."""
        query = self.client.table("drafts").select("*")
        if platform:
            query = query.eq("platform", platform)
        if status:
            query = query.eq("status", status)
        response = query.order("created_at", desc=True).execute()
        return response.data

    async def get_drafts_by_brief(self, brief_id: str) -> List[Dict[str, Any]]:
        """Get all drafts for a specific brief."""
        response = self.client.table("drafts").select("*").eq("brief_id", brief_id).order("created_at", desc=True).execute()
        return response.data

    async def update_draft(self, draft_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing draft."""
        update_data["updated_at"] = "now()"
        response = self.client.table("drafts").update(update_data).eq("id", draft_id).execute()
        return response.data[0]

    async def delete_draft(self, draft_id: str):
        """Delete a draft."""
        response = self.client.table("drafts").delete().eq("id", draft_id).execute()
        return response.data

    # ========== SCHEDULE METHODS ==========

    async def create_scheduled_post(self, schedule_data: Dict[str, Any]) -> Dict[str, Any]:
        """Schedule a post for future publishing."""
        response = self.client.table("scheduled_posts").insert(schedule_data).execute()
        return response.data[0]

    async def get_scheduled_posts(self, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get scheduled posts, optionally filtered by date range."""
        query = self.client.table("scheduled_posts").select("*, drafts(*)")
        if start_date:
            query = query.gte("scheduled_at", start_date)
        if end_date:
            query = query.lte("scheduled_at", end_date)
        response = query.order("scheduled_at", desc=False).execute()
        return response.data

    async def get_scheduled_post(self, post_id: str) -> Optional[Dict[str, Any]]:
        """Get a single scheduled post."""
        response = self.client.table("scheduled_posts").select("*, drafts(*)").eq("id", post_id).execute()
        return response.data[0] if response.data else None

    async def update_scheduled_post(self, post_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a scheduled post."""
        response = self.client.table("scheduled_posts").update(update_data).eq("id", post_id).execute()
        return response.data[0]

    async def delete_scheduled_post(self, post_id: str):
        """Cancel and delete a scheduled post."""
        response = self.client.table("scheduled_posts").delete().eq("id", post_id).execute()
        return response.data

    async def get_calendar_events(self, year: int, month: int) -> List[Dict[str, Any]]:
        """Get all calendar events for a given month."""
        start = f"{year}-{month:02d}-01T00:00:00Z"
        if month == 12:
            end = f"{year + 1}-01-01T00:00:00Z"
        else:
            end = f"{year}-{month + 1:02d}-01T00:00:00Z"
        
        response = self.client.table("scheduled_posts").select("*, drafts(*)").gte("scheduled_at", start).lt("scheduled_at", end).order("scheduled_at", desc=False).execute()
        return response.data

    # ========== SOCIAL ACCOUNT METHODS ==========

    async def get_social_accounts(self) -> List[Dict[str, Any]]:
        """Get all connected social accounts."""
        response = self.client.table("social_accounts").select("*").eq("is_active", True).execute()
        return response.data

    async def get_social_account(self, platform: str) -> Optional[Dict[str, Any]]:
        """Get a social account by platform."""
        response = self.client.table("social_accounts").select("*").eq("platform", platform).eq("is_active", True).limit(1).execute()
        return response.data[0] if response.data else None

    async def save_social_account(self, account_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save or update a social account."""
        # Upsert: check if account exists for this platform
        existing = await self.get_social_account(account_data["platform"])
        if existing:
            response = self.client.table("social_accounts").update(account_data).eq("id", existing["id"]).execute()
        else:
            response = self.client.table("social_accounts").insert(account_data).execute()
        return response.data[0]

    async def disconnect_social_account(self, platform: str):
        """Deactivate a social account."""
        response = self.client.table("social_accounts").update({"is_active": False}).eq("platform", platform).execute()
        return response.data

    # ========== UTILITY: Auto-create drafts from pipeline ==========

    async def auto_create_drafts(self, brief_id: str, social_captions: List[str], blog_content: str = None, email_content: str = None, images: List[str] = None):
        """Automatically create drafts from pipeline output."""
        drafts = []
        platform_map = {0: "linkedin", 1: "instagram", 2: "twitter"}
        
        # Social drafts
        for i, caption in enumerate(social_captions):
            platform = platform_map.get(i, "linkedin")
            draft_data = {
                "brief_id": brief_id,
                "platform": platform,
                "body": caption,
                "image_url": images[i] if images and i < len(images) else None,
                "status": "draft"
            }
            draft = await self.create_draft(draft_data)
            drafts.append(draft)
        
        # Blog draft
        if blog_content:
            draft_data = {
                "brief_id": brief_id,
                "platform": "blog",
                "body": blog_content,
                "status": "draft"
            }
            draft = await self.create_draft(draft_data)
            drafts.append(draft)
        
        # Email draft
        if email_content:
            draft_data = {
                "brief_id": brief_id,
                "platform": "email",
                "body": email_content,
                "status": "draft"
            }
            draft = await self.create_draft(draft_data)
            drafts.append(draft)
        
        return drafts


supabase_service = SupabaseService()
