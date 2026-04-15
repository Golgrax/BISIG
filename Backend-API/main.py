# main.py - Core entry point for the BISIG Sign Language API
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

import os
import json
from fastapi import FastAPI, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from services import video_service, skeleton_service

app = FastAPI(title="BISIG Sign Language API")

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VIDEOS_DIR = os.path.join(BASE_DIR, "videos")
SKELETON_VIDEOS_DIR = os.path.join(BASE_DIR, "skeleton_videos")

# Serve local video files
app.mount("/videos", StaticFiles(directory=VIDEOS_DIR), name="videos")
app.mount("/skeleton_videos", StaticFiles(directory=SKELETON_VIDEOS_DIR), name="skeleton_videos")

@app.get("/player.html")
async def get_player():
    return FileResponse(os.path.join(BASE_DIR, "player.html"))

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    from fastapi import Response
    return Response(status_code=204)

@app.get("/")
async def root():
    return {
        "message": "Welcome to the BISIG Sign Language API",
        "version": "1.4.0",
        "docs": "/docs",
        "usage": {
            "endpoint": "/translate",
            "params": {
                "text": "The phrase you want to translate",
                "format": "video | skeleton | skeleton_video | full_skeleton | full_skeleton_video",
                "lang": "asl | fsl (default: asl)",
                "mode": "mixed | pure (default: mixed)"
            },
            "example": "/translate?text=hello world&format=full_skeleton&lang=asl&mode=mixed"
        },
        "player": "Open player.html in your browser to visualize the results!"
    }

@app.get("/translate")
async def translate_text(
    request: Request, 
    text: str = Query(..., description="The text to translate"),
    format: str = Query("video", description="Output format: 'video', 'skeleton', 'skeleton_video', 'full_skeleton_video', 'full_skeleton', or 'full_skeleton_data'"),
    lang: str = Query("asl", description="Language: 'asl' or 'fsl'"),
    mode: str = Query("mixed", description="Mode: 'mixed' or 'pure'")
):
    """
    Translates text to a sequence of sign language video URLs or skeleton data/videos.
    """
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    # NEW: Instant raw sequence data (No rendering delay!)
    if format in ["full_skeleton", "full_skeleton_data"]:
        data = await video_service.get_full_skeleton_data(text, lang=lang, mode=mode)
        if not data:
             raise HTTPException(status_code=404, detail="Could not generate combined skeleton data")

        return {
            "original_text": text,
            "format": format,
            "frames": data
        }

    # Handle full sequence combined video separately

    if format == "full_skeleton_video":
        video_base64 = await video_service.get_full_skeleton_video_data(text, lang=lang, mode=mode)
        if not video_base64:
             raise HTTPException(status_code=404, detail="Could not generate combined skeleton video")
        
        return {
            "original_text": text,
            "format": format,
            "video_blob": video_base64,
            "mime_type": "video/webm"
        }

    include_skeleton = (format == "skeleton")
    include_skeleton_video = (format == "skeleton_video")
    
    video_results = await video_service.process_text(
        text, 
        lang=lang,
        mode=mode,
        include_skeleton=include_skeleton,
        include_skeleton_video=include_skeleton_video
    )
    
    # Detect the actual public host and protocol
    host = request.headers.get("x-forwarded-host", request.headers.get("host", "localhost:8000"))
    proto = request.headers.get("x-forwarded-proto", "http")
    base_url = f"{proto}://{host}"
    
    # Construct response data
    response_data = []
    for item in video_results:
        result_item = {
            "word": item["word"],
            "type": item["type"]
        }
        
        # Determine the subdirectory for local URLs
        item_lang = item.get("lang", "asl")
        
        if format == "skeleton":
            result_item["skeleton"] = item.get("skeleton")
            result_item["url"] = f"{base_url}/videos/{item_lang}/{item['filename']}"
            result_item["remote_url"] = item.get("remote_url")
        elif format == "skeleton_video":
            skeleton_res = item.get("skeleton_video")
            if skeleton_res:
                if "video_blob" in skeleton_res:
                    result_item["video_blob"] = skeleton_res["video_blob"]
                else:
                    video_filename = skeleton_res.get("filename")
                    res_lang = skeleton_res.get("lang", "asl")
                    result_item["url"] = f"{base_url}/skeleton_videos/{res_lang}/{video_filename}" if video_filename else None
            else:
                result_item["url"] = None
        else:
            result_item["url"] = f"{base_url}/videos/{item_lang}/{item['filename']}"
            result_item["local_url"] = result_item["url"]
            result_item["remote_url"] = item.get("remote_url")
            
        response_data.append(result_item)
    
    return {
        "original_text": text,
        "format": format,
        "results": response_data
    }

@app.websocket("/ws/translate")
async def websocket_translate(websocket: WebSocket):
    await websocket.accept()
    
    neutral = skeleton_service.GET_NEUTRAL_POSE()
    last_frame = neutral
    is_idle = True
    lang = "asl"
    mode = "mixed"
    
    try:
        while True:
            # Use a task to wait for data so we don't block the keep-alive
            try:
                # 2.0 second timeout for idle detection
                receive_task = asyncio.create_task(websocket.receive_json())
                done, pending = await asyncio.wait({receive_task}, timeout=2.0)
                
                if receive_task in done:
                    data = receive_task.result()
                    word = data.get("word", "").strip()
                    lang = data.get("lang", lang)
                    mode = data.get("mode", mode)
                    
                    if word:
                        # 1. Fetch word skeleton
                        word_frames = await video_service.get_word_skeleton(word, lang=lang, mode=mode)
                        if not word_frames:
                            await websocket.send_json({"error": f"Word not found: {word}"})
                        else:
                            # 2. Interpolate & Stream
                            interp = skeleton_service.interpolate_frames(last_frame, word_frames[0], num_frames=20)
                            await websocket.send_json({"type": "frames", "word": word, "frames": interp + word_frames})
                            last_frame = word_frames[-1]
                            is_idle = False
                else:
                    # Timeout reached - handle idle
                    receive_task.cancel()
                    if not is_idle:
                        interp = skeleton_service.interpolate_frames(last_frame, neutral, num_frames=20)
                        await websocket.send_json({"type": "idle", "frames": interp + [neutral]})
                        last_frame = neutral
                        is_idle = True

            except Exception as e:
                if not isinstance(e, asyncio.CancelledError):
                    raise e

    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try: await websocket.close()
        except: pass

@app.get("/health")
def health_check():
    return {"status": "ok"}
