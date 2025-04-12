import { FC } from "react";
import { BN } from "@coral-xyz/anchor";

const Receipts: FC<any> = ({ receipts }) => {
  return (
    <div className="bg-white shadow-md rounded-2xl border-solid border border-black w-[430px] text-center flex flex-col mx-auto p-4">
      <h3 className="text-lg font-semibold mb-2">Receipts:</h3>
      <div className="flex flex-col gap-2">
        {receipts &&
          receipts.receipts.map((receipt: any) => (
            <div
              key={receipt.receiptId}
              className="flex flex-col items-center p-2 border-b last:border-b-0"
            >
              <div className="font-medium">
                Receipt #{receipt.receiptId.toString()}
              </div>
              <div className="text-sm font-medium text-blue-600">
                {receipt.productName}
              </div>
              <div
                className={
                  receipt.wasDelivered ? "text-green-600" : "text-yellow-600"
                }
              >
                {receipt.wasDelivered ? "Delivered" : "Pending"}
              </div>
              <div className="text-sm text-gray-600 break-all max-w-[380px]">
                {receipt.buyer.toString()}
              </div>
              <div className="text-sm font-medium text-blue-600">
                Price:{" "}
                {new BN(receipt.price).div(new BN(1000000000)).toString()} SOL
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default Receipts;
