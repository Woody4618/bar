import { FC } from "react";
import { BN } from "@coral-xyz/anchor";
import { Receipts as ReceiptsType } from "@/src/util/solana_bar";

interface ReceiptsProps {
  receipts: ReceiptsType | null;
}

const Receipts: FC<ReceiptsProps> = ({ receipts }) => {
  if (!receipts) return null;

  return (
    <div className="w-full max-w-md p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Recent Receipts</h2>
      <div className="space-y-4">
        {receipts.receipts.map((receipt) => (
          <div
            key={receipt.receiptId}
            className="p-4 border rounded-lg bg-gray-50"
          >
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{receipt.productName}</p>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Table {receipt.tableNumber}
                  </span>
                </div>
                <p className="text-sm text-gray-600 pl-0">
                  {new Date(receipt.timestamp * 1000).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {(receipt.price / Math.pow(10, 6)).toFixed(2)} USDC
                </p>
                <p
                  className={`text-sm ${
                    receipt.was_delivered ? "text-green-600" : "text-yellow-600"
                  }`}
                >
                  {receipt.was_delivered ? "Delivered" : "Pending"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Receipts;
