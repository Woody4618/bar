import { FC } from "react";
import { BN } from "@coral-xyz/anchor";
import { Receipts as ReceiptsType } from "@/src/types/receipts_types";

interface ReceiptsProps {
  receipts: ReceiptsType | null;
}

const Receipts: FC<ReceiptsProps> = ({ receipts }) => {
  if (!receipts) return null;

  return (
    <div className="w-full max-w-4xl p-6 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-xl">
      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
        Recent Purchases
      </h2>
      <div className="space-y-4">
        {[...receipts.receipts].reverse().map((receipt, index) => (
          <div
            key={index}
            className="p-4 rounded-xl bg-slate-800 border border-slate-700 shadow-lg"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-slate-300 font-medium">
                  {receipt.productName}
                </p>
                <p className="text-slate-400 text-sm">
                  Table {receipt.tableNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-300">
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
                <p className="text-slate-400 text-sm">
                  {new Date(
                    receipt.timestamp.toNumber() * 1000
                  ).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="mt-2 flex justify-between items-center">
              <p className="text-slate-400 text-sm">
                Buyer: {receipt.buyer.toString().slice(0, 8)}...
              </p>
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
