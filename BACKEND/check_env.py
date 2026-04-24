import os
from dotenv import load_dotenv

load_dotenv('/Users/abhimanraj/FOAI/fastapi/.env')
print(f"LINKEDIN_CLIENT_ID: '{os.getenv('LINKEDIN_CLIENT_ID')}'")
print(f"LINKEDIN_CLIENT_SECRET: '{os.getenv('LINKEDIN_CLIENT_SECRET')[:4]}...'")
