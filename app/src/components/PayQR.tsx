"use client";

import { useEffect, useRef, useState } from "react";
import { encodeURL, createQR } from "@solana/pay";
import { useSearchParams } from "next/navigation";

interface TransactionRequestQRProps {
  instruction: string;
  barName: string;
  productName?: string;
  productMint?: string;
  productPrice?: number;
  productQuantity?: number;
}

export default function TransactionRequestQR({
  instruction,
  barName,
  productName,
  productMint,
  productPrice,
  productQuantity,
}: TransactionRequestQRProps) {
  const [isClient, setIsClient] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !qrRef.current) return;

    const params = new URLSearchParams();
    params.append("instruction", instruction);
    params.append("barName", barName);
    if (productName) params.append("productName", productName);
    if (productMint) params.append("productMint", productMint);
    if (productPrice) params.append("productPrice", productPrice.toString());
    if (productQuantity)
      params.append("productQuantity", productQuantity.toString());

    const url = `${
      window.location.origin
    }/api/transaction?${params.toString()}`;
    const solanaUrl = encodeURL({ link: new URL(url) });
    const qr = createQR(solanaUrl, 360, "transparent");
    qrRef.current.innerHTML = "";
    qr.append(qrRef.current);
  }, [
    isClient,
    instruction,
    barName,
    productName,
    productMint,
    productPrice,
    productQuantity,
  ]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={qrRef}
        className="w-[360px] h-[360px] flex items-center justify-center bg-white rounded-2xl"
      >
        {!isClient && (
          <div className="animate-pulse flex items-center justify-center w-full h-full">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
}
