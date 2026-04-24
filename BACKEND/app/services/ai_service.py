import os
import httpx
from pathlib import Path
from dotenv import load_dotenv
from typing import List, Optional, Dict, Any
import json
import base64
import uuid

# Load environment variables from the .env file in the fastapi directory
env_path = Path(__file__).parents[2] / '.env'
load_dotenv(dotenv_path=env_path)

# Standardized Environment Variables
HF_TOKEN = os.getenv("HF_TOKEN")
if not HF_TOKEN:
    # Fallback to the old variable name if HF_TOKEN is not set
    HF_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN")

if not HF_TOKEN:
    print("❌ ERROR: No Hugging Face token found! Ensure HF_TOKEN is set in your .env file.")
else:
    print(f"✅ HF_TOKEN loaded: {HF_TOKEN[:4]}...{HF_TOKEN[-4:]}")

TEXT_MODEL = os.getenv("TEXT_MODEL", "MiniMaxAI/MiniMax-M2.7:novita")
IMAGE_MODEL = os.getenv("IMAGE_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")

class AIService:
    def __init__(self):
        self.headers = {
            "Authorization": f"Bearer {HF_TOKEN}",
            "Content-Type": "application/json"
        }
        # Correct Router Base URL
        self.base_url = "https://router.huggingface.co/v1"
        self.image_url = "https://router.huggingface.co/nscale/v1/images/generations"

    async def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Uses Hugging Face Router with OpenAI-compatible Chat Completions endpoint.
        """
        async with httpx.AsyncClient() as client:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            payload = {
                "model": TEXT_MODEL,
                "messages": messages,
                "max_tokens": 1000,
                "temperature": 0.7,
                "top_p": 0.9
            }

            print(f"DEBUG: Calling HF Router Chat Completions...")
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
                timeout=90.0
            )

            if response.status_code != 200:
                print(f"ERROR: HF API returned {response.status_code}: {response.text}")
                raise Exception(f"HF Text API error: {response.text}")

            result = response.json()
            # Standard OpenAI Response Parsing
            if "choices" in result and len(result["choices"]) > 0:
                return result["choices"][0]["message"]["content"].strip()
            
            return str(result)

    async def generate_image(self, prompt: str, size: str = "1024x1024") -> str:
        """
        Uses NScale Router for image generation with standardized format.
        """
        async with httpx.AsyncClient() as client:
            payload = {
                "model": IMAGE_MODEL,
                "prompt": prompt,
                "size": size,
                "response_format": "b64_json"
            }

            print(f"DEBUG: Calling NScale Router for image generation ({size})...")
            response = await client.post(
                self.image_url,
                headers=self.headers,
                json=payload,
                timeout=90.0
            )

            if response.status_code != 200:
                print(f"ERROR: Image API returned {response.status_code}: {response.text}")
                raise Exception(f"HF Image API error: {response.text}")

            result = response.json()
            if "data" in result and len(result["data"]) > 0:
                b64_data = result["data"][0].get("b64_json")
                if b64_data:
                    temp_filename = f"temp_{uuid.uuid4()}.png"
                    with open(temp_filename, "wb") as f:
                        f.write(base64.b64decode(b64_data))
                    return temp_filename

            raise Exception("No image data returned from API")

# Global Instance
ai_service = AIService()
