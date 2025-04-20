import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LetMePay } from "./let_me_pay";
import idl from "./let_me_pay.json";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Gpio } from "onoff";
const i2c = require("i2c-bus");
const Oled = require("oled-i2c-bus");
const font = require("oled-font-5x7");
import { BN } from "@coral-xyz/anchor";

// Initialize OLED
const opts = {
  width: 128,
  height: 32,
  address: 0x3c,
};

const i2cBus = i2c.openSync(1);
const oled = new Oled(i2cBus, opts);

// Clear and activate display
oled.clearDisplay();
oled.turnOnDisplay();

// Initialize GPIO 23 as output and set to high (setting 594 because its a raspberry pi 5, can use smth else than onoff package)
const GPIO_23 = new Gpio(594, "out");
GPIO_23.writeSync(1);

// Initialize connection
const connection = new Connection("mainnet-beta");

// Load keypair from environment or use the provided one
const keypair = Keypair.fromSecretKey(
  Uint8Array.from([
    209, 70, 174, 212, 192, 159, 166, 82, 163, 162, 135, 190, 244, 227, 218, 97,
    214, 155, 228, 142, 172, 188, 170, 246, 130, 68, 106, 45, 170, 125, 175, 57,
    12, 253, 44, 189, 234, 23, 239, 220, 85, 57, 231, 86, 130, 27, 99, 62, 106,
    215, 172, 104, 152, 104, 145, 138, 198, 105, 218, 20, 232, 251, 238, 250,
  ])
);
// Or load from File:
/*const keypair = new Uint8Array(
  JSON.parse(
    fs.readFileSync("shoUzmg5H2zDdevxS6UdQCiY6JnP1qSn7fPtCP726pR.json").toString())
  );
  let keyPair = Keypair.fromSecretKey(decodedKey);
*/

// Initialize wallet and provider
const wallet = new anchor.Wallet(keypair);
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
anchor.setProvider(provider);

// Initialize program
const program = new Program(idl as anchor.Idl, { connection });

console.log("Program ID", program.programId.toString());

// Bar name - this should be configured for your specific bar
const BAR_NAME = "foolsgold"; // Replace with your actual bar name

// Start listening for shot purchases
startListeningToLedSwitchAccount();

function drawSolanaLogo(x: number, y: number, size: number) {
    // Draw three horizontal lines with 2px thickness
    // Top line
    oled.drawLine(1+x - size/2, y - size/2, 2+x + size/2, y - size/2, 1);
    oled.drawLine(x - size/2, y - size/2 + 1, 1+x + size/2, y - size/2 + 1, 1);
    
    // Middle line
    oled.drawLine(x - size/2, y, 1+x + size/2, y, 1);
    oled.drawLine(1+x - size/2, y + 1, 2+x + size/2, y + 1, 1);
    
    // Bottom line
    oled.drawLine(1+x - size/2, y + size/2, 2+x + size/2, y + size/2, 1);
    oled.drawLine(x - size/2, y + size/2 + 1, 1+x + size/2, y + size/2 + 1, 1);
}

function updateDisplay(product?: { name: string; price: BN; decimals: number; mint: PublicKey }) {
    // Clear display
    oled.clearDisplay();
    
    // Draw Solana logos on sides
    drawSolanaLogo(15, opts.height/2, 6);
    drawSolanaLogo(opts.width-15, opts.height/2, 6);
    
    // Use product info if available, otherwise use default text
    const text1 = "Buy one";
    const text2 = product ? product.name : "FoolsGold";
    const text3 = product ? `${Number(product.price.toString()) / Math.pow(10, product.decimals)} USDC` : "0.5 USDC";
    
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
    const SOLANA_BAR_PROGRAM = new Program<LetMePay>(idl as any, provider);

    const receiptsAccount = await SOLANA_BAR_PROGRAM.account.receipts.fetch(
      receiptsPDA
    );
    console.log("Receipts account:", JSON.stringify(receiptsAccount));

    // Process any undelivered shots
    for (let i = 0; i < receiptsAccount.receipts.length; i++) {
      const receipt = receiptsAccount.receipts[i];
      if (!receipt.wasDelivered) {
        await pourShotAndMarkAsDelivered(receipt, receiptsPDA);
        break;
      }
    }

    // Reset GPIO
    // Activate the pour mechanism
    GPIO_23.writeSync(0);
    await sleep(300);
    GPIO_23.writeSync(1);

    // Initial display update with the first product if available
    const firstProduct = receiptsAccount.products?.[0];
    updateDisplay(firstProduct);

    // When a purchase happens, flash the display
    connection.onAccountChange(receiptsPDA, async (account) => {
      try {
        const decoded = program.coder.accounts.decode("receipts", account.data);
        console.log("Account changed:", JSON.stringify(decoded));

        // Get the first product from the latest receipt
        const product = decoded.products[0];

        // Flash display
        oled.invertDisplay(true);
        await sleep(300);
        oled.invertDisplay(false);

        // Update display with new product info
        updateDisplay(product);

        // Activate the pour mechanism
        GPIO_23.writeSync(0);
        await sleep(300);
        GPIO_23.writeSync(1);
      } catch (error) {
        console.error("Error processing account change:", error);
      }
    }, "processed");
  } catch (error) {
    console.error("Error in startListeningToLedSwitchAccount:", error);
  }
}

async function pourShotAndMarkAsDelivered(
  receipt: any,
  receiptsPDA: PublicKey
) {
  try {
    console.log(
      "Starting to pour shot for receipt ID:",
      receipt.receiptId.toString()
    );

    // Activate the pour mechanism
    GPIO_23.writeSync(0);
    await sleep(300);
    GPIO_23.writeSync(1);

    console.log(
      "Finished pouring for receipt ID:",
      receipt.receiptId.toString()
    );

    // Create and send the transaction
    // const tx = await program.methods
    //   .markShotAsDelivered(receipt.receiptId)
    //   .accounts({
    //     receipts: receiptsPDA,
    //     signer: wallet.publicKey,
    //   })
    //   .transaction();

    // const signature = await connection.sendTransaction(tx, [keypair], {
    //   skipPreflight: true,
    // });

    // console.log("Shot marked as delivered. Signature:", signature);
  } catch (error) {
    console.error("Error in pourShotAndMarkAsDelivered:", error);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Modify your cleanup handler to include OLED cleanup
process.on("SIGINT", () => {
    oled.clearDisplay();
    oled.turnOffDisplay();
    GPIO_23.writeSync(1);
    process.exit();
});
