import { KoraClient } from "@solana/kora";
import {
  Transaction,
  TransactionInstruction,
  PublicKey,
  Connection,
  Commitment,
} from "@solana/web3.js";
import { KORA_RPC_URL, USDC_MINT } from "./const";

let koraClientInstance: KoraClient | null = null;
let koraFeePayerAddress: string | null = null;

export async function getKoraClient(): Promise<KoraClient> {
  if (!koraClientInstance) {
    koraClientInstance = new KoraClient({ rpcUrl: KORA_RPC_URL });
  }
  return koraClientInstance;
}

export async function getKoraFeePayer(): Promise<PublicKey> {
  if (koraFeePayerAddress) {
    return new PublicKey(koraFeePayerAddress);
  }

  const kora = await getKoraClient();
  const { signer_address } = await kora.getPayerSigner();
  koraFeePayerAddress = signer_address;
  return new PublicKey(signer_address);
}

function convertKoraInstruction(
  koraIx: any
): TransactionInstruction {
  console.log("Converting Kora instruction:", JSON.stringify(koraIx, null, 2));
  
  const keys = koraIx.accounts.map((acc: any) => {
    const isSigner = acc.role === 2 || acc.role === 3;
    const isWritable = acc.role === 1 || acc.role === 3;
    console.log(`  Account ${acc.address}: role=${acc.role}, isSigner=${isSigner}, isWritable=${isWritable}`);
    return {
      pubkey: new PublicKey(acc.address),
      isSigner,
      isWritable,
    };
  });

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

export interface GaslessTransactionResult {
  signature: string;
  feeAmount: string;
}

export async function buildAndSendGaslessTransaction(
  purchaseInstruction: TransactionInstruction,
  buyerPublicKey: PublicKey,
  signTransaction: (tx: any) => Promise<any>,
  connection: Connection
): Promise<GaslessTransactionResult> {
  const kora = await getKoraClient();
  const koraFeePayer = await getKoraFeePayer();

  const estimateBlockhash = await kora.getBlockhash();

  const estimateTx = new Transaction();
  estimateTx.recentBlockhash = estimateBlockhash.blockhash;
  estimateTx.feePayer = koraFeePayer;
  estimateTx.add(purchaseInstruction);

  const estimateWire = estimateTx
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString("base64");

  const paymentInfo = await kora.getPaymentInstruction({
    transaction: estimateWire,
    fee_token: USDC_MINT.toBase58(),
    source_wallet: buyerPublicKey.toBase58(),
  });

  const feeAmount = paymentInfo.payment_amount.toString();
  console.log("Kora fee (USDC token units):", feeAmount);

  const finalBlockhash = await kora.getBlockhash();

  const finalTx = new Transaction();
  finalTx.recentBlockhash = finalBlockhash.blockhash;
  finalTx.feePayer = koraFeePayer;
  finalTx.add(purchaseInstruction);

  if (paymentInfo.payment_instruction) {
    const paymentIx = convertKoraInstruction(paymentInfo.payment_instruction);
    finalTx.add(paymentIx);
  }

  const signedTx = await signTransaction(finalTx);

  const serializedTx = signedTx
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString("base64");

  const { signed_transaction } = await kora.signTransaction({
    transaction: serializedTx,
    signer_key: koraFeePayer.toBase58(),
  });

  const signature = await connection.sendRawTransaction(
    Buffer.from(signed_transaction, "base64"),
    { skipPreflight: false, preflightCommitment: "confirmed" as Commitment }
  );

  await connection.confirmTransaction(signature, "confirmed");

  return { signature, feeAmount };
}

export async function estimateGaslessFee(
  purchaseInstruction: TransactionInstruction,
  buyerPublicKey: PublicKey
): Promise<string> {
  const kora = await getKoraClient();
  const koraFeePayer = await getKoraFeePayer();

  const estimateBlockhash = await kora.getBlockhash();

  const estimateTx = new Transaction();
  estimateTx.recentBlockhash = estimateBlockhash.blockhash;
  estimateTx.feePayer = koraFeePayer;
  estimateTx.add(purchaseInstruction);

  const estimateWire = estimateTx
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString("base64");

  const paymentInfo = await kora.getPaymentInstruction({
    transaction: estimateWire,
    fee_token: USDC_MINT.toBase58(),
    source_wallet: buyerPublicKey.toBase58(),
  });

  return paymentInfo.payment_amount.toString();
}
