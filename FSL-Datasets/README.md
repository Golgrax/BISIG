# BISIG - Filipino Sign Language (FSL) Ecosystem

A high-performance, unified platform for Filipino Sign Language (FSL) translation, learning, and research. This ecosystem combines a Go-based media server, a Node.js/SQLite authentication backend, and a modern React frontend.

## 🚀 Unified Architecture

The system operates as a single entry point through the **Go Unified Server**, which handles routing, media delivery, and intelligent proxying:

- **Frontend**: Served from `/dist` (React/Vite).
- **Media API**: High-performance delivery of 9,900+ FSL videos from `/videos`.
- **Auth/DB Backend**: Proxied via `/api` to a Node.js/SQLite server (Port 3001).
- **Translator API**: Proxied via `/vm-api` to the core FSL translation engine.

## ✨ Key Features
- **Intelligent Video Lookup**: extension-agnostic, variant-aware (e.g., `i-love-you` maps to `I love you (Variant A).mp4`).
- **Full Auth System**: Sign up, Login, and personalized Dashboards with progress tracking.
- **Admin Dashboard**: Verification management for FSL signs.
- **Reverse Proxy**: Seamlessly integrates multiple backends under a single domain/port to avoid CORS issues.

## 📦 Dataset Setup

The 9,921 videos and `api.json` metadata are hosted on **Hugging Face** to keep this repository lightweight.

### 1. Download from Hugging Face
You can download the files directly from the [BISIG FSL Dataset](https://huggingface.co/datasets/Golgrax/bisig-fsl-dataset).

### 2. CLI Setup (Recommended)
If you have the `huggingface-cli` installed, you can clone the data directly into your local folders:

```bash
# Install CLI
pip install -U "huggingface_hub[cli]"

# Download Videos
huggingface-cli download Golgrax/bisig-fsl-dataset --repo-type dataset --local-dir . --include "videos/*"

# Download Metadata
huggingface-cli download Golgrax/bisig-fsl-dataset --repo-type dataset --local-dir . --include "metadata/api.json"
```

## 📁 Project Structure
- `main.go`: The core Go Unified Server (Routing + Proxy).
- `/dist`: The compiled BISIG React frontend.
- `/videos`: 9,921 accurately named FSL `.mp4` files.
- `/metadata`: Indexing data (`api.json`).
- `/server`: Node.js backend (Express + better-sqlite3).

## 📡 API Routes

### 1. Media Delivery
- **Video Index**: `GET /api.json`
- **Video Stream**: `GET /videos/{filename}` or `GET /{filename}`

### 2. Authentication (Proxied)
- **Login**: `POST /api/login`
- **Signup**: `POST /api/signup`
- **User Stats**: `GET /api/user-stats/{userId}`

### 3. Translation (Proxied)
- **Translate**: `GET /vm-api/translate?text={text}&lang=fsl`

## 🛠️ Local Development

1. **Start Node Backend**:
   ```bash
   cd server && npm install && node index.js
   ```
2. **Start Go Server**:
   ```bash
   go build -o fsl-server main.go && ./fsl-server
   ```

## ☁️ Cloud Deployment (Oracle Instance)

### 1. Service Management
The platform is managed by `systemd` for 24/7 availability:
- `fsl-server.service`: Main entry point (Port 8080/8000).
- `fsl-api.service`: Dedicated API mirror.

To restart the ecosystem:
```bash
sudo systemctl restart fsl-server fsl-api
```

### 2. Backend Management
The Node.js auth server runs as a background process on port **3001**:
```bash
cd ~/BISIG_TEMP/server && nohup node index.js > backend.log 2>&1 &
```

### 3. Firewall Ports
- **8080/8000**: Public entry points.
- **3001**: Internal only (proxied by Go).
