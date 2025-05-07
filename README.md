# Let Me Buy - A Solana powered Raspberrypi drink dispenser 

A decentralized bar system built on Solana that allows users to purchase drinks using USDC, connected to a Raspberry Pi that shows the product and plays a sound as soon as the transaction is confirmed, and also sends Telegram notifications to a channel for tracking sales and table deliveries.

[Live Version of the app](https://letmebuy.app/)

Here you can just create your own bar and use the page on a screen to sell items.
You can also print out the qr codes and create a menu for each table. The qr codes are static and work as long as the web nextjs app api is deployed somewhere, for example on vercel. You can either deploy your own or use the one that is deployed already.

<img src="https://github.com/user-attachments/assets/4fa413e9-2b92-4ed2-b0d1-1c0954099cae" width="300"/>

Here is a Video of how the bar looks like in action. And its not hard to build! 
https://x.com/SolPlay_jonas/status/1915380491852697746 



https://github.com/user-attachments/assets/733e8308-1a5e-40e5-a47d-d9935279a92e



## Features

- Purchase drinks using USDC or other SPL tokens via Solana Pay QR codes
- Real-time product display on Raspberry Pi OLED screen
- Sound notification on successful purchases
- Automatic Telegram notifications for sales tracking
- Multi-product support with configurable prices for any SPL token or SOL
- Receipt tracking and management
- Bar setup and configuration interface

---

## 🛒 What You Need to Build This Project

- [ ] **Raspberry Pi Zero 2WH** (https://www.amazon.de/dp/B0DB2JBD9C)
- [ ] **Jumper wires, breadboard, and basic electronics tools** (https://www.amazon.de/dp/B0CFXZDBVY?ref=ppx_yo2ov_dt_b_fed_asin_title)
- [ ] **Servo motor to press the pump button** (https://www.amazon.de/dp/B07KPS9845)
- [ ] **Micro SD card for Raspberry Pi (32GB+)** (Any will work as long as it fits in the raspberry pi. Better take a good one)
            
Any of these different pumps:
- [ ] **Wine dispenser one press** (https://www.amazon.de/dp/B0CD7BDWMN)
- [ ] **Wine dispenser hold press** (https://www.amazon.de/dp/B0DBHJBKCC)
- [ ] **Jägermeister dispenser** (https://de.jagermeister.com/shop/equipment/jaegermeister-mini-shot-machine)

There is some [starter kits](https://www.amazon.de/dp/B06VTH7L28) which contains the servo and some cables if you want to have some more options. For examples you can add a distance sensor, or some motor or something else to your bar project.

Optional:

If you want to show the current product on a screen or play a sound when a purchase is made you can add the following:
I would also recommend one of the power solutions to power the raspberry pi and the pump so you dont neet to have it connected to a cable all the time. The X306 is a bit easer to setup and has more power. But the PiSugar is a bit smaller and cuter.

- [ ] **OLED display (I2C interface, 128x64, 0.96") (optional)** (https://www.amazon.de/dp/B074N9VLZX)
- [ ] **DFPlayer Mini MP3 Player Module (optional)** (https://www.amazon.de/dp/B0DRGCC1M6)
- [ ] **Speaker (optional)** (https://www.amazon.de/dp/B09PL6XFHC)
- [ ] **Micro SD card for DFPlayer Mini (under 4GB)** (Any will work. Just put the mp3s in the mp3 folder and then you can play them with the DFPlayer Mini)
- [ ] **Power bank (optional)** (Needs to be a good powerbank that can supply 5V constantly)
- [ ] **WIFI USB Stick (optional for mobile data)** (I tested the ZTE WCDMA Technologies MSM ZTE Mobile Broadband and it worked well for germany. Also need a sim card with data in that case)
- [ ] **USP Power Solution PISugar 1200mAh** (https://www.amazon.de/dp/B08D678XPR)
- [ ] **X306 V1.3 Ultra-Thin UPS Shield 3800mAh** (https://www.amazon.de/dp/B0B77M4Q4M)
- [ ] **X306 Batteries** (https://www.amazon.de/dp/B0DCK4PTXS)

---

## Hardware Setup

<img width="1348" alt="image" src="https://github.com/user-attachments/assets/cab48154-ee3d-4ed2-b9d5-a046f316b50f" />

1. Connect the Servo to press the button. It will be controlled via GPIO 14

- Connect the Brown cable to GND for example pin 6
- Connect the Red Cable to 5V pin 2 or 4
- Connect the yellow cable, control pin to GPIO 14 which is pin 8 

3. Connect the OLED display:

A detailed guide on how to connect the OLED display to the raspberry pi can be found [here](https://github.com/solana-developers/solana-depin-examples/tree/main/Raspberry-LED-display)

- SDA to GPIO 2 (pin 3)
- SCL to GPIO 3 (pin 5)
- VCC to 3.3V (pin 1)
- GND to ground (pin 6)

3. Connect DFPlayer Mini MP3:
   - Follow the instructions [here](https://www.az-delivery.de/MTHRZKKB) to connect the DFPlayer Mini MP3 to the raspberry pi
   - Put an mp3 file in the DFPlayer Mini MP3 folder on the sd card
   - Make sure the file name is "0001_YOURSONGNAME.mp3"
   - Make sure the file is in a folder called "mp3"
   - The red LED on the DFPlayer Mini MP3 should light up when the file is playing it will not light up all the time.
   - To test if the DFPlayer Mini MP3 is working you can connect a speaker and power and then connect the bottom right two pins for a short time and it will play the first song.

- 3V to 3V or 5V Pin 1, 2 or 4  on the Raspberry Pi whatever you still have free
- Connect your 3w Speaker to two speaker pins
- GNG to any GND on the raspberry pi for example pin 34
- The Trigger port 1 to GPIO 23 (pin 16) this one wil play the first song on the DFPlayer Mini MP3 card whenever a purchase is made.

<img width="687" alt="image" src="https://github.com/user-attachments/assets/22eb901b-a653-4eb9-9bbd-801ca611aab8" />


## Software Setup

You can directly use the bar at https://letmebuy.app/ you only need to deploy a new program if you want to do changes to the bar or want your own unique frontend design.

1. Clone the repository:

```bash
git clone https://github.com/Woody4618/bar
cd bar
```

2. Install dependencies:

```bash
# For the web app
cd app
yarn install

# For the Raspberry Pi
cd raspberry
yarn install
```

3. Configure environment variables:

The deployed bar already comes with a setup bot and you need to just add the LetMeBuyBot to your channel.

If you want to use your own bot you can create a telegram token by talking to [BotFather](https://core.telegram.org/bots/tutorial). You basically just ask the botfather if he can create you a bot using /newbot and then you can use the token he gives you.

```bash
# Create .env.local in app directory
TELEGRAM_BOT_TOKEN=your_bot_token_here
RPC_URL=https://api.mainnet-beta.solana.com
```

4. Start the development server:

```bash
cd app
yarn dev
```

## Bar Configuration

1. Create a new bar:

   - Visit `/bar/your-bar-name/setup`
   - Connect your wallet
   - Initialize the bar

2. Add products:

   - Set product names and prices in USDC. Other SPL tokens work as well and can be added to the list
   - Configure Telegram notifications
   - Manage receipts

3. Set up Telegram notifications:
   - Create a Telegram channel
   - Add your bot as an administrator
   - Configure the channel ID in the bar setup

## Raspberry Pi Setup

**For detailed Raspberry Pi setup instructions, see [`raspberry/README.md`](raspberry/README.md).**

There is an install script in the raspberry folder that will install the dependencies and configure the bar script as a service if you want to automate the setup.

Easiest way to develop on the raspberry pi is to connect from Cursor or VS Code via SSH connect button on the bottom left and then directly copy files over and develop on the raspberry directly.

1. Install dependencies:

```bash
cd raspberry
yarn install
```

2. Configure the bar name in `src/bar.ts`:

Set the barname to the name of your bar and the product are loaded from the bar_config.txt directly from the root folder of the micro SD card. Then the raspberry will show all receipts changes for that bar.

3. Start the service:

```bash
npx tsx src/bar.ts
```

You can also setup the script in the autostart of the raspberry pi via a service. See the readme in the raspberry folder for detailed explanation.

## Development

The project consists of four main components:

1. Solana Program (`programs/solana-bar/`):

   - Handles bar initialization
   - Manages product and receipt accounts
   - Processes purchases

2. Web Interface (`app/`):

   - Bar setup and management
   - Product configuration
   - QR code generation for purchases

3. Raspberry Pi Service (`raspberry/`):

   - Monitors receipt account
   - Displays product information on OLED
   - Plays sound notifications on receipts changes

4. Telegram notifications:
   - Sends notifications to a specific channel when a purchase is made
   - This is done via a [Helius webhook](https://docs.helius.dev/data-streaming/webhooks) that calls the end point api/webhooktg
   - This api endpoint parses the anchor events out of the transactions and then uses the Telegram token to send a message to the channel that is configured in the bar setup

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

_For detailed Raspberry Pi setup, troubleshooting, and advanced configuration, see [`raspberry/README.md`](raspberry/README.md)._

# To connect to respberry pi via USB-C port

add `dtoverlay=dwc2` to config.txt

and `... rootwait modules-load=dwc2,g_ether ...` to cmdline.txt

reboot.

On Raspberry pi zero you can just use the usb-c port.
For raspberry pi 5 you need to use a ethernet to usbc port adapter.

Use `ifconfig` to see the connection.

If you pi is slow you may need more swap space. You can measure CPU and memory usage with:

```bash
sudo apt install htop
htop
```

And i recommend to increase the swap size to at least 1024MB:

```bash
sudo nano /etc/dphys-swapfile
CONF_SWAPSIZE=1024
```

And then reboot:

```bash
sudo reboot
```

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
sudo mv bar-button.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable bar-button.service
sudo systemctl start bar-button.service
sudo systemctl status bar-button.service
```

Add additonal wifis:

```bash
sudo nmcli connection add type wifi con-name "Hotspot" ifname wlan0 ssid "YouriPhoneSSID" wifi-sec.key-mgmt wpa-psk wifi-sec.psk "YouriPhonePassword" connection.autoconnect yes connection.autoconnect-priority 2

sudo nmcli connection up "Hotspot"

nmcli device wifi list
```

# Connect the Raspberry to the internet

By default this project uses WIFI. But if you want to you can also connect it to 4g, LTE or Lorawan to work anywhere.
Here are some options:

## Use raspberry pi with a WIFI USB Stick

1. Buy a sim card with data and activate it
2. Buy a WIFI USB Stick. For germany i tested ZTE WCDMA Technologies MSM ZTE Mobile Broadband and it worked well.
3. Connect the WIFI USB Stick to the raspberry pi via usb to micro usb and connect it to the USB port of the pi. Not the power port since that may be blocked by out power solution for the raspberry pi.
4. In most cases it should be detected automatically and you can just use it.

Check if the modem is detected:

```bash
lsusb
...
Bus 001 Device 008: ID 19d2:1405 ZTE WCDMA Technologies MSM ZTE Mobile Broadband
Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
```

Then you can if the raspberry does atually use the modem:

```bash
nmcli device
...
eth0           ethernet  connected               Wired connection 1
```

It will most likely be showed as Wired connection 1.
You can also check if the raspberry actually uses the modem using:

```bash
ip route
```

## Use Raspberry pi 4G Hat

1. Buy a 4G Hat. For example the [Waveshare SIM7600G-H 4G HAT](https://www.amazon.de/dp/B0BD544MRN)
2. Connect the 4G Hat to the raspberry pi via the GPIO pins.
3. Connect the 4G Hat to the internet via the sim card.

## Use Lorawan

1. Buy a Lorawan Devboard. I tried with the HTCC-AB02S and it worked well.

Check out the more detailed Lorawan README [here](LorawanConnection_README.md)
