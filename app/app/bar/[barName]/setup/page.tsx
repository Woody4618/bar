"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  CONNECTION,
  SOLANA_BAR_PROGRAM,
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
  const barName = (params?.barName as string)?.toLowerCase();
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

  const RECEIPTS_PDA = useMemo(() => getReceiptsPDA(barName), [barName]);

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

    try {
      setIsInitializing(true);
      const { blockhash } = await CONNECTION.getLatestBlockhash();

      const transaction = await SOLANA_BAR_PROGRAM.methods
        .initialize(barName)
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
        console.error("Product name cannot be empty");
        return;
      }

      const price = new BN(
        parseFloat(newProduct.price) *
          Math.pow(10, parseInt(newProduct.decimals))
      );

      const transaction = await SOLANA_BAR_PROGRAM.methods
        .addProduct(barName, newProduct.name, price)
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
      const transaction = await SOLANA_BAR_PROGRAM.methods
        .deleteProduct(barName, productName)
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

  const handleDeleteBar = async () => {
    if (!publicKey) return;

    try {
      const transaction = await SOLANA_BAR_PROGRAM.methods
        .deleteBar(barName)
        .accounts({
          authority: publicKey,
        })
        .transaction();

      const signature = await sendTransaction(transaction, CONNECTION);
      console.log("Bar deleted:", signature);

      // Redirect to home page after successful deletion
      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting bar:", error);
    }
  };

  const handleUpdateTelegramChannel = async () => {
    if (!publicKey) return;

    try {
      setIsUpdatingTelegram(true);
      const { blockhash } = await CONNECTION.getLatestBlockhash();

      const transaction = await SOLANA_BAR_PROGRAM.methods
        .updateTelegramChannel(barName, telegramChannelId)
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

  if (!barName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-xl">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Bar Name Required
          </h1>
          <p className="text-slate-300">
            Please access this page with a bar name in the URL, e.g.,
            /bar/your-bar-name/setup
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="fixed top-0 right-0 p-4 z-50 flex gap-4">
        <Link
          href={`/bar/${barName}`}
          className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-200"
        >
          View Storefront
        </Link>
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
            {barName} - Setup
          </h1>
        </div>

        {receipts == null ? (
          <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-xl">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Initialize {barName}
            </h2>
            {isInitializing ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-300">Initializing bar...</p>
              </div>
            ) : (
              <button
                onClick={handleInitialize}
                disabled={!connected || !isAuthority}
                className={`${
                  connected && isAuthority
                    ? "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                    : "bg-slate-700 cursor-not-allowed"
                } text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-lg`}
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
            <div className="p-6 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-xl">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
                Add Product
              </h2>
              <div className="flex flex-col gap-3">
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
                <select
                  value={newProduct.mint}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, mint: e.target.value })
                  }
                  className="bg-slate-800 text-white shadow-lg rounded-xl border border-slate-700 p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {MINT_OPTIONS.map((option) => (
                    <option key={option.address} value={option.address}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddProduct}
                  disabled={!connected || !isAuthority}
                  className={`${
                    connected && isAuthority
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                      : "bg-slate-700 cursor-not-allowed"
                  } text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-lg`}
                >
                  {!connected
                    ? "Connect Wallet"
                    : !isAuthority
                    ? "Not Authorized"
                    : "Add Product"}
                </button>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-xl">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
                Current Products
              </h2>
              <div className="space-y-4">
                {receipts.products?.map((product: any) => (
                  <div
                    key={product.name}
                    className="p-4 rounded-xl bg-slate-800 border border-slate-700 flex justify-between items-center"
                  >
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {product.name}
                      </h3>
                      <p className="text-slate-400">
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
                      } text-white px-4 py-2 rounded-lg transition-all duration-200`}
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
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
              Receipts
            </h2>
            <Receipts receipts={receipts} />
          </div>
        )}

        {receipts && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
              Telegram Notifications
            </h2>
            <div className="p-6 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-xl">
              <div className="flex flex-col gap-3">
                <div className="text-slate-300 mb-2">
                  Current Channel ID: {receipts.telegramChannelId || "Not set"}
                </div>
                <div className="text-slate-400 text-sm mb-4">
                  <p className="font-semibold mb-2">Setup Instructions:</p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Create a Telegram channel (or use an existing one)</li>
                    <li>
                      Add @solanabarbot as an administrator to your channel
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
                  <p className="mt-2 text-slate-500">
                    Note: The bot will only send notifications when a channel ID
                    is set.
                  </p>
                </div>
                <input
                  type="text"
                  placeholder="Telegram Channel ID"
                  value={telegramChannelId}
                  onChange={(e) => setTelegramChannelId(e.target.value)}
                  className="bg-slate-800 text-white shadow-lg rounded-xl border border-slate-700 p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUpdateTelegramChannel}
                    disabled={!connected || !isAuthority || isUpdatingTelegram}
                    className={`${
                      connected && isAuthority && !isUpdatingTelegram
                        ? "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                        : "bg-slate-700 cursor-not-allowed"
                    } text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-lg flex-1`}
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
                    <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
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
              onClick={handleDeleteBar}
              disabled={!connected || !isAuthority}
              className={`${
                connected && isAuthority
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-slate-700 cursor-not-allowed"
              } text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-lg`}
            >
              {!connected
                ? "Connect Wallet"
                : !isAuthority
                ? "Not Authorized"
                : "Delete Bar"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
