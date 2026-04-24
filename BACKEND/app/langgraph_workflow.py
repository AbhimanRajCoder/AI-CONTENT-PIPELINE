import os
import re
from typing import TypedDict, List, Optional, Dict, Any
from langgraph.graph import StateGraph, END
from .services.ai_service import ai_service
from .services.supabase_service import supabase_service
from .schemas import ContentBrief, BrandVoice, ContentStatus, ContentType
import uuid
import asyncio

class WorkflowState(TypedDict):
    brief: ContentBrief
    brand_voice: Optional[BrandVoice]
    blog_content: Optional[str]
    social_content: Optional[List[str]]
    email_content: Optional[str]
    images: Optional[List[str]]
    image_urls: Optional[List[str]]
    status: str
    error: Optional[str]
    brief_id: str
    revision_notes: Optional[str]

async def validate_input(state: WorkflowState) -> WorkflowState:
    print("--- VALIDATING INPUT ---")
    if not state["brief"].topic or not state["brief"].target_audience:
        return {**state, "status": "failed", "error": "Invalid brief content"}
    
    brand_voice_data = await supabase_service.get_brand_voice()
    if not brand_voice_data:
        # Default brand voice if not set
        brand_voice = BrandVoice(
            tone_guidelines="Professional, engaging, and informative.",
            vocabulary_rules="Use clear and concise language. Avoid jargon unless necessary.",
            writing_style="Direct and reader-focused."
        )
    else:
        brand_voice = BrandVoice(**brand_voice_data)
        
    return {**state, "brand_voice": brand_voice, "status": "validated"}

async def generate_blog(state: WorkflowState) -> WorkflowState:
    print("--- GENERATING BLOG ---")
    if state["status"] == "failed":
        return state
    
    revision_context = f"\n\nIMPORTANT REVISION INSTRUCTIONS: {state['revision_notes']}" if state.get("revision_notes") else ""
    
    prompt = (
        f"Topic: {state['brief'].topic}\n"
        f"Audience: {state['brief'].target_audience}\n"
        f"Tone: {state['brief'].tone}\n"
        f"Goals: {state['brief'].goals}\n"
        f"Length: {state['brief'].content_length} words"
        f"{revision_context}"
    )
    system_prompt = (
        f"Guidelines: {state['brand_voice'].tone_guidelines}\n"
        f"Vocabulary: {state['brand_voice'].vocabulary_rules}\n"
        f"Style: {state['brand_voice'].writing_style}\n\n"
        f"Task: Write a structured blog post based on the following brief. Use Markdown formatting. "
        f"Focus on providing value to the audience."
    )
    
    try:
        content = await ai_service.generate_text(prompt, system_prompt)
        if not content or len(content) < 50:
            print(f"WARNING: AI returned very short content for blog: {content}")
            if not content:
                content = await ai_service.generate_text(f"Write a blog post about {state['brief'].topic}")
                
        return {**state, "blog_content": content, "status": "blog_generated"}
    except Exception as e:
        print(f"ERROR: Blog generation failed: {e}")
        return {**state, "status": "failed", "error": str(e)}

async def generate_social(state: WorkflowState) -> WorkflowState:
    print("--- GENERATING SOCIAL ---")
    if state["status"] == "failed":
        return state
    
    # Use a clearer, more structured prompt for reliable parsing
    blog_excerpt = state['blog_content'][:1500] if state.get('blog_content') else state['brief'].topic
    
    prompt = (
        f"Based on this content, create exactly 3 social media posts.\n\n"
        f"CONTENT:\n{blog_excerpt}\n\n"
        f"FORMAT YOUR RESPONSE EXACTLY LIKE THIS:\n\n"
        f"---LINKEDIN---\n"
        f"[Write a professional LinkedIn post here. 150-300 words. Include relevant insights and a call to action.]\n\n"
        f"---INSTAGRAM---\n"
        f"[Write an engaging Instagram caption here. Use emojis, be visual and engaging. Include relevant hashtags.]\n\n"
        f"---TWITTER---\n"
        f"[Write a punchy tweet here. Under 280 characters. Include 2-3 hashtags.]\n\n"
        f"IMPORTANT: Use the exact delimiters ---LINKEDIN---, ---INSTAGRAM---, ---TWITTER--- to separate each post."
    )
    system_prompt = f"Brand Voice: {state['brand_voice'].tone_guidelines}\nTask: Generate platform-optimized social media posts. Follow the format exactly."
    
    try:
        content = await ai_service.generate_text(prompt, system_prompt)
        captions = _parse_social_content(content)
        
        if len(captions) < 3:
            print(f"WARNING: Only parsed {len(captions)} captions, retrying with simpler prompt...")
            # Fallback: generate each platform separately
            captions = await _generate_individual_posts(state)
            
        if not captions:
            captions = [content]  # Last resort fallback
            
        print(f"DEBUG: Generated {len(captions)} social captions")
        return {**state, "social_content": captions, "status": "social_generated"}
    except Exception as e:
        print(f"ERROR: Social generation failed: {e}")
        return {**state, "status": "failed", "error": str(e)}


