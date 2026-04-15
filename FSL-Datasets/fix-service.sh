#!/bin/bash
# fix-service.sh - Maintenance script for FSL-Datasets service
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

# Define the API service content (Port 8080)
API_SERVICE_CONTENT="[Unit]
Description=FSL Video API Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/FSL-Datasets
ExecStart=/home/ubuntu/FSL-Datasets/fsl-server
Restart=always
RestartSec=5
Environment=PORT=8080
StandardOutput=append:/home/ubuntu/FSL-Datasets/api.log
StandardError=append:/home/ubuntu/FSL-Datasets/api.log

[Install]
WantedBy=multi-user.target"

# Define the Frontend service content (Port 8000)
SERVER_SERVICE_CONTENT="[Unit]
Description=FSL Datasets Unified Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/FSL-Datasets
ExecStart=/home/ubuntu/FSL-Datasets/fsl-server
Restart=always
RestartSec=5
Environment=PORT=8000
StandardOutput=append:/home/ubuntu/FSL-Datasets/server.log
StandardError=append:/home/ubuntu/FSL-Datasets/server.log

[Install]
WantedBy=multi-user.target"

# Fix the service files
echo "$API_SERVICE_CONTENT" | sudo tee /etc/systemd/system/fsl-api.service > /dev/null
echo "$SERVER_SERVICE_CONTENT" | sudo tee /etc/systemd/system/fsl-server.service > /dev/null

# Unmask, reload, and restart both
sudo systemctl daemon-reload
sudo systemctl unmask fsl-api fsl-server
sudo systemctl enable fsl-api fsl-server
sudo systemctl restart fsl-api fsl-server

# Check status
sudo systemctl status fsl-api fsl-server
