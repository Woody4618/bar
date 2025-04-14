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
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddress
} from "@solana/spl-token";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import PurchaseNotification from "@/src/components/PurchaseNotification";
import { motion } from "framer-motion";

// Dynamically import the WalletMultiButton to avoid hydration issues
const WalletMultiButtonDynamic = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

export default function BarPage() {
  const params = useParams();
  const barName = params?.barName as string;
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<any>();
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const { publicKey, sendTransaction } = useWallet();
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    decimals: "6",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC mint address
  });
  const [showPurchaseNotification, setShowPurchaseNotification] =
    useState(false);
  const [lastPurchasedProduct, setLastPurchasedProduct] = useState<
    string | null
  >(null);
  const [highestReceiptId, setHighestReceiptId] = useState(0);
  const [showQRCheckmark, setShowQRCheckmark] = useState(false);
  const [initialReceiptIds, setInitialReceiptIds] = useState<number[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);

  const RECEIPTS_PDA = useMemo(() => getReceiptsPDA(barName), [barName]);

  useEffect(() => {
    if (!publicKey || typeof window === "undefined") return;

    let subscriptionId: number;

    const fetchReceipts = async () => {
      try {
        const gameData = await SOLANA_BAR_PROGRAM.account.receipts.fetch(
          RECEIPTS_PDA
        );
        setReceipts(gameData);
        // Only set selected product if we don't have one yet and there are products available
        if (!selectedProduct && gameData?.products?.length > 0) {
          setSelectedProduct(gameData.products[0].name);
        }
      } catch (error) {
        console.error("Error fetching receipts:", error);
        setReceipts(null);
      } finally {
        setLoading(false);
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
      if (subscriptionId) {
        CONNECTION.removeAccountChangeListener(subscriptionId);
      }
    };
  }, [publicKey, selectedProduct, RECEIPTS_PDA]);

  // Update the purchase detection useEffect
  useEffect(() => {
    if (!receipts?.receipts || hasInitialized) return;

    const currentReceiptIds = receipts.receipts.map((r: any) =>
      r.receiptId.toNumber()
    );

    // Set initial IDs and mark as initialized
    setInitialReceiptIds(currentReceiptIds);
    setHighestReceiptId(Math.max(...currentReceiptIds));
    setHasInitialized(true);
  }, [receipts?.receipts, hasInitialized]);

  // Separate effect for handling new purchases
  useEffect(() => {
    if (!receipts?.receipts || !hasInitialized) return;

    const currentReceiptIds = receipts.receipts.map((r: any) =>
      r.receiptId.toNumber()
    );
    const currentHighestId = Math.max(...currentReceiptIds);

    // Only trigger if we have a new higher receipt ID that wasn't in our initial set
    if (
      currentHighestId > highestReceiptId &&
      !initialReceiptIds.includes(currentHighestId)
    ) {
      // Find the receipt with the highest ID
      const latestReceipt = receipts.receipts.reduce(
        (prev: any, current: any) => {
          return current.receiptId.toNumber() > prev.receiptId.toNumber()
            ? current
            : prev;
        }
      );

      if (latestReceipt && !latestReceipt.wasDelivered) {
        setLastPurchasedProduct(latestReceipt.productName);
        setShowPurchaseNotification(true);
        setShowQRCheckmark(true);
        setHighestReceiptId(currentHighestId);

        // Reset both notifications after a delay
        setTimeout(() => {
          setShowPurchaseNotification(false);
          setShowQRCheckmark(false);
        }, 3000);
      }
    }
  }, [receipts?.receipts, highestReceiptId, initialReceiptIds, hasInitialized]);

  if (!barName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-xl">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Bar Name Required
          </h1>
          <p className="text-slate-300">
            Please access this page with a bar name in the URL, e.g.,
            /bar/your-bar-name
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-xl">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Loading bar data...
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
        .buyShot(barName, selectedProduct, selectedTable)
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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <PurchaseNotification
        show={showPurchaseNotification}
        productName={lastPurchasedProduct || ""}
      />
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 w-full max-w-4xl px-4">
          <div className="flex justify-end w-full">
            <WalletMultiButtonDynamic className="!bg-slate-800 !text-white hover:!bg-slate-700 !border !border-slate-700" />
          </div>
          <div className="flex flex-col items-center gap-4 w-full">
            {receipts != null ? (
              <div className="flex flex-col items-center gap-4 w-full">
                <div className="flex gap-4 w-full max-w-md">
                  <select
                    className="bg-slate-800 text-white shadow-lg rounded-xl border border-slate-700 p-3 w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                  >
                    <option value="" className="bg-slate-800">
                      Select a product
                    </option>
                    {receipts.products?.map(
                      (product: {
                        name: string;
                        price: number;
                        decimals: number;
                      }) => (
                        <option
                          key={product.name}
                          value={product.name}
                          className="bg-slate-800"
                        >
                          {product.name} -{" "}
                          {(
                            product.price / Math.pow(10, product.decimals)
                          ).toFixed(2)}{" "}
                          USDC
                        </option>
                      )
                    )}
                  </select>
                  <select
                    className="bg-slate-800 text-white shadow-lg rounded-xl border border-slate-700 p-3 w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(Number(e.target.value))}
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num} className="bg-slate-800">
                        Table {num}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedProduct && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                      <PayQR
                        instruction={"buy_shot"}
                        barName={barName}
                        productName={selectedProduct}
                        tableNumber={selectedTable}
                      />
                      {showQRCheckmark &&
                        lastPurchasedProduct === selectedProduct && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                              <svg
                                className="w-16 h-16 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          </motion.div>
                        )}
                    </div>
                    <button
                      onClick={handleBuyShot}
                      className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg"
                    >
                      Buy with Wallet
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-xl">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Initialize {barName}
                </h1>
                <PayQR
                  instruction={"initialize"}
                  barName={barName}
                  productName={""}
                />
                <div className="text-slate-300">OR</div>
                <button
                  onClick={handleInitialize}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg"
                >
                  Initialize with Wallet
                </button>
              </div>
            )}
            {receipts != null && (
              <div className="flex flex-col items-center gap-4 w-full max-w-md p-6 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-xl">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Add Product
                </h2>
                <div className="flex flex-col gap-3 w-full">
                  <input
                    type="text"
                    placeholder="Product Name"
                    value={newProduct.name}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, name: e.target.value })
                    }
                    className="bg-slate-800 text-white shadow-lg rounded-xl border border-slate-700 p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    placeholder="Price"
                    value={newProduct.price}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, price: e.target.value })
                    }
                    className="bg-slate-800 text-white shadow-lg rounded-xl border border-slate-700 p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    placeholder="Decimals"
                    value={newProduct.decimals}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, decimals: e.target.value })
                    }
                    className="bg-slate-800 text-white shadow-lg rounded-xl border border-slate-700 p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    placeholder="Mint Address"
                    value={newProduct.mint}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, mint: e.target.value })
                    }
                    className="bg-slate-800 text-white shadow-lg rounded-xl border border-slate-700 p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={handleAddProduct}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg"
                  >
                    Add Product
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-center mt-8 pb-8">
        {receipts && <Receipts receipts={receipts} />}
      </div>
    </main>
  );
}
