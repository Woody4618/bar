"use client"; // this makes next know that this page should be rendered in the client
import { useEffect, useState, useRef, useMemo } from "react";
import {
  CONNECTION,
  SOLANA_BAR_PROGRAM,
  getReceiptsPDA,
} from "@/src/util/const";
import PayQR from "@/src/components/PayQR";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import PurchaseNotification from "@/src/components/PurchaseNotification";
import { motion } from "framer-motion";
import Link from "next/link";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import Image from "next/image";

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
  const barName = (params?.barName as string)?.toLowerCase();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<any>();
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const { publicKey, sendTransaction, connected } = useWallet();
  const [showPurchaseNotification, setShowPurchaseNotification] =
    useState(false);
  const [lastPurchasedProduct, setLastPurchasedProduct] = useState<
    string | null
  >(null);
  const [highestReceiptId, setHighestReceiptId] = useState(0);
  const [showQRCheckmark, setShowQRCheckmark] = useState(false);
  const [initialReceiptIds, setInitialReceiptIds] = useState<number[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const subscriptionRef = useRef<number>();
  const mountedRef = useRef(true);

  const RECEIPTS_PDA = useMemo(() => getReceiptsPDA(barName), [barName]);

  // Debug connected state
  useEffect(() => {
    console.log("Connected state changed:", connected);
  }, [connected]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    if (typeof window === "undefined") return;

    console.log("Fetching receipts");

    const fetchReceipts = async () => {
      try {
        setError(null);
        const receiptsData = await SOLANA_BAR_PROGRAM.account.receipts.fetch(
          RECEIPTS_PDA
        );

        if (!mountedRef.current) return;

        if (!receiptsData) {
          setReceipts(null);
          return;
        }

        setReceipts(receiptsData);
      } catch (err) {
        if (!mountedRef.current) return;
        const error = err as Error;
        console.error("Error fetching receipts:", error);
        // Only set error if it's not a "Account does not exist" error
        if (!error.message.includes("Account does not exist")) {
          setError("Failed to load bar data. Please try again later.");
        }
        setReceipts(null);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchReceipts();
  }, [RECEIPTS_PDA]);

  // Subscription setup
  useEffect(() => {
    console.log("Subscription setup");

    if (typeof window === "undefined") return;
    if (!connected) return;

    const setupSubscription = () => {
      console.log(
        "Setting up subscription" + RECEIPTS_PDA + " connected" + connected
      );
      if (subscriptionRef.current) return;

      try {
        subscriptionRef.current = CONNECTION.onAccountChange(
          RECEIPTS_PDA,
          (updatedAccountInfo) => {
            if (!mountedRef.current) return;
            try {
              const decoded = SOLANA_BAR_PROGRAM.coder.accounts.decode(
                "receipts",
                updatedAccountInfo.data
              );
              setReceipts(decoded);
            } catch (err) {
              console.error("Error decoding account data:", err);
            }
          },
          "processed"
        );
      } catch (err) {
        console.error("Error setting up account subscription:", err);
      }
    };

    setupSubscription();

    return () => {
      if (subscriptionRef.current) {
        CONNECTION.removeAccountChangeListener(subscriptionRef.current);
        subscriptionRef.current = undefined;
      }
    };
  }, [RECEIPTS_PDA, connected]);

  useEffect(() => {
    console.log("Initial receipt ids");

    if (!receipts?.receipts || hasInitialized) return;

    const currentReceiptIds = receipts.receipts.map((r: any) =>
      r.receiptId.toNumber()
    );

    setInitialReceiptIds(currentReceiptIds);
    setHighestReceiptId(Math.max(...currentReceiptIds));
    setHasInitialized(true);
  }, [receipts?.receipts, hasInitialized]);

  useEffect(() => {
    if (!selectedProduct && receipts?.products?.length > 0) {
      setSelectedProduct(receipts.products[0].name);
    }
  }, [receipts, selectedProduct]);

  useEffect(() => {
    console.log("Update qr code data ");

    if (!receipts?.receipts || !hasInitialized) return;

    const currentReceiptIds = receipts.receipts.map((r: any) =>
      r.receiptId.toNumber()
    );
    const currentHighestId = Math.max(...currentReceiptIds);

    if (
      currentHighestId > highestReceiptId &&
      !initialReceiptIds.includes(currentHighestId)
    ) {
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

        setTimeout(() => {
          setShowPurchaseNotification(false);
          setShowQRCheckmark(false);
        }, 3000);
      }
    }
  }, [
    receipts?.receipts,
    highestReceiptId,
    initialReceiptIds,
    hasInitialized,
    barName,
    selectedProduct,
  ]);

  const handleBuyShot = async () => {
    if (!publicKey || !selectedProduct) return;

    try {
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-xl">
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Error
          </h2>
          <p className="text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="fixed top-0 left-0 right-0 flex justify-center items-start pt-4 z-50">
        <PurchaseNotification
          show={showPurchaseNotification}
          productName={lastPurchasedProduct || ""}
        />
      </div>
      <div className="fixed top-0 right-0 p-4 z-40 flex gap-4">
        {receipts && (
          <Link
            href={`/bar/${barName}/setup`}
            className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-200"
          >
            Manage Bar
          </Link>
        )}
        <WalletMultiButtonDynamic className="!bg-slate-800 !text-white hover:!bg-slate-700 !border !border-slate-700" />
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-2">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image
              src="/solana-logo.png"
              alt="Solana Logo"
              width={32}
              height={32}
              className="w-8 h-8"
            />
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            {barName}
          </h1>
        </div>

        {loading ? (
          <div className="text-center p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-xl">
            <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Loading bar data...
            </p>
          </div>
        ) : error ? (
          <div className="text-center p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-xl">
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Error
            </h2>
            <p className="text-slate-300">{error}</p>
          </div>
        ) : receipts == null ? (
          <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-xl">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Bar Not Initialized
            </h2>
            <p className="text-slate-300 text-center">
              This bar has not been initialized yet. Please connect your wallet
              and visit the setup page to get started.
            </p>
            <div className="flex flex-col gap-4">
              {connected && (
                <Link
                  href={`/bar/${barName}/setup`}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg text-center"
                >
                  Initialize Bar
                </Link>
              )}
            </div>
          </div>
        ) : receipts.products?.length === 0 ? (
          <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-xl">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              No Products Yet
            </h2>
            <p className="text-slate-300 text-center">
              This bar doesn&apos;t have any products yet. Visit the setup page
              to add some products.
            </p>
            <Link
              href={`/bar/${barName}/setup`}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg"
            >
              Go to Setup
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8">
            <div className="w-full max-w-md">
              <div className="flex gap-4 mb-4">
                <select
                  className="bg-slate-800 text-white shadow-lg rounded-xl border border-slate-700 p-3 w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  <option value="" className="bg-slate-800">
                    Select a product
                  </option>
                  {receipts.products?.map((product: any) => (
                    <option
                      key={product.name}
                      value={product.name}
                      className="bg-slate-800"
                    >
                      {product.name} -{" "}
                      {(product.price / Math.pow(10, product.decimals)).toFixed(
                        2
                      )}{" "}
                      USDC
                    </option>
                  ))}
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
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-semibold text-white mb-1">
                        {selectedProduct}
                      </h3>
                      {receipts.products?.find(
                        (p: any) => p.name === selectedProduct
                      ) && (
                        <p className="text-slate-300">
                          {(
                            receipts.products.find(
                              (p: any) => p.name === selectedProduct
                            ).price / Math.pow(10, 6)
                          ).toFixed(2)}{" "}
                          USDC
                        </p>
                      )}
                    </div>
                    <PayQR
                      instruction={"buy_shot"}
                      barName={barName}
                      productName={selectedProduct}
                      productPrice={
                        receipts.products.find(
                          (p: any) => p.name === selectedProduct
                        )?.price
                      }
                      productDecimals={
                        receipts.products.find(
                          (p: any) => p.name === selectedProduct
                        )?.decimals
                      }
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
                  {connected && (
                    <button
                      onClick={handleBuyShot}
                      className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg"
                    >
                      Buy with Wallet
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
