# How to make autostart:

Replace your path to your file and user or use ai to generate the service file.

```bash
printf '[Unit]\nDescription=Bar Service\nAfter=network.target\n\n[Service]\nType=simple\nUser=jonas\nWorkingDirectory=/home/jonas/Documents/bar/raspberry\nExecStart=/usr/bin/npx tsx src/bar.ts\nRestart=always\nRestartSec=10\n\n[Install]\nWantedBy=multi-user.target' | sudo tee /etc/systemd/system/bar.service
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable bar.service && sudo systemctl start bar.service
```

```bash
systemctl status bar.service
```

# Show current wifi connection:

```bash
iwconfig wlan0 | grep ESSID
```

# Add different wifi connections to wpa_supplicant.conf:

```bash
sudo nano /etc/wpa_supplicant/wpa_supplicant.conf
```

Add you Wifi like this:

```bash
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=DE

network={
    ssid="yourWifiHotSpot"
    psk="password"
    key_mgmt=WPA-PSK
    priority=10
}
network={
    ssid="YourHomeWifi"
    psk="password"
    priority=9
}
network={
    ssid="YourMobileHotspot"
    psk="password"
    key_mgmt=WPA-PSK
    priority=5
}
```
