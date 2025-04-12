import { FC } from "react";
import QRCode from "qrcode.react";

interface TransactionRequestQRProps {
  instruction: string;
  productName?: string;
}

const TransactionRequestQR: FC<TransactionRequestQRProps> = ({
  instruction,
  productName,
}) => {
  const url = `${
    window.location.origin
  }/api/transaction?instruction=${instruction}${
    productName ? `&productName=${productName}` : ""
  }`;

  return (
    <div className="bg-white shadow-md rounded-2xl border-solid border border-black p-4">
      <QRCode value={url} size={256} />
    </div>
  );
};

export default TransactionRequestQR;
