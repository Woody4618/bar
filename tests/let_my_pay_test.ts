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
  storeName = "Test Store";
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
        receipts: receiptsPDA,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("Initialize transaction signature: ", initializeTx);

    // Add a product
    const productName = "Test Product";
    const productPrice = new anchor.BN(1000000); // 1 SOL

    const addProductTx = await program.methods
      .addProduct(storeName, productName, productPrice)
      .accounts({
        receipts: receiptsPDA,
        authority: wallet.publicKey,
        mint: mint,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("Add product transaction signature: ", addProductTx);

    // Buy the product
    const makePurchaseTx = await program.methods
      .makePurchase(storeName, productName, 5)
      .accounts({
        receipts: receiptsPDA,
        signer: wallet.publicKey,
        authority: wallet.publicKey,
        mint: mint,
        senderTokenAccount: recipientTokenAccount.address,
        recipientTokenAccount: recipientTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
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

  it("Fails to delete a non-existent product", async () => {
    const [receiptsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("receipts"), Buffer.from(storeName)],
      program.programId
    );

    try {
      await program.methods
        .deleteProduct(storeName, "non_existent_product")
        .accounts({
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
      [Buffer.from("receipts"), Buffer.from(storeName)],
      program.programId
    );

    await program.methods
      .deleteProduct(storeName, "Test Product")
      .accounts({
        receipts: receiptsPDA,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const account = await program.account.receipts.fetch(receiptsPDA);
    assert(account.products.length === 0, "Product was deleted");
  });

  it("Deletes a store", async () => {
    const [receiptsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("receipts"), Buffer.from(storeName)],
      program.programId
    );

    // Then delete the store
    await program.methods
      .deleteStore(storeName)
      .accounts({
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

  it("Fails to add product with name too long", async () => {
    const testStoreName = "TestStore2";
    const [receiptsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("receipts"), Buffer.from(testStoreName)],
      program.programId
    );

    // Initialize the store first
    await program.methods
      .initialize(testStoreName)
      .accounts({
        receipts: receiptsPDA,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const longProductName = "a".repeat(33); // 33 characters, limit is 32
    const productPrice = new anchor.BN(1000000);

    try {
      await program.methods
        .addProduct(testStoreName, longProductName, productPrice)
        .accounts({
          receipts: receiptsPDA,
          authority: wallet.publicKey,
          mint: mint,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have thrown an error");
    } catch (err) {
      assert(err.toString().includes("StringTooLong"));
    }

    // Clean up
    await program.methods
      .deleteStore(testStoreName)
      .accounts({
        receipts: receiptsPDA,
        authority: wallet.publicKey,
      })
      .rpc();
  });

  it("Fails to add more products than limit", async () => {
    const testStoreName = "TestStore3";
    const [receiptsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("receipts"), Buffer.from(testStoreName)],
      program.programId
    );

    // Initialize the store first
    await program.methods
      .initialize(testStoreName)
      .accounts({
        receipts: receiptsPDA,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const productPrice = new anchor.BN(1000000);
    const longProductName = "Test Product";

    // Try to add 21 products (limit is 20)
    for (let i = 0; i < 21; i++) {
      try {
        await program.methods
          .addProduct(testStoreName, `${longProductName} ${i}`, productPrice)
          .accounts({
            receipts: receiptsPDA,
            authority: wallet.publicKey,
            mint: mint,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        if (i >= 20) {
          assert.fail("Should have thrown an error at 20 products");
        }
      } catch (err) {
        if (i < 20) {
          throw err; // Only expect error at limit
        }
        assert(err.toString().includes("VectorLimitReached"));
      }
    }

    // Clean up
    await program.methods
      .deleteStore(testStoreName)
      .accounts({
        receipts: receiptsPDA,
        authority: wallet.publicKey,
      })
      .rpc();
  });

  it("Fails to update telegram channel with ID too long", async () => {
    const testStoreName = "TestStore4";
    const [receiptsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("receipts"), Buffer.from(testStoreName)],
      program.programId
    );

    // Initialize the store first
    await program.methods
      .initialize(testStoreName)
      .accounts({
        receipts: receiptsPDA,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const longChannelId = "a".repeat(33); // 33 characters, limit is 32

    try {
      await program.methods
        .updateTelegramChannel(testStoreName, longChannelId)
        .accounts({
          receipts: receiptsPDA,
          authority: wallet.publicKey,
        })
        .rpc();
      assert.fail("Should have thrown an error");
    } catch (err) {
      assert(err.toString().includes("StringTooLong"));
    }

    // Clean up
    await program.methods
      .deleteStore(testStoreName)
      .accounts({
        receipts: receiptsPDA,
        authority: wallet.publicKey,
      })
      .rpc();
  });

  it("Verifies receipts rotation when limit is reached", async () => {
    const testStoreName = "TestStore5";
    const [receiptsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("receipts"), Buffer.from(testStoreName)],
      program.programId
    );

    // Initialize the store first
    await program.methods
      .initialize(testStoreName)
      .accounts({
        receipts: receiptsPDA,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Add a product first
    const productName = "Test Product";
    const productPrice = new anchor.BN(1000000);

    await program.methods
      .addProduct(testStoreName, productName, productPrice)
      .accounts({
        receipts: receiptsPDA,
        authority: wallet.publicKey,
        mint: mint,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Add 21 receipts (limit is 20)
    for (let i = 0; i < 21; i++) {
      await program.methods
        .makePurchase(testStoreName, productName, i)
        .accounts({
          receipts: receiptsPDA,
          signer: wallet.publicKey,
          authority: wallet.publicKey,
          mint: mint,
          senderTokenAccount: recipientTokenAccount.address,
          recipientTokenAccount: recipientTokenAccount.address,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        })
        .rpc();

      // Verify the receipts state
      const account = await program.account.receipts.fetch(receiptsPDA);
      if (i < 20) {
        assert(
          account.receipts.length === i + 1,
          `Receipt count should be ${i + 1}`
        );
      } else {
        assert(
          account.receipts.length === 20,
          "Receipt count should stay at 20"
        );
        // After 20 receipts, the first receipt should be table number 1 (index 0 was removed)
        assert(
          account.receipts[0].tableNumber === 1,
          "First receipt should be table 1"
        );
        // And the last receipt should be table number 20
        assert(
          account.receipts[19].tableNumber === 20,
          "Last receipt should be table 20"
        );
      }
    }

    // Clean up
    await program.methods
      .deleteStore(testStoreName)
      .accounts({
        receipts: receiptsPDA,
        authority: wallet.publicKey,
      })
      .rpc();
  });
});
