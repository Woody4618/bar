import { Connection } from "@solana/web3.js";
import idl from "./solana_bar.json";
import {
  createProviderForConnection,
  parseAnchorTransactionEvents,
} from "@solana-developers/helpers";
import { Idl } from "@coral-xyz/anchor";
import { NextApiRequest, NextApiResponse } from "next";

// Telegram bot token from environment variable
// const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(channelId: string, message: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    console.log("Sending message to channel:", channelId);
    console.log("Message content:", message);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: channelId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const responseData = await response.json();
    console.log("Telegram API response:", responseData);

    if (!response.ok) {
      throw new Error(
        `Telegram API error: ${response.statusText} - ${JSON.stringify(
          responseData
        )}`
      );
    }

    return responseData;
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle GET requests (test endpoint)
  if (req.method === "GET") {
    const { test, channelId } = req.query;

    if (test === "true") {
      try {
        if (!channelId) {
          return res.status(400).json({ error: "Channel ID is required" });
        }

        const testMessage = `Table 4 ordered a beer. (${new Date().toLocaleTimeString()})`;

        await sendTelegramMessage(channelId as string, testMessage);

        return res.status(200).json({ success: true });
      } catch (error) {
        console.error("Error sending test message:", error);
        return res.status(500).json({ error: "Failed to send test message" });
      }
    }

    return res.status(200).json({ message: "Hello, from API!" });
  }

  // Handle POST requests (webhook)
  if (req.method === "POST") {
    try {
      const body = req.body;
      console.log("Received webhook payload:", body);

      const connection = new Connection(process.env.NEXT_PUBLIC_RPC!);
      const transaction = body[0]; // Since the webhook sends an array

      // Parse events from the transaction
      if (transaction && transaction.signature) {
        const provider = await createProviderForConnection(connection);

        const events = await parseAnchorTransactionEvents(
          idl as Idl,
          transaction.signature,
          provider
        );
        console.log("Parsed Anchor events:", events);

        const purchaseEvent = events.find((e) => e.name === "shotPurchased");

        if (purchaseEvent) {
          console.log("ShotPurchased event:", purchaseEvent);

          // Skip if no Telegram channel ID is set
          if (!purchaseEvent.data.telegramChannelId) {
            console.log("Skipping Telegram notification - no channel ID set");
            return res.status(200).json({ success: true });
          }

          // Concise message format
          const message = `Table ${purchaseEvent.data.tableNumber} ordered ${
            purchaseEvent.data.productName
          }. (${new Date(
            purchaseEvent.data.timestamp * 1000
          ).toLocaleTimeString()})`;

          // Send the message to the Telegram channel
          await sendTelegramMessage(
            purchaseEvent.data.telegramChannelId,
            message
          );
        }
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  // Handle other HTTP methods
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
