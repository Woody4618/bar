import { FC } from "react";
import QRCode from "qrcode.react";

interface TransactionRequestQRProps {
  instruction: string;
  productName?: string;
  barName: string;
}

const TransactionRequestQR: FC<TransactionRequestQRProps> = ({
  instruction,
  productName,
  barName,
}) => {
  const url = `${
    window.location.origin
  }/api/transaction?instruction=${instruction}${
    productName ? `&productName=${productName}` : ""
  }&barName=${barName}`;

  return (
    <div className="bg-white shadow-md rounded-2xl border-solid border border-black p-4">
      <QRCode value={url} size={256} />
    </div>
  );
};

export default TransactionRequestQR;
