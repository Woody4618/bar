# Let Me Pay

A decentralized bar system built on Solana that allows users to purchase drinks using USDC, connected to a Raspberry Pi that shows the product and plays a sound as soon as the transaction is confirmed, and also sends Telegram notifications to a channel for tracking sales and table deliveries.

![Live Version WIP](https://bar-six-self.vercel.app/)

Here you can just create your own bar and use the page on a screen to sell items.
You can also print out the qr codes and create a menu for each table. The qr codes are static and work as long as the web nextjs app api is deployed somewhere, for example on vercel.

## Features

- Purchase drinks using USDC or other SPL tokens via Solana Pay QR codes
- Real-time product display on Raspberry Pi OLED screen
- Sound notification on successful purchases
- Telegram notifications for sales tracking
- Multi-product support with configurable prices for any SPL token or SOL
- Receipt tracking and management
- Bar setup and configuration interface

## Prerequisites

- Node.js and npm/yarn
- Solana CLI tools
- A Solana mobile wallet (Solflare works best at the moment, but also works with Phantom, Backpack, etc.)
- A Telegram channel to send notifications to
- A Helius account to stream the Solana blockchain data
- Raspberry Pi 4B (or 5 or similar) with WiFi connection (Raspberry zero would need some changes but needs less power which would be good for the battery life)
- OLED display (I2C interface, AZDelivery OLED Parent 128 x 64 Pixel 0.96 Inches)
- Speaker or audio output device (DFPlayer Mini MP3 Player Modul)
- 2 Micro sd cards, one for raspberry pi os (16Gb for example) and one for the DFPlayer Mini sound chip (Under 4 Gb is enough)
- Power bank (optional so you can use the raspberry pi without a power supply which is cool :))

## Hardware Setup

1. Connect the OLED display:

A detailed guide on how to connect the OLED display to the raspberry pi can be found [here](https://github.com/solana-developers/solana-depin-examples/tree/main/Raspberry-LED-display)

- SDA to GPIO 2 (pin 3)
- SCL to GPIO 3 (pin 5)
- VCC to 3.3V (pin 1)
- GND to ground (pin 6)

2. Connect DFPlayer Mini MP3:
   - Follow the instructions [here](https://www.az-delivery.de/MTHRZKKB) to connect the DFPlayer Mini MP3 to the raspberry pi
   - Put an mp3 file in the DFPlayer Mini MP3 folder on the sd card
   - Make sure the file name is "0001_YOURSONGNAME.mp3"
   - Make sure the file is in a folder called "mp3"
   - The red LED on the DFPlayer Mini MP3 should light up when the file is playing it will not light up all the time.
   - To test if the DFPlayer Mini MP3 is working you can connect a speaker and power and then connect the bottom right two pins for a short time and it will play the first song.

## Software Setup

You can directly use the bar at https://bar-six-self.vercel.app/ you only need to deploy a new program if you want to do changes to the bar or want your own unique frontend design.

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

The deployed bar already comes with a setup bot and you need to just add the solanabarbot to your channel.

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

Easiest way to develop on the raspberry pi is to connect from cursor or Vs code via SSH connect button on the bottom left and then directly copy files over and develop on the raspberry directly.

1. Install dependencies:

```bash
cd raspberry
yarn install
```

2. Configure the bar name in `src/bar.ts`:

Set the barname to the name of your bar. Then the respberry will show all receipts changes for that bar.

```typescript
const BAR_NAME = "your-bar-name";
```

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
