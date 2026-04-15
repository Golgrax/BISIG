import asyncio
import json
import os
import sys
import concurrent.futures
from services import video_service

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# CONFIG OVERRIDE (For build process)
video_service.SEARCH_ONLINE = True
video_service.SAVE_SKELETON_VIDEOS = True

async def process_word(word, semaphore):
    async with semaphore:
        print(f"--- Processing: {word} ---")
        try:
            # 1. Fetch Video
            video_info = await video_service.get_or_fetch_video(word)
            if not video_info:
                print(f"  [!] Video not found for: {word}")
                return False
            
            # 2. Extract Skeleton Data (JSON)
            print(f"  [+] Checking/Extracting JSON...")
            skeleton_data = await video_service.get_skeleton_for_video(video_info)
            
            if not skeleton_data:
                print(f"  [x] Failed to extract skeleton for: {word}")
                return False

            # 3. Render Skeleton Video (AVI)
            print(f"  [+] Checking/Rendering AVI...")
            skeleton_video = await video_service.get_skeleton_video_for_word(video_info)
            
            if skeleton_video:
                print(f"  [v] Success: {word}")
                return True
            else:
                print(f"  [x] Failed to render AVI for: {word}")
                return False

        except Exception as e:
            print(f"  [Error] {word}: {e}")
            return False

async def precache_all():
    # 1. Load Cache
    cache = video_service.load_cache()
    all_words = [k for k, v in cache.items() if v is not None]
    
    # Optional: Filter for only missing files to be ultra-fast
    # words_to_process = [w for w in all_words if not os.path.exists(f"skeleton_videos/{w}_skeleton.avi")]
    words_to_process = all_words
    
    print(f"Starting precache for {len(words_to_process)} words...")
    
    # 2. Process in batches with a semaphore to prevent network/CPU overload
    # GitHub Actions normally have 2-4 cores, so we'll use a conservative concurrency
    semaphore = asyncio.Semaphore(5)
    
    tasks = [process_word(word, semaphore) for word in words_to_process]
    results = await asyncio.gather(*tasks)
    
    success_count = sum(1 for r in results if r)
    print(f"\nPrecache Complete! Successfully processed: {success_count}/{len(words_to_process)}")

if __name__ == "__main__":
    asyncio.run(precache_all())
