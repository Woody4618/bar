import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LetMeBuy } from "./let_me_buy.js";
import idl from "./let_me_buy.json";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import fs from "fs";

let Gpio, servo, mp3player, i2c, i2cBus, Oled, oled, font;
const isPi = process.platform === "linux";
const hasScreen = isPi; // Or set to true/false based on your needs

if (isPi) {
  Gpio = require("pigpio").Gpio;
  servo = new Gpio(14, { mode: Gpio.OUTPUT });
  mp3player = new Gpio(23, { mode: Gpio.OUTPUT });
} else {
  // Stubs for development on Mac
  servo = {
    servoWrite: (pos: number) => console.log(`[Stub] Servo to ${pos}`),
  };
  mp3player = {
    digitalWrite: (pos: number) => console.log(`[Stub] MP3 player to ${pos}`),
  };
}

// OLED setup
if (hasScreen) {
  i2c = require("i2c-bus");
  i2cBus = i2c.openSync(1);
  Oled = require("oled-i2c-bus");
  font = require("oled-font-5x7");
  oled = new Oled(i2cBus, { width: 128, height: 32, address: 0x3c });
  oled.clearDisplay();
  oled.turnOnDisplay();
} else {
  oled = {
    clearDisplay: () => console.log("[Stub] OLED clear"),
    turnOnDisplay: () => console.log("[Stub] OLED on"),
    turnOffDisplay: () => console.log("[Stub] OLED off"),
    setCursor: () => {},
    writeString: () => {},
    invertDisplay: () => {},
    drawLine: () => {},
  };
  font = {};
}

// Interface for config values
interface BarConfig {
  barName: string;
  pumpDuration: number;
  productName: string;
  rpcUrl: string;
  privateKey: string;
}

// Function to read config from file
function readConfig(): BarConfig {
  try {
    const configPath = "/boot/firmware/bar_config.txt";
    const configContent = fs.readFileSync(configPath, "utf8");

    const barNameMatch = configContent.match(/BAR_NAME=([^\n]+)/);
    const pumpDurationMatch = configContent.match(/PUMP_DURATION=([^\n]+)/);
    const productNameMatch = configContent.match(/PRODUCT_NAME=([^\n]+)/);
    const rpcUrlMatch = configContent.match(/RPC_URL=([^\n]+)/);
    const privateKeyMatch = configContent.match(/PRIVATE_KEY=([^\n]+)/);
    return {
      barName: barNameMatch?.[1]?.trim() || "jonasbar",
      pumpDuration: parseInt(pumpDurationMatch?.[1]?.trim() || "300"),
      productName: productNameMatch?.[1]?.trim() || "Shot",
      rpcUrl: rpcUrlMatch?.[1]?.trim() || "https://api.mainnet-beta.solana.com",
      privateKey: privateKeyMatch?.[1]?.trim() || "",
    };
  } catch (error) {
    console.error("Error reading config file:", error);
    return {
      barName: "jonasbar",
      pumpDuration: 300,
      productName: "Shot",
      rpcUrl: "https://api.mainnet-beta.solana.com",
      privateKey: "",
    };
  }
}

// Read config from file
const config = readConfig();
const BAR_NAME = config.barName;
const PUMP_DURATION = config.pumpDuration;
const DEFAULT_PRODUCT_NAME = config.productName;

// Log the complete configuration
console.log("=== Bar Configuration ===");
console.log("Bar Name:", BAR_NAME);
console.log("Pump Duration:", PUMP_DURATION, "ms");
console.log("Default Product:", DEFAULT_PRODUCT_NAME);
console.log("RPC URL:", config.rpcUrl);
console.log("Private Key:", config.privateKey);
console.log("========================");

// Initialize OLED
const opts = {
  width: 128,
  height: 32,
  address: 0x3c,
};

// Clear and activate display
oled.clearDisplay();
oled.turnOnDisplay();

mp3player.digitalWrite(1);

// Initialize connection
const connection = new Connection(config.rpcUrl);

// Load keypair from environment or use the provided one
const keyPair = config.privateKey
  ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(config.privateKey)))
  : Keypair.generate(); // Generate a new keypair if none provided

console.log("Using keypair with public key:", keyPair.publicKey.toString());

// Initialize wallet and provider
const wallet = new anchor.Wallet(keyPair);
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
anchor.setProvider(provider);

// Initialize program
const program = new Program(idl as anchor.Idl, provider);

console.log("Program ID", program.programId.toString());

// Start listening for shot purchases
startListeningToLedSwitchAccount();

// --- Watchdog and Resubscription Logic ---
let accountChangeSubscriptionId: number | null = null;

function subscribeToAccountChanges(receiptsPDA: PublicKey) {
  accountChangeSubscriptionId = connection.onAccountChange(
    receiptsPDA,
    async (account) => {
      try {
        const decoded = program.coder.accounts.decode("receipts", account.data);
        console.log("Account changed:", JSON.stringify(decoded));

        // Process any undelivered shots
        for (let i = 0; i < decoded.receipts.length; i++) {
          const receipt = decoded.receipts[i];
          if (
            !receipt.wasDelivered &&
            receipt.productName == DEFAULT_PRODUCT_NAME
          ) {
            await pourShotAndMarkAsDelivered(receipt);
            break;
          }
        }

        const product =
          decoded.products.find((p: any) => p.name === DEFAULT_PRODUCT_NAME) ||
          decoded.products[0];
        updateDisplay(product);

        await Promise.all([
          // Display flash sequence
          (async () => {
            oled.invertDisplay(true);
            await sleep(300);
            oled.invertDisplay(false);
          })(),
        ]);
      } catch (error) {
        console.error("Error processing account change:", error);
      }
    },
    "processed"
  );
  console.log(
    "[Subscription] Subscribed to account changes with id:",
    accountChangeSubscriptionId
  );
}

