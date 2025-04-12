// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import {
  CONNECTION,
  RECEIPTS_PDA,
  SOLANA_BAR_PROGRAM,
  TOKEN_PROGRAM_ID,
} from "@/src/util/const";
import { getAssociatedTokenAddress } from "@solana/spl-token";

type POST = {
  transaction: string;
  message: string;
  error?: string;
};

type GET = {
  label: string;
  icon: string;
};

function getFromPayload(req: NextApiRequest, type: string, field: string) {
  if (type === "Body") {
    return req.body[field];
  } else if (type === "Query") {
    return req.query[field];
  }
  return null;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    return get(req, res);
  }

  if (req.method === "POST") {
    return post(req, res);
  }
}

const get = async (req: NextApiRequest, res: NextApiResponse<GET>) => {
  const label = "Solana Shots";
  const icon =
    "https://media.discordapp.net/attachments/964525722301501477/978683590743302184/sol-logo1.png";

  res.status(200).json({
    label,
    icon,
  });
};

const post = async (req: NextApiRequest, res: NextApiResponse<POST>) => {
  const accountField = getFromPayload(req, "Body", "account");
  const instructionField = getFromPayload(req, "Query", "instruction");
  const productName = getFromPayload(req, "Query", "productName");

  const sender = new PublicKey(accountField);

  const transaction = new Transaction();
  const latestBlockhash = await CONNECTION.getLatestBlockhash();
  transaction.feePayer = sender;
  transaction.recentBlockhash = latestBlockhash.blockhash;

  let message;
  if (instructionField == "buy_shot") {
    // Get the receipts account to find the product
    const receiptsAccount = await SOLANA_BAR_PROGRAM.account.receipts.fetch(
      RECEIPTS_PDA
    );
    const products = receiptsAccount.products as any[];
    const product = products.find((p) => p.name === productName);

    if (!product) {
      res.status(400).send({
        transaction: "",
        message: "",
        error: "Product not found",
      });
      return;
    }

    // Get token accounts
    const senderTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(product.mint),
      sender
    );
    const recipientTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(product.mint),
      new PublicKey("GsfNSuZFrT2r4xzSndnCSs9tTXwt47etPqU8yFVnDcXd")
    );

    let ix = await SOLANA_BAR_PROGRAM.methods
      .buyShot(productName)
      .accounts({
        receipts: RECEIPTS_PDA,
        signer: sender,
        treasury: new PublicKey("GsfNSuZFrT2r4xzSndnCSs9tTXwt47etPqU8yFVnDcXd"),
        systemProgram: SystemProgram.programId,
        mint: new PublicKey(product.mint),
        senderTokenAccount,
        recipientTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    transaction.add(ix);

    message = `Buy ${productName}!`;
  } else {
    message = "Unknown instruction";
  }

  // Serialize and return the unsigned transaction.
  const serializedTransaction = transaction.serialize({
    verifySignatures: false,
    requireAllSignatures: false,
  });

  const base64Transaction = serializedTransaction.toString("base64");

  res.status(200).send({ transaction: base64Transaction, message });
};
