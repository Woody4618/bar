#!/bin/bash

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Create log directory if it doesn't exist
mkdir -p /var/log

# Create configuration file if it doesn't exist
if [ ! -f "/boot/firmware/wifi_config.txt" ]; then
    echo "Creating default wifi_config.txt..."
    cp wifi_config.txt /boot/firmware/wifi_config.txt
    echo "Please edit /boot/firmware/wifi_config.txt with your WiFi networks"
fi

# Copy the script to the correct location
echo "Installing wifi-setup.sh..."
cp wifi-setup.sh /usr/local/bin/
chmod +x /usr/local/bin/wifi-setup.sh

# Copy the service file
echo "Installing wifi-setup.service..."
cp wifi-setup.service /etc/systemd/system/

# Reload systemd
echo "Reloading systemd..."
systemctl daemon-reload

# Enable the service
echo "Enabling wifi-setup service..."
systemctl enable wifi-setup.service

# Start the service
echo "Starting wifi-setup service..."
systemctl start wifi-setup.service

# Check service status
echo "Checking service status..."
systemctl status wifi-setup.service

echo "Installation complete!"
echo "You can check the logs at /var/log/wifi-setup.log"
echo "Edit /boot/firmware/wifi_config.txt to configure your WiFi networks" 