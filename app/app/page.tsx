"use client"; // this makes next know that this page should be rendered in the client
import { useEffect, useState } from "react";
import { CONNECTION, SOLANA_BAR_PROGRAM, RECEIPTS_PDA } from "@/src/util/const";
import PayQR from "@/src/components/PayQR";
import Receipts from "@/src/components/Receipts";
import { BN } from "@coral-xyz/anchor";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export default function Home() {
  const [receipts, setReceipts] = useState<any>();
  const [selectedProduct, setSelectedProduct] = useState<string>("Test Shot");
  const { publicKey, sendTransaction } = useWallet();

  useEffect(() => {
    console.log("Wallet public key:", publicKey?.toString());
    console.log("Selected product:", selectedProduct);
    console.log("Receipts:", receipts);
    if (receipts) {
      console.log("Products in receipts:", receipts.products);
      console.log(
        "Is Test Shot in products?",
        receipts.products?.some((p) => p.name === "Test Shot")
      );
    }
  }, [publicKey, selectedProduct, receipts]);

  useEffect(() => {
    CONNECTION.onAccountChange(
      RECEIPTS_PDA,
      (updatedAccountInfo, context) => {
        {
          const decoded = SOLANA_BAR_PROGRAM.coder.accounts.decode(
            "receipts",
            updatedAccountInfo.data
          );
          setReceipts(decoded);
        }
      },
      "confirmed"
    );

    const getState = async () => {
      try {
        const gameData = await SOLANA_BAR_PROGRAM.account.receipts.fetch(
          RECEIPTS_PDA
        );
        console.log("Fetched game data:", gameData);
        setReceipts(gameData);
      } catch (error) {
        console.log("Receipts account not initialized yet");
        setReceipts(null);
      }
    };

    getState();
  }, []);

  const handleInitialize = async () => {
    if (!publicKey) {
      console.error("Wallet not connected");
      return;
    }

    try {
      // Get recent blockhash
      const { blockhash } = await CONNECTION.getLatestBlockhash();

      const transaction = await SOLANA_BAR_PROGRAM.methods
        .initialize("Solana Bar")
        .accounts({
          authority: publicKey,
        })
        .transaction();
      console.log("Transaction:", transaction);
      // Set the recent blockhash
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      console.log("Sending initialization transaction...");
      const signature = await sendTransaction(transaction, CONNECTION);
      console.log("Initialization transaction sent:", signature);

      // Wait for confirmation
      const confirmation = await CONNECTION.confirmTransaction(signature);
      if (confirmation.value.err) {
        throw new Error("Transaction failed to confirm");
      }
      console.log("Transaction confirmed!");
    } catch (error) {
      console.error("Error initializing:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
    }
  };

  const handleBuyShot = async () => {
    if (!publicKey || !selectedProduct) return;

    try {
      // Get the receipts account to find the product
      const receiptsAccount = await SOLANA_BAR_PROGRAM.account.receipts.fetch(
        RECEIPTS_PDA
      );
      const products = receiptsAccount.products as any[];
      const product = products.find(
        (p: { name: string }) => p.name === selectedProduct
      );

      if (!product) {
        console.error("Product not found");
        return;
      }

      // Get token accounts
      const senderTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(product.mint),
        publicKey
      );
      const recipientTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(product.mint),
        new PublicKey(receiptsAccount.authority)
      );

      const transaction = await SOLANA_BAR_PROGRAM.methods
        .buyShot(selectedProduct)
        .accounts({
          signer: publicKey,
          mint: new PublicKey(product.mint),
          senderTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          authority: new PublicKey(receiptsAccount.authority),
        })
        .transaction();

      console.log("Transaction:", transaction);
      const signature = await sendTransaction(transaction, CONNECTION);
      console.log("Transaction sent:", signature);
    } catch (error) {
      console.error("Error sending transaction:", error);
    }
  };

  const testTransfer = async () => {
    if (!publicKey) {
      console.error("Wallet not connected");
      return;
    }

    try {
      const { blockhash } = await CONNECTION.getLatestBlockhash();
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(
            "CYg2vSJdujzEC1E7kHMzB9QhjiPLRdsAa4Js7MkuXfYq"
          ),
          lamports: 1000000, // 0.001 SOL
        })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      console.log("Sending test transfer...");
      const signature = await sendTransaction(transaction, CONNECTION);
      console.log("Transfer sent:", signature);
    } catch (error) {
      console.error("Error in test transfer:", error);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-500 to-purple-600">
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="flex justify-end w-full px-4">
            <WalletMultiButton className="!bg-white !text-black hover:!bg-gray-100" />
          </div>
          <div className="flex flex-col items-center gap-4 mx-10 my-4">
            <button
              onClick={testTransfer}
              className="bg-white hover:bg-gray-100 text-black font-bold py-2 px-4 rounded-2xl border border-black shadow-md"
              disabled={!publicKey}
            >
              Test Transfer (0.001 SOL)
            </button>
            {receipts != null ? (
              <div className="flex flex-col items-center gap-2">
                <select
                  className="bg-white shadow-md rounded-2xl border-solid border border-black p-2"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  <option value="">Select a product</option>
                  {receipts.products?.map((product: any) => (
                    <option key={product.name} value={product.name}>
                      {product.name} -{" "}
                      {new BN(product.price).div(new BN(1000000000)).toString()}{" "}
                      SOL
                    </option>
                  ))}
                </select>
                {selectedProduct && (
                  <div className="flex flex-col items-center gap-2">
                    <PayQR
                      instruction={"buy_shot"}
                      productName={selectedProduct}
                    />
                    <button
                      onClick={handleBuyShot}
                      className="bg-white hover:bg-gray-100 text-black font-bold py-2 px-4 rounded-2xl border border-black shadow-md"
                      disabled={!publicKey}
                    >
                      Buy with Wallet
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="text-center text-white mb-2">
                  <h2 className="text-xl font-bold">Initialize the Bar</h2>
                  <p className="text-sm">Choose either method to initialize:</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <PayQR instruction={"initialize"} />
                  <p className="text-white text-sm">- OR -</p>
                  <button
                    onClick={handleInitialize}
                    className="bg-white hover:bg-gray-100 text-black font-bold py-2 px-4 rounded-2xl border border-black shadow-md"
                    disabled={!publicKey}
                  >
                    Initialize with Wallet
                  </button>
                </div>
              </div>
            )}

            <Receipts receipts={receipts} />
          </div>
        </div>
      </div>
    </main>
  );
}
