# video_service.py - Manages sign language video retrieval and sequencing
# Copyright 2026 Karl Benjamin R. Bughaw
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import httpx
import os
import json
import asyncio
import aiofiles
import re
import hashlib
from services import skeleton_service

# Load config relative to this file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")
CACHE_PATH = os.path.join(BASE_DIR, "cache.json")
VIDEOS_DIR = os.path.join(BASE_DIR, "videos")
SKELETONS_DIR = os.path.join(BASE_DIR, "skeletons")
SKELETON_VIDEOS_DIR = os.path.join(BASE_DIR, "skeleton_videos")

# Ensure base directories exist
for d in [VIDEOS_DIR, SKELETONS_DIR, SKELETON_VIDEOS_DIR]:
    if not os.path.exists(d):
        os.makedirs(d)

if os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH, 'r') as f:
        config = json.load(f)
    ASL_BASE_URL = config.get("asl_base_url", "https://pocketsign.s3-us-west-2.amazonaws.com/")
    FSL_BASE_URL = config.get("fsl_base_url", "http://161.118.197.176:8080/")
    SEARCH_ONLINE = config.get("search_online", True)
    SAVE_SKELETON_VIDEOS = config.get("save_skeleton_videos", True)
else:
    ASL_BASE_URL = "https://pocketsign.s3-us-west-2.amazonaws.com/"
    FSL_BASE_URL = "http://161.118.197.176:8080/"
    SEARCH_ONLINE = True
    SAVE_SKELETON_VIDEOS = True