def _parse_social_content(content: str) -> List[str]:
    """Robust parser for social content with multiple fallback strategies."""
    captions = []
    
    # Strategy 1: Delimiter-based parsing (---PLATFORM---)
    linkedin_match = re.search(r'---LINKEDIN---\s*(.*?)(?=---INSTAGRAM---|---TWITTER---|$)', content, re.DOTALL | re.IGNORECASE)
    instagram_match = re.search(r'---INSTAGRAM---\s*(.*?)(?=---TWITTER---|---LINKEDIN---|$)', content, re.DOTALL | re.IGNORECASE)
    twitter_match = re.search(r'---TWITTER---\s*(.*?)(?=---LINKEDIN---|---INSTAGRAM---|$)', content, re.DOTALL | re.IGNORECASE)
    
    if linkedin_match and instagram_match and twitter_match:
        captions = [
            linkedin_match.group(1).strip(),
            instagram_match.group(1).strip(),
            twitter_match.group(1).strip()
        ]
        return captions
    
    # Strategy 2: Header-based (LinkedIn:, Instagram:, Twitter/X:)
    patterns = [
        (r'(?:LinkedIn|LINKEDIN)[:\s]*\n?(.*?)(?=(?:Instagram|INSTAGRAM|Twitter|TWITTER|X \(Twitter\))[:\s]|$)', re.DOTALL | re.IGNORECASE),
        (r'(?:Instagram|INSTAGRAM)[:\s]*\n?(.*?)(?=(?:Twitter|TWITTER|X \(Twitter\)|LinkedIn|LINKEDIN)[:\s]|$)', re.DOTALL | re.IGNORECASE),
        (r'(?:Twitter|TWITTER|X \(Twitter\))[:\s]*\n?(.*?)(?=(?:LinkedIn|LINKEDIN|Instagram|INSTAGRAM)[:\s]|$)', re.DOTALL | re.IGNORECASE),
    ]
    
    for pattern, flags in patterns:
        match = re.search(pattern, content, flags)
        if match:
            text = match.group(1).strip()
            # Clean up any leading/trailing quotes or numbering
            text = re.sub(r'^[\d]+[\.\)]\s*', '', text)
            text = text.strip('"').strip("'")
            if text:
                captions.append(text)
    
    if len(captions) >= 3:
        return captions[:3]
    
    # Strategy 3: Numbered list (1., 2., 3.)
    captions = []
    numbered = re.split(r'\n\s*(?:\d+[\.\)])\s*', content)
    numbered = [n.strip() for n in numbered if n.strip() and len(n.strip()) > 20]
    if len(numbered) >= 3:
        return numbered[:3]
    
    # Strategy 4: Double newline split
    parts = [p.strip() for p in content.split("\n\n") if p.strip() and len(p.strip()) > 20]
    if len(parts) >= 3:
        return parts[:3]
    
    return captions


async def _generate_individual_posts(state: WorkflowState) -> List[str]:
    """Fallback: generate each social post individually."""
    captions = []
    blog_excerpt = state['blog_content'][:800] if state.get('blog_content') else state['brief'].topic
    
    platforms = [
        ("LinkedIn", "Write a professional LinkedIn post (150-250 words) about this content. Be thought-leading and include a call to action."),
        ("Instagram", "Write an Instagram caption for this content. Be engaging, use emojis, and include relevant hashtags."),
        ("Twitter", "Write a tweet (under 280 characters) about this content. Be punchy and include 2-3 hashtags.")
    ]
    
    for platform, instruction in platforms:
        try:
            prompt = f"{instruction}\n\nContent:\n{blog_excerpt}"
            result = await ai_service.generate_text(prompt, f"You are a {platform} content expert.")
            captions.append(result.strip())
        except Exception as e:
            print(f"ERROR: Individual {platform} generation failed: {e}")
            captions.append(f"[{platform} post generation failed]")
    
    return captions


