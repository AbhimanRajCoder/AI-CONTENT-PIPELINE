import os
from BACKEND import FastAPI, BackgroundTasks, HTTPException, Depends, Query
from BACKEND.middleware.cors import CORSMiddleware
from .schemas import (
    ContentBriefCreate, ContentBrief, ContentUpdate, CommentCreate, ContentStatus,
    DraftCreate, DraftUpdate, ScheduleCreate, PublishRequest, RegenerateRequest,
    PlatformType
)
from .services.supabase_service import supabase_service
from .services.social_service import social_service
from .langgraph_workflow import langgraph_app, WorkflowState
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime

from BACKEND.responses import StreamingResponse
import json
import asyncio

app = FastAPI(title="AI Content Pipeline API", version="2.0.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== GENERATION ENDPOINTS ==========

async def generation_stream(brief_id: str):
    brief_data = await supabase_service.get_brief(brief_id)
    if not brief_data:
        yield f"data: {json.dumps({'error': 'Brief not found'})}\n\n"
        return

    initial_state: WorkflowState = {
        "brief": ContentBrief(**brief_data),
        "brand_voice": None,
        "blog_content": None,
        "social_content": None,
        "email_content": None,
        "images": None,
        "image_urls": None,
        "status": "pending",
        "error": None,
        "brief_id": brief_id,
        "revision_notes": None
    }

    final_status = "completed"
    async for output in langgraph_app.astream(initial_state):
        for node, state in output.items():
            status = state.get('status', 'running')
            error = state.get('error')
            if status == "failed":
                final_status = "failed"
            
            payload = {'node': node, 'status': status}
            if error:
                payload['error'] = error
            
            yield f"data: {json.dumps(payload)}\n\n"
    
    yield f"data: {json.dumps({'status': final_status})}\n\n"

@app.get("/generate/{brief_id}/stream")
async def stream_pipeline(brief_id: str):
    return StreamingResponse(generation_stream(brief_id), media_type="text/event-stream")

@app.post("/brief", response_model=ContentBrief)
async def create_brief(brief: ContentBriefCreate):
    try:
        data = await supabase_service.create_brief(brief.dict(by_alias=True))
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate/{brief_id}")
async def run_pipeline(brief_id: str, background_tasks: BackgroundTasks):
    brief_data = await supabase_service.get_brief(brief_id)
    if not brief_data:
        raise HTTPException(status_code=404, detail="Brief not found")
    
    initial_state: WorkflowState = {
        "brief": ContentBrief(**brief_data),
        "brand_voice": None,
        "blog_content": None,
        "social_content": None,
        "email_content": None,
        "images": None,
        "image_urls": None,
        "status": "pending",
        "error": None,
        "brief_id": brief_id,
        "revision_notes": None
    }
    
    background_tasks.add_task(langgraph_app.ainvoke, initial_state)
    return {"message": "Generation started", "brief_id": brief_id}

# ========== CONTENT ENDPOINTS ==========

@app.get("/content/{content_id}")
async def get_content(content_id: str):
    content_res = supabase_service.client.table("contents").select("brief_id").eq("id", content_id).execute()
    if not content_res.data:
        raise HTTPException(status_code=404, detail="Content not found")
    
    brief_id = content_res.data[0]["brief_id"]
    
    all_formats = supabase_service.client.table("contents").select("*").eq("brief_id", brief_id).execute()
    brief_data = supabase_service.client.table("content_briefs").select("*").eq("id", brief_id).execute()
    assets = supabase_service.client.table("assets").select("*").in_("content_id", [c["id"] for c in all_formats.data]).execute()
    comments = supabase_service.client.table("comments").select("*").in_("content_id", [c["id"] for c in all_formats.data]).execute()
    
    return {
        "current_content_id": content_id,
        "brief_id": brief_id,
        "content_briefs": brief_data.data[0] if brief_data.data else {},
        "formats": all_formats.data,
        "assets": assets.data,
        "comments": comments.data,
        "status": next((c["status"] for c in all_formats.data if c["id"] == content_id), "Draft")
    }

@app.patch("/content/{content_id}/status")
async def update_status(content_id: str, status_update: Dict[str, ContentStatus]):
    try:
        data = await supabase_service.update_content_status(content_id, status_update["status"])
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/content/{content_id}/approve")
async def approve_content(content_id: str):
    """Human-in-the-loop: Approve content for publication."""
    try:
        data = await supabase_service.update_content_status(content_id, "Approved")
        return {"message": "Content approved", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/content/{content_id}/revise")
async def revise_content(content_id: str, revision_data: Dict[str, str], background_tasks: BackgroundTasks):
    """Human-in-the-loop: Request a revision and trigger regeneration."""
    notes = revision_data.get("notes", "No notes provided")
    try:
        current = supabase_service.client.table("contents").select("*").eq("id", content_id).execute()
        if not current.data:
            raise HTTPException(status_code=404, detail="Content not found")
        
        brief_id = current.data[0]["brief_id"]
        current_version = current.data[0].get("version", 1)
        
        await supabase_service.add_comment({
            "content_id": content_id,
            "user_id": str(uuid.uuid4()),
            "comment": f"REVISION REQUESTED (v{current_version}): {notes}"
        })
        
        supabase_service.client.table("contents").update({
            "status": "Draft",
            "version": current_version + 1
        }).eq("id", content_id).execute()
        
        brief_data = await supabase_service.get_brief(brief_id)
        initial_state: WorkflowState = {
            "brief": ContentBrief(**brief_data),
            "brand_voice": None,
            "blog_content": None,
            "social_content": None,
            "email_content": None,
            "images": None,
            "image_urls": None,
            "status": "pending",
            "error": None,
            "brief_id": brief_id,
            "revision_notes": notes
        }
        
        background_tasks.add_task(langgraph_app.ainvoke, initial_state)
        return {"message": "Revision requested and regeneration started", "version": current_version + 1}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/comment")
async def add_comment(comment: CommentCreate):
    try:
        data = await supabase_service.add_comment(comment.dict())
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========== DRAFT ENDPOINTS ==========

@app.post("/draft/save")
async def save_draft(draft: DraftCreate):
    """Save a new draft for a specific platform."""
    try:
        draft_data = {
            "platform": draft.platform.value,
            "body": draft.body,
            "status": "draft"
        }
        if draft.brief_id:
            draft_data["brief_id"] = draft.brief_id
        if draft.content_id:
            draft_data["content_id"] = draft.content_id
        if draft.title:
            draft_data["title"] = draft.title
        if draft.image_url:
            draft_data["image_url"] = draft.image_url
        if draft.hashtags:
            draft_data["hashtags"] = draft.hashtags
            
        data = await supabase_service.create_draft(draft_data)
        return {"message": "Draft saved", "draft": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/drafts")
async def get_drafts(
    platform: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    brief_id: Optional[str] = Query(None)
):
    """Get all drafts with optional filtering."""
    try:
        if brief_id:
            data = await supabase_service.get_drafts_by_brief(brief_id)
        else:
            data = await supabase_service.get_drafts(platform=platform, status=status)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/draft/{draft_id}")
async def get_draft(draft_id: str):
    """Get a single draft by ID."""
    try:
        data = await supabase_service.get_draft(draft_id)
        if not data:
            raise HTTPException(status_code=404, detail="Draft not found")
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/draft/{draft_id}")
async def update_draft(draft_id: str, update: DraftUpdate):
    """Update an existing draft."""
    try:
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        if "status" in update_data:
            update_data["status"] = update_data["status"].value if hasattr(update_data["status"], 'value') else update_data["status"]
        
        # Increment version on edit
        existing = await supabase_service.get_draft(draft_id)
        if existing:
            update_data["version"] = existing.get("version", 1) + 1
            
        data = await supabase_service.update_draft(draft_id, update_data)
        return {"message": "Draft updated", "draft": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/draft/{draft_id}")
async def delete_draft(draft_id: str):
    """Delete a draft."""
    try:
        await supabase_service.delete_draft(draft_id)
        return {"message": "Draft deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/draft/regenerate")
async def regenerate_draft(req: RegenerateRequest):
    """Regenerate a specific platform draft using AI."""
    try:
        from .services.ai_service import ai_service
        
        draft = await supabase_service.get_draft(req.draft_id)
        if not draft:
            raise HTTPException(status_code=404, detail="Draft not found")
        
        # Get brief context if available
        context = ""
        if draft.get("brief_id"):
            brief = await supabase_service.get_brief(draft["brief_id"])
            if brief:
                context = f"Topic: {brief['topic']}\nAudience: {brief['audience']}\nTone: {brief['tone']}\n"
        
        platform = req.platform.value
        instructions = req.instructions or "Regenerate with fresh, engaging content"
        
        platform_prompts = {
            "linkedin": "Write a professional LinkedIn post (150-300 words). Be thought-leading, insightful, and include a call to action.",
            "twitter": "Write a punchy tweet (under 280 characters). Include 2-3 relevant hashtags. Be concise and engaging.",
            "instagram": "Write an engaging Instagram caption. Use emojis, be visually evocative, and include relevant hashtags.",
            "email": "Write a compelling email newsletter snippet with a clear call-to-action.",
            "blog": "Write a well-structured blog post with markdown formatting."
        }
        
        prompt = (
            f"{context}\n"
            f"Previous version:\n{draft['body'][:500]}\n\n"
            f"Instructions: {instructions}\n\n"
            f"{platform_prompts.get(platform, 'Write engaging content.')}"
        )
        
        new_content = await ai_service.generate_text(prompt, f"You are a {platform} content expert.")
        
        # Update the draft with new content
        updated = await supabase_service.update_draft(req.draft_id, {
            "body": new_content,
            "version": draft.get("version", 1) + 1
        })
        
        return {"message": "Draft regenerated", "draft": updated}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========== SCHEDULE ENDPOINTS ==========

@app.post("/schedule")
async def schedule_post(schedule: ScheduleCreate):
    """Schedule a draft for future publishing."""
    try:
        draft = await supabase_service.get_draft(schedule.draft_id)
        if not draft:
            raise HTTPException(status_code=404, detail="Draft not found")
        
        schedule_data = {
            "draft_id": schedule.draft_id,
            "platform": schedule.platform.value,
            "scheduled_at": schedule.scheduled_at,
            "status": "scheduled"
        }
        
        data = await supabase_service.create_scheduled_post(schedule_data)
        
        # Update draft status
        await supabase_service.update_draft(schedule.draft_id, {"status": "scheduled"})
        
        return {"message": "Post scheduled", "scheduled_post": data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/calendar")
async def get_calendar(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None)
):
    """Get calendar events. If no year/month provided, returns all content + scheduled posts."""
    try:
        result = {
            "content": [],
            "scheduled": [],
            "drafts": []
        }
        
        # Get all content (original behavior)
        result["content"] = await supabase_service.get_all_content()
        
        # Get scheduled posts
        if year and month:
            result["scheduled"] = await supabase_service.get_calendar_events(year, month)
        else:
            result["scheduled"] = await supabase_service.get_scheduled_posts()
        
        # Get draft counts by platform
        all_drafts = await supabase_service.get_drafts()
        result["drafts"] = all_drafts
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/calendar/{year}/{month}")
async def get_calendar_month(year: int, month: int):
    """Get calendar events for a specific month."""
    try:
        scheduled = await supabase_service.get_calendar_events(year, month)
        return {"year": year, "month": month, "events": scheduled}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/schedule/{post_id}")
async def update_scheduled_post(post_id: str, update_data: Dict[str, Any]):
    """Update a scheduled post (reschedule, cancel, etc.)."""
    try:
        data = await supabase_service.update_scheduled_post(post_id, update_data)
        return {"message": "Scheduled post updated", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/schedule/{post_id}")
async def cancel_scheduled_post(post_id: str):
    """Cancel a scheduled post."""
    try:
        post = await supabase_service.get_scheduled_post(post_id)
        if post:
            # Reset draft status
            await supabase_service.update_draft(post["draft_id"], {"status": "draft"})
        await supabase_service.delete_scheduled_post(post_id)
        return {"message": "Scheduled post cancelled"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========== PUBLISH ENDPOINTS ==========

@app.post("/publish/linkedin")
async def publish_linkedin(req: PublishRequest):
    """Publish a draft directly to LinkedIn."""
    try:
        draft = await supabase_service.get_draft(req.draft_id)
        if not draft:
            raise HTTPException(status_code=404, detail="Draft not found")
        
        account = await supabase_service.get_social_account("linkedin")
        if not account:
            raise HTTPException(status_code=400, detail="No LinkedIn account connected. Please connect your account in Settings.")
        
        result = await social_service.publish(
            platform="linkedin",
            access_token=account["access_token"],
            text=draft["body"],
            image_url=draft.get("image_url")
        )
        
        if result["success"]:
            await supabase_service.update_draft(req.draft_id, {"status": "published"})
            return {"message": "Published to LinkedIn!", "post_url": result.get("post_url"), "result": result}
        else:
            # Handle revoked or expired tokens
            error_code = result.get("error", "")
            if error_code == "REVOKED_ACCESS_TOKEN" or "401" in str(result.get("detail", "")):
                await supabase_service.disconnect_social_account("linkedin")
                return {
                    "message": "LinkedIn account disconnected", 
                    "error": "Your LinkedIn access token has been revoked or expired. Please reconnect your account in Settings.",
                    "result": result
                }
            return {"message": "Publishing failed", "error": error_code, "result": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/publish/twitter")
async def publish_twitter(req: PublishRequest):
    """Publish a draft directly to Twitter/X."""
    try:
        draft = await supabase_service.get_draft(req.draft_id)
        if not draft:
            raise HTTPException(status_code=404, detail="Draft not found")
        
        account = await supabase_service.get_social_account("twitter")
        if not account:
            raise HTTPException(status_code=400, detail="No Twitter account connected. Please connect your account in Settings.")
        
        result = await social_service.publish(
            platform="twitter",
            access_token=account["access_token"],
            text=draft["body"],
            image_url=draft.get("image_url")
        )
        
        if result["success"]:
            await supabase_service.update_draft(req.draft_id, {"status": "published"})
            return {"message": "Published to Twitter!", "post_url": result.get("post_url"), "result": result}
        else:
            # Handle revoked or expired tokens
            error_code = result.get("error", "")
            if error_code == "UNAUTHORIZED" or "401" in str(result.get("detail", "")):
                await supabase_service.disconnect_social_account("twitter")
                return {
                    "message": "Twitter account disconnected", 
                    "error": "Your Twitter access token has been revoked or expired. Please reconnect your account in Settings.",
                    "result": result
                }
            return {"message": "Publishing failed", "error": error_code, "result": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========== SOCIAL ACCOUNT ENDPOINTS ==========

@app.get("/social-accounts")
async def get_social_accounts():
    """Get all connected social accounts."""
    try:
        accounts = await supabase_service.get_social_accounts()
        # Strip sensitive tokens from response
        safe_accounts = []
        for acc in accounts:
            safe_accounts.append({
                "id": acc["id"],
                "platform": acc["platform"],
                "account_name": acc.get("account_name", ""),
                "profile_image_url": acc.get("profile_image_url"),
                "is_active": acc["is_active"],
                "created_at": acc["created_at"]
            })
        return safe_accounts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/auth/{platform}/url")
async def get_auth_url(platform: str):
    """Get OAuth authorization URL for a platform."""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    redirect_uri = f"{frontend_url}/settings/callback/{platform}"
    
    if platform == "linkedin":
        url = social_service.get_linkedin_auth_url(redirect_uri)
    elif platform == "twitter":
        url = social_service.get_twitter_auth_url(redirect_uri)
    else:
        raise HTTPException(status_code=400, detail=f"Platform '{platform}' not supported")
    
    return {"auth_url": url, "platform": platform}

@app.post("/auth/{platform}/callback")
async def auth_callback(platform: str, callback_data: Dict[str, str]):
    """Handle OAuth callback and save tokens."""
    code = callback_data.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code required")
    
    # Use the redirect_uri from the frontend if provided, otherwise use default
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    redirect_uri = callback_data.get("redirect_uri") or f"{frontend_url}/settings/callback/{platform}"
    
    try:
        if platform == "linkedin":
            tokens = await social_service.exchange_linkedin_code(code, redirect_uri)
        elif platform == "twitter":
            tokens = await social_service.exchange_twitter_code(code, redirect_uri)
        else:
            raise HTTPException(status_code=400, detail=f"Platform '{platform}' not supported")
        
        if "error" in tokens:
            raise HTTPException(status_code=400, detail=tokens["error"])
        
        # Save the account
        account_data = {
            "platform": platform,
            "account_name": callback_data.get("account_name", f"{platform} Account"),
            "access_token": tokens.get("access_token"),
            "refresh_token": tokens.get("refresh_token"),
            "is_active": True
        }
        
        saved = await supabase_service.save_social_account(account_data)
        return {"message": f"{platform.title()} connected successfully", "account_id": saved["id"]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/social-accounts/{platform}")
async def disconnect_social_account(platform: str):
    """Disconnect a social media account."""
    try:
        await supabase_service.disconnect_social_account(platform)
        return {"message": f"{platform.title()} account disconnected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========== BRAND VOICE ENDPOINTS ==========

@app.get("/brand-voice")
async def get_brand_voice():
    try:
        data = await supabase_service.get_brand_voice()
        return data or {
            "tone_guidelines": "Professional, engaging, and informative.",
            "vocabulary_rules": "Use clear and concise language. Avoid jargon.",
            "writing_style": "Direct and reader-focused."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/brand-voice")
async def update_brand_voice(voice_data: Dict[str, str]):
    try:
        existing = await supabase_service.get_brand_voice()
        if existing:
            response = supabase_service.client.table("brand_voice").update(voice_data).eq("id", existing["id"]).execute()
        else:
            response = supabase_service.client.table("brand_voice").insert(voice_data).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========== TEST / UTILITY ENDPOINTS ==========

@app.get("/")
async def root():
    return {"status": "ok", "message": "AI Content Pipeline API v2.0 is running", "version": "2.0.0"}

@app.post("/test-image")
async def test_image(payload: Dict[str, Any]):
    """Test image generation directly."""
    from .services.ai_service import ai_service
    prompt = payload.get("prompt")
    size = payload.get("size", "1024x1024")
    
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    
    try:
        image_path = await ai_service.generate_image(prompt, size=size)
        return {"image_path": image_path, "message": "Image generated successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/test-generate")
async def test_generate(payload: Dict[str, Any]):
    """Test text generation directly."""
    from .services.ai_service import ai_service
    prompt = payload.get("prompt")
    system_prompt = payload.get("system_prompt", "You are a professional content creator.")
    
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    
    try:
        content = await ai_service.generate_text(prompt, system_prompt)
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
