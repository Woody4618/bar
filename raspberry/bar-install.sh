#!/bin/bash

set -e

# Variables
USER_HOME="/home/$(logname)"
TARGET_DIR="$USER_HOME/bar"

# Copy the bar directory to the user's home directory
echo "Copying bar directory to $TARGET_DIR..."
cp -r "$(dirname "$0")/bar" "$TARGET_DIR"
chown -R $(logname):$(logname) "$TARGET_DIR"

# Configure swap file
echo "Configuring swap file..."
sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
sudo /etc/init.d/dphys-swapfile stop
sudo /etc/init.d/dphys-swapfile start

# Install Node.js and npm
if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js and npm..."
  sudo apt update
  sudo apt install -y nodejs npm
  sudo npm install -g tsx
else
  echo "Node.js and npm already installed."
fi

# Install npm dependencies
cd "$TARGET_DIR"
echo "Installing npm dependencies..."
sudo -u $(logname) npm install

echo "Install complete!"

# Call bar-service.sh to set up and start the service
bash "$TARGET_DIR/bar-service.sh" 