async def generate_email(state: WorkflowState) -> WorkflowState:
    print("--- GENERATING EMAIL ---")
    if state["status"] == "failed":
        return state
    
    prompt = f"Create a compelling email newsletter snippet for the following blog post. Focus on a clear call-to-action to read more:\n\n{state['blog_content']}"
    system_prompt = f"Brand Voice: {state['brand_voice'].tone_guidelines}\nTask: Create a high-converting newsletter snippet."
    
    try:
        content = await ai_service.generate_text(prompt, system_prompt)
        return {**state, "email_content": content, "status": "email_generated"}
    except Exception as e:
        return {**state, "status": "failed", "error": str(e)}

async def generate_image(state: WorkflowState) -> WorkflowState:
    print("--- GENERATING IMAGES ---")
    if state["status"] == "failed":
        return state
    
    # Platform-specific sizes and requirements
    PLATFORMS = {
        "LinkedIn": "1200x627",
        "X (Twitter)": "1200x675",
        "Instagram": "1024x1024",
    }
    
    generated_images = []
    topic = state['brief'].topic
    tone = state['brief'].tone
    blog_excerpt = state.get('blog_content', topic)[:600]
    
    # Step 1: Generate a compelling headline and visual concept from the content
    concept_prompt = (
        f"Based on this blog content, generate TWO things:\n"
        f"1. HEADLINE: A short, catchy headline (5-8 words) that captures the key message\n"
        f"2. VISUAL: A detailed visual scene description (20 words) that represents this topic\n\n"
        f"Blog content:\n{blog_excerpt}\n\n"
        f"Format:\nHEADLINE: [your headline]\nVISUAL: [your scene description]"
    )
    
    try:
        concept = await ai_service.generate_text(concept_prompt, "You are a creative director at a top design agency.")
        # Parse headline and visual
        headline = topic  # fallback
        visual_scene = topic
        for line in concept.split('\n'):
            if 'HEADLINE:' in line.upper():
                headline = line.split(':', 1)[-1].strip().strip('"').strip("'")
            elif 'VISUAL:' in line.upper():
                visual_scene = line.split(':', 1)[-1].strip().strip('"').strip("'")
        print(f"DEBUG: Headline: {headline}")
        print(f"DEBUG: Visual scene: {visual_scene}")
    except Exception as e:
        print(f"WARNING: Concept generation failed, using topic: {e}")
        headline = topic
        visual_scene = topic

    # Step 2: Platform-specific image prompts with content-relevant visuals and text
    platform_prompts = {
        "LinkedIn": (
            f"A professional social media banner for LinkedIn. "
            f"Bold white headline text \"{headline}\" prominently displayed on a "
            f"dark gradient overlay. Background shows {visual_scene}. "
            f"Modern typography, clean layout, corporate design with subtle "
            f"blue accent colors (#0A66C2). High contrast, readable text. "
            f"Style: editorial, premium, thought-leadership content graphic. "
            f"Aspect ratio 1.91:1, photorealistic background with text overlay."
        ),
        "X (Twitter)": (
            f"A bold, eye-catching Twitter/X post graphic. "
            f"Large impactful text \"{headline}\" in modern sans-serif font, "
            f"centered on a vibrant gradient background related to {visual_scene}. "
            f"Dynamic composition with geometric shapes or abstract elements. "
            f"Colors: bold and contrasting, dark background with bright accent text. "
            f"Style: viral social media graphic, engaging, scroll-stopping. "
            f"Clean and punchy design, suitable for a tweet."
        ),
        "Instagram": (
            f"A stunning square Instagram post graphic. "
            f"Beautiful headline text \"{headline}\" in elegant typography, "
            f"overlaid on a visually striking image of {visual_scene}. "
            f"Rich colors, warm tones, Instagram-aesthetic with slight film grain. "
            f"Include subtle brand-style elements, modern layout with text "
            f"positioned for readability. Style: influencer content, premium "
            f"editorial design, visually immersive, aspirational."
        ),
    }

    try:
        for platform, size in PLATFORMS.items():
            print(f"DEBUG: Generating image for {platform} ({size})...")
            prompt = platform_prompts.get(platform, (
                f"Professional content graphic about {topic}. "
                f"Headline: \"{headline}\". Background: {visual_scene}. "
                f"Modern design, bold typography, high quality."
            ))
            try:
                image_path = await ai_service.generate_image(prompt, size=size)
                generated_images.append(image_path)
            except Exception as e:
                print(f"ERROR: Image generation failed for {platform}: {e}")
                
        return {**state, "images": generated_images, "status": "images_generated"}
    except Exception as e:
        print(f"ERROR: Image generation node failed: {e}")
        return {**state, "images": [], "status": "images_skipped"}

