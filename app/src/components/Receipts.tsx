import { FC } from "react";
import { BN } from "@coral-xyz/anchor";
import { Receipts as ReceiptsType } from "@/src/types/receipts_types";

interface ReceiptsProps {
  receipts: ReceiptsType | null;
}

const Receipts: FC<ReceiptsProps> = ({ receipts }) => {
  if (!receipts) return null;

  return (
    <div className="w-full max-w-4xl p-6 rounded-2xl bg-slate-700/80 backdrop-blur-md border border-slate-500/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-300">
      <h2 className="text-2xl font-bold mb-6 text-slate-200">
        Recent Purchases
      </h2>
      <div className="space-y-4">
        {[...receipts.receipts].reverse().map((receipt, index) => (
          <div
            key={index}
            className="p-4 rounded-xl bg-slate-700/80 border border-slate-500/50 shadow-[0_10px_30px_rgba(0,0,0,0.2)] transition-all duration-300"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-slate-200 font-medium">
                  {receipt.productName}
                </p>
                <p className="text-slate-300 text-sm">
                  Table {receipt.tableNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-200">
                  {(
                    receipt.price.toNumber() /
                    Math.pow(
                      10,
                      receipts.products.find(
                        (p: any) => p.name === receipt.productName
                      )?.decimals || 6
                    )
                  ).toFixed(2)}{" "}
                  USDC
                </p>
                <p className="text-slate-300 text-sm">
                  {new Date(
                    receipt.timestamp.toNumber() * 1000
                  ).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="mt-2 flex justify-between items-center">
              <a
                href={`https://explorer.solana.com/address/${receipt.buyer.toString()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-300 text-sm hover:text-blue-400 transition-colors"
              >
                Buyer: {receipt.buyer.toString().slice(0, 8)}...
                <span className="ml-1 text-xs">↗</span>
              </a>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    receipt.wasDelivered
                      ? "bg-green-500/20 text-green-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {receipt.wasDelivered ? "Delivered" : "Pending"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Receipts;
