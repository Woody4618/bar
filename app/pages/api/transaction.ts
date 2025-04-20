// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import {
  CONNECTION,
  LET_ME_BUY_PROGRAM,
  getReceiptsPDA,
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
  console.log(req.query);
  const storeName = getFromPayload(req, "Query", "storeName");
  const productName = getFromPayload(req, "Query", "productName");
  const productPrice = getFromPayload(req, "Query", "productPrice");
  const productDecimals = getFromPayload(req, "Query", "productDecimals");
  const icon = "https://www.letmebuy.app/icon.png";

  let label = "Let me buy";
  if (productName && storeName) {
    const price =
      productPrice && productDecimals
        ? (
            Number(productPrice) / Math.pow(10, Number(productDecimals))
          ).toFixed(2)
        : "0.00";
    label = `Buy 1 of ${productName} at ${storeName} - ${price} USDC`;
  }

  res.status(200).json({
    label,
    icon,
  });
};

const post = async (req: NextApiRequest, res: NextApiResponse<POST>) => {
  const accountField = getFromPayload(req, "Body", "account");
  const instructionField = getFromPayload(req, "Query", "instruction");
  const productName = getFromPayload(req, "Query", "productName");
  const storeName = getFromPayload(req, "Query", "storeName");
  const tableNumber = getFromPayload(req, "Query", "tableNumber");

  if (!storeName || !productName || !tableNumber) {
    res.status(400).send({
      transaction: "",
      message: "",
      error: "Missing required parameters",
    });
    return;
  }

  const sender = new PublicKey(accountField);
  const RECEIPTS_PDA = getReceiptsPDA(storeName);

  const transaction = new Transaction();
  const latestBlockhash = await CONNECTION.getLatestBlockhash();
  transaction.feePayer = sender;
  transaction.recentBlockhash = latestBlockhash.blockhash;

  let message;
  if (instructionField == "buy_shot") {
    // Get the receipts account to find the product
    const receiptsAccount = await LET_ME_BUY_PROGRAM.account.receipts.fetch(
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

    let ix = await LET_ME_BUY_PROGRAM.methods
      .makePurchase(storeName, productName, Number(tableNumber))
      .accounts({
        signer: sender,
        authority: new PublicKey(receiptsAccount.authority),
        mint: new PublicKey(product.mint),
        senderTokenAccount,
      })
      .instruction();

    transaction.add(ix);

    const price = Number(product.price) / Math.pow(10, product.decimals);
    message = `Buy 1 ${productName} at ${storeName} - ${price} USDC!`;
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
