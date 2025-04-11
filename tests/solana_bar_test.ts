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
      9
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

    try {
      const initializeTransaction = await program.methods
        .initialize()
        .accounts({
          authority: wallet.publicKey,
        })
        .rpc();
      console.log("Initialize transaction signature: ", initializeTransaction);
    } catch (e) {
      console.log(e);
    }

    const switchOnTransaction = await program.methods
      .buyShot()
      .accounts({
        signer: wallet.publicKey,
        treasury: new PublicKey("GsfNSuZFrT2r4xzSndnCSs9tTXwt47etPqU8yFVnDcXd"),
        mint,
        senderTokenAccount: senderTokenAccount.address,
        recipientTokenAccount: recipientTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const ledAccount = await program.account.receipts.fetch(receiptsPDA);
    console.log("Your switch on transaction signature", switchOnTransaction);

    console.log("Current receipts", ledAccount.receipts.length);

    assert(ledAccount.receipts.length === 1, "There is now one receipt");
  });
});
