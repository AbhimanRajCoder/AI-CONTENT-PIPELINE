# FOAI: Future of AI Content Pipeline

FOAI is a high-performance, modular AI content generation pipeline built with **FastAPI**, **LangGraph**, and **Next.js**. It automates the creation of multi-platform content (blog posts, social media, emails, and custom images) from a single brief, utilizing a "no-queue" architecture with real-time streaming progress.

---

## 🚀 Features

- **Multi-Stage Content Generation**: Sequential workflow generating blogs, social captions, and email newsletters.
- **Platform-Specific Image Generation**: Automatic image creation with optimized dimensions:
  - **LinkedIn**: 1200x627
  - **Instagram**: 1024x1024
  - **X (Twitter)**: 1200x675
- **Visual Theme Analysis**: AI-driven pre-analysis of content to generate contextually relevant, text-free image prompts.
- **Real-Time Streaming (SSE)**: Live progress updates from the LangGraph workflow via Server-Sent Events.
- **Human-in-the-Loop (HITL)**: Built-in endpoints for content approval, revision requests, and versioning.
- **No-Queue Architecture**: High-efficiency backend using FastAPI `BackgroundTasks` and async streaming instead of Redis/Celery.
- **Modular Brand Voice**: Dynamic injection of tone guidelines, vocabulary rules, and writing styles.

---

## 🛠️ Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Async)
- **Orchestration**: [LangGraph](https://python.langchain.com/docs/langgraph)
- **AI Router**: Hugging Face Router (`MiniMaxAI/MiniMax-M2.7:novita` for text)
- **Image Generation**: NScale Router
- **Database/Auth/Storage**: [Supabase](https://supabase.com/) (PostgreSQL, Realtime, Storage)

### Frontend (Planned/Integrated)
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS v4, [Lucide React](https://lucide.dev/)
- **UI Components**: Shadcn/UI (Lucid Minimal aesthetic: Alabaster, Deep Slate, Sage Green, Terra Cotta)

---

## 📂 Project Structure

```text
FOAI/
├── fastapi/                # Backend API & Workflow
│   ├── app/
│   │   ├── services/       # External integrations
│   │   │   ├── ai_service.py       # HF & NScale API logic
│   │   │   └── supabase_service.py # Database & Storage operations
│   │   ├── langgraph_workflow.py   # State machine & node logic
│   │   ├── main.py                 # FastAPI routes & SSE streaming
│   │   └── schemas.py              # Pydantic data models
│   ├── .env                # Environment configuration
│   └── requirements.txt    # Python dependencies
└── README.md               # Project documentation
```

---

## 🧠 LangGraph Workflow

The generation pipeline follows a strictly defined state machine:

1.  **Validate Input**: Verifies the content brief and injects the active brand voice from Supabase.
2.  **Generate Blog**: Produces a structured Markdown blog post based on the brief and brand voice.
3.  **Generate Social**: Creates exactly 3 captions for LinkedIn, Instagram, and X using regex-based parsing.
4.  **Generate Email**: Crafts a high-converting newsletter snippet with a clear CTA.
5.  **Generate Image**: Performs a "Visual Theme" analysis on the blog content and generates platform-specific images (no text).
6.  **Save to Supabase**: Persists all content, uploads images to the `assets` bucket, and sets status to `Review`.

---

## ⚙️ Setup & Installation

### Backend
1. Navigate to the `fastapi` directory:
   ```bash
   cd fastapi
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure `.env` with:
   - `HUGGINGFACE_API_TOKEN`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `NSCALE_API_KEY`
5. Start the server:
   ```bash
   uvicorn app.main:app --reload
   ```

---

## 🔗 Key Endpoints

- `POST /brief`: Create a new content brief.
- `GET /generate/{brief_id}/stream`: Stream real-time generation progress (SSE).
- `POST /content/{content_id}/approve`: Approve content for publication.
- `POST /content/{content_id}/revise`: Request AI revision with specific notes.
- `POST /test-image`: Utility to test image generation directly.

---

## 📝 Engineering Constraints

- **No External Queues**: Avoid Redis/Celery; use async FastAPI and `BackgroundTasks`.
- **Image Safety**: Prompts explicitly exclude text to ensure visual quality.
- **Storage**: Supabase `assets` bucket must be Public.
- **Model Choice**: `MiniMax-M2.7:novita` via HF Router for optimal instruction following.
