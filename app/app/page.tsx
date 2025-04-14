"use client";
import { useEffect, useState } from "react";
import {
  CONNECTION,
  SOLANA_BAR_PROGRAM,
  SOLANA_BAR_PROGRAM_ID,
} from "@/src/util/const";
import { PublicKey } from "@solana/web3.js";
import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import dynamic from "next/dynamic";

// Dynamically import the WalletMultiButton to avoid hydration issues
const WalletMultiButtonDynamic = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

interface Bar {
  pubkey: PublicKey;
  barName: string;
  authority: PublicKey;
  totalShotsSold: number;
}

export default function Home() {
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBars = async () => {
      try {
        // Use Anchor's built-in account filtering
        const accounts = await SOLANA_BAR_PROGRAM.account.receipts.all();

        const barsWithNames = accounts.map((account) => ({
          pubkey: account.publicKey,
          barName: account.account.barName,
          authority: account.account.authority,
          totalShotsSold: account.account.totalShotsSold.toNumber(),
        }));

        setBars(barsWithNames);
      } catch (error) {
        console.error("Error fetching bars:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBars();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-500 to-purple-600">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-end mb-8">
          <WalletMultiButtonDynamic className="!bg-white !text-black hover:!bg-gray-100" />
        </div>

        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Solana Bars
        </h1>

        {loading ? (
          <div className="text-center text-white">Loading bars...</div>
        ) : bars.length === 0 ? (
          <div className="text-center text-white">
            No bars found. Create one to get started!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bars.map((bar) => (
              <Link
                key={bar.pubkey.toString()}
                href={`/bar/${bar.barName}`}
                className="block"
              >
                <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    {bar.barName}
                  </h2>
                  <p className="text-gray-600">
                    Address: {bar.pubkey.toString().slice(0, 8)}...
                  </p>
                  <p className="text-gray-600">
                    Shots sold: {bar.totalShotsSold}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
