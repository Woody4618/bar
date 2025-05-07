#!/bin/bash

set -e

USER_HOME="/home/$(logname)"
TARGET_DIR="$USER_HOME/bar"
SERVICE_NAME="bar"

# Create systemd service
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
echo "Creating systemd service at $SERVICE_FILE..."
sudo tee "$SERVICE_FILE" > /dev/null <<EOL
[Unit]
Description=Bar Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$TARGET_DIR
ExecStart=tsx src/bar.ts
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOL

# Enable and start the service
echo "Reloading systemd and enabling service..."
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl restart $SERVICE_NAME

echo "Setup complete! Service status:"
sudo systemctl status $SERVICE_NAME --no-pager 