def load_cache():
    if os.path.exists(CACHE_PATH):
        try:
            with open(CACHE_PATH, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_cache(cache):
    with open(CACHE_PATH, 'w') as f:
        json.dump(cache, f, indent=2)

_cache = load_cache()

def get_lang_dir(base_dir, lang):
    d = os.path.join(base_dir, lang)
    if not os.path.exists(d):
        os.makedirs(d)
    return d

async def get_or_fetch_video(word: str, lang: str = "asl", is_letter: bool = False):
    word = word.lower().strip()
    # Allow spaces, parentheses and alphanumeric characters
    if not word or not re.match(r'^[a-z0-9\s\(\)]+$', word):
        return None

    lang_video_dir = get_lang_dir(VIDEOS_DIR, lang)
    
    # Check for variants if lang is fsl
    if lang == "fsl" and not is_letter:
        import glob
        import random
        
        # Check local variants first
        variant_pattern = os.path.join(lang_video_dir, f"{word} (Variant *).mp4")
        local_variants = glob.glob(variant_pattern)
        
        if local_variants:
            chosen_local = random.choice(local_variants)
            filename = os.path.basename(chosen_local)
            return {"word": word, "filename": filename, "type": "word", "lang": lang}

    # Default filename
    filename = f"{word}.mp4"
    local_path = os.path.join(lang_video_dir, filename)

    # 1. Check if we already have it locally
    if os.path.exists(local_path):
        base_url = ASL_BASE_URL if lang == "asl" else FSL_BASE_URL
        remote_url = f"{base_url}{filename}".replace(" ", "%20")
        return {"word": word, "filename": filename, "type": "letter" if is_letter else "word", "lang": lang, "remote_url": remote_url}

    # 2. Check cache to see if we've already marked it as non-existent for this lang
    cache_key = f"{lang}:{word}"
    if cache_key in _cache and _cache[cache_key] is None:
        return None

    # 3. If we don't have it and SEARCH_ONLINE is False, stop here
    if not SEARCH_ONLINE:
        return None

    # 4. Fetch from appropriate URL and save locally
    base_url = ASL_BASE_URL if lang == "asl" else FSL_BASE_URL
    
    async with httpx.AsyncClient() as client:
        # For FSL, if the base word doesn't exist, try Variant A, then Variant B
        filenames_to_try = [filename]
        if lang == "fsl" and not is_letter:
            # Also try without extension for the smart API
            filenames_to_try.append(f"{word}")
            filenames_to_try.append(f"{word} (Variant A).mp4")
            filenames_to_try.append(f"{word} (Variant B).mp4")

        for fname in filenames_to_try:
            url = f"{base_url}{fname}"
            try:
                # Replace spaces with %20 for URL
                encoded_url = url.replace(" ", "%20")
                response = await client.get(encoded_url, follow_redirects=True)
                if response.status_code == 200:
                    # If we got a response, ensure we save it with a safe filename
                    # but use the original fname for the local path
                    save_name = fname if fname.endswith(".mp4") else f"{fname}.mp4"
                    target_path = os.path.join(lang_video_dir, save_name)
                    async with aiofiles.open(target_path, mode='wb') as f:
                        await f.write(response.content)
                    
                    _cache[cache_key] = save_name
                    save_cache(_cache)
                    return {"word": word, "filename": save_name, "type": "letter" if is_letter else "word", "lang": lang, "remote_url": encoded_url}
            except Exception as e:
                print(f"Error fetching {fname} for {lang}: {e}")
                continue

        # If none found
        _cache[cache_key] = None
        save_cache(_cache)
        return None

async def get_skeleton_for_video(video_info: dict):
    if not video_info:
        return None
    
    word = video_info["word"]
    lang = video_info.get("lang", "asl")
    filename = video_info["filename"]
    
    video_path = os.path.join(VIDEOS_DIR, lang, filename)
    skeleton_filename = f"{word}.json"
    skeleton_path = os.path.join(get_lang_dir(SKELETONS_DIR, lang), skeleton_filename)

    if os.path.exists(skeleton_path):
        try:
            async with aiofiles.open(skeleton_path, mode='r') as f:
                content = await f.read()
                if content.strip():
                    data = json.loads(content)
                    # Round coordinates for all frames to optimize payload size
                    for frame in data:
                        for part in ["pose", "left_hand", "right_hand", "face"]:
                            if frame.get(part):
                                for lm in frame[part]:
                                    if "x" in lm: lm["x"] = round(lm["x"], 4)
                                    if "y" in lm: lm["y"] = round(lm["y"], 4)
                                    if "z" in lm: lm["z"] = round(lm["z"], 4)
                                    if "visibility" in lm: lm["visibility"] = round(lm["visibility"], 4)
                    return data
        except Exception as e:
            print(f"Error loading skeleton for {word}: {e}. Re-extracting...")
            try: os.remove(skeleton_path)
            except: pass

    skeleton_data = await skeleton_service.extract_skeleton(video_path)
    if skeleton_data:
        async with aiofiles.open(skeleton_path, mode='w') as f:
            await f.write(json.dumps(skeleton_data))
    
    return skeleton_data

async def get_skeleton_video_for_word(video_info: dict):
    if not video_info:
        return None
    
    import base64
    import tempfile
    
    word = video_info["word"]
    lang = video_info.get("lang", "asl")
    
    # If saving is enabled, check existing or render to disk
    if SAVE_SKELETON_VIDEOS:
        skeleton_video_filename = f"{word}_skeleton.webm"
        skeleton_video_path = os.path.join(get_lang_dir(SKELETON_VIDEOS_DIR, lang), skeleton_video_filename)

        if os.path.exists(skeleton_video_path):
            return {"filename": skeleton_video_filename, "lang": lang}

        skeleton_data = await get_skeleton_for_video(video_info)
        if not skeleton_data:
            return None
        
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, skeleton_service.render_skeleton_video, skeleton_data, skeleton_video_path)
        return {"filename": skeleton_video_filename, "lang": lang}
    
    # If saving is disabled, render to temp and return base64
    else:
        skeleton_data = await get_skeleton_for_video(video_info)
        if not skeleton_data:
            return None
            
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"{word}_temp_skeleton.webm")
        
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, skeleton_service.render_skeleton_video, skeleton_data, temp_path)
        
        if os.path.exists(temp_path):
            async with aiofiles.open(temp_path, mode='rb') as f:
                video_bytes = await f.read()
            
            base64_str = base64.b64encode(video_bytes).decode('utf-8')
            data_uri = f"data:video/webm;base64,{base64_str}"
            
            try:
                os.remove(temp_path)
            except:
                pass
                
            return {"video_blob": data_uri, "lang": lang}
    
    return None

async def get_full_skeleton_data(text: str, lang: str = "asl", mode: str = "mixed"):
    """
    Combines skeleton JSONs for the whole phrase and performs interpolation in memory.
    """
    video_results = await process_text(text, lang=lang, mode=mode, include_skeleton=True)
    if not video_results:
        return None

    all_frames = []
    for result in video_results:
        current_skeleton = result.get("skeleton")
        if not current_skeleton: continue
        
        if all_frames:
            last_frame = all_frames[-1]
            first_frame_new = current_skeleton[0]
            interpolation = skeleton_service.interpolate_frames(last_frame, first_frame_new, num_frames=15)
            all_frames.extend(interpolation)
        
        all_frames.extend(current_skeleton)

    all_frames = skeleton_service.stabilize_skeleton(all_frames)
    return all_frames

