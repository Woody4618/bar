import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaBar } from "../target/types/solana_bar";
import { assert } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

describe("SolanaBar", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaBar as Program<SolanaBar>;
  const wallet = anchor.workspace.SolanaBar.provider.wallet;
  const connection = program.provider.connection;

  it("Is initialized!", async () => {
    // Create a new keypair for the other user
    const otherUser = Keypair.generate();

    // Create a new mint
    const mint = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      wallet.publicKey,
      6
    );

    // Create token accounts for both users
    const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      mint,
      wallet.publicKey
    );

    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      mint,
      otherUser.publicKey
    );

    // Mint tokens to the sender's account
    await mintTo(
      connection,
      wallet.payer,
      mint,
      senderTokenAccount.address,
      wallet.publicKey,
      1000000000 // 1000 tokens (9 decimals)
    );

    const receiptsPDA = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("receipts")],
      program.programId
    )[0];

    console.log("Receipts", receiptsPDA);

    // Initialize the receipts account
    const initializeTx = await program.methods
      .initialize("Test Bar")
      .accounts({
        authority: wallet.publicKey,
      })
      .rpc();
    console.log("Initialize transaction signature: ", initializeTx);

    // Add a product
    const productName = "Test Shot";
    const productPrice = new anchor.BN(1000000); // 1 SOL
    const productDecimals = 6;

    const addProductTx = await program.methods
      .addProduct(productName, productPrice, productDecimals, mint)
      .accounts({
        receipts: receiptsPDA,
        authority: wallet.publicKey,
      })
      .rpc();
    console.log("Add product transaction signature: ", addProductTx);

    // Buy the product
    const buyShotTx = await program.methods
      .buyShot(productName)
      .accounts({
        receipts: receiptsPDA,
        signer: wallet.publicKey,
        treasury: new PublicKey("GsfNSuZFrT2r4xzSndnCSs9tTXwt47etPqU8yFVnDcXd"),
        mint,
        senderTokenAccount: senderTokenAccount.address,
        recipientTokenAccount: recipientTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const receiptsAccount = await program.account.receipts.fetch(receiptsPDA);
    console.log("Buy shot transaction signature", buyShotTx);
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
  });
});
