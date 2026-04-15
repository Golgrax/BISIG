#!/bin/bash
# setup_service.sh - Deployment script for systemd
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

# Configuration
APP_DIR="/home/ubuntu/BISIG-API"
SERVICE_NAME="bisig"
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"

echo "🚀 Starting BISIG Service Setup..."

# 1. Detect Python Executable
if [ -d "$APP_DIR/venv" ]; then
    PYTHON_EXEC="$APP_DIR/venv/bin/python3"
    echo "✅ Found virtual environment at $APP_DIR/venv"
else
    PYTHON_EXEC="/usr/bin/python3"
    echo "⚠️ No venv found, using system Python"
fi

# 2. Create the Systemd Service File
echo "📝 Creating systemd service file at $SERVICE_FILE..."

sudo bash -c "cat > $SERVICE_FILE" <<EOF
[Unit]
Description=BISIG Sign Language API (Keepalive)
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=$APP_DIR
# We use stdbuf to ensure logs aren't buffered so they appear in server.log immediately
ExecStart=$PYTHON_EXEC -m uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
StandardOutput=append:$APP_DIR/server.log
StandardError=append:$APP_DIR/server.log

[Install]
WantedBy=multi-user.target
EOF

# 3. Reload and Start
echo "🔄 Reloading systemd and starting service..."
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl restart $SERVICE_NAME

# 4. Final Status
echo "------------------------------------------------"
echo "✨ Setup Complete!"
echo "Your API is now protected by keepalive."
echo "Check status: sudo systemctl status $SERVICE_NAME"
echo "View logs:    tail -f $APP_DIR/server.log"
echo "------------------------------------------------"

sudo systemctl status $SERVICE_NAME --no-pager
