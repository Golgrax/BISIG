# BISIG Sign Language API

A high-performance REST API designed to translate text into sign language video sequences and high-fidelity skeleton datasets, now with multi-language support.

## 🚀 Features

- **Multi-Language Support**: Native support for **ASL (American Sign Language)** and now fully supporting **FSL (Filipino Sign Language)**.
- **Official FSL Integration**: Fetches high-quality videos directly from the official FSL datasets (running on port **8080**).
- **Human Reference Preview**: The player now includes a side-by-side human reference video preview for all signs, enabling comparison between human and avatar.
- **Smart Variant Selection**: Automatically detects and randomly selects between linguistic variants (e.g., "Word (Variant A)" vs "Word (Variant B)") for a more natural and diverse translation experience.
- **Hybrid Search Strategy**: 
    - **Mixed Mode**: Prioritizes your chosen language but intelligently searches the alternative language if a word is missing before falling back to fingerspelling.
    - **Pure Mode**: Strictly searches within your chosen language for maximum linguistic accuracy.
- **Text-to-Video Translation**: Translates text phrases into a sequence of `.mp4` video URLs.
- **Full Sequence Skeleton Rendering**: Use `format=full_skeleton_video` to get a single, continuous video of the entire phrase.
- **Instant Full Skeleton Data**: Use `format=full_skeleton` to get the entire phrase's landmark data in a single, pre-interpolated JSON payload.
- **Realtime WebSocket Streaming**: High-speed, low-latency translation for interactive applications and live avatars.
- **Smooth Transitions & Idle Pose**: 
    - **No Teleporting**: Advanced 20-frame interpolation between words for seamless movement.
    - **Neutral Idle Pose**: Automatically returns to a high-fidelity neutral stance (with full face and arms) after 2 seconds of inactivity.
- **High-Fidelity Tracking**: 
    - **Face Expressions**: Tracks lips, eyes, and eyebrows to capture non-verbal nuances (478 landmarks).
    - **Full Pose Tracking**: 33 pose landmarks including shoulders, elbows, and wrists.
    - **Color-Coded Fingers**: Unique colors for each finger (Yellow, Cyan, Magenta, Green, White) for clarity.
- **Smart Fallback**: Automatically falls back to letter-by-letter spelling if a specific word video is missing.

## 🛠️ API Endpoints

### `GET /translate?text=...&format=...&lang=...&mode=...`
Translates text into a sequence of video URLs or skeleton datasets.

- **Parameters**:
  - `text`: (Required) The phrase to translate.
  - `lang`: 
    - `asl` (Default): American Sign Language.
    - `fsl`: Filipino Sign Language (Live Support).
  - `mode`:
    - `mixed` (Default): If word is missing in `lang`, try the other language, then fallback to letters.
    - `pure`: Only use the selected `lang`, then fallback to letters.
  - `format`: 
    - `video` (Default): Returns a list of original human sign language URLs.
    - `skeleton`: Returns raw JSON coordinates (Pose, Hands, Face) for every frame.
    - `skeleton_video`: Returns individual rendered videos for each word.
    - `full_skeleton_video`: Returns a single combined video for the entire phrase as a **base64 encoded blob**.
    - `full_skeleton`: Returns a single combined JSON object with all frames and smooth transitions.

### `WS /ws/translate`
Realtime bidirectional WebSocket for interactive sign language avatars.

- **Client Message Format**:
  ```json
  {
    "word": "hello",
    "lang": "asl",
    "mode": "mixed"
  }
  ```
- **Server Response Format**:
  - **Success**: 
    ```json
    {
      "type": "frames",
      "word": "hello",
      "frames": [...] 
    }
    ```
    *(Includes 20 interpolation frames + word frames)*
  - **Idle (after 2s)**: 
    ```json
    {
      "type": "idle",
      "frames": [...]
    }
    ```
    *(Smoothly transitions the avatar back to the neutral pose)*
  - **Error**: `{"error": "Word not found: hello"}`

## 📁 Project Structure

- `main.py`: FastAPI application and endpoint logic.
- `services/video_service.py`: Core logic for language-aware caching and sequence combination.
- `services/skeleton_service.py`: AI logic for 3D keypoint extraction and rendering.
- `videos/[asl|fsl]/`: Local storage for source `.mp4` files.
- `skeletons/[asl|fsl]/`: Cache for extracted 3D landmark JSON data.
- `skeleton_videos/[asl|fsl]/`: Cache for rendered stick-figure videos (`.webm`).
- `models/`: MediaPipe AI task files.

## ⚡ Setup & Run (Local or VM)

1. **Install system dependencies**:
   ```bash
   sudo apt-get update && sudo apt-get install -y libgl1 python3-pip python3-venv
   ```

2. **Setup Environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

### System Dependencies (Linux/Ubuntu)
If you are deploying on a fresh Linux VM (like Oracle Cloud or AWS), you must install these libraries for MediaPipe skeleton extraction to work:

```bash
sudo apt-get update
sudo apt-get install -y libgles2 libegl1 libgl1 libglib2.0-0
```

### 🛠️ Optimization for Low-Resource VMs (1GB RAM)
If your VM is lagging or crashing during skeleton extraction, you should increase the **Swap Space (Virtual RAM)** using your disk storage:

```bash
# Create a 10GB swap file (adjust size as needed)
sudo fallocate -l 10G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make it permanent after reboot
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

3. **Enable Keepalive (Linux/VM only)**:
   Run this once to ensure your API restarts automatically on crashes or reboots:
   ```bash
   chmod +x setup_service.sh
   ./setup_service.sh
   ```

4. **Start the server manually (if not using keepalive)**:
   ```bash
   ./venv/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```

## 🎨 Skeleton Color Guide
- **Body**: Vibrant Neon Green
- **Face**: Soft Gray (Contour mapping)
- **Thumb**: Yellow | **Index**: Cyan | **Middle**: Magenta | **Ring**: Green | **Pinky**: White

## ☁️ Deployment (Oracle Cloud)

### 1. Connection Details
Use your latest SSH key to connect to your instance:
```bash
ssh -i ssh-key-2026-03-23.key ubuntu@134.185.92.120
```

### 2. Update the Code
**Method A: Sync via Git (Recommended)**
If your VM is connected to Git, simply pull the latest changes:
```bash
cd ~/BISIG-API && git pull
```

**Method B: Sync via Rsync**
Run this from your local terminal to sync changes:
```bash
rsync -avz -e "ssh -i ssh-key-2026-03-23.key" \
--exclude 'venv' --exclude '__pycache__' --exclude 'videos' \
--exclude 'skeletons' --exclude 'skeleton_videos' --exclude '.git' \
./ ubuntu@134.185.92.120:~/BISIG-API/
```

### 3. Restart the Server
If you are using the **Keepalive service** (from `setup_service.sh`), simply run:
```bash
sudo systemctl restart bisig
```

### 4. Verify the Deployment
Check the logs to ensure the server started successfully:
```bash
tail -f ~/BISIG-API/server.log
```
