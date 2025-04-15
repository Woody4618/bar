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
  const [newBarName, setNewBarName] = useState("");

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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-5xl font-bold text-center mb-12 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Solana Bars
        </h1>

        {loading ? (
          <div className="text-center p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-xl">
            <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Loading bars...
            </p>
          </div>
        ) : bars.length === 0 ? (
          <div className="text-center p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-xl">
            <p className="text-slate-300 text-xl">
              No bars found. Create one to get started!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bars.map((bar) => (
              <Link
                key={bar.pubkey.toString()}
                href={`/bar/${bar.barName}`}
                className="block"
              >
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-700/50 transition-all duration-200 shadow-xl">
                  <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                    {bar.barName}
                  </h2>
                  <p className="text-slate-400">
                    Address: {bar.pubkey.toString().slice(0, 8)}...
                  </p>
                  <p className="text-slate-400">
                    Shots sold: {bar.totalShotsSold}
                  </p>
                </div>
              </Link>
            ))}

            {/* Create New Bar Card */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
                Create New Bar
              </h2>
              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Enter bar name"
                  value={newBarName}
                  onChange={(e) => setNewBarName(e.target.value)}
                  className="bg-slate-800 text-white shadow-lg rounded-xl border border-slate-700 p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <Link
                  href={`/bar/${newBarName}`}
                  className={`text-center px-6 py-3 rounded-xl transition-all duration-200 shadow-lg ${
                    newBarName
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
                      : "bg-slate-700 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  Create Bar
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
