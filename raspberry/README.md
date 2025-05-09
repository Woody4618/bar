# Raspberry Pi Setup

## Automatic setup

Copy the all contents of the raspberry folder directly onto the sd card root directory after you have setup the raspberry pi with the normal raspberry OS image using the raspberry pi imager.
Configure the bar_config.txt file with the correct values for the bar. You can setup your bar at letmebuy.app and then copy paste the RPC_URL and BAR_NAME. Use a proper RPC_URL from quicknode, helius or triton that has a good websocket support.

Then ssh into the raspberry pi and run the following commands:

```bash
ssh pi@raspberrypi.local (or whatever you configured when you installed the raspberry pi os)
```

If you want to use the OLED display you need enable the i2c interface:

```bash
sudo raspi-config
```

Navigate to Interfacing Options -> I2C -> Yes and then reboot.

Then run the install script that will install node and npm and install the bar.service that autostarts the bar.ts file:

```bash
sudo chmod +x /boot/firmware/bar-install.sh
sudo /boot/firmware/bar-install.sh
```

Then we setup the wifi service:

First add your wifi connections to the wifi_config.txt file then install and start the service:

```bash
sudo chmod +x wifiSetup/setup-wifi-service.sh
sudo /wifiSetup/setup-wifi-service.sh
```

This will copy the bar folder to your home directory and install all the dependencies.

```bash
systemctl status bar.service
systemctl status wifi-setup.service
journalctl -u bar -f
```

# Manual setup

If you do not want to use the install script you can do the following:

Easiest way to develop on the raspberry pi is to connect from Cursor or VS Code via SSH connect button on the bottom left and then directly copy files over and develop on the raspberry directly.

1. Install dependencies:

```bash
cd raspberry
npm i
```

2. Configure the bar name in `src/bar.ts`:

The barname to the name of your bar and the product are loaded from the bar_config.txt directly from the root folder of the micro SD card. Then the raspberry will show all receipts changes for that bar. If you dont want to use teh config file you would need to hardcode them but easiest is to just copy the bar_config.txt to the root folder of the micro SD card.

You can also setup the script in the autostart of the raspberry pi via a service. See the readme in the raspberry folder for detailed explanation.

I recommend increasing swap space on the pi because the Js scripts are quite memory hungry. Especially when you also want to remote code on the raspbery. You can measure CPU and memory usage with:

```bash
sudo apt install htop
htop
```

3. Increase the swap size to at least 1024MB:

I recommend to increase the swap size to at least 1024MB:

```bash
sudo nano /etc/dphys-swapfile
CONF_SWAPSIZE=1024
```

And then reboot:

```bash
sudo reboot
```

4. Install node and npm:

And then update and install the dependencies:

```bash
sudo apt update
sudo apt install nodejs
sudo apt install npm
```

Then you can run the bar with:

```bash
sudo npx tsx raspberry/src/bar.ts
```

Or if you only want to make sure your pi is setup correctly and see if you can control the servo:

```bash
sudo node servo_test.js
```

Make it autostart with a service:
Create a service or copy the existing one from the repo here:
Adjust the paths to where you have saved the files on your pi.

```bash
[Unit]
Description=Solana Bar Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/bar/Dokumente/raspberry/src
ExecStart=/usr/bin/sudo /usr/bin/npx tsx /home/bar/Dokumente/raspberry/src/bar.ts
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo mv bar.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable bar.service
sudo systemctl start bar.service
sudo systemctl status bar.service
```

If you do not want to use the automatic wifi service from the raspberry folder you can add additonal wifis like this:

```bash
sudo nmcli connection add type wifi con-name "Hotspot" ifname wlan0 ssid "YouriPhoneSSID" wifi-sec.key-mgmt wpa-psk wifi-sec.psk "YouriPhonePassword" connection.autoconnect yes connection.autoconnect-priority 2

sudo nmcli connection up "Hotspot"

nmcli device wifi list
```
