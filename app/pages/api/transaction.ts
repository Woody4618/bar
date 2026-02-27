// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import {
  CONNECTION,
  LET_ME_BUY_PROGRAM,
  getReceiptsPDA,
  KORA_RPC_URL,
  USDC_MINT,
} from "@/src/util/const";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { KoraClient } from "@solana/kora";

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

// This is only needed because we still use web3js. Its a bit of an older project. 
// TODO: convert all to kit 
function convertKoraInstruction(koraIx: any): TransactionInstruction {
  const keys = koraIx.accounts.map((acc: any) => ({
    pubkey: new PublicKey(acc.address),
    isSigner: acc.role === 2 || acc.role === 3,
    isWritable: acc.role === 1 || acc.role === 3,
  }));

  let data: Buffer;
  if (koraIx.data instanceof Uint8Array) {
    data = Buffer.from(koraIx.data);
  } else if (Array.isArray(koraIx.data)) {
    data = Buffer.from(koraIx.data);
  } else if (typeof koraIx.data === "string") {
    data = Buffer.from(koraIx.data, "base64");
  } else {
    data = Buffer.from(koraIx.data);
  }

  return new TransactionInstruction({
    keys,
    programId: new PublicKey(koraIx.programAddress),
    data,
  });
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
    label = `Buy 1 of ${productName} at ${storeName} - ${price}`;
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
  const gasless = getFromPayload(req, "Query", "gasless") === "true";

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

  let message;
  if (instructionField == "buy_shot") {
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

    const senderTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(product.mint),
      sender
    );

    const purchaseIx = await LET_ME_BUY_PROGRAM.methods
      .makePurchase(storeName, productName, Number(tableNumber))
      .accounts({
        signer: sender,
        authority: new PublicKey(receiptsAccount.authority),
        mint: new PublicKey(product.mint),
        senderTokenAccount,
      })
      .instruction();

    let tokenName = "USDC";
    if (product.mint == "FLJYGHpCCcfYUdzhcfHSeSd2peb5SMajNWaCsRnhpump") {
      tokenName = "STORE";
    }
    const price = Number(product.price) / Math.pow(10, product.decimals);

    if (gasless) {
      try {
        const kora = new KoraClient({ rpcUrl: KORA_RPC_URL });
        const { signer_address } = await kora.getPayerSigner();
        const koraFeePayer = new PublicKey(signer_address);

        const estimateBlockhash = await kora.getBlockhash();
        const estimateTx = new Transaction();
        estimateTx.recentBlockhash = estimateBlockhash.blockhash;
        estimateTx.feePayer = koraFeePayer;
        estimateTx.add(purchaseIx);

        const estimateWire = estimateTx
          .serialize({ requireAllSignatures: false, verifySignatures: false })
          .toString("base64");

        const paymentInfo = await kora.getPaymentInstruction({
          transaction: estimateWire,
          fee_token: USDC_MINT.toBase58(),
          source_wallet: sender.toBase58(),
        });

        const feeAmount = Number(paymentInfo.payment_amount) / 1e6;

        const finalBlockhash = await kora.getBlockhash();
        const finalTx = new Transaction();
        finalTx.recentBlockhash = finalBlockhash.blockhash;
        finalTx.feePayer = koraFeePayer;
        finalTx.add(purchaseIx);

        if (paymentInfo.payment_instruction) {
          const paymentIx = convertKoraInstruction(paymentInfo.payment_instruction);
          finalTx.add(paymentIx);
        }

        const unsignedWire = finalTx
          .serialize({ requireAllSignatures: false, verifySignatures: false })
          .toString("base64");

        const { signed_transaction } = await kora.signTransaction({
          transaction: unsignedWire,
          signer_key: signer_address,
        });

        message = `Buy 1 ${productName} - ${price} ${tokenName} (gasless, fee: ${feeAmount.toFixed(4)} USDC)`;
        res.status(200).send({ transaction: signed_transaction, message });
        return;
      } catch (error) {
        console.error("Gasless transaction error:", error);
        res.status(500).send({
          transaction: "",
          message: "",
          error: "Failed to build gasless transaction: " + (error as Error).message,
        });
        return;
      }
    } else {
      const transaction = new Transaction();
      const latestBlockhash = await CONNECTION.getLatestBlockhash();
      transaction.feePayer = sender;
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.add(purchaseIx);

      message = `Buy 1 ${productName} at ${storeName} - ${price} ${tokenName}!`;

      const serializedTransaction = transaction.serialize({
        verifySignatures: false,
        requireAllSignatures: false,
      });
      const base64Transaction = serializedTransaction.toString("base64");
      res.status(200).send({ transaction: base64Transaction, message });
      return;
    }
  } else {
    message = "Unknown instruction";
    res.status(400).send({ transaction: "", message, error: "Unknown instruction" });
  }
};
