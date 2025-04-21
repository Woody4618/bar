"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  CONNECTION,
  LET_ME_BUY_PROGRAM,
  getReceiptsPDA,
} from "@/src/util/const";
import { BN } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Receipts from "@/src/components/Receipts";
import Link from "next/link";
import Image from "next/image";

// Dynamically import the WalletMultiButton to avoid hydration issues
const WalletMultiButtonDynamic = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

export default function BarSetupPage() {
  const params = useParams();
  const storeName = (params?.storeName as string)?.toLowerCase();
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<any>();
  const [isInitializing, setIsInitializing] = useState(false);
  const [telegramChannelId, setTelegramChannelId] = useState("");
  const [isUpdatingTelegram, setIsUpdatingTelegram] = useState(false);
  const { publicKey, connected, sendTransaction } = useWallet();
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    decimals: "6",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC mint address
  });
  const [error, setError] = useState<string | null>(null);

  const MINT_OPTIONS = [
    {
      name: "USDC",
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    },
    {
      name: "Test Token",
      address: "tokSEbdQMxeCZx5GYKR32ywbax6VE4twyqJCYnEtAaC",
    },
  ];

  const RECEIPTS_PDA = useMemo(() => getReceiptsPDA(storeName), [storeName]);

  const subscriptionRef = useRef<number>();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    if (typeof window === "undefined") return;

    const fetchReceipts = async () => {
      try {
        const receiptsData = await LET_ME_BUY_PROGRAM.account.receipts.fetch(
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
        if (!error.message.includes("Account does not exist")) {
          console.error("Failed to load bar data. Please try again later.");
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
    if (typeof window === "undefined") return;

    const setupSubscription = () => {
      if (subscriptionRef.current) return;

      try {
        subscriptionRef.current = CONNECTION.onAccountChange(
          RECEIPTS_PDA,
          (updatedAccountInfo) => {
            if (!mountedRef.current) return;
            try {
              const decoded = LET_ME_BUY_PROGRAM.coder.accounts.decode(
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
  }, [RECEIPTS_PDA]);

  // Update telegram channel ID when receipts change
  useEffect(() => {
    if (receipts) {
      setTelegramChannelId(receipts.telegramChannelId || "");
    }
  }, [receipts]);

  const isAuthority = useMemo(() => {
    if (!publicKey) return false;
    if (!receipts) return true; // If no receipts account exists, connected wallet can be authority
    return publicKey.equals(new PublicKey(receipts.authority));
  }, [publicKey, receipts]);

  const handleInitialize = async () => {
    if (!publicKey) {
      console.error("Wallet not connected");
      return;
    }

    if (storeName.includes(" ")) {
      console.error("Store name cannot contain spaces");
      return;
    }

    try {
      setIsInitializing(true);
      const { blockhash } = await CONNECTION.getLatestBlockhash();

      const transaction = await LET_ME_BUY_PROGRAM.methods
        .initialize(storeName)
        .accounts({
          authority: publicKey,
        })
        .transaction();

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      console.log("Sending initialization transaction...");
      const signature = await sendTransaction(transaction, CONNECTION);
      console.log("Initialization transaction sent:", signature);

      const confirmation = await CONNECTION.confirmTransaction(
        signature,
        "confirmed"
      );
      if (confirmation.value.err) {
        throw new Error("Transaction failed to confirm");
      }
      console.log("Transaction confirmed!");
    } catch (error) {
      console.error("Error initializing:", error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleAddProduct = async () => {
    if (!publicKey) return;

    try {
      // Check if product name is empty
      if (!newProduct.name.trim()) {
        setError("Product name cannot be empty");
        return;
      }

      // Validate price is a number
      if (isNaN(Number(newProduct.price)) || newProduct.price.trim() === "") {
        setError("Price must be a number");
        return;
      }

      setError(null); // Clear any previous errors

      const price = new BN(
        parseFloat(newProduct.price) *
          Math.pow(10, parseInt(newProduct.decimals))
      );

      const transaction = await LET_ME_BUY_PROGRAM.methods
        .addProduct(storeName, newProduct.name, price)
        .accounts({
          authority: publicKey,
          mint: new PublicKey(newProduct.mint),
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

  const handleDeleteProduct = async (productName: string) => {
    if (!publicKey) return;

    try {
      const transaction = await LET_ME_BUY_PROGRAM.methods
        .deleteProduct(storeName, productName)
        .accounts({
          authority: publicKey,
        })
        .transaction();

      const signature = await sendTransaction(transaction, CONNECTION);
      console.log("Product deleted:", signature);
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const handleDeleteStore = async () => {
    if (!publicKey) return;

    try {
      const transaction = await LET_ME_BUY_PROGRAM.methods
        .deleteStore(storeName)
        .accounts({
          authority: publicKey,
        })
        .transaction();

      const signature = await sendTransaction(transaction, CONNECTION);
      console.log("Store deleted:", signature);

      // Redirect to home page after successful deletion
      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting store:", error);
    }
  };

  const handleUpdateTelegramChannel = async () => {
    if (!publicKey) return;

    try {
      setIsUpdatingTelegram(true);
      const { blockhash } = await CONNECTION.getLatestBlockhash();

      const transaction = await LET_ME_BUY_PROGRAM.methods
        .updateTelegramChannel(storeName, telegramChannelId)
        .accounts({
          authority: publicKey,
        })
        .transaction();

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, CONNECTION);
      console.log("Telegram channel update transaction sent:", signature);

      const confirmation = await CONNECTION.confirmTransaction(
        signature,
        "confirmed"
      );
      if (confirmation.value.err) {
        throw new Error("Transaction failed to confirm");
      }
      console.log("Transaction confirmed!");
    } catch (error) {
      console.error("Error updating telegram channel:", error);
    } finally {
      setIsUpdatingTelegram(false);
    }
  };

  if (!storeName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 flex items-center justify-center">
        <div className="text-white text-center p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
          <h1 className="text-3xl font-bold mb-4 text-slate-200">
            Store Name Required
          </h1>
          <p className="text-slate-300">
            Please access this page with a store name in the URL, e.g.,
            /store/your-store-name/setup
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 flex items-center justify-center">
        <div className="text-white text-center p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-slate-200">Loading bar data...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800">
      <div className="fixed top-0 right-0 p-4 z-50 flex gap-4">
        <Link
          href={`/store/${storeName}`}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] hover:scale-[1.02]"
        >
          View Storefront
        </Link>
        <WalletMultiButtonDynamic className="!bg-slate-700/50 !text-slate-200 hover:!bg-slate-700/70 !border !border-slate-600/30" />
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-2">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image
              src="/transparent_white_logo.png"
              alt="Solana Logo"
              width={32}
              height={32}
              className="w-8 h-8"
            />
          </Link>
          <h1 className="text-3xl font-bold text-slate-200">
            {storeName} - Setup
          </h1>
        </div>

        {receipts == null ? (
          <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-slate-700/80 backdrop-blur-md border border-slate-500/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.4)] hover:scale-[1.02] transition-all duration-300">
            <h2 className="text-2xl font-bold text-slate-200">
              Initialize {storeName}
            </h2>
            {isInitializing ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-300">Initializing bar...</p>
              </div>
            ) : (
              <button
                onClick={handleInitialize}
                disabled={!connected || !isAuthority}
                className={`${
                  connected && isAuthority
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-slate-700 cursor-not-allowed"
                } text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] hover:scale-[1.02]`}
              >
                {!connected
                  ? "Connect Wallet"
                  : !isAuthority
                  ? "Not Authorized"
                  : "Initialize with Wallet"}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-6 rounded-2xl bg-slate-700/80 backdrop-blur-md border border-slate-500/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.4)] hover:scale-[1.02] transition-all duration-300">
              <h2 className="text-2xl font-bold text-slate-200 mb-4">
                Add Product
              </h2>
              <div className="flex flex-col gap-3">
                {error && (
                  <div className="bg-red-500/50 border border-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium animate-pulse">
                    {error}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Product Name"
                  value={newProduct.name}
                  onChange={(e) => {
                    setNewProduct({ ...newProduct, name: e.target.value });
                    setError(null);
                  }}
                  className="bg-slate-700/80 text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.2)] rounded-xl border border-slate-500/50 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] hover:scale-[1.02]"
                />
                <input
                  type="text"
                  placeholder="Price"
                  value={newProduct.price}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, "");
                    const parts = value.split(".");
                    if (parts.length > 2) return;
                    setNewProduct({ ...newProduct, price: value });
                  }}
                  className="bg-slate-700/80 text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.2)] rounded-xl border border-slate-500/50 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] hover:scale-[1.02]"
                />
                <select
                  value={newProduct.mint}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, mint: e.target.value })
                  }
                  className="bg-slate-700/80 text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.2)] rounded-xl border border-slate-500/50 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] hover:scale-[1.02]"
                >
                  {MINT_OPTIONS.map((option) => (
                    <option key={option.address} value={option.address}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddProduct}
                  disabled={
                    !connected || !isAuthority || !newProduct.name.trim()
                  }
                  className={`${
                    connected && isAuthority && newProduct.name.trim()
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-slate-700 cursor-not-allowed"
                  } text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] hover:scale-[1.02]`}
                >
                  {!connected
                    ? "Connect Wallet"
                    : !isAuthority
                    ? "Not Authorized"
                    : "Add Product"}
                </button>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-700/80 backdrop-blur-md border border-slate-500/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.4)] hover:scale-[1.02] transition-all duration-300">
              <h2 className="text-2xl font-bold text-slate-200 mb-4">
                Current Products
              </h2>
              <div className="space-y-4">
                {receipts.products?.map((product: any) => (
                  <div
                    key={product.name}
                    className="p-4 rounded-xl bg-slate-700/80 border border-slate-500/50 flex justify-between items-center shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] hover:scale-[1.02] transition-all duration-300"
                  >
                    <div>
                      <h3 className="text-lg font-semibold text-slate-200">
                        {product.name}
                      </h3>
                      <p className="text-slate-300">
                        Price:{" "}
                        {(
                          product.price / Math.pow(10, product.decimals)
                        ).toFixed(2)}{" "}
                        USDC
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteProduct(product.name)}
                      disabled={!connected || !isAuthority}
                      className={`${
                        connected && isAuthority
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-slate-700 cursor-not-allowed"
                      } text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] hover:scale-[1.02]`}
                    >
                      {!connected
                        ? "Connect Wallet"
                        : !isAuthority
                        ? "Not Authorized"
                        : "Delete"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {receipts && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-slate-200 mb-4">Receipts</h2>
            <Receipts receipts={receipts} />
          </div>
        )}

        {receipts && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-slate-200 mb-4">
              Telegram Notifications
            </h2>
            <div className="p-6 rounded-2xl bg-slate-700/80 backdrop-blur-md border border-slate-500/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.4)] hover:scale-[1.02] transition-all duration-300">
              <div className="flex flex-col gap-3">
                <div className="text-slate-300 mb-2">
                  Current Channel ID: {receipts.telegramChannelId || "Not set"}
                </div>
                <div className="text-slate-300 text-sm mb-4">
                  <p className="font-semibold mb-2">Setup Instructions:</p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Create a Telegram channel (or use an existing one)</li>
                    <li>
                      Add @letmebuybot as an administrator to your channel
                    </li>
                    <li>
                      For public channels: Use @channelname (e.g.,
                      @foolsgold_test)
                    </li>
                    <li>
                      For private channels: Use the numeric ID (e.g.,
                      -10025253...)
                    </li>
                    <li>Enter the channel ID below and click Update</li>
                  </ol>
                  <p className="mt-2 text-slate-400">
                    Note: The bot will only send notifications when a channel ID
                    is set.
                  </p>
                </div>
                <input
                  type="text"
                  placeholder="Telegram Channel ID"
                  value={telegramChannelId}
                  onChange={(e) => setTelegramChannelId(e.target.value)}
                  className="bg-slate-700/80 text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.2)] rounded-xl border border-slate-500/50 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] hover:scale-[1.02]"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUpdateTelegramChannel}
                    disabled={!connected || !isAuthority || isUpdatingTelegram}
                    className={`${
                      connected && isAuthority && !isUpdatingTelegram
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-slate-700 cursor-not-allowed"
                    } text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] hover:scale-[1.02] flex-1`}
                  >
                    {!connected
                      ? "Connect Wallet"
                      : !isAuthority
                      ? "Not Authorized"
                      : isUpdatingTelegram
                      ? "Updating..."
                      : "Update Channel"}
                  </button>
                  {isUpdatingTelegram && (
                    <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
                {receipts.telegramChannelId && (
                  <div className="mt-2 text-green-400 text-sm flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Channel ID successfully set!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {receipts && (
          <div className="mt-8 flex justify-start">
            <button
              onClick={handleDeleteStore}
              disabled={!connected || !isAuthority}
              className={`${
                connected && isAuthority
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-slate-700 cursor-not-allowed"
              } text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] hover:scale-[1.02]`}
            >
              {!connected
                ? "Connect Wallet"
                : !isAuthority
                ? "Not Authorized"
                : "Delete Store"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
