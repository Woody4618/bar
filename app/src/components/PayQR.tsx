"use client";

import { useEffect, useRef, useState } from "react";
import { encodeURL, createQR } from "@solana/pay";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import QRCodeSVG from "qrcode.react";

interface TransactionRequestQRProps {
  instruction: string;
  barName: string;
  productName: string;
  tableNumber?: number;
}

export default function TransactionRequestQR({
  instruction,
  barName,
  productName,
  tableNumber = 1,
}: TransactionRequestQRProps) {
  const { publicKey } = useWallet();
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    if (!publicKey) return;

    const params = new URLSearchParams({
      instruction,
      barName,
      productName,
      tableNumber: tableNumber.toString(),
    });

    setUrl(`solana:${publicKey.toString()}?${params.toString()}`);
  }, [publicKey, instruction, barName, productName, tableNumber]);

  if (!url) return null;

  return (
    <div className="bg-white p-4 rounded-lg">
      <QRCodeSVG value={url} size={256} />
    </div>
  );
}