async def get_full_skeleton_video_data(text: str, lang: str = "asl", mode: str = "mixed"):
    """
    Generates a combined skeleton video and returns it as a base64 Data URI.
    """
    import base64
    import tempfile
    
    text_hash = hashlib.sha256(f"{lang}:{mode}:{text.lower().strip()}".encode()).hexdigest()[:16]
    temp_dir = tempfile.gettempdir()
    combined_video_path = os.path.join(temp_dir, f"combined_{text_hash}.webm")

    # Get all individual word results
    video_results = await process_text(text, lang=lang, mode=mode, include_skeleton=True)
    if not video_results:
        return None

    all_frames = []
    for result in video_results:
        current_skeleton = result.get("skeleton")
        if not current_skeleton: continue
        
        if all_frames:
            last_frame = all_frames[-1]
            first_frame_new = current_skeleton[0]
            interpolation = skeleton_service.interpolate_frames(last_frame, first_frame_new, num_frames=15)
            all_frames.extend(interpolation)
        
        all_frames.extend(current_skeleton)

    if not all_frames:
        return None

    # Stabilize
    all_frames = skeleton_service.stabilize_skeleton(all_frames)

    # Render the combined video to temporary storage
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, skeleton_service.render_skeleton_video, all_frames, combined_video_path)
    
    if os.path.exists(combined_video_path):
        async with aiofiles.open(combined_video_path, mode='rb') as f:
            video_bytes = await f.read()
        
        base64_str = base64.b64encode(video_bytes).decode('utf-8')
        data_uri = f"data:video/webm;base64,{base64_str}"
        
        # Cleanup
        try:
            os.remove(combined_video_path)
        except:
            pass
            
        return data_uri
    
    return None

async def get_word_skeleton(word: str, lang: str = "asl", mode: str = "mixed"):
    """
    Retrieves skeleton data for a single word or its spelled letters,
    interpolating between words for smoothness.
    """
    results = await process_text(word, lang=lang, mode=mode, include_skeleton=True)
    if not results:
        return None
        
    all_frames = []
    for res in results:
        current_skeleton = res.get("skeleton")
        if not current_skeleton: continue
        
        if all_frames:
            last_frame = all_frames[-1]
            first_frame_new = current_skeleton[0]
            interpolation = skeleton_service.interpolate_frames(last_frame, first_frame_new, num_frames=15)
            all_frames.extend(interpolation)
        
        all_frames.extend(current_skeleton)
        
    all_frames = skeleton_service.stabilize_skeleton(all_frames)
    return all_frames

async def process_text(text: str, lang: str = "asl", mode: str = "mixed", include_skeleton: bool = False, include_skeleton_video: bool = False):
    clean_text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
    words = clean_text.split()
    
    other_lang = "fsl" if lang == "asl" else "asl"
    
    async def process_item(word_or_char, current_lang, is_letter=False):
        video = await get_or_fetch_video(word_or_char, lang=current_lang, is_letter=is_letter)
        if not video:
            return None
        if include_skeleton:
            video["skeleton"] = await get_skeleton_for_video(video)
        if include_skeleton_video:
            video["skeleton_video"] = await get_skeleton_video_for_word(video)
        return video

    results = []
    
    # Try the whole phrase first if there are multiple words (common for signs like "thank you")
    if len(words) > 1:
        phrase = " ".join(words).lower()
        res = await process_item(phrase, lang)
        
        # If not found and mode is mixed, try other language
        if not res and mode == "mixed":
            res = await process_item(phrase, other_lang)
            
        if res:
            return [res]

    # If no whole phrase found, process word by word
    for word in words:
        # 1. Try preferred language
        res = await process_item(word, lang)
        
        # 2. If not found and mode is mixed, try other language
        if not res and mode == "mixed":
            res = await process_item(word, other_lang)
            
        if res:
            results.append(res)
        else:
            # 3. Fallback to letters in preferred language
            char_tasks = [process_item(char, lang, is_letter=True) for char in word if char.isalnum()]
            char_results = await asyncio.gather(*char_tasks)
            results.extend([r for r in char_results if r])
    
    return results
