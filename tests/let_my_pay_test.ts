import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LetMeBuy } from "../target/types/let_me_buy";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
  createMint,
  mintTo,
} from "@solana/spl-token";
import * as fs from "fs";
import assert from "assert";

describe("SolanaStore", () => {
  let mint: PublicKey;
  let recipientTokenAccount: { address: PublicKey };
  let storeName: string;
  let program: Program<LetMeBuy>;
  let wallet: anchor.Wallet;

  anchor.setProvider(anchor.AnchorProvider.env());

  program = anchor.workspace.LetMeBuy as Program<LetMeBuy>;
  wallet = anchor.workspace.LetMeBuy.provider.wallet;
  const connection = program.provider.connection;
  storeName = "teststore";
  const mintKeypair = Keypair.fromSecretKey(
    new Uint8Array(
      JSON.parse(
        fs.readFileSync(
          "./tests/tokSEbdQMxeCZx5GYKR32ywbax6VE4twyqJCYnEtAaC.json",
          "utf-8"
        )
      )
    )
  );

  before(async () => {
    // Create a new mint
    mint = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      wallet.publicKey,
      6,
      mintKeypair
    );

    // Create token account for the recipient
    recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      mint,
      wallet.publicKey
    );

    // Mint tokens to the recipient's account
    await mintTo(
      connection,
      wallet.payer,
      mint,
      recipientTokenAccount.address,
      wallet.publicKey,
      1000000000 // 1000 tokens (9 decimals)
    );

    const myWalletTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      mint,
      new PublicKey("8D8qFHBnvS6oMsJy7EmGTrpoZcGd3aCC3pnPLi93Ag2V")
    );
    await mintTo(
      connection,
      wallet.payer,
      mint,
      myWalletTokenAccount.address,
      wallet.publicKey,
      1000000000 // 1000 tokens (9 decimals)
    );
    await connection.requestAirdrop(
      new PublicKey("8D8qFHBnvS6oMsJy7EmGTrpoZcGd3aCC3pnPLi93Ag2V"),
      1000000000 // 1000 tokens (9 decimals)
    );
  });

  it("Is initialized!", async () => {
    const [receiptsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("receipts"), Buffer.from(storeName)],
      program.programId
    );

    console.log("Receipts", receiptsPDA);

    // Initialize the receipts account
    const initializeTx = await program.methods
      .initialize(storeName)
      .accounts({
        authority: wallet.publicKey,
      })
      .transaction();

    initializeTx.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;
    initializeTx.sign(wallet.payer);

    const signature = await connection.sendTransaction(
      initializeTx,
      [wallet.payer],
      {
        skipPreflight: true,
      }
    );

    const receipt = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });

    console.log("Initialize transaction signature: ", receipt);

    const confirmed = await connection.confirmTransaction({
      signature,
      ...(await connection.getLatestBlockhash()),
    });

    const error = confirmed.value.err;

    if (error) {
      console.log("Error: ", error);
      const logs = await (error as any).getLogs();
      console.log("Logs: ", logs);
      throw new Error("Transaction failed");
    }

    console.log("Initialize transaction confirmed: ", confirmed);

    // Add a product
    const productName = "testproduct";
    const productPrice = new anchor.BN(1000000); // 1 SOL

    const addProductTx = await program.methods
      .addProduct(storeName, productName, productPrice)
      .accounts({
        authority: wallet.publicKey,
        mint: mint,
      })
      .rpc();
    console.log("Add product transaction signature: ", addProductTx);

    // Buy the product
    const makePurchaseTx = await program.methods
      .makePurchase(storeName, productName, 5)
      .accounts({
        signer: wallet.publicKey,
        authority: wallet.publicKey,
        mint: mint,
      })
      .rpc();

    const receiptsAccount = await program.account.receipts.fetch(receiptsPDA);
    console.log("Make purchase transaction signature", makePurchaseTx);
    console.log("Current receipts", receiptsAccount.receipts.length);

    assert(receiptsAccount.receipts.length === 1, "There is now one receipt");
    assert(
      receiptsAccount.receipts[0].productName === productName,
      "Receipt has correct product name"
    );
    assert(
      receiptsAccount.receipts[0].price.eq(productPrice),
      "Receipt has correct price"
    );
    assert(
      receiptsAccount.receipts[0].tableNumber === 5,
      "Receipt has correct table number"
    );
  });
});
