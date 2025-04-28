# WiFi Setup Service for Raspberry Pi

This service automatically configures and manages WiFi connections on your Raspberry Pi using NetworkManager. No need for a monitor or keyboard. Can directly edit the config file on the SD card from your computer.

## Files

- `wifi_config.txt`: Example configuration file for WiFi networks
- `wifi-setup.sh`: Main script that configures WiFi connections
- `wifi-setup.service`: Systemd service file
- `setup-wifi-service.sh`: Installation script

## Installation

1. Create the setup directory:

```bash
mkdir ~/wifiSetup
cd ~/wifiSetup
```

2. Copy all files into the directory on the pi:

- `wifi_config.txt`
- `wifi-setup.sh`
- `wifi-setup.service`
- `setup-wifi-service.sh`

3. Make the installation script executable:

```bash
chmod +x setup-wifi-service.sh
```

4. Run the installation script:

```bash
sudo ./setup-wifi-service.sh
```

5. Edit the WiFi configuration:
The nice thing is this you can also do directly on the SD card from your computer. So if you move somewhere to a new wifi you can just plug in the SD card and edit the file to setup a new wifi. No screen required.

```bash
sudo nano /boot/firmware/wifi_config.txt
```

The format you can see in the example file.

```
SSID,password,priority
```

Example:

```
HomeWifi,YourPassword,3
YourIphoneHotSpot,YourPassword,2
YourHotSpot,YourPassword,1
```

Higher priority number = higher priority (tried first).
Automatically connects to the next one if the first one is not available.

## Logs

Check the logs at:

```bash
sudo tail -f /var/log/wifi-setup.log
```

## Service Management

- Check service status:

```bash
sudo systemctl status wifi-setup.service
```

- Restart service:

```bash
sudo systemctl restart wifi-setup.service
```

- Stop service:

```bash
sudo systemctl stop wifi-setup.service
```

- Disable service:

```bash
sudo systemctl disable wifi-setup.service
```

Update and restart the service after a change:

```bash
sudo cp wifi-setup.sh /usr/local/bin/
sudo systemctl restart wifi-setup.service
sudo systemctl status wifi-setup.service
sudo journalctl -u wifi-setup.service -f
```

## Troubleshooting

If you encounter any issues:

1. Check the service logs:

```bash
sudo journalctl -u wifi-setup.service -f
```

2. Verify the configuration file exists:

```bash
ls -l /boot/firmware/wifi_config.txt
```

3. Check NetworkManager status:

```bash
sudo systemctl status NetworkManager
```

4. View available WiFi networks:

```bash
nmcli device wifi list
```