async def save_to_supabase(state: WorkflowState) -> WorkflowState:
    print("--- SAVING TO SUPABASE ---")
    if state["status"] == "failed":
        print(f"DEBUG: Skipping save because status is failed: {state.get('error')}")
        return state
    
    brief_id = state["brief_id"]
    print(f"DEBUG: Saving content for brief_id: {brief_id}")
    uploaded_image_urls = []
    
    try:
        # Save Blog
        if state.get("blog_content"):
            print("DEBUG: Saving blog content...")
            blog = await supabase_service.save_content(brief_id, "blog", {"text": state["blog_content"]})
            # Set to Review for HITL
            await supabase_service.update_content_status(blog["id"], "Review")
            
            # Upload and Save Images
            if state.get("images"):
                for image_path in state["images"]:
                    try:
                        print(f"DEBUG: Uploading image {image_path}...")
                        public_url = await supabase_service.upload_image(image_path)
                        await supabase_service.save_asset(blog["id"], public_url)
                        uploaded_image_urls.append(public_url)
                        if os.path.exists(image_path):
                            os.remove(image_path)
                    except Exception as e:
                        print(f"ERROR: Asset saving failed: {e}")
        else:
            print("DEBUG: No blog content to save.")
        
        # Save Social
        if state.get("social_content"):
            print("DEBUG: Saving social content...")
            await supabase_service.save_content(brief_id, "social", {"captions": state["social_content"]})
        
        # Save Email
        if state.get("email_content"):
            print("DEBUG: Saving email content...")
            await supabase_service.save_content(brief_id, "email", {"text": state["email_content"]})
        
        # Auto-create drafts for each platform
        print("DEBUG: Auto-creating platform drafts...")
        try:
            await supabase_service.auto_create_drafts(
                brief_id=brief_id,
                social_captions=state.get("social_content", []),
                blog_content=state.get("blog_content"),
                email_content=state.get("email_content"),
                images=uploaded_image_urls
            )
            print("DEBUG: Drafts created successfully.")
        except Exception as e:
            print(f"WARNING: Auto-draft creation failed (non-critical): {e}")
            
        print("DEBUG: Content saved successfully.")
        return {**state, "image_urls": uploaded_image_urls, "status": "completed"}
        
    except Exception as e:
        print(f"ERROR: Failed to save to Supabase: {e}")
        return {**state, "status": "failed", "error": f"Database error: {str(e)}"}

async def regenerate_content(state: WorkflowState) -> WorkflowState:
    print("--- REGENERATING WITH REVISION NOTES ---")
    # This node would be triggered if the human requests a revision.
    # It updates the prompts with state["revision_notes"]
    return await generate_blog(state)

def create_workflow():
    workflow = StateGraph(WorkflowState)
    
    workflow.add_node("validate", validate_input)
    workflow.add_node("blog", generate_blog)
    workflow.add_node("social", generate_social)
    workflow.add_node("email", generate_email)
    workflow.add_node("image", generate_image)
    workflow.add_node("save", save_to_supabase)
    workflow.add_node("regenerate", regenerate_content)
    
    workflow.set_entry_point("validate")
    workflow.add_edge("validate", "blog")
    workflow.add_edge("blog", "social")
    workflow.add_edge("social", "email")
    workflow.add_edge("email", "image")
    workflow.add_edge("image", "save")
    workflow.add_edge("save", END)
    
    return workflow.compile()

langgraph_app = create_workflow()
