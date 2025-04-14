"use client"; // this makes next know that this page should be rendered in the client
import { useEffect, useState, useMemo } from "react";
import {
  CONNECTION,
  SOLANA_BAR_PROGRAM,
  getReceiptsPDA,
} from "@/src/util/const";
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
import { useParams } from "next/navigation";

export default function BarPage() {
  const params = useParams();
  const barName = params?.barName as string;
  const [receipts, setReceipts] = useState<any>();
  const [selectedProduct, setSelectedProduct] = useState<string>("shot");
  const { publicKey, sendTransaction } = useWallet();
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    decimals: "6",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC mint address
  });

  const RECEIPTS_PDA = useMemo(() => getReceiptsPDA(barName), [barName]);

  useEffect(() => {
    console.log("Bar name:", barName);
  }, [barName]);

  useEffect(() => {
    if (!publicKey || typeof window === "undefined") return;

    let subscriptionId: number;

    const fetchReceipts = async () => {
      try {
        const gameData = await SOLANA_BAR_PROGRAM.account.receipts.fetch(
          RECEIPTS_PDA
        );
        console.log("Fetched game data:", gameData);
        setReceipts(gameData);
      } catch (error) {
        console.error("Error fetching receipts:", error);
        setReceipts(null);
      }
    };

    // Initial fetch
    fetchReceipts();

    // Set up account change subscription
    subscriptionId = CONNECTION.onAccountChange(
      RECEIPTS_PDA,
      (updatedAccountInfo) => {
        const decoded = SOLANA_BAR_PROGRAM.coder.accounts.decode(
          "receipts",
          updatedAccountInfo.data
        );
        setReceipts(decoded);
      },
      "confirmed"
    );

    // Cleanup subscription on unmount
    return () => {
      console.log("Unmounting");
      if (subscriptionId) {
        CONNECTION.removeAccountChangeListener(subscriptionId);
      }
    };
  }, [publicKey]);

  if (!barName) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Bar Name Required</h1>
          <p>
            Please access this page with a bar name in the URL, e.g.,
            /bar/your-bar-name
          </p>
        </div>
      </div>
    );
  }

  const handleInitialize = async () => {
    if (!publicKey) {
      console.error("Wallet not connected");
      return;
    }

    try {
      // Get recent blockhash
      const { blockhash } = await CONNECTION.getLatestBlockhash();

      const transaction = await SOLANA_BAR_PROGRAM.methods
        .initialize(barName)
        .accounts({
          authority: publicKey,
        })
        .transaction();

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
        .buyShot(barName, selectedProduct)
        .accounts({
          signer: publicKey,
          authority: publicKey,
          mint: new PublicKey(product.mint),
          senderTokenAccount: senderTokenAccount,
        })
        .transaction();

      console.log("Transaction:", transaction);
      const signature = await sendTransaction(transaction, CONNECTION);
      console.log("Transaction sent:", signature);
    } catch (error) {
      console.error("Error sending transaction:", error);
    }
  };

  const handleAddProduct = async () => {
    if (!publicKey) return;

    try {
      const price = new BN(
        parseFloat(newProduct.price) *
          Math.pow(10, parseInt(newProduct.decimals))
      );
      const decimals = parseInt(newProduct.decimals);

      const transaction = await SOLANA_BAR_PROGRAM.methods
        .addProduct(
          barName,
          newProduct.name,
          price,
          decimals,
          new PublicKey(newProduct.mint)
        )
        .accounts({
          authority: publicKey,
        })
        .transaction();

      const signature = await sendTransaction(transaction, CONNECTION);
      console.log("Product added:", signature);

      // Reset form
      setNewProduct({
        name: "",
        price: "",
        decimals: "6",
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      });
    } catch (error) {
      console.error("Error adding product:", error);
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
            {receipts != null ? (
              <div className="flex flex-col items-center gap-2">
                <select
                  className="bg-white shadow-md rounded-2xl border-solid border border-black p-2"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  <option value="">Select a product</option>
                  {receipts.products?.map(
                    (product: {
                      name: string;
                      price: number;
                      decimals: number;
                    }) => (
                      <option key={product.name} value={product.name}>
                        {product.name} -{" "}
                        {(
                          product.price / Math.pow(10, product.decimals)
                        ).toFixed(2)}{" "}
                        USDC
                      </option>
                    )
                  )}
                </select>
                {selectedProduct && (
                  <div className="flex flex-col items-center gap-2">
                    <PayQR
                      instruction={"buy_shot"}
                      barName={barName}
                      productName={selectedProduct}
                    />
                    <button
                      onClick={handleBuyShot}
                      className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-100"
                    >
                      Buy with Wallet
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <h1 className="text-2xl font-bold text-white">
                  Initialize {barName}
                </h1>
                <PayQR
                  instruction={"initialize"}
                  barName={barName}
                  productName={""}
                />
                <div className="text-white">OR</div>
                <button
                  onClick={handleInitialize}
                  className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-100"
                >
                  Initialize with Wallet
                </button>
              </div>
            )}
            {receipts != null && (
              <div className="flex flex-col items-center gap-4">
                <h2 className="text-xl font-bold text-white">Add Product</h2>
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Product Name"
                    value={newProduct.name}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, name: e.target.value })
                    }
                    className="bg-white shadow-md rounded-2xl border-solid border border-black p-2"
                  />
                  <input
                    type="text"
                    placeholder="Price"
                    value={newProduct.price}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, price: e.target.value })
                    }
                    className="bg-white shadow-md rounded-2xl border-solid border border-black p-2"
                  />
                  <input
                    type="text"
                    placeholder="Decimals"
                    value={newProduct.decimals}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, decimals: e.target.value })
                    }
                    className="bg-white shadow-md rounded-2xl border-solid border border-black p-2"
                  />
                  <input
                    type="text"
                    placeholder="Mint Address"
                    value={newProduct.mint}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, mint: e.target.value })
                    }
                    className="bg-white shadow-md rounded-2xl border-solid border border-black p-2"
                  />
                  <button
                    onClick={handleAddProduct}
                    className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-100"
                  >
                    Add Product
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-center mt-8">
        {receipts && <Receipts receipts={receipts} />}
      </div>
    </main>
  );
}
