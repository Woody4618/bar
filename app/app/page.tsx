"use client";
import { useEffect, useState } from "react";
import { LET_ME_BUY_PROGRAM } from "@/src/util/const";
import { PublicKey } from "@solana/web3.js";
import Link from "next/link";
import Image from "next/image";

interface Store {
  pubkey: PublicKey;
  storeName: string;
  authority: PublicKey;
  totalPurchases: number;
  details: string;
}

export default function Home() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStoreName, setNewStoreName] = useState("");

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const accounts = await LET_ME_BUY_PROGRAM.account.receipts.all();

        const storesWithNames = accounts.map((account) => ({
          pubkey: account.publicKey,
          storeName: account.account.storeName,
          authority: account.account.authority,
          totalPurchases: account.account.totalPurchases.toNumber(),
          details: account.account.details || "",
        }));

        setStores(storesWithNames);
      } catch (error) {
        console.error("Error fetching stores:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center mb-16">
          <div className="w-48 h-48 mb-8 relative">
            <Image
              src="/icon_white_transparent.png"
              alt="Let Me Buy Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="text-slate-300 text-lg text-center max-w-2xl">
            Create a Solana powered store for any restaurant, bar or whatever
            you like.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 border-4 border-slate-400 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-xl text-slate-300">Loading your stores...</p>
          </div>
        ) : stores.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center p-12 rounded-2xl bg-slate-700/80 backdrop-blur-md border border-slate-500/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-300">
              <h2 className="text-2xl font-semibold text-slate-200 mb-4">
                Welcome to Let Me Buy
              </h2>
              <p className="text-slate-300 mb-8">
                There are no stores yet.Get started by creating the first store.
              </p>
              <div className="bg-slate-700/80 backdrop-blur-md border border-slate-500/50 rounded-xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-300">
                <h3 className="text-xl font-medium text-slate-200 mb-6">
                  Create Your Store
                </h3>
                <div className="flex flex-col gap-6">
                  <div>
                    <input
                      type="text"
                      placeholder="Enter store name (lowercase letters, numbers, and hyphens only)"
                      value={newStoreName}
                      onChange={(e) =>
                        setNewStoreName(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, "")
                        )
                      }
                      className="w-full bg-slate-700/80 text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.2)] rounded-xl border border-slate-500/50 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] hover:scale-[1.02]"
                    />
                    <p className="text-sm text-slate-400 mt-2">
                      Store names can contain lowercase letters, numbers, and
                      single hyphens (not at start/end)
                    </p>
                  </div>
                  <Link
                    href={`/store/${newStoreName}/setup`}
                    className={`w-full text-center px-6 py-4 rounded-xl transition-all duration-300 ${
                      newStoreName
                        ? "bg-slate-600 text-white hover:bg-slate-500 shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
                        : "bg-slate-700 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    Create Store
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-slate-200">
                All Stores
              </h2>
              <div className="flex items-center gap-4">
                <div className="bg-slate-700/80 backdrop-blur-md border border-slate-500/50 rounded-xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-300">
                  <p className="text-slate-300">
                    Total Stores:{" "}
                    <span className="text-slate-200 font-medium">
                      {stores.length}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.map((store) => (
                <Link
                  key={store.pubkey.toString()}
                  href={`/store/${store.storeName}`}
                  className="group"
                >
                  <div className="bg-slate-700/80 backdrop-blur-md border border-slate-500/50 rounded-xl p-6 hover:bg-slate-700/90 transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.4)] hover:scale-[1.02]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-slate-200 group-hover:text-white transition-colors">
                        {store.storeName}
                      </h3>
                      <div className="bg-green-900/20 text-green-400 px-3 py-1 rounded-full text-sm">
                        Active
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-slate-300 text-sm">
                        Details:{" "}
                        <span className="text-slate-200 font-medium">
                          {store.details || "No details provided"}
                        </span>
                      </p>
                      <p className="text-slate-300 text-sm">
                        Total Sales:{" "}
                        <span className="text-slate-200 font-medium">
                          {store.totalPurchases}
                        </span>
                      </p>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Create New Store Card */}
              <div className="bg-slate-700/80 backdrop-blur-md border border-slate-500/50 rounded-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-300">
                <h3 className="text-xl font-semibold text-slate-200 mb-4">
                  Create New Store
                </h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Enter store name (lowercase letters, numbers, and hyphens only)"
                    value={newStoreName}
                    onChange={(e) =>
                      setNewStoreName(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                      )
                    }
                    className="w-full bg-slate-700/80 text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.2)] rounded-xl border border-slate-500/50 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] hover:scale-[1.02]"
                  />
                  <p className="text-sm text-slate-400 mt-2">
                    Store names can contain lowercase letters, numbers, and
                    single hyphens (not at start/end)
                  </p>
                  <Link
                    href={`/store/${newStoreName}/setup`}
                    className={`block text-center px-6 py-3 rounded-xl transition-all duration-300 ${
                      newStoreName
                        ? "bg-slate-600 text-white hover:bg-slate-500 shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
                        : "bg-slate-700 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    Create Store
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