function drawSolanaLogo(x: number, y: number, size: number) {
  // Draw three horizontal lines with 2px thickness
  // Top line
  oled.drawLine(
    1 + x - size / 2,
    y - size / 2,
    2 + x + size / 2,
    y - size / 2,
    1
  );
  oled.drawLine(
    x - size / 2,
    y - size / 2 + 1,
    1 + x + size / 2,
    y - size / 2 + 1,
    1
  );

  // Middle line
  oled.drawLine(x - size / 2, y, 1 + x + size / 2, y, 1);
  oled.drawLine(1 + x - size / 2, y + 1, 2 + x + size / 2, y + 1, 1);

  // Bottom line
  oled.drawLine(
    1 + x - size / 2,
    y + size / 2,
    2 + x + size / 2,
    y + size / 2,
    1
  );
  oled.drawLine(
    x - size / 2,
    y + size / 2 + 1,
    1 + x + size / 2,
    y + size / 2 + 1,
    1
  );
}

function updateDisplay(product?: {
  name: string;
  price: BN;
  decimals: number;
  mint: PublicKey;
}) {
  // Clear display
  oled.clearDisplay();

  // Draw Solana logos on sides
  drawSolanaLogo(15, opts.height / 2, 6);
  drawSolanaLogo(opts.width - 15, opts.height / 2, 6);

  // Use product info if available, otherwise use default text
  const text1 = BAR_NAME;
  const text2 = product ? product.name : DEFAULT_PRODUCT_NAME;
  const text3 = product
    ? `${
        Number(product.price.toString()) / Math.pow(10, product.decimals)
      } USDC`
    : "1 USDC";

  const text1X = (opts.width - text1.length * 6) / 2;
  const text2X = (opts.width - text2.length * 6) / 2;
  const text3X = (opts.width - text3.length * 6) / 2;

  oled.setCursor(text1X, 5);
  oled.writeString(font, 1, text1, 1, true);
  oled.setCursor(text2X, 15);
  oled.writeString(font, 1, text2, 1, true);
  oled.setCursor(text3X, 25);
  oled.writeString(font, 1, text3, 1, true);
}

async function startListeningToLedSwitchAccount() {
  try {
    // Get the receipts PDA with bar name
    const [receiptsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("receipts"), Buffer.from(BAR_NAME.toLowerCase())],
      program.programId
    );

    // Fetch initial state
    const SOLANA_BAR_PROGRAM = new Program<LetMeBuy>(idl as any, provider);

    const receiptsAccount = await SOLANA_BAR_PROGRAM.account.receipts.fetch(
      receiptsPDA
    );
    console.log("Receipts account:", JSON.stringify(receiptsAccount));

    // Process any undelivered shots
    for (let i = 0; i < receiptsAccount.receipts.length; i++) {
      const receipt = receiptsAccount.receipts[i];
      if (
        !receipt.wasDelivered &&
        receipt.productName == DEFAULT_PRODUCT_NAME
      ) {
        await pourShotAndMarkAsDelivered(receipt);
        break;
      }
    }

    // Initial display update with the first product if available
    const firstProduct = receiptsAccount.products?.[0];
    updateDisplay(firstProduct);

    // When a purchase happens, flash the display
    subscribeToAccountChanges(receiptsPDA);
  } catch (error) {
    console.error("Error in startListeningToLedSwitchAccount:", error);
  }
}

// Define servo positions in microseconds (PWM pulse width)
const NEUTRAL_POSITION = 1500; // Servo at rest - no button press
const PRESS_POSITION = 1900; // Servo position for button press

// Function to perform a single button press
async function pressButton() {
  try {
    // Probaqbly dont need to go to neutral first
    // servo.servoWrite(NEUTRAL_POSITION);
    // console.log("Servo in neutral position");
    // await new Promise((resolve) => setTimeout(resolve, 200));

    // Press the button
    console.log("Pressing button...");
    servo.servoWrite(PRESS_POSITION);

    // Hold for 200ms
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Return to neutral position
    console.log("Releasing button...");
    servo.servoWrite(NEUTRAL_POSITION);
  } catch (error) {
    console.error("Error during button press:", error);
  }
}

// Initialize servo to neutral position
servo.servoWrite(NEUTRAL_POSITION);
console.log("Servo initialized to neutral position");

async function pourShotAndMarkAsDelivered(receipt: any) {
  try {
    console.log(
      "Starting to pour shot for receipt ID:",
      receipt.receiptId.toString()
    );
    await pressButton();

    // Play the shot sound by writing 0 to the mp3player pin for short time
    mp3player.digitalWrite(0);
    await sleep(300);
    mp3player.digitalWrite(1);

    console.log(
      "Finished pouring for receipt ID:",
      receipt.receiptId.toString()
    );

    // Create and send the transaction
    const tx = await program.methods
      .markAsDelivered(BAR_NAME, receipt.receiptId)
      .accounts({
        signer: wallet.publicKey,
      })
      .rpc();

    // console.log("Shot marked as delivered. Signature:", signature);
  } catch (error) {
    console.error("Error in pourShotAndMarkAsDelivered:", error);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

process.on("SIGINT", () => {
  oled.clearDisplay();
  oled.turnOffDisplay();
  mp3player.digitalWrite(1);
  console.log("\nExiting...");
  servo.servoWrite(NEUTRAL_POSITION);
  process.exit();
});
