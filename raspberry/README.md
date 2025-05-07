# Raspberry Pi Setup

## How to make autostart:

Copy the all contents of the raspberry folder directly onto the sd card root directory after you have setup the raspberry pi with the normal raspberry OS image using the raspberry pi imager.
Configure the bar_config.txt file with the correct values for the bar. You can setup your bar at letmebuy.app and then copy paste the RPC_URL and BAR_NAME. Use a proper RPC_URL from quicknode or triton that has a good websocket support.

Then ssh into the raspberry pi and run the following commands:

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
