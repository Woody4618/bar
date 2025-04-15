import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaBar } from "../target/types/solana_bar";
import { assert } from "chai";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import * as fs from "fs";

describe("SolanaBar", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaBar as Program<SolanaBar>;
  const wallet = anchor.workspace.SolanaBar.provider.wallet;
  const connection = program.provider.connection;
  const barName = "Test Bar";
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

  it("Is initialized!", async () => {
    // Create a new mint
    const mint = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      wallet.publicKey,
      6,
      mintKeypair
    );

    console.log("Mint", mint);

    // Create token accounts for both users
    const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      mint,
      wallet.publicKey
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

    const [receiptsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("receipts"), Buffer.from(barName)],
      program.programId
    );

    console.log("Receipts", receiptsPDA);

    // Initialize the receipts account
    const initializeTx = await program.methods
      .initialize(barName)
      .accountsStrict({
        receipts: receiptsPDA,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("Initialize transaction signature: ", initializeTx);

    // Add a product
    const productName = "Test Shot";
    const productPrice = new anchor.BN(1000000); // 1 SOL
    const productDecimals = 6;

    const addProductTx = await program.methods
      .addProduct(barName, productName, productPrice, productDecimals, mint)
      .accountsStrict({
        receipts: receiptsPDA,
        authority: wallet.publicKey,
      })
      .rpc();
    console.log("Add product transaction signature: ", addProductTx);

    // Buy the product
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      mint,
      wallet.publicKey
    );

    const buyShotTx = await program.methods
      .buyShot(barName, productName, 5)
      .accountsStrict({
        receipts: receiptsPDA,
        signer: wallet.publicKey,
        authority: wallet.publicKey,
        mint: mint,
        senderTokenAccount: senderTokenAccount.address,
        recipientTokenAccount: recipientTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
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
    assert(
      receiptsAccount.receipts[0].tableNumber === 5,
      "Receipt has correct table number"
    );
  });

  it("Fails to delete a non-existent product", async () => {
    const [receiptsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("receipts"), Buffer.from(barName)],
      program.programId
    );

    try {
      await program.methods
        .deleteProduct(barName, "non_existent_product")
        .accountsStrict({
          receipts: receiptsPDA,
          authority: wallet.publicKey,
        })
        .rpc();
      assert.fail("Should have thrown an error");
    } catch (err) {
      assert(err.toString().includes("ProductNotFound"));
    }
  });

  it("Deletes a product", async () => {
    const [receiptsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("receipts"), Buffer.from(barName)],
      program.programId
    );

    await program.methods
      .deleteProduct(barName, "Test Shot")
      .accountsStrict({
        receipts: receiptsPDA,
        authority: wallet.publicKey,
      })
      .rpc();

    const account = await program.account.receipts.fetch(receiptsPDA);
    assert(account.products.length === 0, "Product was deleted");
  });

  // it("Fails to delete a non-empty bar", async () => {
  //   const [receiptsPDA] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("receipts"), Buffer.from(barName)],
  //     program.programId
  //   );

  //   // Add a product back to make the bar non-empty
  //   await program.methods
  //     .addProduct(
  //       barName,
  //       "Test Shot",
  //       new anchor.BN(1000000),
  //       6,
  //       mintKeypair.publicKey
  //     )
  //     .accountsStrict({
  //       receipts: receiptsPDA,
  //       authority: wallet.publicKey,
  //     })
  //     .rpc();

  //   try {
  //     await program.methods
  //       .deleteBar(barName)
  //       .accountsStrict({
  //         receipts: receiptsPDA,
  //         authority: wallet.publicKey,
  //       })
  //       .rpc();
  //     assert.fail("Should have thrown an error");
  //   } catch (err) {
  //     assert(err.toString().includes("BarNotEmpty"));
  //   }
  // });

  it("Deletes a bar", async () => {
    const [receiptsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("receipts"), Buffer.from(barName)],
      program.programId
    );

    // Then delete the bar
    await program.methods
      .deleteBar(barName)
      .accountsStrict({
        receipts: receiptsPDA,
        authority: wallet.publicKey,
      })
      .rpc();

    try {
      await program.account.receipts.fetch(receiptsPDA);
      assert.fail("Should have thrown an error");
    } catch (err) {
      assert(err.toString().includes("Account does not exist"));
    }
  });
});
